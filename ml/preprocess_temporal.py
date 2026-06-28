"""
preprocess_temporal.py — video (WLASL or self-recorded) → labeled landmark sequences.

For each video:
  1. Read frames via OpenCV.
  2. Run MediaPipe Hands (both hands) and Pose on every Nth frame.
  3. Normalize each frame with the same logic as:
       - web/src/vision/normalize.ts          (hand)
       - web/src/vision/normalize.ts > normalizePoseUpper  (pose)
  4. Build 159-dim feature vectors.
  5. Segment into sign windows using hand-presence + motion heuristics.
  6. Pad/truncate to a fixed window (default 60 frames).
  7. Output: data/temporal_landmarks.npz  +  data/temporal_labels.json

Usage:
  python preprocess_temporal.py \\
    --input_dir data/wlasl_videos/ \\
    --labels data/wlasl_labels.csv \\
    --output data/temporal

Requirements (add to requirements.txt):
  tensorflow, tensorflowjs, opencv-python, tqdm
"""

import argparse
import json
import os
import sys

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from tqdm import tqdm

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")

# ── MediaPipe setup (same models as browser) ───────────────────────────────

HAND_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)
POSE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)

# 21 hand landmarks per hand, 11 upper-body pose landmarks.
HAND_COUNT = 21
POSE_UPPER_INDICES = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24]
POSE_UPPER_SIZE = len(POSE_UPPER_INDICES) * 3  # 33
FULL_FEATURE_SIZE = HAND_COUNT * 3 * 2 + POSE_UPPER_SIZE  # 159

# ── Normalization (exact port of web/src/vision/normalize.ts) ──────────────

def normalize_hand(landmarks: np.ndarray, handedness: str) -> np.ndarray:
    """landmarks: (21, 3)  — MediaPipe-normalized (0-1) coordinates."""
    wrist = landmarks[0]
    mcp = landmarks[9]
    scale = float(np.linalg.norm(mcp - wrist))
    s = scale if scale > 1e-6 else 1.0
    mirror = -1.0 if handedness == "Left" else 1.0
    out = np.zeros(63, dtype=np.float32)
    for i in range(21):
        out[i * 3] = (landmarks[i, 0] - wrist[0]) / s * mirror
        out[i * 3 + 1] = (landmarks[i, 1] - wrist[1]) / s
        out[i * 3 + 2] = (landmarks[i, 2] - wrist[2]) / s
    return out


def normalize_pose_upper(landmarks: np.ndarray) -> np.ndarray:
    """landmarks: (33, 3) — full MediaPipe pose. Returns (33,) for upper body."""
    if landmarks.shape[0] < 25:
        raise ValueError(f"Expected >= 25 pose landmarks, got {landmarks.shape[0]}")
    ls = landmarks[11]  # left shoulder
    rs = landmarks[12]  # right shoulder
    center = (ls + rs) / 2.0
    shoulder_width = float(np.linalg.norm(rs - ls))
    s = shoulder_width if shoulder_width > 1e-6 else 1.0

    out = np.zeros(POSE_UPPER_SIZE, dtype=np.float32)
    for j, idx in enumerate(POSE_UPPER_INDICES):
        p = landmarks[idx]
        out[j * 3] = (p[0] - center[0]) / s
        out[j * 3 + 1] = (p[1] - center[1]) / s
        out[j * 3 + 2] = (p[2] - center[2]) / s
    return out


# ── Feature extraction from one frame ──────────────────────────────────────

def extract_frame_features(
    hand_result: vision.HandLandmarkerResult,
    pose_result: vision.PoseLandmarkerResult | None,
) -> np.ndarray:
    """Build 159-dim feature vector for one frame."""
    features = np.zeros(FULL_FEATURE_SIZE, dtype=np.float32)

    # Hands: classify into left/right by handedness label.
    left_landmarks: np.ndarray | None = None
    right_landmarks: np.ndarray | None = None

    for i, lm in enumerate(hand_result.hand_landmarks):
        handedness = hand_result.handedness[i][0].category_name  # "Left" | "Right"
        arr = np.array([[p.x, p.y, p.z] for p in lm], dtype=np.float32)
        if handedness == "Left":
            left_landmarks = arr
        else:
            right_landmarks = arr

    if left_landmarks is not None:
        features[:63] = normalize_hand(left_landmarks, "Left")
    if right_landmarks is not None:
        features[63:126] = normalize_hand(right_landmarks, "Right")

    if pose_result and pose_result.pose_landmarks:
        pose_arr = np.array(
            [[p.x, p.y, p.z] for p in pose_result.pose_landmarks[0]],
            dtype=np.float32,
        )
        features[126:] = normalize_pose_upper(pose_arr)

    return features


# ── Sign window segmentation ───────────────────────────────────────────────

