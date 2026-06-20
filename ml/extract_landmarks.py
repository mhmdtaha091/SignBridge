"""
extract_landmarks.py — public images -> normalized hand-landmark samples.

Pulls the public, no-auth ASL alphabet image set
(Marxulia/asl_sign_languages_alphabets_v03 on Hugging Face), runs MediaPipe
Hands over every image, and writes one normalized 63-dim sample per detected
hand. The normalization mirrors web/src/vision/normalize.ts *exactly* so the
browser's live features and these training features live in the same space.

Why letterbox to 16:9? The live app feeds MediaPipe a 960x540 (16:9) video.
MediaPipe normalizes x by width and y by height, so hand shape is aspect-
distorted. Padding each (often square) source image to 16:9 reproduces that
same distortion, so the model trained here matches the live camera without any
change to normalize.ts.

Output: ml/data/landmarks.jsonl  (gitignored)  — {"label","features"} per line.
"""

import io
import json
import os
import urllib.request

import numpy as np
import pandas as pd
from PIL import Image
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
PARQUET_URL = (
    "https://huggingface.co/datasets/Marxulia/asl_sign_languages_alphabets_v03/"
    "resolve/refs%2Fconvert%2Fparquet/default/train/0000.parquet"
)
PARQUET_PATH = os.path.join(DATA_DIR, "asl_v03_train.parquet")
OUT_PATH = os.path.join(DATA_DIR, "landmarks.jsonl")

# Exact same model the browser loads (web/src/vision/landmarker.ts), for parity.
TASK_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)
TASK_PATH = os.path.join(DATA_DIR, "hand_landmarker.task")

LABELS = [chr(c) for c in range(ord("A"), ord("Z") + 1)]  # class index -> letter
MOTION = {"J", "Z"}  # signed with motion; out of scope for a static-frame model
TARGET_ASPECT = 16 / 9  # match the live camera (960x540)


def download() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(TASK_PATH):
        print(f"downloading hand_landmarker.task -> {TASK_PATH}")
        urllib.request.urlretrieve(TASK_URL, TASK_PATH)
    if os.path.exists(PARQUET_PATH):
        print(f"parquet already present: {PARQUET_PATH}")
        return
    print(f"downloading parquet (~74MB) -> {PARQUET_PATH}")
    urllib.request.urlretrieve(PARQUET_URL, PARQUET_PATH)


def letterbox(img: Image.Image, aspect: float = TARGET_ASPECT) -> Image.Image:
    """Pad to the target aspect ratio with black bars, hand kept centered."""
    img = img.convert("RGB")
    w, h = img.size
    cur = w / h
    if abs(cur - aspect) < 1e-3:
        return img
    if cur < aspect:
        new_w, new_h = int(round(h * aspect)), h
    else:
        new_w, new_h = w, int(round(w / aspect))
    canvas = Image.new("RGB", (new_w, new_h), (0, 0, 0))
    canvas.paste(img, ((new_w - w) // 2, (new_h - h) // 2))
    return canvas


def normalize_hand(landmarks, handedness: str):
    """Port of web/src/vision/normalize.ts (wrist origin, palm-size scale, mirror Left)."""
    wrist = landmarks[0]
    mcp = landmarks[9]
    scale = (
        (mcp[0] - wrist[0]) ** 2
        + (mcp[1] - wrist[1]) ** 2
        + (mcp[2] - wrist[2]) ** 2
    ) ** 0.5
    s = scale if scale > 1e-6 else 1.0
    mirror = -1.0 if handedness == "Left" else 1.0
    out = []
    for (x, y, z) in landmarks:
        out.append(((x - wrist[0]) / s) * mirror)
        out.append((y - wrist[1]) / s)
        out.append((z - wrist[2]) / s)
    return out


def image_bytes(field):
    """HF image columns come through as {'bytes':..,'path':..} or raw bytes."""
    if isinstance(field, dict):
        return field.get("bytes")
    if isinstance(field, (bytes, bytearray)):
        return bytes(field)
    raise TypeError(f"unexpected image field type: {type(field)}")


def main(limit: int | None = None) -> None:
    download()
    df = pd.read_parquet(PARQUET_PATH)
    print(f"rows={len(df)} cols={list(df.columns)}")
    if limit:
        df = df.head(limit)

    landmarker = vision.HandLandmarker.create_from_options(
        vision.HandLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=TASK_PATH),
            running_mode=vision.RunningMode.IMAGE,
            num_hands=1,
            min_hand_detection_confidence=0.5,
        )
    )
    n_ok = n_skip = 0
    per_letter: dict[str, int] = {}
    with open(OUT_PATH, "w") as f:
        for i, row in enumerate(df.itertuples(index=False)):
            letter = LABELS[int(row.label)]
            if letter in MOTION:
                n_skip += 1
                continue
            try:
                img = Image.open(io.BytesIO(image_bytes(row.image)))
            except Exception:
                n_skip += 1
                continue
            arr = np.asarray(letterbox(img), dtype=np.uint8)  # RGB
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=arr)
            res = landmarker.detect(mp_image)
            if not res.hand_landmarks:
                n_skip += 1
                continue
            pts = [(p.x, p.y, p.z) for p in res.hand_landmarks[0]]
            handed = res.handedness[0][0].category_name
            feats = normalize_hand(pts, handed)
            f.write(json.dumps({"label": letter, "features": feats}) + "\n")
            n_ok += 1
            per_letter[letter] = per_letter.get(letter, 0) + 1
            if (i + 1) % 500 == 0:
                print(f"  {i + 1}/{len(df)}  ok={n_ok} skip={n_skip}")
    landmarker.close()
    print(f"\nDONE ok={n_ok} skip={n_skip} -> {OUT_PATH}")
    print("per-letter:", {k: per_letter[k] for k in sorted(per_letter)})


if __name__ == "__main__":
    import sys

    lim = int(sys.argv[1]) if len(sys.argv) > 1 else None
    main(lim)
