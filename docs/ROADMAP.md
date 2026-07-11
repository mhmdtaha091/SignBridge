# SignBridge — Roadmap & Working Plan

> Rewritten 2026-07-02. Supersedes the old M1–M5 roadmap and absorbs the external
> fix-list (`D:\Projects\_docs\deepseek-plans\SIGNBRIDGE_PLAN.md`). Each milestone is
> independently demo-able and has acceptance criteria. New ideas go to the backlog,
> not the current milestone.

## Where we are (2026-07-06)

- ✅ **M1 — Fingerspelling v0** (shipped): full app shell, in-browser hand tracking,
  KNN + trainable TF.js MLP, stability gate → word buffer → speech, Practice quiz,
  Data Studio with IndexedDB samples.
- ✅ **M2 — Shared starter model** (shipped): `ml/` Python pipeline, default ASL
  fingerspelling model (94.7% held-out on 24 letters), works out of the box.
- ✅ **M3 — Word signs** (shipped): GRU word-sign model, **96.2% accuracy, 25 words,
  706 windows**, 601KB TF.js export; Colab training pipeline.
- ✅ **M3.5 — PSL** (shipped 2026-07-03): bilingual ASL + PSL, 4 models (ASL letters,
  ASL words, PSL letters 99.0%/18 letters, PSL words 86.7%/69 words), PSL vocab with
  BANZSL two-handed alphabet, language toggle wired across all pages with guardrails.
- ✅ **M4 — Tutor mode** (shipped 2026-07-03): 5 reference trajectories (hello, love,
  no, thank you, yes), WebGL context fix (IntersectionObserver lazy-mount), per-pose
  auto-framing (bounding-sphere camera scaling), DTW feedback (hand height, finger
  spread, index position, pace, overall form).
- ✅ **M4.5 — Polish** (shipped 2026-07-03): shared Button/Card components, hamburger
  mobile nav (≥44px touch targets), footer link fixed, DTW/signGate/vocabResolver
  tests (63 tests, 8 files), OG image + favicon.
- ✅ **M5.1 — CI** (shipped): GitHub Actions on push/PR (TypeScript check + tests +
  build), green badge in README.
- 🟡 **M5.2 — Cross-signer eval**: `ml/cross_signer_eval.py` is ready (fast vectorized
  1-NN baseline). Needs PSL landmarks re-extracted with source labels (laptop_data vs
  webcam_data) to produce the published generalization number.
- 🟡 **M5.3—M5.5**: metrics table complete (4 models, accuracy + vocab); demo GIF
  placeholder in README; signGate FP rate and latency measurements pending real-device
  benchmarking.
- ✅ **PWA** (2026-07-06): manifest.json, service worker with cache-first strategy,
  self-hosted MediaPipe WASM + .task models — app is installable and offline-capable.
- ✅ **Community dataset** (2026-07-06): CC0 contribution section in Data Studio with
  instructions for donating landmark samples via GitHub Issues.
- Live demo: https://signbridge-kappa.vercel.app · Repo: github.com/mhmdtaha091/SignBridge

---

## M3.5 — Ship PSL (highest priority: commit existing work)

PSL support is the headline feature. "Another ASL demo" competes with hundreds of
repos; "the first browser-based Pakistan Sign Language tutor with its own landmark
dataset pipeline" competes with none, and it's a genuine accessibility contribution
for an underserved language.

1. **Commit everything PSL** currently untracked/modified. Review the diff file by
   file first (14+ modified web files) and land it as a small series of atomic
   commits (data pipeline / models / web wiring / docs).
2. **Do not commit `.h5`/`.keras` weights into git history.** Attach them to a
   GitHub Release (or Hugging Face Hub) and commit only the small TF.js exports
   under `web/public/models/`, matching the ASL pattern.
