import { describe, expect, it } from 'vitest'
import { KnnClassifier, leaveOneOutAccuracy } from './knn'
import type { LabeledSample } from './types'

// Tiny synthetic "letters": clusters around distinct corners of feature space.
function cluster(label: string, center: number, count: number): LabeledSample[] {
  return Array.from({ length: count }, (_, i) => ({
    label,
    features: Array.from({ length: 63 }, (_, j) => center + Math.sin(i + j) * 0.05),
  }))
}

const samples = [...cluster('A', 0, 8), ...cluster('B', 1, 8), ...cluster('C', -1, 8)]

describe('KnnClassifier', () => {
  it('returns null with no samples', () => {
    expect(new KnnClassifier().predict(new Array(63).fill(0))).toBeNull()
  })

  it('classifies points near a cluster correctly with high confidence', () => {
    const knn = new KnnClassifier(samples)
    const pred = knn.predict(new Array(63).fill(1.02))
    expect(pred?.label).toBe('B')
    expect(pred?.confidence).toBeGreaterThan(0.9)
  })

  it('splits confidence between clusters at the midpoint', () => {
    const knn = new KnnClassifier(samples, 6)
    const pred = knn.predict(new Array(63).fill(0.5))
    expect(pred).not.toBeNull()
    expect(pred!.confidence).toBeLessThan(0.95)
  })

  it('leave-one-out accuracy is high on separable clusters', () => {
    expect(leaveOneOutAccuracy(samples)).toBeGreaterThan(0.95)
  })
})
