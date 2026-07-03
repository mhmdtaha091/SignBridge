export interface Landmark {
  x: number
  y: number
  z: number
}

export type Handedness = 'Left' | 'Right'

/** One tracked hand in one video frame. */
export interface HandFrame {
  /** 21 MediaPipe hand landmarks, normalized image coordinates. */
  landmarks: Landmark[]
  handedness: Handedness
  /** MediaPipe's confidence in the handedness label. */
  score: number
}

import type { SignLanguage } from '../config/language'

/** Number of values in a normalized feature vector: 21 landmarks × (x, y, z). */
export const FEATURE_SIZE = 63

/**
 * Returns the expected feature-vector size for the given sign language.
 * ASL fingerspelling is one-handed (63); PSL uses two-handed BANZSL and
 * needs both hands + upper-body pose (159).
 */
export function getFeatureSize(language: SignLanguage): number {
  return language === 'psl' ? FULL_FEATURE_SIZE : FEATURE_SIZE
}

// ── M3 word-sign (temporal) types ────────────────────────────────────────

/** Upper-body pose landmarks selected for sign-language context.
 *  Landmarks: nose(0), ears(7,8), shoulders(11,12), elbows(13,14),
 *  wrists(15,16), hips(23,24) — 11 landmarks × 3 coords. */
export const POSE_UPPER_INDICES = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24] as const
export const POSE_UPPER_SIZE = POSE_UPPER_INDICES.length * 3 // 33

/** Combined feature size for two-hand + upper-body pose. */
export const FULL_FEATURE_SIZE = FEATURE_SIZE * 2 + POSE_UPPER_SIZE // 159

/** One frame from the combined hand + pose tracker. */
export interface FullTrackedFrame {
  leftHand: HandFrame | null
  rightHand: HandFrame | null
  poseLandmarks: Landmark[] | null
  /** Normalized 159-dim feature vector, with zeros for undetected parts. */
  features: number[]
  timestampMs: number
}
