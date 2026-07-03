# PSL Model Directory

This directory holds the trained Pakistan Sign Language models.

## How to get trained models

### PSL Letters (fingerspelling)
Run the Colab notebook: `ml/colab/signbridge_psl_letters.ipynb`
- Downloads the PSL alphabet dataset from Kaggle
- Extracts MediaPipe landmarks (159-dim: both hands + pose)
- Trains an MLP classifier
- Exports `model.json` to this directory

After Colab training, place:
- `model.json` → `web/public/models/psl-default/model.json`
- Seed file → `web/public/seed/psl-fingerspelling.json`

### PSL Word Signs
Run the Colab notebook: `ml/colab/signbridge_psl_words.ipynb`
- Downloads the Dynamic Word-Level PSL dataset from Kaggle
- Trains a GRU model (same architecture as ASL)
- Exports to TF.js format

After Colab training, place:
- `model.json` → `web/public/models/psl-gru-word-signs/model.json`
- `group1-shard1of1.bin` → `web/public/models/psl-gru-word-signs/group1-shard1of1.bin`
- `vocab.json` → `web/public/models/psl-gru-word-signs/vocab.json`

## Without trained models
The app will still work in PSL mode:
- Letters: Use the Data Studio to record your own samples, then train in-browser
- Words: The interpreter will show a "model not available" notice
- Tutor: Reference trajectories can be recorded from the Data Studio
