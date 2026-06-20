# ml/ — training pipeline (Milestone 2)

Builds SignBridge's **shared starter model**: the bundled classifier so the web
app recognizes the ASL fingerspelling alphabet *before* a user records anything.

Nothing here runs in the browser. Raw data lives in the gitignored `data/`.
Only the trained artifacts under `web/public/` are committed.

## Pipeline

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows;  source .venv/bin/activate elsewhere
pip install -r requirements.txt

python extract_landmarks.py   # public images -> normalized landmark samples
python train.py               # train MLP -> export model + seed to web/public
```

1. **`extract_landmarks.py`** — downloads a public, no-auth ASL alphabet image
   set ([Marxulia/asl_sign_languages_alphabets_v03](https://huggingface.co/datasets/Marxulia/asl_sign_languages_alphabets_v03))
   and the **same `hand_landmarker.task`** the browser uses, runs MediaPipe Hands
   over every image, and writes `data/landmarks.jsonl`. Two correctness details:
   - Normalization is a line-for-line port of `web/src/vision/normalize.ts`
     (wrist origin, palm-size scale, mirror Left hands), so training features and
     the browser's live features share one space.
   - Each image is letterboxed to **16:9** before detection, matching the live
     960×540 camera — MediaPipe normalizes x by width and y by height, so this
     keeps hand shapes from being aspect-distorted relative to the live feed.
   - `J` and `Z` are skipped (they're signed with motion; out of scope for a
     static-frame model — see the roadmap backlog).

2. **`train.py`** — trains an MLP whose architecture matches the in-browser one
   in `web/src/recognition/mlp.ts` (63 → dense128 relu → dropout → dense64 relu →
   softmax) using scikit-learn, then exports:
   - `web/public/models/asl-default/model.json` — plain weight arrays the app
     rebuilds into the identical tf.js graph via `setWeights` (no tfjs converter).
   - `web/public/seed/asl-fingerspelling.json` — a small balanced sample set for
     the in-browser KNN and the reference-pose hand diagrams.

The app loads these in `web/src/recognition/starter.ts` and falls back to them
whenever the user has no data of their own.

See [docs/ROADMAP.md](../docs/ROADMAP.md) and [docs/DATASET.md](../docs/DATASET.md).
