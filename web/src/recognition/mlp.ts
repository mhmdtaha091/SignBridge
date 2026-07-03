import * as tf from '@tensorflow/tfjs'
import { getFeatureSize } from '../vision/types'
import type { SignLanguage } from '../config/language'
import type { Classifier, LabeledSample, Prediction } from './types'

const MODEL_URL = 'indexeddb://signbridge-mlp'
const LABELS_KEY = 'signbridge-mlp-labels'

/**
 * Get the IndexedDB save key scoped to a language so ASL and PSL models
 * don't collide.
 */
function mlpDbKey(language: SignLanguage): string {
  return `${MODEL_URL}-${language}`
}

function mlpLabelsKey(language: SignLanguage): string {
  return `${LABELS_KEY}-${language}`
}

/** Small softmax MLP over normalized landmarks — the opt-in upgrade over KNN. */
export class MlpClassifier implements Classifier {
  private model: tf.LayersModel
  private labels: string[]
  readonly inputDim: number

  constructor(model: tf.LayersModel, labels: string[], inputDim?: number) {
    this.model = model
    this.labels = labels
    this.inputDim = inputDim ?? getFeatureSize('asl')
  }

  predict(features: number[]): Prediction | null {
    if (features.length !== this.inputDim) return null
    const probs = tf.tidy(() => {
      const out = this.model.predict(tf.tensor2d([features])) as tf.Tensor
      return out.dataSync()
    })
    let best = 0
    for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i
    return { label: this.labels[best], confidence: probs[best] }
  }
}

export interface TrainResult {
  classifier: MlpClassifier
  /** Accuracy on the held-out validation split. */
  valAccuracy: number
}

export async function trainMlp(
  samples: LabeledSample[],
  language: SignLanguage = 'asl',
  onProgress?: (epoch: number, totalEpochs: number, valAccuracy: number) => void,
): Promise<TrainResult> {
  const inputDim = getFeatureSize(language)
  const labels = [...new Set(samples.map((s) => s.label))].sort()
  if (labels.length < 2) throw new Error('Need samples for at least 2 letters to train.')

  const epochs = 60
  const x = tf.tensor2d(samples.map((s) => s.features))
  const y = tf.oneHot(
    tf.tensor1d(samples.map((s) => labels.indexOf(s.label)), 'int32'),
    labels.length,
  )

  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [inputDim], units: 128, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.3 }),
      tf.layers.dense({ units: 64, activation: 'relu' }),
      tf.layers.dense({ units: labels.length, activation: 'softmax' }),
    ],
  })
  model.compile({
    optimizer: tf.train.adam(1e-3),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  })

  let valAccuracy = 0
  try {
    await model.fit(x, y, {
      epochs,
      batchSize: 32,
      shuffle: true,
      validationSplit: 0.15,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          valAccuracy = (logs?.val_acc as number) ?? (logs?.val_accuracy as number) ?? 0
          onProgress?.(epoch + 1, epochs, valAccuracy)
        },
      },
    })
  } finally {
    x.dispose()
    y.dispose()
  }

  await model.save(mlpDbKey(language))
  localStorage.setItem(mlpLabelsKey(language), JSON.stringify(labels))
  return { classifier: new MlpClassifier(model, labels, inputDim), valAccuracy }
}

/** Load a previously trained model from IndexedDB, if one exists. */
export async function loadSavedMlp(language: SignLanguage = 'asl'): Promise<MlpClassifier | null> {
  const raw = localStorage.getItem(mlpLabelsKey(language))
  if (!raw) return null
  try {
    const model = await tf.loadLayersModel(mlpDbKey(language))
    return new MlpClassifier(model, JSON.parse(raw) as string[], getFeatureSize(language))
  } catch {
    return null
  }
}

export async function deleteSavedMlp(language: SignLanguage = 'asl'): Promise<void> {
  localStorage.removeItem(mlpLabelsKey(language))
  try {
    await tf.io.removeModel(mlpDbKey(language))
  } catch {
    // no saved model — fine
  }
}
