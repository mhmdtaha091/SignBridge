import {
  FEATURE_SIZE,
  POSE_UPPER_INDICES,
  POSE_UPPER_SIZE,
  type HandFrame,
  type Landmark,
} from './types'

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

/**
 * Normalize upper-body pose landmarks for sign-language context.
 *
 * - Anchor: midpoint of left & right shoulders (landmarks 11 & 12 in
 *   MediaPipe's 33-landmark topology).
 * - Scale: shoulder-width (distance between landmarks 11 and 12).
 * - Degenerate-frame guard: if both shoulders coincide, scale defaults to 1.
 *
 * Only the subset defined by POSE_UPPER_INDICES is included in the output.
 */
export function normalizePoseUpper(landmarks: Landmark[]): number[] {
  if (landmarks.length < 25) {
    throw new Error(`expected ≥ 25 pose landmarks, got ${landmarks.length}`)
  }

  const ls = landmarks[11] // left shoulder
  const rs = landmarks[12] // right shoulder
  const centerX = (ls.x + rs.x) / 2
  const centerY = (ls.y + rs.y) / 2
  const centerZ = (ls.z + rs.z) / 2
  const shoulderWidth = Math.hypot(rs.x - ls.x, rs.y - ls.y, rs.z - ls.z)
  const s = shoulderWidth > 1e-6 ? shoulderWidth : 1

  const out = new Array<number>(POSE_UPPER_SIZE)
  for (let j = 0; j < POSE_UPPER_INDICES.length; j++) {
    const p = landmarks[POSE_UPPER_INDICES[j]]
    out[j * 3] = (p.x - centerX) / s
    out[j * 3 + 1] = (p.y - centerY) / s
    out[j * 3 + 2] = (p.z - centerZ) / s
  }
  return out
}

/**
 * Build the 159-dim combined feature vector for a full tracked frame.
 * Layout: [leftHand(63) | rightHand(63) | poseUpper(33)].
 * Missing hands or pose are zero-filled so the vector is always the same size.
 */
export function buildFullFeatures(
  leftHand: HandFrame | null,
  rightHand: HandFrame | null,
  poseLandmarks: Landmark[] | null,
): number[] {
  const out = new Array<number>(FEATURE_SIZE * 2 + POSE_UPPER_SIZE).fill(0)

  if (leftHand) {
    const f = normalizeHand(leftHand)
    for (let i = 0; i < FEATURE_SIZE; i++) out[i] = f[i]
  }
  if (rightHand) {
    const f = normalizeHand(rightHand)
    for (let i = 0; i < FEATURE_SIZE; i++) out[FEATURE_SIZE + i] = f[i]
  }
  if (poseLandmarks) {
    const f = normalizePoseUpper(poseLandmarks)
    for (let i = 0; i < POSE_UPPER_SIZE; i++) {
      out[FEATURE_SIZE * 2 + i] = f[i]
    }
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
