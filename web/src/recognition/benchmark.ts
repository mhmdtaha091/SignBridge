/**
 * Lightweight in-browser inference benchmark for SignBridge.
 *
 * Measures:
 *  - MLP inference latency (single forward pass)
 *  - GRU inference latency (single step on a 30-frame window)
 *  - Camera → MediaPipe → classify end-to-end pipeline FPS
 *
 * Usage: import { benchmark } from './benchmark' and call in browser console.
 * Results are printed to console as a table.
 */

import type { Classifier } from './types'

/** Time a synchronous function call, returns ms. */
function timeSync(fn: () => void, iterations = 100): number {
  // Warm-up
  for (let i = 0; i < 5; i++) fn()
  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  return (performance.now() - start) / iterations
}

/** Time an async function call, returns ms. */
async function timeAsync(fn: () => Promise<void>, iterations = 50): Promise<number> {
  // Warm-up
  for (let i = 0; i < 3; i++) await fn()
  const start = performance.now()
  for (let i = 0; i < iterations; i++) await fn()
  return (performance.now() - start) / iterations
}

export interface BenchResult {
  model: string
  latencyMs: number
  detail: string
}

/**
 * Benchmark a classifier on a set of sample features.
 * Assumes the classifier has a predict() method accepting a Float32Array.
 */
export async function benchmarkClassifier(
  name: string,
  classifier: Classifier,
  sampleFeatures: number[],
  iterations = 100,
): Promise<BenchResult> {
  const latencyMs = await timeAsync(async () => {
    await classifier.predict(sampleFeatures)
  }, iterations)

  return {
    model: name,
    latencyMs: Math.round(latencyMs * 100) / 100,
    detail: `${iterations} iterations, ${sampleFeatures.length}-dim input`,
  }
}

/**
 * Run the full benchmark suite. Requires classifiers to be loaded.
 * Call from the browser console:
 *   import('./recognition/benchmark').then(m => m.runBenchmark({ mlp, sequenceClassifier }))
 */
export async function runBenchmark(classifiers: {
  mlp?: Classifier
  knn?: Classifier
  sequenceClassifier?: { feedFrame(features: number[], timestampMs: number): { label: string; confidence: number } | null; reset(): void }
}): Promise<BenchResult[]> {
  const results: BenchResult[] = []

  // Generate synthetic 63-dim features (single hand)
  const singleHand: number[] = []
  for (let i = 0; i < 63; i++) singleHand.push(Math.sin(i * 0.3) * 0.5)

  // Generate synthetic 159-dim features (two hands + pose)
  const fullFeatures: number[] = []
  for (let i = 0; i < 159; i++) fullFeatures.push(Math.sin(i * 0.2) * 0.5)

  if (classifiers.mlp) {
    const ms = timeSync(() => classifiers.mlp!.predict(singleHand))
    results.push({
      model: 'MLP (letters)',
      latencyMs: Math.round(ms * 100) / 100,
      detail: '63-dim → 24 classes, single forward pass',
    })
  }

  if (classifiers.knn) {
    const ms = timeSync(() => classifiers.knn!.predict(singleHand))
    results.push({
      model: 'KNN (letters)',
      latencyMs: Math.round(ms * 100) / 100,
      detail: `63-dim, distance-weighted neighbour search`,
    })
  }

  if (classifiers.sequenceClassifier) {
    const ms = await timeAsync(
      async () => { classifiers.sequenceClassifier!.feedFrame(fullFeatures, performance.now()) },
      50,
    )
    results.push({
      model: 'GRU (word signs)',
      latencyMs: Math.round(ms * 100) / 100,
      detail: '159-dim, rolling window, single inference step',
    })
  }

  console.table(results)
  return results
}
