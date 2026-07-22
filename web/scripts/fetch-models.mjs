#!/usr/bin/env node
/**
 * fetch-models.mjs — fetch the self-hosted MediaPipe runtime assets.
 *
 * The app self-hosts MediaPipe WASM + .task models (see src/vision/) so the
 * PWA works offline and no camera-adjacent code loads from a third-party CDN
 * at runtime. Those binaries (~46 MB) are not committed to git; this script
 * materializes them:
 *   - public/wasm/    ← copied from node_modules/@mediapipe/tasks-vision/wasm
 *                       (version-locked by package.json)
 *   - public/models/*.task ← downloaded once from Google's model storage
 *                            (pinned versions, size-verified)
 *
 * Runs automatically via the predev/prebuild hooks; safe to re-run (skips
 * anything already present with the expected size).
 */
import { createWriteStream } from 'node:fs'
import { mkdir, stat, copyFile, readdir } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WASM_SRC = path.join(ROOT, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const WASM_DST = path.join(ROOT, 'public', 'wasm')
const MODELS_DST = path.join(ROOT, 'public', 'models')

// Pinned model releases; sizes are the published Content-Lengths and double as
// integrity + skip-if-present checks.
const MODELS = [
  {
    name: 'hand_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    bytes: 7819105,
  },
  {
    name: 'pose_landmarker_lite.task',
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    bytes: 5777746,
  },
]

async function sizeOf(file) {
  try {
    return (await stat(file)).size
  } catch {
    return -1
  }
}

async function copyWasm() {
  await mkdir(WASM_DST, { recursive: true })
  const files = await readdir(WASM_SRC)
  let copied = 0
  for (const f of files) {
    const src = path.join(WASM_SRC, f)
    const dst = path.join(WASM_DST, f)
    if ((await sizeOf(dst)) === (await sizeOf(src))) continue
    await copyFile(src, dst)
    copied++
  }
  console.log(`wasm: ${copied ? `copied ${copied} file(s)` : 'up to date'} → public/wasm`)
}

async function fetchModel({ name, url, bytes }) {
  const dst = path.join(MODELS_DST, name)
  if ((await sizeOf(dst)) === bytes) {
    console.log(`model: ${name} up to date`)
    return
  }
  console.log(`model: downloading ${name} (${(bytes / 1e6).toFixed(1)} MB) ...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dst))
  const got = await sizeOf(dst)
  if (got !== bytes) throw new Error(`${name}: expected ${bytes} bytes, got ${got}`)
  console.log(`model: ${name} done`)
}

await mkdir(MODELS_DST, { recursive: true })
await copyWasm()
for (const m of MODELS) await fetchModel(m)
console.log('MediaPipe assets ready.')
