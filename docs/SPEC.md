# SignBridge — Build Spec

> Working name. Two-way sign-language communication + tutor, running live in the browser.
> Target: ASL first, architected so another sign language (e.g., PSL) can be swapped in later.

---

## 1. Scope — what this IS and ISN'T

**IS (the achievable, demo-able target):**
- Real-time recognition of a **fixed vocabulary**: ASL fingerspelling (A–Z) + ~20–30 dynamic word-signs.
- **Interpreter mode:** signer → recognized signs → assembled text → spoken aloud (TTS).
- **Tutor mode:** a 3D avatar demonstrates a chosen sign; the learner mimics; the system scores their form and gives targeted correction.
- Runs **client-side in a browser**, deployable as a static site (live, clickable demo).

**IS NOT (research-grade — explicitly out of scope):**
- Continuous, conversational sign-language *translation* (fluent multi-sign sentences with facial grammar). This is an open research problem; we are not promising it.
- Recognition of arbitrary signs outside the trained vocabulary.

> **Why the precision matters:** a demo that reliably does 30 signs beats a demo that "tries to translate anything" and stutters. The README and CV line must describe the fixed-vocabulary scope honestly.

---

## 2. Architecture

```
Webcam frame
   │
   ▼
MediaPipe Tasks (in-browser)
   ├─ HandLandmarker   → 21 landmarks × 2 hands
   ├─ PoseLandmarker   → 33 upper-body landmarks
   └─ (optional) FaceLandmarker → subset for grammar cues
   │
   ▼
Feature vector per frame  → normalized, translation/scale-invariant
   │
   ├──────────────► INTERPRETER MODE
   │                  rolling window of T frames
   │                  → temporal model (GRU / Transformer)
   │                  → predicted sign (+ confidence gate)
   │                  → word/sentence buffer
   │                  → Web Speech API (SpeechSynthesis) 🔊
   │
   └──────────────► TUTOR MODE
                      target sign → 3D avatar (three.js) demonstrates
                      learner mimics → their landmark trajectory
                      → DTW vs reference trajectory
                      → similarity score + rule-based feedback
                        ("raise your hand", "thumb tucked", "slow down")
```

### Why landmarks, not raw video (vs. the old YOLOv8 approach)
- Tiny, fast — real-time in a browser tab, no GPU server.
- Invariant to lighting, skin tone, background, camera quality.
- Person-independent → generalizes from a small dataset.
- Same landmark stream feeds **both** recognition and tutor-correction.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React + Vite + TypeScript** | Static, deploys to Vercel |
| Landmarks | **@mediapipe/tasks-vision** | Hand + Pose landmarkers, WASM, runs in-browser |
| Model (inference) | **TF.js** or **onnxruntime-web** | Keras→TF.js is the smoothest browser path |
| Model (training) | **Python + TensorFlow/Keras** | (PyTorch fine too; Keras→TF.js export is easier) |
| 3D avatar | **three.js / react-three-fiber** + glTF | Ready Player Me or Mixamo rigged avatar |
| Pose comparison | **DTW** (custom or `dtw-python` offline) | Trajectory similarity for tutor scoring |
| Speech out | **Web Speech API** (`SpeechSynthesis`) | Built into browsers, zero infra |
| Deploy | **Vercel** | Static site, free, live demo URL |

No backend required for v0–v2. Optional FastAPI only if a model gets too heavy for the browser (unlikely at this vocab size).

---

## 4. Data pipeline

### Feature representation
- Per frame: concatenate `[hand_left(21×3), hand_right(21×3), pose_upper(~15×3)]` → flatten.
- **Normalize** each frame: translate so a stable anchor (e.g., midpoint of shoulders) is origin; scale by shoulder width. Makes it invariant to distance/position.
- Sequence length: **T = 30–60 frames** (~1–2 s). Pad/truncate to fixed T for the model.

### Datasets (ASL)
| Source | Type | Use |
|---|---|---|
| **Sign Language MNIST** (Kaggle) | Static letter images | Quick v0 sanity check only (images, not landmarks) |
| **Google ASL Fingerspelling** (Kaggle) | Landmark sequences | v0/v1 fingerspelling — already landmarks, ideal |
| **WLASL** (2000 words, video) | Video | v1 word-signs — extract landmarks via MediaPipe |
| **MS-ASL** | Video | Supplement / extra vocab |
| **Your own recordings** | Landmark sequences | Most reliable for the demo + "I built my own dataset" story |

### Self-recorded data (recommended for the demo vocab)
- Build `ml/record_data.py`: opens webcam, runs MediaPipe, records labeled landmark sequences to `.npy` / `.parquet`.
- Record ~30–50 samples per sign, varying speed/position. Recruit 1–2 friends for signer diversity.
- This small, clean, self-consistent set will outperform noisy web video for a live demo.

> `data/` is **gitignored**. Never commit raw video or large datasets. Commit the *recorder*, the *training script*, and the *exported model* only.

---

## 5. Models

**v0 fingerspelling (static-ish):** per-frame classifier (MLP or small 1D-CNN) over a single frame's landmarks → 26 letters. Add a debounce so a held handshape emits one letter.

