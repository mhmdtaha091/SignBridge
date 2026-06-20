import * as tf from '@tensorflow/tfjs'
import { FEATURE_SIZE } from '../vision/types'
import { KnnClassifier } from './knn'
import { MlpClassifier } from './mlp'
import type { SampleRecord } from '../store/samplesDb'

/**
 * The bundled "starter" model so recognition works before a user records
 * anything. Trained offline by ml/train.py on a public ASL alphabet dataset
 * (see docs/DATASET.md) and shipped as plain weight arrays we rebuild into the
 * exact same tf.js graph as the in-browser MLP (mlp.ts). No tfjs converter
 * needed; no server round-trip beyond two static fetches.
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
  if (m.featureSize !== FEATURE_SIZE) {
    throw new Error(`starter featureSize ${m.featureSize} != ${FEATURE_SIZE}`)
  }
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [FEATURE_SIZE], units: 128, activation: 'relu' }),
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

let cached: Promise<Starter> | null = null

/** Fetch + build the starter model and seed. Cached; throws if unavailable. */
export function loadStarter(): Promise<Starter> {
  if (cached) return cached
  cached = (async () => {
    const base = import.meta.env.BASE_URL
    const [modelRes, seedRes] = await Promise.all([
      fetch(`${base}models/asl-default/model.json`),
      fetch(`${base}seed/asl-fingerspelling.json`),
    ])
    if (!modelRes.ok) throw new Error('starter model not found')
    const m = (await modelRes.json()) as WeightsModel
    const model = buildModel(m)
    const rawSeed = seedRes.ok ? ((await seedRes.json()) as { label: string; features: number[] }[]) : []
    const now = Date.now()
    const samples: SampleRecord[] = rawSeed.map((s) => ({ ...s, createdAt: now }))
    return {
      mlp: new MlpClassifier(model, m.labels),
      knn: new KnnClassifier(samples),
      labels: m.labels,
      valAccuracy: m.valAccuracy,
      samples,
    }
  })()
  cached.catch(() => {
    cached = null // allow a retry if the fetch failed
  })
  return cached
}
