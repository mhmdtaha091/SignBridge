import { describe, expect, it } from 'vitest'
import { activeClassifier, effectiveSamples } from './selectors'
import { KnnClassifier } from '../recognition/knn'
import type { Classifier } from '../recognition/types'
import type { SampleRecord } from './samplesDb'

const rec = (label: string): SampleRecord => ({
  label,
  features: new Array(63).fill(0),
  createdAt: 0,
})
const stub = (tag: string): Classifier => ({ predict: () => ({ label: tag, confidence: 1 }) })

const empty = new KnnClassifier([])

describe('effectiveSamples', () => {
  it('prefers the user’s own samples', () => {
    const own = [rec('A')]
    const starter = [rec('B'), rec('C')]
    expect(effectiveSamples({ samples: own, usingStarter: true, starterSamples: starter })).toBe(own)
  })

  it('falls back to the starter seed when the user has none', () => {
    const starter = [rec('B')]
    expect(
      effectiveSamples({ samples: [], usingStarter: true, starterSamples: starter }),
    ).toBe(starter)
  })

  it('is empty when there is neither user data nor an active starter', () => {
    expect(effectiveSamples({ samples: [], usingStarter: false, starterSamples: [rec('B')] })).toHaveLength(0)
  })
})

describe('activeClassifier', () => {
  it('uses the user’s knn/mlp when they have data', () => {
    const knn = stub('user-knn')
    const mlp = stub('user-mlp')
    const base = { samples: [rec('A')], usingStarter: false, starterKnn: empty, starterMlp: null }
    expect(activeClassifier({ ...base, engine: 'knn', knn, mlp }).predict([])?.label).toBe('user-knn')
    expect(activeClassifier({ ...base, engine: 'mlp', knn, mlp }).predict([])?.label).toBe('user-mlp')
  })

  it('uses the starter (preferring its mlp) when the user has no data', () => {
    const starterMlp = stub('starter-mlp')
    const starterKnn = stub('starter-knn')
    const base = { samples: [], engine: 'mlp' as const, knn: empty, mlp: null, usingStarter: true }
    expect(activeClassifier({ ...base, starterKnn, starterMlp }).predict([])?.label).toBe('starter-mlp')
    expect(
      activeClassifier({ ...base, starterKnn, starterMlp: null }).predict([])?.label,
    ).toBe('starter-knn')
  })
})