**v1/v2 dynamic signs (temporal):** sequence model over T frames:
- Baseline: **GRU** (1–2 layers) or **1D-CNN over time**.
- Upgrade: small **Transformer encoder** (shows range; not required for v1).
- Output: softmax over vocabulary + a **confidence threshold** so low-confidence frames emit nothing (prevents garbage speech).

**Export:** Keras model → `tensorflowjs_converter` → load in-browser with TF.js. Keep the model small (<a few MB) for fast load.

---

## 6. Tutor mode details

1. **Avatar:** rigged glTF (Ready Player Me / Mixamo) in react-three-fiber.
2. **Demonstration:** per target sign, a short animation. v2 realistic path = **hand-authored keyframes** for the small vocab (or retarget recorded landmark trajectories to avatar bones — advanced, optional).
3. **Capture + score:** learner mimics; capture their landmark trajectory; run **DTW** against the reference trajectory for that sign → distance → 0–100 score.
4. **Feedback rules:** per-joint deviation → human-readable hints. Examples:
   - wrist Y too low → "raise your hand higher"
   - thumb landmark position → "tuck your thumb in"
   - trajectory too fast/slow vs reference → "slow the motion down"
5. **Gamify (optional polish):** streaks, per-sign mastery, a small lesson sequence.

---

## 7. Repo structure

```
signbridge/
├─ README.md                 # hero + live demo link + scope statement
├─ docs/
│  ├─ SPEC.md                 # this file
│  ├─ ROADMAP.md              # milestones + acceptance criteria
│  └─ DATASET.md              # how to get/record data, licenses
├─ web/                       # React + Vite app (the deployable demo)
│  └─ src/
│     ├─ mediapipe/           # landmark extraction + normalization
│     ├─ models/              # tfjs/onnx model + loader + inference
│     ├─ modes/
│     │  ├─ interpreter/      # recognition → buffer → TTS
│     │  └─ tutor/            # avatar + DTW scoring + feedback
│     ├─ avatar/              # three.js / r3f avatar + animations
│     └─ tts/                 # Web Speech API wrapper
├─ ml/                        # Python training (not shipped to browser)
│  ├─ record_data.py          # webcam landmark recorder
│  ├─ preprocess.py           # normalize + windowing
│  ├─ model.py                # GRU / Transformer definition
│  ├─ train.py                # training loop + eval
│  └─ export_tfjs.py          # Keras → TF.js export
└─ data/                      # GITIGNORED — raw + processed data
```

`config/vocab.json` (language-swappable): maps sign-id → label → TTS text → reference-trajectory path. Swapping `vocab.json` + the trained model = swap language. **This is how ASL→PSL later stays a config change, not a rewrite.**

---

## 8. Milestones & acceptance criteria

| Phase | Done when… |
|---|---|
| **v0 MVP** | In-browser webcam → fingerspell your name → it speaks the letters. ≥90% accuracy on A–Z for the primary signer. |
| **v1 Interpreter** | 20–30 word-signs recognized live; signs assemble into a short phrase; phrase spoken via TTS; confidence gate suppresses garbage. |
| **v2 Tutor** | Avatar demonstrates a chosen sign; learner mimics; score + at least 3 distinct feedback messages fire correctly; small lesson of 5 signs. |
| **v3 Polish** | Deployed to Vercel with a public URL; README with demo GIF + scope statement; short write-up of the approach; ≥40 signs or measured accuracy table. |

Each phase is independently demo-able — you never have "nothing to show."

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Continuous translation is too hard | **Scope to fixed vocabulary.** Stated up front. Don't promise sentences. |
| Web video datasets are noisy | **Record your own clean small vocab.** Better demo + good story. |
| Avatar animation is a time sink | v2 uses **hand-authored keyframes** for a few signs; defer landmark→bone retargeting. |
| Model too big for browser | Keep vocab small + model tiny; fall back to onnxruntime-web; last resort FastAPI inference. |
| Demo flakiness on stage | Ship a **confidence gate** + a "practice mode" with on-screen landmark overlay so it's debuggable live. |
| Scope creep (face grammar, two-signer, etc.) | Roadmap is law. New ideas → `docs/BACKLOG.md`, not v1. |

---

## 10. CV / portfolio framing (truthful)

> **SignBridge — Real-time ASL communication & tutor (browser).** Built a client-side system that recognizes ASL fingerspelling + ~30 signs from MediaPipe hand/pose landmarks via a temporal neural net (TF.js), speaks them aloud, and includes a three.js 3D-avatar tutor that scores a learner's form with dynamic time warping and gives corrective feedback. Deployed as a live, in-browser demo.

Demonstrates: **computer vision** (pose/hand estimation) · **temporal deep learning** · **3D/WebGL** · **real-time client-side ML** · **accessibility**. And it's **clickable** — the thing PentestAI couldn't be.

---

## 11. First-day checklist (June 16)

1. `npm create vite@latest web -- --template react-ts`, add `@mediapipe/tasks-vision`, `@react-three/fiber`.
2. Get HandLandmarker drawing live landmarks on webcam in-browser (proves the pipeline).
3. `ml/record_data.py` — record the ASL alphabet for yourself (~30 samples/letter).
4. Train the v0 per-frame letter classifier; export to TF.js; wire into the web app.
5. Hit the **v0 acceptance criterion** (fingerspell your name → it speaks). Ship that, then move to v1.
