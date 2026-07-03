# 🤟 SignBridge — Bilingual ASL + PSL Sign Language Tutor

> **Learn sign language. Be understood.**
> A free, open-source browser app that teaches **American Sign Language (ASL)** and **Pakistan Sign Language (PSL)** with live camera feedback — and interprets your signing into spoken words. All computer vision runs **in your browser**; your camera never leaves your device.

**▶️ Live demo: [signbridge-kappa.vercel.app](https://signbridge-kappa.vercel.app)** — works out of the box; no install, no sign-up.

**Status: bilingual ASL + PSL — fingerspelling + word signs, with a 3D avatar tutor.** Ships with built-in recognition models and seed data for both languages, so the app recognizes signs immediately. Recording your own samples fine-tunes it to your hands. See the [roadmap](docs/ROADMAP.md) for what's next.

## What it does

| Mode | What happens |
|---|---|
| **Learn** | A–Z gallery of handshapes with tips and 3D reference hand models. Toggle between ASL (one-handed) and PSL (two-handed BANZSL alphabet). |
| **Practice** | The app shows a letter or word, you sign it at the camera, and it tells you instantly if you got it right. Streaks, per-letter/word mastery. |
| **Interpret** | Sign in front of your camera → words assemble → spoken aloud with the Web Speech API. Fingerspelling (ABC) and word-sign modes. |
| **3D Tutor** | A three.js avatar demonstrates a sign, you mimic it, and DTW scores your form with targeted feedback. |
| **Data Studio** | *Optional* — fine-tune to your own hands in ~10 minutes: record landmark samples per sign, check quality, and train a small neural net, all on-device. |

## PSL — why it matters

Pakistan Sign Language is used by millions of Deaf Pakistanis but has almost no digital learning tools. SignBridge is the first browser-based PSL tutor with its own landmark dataset pipeline:

```
PakistanSignLanguageDatasetV2 (video) → MediaPipe Hands → 159-dim normalized landmarks
                                         → MLP (letters, 99.0% accuracy, 18 letters)
                                         → GRU (word signs, 86.7% accuracy, 69 words)
```

PSL uses the two-handed BANZSL fingerspelling system (shared with British and Australian Sign Language), fundamentally different from ASL's one-handed alphabet. The toggle in the nav bar switches vocab, models, and reference data for both languages.

## How it works

```
Webcam → MediaPipe HandLandmarker (WASM, in-browser) → 21 hand landmarks (×2 for PSL)
       → normalization (translation/scale/handedness-invariant)
       → classifier (KNN baseline, or TF.js MLP/GRU you train in-browser)
       → stability gate (a sign counts only after ~6–8 steady frames)
       → text buffer → Web Speech API 🔊
```

Landmarks instead of raw video makes recognition fast, private, and robust to lighting, skin tone, and background — and the training data is tiny (63–159 numbers per sample, never images).

**Privacy by architecture:** there is no backend. No video, no landmarks, nothing is uploaded anywhere. Training data lives in your browser's IndexedDB and is exportable as JSON.

## Recognition performance

| Model | Language | Type | Accuracy | Vocab |
|---|---|---|---|---|
| ASL letters (MLP) | ASL | Fingerspelling | 94.7% | 24 letters |
| ASL words (GRU) | ASL | Word signs | 96.2% | 25 words |
| PSL letters (MLP) | PSL | Fingerspelling | 99.0% | 18 letters |
| PSL words (GRU) | PSL | Word signs | 86.7% | 69 words |

All numbers are held-out validation accuracy on real landmark data. Model weights are bundled as small TF.js exports; training scripts and larger Keras/H5 weights are in the [ml/](ml/) directory and on the [GitHub Releases](https://github.com/mhmdtaha091/SignBridge/releases) page.

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

SignBridge recognizes **fingerspelling and a fixed vocabulary of word signs** in ASL and PSL. It is **not** a conversational sign-language translator — full sign language translation, with its grammar of motion, space, and facial expression, remains an open research problem. PSL word-sign recognition uses a community-contributed dataset and is less accurate than the ASL model; we're working to improve it. We say this up front out of respect for the Deaf community and the depth of their languages. Learn from Deaf teachers; use SignBridge to practice and to bridge small moments.

## Contributing

All contributions welcome — code, design, ASL/PSL expertise, and donated (landmark-only) training samples via the Data Studio's JSON export. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/DATASET.md](docs/DATASET.md).

## License

[MIT](LICENSE) — free forever.