3. **PSL guardrails (from external review):** audit every page reading
   `useLanguageStore` (`Learn`, `LetterDetail`, `Practice`, `WordLearn`,
   `WordPractice`, `Interpret`, `TutorMode`). Each must either genuinely support
   PSL end-to-end (vocab + recognition model) or show the "PSL recognition coming
   soon — camera recognition still uses the ASL model" banner pattern already used
   in `Interpret.tsx`. No silent vocab/model mismatch.
4. **README re-headline:** lead with bilingual ASL + PSL. Add the PSL dataset story
   (PakistanSignLanguageDatasetV2 → MediaPipe landmarks → GRU) and the honest-scope
   paragraph extended to PSL.
5. Record PSL accuracy numbers from the training runs into `docs/DATASET.md` — only
   real, source-verified numbers (same rule as the resume).

**Done when:** `git status` is clean; PSL letters + words work live (or are clearly
bannered); README leads with ASL + PSL; PSL model weights downloadable from a
Release; measured PSL accuracy documented.

---

## M4 — Tutor mode (the demo-wow milestone)

The hard parts exist (DTW in `web/src/recognition/dtw.ts` + `dtwClassifier.ts`,
`ml/export_reference_trajectories.py`, `ProceduralHand.tsx`, `TutorMode.tsx`).
What's missing is data and three confirmed rendering bugs.

### 4a. Reference trajectories (P0 — tutor always fails without them)
`web/public/references/` contains no trajectory JSON, so `loadReferenceTrajectory()`
always hits the `refError` path.
1. Read `referenceLoader.ts` for the exact JSON schema; read
   `export_reference_trajectories.py` for expected inputs.
2. Run the export for at least the default lesson words
   (`hello, thank you, yes, no, love`) — ideally the full word vocab.
3. Commit the JSONs; verify in a dev server that all default words animate and
   score 0–100 with zero `refError` banners.

### 4b. WebGL context exhaustion in the Letters gallery (P0, confirmed live)
`/learn` mounts 24 separate R3F `<Canvas>` elements → browser context cap →
`THREE.WebGLRenderer: Context Lost` ×200+, blank white cards.
**Fix (pick one):** (a) pre-render gallery thumbnails to static images and keep live
3D only on detail pages; (b) lazy-mount via IntersectionObserver with a hard cap of
~6 concurrent canvases; or (c) drei's `<View>` to share one canvas across the grid
(standard R3F pattern, already a dependency).
**Done when:** scrolling the full alphabet produces zero Context Lost messages and
every card shows a real snapshot.

### 4c. Hand renders as an unframed blob (P0, confirmed live, separate bug)
Landmark magnitude varies ~4× per pose (letter A y≈−0.43 vs letter B y≈−1.88) but
`HandSnapshot3D.tsx` / `AvatarView.tsx` use one fixed camera + fixed scale
(`scale={[2.5,-2.5,2.5]}`), so some letters fill the frame as a blob and others
render off-frustum. **Fix:** per-pose auto-framing — compute
`THREE.Box3().setFromPoints(verts)` → bounding sphere → set camera distance or
group scale from `sphere.radius` (memoized per pose, not per frame). Run
`defaultPose()` through the same path. Verify on ≥5 visually distinct letters
(A, B, S, C, L) by actually looking at a dev server — code inspection will not
catch regressions here.

### 4d. Scoring & feedback polish
- DTW score → 0–100 with at least 3 distinct rule-based feedback messages firing
  correctly ("raise your hand", "slow down", finger-shape hints).
- A 5-sign lesson sequence that builds on Practice mastery.

**Done when:** a stranger can open /tutor, watch the 3D hand demonstrate a sign,
mimic it, and get a score + targeted feedback for all 5 lesson words — and this is
captured as the README hero GIF.

---

## M4.5 — Correctness, consistency, and mobile (external review debt)

All items from the external fix-list not covered above:

1. **Broken footer link** — `Layout.tsx` points to `github.com/signbridge` (404);
   fix to `github.com/mhmdtaha091/SignBridge`. Grep the tree for other stale URLs
   (`example.com`, `TODO`, `FIXME`).
