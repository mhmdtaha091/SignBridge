"""
extract_psl_landmarks.py — PSL alphabet images → 159-dim hand-landmark samples.

Downloads PSL alphabet images from Kaggle (wasifullahcs/dataset-pakistani-sign-language)
and extracts MediaPipe hand landmarks with BOTH hands + Pose, producing 159-dim
normalized feature vectors.

PSL uses a two-handed BANZSL fingerspelling alphabet, so we need BOTH hands
captured simultaneously. The normalization matches web/src/vision/normalize.ts
exactly — wrist origin, palm-size scale, left-hand mirroring.

Output: ml/data/psl_landmarks.jsonl  — {"label", "features"} per line.
"""

import io
import json
import os
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

HERE = Path(__file__).resolve().parent
DATA_DIR = HERE / "data"
DATA_DIR.mkdir(exist_ok=True)

# Kaggle dataset: 37 folders, one per Urdu/Persian alphabet character.
# We map the folder names to English A-Z for PSL fingerspelling.
# (Many PSL letters use the same two-handed configuration regardless of language.)
# Dataset URL: https://www.kaggle.com/datasets/wasifullahcs/dataset-pakistani-sign-language
# We use a direct download approach.
KAGGLE_DATASET = "wasifullahcs/dataset-pakistani-sign-language"

# MediaPipe task file — same as the browser loads.
TASK_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)
POSE_TASK_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker/float16/1/pose_landmarker.task"
)
TASK_PATH = DATA_DIR / "hand_landmarker.task"
POSE_TASK_PATH = DATA_DIR / "pose_landmarker.task"

# PSL uses 26 English letters (A–Z), but underlying BANZSL alphabet.
LABELS = [chr(c) for c in range(ord("A"), ord("Z") + 1)]
MOTION = {"J", "Z"}  # Signed with motion; hard for static-frame classifier
TARGET_ASPECT = 16 / 9  # Match the live camera (960x540)

# Feature layout: [left_hand(63) | right_hand(63) | pose_upper(33)] = 159
FULL_FEATURE_SIZE = 159
HAND_FEATURE_SIZE = 63
POSE_UPPER_SIZE = 33

# Pose landmark indices for upper body (matching web/src/vision/types.ts).
POSE_UPPER_INDICES = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24]

OUT_PATH = DATA_DIR / "psl_landmarks.jsonl"


def download_mediapipe_tasks() -> None:
    """Download the MediaPipe task files if not already present."""
    if not TASK_PATH.exists():
        print(f"Downloading hand_landmarker.task → {TASK_PATH}")
        urllib.request.urlretrieve(TASK_URL, TASK_PATH)
    if not POSE_TASK_PATH.exists():
        print(f"Downloading pose_landmarker.task → {POSE_TASK_PATH}")
        urllib.request.urlretrieve(POSE_TASK_URL, POSE_TASK_PATH)


def letterbox(img: Image.Image, aspect: float = TARGET_ASPECT) -> Image.Image:
    """Pad image to target aspect ratio with black bars, hand centered."""
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


def normalize_hand(landmarks, handedness_str: str) -> list[float]:
    """
    Port of web/src/vision/normalize.ts: wrist-origin, palm-size scale, mirror Left.
    Returns 63 floats (21 landmarks × 3 coords).
    """
    wrist = landmarks[0]
    mcp = landmarks[9]  # Middle-finger MCP
    scale = np.sqrt(
        (mcp[0] - wrist[0]) ** 2
        + (mcp[1] - wrist[1]) ** 2
        + (mcp[2] - wrist[2]) ** 2
    )
    s = scale if scale > 1e-6 else 1.0
    mirror = -1.0 if handedness_str == "Left" else 1.0
    out = []
    for x, y, z in landmarks:
        out.append(((x - wrist[0]) / s) * mirror)
        out.append((y - wrist[1]) / s)
        out.append((z - wrist[2]) / s)
    return out


def normalize_pose_upper(landmarks) -> list[float]:
    """
    Port of web/src/vision/normalize.ts normalizePoseUpper.
    Anchor: shoulder midpoint. Scale: shoulder width.
    Returns 33 floats (11 landmarks × 3 coords).
    """
    l_shoulder = landmarks[11]
    r_shoulder = landmarks[12]
    anchor_x = (l_shoulder[0] + r_shoulder[0]) / 2
    anchor_y = (l_shoulder[1] + r_shoulder[1]) / 2
    anchor_z = (l_shoulder[2] + r_shoulder[2]) / 2
    scale = np.sqrt(
        (r_shoulder[0] - l_shoulder[0]) ** 2
        + (r_shoulder[1] - l_shoulder[1]) ** 2
        + (r_shoulder[2] - l_shoulder[2]) ** 2
    )
    s = scale if scale > 1e-6 else 1.0
    out = []
    for idx in POSE_UPPER_INDICES:
        if idx < len(landmarks):
            p = landmarks[idx]
            out.append((p[0] - anchor_x) / s)
            out.append((p[1] - anchor_y) / s)
            out.append((p[2] - anchor_z) / s)
        else:
            out.extend([0.0, 0.0, 0.0])
    return out


