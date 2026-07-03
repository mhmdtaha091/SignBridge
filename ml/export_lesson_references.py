"""
Export reference trajectories for the default tutor lesson words only.
Faster version of export_reference_trajectories.py — only processes the
5 default lesson words (hello, thank you, yes, no, love).

Usage:
    python ml/export_lesson_references.py
"""
import json
import math
import os
import sys
from pathlib import Path

import cv2
import numpy as np

# Paths
ROOT = Path(__file__).resolve().parent.parent
VIDEOS_DIR = ROOT / "ml" / "data" / "wlasl_videos"
OUTPUT_DIR = ROOT / "web" / "public" / "references"
MODEL_DIR = ROOT / "ml" / "data"

# Map lesson words to video directory names
LESSON_WORDS = {
    "hello": "hello",
    "thank you": "thank_you",
    "yes": "yes",
    "no": "no",
    "love": "love",
}

# Import MediaPipe
try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
except ImportError:
    print("ERROR: pip install mediapipe")
    sys.exit(1)

# Import helpers from preprocess_temporal.py
sys.path.insert(0, str(ROOT / "ml"))
from preprocess_temporal import extract_frame_features


def frame_dist(a, b):
    return float(np.sqrt(np.sum((a - b) ** 2)))


def dtw(a, b):
    n, m = len(a), len(b)
    if n == 0 or m == 0:
        return {"distance": float("inf"), "normalizedDistance": 1.0}

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


def find_medoid(sequences):
    if len(sequences) == 1:
        return sequences[0]
    best_idx, best_avg = -1, float("inf")
    for i in range(len(sequences)):
        total = sum(
            dtw(sequences[i], sequences[j])["distance"]
            for j in range(len(sequences))
            if i != j
        )
        avg = total / (len(sequences) - 1)
        if avg < best_avg:
            best_avg, best_idx = avg, i
    print(f"    Medoid avg raw distance: {best_avg:.2f}")
    return sequences[best_idx]


def process_video(video_path, hand_landmarker, pose_landmarker):
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return None

    frames_features = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        h, w = frame.shape[:2]
        if w < 480:
            frame = cv2.resize(frame, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        hand_result = hand_landmarker.detect(mp_image)
        pose_result = pose_landmarker.detect(mp_image) if pose_landmarker else None
        features = extract_frame_features(hand_result, pose_result)
        if features is not None and not all(v == 0 for v in features[:126]):
            frames_features.append(features)
    cap.release()
    if len(frames_features) < 10:
        return None
    return frames_features


def main():
    print("=" * 60)
    print("SignBridge — Lesson Reference Trajectory Export")
    print("=" * 60)

    hand_model = MODEL_DIR / "hand_landmarker.task"
    pose_model = MODEL_DIR / "pose_landmarker_lite.task"

    if not hand_model.exists():
        print(f"ERROR: Hand landmarker not found at {hand_model}")
        sys.exit(1)

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

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    processed = 0
    skipped = 0

    for word, dirname in LESSON_WORDS.items():
        word_dir = VIDEOS_DIR / dirname
        if not word_dir.exists():
            print(f"\n'{word}' (dir: {dirname}): NOT FOUND — skipping")
            skipped += 1
            continue

        videos = sorted(word_dir.glob("*.mp4"))
        print(f"\n'{word}' ({len(videos)} videos)...")

        sequences = []
        for video in videos:
            print(f"    {video.name}...", end=" ", flush=True)
            seq = process_video(video, hand_landmarker, pose_landmarker)
            if seq:
                sequences.append(seq)
                print(f"{len(seq)} frames")
            else:
                print("SKIP")

        if len(sequences) < 1:
            print(f"  SKIP: No usable sequences for '{word}'")
            skipped += 1
            continue

        medoid = find_medoid(sequences)
        if medoid is None:
            skipped += 1
            continue

        output_path = OUTPUT_DIR / f"{word}.json"
        # Convert numpy arrays to plain lists for JSON serialization
        frames_list = [[float(v) for v in f] for f in medoid]
        data = {"word": word, "frames": frames_list, "numFrames": len(medoid)}
        with open(output_path, "w") as f:
            json.dump(data, f)
        print(f"  OK Exported {len(medoid)} frames -> {output_path.name}")
        processed += 1

    hand_landmarker.close()
    if pose_landmarker:
        pose_landmarker.close()

    print(f"\n{'=' * 60}")
    print(f"Done. {processed} exported, {skipped} skipped.")
    print(f"Output: {OUTPUT_DIR}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
