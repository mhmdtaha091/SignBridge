# 🤟 SignBridge

> **Learn sign language. Be understood.**
> A free, open-source web app that teaches ASL fingerspelling with live camera feedback — and interprets your signing into spoken words. All computer vision runs **in your browser**; your camera never leaves your device.

**Status: v0 — fingerspelling alphabet (A–Z), live and working.** See the [roadmap](docs/ROADMAP.md) for what's next (word signs, 3D avatar tutor).

## What it does

| Mode | What happens |
|---|---|
| **Learn** | A friendly A–Z gallery of ASL handshapes with tips. Once you record samples, *your own hands* become the diagrams. |
| **Practice** | The app shows a letter, you sign it at the camera, and it tells you instantly if you got it right. Streaks, per-letter mastery. |
| **Interpret** | Fingerspell in front of your camera → letters assemble into words → spoken aloud with the Web Speech API. |
| **Data Studio** | Teach SignBridge your hands in ~10 minutes: record landmark samples per letter, check quality, and train a small neural net — all on-device. |

## How it works

```
Webcam → MediaPipe HandLandmarker (WASM, in-browser) → 21 hand landmarks
       → normalization (translation/scale/handedness-invariant)
       → classifier (KNN baseline, or TF.js MLP you train in-browser)
       → stability gate (a letter counts only after ~8 steady frames)
       → text buffer → Web Speech API 🔊
```

Landmarks instead of raw video makes recognition fast, private, and robust to lighting, skin tone, and background — and the training data is tiny (63 numbers per sample, never images).

**Privacy by architecture:** there is no backend. No video, no landmarks, nothing is uploaded anywhere. Training data lives in your browser's IndexedDB and is exportable as JSON.

## Run it locally

```bash
cd web
npm install
npm run dev     # open http://localhost:5173
npm test        # unit tests (normalization, stability gate, KNN)
npm run build   # production build (static, deployable anywhere)
```

Requires Node 20+ and a webcam. First load downloads the MediaPipe hand model (~few MB, then cached).

## Honest scope

SignBridge recognizes **fingerspelling** (and soon a fixed vocabulary of word signs). It is **not** a conversational ASL translator — full sign language translation, with its grammar of motion, space, and facial expression, remains an open research problem. We say this up front out of respect for the Deaf community and the depth of their languages. Learn from Deaf teachers; use SignBridge to practice and to bridge small moments.

## Contributing

All contributions welcome — code, design, ASL expertise, and donated (landmark-only) training samples via the Data Studio's JSON export. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/DATASET.md](docs/DATASET.md).

## License

[MIT](LICENSE) — free forever.
