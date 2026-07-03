import { create } from 'zustand'
import { KnnClassifier } from '../recognition/knn'
import type { MlpClassifier } from '../recognition/mlp'
import type { LabeledSample } from '../recognition/types'
import { getFeatureSize } from '../vision/types'
import { useLanguageStore } from './useLanguageStore'
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

  /** The bundled default model is active because the user has no data of their own. */
  usingStarter: boolean
  starterSamples: SampleRecord[]
  starterKnn: KnnClassifier
  starterMlp: MlpClassifier | null
  /** Held-out accuracy reported by the shipped starter model. */
  starterAccuracy: number | null

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

  usingStarter: false,
  starterSamples: [],
  starterKnn: buildKnn([]),
  starterMlp: null,
  starterAccuracy: null,

  init: async () => {
    if (get().loaded) return
    const language = useLanguageStore.getState().language
    const mlpLabelsKey = `signbridge-mlp-labels-${language}`
    // TF.js is heavy — only pull it in if a trained model actually exists.
    const [samples, mlp] = await Promise.all([
      getAllSamples(),
      localStorage.getItem(mlpLabelsKey)
        ? import('../recognition/mlp').then((m) => m.loadSavedMlp(language))
        : Promise.resolve(null),
    ])
    if (samples.length > 0) {
      set({
        loaded: true,
        samples,
        knn: buildKnn(samples),
        mlp,
        engine: mlp && localStorage.getItem(ENGINE_KEY) === 'mlp' ? 'mlp' : 'knn',
        usingStarter: false,
      })
      return
    }
    // No data of their own — fall back to the bundled starter so the app works
    // out of the box. If it can't load (offline build), the empty-state UI shows.
    try {
      const { loadStarter } = await import('../recognition/starter')
      const starter = await loadStarter(language)
      set({
        loaded: true,
        samples: [],
        knn: buildKnn([]),
        mlp,
        usingStarter: true,
        starterSamples: starter.samples,
        starterKnn: starter.knn,
        starterMlp: starter.mlp,
        starterAccuracy: starter.valAccuracy,
      })
    } catch {
      set({ loaded: true, samples: [], knn: buildKnn([]), mlp, usingStarter: false })
    }
  },

  addSamples: async (label, featuresList) => {
    const now = Date.now()
    const records = featuresList.map((features) => ({ label, features, createdAt: now }))
    await addSampleRecords(records)
    const samples = await getAllSamples()
    // The user now has their own data; the starter steps aside.
    set({ samples, knn: buildKnn(samples), usingStarter: false })
  },

  deleteLabel: async (label) => {
    await deleteSamplesByLabel(label)
    const samples = await getAllSamples()
    set({ samples, knn: buildKnn(samples) })
  },

  clearAll: async () => {
    const language = useLanguageStore.getState().language
    const mlpLabelsKey = `signbridge-mlp-labels-${language}`
    await clearAllSamples()
    if (get().mlp || localStorage.getItem(mlpLabelsKey)) {
      await (await import('../recognition/mlp')).deleteSavedMlp(language)
    }
    // With the user's own data gone, hand recognition back to the starter.
    const s = get()
    const hasStarter = s.starterMlp !== null || s.starterSamples.length > 0
    set({
      samples: [],
      knn: buildKnn([]),
      mlp: null,
      mlpAccuracy: null,
      engine: 'knn',
      usingStarter: hasStarter,
    })
  },

  importSamples: async (json) => {
    if (!Array.isArray(json)) throw new Error('Expected a JSON array of samples.')
    const language = useLanguageStore.getState().language
    const expectedSize = getFeatureSize(language)
    // Build a letter set from the active language's vocabulary.
    const { getLetters } = await import('../config/vocabResolver')
    const letterSet = new Set(getLetters().map((l) => l.letter))
    const valid = json.filter(
      (s): s is LabeledSample =>
        typeof s?.label === 'string' &&
        letterSet.has(s.label) &&
        Array.isArray(s?.features) &&
        s.features.length === expectedSize &&
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
    const language = useLanguageStore.getState().language
    const { trainMlp } = await import('../recognition/mlp')
    const { classifier, valAccuracy } = await trainMlp(samples, language, onProgress)
    set({ mlp: classifier, mlpAccuracy: valAccuracy, engine: 'mlp' })
    localStorage.setItem(ENGINE_KEY, 'mlp')
    return valAccuracy
  },

  setEngine: (engine) => {
    localStorage.setItem(ENGINE_KEY, engine)
    set({ engine })
  },
}))

// Pure selectors live in ./selectors (side-effect-free, so they unit-test in a
// plain node env). Re-exported here so existing imports keep working.
export { activeClassifier, effectiveSamples } from './selectors'

/** Per-letter sample counts, for grids and readiness checks. */
export function sampleCounts(samples: LabeledSample[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const s of samples) counts.set(s.label, (counts.get(s.label) ?? 0) + 1)
  return counts
}
