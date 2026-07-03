import type { DtwResult } from './dtw'
import type { FeedbackMessage } from '../components/FeedbackBanner'

/**
 * Generate human-readable feedback from a DTW comparison.
 *
 * Rules operate on the first 126 dims of the 159-dim feature vector
 * (two hands, 21 landmarks × 3 coords each). Indices below use the
 * right-hand portion (offset 63) when two hands are present; when
 * only one hand is detected the indices map directly.
 *
 * Landmark indices (MediaPipe hand):
 *   0=wrist, 4=thumb tip, 8=index tip, 12=middle tip, 16=ring tip, 20=pinky tip
 */

const INDEX_TIP = 8
const PINKY_TIP = 20

/** Compute hand offset: 63 for two-hand (159-dim), 0 for single-hand (63-dim). */
function handOffset(frame: number[]): number {
  return frame.length === 159 ? 63 : 0
}

function coord(frame: number[], landmark: number, axis: number): number {
  return frame[handOffset(frame) + landmark * 3 + axis]
}

export function generateFeedback(
  learnerFrames: number[][],
  referenceFrames: number[][],
  dtwResult: DtwResult,
): FeedbackMessage[] {
  const msgs: FeedbackMessage[] = []

  if (learnerFrames.length === 0 || referenceFrames.length === 0) {
    return [{ message: 'No hand detected — try again with better lighting.', kind: 'general' }]
  }

  const score = Math.round((1 - dtwResult.normalizedDistance) * 100)

  // ── 1. Overall form ──────────────────────────────────────────────────────
  if (score < 35) {
    msgs.push({
      message: 'Your form is quite different from the reference. Watch the avatar carefully and try to match the hand shape.',
      kind: 'general',
    })
  } else if (score < 55) {
    msgs.push({
      message: 'Getting there! Try to mirror the avatar more closely — focus on finger positions.',
      kind: 'general',
    })
  }

  // ── 2. Hand height ───────────────────────────────────────────────────────
  const avgLearnerWristY = learnerFrames.reduce((s, f) => s + coord(f, 0, 1), 0) / learnerFrames.length
  const avgRefWristY = referenceFrames.reduce((s, f) => s + coord(f, 0, 1), 0) / referenceFrames.length
  const wristDelta = avgLearnerWristY - avgRefWristY

  if (Math.abs(wristDelta) > 0.05) {
    msgs.push({
      message: wristDelta > 0
        ? 'Your hand is too low — raise it higher to match the avatar.'
        : 'Your hand is too high — lower it a bit to match the avatar.',
      kind: 'raise',
    })
  }

  // ── 3. Finger spread ─────────────────────────────────────────────────────
  const avgLearnerSpread = learnerFrames.reduce(
    (s, f) => s + Math.abs(coord(f, INDEX_TIP, 0) - coord(f, PINKY_TIP, 0)),
    0,
  ) / learnerFrames.length
  const avgRefSpread = referenceFrames.reduce(
    (s, f) => s + Math.abs(coord(f, INDEX_TIP, 0) - coord(f, PINKY_TIP, 0)),
    0,
  ) / referenceFrames.length
  const spreadDelta = avgLearnerSpread - avgRefSpread

  if (Math.abs(spreadDelta) > 0.06) {
    msgs.push({
      message: spreadDelta > 0
        ? 'Your fingers are too spread out — bring them closer together.'
        : 'Spread your fingers apart more to match the sign.',
      kind: 'tuck',
    })
  }

  // ── 4. Index finger height (important for many finger-spelled letters) ────
  const avgLearnerIndexY = learnerFrames.reduce((s, f) => s + coord(f, INDEX_TIP, 1), 0) / learnerFrames.length
  const avgRefIndexY = referenceFrames.reduce((s, f) => s + coord(f, INDEX_TIP, 1), 0) / referenceFrames.length
  const indexDelta = avgLearnerIndexY - avgRefIndexY

  if (Math.abs(indexDelta) > 0.04) {
    msgs.push({
      message: indexDelta > 0
        ? 'Your index finger is pointing too high — lower it slightly.'
        : 'Lift your index finger higher to match the reference.',
      kind: 'raise',
    })
  }

  // ── 5. Pace / speed ──────────────────────────────────────────────────────
  const durRatio = learnerFrames.length / Math.max(1, referenceFrames.length)
  if (durRatio > 1.4) {
    msgs.push({
      message: 'Take your time with the sign — a steady, deliberate motion works best.',
      kind: 'speed',
    })
  } else if (durRatio < 0.55) {
    msgs.push({
      message: 'That was very quick — slow down and hold the final handshape for a moment.',
      kind: 'speed',
    })
  }

  // ── 6. Success ───────────────────────────────────────────────────────────
  if (msgs.length === 0 && score >= 75) {
    msgs.push({
      message: 'Great form! Your hand shape and motion matched the reference really well.',
      kind: 'general',
    })
  } else if (msgs.length === 0 && score >= 55) {
    msgs.push({
      message: 'Good attempt! Keep practicing to get even closer to the reference.',
      kind: 'general',
    })
  } else if (msgs.length === 0) {
    msgs.push({
      message: 'Keep practicing — focus on matching the avatar hand shape exactly.',
      kind: 'general',
    })
  }

  return msgs.slice(0, 4)
}
