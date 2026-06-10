export interface Prediction {
  label: string
  /** 0–1; share of the (distance-weighted) vote or softmax probability. */
  confidence: number
}

export interface LabeledSample {
  label: string
  /** Normalized 63-dim feature vector (see vision/normalize). */
  features: number[]
}

/** Anything that can classify a single normalized hand frame. */
export interface Classifier {
  predict(features: number[]): Prediction | null
}
