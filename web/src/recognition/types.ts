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

// ── M3 word-sign (temporal) types ────────────────────────────────────────

/** A labelled sequence of frames (one recorded sign). */
export interface LabeledSequence {
  label: string
  /** frames.length × FULL_FEATURE_SIZE features per frame. */
  frames: number[][]
}

/**
 * Stateful sequence classifier. Feed frames one at a time; it accumulates
 * a rolling window and returns a prediction when a full gesture is recognized.
 */
export interface SequenceClassifier {
  /** Feed the next frame. Returns a prediction when confident, else null. */
  feedFrame(features: number[], timestampMs: number): Prediction | null
  /** Reset internal state (e.g. at a sign boundary or mode switch). */
  reset(): void
  /** Whether the classifier has a model loaded. */
  readonly ready: boolean
  /** Vocabulary labels this model can output. */
  readonly labels: string[]
}
