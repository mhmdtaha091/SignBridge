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

## Public datasets (for the M2/M3 `ml/` pipeline)

| Dataset | Type | Use |
|---|---|---|
| Google ASL Fingerspelling (Kaggle) | landmark sequences | fingerspelling pretraining |
| WLASL / MS-ASL | video | word-sign vocabulary (extract landmarks with MediaPipe) |

Raw datasets live in `data/` which is **gitignored** — never commit raw data; commit scripts and exported models only.
