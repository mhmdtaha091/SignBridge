# SignBridge

> Two-way ASL communication + tutor, running live in the browser.
> **Status: planning / not started — build begins after exams (June 16, 2026).** See [`docs/SPEC.md`](docs/SPEC.md).

Real-time recognition of ASL fingerspelling and a fixed vocabulary of signs from
webcam hand/pose landmarks (MediaPipe → temporal neural net, TF.js), spoken aloud
via the Web Speech API — plus a three.js 3D-avatar tutor that scores your signing
form and corrects it. Client-side, deployable as a static site.

**Two modes:**
- **Interpreter** — signer → recognized signs → spoken sentence.
- **Tutor** — 3D avatar demonstrates a sign, you mimic, it grades your form and gives feedback.

ASL first; architected (via `config/vocab.json` + swappable model) so another sign
language can be added without a rewrite.

> Scope is a **fixed vocabulary**, not open-ended conversational translation — see the
> SPEC for the honest scope statement.
