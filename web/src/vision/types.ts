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

/** Number of values in a normalized feature vector: 21 landmarks × (x, y, z). */
export const FEATURE_SIZE = 63
