"""
Export reference trajectories for the 3D tutor.

Processes each video through the same MediaPipe + normalization
pipeline used for training, then selects the medoid trajectory per word
(the one most representative of that sign) and exports it as a JSON file
for the browser-based tutor.

Usage:
    python ml/export_reference_trajectories.py [--language asl|psl]

Outputs:
    ASL: web/public/references/{word}.json  — one file per word sign
    PSL: web/public/references/psl/{word}.json  — language-prefixed
"""

import argparse
import json
import math
import os
import sys
from pathlib import Path

import numpy as np

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
VIDEOS_DIR = ROOT / "ml" / "data" / "wlasl_videos"
OUTPUT_DIR = ROOT / "web" / "public" / "references"
MODEL_DIR = ROOT / "ml" / "data"

# ---------------------------------------------------------------------------
# DTW (same algorithm as web/src/recognition/dtw.ts)
# ---------------------------------------------------------------------------

def frame_dist(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.sqrt(np.sum((a - b) ** 2)))


def dtw(a: list, b: list):
    """Classic DTW between two sequences of frames."""
    n, m = len(a), len(b)
    if n == 0 or m == 0:
        return {"distance": float("inf"), "normalizedDistance": 1.0, "path": []}

    d = np.zeros((n, m), dtype=np.float64)
    d[0, 0] = frame_dist(a[0], b[0])

    for j in range(1, m):
        d[0, j] = frame_dist(a[0], b[j]) + d[0, j - 1]
    for i in range(1, n):
        d[i, 0] = frame_dist(a[i], b[0]) + d[i - 1, 0]

    for i in range(1, n):
        for j in range(1, m):
            cost = frame_dist(a[i], b[j])
            d[i, j] = cost + min(d[i - 1, j], d[i, j - 1], d[i - 1, j - 1])

    distance = float(d[n - 1, m - 1])
    normalized = min(1.0, distance / math.sqrt(n * m))

    return {"distance": distance, "normalizedDistance": normalized}


# ---------------------------------------------------------------------------
# MediaPipe landmark extraction (reuses preprocess_temporal.py functions)
# ---------------------------------------------------------------------------

def try_import_mediapipe():
    """Attempt to import MediaPipe and the preprocess helpers."""
    try:
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision
    except ImportError:
        print(
            "ERROR: MediaPipe not installed. Run:\n"
            "  pip install mediapipe\n"
            "Then re-run this script."
        )
        sys.exit(1)

    # Import helpers from preprocess_temporal.py
    sys.path.insert(0, str(ROOT / "ml"))
    try:
        from preprocess_temporal import (
            extract_frame_features,
            normalize_hand,
            normalize_pose_upper,
        )
        return mp, mp_python, mp_vision, extract_frame_features, normalize_hand, normalize_pose_upper
    except ImportError as e:
        print(f"ERROR: Could not import from preprocess_temporal.py: {e}")
        print("Make sure ml/preprocess_temporal.py exists and is runnable.")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Video processing
# ---------------------------------------------------------------------------

def process_video(video_path: Path, hand_landmarker, pose_landmarker) -> list | None:
    """
    Extract a full landmark sequence from a video file.
    Returns a list of 159-dim feature vectors, or None if insufficient frames.
    """
    import cv2

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"  WARNING: Cannot open {video_path}")
        return None

    frames_features = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Upscale low-res frames (same as preprocess_temporal.py)
        h, w = frame.shape[:2]
        if w < 480:
            frame = cv2.resize(frame, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)

        # Convert to MediaPipe image
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        # Detect hands and pose
        hand_result = hand_landmarker.detect(mp_image)
        pose_result = pose_landmarker.detect(mp_image) if pose_landmarker else None

        # Extract features
        features = extract_frame_features(
            hand_result, pose_result, frame_idx,
            normalize_hand, normalize_pose_upper,
        )

        # Only keep frames where at least one hand was detected
        if features is not None and not all(v == 0 for v in features[:126]):
            frames_features.append(features)

        frame_idx += 1

    cap.release()

    if len(frames_features) < 10:
        print(f"  WARNING: Only {len(frames_features)} usable frames in {video_path.name}")
        return None

    return frames_features


# ---------------------------------------------------------------------------
# Medoid selection
# ---------------------------------------------------------------------------