def segment_windows(
    features: list[np.ndarray],
    window_size: int = 30,
    stride: int = 5,
) -> list[np.ndarray]:
    """Slide a fixed window over the feature sequence with stride."""
    windows: list[np.ndarray] = []
    if len(features) < 10:  # too short
        return windows
    for start in range(0, len(features) - window_size + 1, stride):
        win = np.array(features[start : start + window_size], dtype=np.float32)
        windows.append(win)
    return windows


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Video → landmark windows for temporal model training.")
    parser.add_argument("--input_dir", required=True, help="Directory of video files (MP4, MOV, etc.)")
    parser.add_argument("--labels", required=True, help="CSV with columns: filename,label")
    parser.add_argument("--output", default=os.path.join(DATA_DIR, "temporal"))
    parser.add_argument("--window_size", type=int, default=60)
    parser.add_argument("--stride", type=int, default=15)
    parser.add_argument("--every_n_frames", type=int, default=1,
                        help="Process every Nth frame (1 = all frames).")
    parser.add_argument("--skip_pose", action="store_true", help="Skip PoseLandmarker (hand-only).")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    # Load label map.
    label_map: dict[str, str] = {}
    with open(args.labels, "r") as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) >= 2:
                label_map[parts[0].strip()] = parts[1].strip()
    print(f"Loaded {len(label_map)} labels from {args.labels}")

    # Fetch MediaPipe models.
    hand_model_path = os.path.join(DATA_DIR, "hand_landmarker.task")
    if not os.path.exists(hand_model_path):
        import urllib.request
        print("Downloading hand_landmarker.task…")
        urllib.request.urlretrieve(HAND_MODEL_URL, hand_model_path)

    pose_model_path = os.path.join(DATA_DIR, "pose_landmarker_lite.task")
    if not args.skip_pose and not os.path.exists(pose_model_path):
        import urllib.request
        print("Downloading pose_landmarker_lite.task…")
        urllib.request.urlretrieve(POSE_MODEL_URL, pose_model_path)

    # Create MediaPipe landmarkers.
    # Use IMAGE mode — we process each frame independently so we don't need
    # MediaPipe's temporal smoothing (the GRU handles temporal modeling).
    # IMAGE mode also avoids the "monotonically increasing timestamp" error
    # that would occur in VIDEO mode when switching between video files.
    hand_options = vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=hand_model_path),
        running_mode=vision.RunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.3,  # Lower for 320x240 WLASL videos
    )
    hand_landmarker = vision.HandLandmarker.create_from_options(hand_options)

    pose_landmarker = None
    if not args.skip_pose:
        pose_options = vision.PoseLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=pose_model_path),
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.5,
        )
        pose_landmarker = vision.PoseLandmarker.create_from_options(pose_options)

    # Process each video. Iterate over the label map entries so we support
    # nested subdirectories (e.g. "hello/12345.mp4") from the downloader.
    all_windows: list[np.ndarray] = []
    all_labels: list[str] = []

    for filename, label in tqdm(list(label_map.items()), desc="Processing videos"):
        path = os.path.join(args.input_dir, filename)
        if not os.path.exists(path):
            print(f"  [WARN] missing file: {path}")
            continue
        cap = cv2.VideoCapture(path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_idx = 0
        features_seq: list[np.ndarray] = []

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            if frame_idx % args.every_n_frames != 0:
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            # Upscale low-res frames to improve MediaPipe hand detection
            h, w = rgb.shape[:2]
            if w < 480:
                rgb = cv2.resize(rgb, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            hand_result = hand_landmarker.detect(mp_image)
            pose_result = (
                pose_landmarker.detect(mp_image)
                if pose_landmarker
                else None
            )

            fv = extract_frame_features(hand_result, pose_result)
            # Only keep frames where at least one hand is detected.
            if np.any(fv[:126] != 0):
                features_seq.append(fv)

        cap.release()

        if not features_seq:
            print(f"  [WARN] no hand frames in {filename}, skipping")
            continue

        windows = segment_windows(features_seq, args.window_size, args.stride)
        for w in windows:
            all_windows.append(w)
            all_labels.append(label)

    if not all_windows:
        print("ERROR: No windows extracted. Check your input data.")
        sys.exit(1)

    # Save.
    X = np.stack(all_windows, axis=0)  # (N, window_size, 159)
    np.savez_compressed(os.path.join(args.output, "temporal_landmarks.npz"), X=X)
    with open(os.path.join(args.output, "temporal_labels.json"), "w") as f:
        json.dump(all_labels, f)

    unique_labels = sorted(set(all_labels))
    print(f"\nDone. Extracted {len(all_windows)} windows across {len(unique_labels)} classes.")
    print(f"Classes: {unique_labels}")
    print(f"Saved to {args.output}/temporal_landmarks.npz and temporal_labels.json")


if __name__ == "__main__":
    main()
