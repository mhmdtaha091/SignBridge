import { create } from 'zustand'
import { KnnClassifier } from '../recognition/knn'
import type { MlpClassifier } from '../recognition/mlp'
import type { Classifier, LabeledSample } from '../recognition/types'
import { FEATURE_SIZE } from '../vision/types'
import { LETTER_SET } from '../config/vocab'
import {
  addSampleRecords,
  clearAllSamples,
  deleteSamplesByLabel,
  getAllSamples,
  type SampleRecord,
} from './samplesDb'

export type Engine = 'knn' | 'mlp'
const ENGINE_KEY = 'signbridge-engine'

interface SignState {
  loaded: boolean
  samples: SampleRecord[]
  knn: KnnClassifier
  mlp: MlpClassifier | null
  engine: Engine
  /** Validation accuracy from the last MLP training run (0–1). */
  mlpAccuracy: number | null

  init: () => Promise<void>
  addSamples: (label: string, featuresList: number[][]) => Promise<void>
  deleteLabel: (label: string) => Promise<void>
  clearAll: () => Promise<void>
  importSamples: (json: unknown) => Promise<number>
  train: (onProgress?: (epoch: number, total: number, acc: number) => void) => Promise<number>
  setEngine: (engine: Engine) => void
}

function buildKnn(samples: LabeledSample[]) {
  return new KnnClassifier(samples)
}

export const useSignStore = create<SignState>((set, get) => ({
  loaded: false,
  samples: [],
  knn: buildKnn([]),
  mlp: null,
  engine: (localStorage.getItem(ENGINE_KEY) as Engine) || 'knn',
  mlpAccuracy: null,

  init: async () => {
    if (get().loaded) return
    // TF.js is heavy — only pull it in if a trained model actually exists.
    const [samples, mlp] = await Promise.all([
      getAllSamples(),
      localStorage.getItem('signbridge-mlp-labels')
        ? import('../recognition/mlp').then((m) => m.loadSavedMlp())
        : Promise.resolve(null),
    ])
    set({
      loaded: true,
      samples,
      knn: buildKnn(samples),
      mlp,
      engine: mlp && localStorage.getItem(ENGINE_KEY) === 'mlp' ? 'mlp' : 'knn',
    })
  },

  addSamples: async (label, featuresList) => {
    const now = Date.now()
    const records = featuresList.map((features) => ({ label, features, createdAt: now }))
    await addSampleRecords(records)
    const samples = await getAllSamples()
    set({ samples, knn: buildKnn(samples) })
  },

  deleteLabel: async (label) => {
    await deleteSamplesByLabel(label)
    const samples = await getAllSamples()
    set({ samples, knn: buildKnn(samples) })
  },

  clearAll: async () => {
    await clearAllSamples()
    if (get().mlp || localStorage.getItem('signbridge-mlp-labels')) {
      await (await import('../recognition/mlp')).deleteSavedMlp()
    }
    set({ samples: [], knn: buildKnn([]), mlp: null, mlpAccuracy: null, engine: 'knn' })
  },

  importSamples: async (json) => {
    if (!Array.isArray(json)) throw new Error('Expected a JSON array of samples.')
    const valid = json.filter(
      (s): s is LabeledSample =>
        typeof s?.label === 'string' &&
        LETTER_SET.has(s.label) &&
        Array.isArray(s?.features) &&
        s.features.length === FEATURE_SIZE &&
        s.features.every((v: unknown) => typeof v === 'number' && Number.isFinite(v)),
    )
    if (valid.length === 0) throw new Error('No valid samples found in that file.')
    const now = Date.now()
    await addSampleRecords(valid.map((s) => ({ ...s, createdAt: now })))
    const samples = await getAllSamples()
    set({ samples, knn: buildKnn(samples) })
    return valid.length
  },

  train: async (onProgress) => {
    const { samples } = get()
    const { trainMlp } = await import('../recognition/mlp')
    const { classifier, valAccuracy } = await trainMlp(samples, onProgress)
    set({ mlp: classifier, mlpAccuracy: valAccuracy, engine: 'mlp' })
    localStorage.setItem(ENGINE_KEY, 'mlp')
    return valAccuracy
  },

  setEngine: (engine) => {
    localStorage.setItem(ENGINE_KEY, engine)
    set({ engine })
  },
}))

/** The classifier currently in use, honouring the engine choice. */
export function activeClassifier(state: Pick<SignState, 'engine' | 'knn' | 'mlp'>): Classifier {
  return state.engine === 'mlp' && state.mlp ? state.mlp : state.knn
}

/** Per-letter sample counts, for grids and readiness checks. */
export function sampleCounts(samples: LabeledSample[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const s of samples) counts.set(s.label, (counts.get(s.label) ?? 0) + 1)
  return counts
}