def find_medoid(sequences: list[list]) -> list | None:
    """
    From a list of sequences for the same word, return the one with the
    minimum average DTW distance to all others (the medoid).
    """
    if not sequences:
        return None
    if len(sequences) == 1:
        return sequences[0]

    n = len(sequences)
    best_idx = -1
    best_avg_dist = float("inf")

    for i in range(n):
        total = 0.0
        for j in range(n):
            if i == j:
                continue
            result = dtw(sequences[i], sequences[j])
            total += result["normalizedDistance"]
        avg = total / (n - 1)
        if avg < best_avg_dist:
            best_avg_dist = avg
            best_idx = i

    print(f"  Medoid avg DTW distance: {best_avg_dist:.4f}")
    return sequences[best_idx]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Export reference trajectories for SignBridge 3D tutor")
    parser.add_argument(
        "--language", type=str, default="asl", choices=["asl", "psl"],
        help="Sign language to export references for (default: asl)"
    )
    args = parser.parse_args()
    language = args.language

    # Language-prefixed output directory
    lang_output_dir = OUTPUT_DIR / language if language != "asl" else OUTPUT_DIR
    lang_videos_dir = VIDEOS_DIR  # May be overridden for PSL below
    if language == "psl":
        # Use PSL word video directory if available
        psl_videos = ROOT / "ml" / "data" / "psl_word_videos"
        if psl_videos.exists():
            lang_videos_dir = psl_videos

    print("=" * 60)
    print(f"SignBridge — Reference Trajectory Export ({language.upper()})")
    print("=" * 60)

    # Import MediaPipe and helpers
    global mp
    mp, mp_python, mp_vision, extract_frame_features, normalize_hand, normalize_pose_upper = (
        try_import_mediapipe()
    )

    # Locate model files
    hand_model = MODEL_DIR / "hand_landmarker.task"
    pose_model = MODEL_DIR / "pose_landmarker_lite.task"

    if not hand_model.exists():
        print(f"ERROR: Hand landmarker not found at {hand_model}")
        print("Download it from: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker")
        sys.exit(1)

    # Initialize MediaPipe
    base_options = mp_python.BaseOptions(model_asset_path=str(hand_model))
    hand_options = mp_vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=2,
        min_hand_detection_confidence=0.3,
        running_mode=mp_vision.RunningMode.IMAGE,
    )
    hand_landmarker = mp_vision.HandLandmarker.create_from_options(hand_options)

    pose_landmarker = None
    if pose_model.exists():
        pose_base = mp_python.BaseOptions(model_asset_path=str(pose_model))
        pose_options = mp_vision.PoseLandmarkerOptions(
            base_options=pose_base,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            running_mode=mp_vision.RunningMode.IMAGE,
        )
        pose_landmarker = mp_vision.PoseLandmarker.create_from_options(pose_options)

    # Collect all videos grouped by word
    if not lang_videos_dir.exists():
        print(f"ERROR: Videos directory not found at {lang_videos_dir}")
        print("Run download_wlasl.py (ASL) or download PSL word videos first.")
        sys.exit(1)

    word_videos: dict[str, list[Path]] = {}
    for word_dir in sorted(lang_videos_dir.iterdir()):
        if not word_dir.is_dir():
            continue
        videos = sorted(word_dir.glob("*.mp4"))
        if videos:
            word_videos[word_dir.name] = videos

    print(f"\nFound {sum(len(v) for v in word_videos.values())} videos "
          f"across {len(word_videos)} words.\n")

    # Process each word
    os.makedirs(lang_output_dir, exist_ok=True)
    processed = 0
    skipped = 0

    for word, videos in sorted(word_videos.items()):
        print(f"Processing '{word}' ({len(videos)} videos)...")

        sequences = []
        for video in videos:
            seq = process_video(video, hand_landmarker, pose_landmarker)
            if seq:
                sequences.append(seq)

        if len(sequences) < 1:
            print(f"  SKIP: No usable sequences for '{word}'")
            skipped += 1
            continue

        medoid = find_medoid(sequences)
        if medoid is None:
            print(f"  SKIP: Could not find medoid for '{word}'")
            skipped += 1
            continue

        # Export
        output_path = lang_output_dir / f"{word}.json"
        data = {
            "word": word,
            "frames": medoid,
            "numFrames": len(medoid),
        }
        with open(output_path, "w") as f:
            json.dump(data, f)

        print(f"  ✓ Exported {len(medoid)} frames → {output_path.name}")
        processed += 1

    # Cleanup
    hand_landmarker.close()
    if pose_landmarker:
        pose_landmarker.close()

    print(f"\n{'=' * 60}")
    print(f"Done. {processed} references exported, {skipped} skipped.")
    print(f"Output: {lang_output_dir}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
