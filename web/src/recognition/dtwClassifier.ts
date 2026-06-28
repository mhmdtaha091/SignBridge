import { dtw } from './dtw'
import { FULL_FEATURE_SIZE } from '../vision/types'
import type { Prediction, SequenceClassifier, LabeledSequence } from './types'

const WINDOW_SIZE = 30
const MAX_REF_WINDOW = 45

/**
 * DTW-based sequence classifier — a working MVP classifier before the GRU
 * model is trained. Stores reference trajectories (one or more per word sign)
 * and classifies by finding the closest DTW match against the current
 * rolling window.
 *
 * Implements the SequenceClassifier interface so the GRU model can be
 * swapped in later with zero UI changes.
 */
export class DtwSequenceClassifier implements SequenceClassifier {
  private refs: Map<string, number[][][]> = new Map()
  private window: number[][] = []
  readonly labels: string[] = []
  readonly ready = true

  private constructor() {}

  /** Build from labeled sequences (from the Python pipeline or hand-recorded). */
  static fromSequences(sequences: LabeledSequence[]): DtwSequenceClassifier {
    const inst = new DtwSequenceClassifier()
    const map = new Map<string, number[][][]>()
    for (const seq of sequences) {
      if (!map.has(seq.label)) map.set(seq.label, [])
      map.get(seq.label)!.push(seq.frames.slice(0, MAX_REF_WINDOW))
    }
    inst.refs = map
    ;(inst as { labels: string[] }).labels = [...map.keys()]
    return inst
  }

  /** Empty classifier (always returns null). */
  static empty(): DtwSequenceClassifier {
    return new DtwSequenceClassifier()
  }

  feedFrame(features: number[], _timestampMs: number): Prediction | null {
    if (this.refs.size === 0) return null
    if (features.length !== FULL_FEATURE_SIZE) {
      throw new Error(`Expected ${FULL_FEATURE_SIZE} features, got ${features.length}`)
    }

    this.window.push(features)
    if (this.window.length > WINDOW_SIZE) this.window.shift()
    if (this.window.length < 15) return null

    // Compare current window against each reference trajectory.
    let bestLabel = ''
    let bestNorm = 1

    for (const [label, trajectories] of this.refs) {
      for (const ref of trajectories) {
        const result = dtw(ref, this.window)
        if (result.normalizedDistance < bestNorm) {
          bestNorm = result.normalizedDistance
          bestLabel = label
        }
      }
    }

    if (bestNorm > 0.35) return null // Too different — probably not a sign.
    const confidence = 1 - bestNorm
    if (confidence < 0.4) return null
    return { label: bestLabel, confidence: Math.min(1, confidence) }
  }

  /** Add a new reference trajectory for a sign (e.g. user recording). */
  addReference(label: string, frames: number[][]) {
    if (!this.refs.has(label)) {
      this.refs.set(label, [])
      ;(this as { labels: string[] }).labels = [...this.labels, label]
    }
    this.refs.get(label)!.push(frames.slice(0, MAX_REF_WINDOW))
  }

  reset() {
    this.window = []
  }
}
