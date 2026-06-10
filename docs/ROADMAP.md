# Roadmap

Each milestone is independently demo-able. New ideas go to the backlog, not the current milestone.

## ✅ M1 — Fingerspelling v0 (shipped)

- Full app shell: Landing, Learn, Practice, Interpret, Data Studio, About
- Live in-browser hand tracking (MediaPipe HandLandmarker) with landmark overlay
- Normalized landmark features + KNN classifier + in-browser TF.js MLP training
- Stability gate → word buffer → speech (Web Speech API)
- Practice quiz with streaks and per-letter mastery
- Data Studio: record/export/import samples (IndexedDB, landmark-only)

## M2 — Shared starter model

- Community landmark dataset (donated via Data Studio JSON export, CC0)
- `ml/` Python pipeline: aggregate donations + public datasets → train → ship a default TF.js model so the app works **before** recording your own samples
- Per-user fine-tuning stays on-device

## M3 — Word signs (dynamic)

- Rolling window of frames → temporal model (GRU/small Transformer) for ~20–30 common word signs
- Two-hand + upper-body pose features (PoseLandmarker)
- Confidence gating to suppress garbage between signs

## M4 — Tutor mode

- 3D avatar (three.js) demonstrates each sign
- Learner trajectory vs reference via DTW → 0–100 score + targeted feedback ("raise your hand", "slow down")
- Lesson sequences building on Practice mastery

## M5 — Reach

- PWA: offline support (self-host MediaPipe WASM + model), installable
- i18n; architecture supports other sign languages (vocab + model are swappable config)
- Deployment to a public URL + demo GIFs

## Backlog (not scheduled)

- J/Z motion recognition (trajectory matching for the two moving letters)
- Two-signer mode, facial-grammar cues, mobile camera ergonomics
