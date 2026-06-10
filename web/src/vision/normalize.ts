import { FEATURE_SIZE, type HandFrame } from './types'

/**
 * Convert a raw hand frame into a translation/scale/handedness-invariant
 * feature vector.
 *
 * - Translate so the wrist (landmark 0) is the origin.
 * - Scale by the wrist → middle-finger-MCP (landmark 9) distance, a stable
 *   palm-size reference regardless of distance to the camera.
 * - Mirror left hands across x so both hands share one canonical space and
 *   a single model serves left- and right-handed signers.
 */
export function normalizeHand(frame: HandFrame): number[] {
  const { landmarks, handedness } = frame
  if (landmarks.length !== 21) {
    throw new Error(`expected 21 landmarks, got ${landmarks.length}`)
  }

  const wrist = landmarks[0]
  const mcp = landmarks[9]
  const scale = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y, mcp.z - wrist.z)
  // Degenerate frame (all landmarks collapsed) — avoid dividing by ~0.
  const s = scale > 1e-6 ? scale : 1
  const mirror = handedness === 'Left' ? -1 : 1

  const out = new Array<number>(FEATURE_SIZE)
  for (let i = 0; i < 21; i++) {
    out[i * 3] = ((landmarks[i].x - wrist.x) / s) * mirror
    out[i * 3 + 1] = (landmarks[i].y - wrist.y) / s
    out[i * 3 + 2] = (landmarks[i].z - wrist.z) / s
  }
  return out
}

/** Euclidean distance between two feature vectors. */
export function featureDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}
