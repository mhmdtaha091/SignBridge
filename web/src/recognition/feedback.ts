import type { DtwResult } from './dtw'
import type { FeedbackMessage } from '../components/FeedbackBanner'

/**
 * Generate human-readable feedback from a DTW comparison.
 *
 * Rules (hand landmarks only, first 126 dims of the 159-dim feature vector):
 * - Wrist position (landmark 0) → hand height
 * - Thumb position (landmark 4) → thumb placement
 * - Average speed (trajectory length / reference length) → pace
 * - Overall DTW distance → general form
 */

const WRIST_Y = 1      // index 1 in a 3-coord landmark
const THUMB_TIP_X = 12 // landmark 4, x coordinate (index 4*3 = 12)

export function generateFeedback(
  learnerFrames: number[][],
  referenceFrames: number[][],
  dtwResult: DtwResult,
): FeedbackMessage[] {
  const msgs: FeedbackMessage[] = []

  if (learnerFrames.length === 0 || referenceFrames.length === 0) {
    return [{ message: 'No hand detected — try again with better lighting.', kind: 'general' }]
  }

  const score = (1 - dtwResult.normalizedDistance) * 100

  // General form.
  if (score < 40) {
    msgs.push({ message: 'Your form is quite different from the reference. Watch the avatar and try to match the hand shape more closely.', kind: 'general' })
  }

  // Wrist height analysis.
  const avgLearnerWristY = learnerFrames.reduce((s, f) => s + f[WRIST_Y], 0) / learnerFrames.length
  const avgRefWristY = referenceFrames.reduce((s, f) => s + f[WRIST_Y], 0) / referenceFrames.length
  const wristDelta = avgLearnerWristY - avgRefWristY

  if (Math.abs(wristDelta) > 0.05) {
    msgs.push({
      message: wristDelta > 0
        ? 'Your hand is too low — raise it higher.'
        : 'Your hand is too high — lower it a bit.',
      kind: 'raise',
    })
  }

  // Thumb position.
  const avgLearnerThumb = learnerFrames.reduce((s, f) => s + f[THUMB_TIP_X], 0) / learnerFrames.length
  const avgRefThumb = referenceFrames.reduce((s, f) => s + f[THUMB_TIP_X], 0) / referenceFrames.length
  const thumbDelta = avgLearnerThumb - avgRefThumb

  if (Math.abs(thumbDelta) > 0.04) {
    msgs.push({
      message: thumbDelta > 0
        ? 'Your thumb is sticking out too far — tuck it in.'
        : 'Extend your thumb out more.',
      kind: 'tuck',
    })
  }

  // Pace analysis.
  const durRatio = learnerFrames.length / Math.max(1, referenceFrames.length)
  if (durRatio > 1.3) {
    msgs.push({ message: 'Slow the motion down — take your time with the sign.', kind: 'speed' })
  } else if (durRatio < 0.6) {
    msgs.push({ message: 'That was very quick — try a slower, more deliberate motion.', kind: 'speed' })
  }

  // If everything is good.
  if (msgs.length === 0 && score >= 70) {
    msgs.push({ message: 'Great form! Your hand shape and motion matched well.', kind: 'general' })
  }

  return msgs.slice(0, 3)
}
