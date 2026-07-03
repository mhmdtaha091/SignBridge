# Reference Trajectories for the 3D Tutor

This directory holds per-word reference trajectories for the tutor's DTW scoring engine.

## Format

Each file is named `{word}.json` and contains:

```json
{
  "word": "hello",
  "frames": [[159 floats], [159 floats], ...],
  "numFrames": 45
}
```

Each frame is a 159-dim feature vector: `[leftHand(63) | rightHand(63) | poseUpper(33)]`

## Generating References

Run the Python export script from the project root:

```bash
cd D:/Projects/SignBridge
pip install mediapipe opencv-python numpy
python ml/export_reference_trajectories.py
```

This processes the WLASL videos in `ml/data/wlasl_videos/` through the same
MediaPipe + normalization pipeline used for training, selects the medoid
(most typical) trajectory per word via DTW, and exports them here.

## Fallback

If a word's reference file doesn't exist, the tutor shows:
- "No reference animation for this sign yet" on the avatar side
- "No reference available for this sign yet. Try another word!" during scoring

The learner can still record and save practice attempts — the scores just
won't have a reference comparison until the references are generated.
