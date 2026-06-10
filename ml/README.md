# ml/ — training pipeline (Milestone 2+)

This directory will hold the Python pipeline that builds SignBridge's **shared starter model**:

1. `aggregate.py` — merge community-donated Data Studio exports (CC0 JSON) + public datasets
2. `train.py` — train the fingerspelling classifier (Keras), matching the browser's
   normalization in `web/src/vision/normalize.ts` exactly
3. `export_tfjs.py` — export to TF.js so the web app ships with recognition that works
   before a user records anything

Nothing here ships to the browser directly, and raw data lives in the gitignored `data/`.
See [docs/ROADMAP.md](../docs/ROADMAP.md) and [docs/DATASET.md](../docs/DATASET.md).
