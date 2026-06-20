import type { Classifier } from '../recognition/types'
import type { SampleRecord } from './samplesDb'
import type { Engine } from './useSignStore'

/**
 * Pure store selectors, kept side-effect-free (no zustand/localStorage) so they
 * stay unit-testable in a plain node environment like the rest of the suite.
 * They depend only on the Classifier interface, not the concrete classes.
 */

interface ClassifierState {
  engine: Engine
  knn: Classifier
  mlp: Classifier | null
  samples: SampleRecord[]
  usingStarter: boolean
  starterKnn: Classifier
  starterMlp: Classifier | null
}

/**
 * The classifier currently in use. The user's own model/data always wins;
 * otherwise the bundled starter (preferring its MLP) keeps the app working.
 */
export function activeClassifier(state: ClassifierState): Classifier {
  if (state.samples.length > 0) {
    return state.engine === 'mlp' && state.mlp ? state.mlp : state.knn
  }
  if (state.usingStarter) {
    return state.starterMlp ?? state.starterKnn
  }
  return state.knn
}

interface SamplesState {
  samples: SampleRecord[]
  usingStarter: boolean
  starterSamples: SampleRecord[]
}

/**
 * Samples to drive reference-pose diagrams and empty-state checks: the user's
 * own when they have them, otherwise the starter seed.
 */
export function effectiveSamples(state: SamplesState): SampleRecord[] {
  if (state.samples.length > 0) return state.samples
  if (state.usingStarter) return state.starterSamples
  return []
}
