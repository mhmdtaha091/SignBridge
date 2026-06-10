import type { Prediction } from './types'

export interface GateOptions {
  /** Consecutive agreeing frames required before a letter is emitted. */
  minFrames?: number
  /** Predictions below this confidence are treated as "no prediction". */
  minConfidence?: number
  /** Suppress re-emitting the same letter within this window (jitter guard). */
  cooldownMs?: number
}

/**
 * Turns a noisy per-frame prediction stream into deliberate letter events.
 *
 * A letter is emitted once a prediction has been stable for `minFrames`
 * consecutive frames at sufficient confidence. Holding the pose does not
 * re-emit; to sign a double letter, the signer breaks the pose briefly
 * (drop the hand or relax it) and forms it again after `cooldownMs`.
 */
export class StabilityGate {
  private readonly minFrames: number
  private readonly minConfidence: number
  private readonly cooldownMs: number

  private runLabel: string | null = null
  private runCount = 0
  private runEmitted = false
  private lastEmitLabel: string | null = null
  private lastEmitAt = -Infinity

  constructor({ minFrames = 8, minConfidence = 0.6, cooldownMs = 750 }: GateOptions = {}) {
    this.minFrames = minFrames
    this.minConfidence = minConfidence
    this.cooldownMs = cooldownMs
  }

  /** Progress (0–1) toward emitting the current run — drives the UI dial. */
  get progress(): number {
    return this.runEmitted ? 1 : Math.min(1, this.runCount / this.minFrames)
  }

  get currentLabel(): string | null {
    return this.runLabel
  }

  /** Feed one frame's prediction (or null when no hand). Returns an emitted letter or null. */
  feed(prediction: Prediction | null, timestampMs: number): string | null {
    if (!prediction || prediction.confidence < this.minConfidence) {
      this.resetRun()
      return null
    }

    if (prediction.label === this.runLabel) {
      this.runCount++
    } else {
      this.runLabel = prediction.label
      this.runCount = 1
      this.runEmitted = false
    }

    if (this.runEmitted || this.runCount < this.minFrames) return null

    // Same letter again too soon — almost certainly jitter, not a double letter.
    if (
      this.runLabel === this.lastEmitLabel &&
      timestampMs - this.lastEmitAt < this.cooldownMs
    ) {
      this.runEmitted = true
      return null
    }

    this.runEmitted = true
    this.lastEmitLabel = this.runLabel
    this.lastEmitAt = timestampMs
    return this.runLabel
  }

  reset() {
    this.resetRun()
    this.lastEmitLabel = null
    this.lastEmitAt = -Infinity
  }

  private resetRun() {
    this.runLabel = null
    this.runCount = 0
    this.runEmitted = false
  }
}
