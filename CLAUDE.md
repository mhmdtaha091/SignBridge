# CLAUDE.md — SignBridge

Bilingual (ASL + Pakistan Sign Language) sign-language tutor running entirely in
the browser. Live: https://signbridge-kappa.vercel.app · Repo:
github.com/mhmdtaha091/SignBridge. Flagship portfolio project — README quality
matters as much as code quality.

Roadmap + current milestone status: `docs/ROADMAP.md` (keep it updated when
milestones ship). Dataset numbers: `docs/DATASET.md`.

## Commands

```bash
# Web app (web/)
cd web
npm install
npm run dev        # Vite dev server
npm run test       # vitest (63 tests, 8 files)
npm run lint       # eslint
npm run build      # tsc -b && vite build  (CI runs check+test+build)

# ML pipeline (ml/) — Python, training runs mostly in Colab
python ml/cross_signer_eval.py     # cross-signer 1-NN eval (needs source-labeled landmarks)
python ml/export_reference_trajectories.py   # tutor reference JSONs
```

## Architecture

- `web/src/vision/` — MediaPipe hand-landmark extraction (client-side only; no
  camera data ever leaves the device — this is a hard product guarantee).
- `web/src/recognition/` — KNN + TF.js MLP (letters), GRU (words), DTW scoring
  (`dtw.ts`, `dtwClassifier.ts`) for tutor mode.
- `web/src/pages/` — Learn, Practice, WordLearn/WordPractice, Interpret,
  TutorMode, DataStudio (IndexedDB sample capture + CC0 community contribution).
- `web/public/models/` — small TF.js exports only. **Never commit `.h5`/`.keras`
  weights to git** — attach to a GitHub Release / HF Hub instead.
- `web/public/references/` — tutor reference trajectory JSONs.
- PWA: `manifest.json` + service worker (cache-first), self-hosted MediaPipe
  WASM + `.task` models.

## Gotchas

- **4 models** (ASL letters 94.7%, ASL words 96.2%/25, PSL letters 99.0%/18,
  PSL words 86.7%/69) — any page reading `useLanguageStore` must either fully
  support the selected language or show the "PSL recognition coming soon" banner
  (pattern in `Interpret.tsx`). No silent vocab/model mismatch.
- WebGL: gallery canvases are lazy-mounted via IntersectionObserver — do not
  mount many R3F `<Canvas>` elements at once (context-loss bug, fixed in M4).
- 3D hand rendering uses per-pose auto-framing (bounding-sphere camera scaling);
  landmark magnitude varies ~4× per pose — verify rendering changes by looking
  at a dev server, not by code inspection.
- Accuracy numbers in README/docs must be measured, never estimated (workspace
  rule). Cross-signer number is unpublished until `cross_signer_eval.py` runs on
  source-labeled data.
