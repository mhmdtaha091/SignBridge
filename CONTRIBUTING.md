# Contributing to SignBridge

Thanks for helping make sign language learning free for everyone! All kinds of contributions are welcome:

- **Code** — features, fixes, tests, performance
- **Design & accessibility** — this app must be excellent for Deaf and hard-of-hearing users
- **ASL expertise** — corrections to tips, sign accuracy review (we especially welcome Deaf and CODA contributors)
- **Training samples** — donate landmark-only samples via the Data Studio export (see [docs/DATASET.md](docs/DATASET.md))

## Dev setup

```bash
cd web
npm install
npm run dev    # http://localhost:5173
```

Before opening a PR:

```bash
npm test       # vitest unit tests
npm run build  # typecheck + production build must pass
npm run lint
```

## Project shape

- `web/src/vision/` — camera, MediaPipe landmarker, normalization, overlay
- `web/src/recognition/` — KNN, TF.js MLP, stability gate
- `web/src/store/` — zustand stores + IndexedDB persistence
- `web/src/pages/` — Learn / Practice / Interpret / Data Studio
- `docs/` — spec, roadmap, dataset guide
- `ml/` — (M2+) Python training pipeline for the shared starter model

## Ground rules

- Keep the scope honest: we never claim full ASL translation.
- Privacy is non-negotiable: nothing leaves the device; no analytics; no accounts.
- New ideas go to the roadmap backlog via an issue first — small, demo-able milestones win.

By contributing you agree your work is released under the [MIT license](LICENSE); donated samples are released as CC0.
