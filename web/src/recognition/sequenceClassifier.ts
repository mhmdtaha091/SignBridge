import * as tf from '@tensorflow/tfjs'
import { FULL_FEATURE_SIZE } from '../vision/types'
import type { Prediction, SequenceClassifier } from './types'

const WINDOW_SIZE = 30 // frames (≈ 1 second at 30 fps)

/**
 * GRU-based sequence classifier that loads a TF.js model from a URL or
 * IndexedDB. Maintains a rolling window of the last WINDOW_SIZE frames
 * and runs inference when the window is full.
 *
 * Falls back to returning null if no model has been loaded.
 */
export class GruSequenceClassifier implements SequenceClassifier {
  private model: tf.LayersModel | tf.GraphModel | null = null
  private window: number[][] = []
  readonly labels: string[] = []
  readonly ready = false

  private constructor() {}

  get isLoaded(): boolean {
    return this.model !== null
  }

  // ── factory ──────────────────────────────────────────────────────────

  /** Load from a TF.js LayersModel URL (e.g. public/models/gru-word-signs/model.json). */
  static async fromURL(url: string, labels: string[]): Promise<GruSequenceClassifier> {
    const inst = new GruSequenceClassifier()
    inst.model = await tf.loadLayersModel(url)
    ;(inst as { labels: string[] }).labels = labels
    ;(inst as { ready: boolean }).ready = true
    return inst
  }

  /** Load from IndexedDB (saved by an in-browser training step, future). */
  static async fromIndexedDB(dbPath: string, labels: string[]): Promise<GruSequenceClassifier> {
    const inst = new GruSequenceClassifier()
    inst.model = await tf.loadLayersModel(dbPath)
    ;(inst as { labels: string[] }).labels = labels
    ;(inst as { ready: boolean }).ready = true
    return inst
  }

  /** Create an empty classifier that always returns null (no model). */
  static empty(): GruSequenceClassifier {
    return new GruSequenceClassifier()
  }

  // ── SequenceClassifier interface ─────────────────────────────────────

  feedFrame(features: number[], _timestampMs: number): Prediction | null {
    if (!this.model || this.labels.length === 0) return null
    if (features.length !== FULL_FEATURE_SIZE) {
      throw new Error(
        `Expected ${FULL_FEATURE_SIZE} features, got ${features.length}`,
      )
    }

    // Maintain rolling window.
    this.window.push(features)
    if (this.window.length > WINDOW_SIZE) {
      this.window.shift()
    }

    // Don't predict until we have enough frames.
    if (this.window.length < WINDOW_SIZE / 2) return null

    // Pad to full window size with edge replication.
    const padded = padWindow(this.window, WINDOW_SIZE)
    const tensor = tf.tensor3d([padded], [1, WINDOW_SIZE, FULL_FEATURE_SIZE])

    const output = tf.tidy(() => {
      const logits = this.model!.predict(tensor) as tf.Tensor
      // Guard against wrong output shape.
      if (logits.shape.length === 3 && logits.shape[1] === WINDOW_SIZE) {
        // (1, T, vocab) — average over time.
        return tf.softmax(logits.mean(1))
      }
      // (1, vocab) — assume it's already pooled.
      return tf.softmax(logits.shape.length === 2 ? logits : logits.reshape([1, -1]))
    })

    const values = output.dataSync()
    output.dispose()
    tensor.dispose()

    let bestIdx = 0
    let bestVal = 0
    for (let i = 0; i < values.length; i++) {
      if (values[i] > bestVal) {
        bestVal = values[i]
        bestIdx = i
      }
    }

    if (bestVal < 0.3) return null
    return { label: this.labels[bestIdx], confidence: bestVal }
  }

  reset() {
    this.window = []
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function padWindow(window: number[][], size: number): number[][] {
  if (window.length >= size) return window.slice(-size)
  const pad = new Array<number>(window[0].length).fill(0) as number[]
  const out = [...window]
  while (out.length < size) out.unshift(pad)
  return out
}