2. **Component extraction** — create `ui/Button.tsx` (primary/secondary/danger/
   success variants) and `ui/Card.tsx`; replace the ~13 hand-copied class strings
   across pages. Keep the existing cream/ink/coral/sun/leaf/sky palette; no UI
   library. Acceptance: `grep -rn "rounded-full bg-coral" web/src/pages` → 0 hits
   outside Button.tsx; pages pixel-similar.
3. **Mobile pass** — hamburger nav below `md` (7 links + language toggle currently
   wrap into a mess); camera-first stacking below `lg` in Interpret/Tutor; audit
   DataStudio; ≥44×44px touch targets. Acceptance: no horizontal scroll or overlap
   at 375 / 768 / 1280px on every route.
4. **Hiring-audience polish** — OpenGraph/social preview image + non-default
   favicon; WCAG AA contrast check on `sun-*` text (use sun-600/700 for text,
   100/400 for backgrounds only). Keep the warm, friendly tone — do not
   corporate-ify.
5. **Tests for untested logic** — `dtw.ts` (identical→~0, different→high),
   `signGate.ts` (cooldown, minFrames, duplicate suppression),
   `vocabResolver.ts` (right vocab per language). `npx tsc -b` and `npm test`
   clean before each tier is "done".

---

## M5 — Proof of quality (what recruiters and reviewers actually check)

1. ✅ **CI** — GitHub Actions: lint + `npm test` + `npm run build` on push/PR, badge
   in README.
2. 🟡 **Cross-signer evaluation** — `ml/cross_signer_eval.py` is ready (fast
   vectorized 1-NN). **Blocked on:** re-extracting PSL landmarks with source labels
   (`laptop_data` vs `webcam_data`). Once done, train on one source → test on other
   → publish the honest generalization number.
3. ✅ **Metrics table in README** — letters (ASL 94.7%), words (ASL 96.2%/25 words),
   PSL letters 99.0%, PSL words 86.7%/69 words. Architecture-expected latency/FPS
   included; real-device numbers replace them in M5 final.
4. 🟡 **Demo GIF** — placeholder in README. Record Interpret + Tutor loops on a real
   device and replace the placeholder.
5. 🟡 **signGate false-positive rate** — `web/src/recognition/benchmark.ts` ready for
   console-based benchmarking. Scripted 2-minute session + confidence threshold
   tuning pending.

---

## M6 — Reach

- ✅ **PWA** (2026-07-06): offline support via service worker (cache-first strategy),
  self-hosted MediaPipe WASM files + hand/pose landmarker .task models in
  `web/public/`, `manifest.json` with theme color and icons, installable on
  Chrome/Edge. SW registration in `main.tsx`.
- ✅ **Community dataset** (2026-07-06): CC0 contribution section in Data Studio
  with public-domain dedication notice and GitHub Issues link for submitting
  landmark-sample JSON exports.
- **Technical write-up**: "Why landmarks beat YOLOv8 for browser sign recognition"
  + the PSL dataset pipeline story. Publish (blog / dev.to / repo docs) and link
  from README and portfolio site.
- i18n; architecture already supports language swap via vocab + model config.

## Backlog (not scheduled)

J/Z motion recognition (trajectory matching) · two-signer mode · facial-grammar
cues · mobile camera ergonomics · more word vocab (40+ signs).

---

## Resume / portfolio framing (truthful, kept current)

> **SignBridge — Real-time bilingual sign-language tutor (browser).** Client-side
> recognition of ASL + Pakistan Sign Language fingerspelling and word signs from
> MediaPipe landmarks (94.7% letters / 96.2% words, GRU temporal model in TF.js),
> spoken aloud via Web Speech API, with a three.js 3D tutor that scores signing
> form using dynamic time warping. Built the PSL landmark dataset pipeline. No
> backend — camera data never leaves the device. Live demo.

Rules: fixed-vocabulary scope stated plainly; only source-verified numbers; "first
browser-based PSL tutor" only after PSL is live and verified in the deployed app.