def build_full_features(
    hand_results,
    pose_landmarks,
) -> list[float] | None:
    """
    Build a 159-dim feature vector: [left(63)|right(63)|pose(33)].
    Missing parts are zero-filled.
    """
    features = np.zeros(FULL_FEATURE_SIZE, dtype=np.float32)

    # Hands
    has_any_hand = False
    if hand_results and hand_results.hand_landmarks:
        for i, pts in enumerate(hand_results.hand_landmarks):
            pts_list = [(p.x, p.y, p.z) for p in pts]
            handedness = hand_results.handedness[i][0].category_name
            feats = normalize_hand(pts_list, handedness)
            offset = 0 if handedness == "Left" else HAND_FEATURE_SIZE
            features[offset : offset + HAND_FEATURE_SIZE] = feats
            has_any_hand = True

    if not has_any_hand:
        return None

    # Pose
    if pose_landmarks:
        pts_list = [(p.x, p.y, p.z) for p in pose_landmarks]
        pose_feats = normalize_pose_upper(pts_list)
        features[HAND_FEATURE_SIZE * 2 :] = pose_feats

    return features.tolist()


def process_from_directory(
    image_dir: str,
    label: str | None = None,
) -> tuple[int, int]:
    """
    Process images from a directory. If label is None, the directory name is used
    as the label. Returns (ok_count, skip_count).
    """
    hand_landmarker = vision.HandLandmarker.create_from_options(
        vision.HandLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=str(TASK_PATH)),
            running_mode=vision.RunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=0.5,
        )
    )
    pose_landmarker = vision.PoseLandmarker.create_from_options(
        vision.PoseLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=str(POSE_TASK_PATH)),
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.3,
        )
    )

    n_ok = n_skip = 0
    image_dir_path = Path(image_dir)
    image_files = sorted(
        list(image_dir_path.glob("*.jpg"))
        + list(image_dir_path.glob("*.jpeg"))
        + list(image_dir_path.glob("*.png"))
        + list(image_dir_path.glob("*.JPG"))
        + list(image_dir_path.glob("*.JPEG"))
        + list(image_dir_path.glob("*.PNG"))
    )

    if not image_files:
        print(f"  No images found in {image_dir}")
        hand_landmarker.close()
        pose_landmarker.close()
        return 0, 0

    with open(OUT_PATH, "a") as f:
        for img_path in image_files:
            if label is None:
                # Use folder name as label
                lbl = img_path.parent.name.upper()[:1]  # Take first char for now
            else:
                lbl = label

            if lbl not in LABELS:
                lbl = lbl.upper()[:1]
                if lbl not in LABELS:
                    n_skip += 1
                    continue

            if lbl in MOTION:
                n_skip += 1
                continue

            try:
                img = Image.open(img_path)
                arr = np.asarray(letterbox(img), dtype=np.uint8)
            except Exception:
                n_skip += 1
                continue

            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=arr)
            hand_res = hand_landmarker.detect(mp_image)
            pose_res = pose_landmarker.detect(mp_image)

            features = build_full_features(
                hand_res,
                pose_res.pose_landmarks[0] if pose_res.pose_landmarks else None,
            )
            if features is None:
                n_skip += 1
                continue

            f.write(json.dumps({"label": lbl, "features": features}) + "\n")
            n_ok += 1

    hand_landmarker.close()
    pose_landmarker.close()
    return n_ok, n_skip


def main(limit: int | None = None) -> None:
    download_mediapipe_tasks()

    # Check if a directory of PSL alphabet images was provided.
    image_dir = sys.argv[1] if len(sys.argv) > 1 else None

    if image_dir:
        print(f"Processing images from: {image_dir}")
        n_ok, n_skip = process_from_directory(image_dir)
        print(f"\nDONE ok={n_ok} skip={n_skip} → {OUT_PATH}")
    else:
        print(
            "Usage: python extract_psl_landmarks.py <path-to-psl-images-directory>\n"
            "\n"
            "Download the Kaggle PSL dataset first:\n"
            "  https://www.kaggle.com/datasets/wasifullahcs/dataset-pakistani-sign-language\n"
            "\n"
            "Then run:\n"
            "  python extract_psl_landmarks.py path/to/PSL_Dataset/\n"
            "\n"
            "Or use the Colab notebook: ml/colab/signbridge_psl_letters.ipynb"
        )


if __name__ == "__main__":
    lim = int(sys.argv[2]) if len(sys.argv) > 2 else None
    main(lim)
