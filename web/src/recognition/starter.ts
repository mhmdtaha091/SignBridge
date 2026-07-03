import * as tf from '@tensorflow/tfjs'
import { getFeatureSize } from '../vision/types'
import type { SignLanguage } from '../config/language'
import { KnnClassifier } from './knn'
import { MlpClassifier } from './mlp'
import type { SampleRecord } from '../store/samplesDb'

/**
 * The bundled "starter" model so recognition works before a user records
 * anything. Trained offline by ml/train.py (ASL) / ml/train_psl_letters.py
 * (PSL) on public sign-language alphabet datasets and shipped as plain weight
 * arrays we rebuild into the exact same tf.js graph as the in-browser MLP
 * (mlp.ts). No tfjs converter needed; no server round-trip beyond two static
 * fetches.
 */

interface WeightsModel {
  format: string
  featureSize: number
  labels: string[]
  valAccuracy: number
  /** Flat [kernel, bias] pairs for dense layers, in graph order. */
  weights: number[][][] | number[][]
}

export interface Starter {
  mlp: MlpClassifier
  knn: KnnClassifier
  labels: string[]
  valAccuracy: number
  /** Small balanced seed for KNN + reference-pose diagrams. */
  samples: SampleRecord[]
}

function buildModel(m: WeightsModel): tf.LayersModel {
  const dim = m.featureSize
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [dim], units: 128, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.3 }),
      tf.layers.dense({ units: 64, activation: 'relu' }),
      tf.layers.dense({ units: m.labels.length, activation: 'softmax' }),
    ],
  })
  // Weight order matches tf.js setWeights: [k1,b1,k2,b2,k3,b3]; dropout has none.
  const w = m.weights as number[][][]
  model.setWeights([
    tf.tensor2d(w[0] as number[][]),
    tf.tensor1d((w[1] as unknown) as number[]),
    tf.tensor2d(w[2] as number[][]),
    tf.tensor1d((w[3] as unknown) as number[]),
    tf.tensor2d(w[4] as number[][]),
    tf.tensor1d((w[5] as unknown) as number[]),
  ])
  return model
}

const cache = new Map<SignLanguage, Promise<Starter>>()

/** Fetch + build the starter model and seed for the given language. Cached per language. */
export function loadStarter(language: SignLanguage = 'asl'): Promise<Starter> {
  const cached = cache.get(language)
  if (cached) return cached

  const promise = (async () => {
    const base = import.meta.env.BASE_URL
    const langPrefix = language === 'psl' ? 'psl' : 'asl'
    const expectedSize = getFeatureSize(language)

    const [modelRes, seedRes] = await Promise.all([
      fetch(`${base}models/${langPrefix}-default/model.json`),
      fetch(`${base}seed/${langPrefix}-fingerspelling.json`),
    ])
    if (!modelRes.ok) throw new Error(`starter model not found for ${language}`)
    const m = (await modelRes.json()) as WeightsModel

    if (m.featureSize !== expectedSize) {
      throw new Error(
        `starter model featureSize ${m.featureSize} != expected ${expectedSize} for ${language}`,
      )
    }

    const model = buildModel(m)
    const rawSeed = seedRes.ok ? ((await seedRes.json()) as { label: string; features: number[] }[]) : []
    const now = Date.now()
    const samples: SampleRecord[] = rawSeed.map((s) => ({ ...s, createdAt: now }))
    return {
      mlp: new MlpClassifier(model, m.labels, m.featureSize),
      knn: new KnnClassifier(samples),
      labels: m.labels,
      valAccuracy: m.valAccuracy,
      samples,
    }
  })()

  promise.catch(() => {
    cache.delete(language) // allow a retry if the fetch failed
  })
  cache.set(language, promise)
  return promise
}
