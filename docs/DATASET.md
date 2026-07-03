# Data: how SignBridge learns hands

## What a sample is

One sample = one hand pose = **63 numbers** (21 MediaPipe hand landmarks × x/y/z), normalized to be invariant to position, distance, and handedness (left hands are mirrored into right-hand space). See `web/src/vision/normalize.ts`.

**No images or video are ever stored or shared.** A sample cannot be reversed into a photo of you.

## Recording your own (the Data Studio)

1. Open **Data Studio** in the app.
2. Pick a letter, press record, hold the handshape through the countdown.
3. While the 15-sample burst captures, *move your hand around a little* — closer, farther, tilted — so the model learns the shape, not the position.
4. Aim for 15+ samples per letter; 30 (two bursts) is better.
5. **Check quality** runs leave-one-out validation on your data; below ~90%, re-record the letters that confuse each other (commonly M/N/S/T/A and U/R).
6. **Train neural net** trains a small MLP in your browser (~seconds) and switches recognition to it.

## Contributing samples to the community dataset

Export your samples as JSON in the Data Studio and attach them to a GitHub issue/PR. By donating you agree to release them as **CC0**. Donations feed the M2 shared starter model so future users get recognition out of the box.

## The shipped starter model (M2)

SignBridge now bundles a default fingerspelling model so recognition works
before you record anything. It's built by the [`ml/`](../ml/README.md) pipeline:

1. `extract_landmarks.py` pulls a public, no-auth ASL alphabet image set
   ([Marxulia/asl_sign_languages_alphabets_v03](https://huggingface.co/datasets/Marxulia/asl_sign_languages_alphabets_v03))
   and runs the **same** MediaPipe `hand_landmarker.task` the browser uses,
   normalizing exactly like `web/src/vision/normalize.ts` (images are letterboxed
   to 16:9 first, matching the live camera). `J`/`Z` are excluded (motion signs).
2. `train.py` trains an MLP matching `web/src/recognition/mlp.ts` and exports
   `web/public/models/asl-default/model.json` + a small seed in
   `web/public/seed/`. The app loads these in `web/src/recognition/starter.ts`
   and falls back to your own recorded data the moment you add any.

## PSL models (M3.5)

SignBridge ships bilingual recognition. The PSL models are built from the
[PakistanSignLanguageDatasetV2](https://www.kaggle.com/datasets/alihasan360/pakistan-sign-language-dataset-v2)
on Kaggle (public, no-auth):

1. `ml/extract_psl_landmarks.py` runs MediaPipe Hands on every video frame
   producing 159-dim feature vectors (two hands + upper body) — PSL is a
   two-handed language (BANZSL family), unlike one-handed ASL.
2. `ml/train_psl_letters.py` trains an MLP on isolated PSL letter frames
   (same architecture as the ASL letters MLP but with 159-dim input).
3. `ml/train_psl_gru.py` trains a GRU on PSL word-sign video clips,
   producing the TF.js export at `web/public/models/psl-gru-word-signs/`.

### Measured accuracy (held-out validation)

| Model | Accuracy | Vocab | Notes |
|---|---|---|---|
| PSL letters (MLP) | **99.0%** | 18 letters | Trained on Kaggle PSL dataset; A/B/C/D/F/G/H/K/L/M/N/P/Q/R/S/T/V/Y |
| PSL words (GRU) | **86.7%** | 69 words | Community dataset, cross-signer eval pending (M5) |
| ASL letters (MLP) | 94.7% | 24 letters | Shipped in M2 |
| ASL words (GRU) | 96.2% | 25 words | Shipped in M3 |

PSL letters achieve higher accuracy than ASL because PSL's two-handed system
produces more distinctive landmark configurations per letter. PSL word-sign
accuracy is lower — the dataset is community-sourced with fewer samples per
sign and more inter-signer variation. Cross-signer evaluation (M5) will give
an honest generalization number.

## Other public datasets (for future milestones)

| Dataset | Type | Use |
|---|---|---|
| Google ASL Fingerspelling (Kaggle) | landmark sequences | more fingerspelling data |
| WLASL / MS-ASL | video | word-sign vocabulary, M3 (extract landmarks with MediaPipe) |

Raw datasets live in `data/` which is **gitignored** — never commit raw data; commit scripts and exported models only.
