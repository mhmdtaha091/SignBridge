import { featureDistance } from '../vision/normalize'
import type { Classifier, LabeledSample, Prediction } from './types'

/**
 * Distance-weighted k-nearest-neighbours over normalized hand landmarks.
 * With ~10–20 clean samples per letter this is accurate, instant to "train"
 * (it just stores the samples), and easy to reason about — the baseline
 * classifier while the TF.js MLP is the opt-in upgrade.
 */
export class KnnClassifier implements Classifier {
  private samples: LabeledSample[]
  private k: number

  constructor(samples: LabeledSample[] = [], k = 5) {
    this.samples = samples
    this.k = k
  }

  get size() {
    return this.samples.length
  }

  predict(features: number[]): Prediction | null {
    if (this.samples.length === 0) return null
    const k = Math.min(this.k, this.samples.length)

    // Partial selection of the k nearest (n is small; simple sort is fine).
    const nearest = this.samples
      .map((s) => ({ label: s.label, d: featureDistance(features, s.features) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k)

    const votes = new Map<string, number>()
    let total = 0
    for (const { label, d } of nearest) {
      const w = 1 / (d + 1e-6)
      votes.set(label, (votes.get(label) ?? 0) + w)
      total += w
    }

    let best: Prediction = { label: '', confidence: 0 }
    for (const [label, w] of votes) {
      const confidence = w / total
      if (confidence > best.confidence) best = { label, confidence }
    }
    return best
  }
}

/**
 * Leave-one-out accuracy — the honest quality readout shown in the Data
 * Studio after recording ("your data classifies itself N% correctly").
 */
export function leaveOneOutAccuracy(samples: LabeledSample[], k = 5): number {
  if (samples.length < 2) return 0
  let correct = 0
  for (let i = 0; i < samples.length; i++) {
    const rest = samples.slice(0, i).concat(samples.slice(i + 1))
    const pred = new KnnClassifier(rest, k).predict(samples[i].features)
    if (pred?.label === samples[i].label) correct++
  }
  return correct / samples.length
}
