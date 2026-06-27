import type { Prediction } from './types'

export interface SignGateOptions {
  /** Frames of consecutive agreement before a sign is emitted. */
  minFrames?: number
  /** Minimum softmax/confidence to consider a prediction "real". */
  minConfidence?: number
  /** Minimum ms between two emissions (suppresses jitter). */
  cooldownMs?: number
}

export interface SignEmission {
  label: string
  confidence: number
  /** How many frames this sign occupied. */
  frameCount: number
}

/**
 * Gesture-level gating for temporal word signs.
 *
 * Unlike StabilityGate (which works on static letters), this gate
 * accumulates agreeing predictions from a sequence classifier and emits
 * at sign boundaries (when the prediction changes or confidence drops).
 */
export class SignGate {
  private minFrames: number
  private minConfidence: number
  private cooldownMs: number

  private runLabel: string | null = null
  private runCount = 0
  private runConfSum = 0
  private lastEmitTime = 0
  private emittedThisRun = false

  constructor(opts: SignGateOptions = {}) {
    this.minFrames = opts.minFrames ?? 6
    this.minConfidence = opts.minConfidence ?? 0.55
    this.cooldownMs = opts.cooldownMs ?? 1200
  }

  /**
   * Feed one prediction from the sequence classifier.
   * Returns a SignEmission when a sign boundary is crossed,
   * null otherwise.
   */
  feed(pred: Prediction | null, nowMs: number): SignEmission | null {
    if (!pred || pred.confidence < this.minConfidence) {
      // Confidence drop — end the current run.
      const emit = this.maybeEmit(nowMs)
      this.resetRun()
      return emit
    }

    if (pred.label !== this.runLabel) {
      // Label change — emit previous run if it was solid, start new.
      const emit = this.maybeEmit(nowMs)
      this.runLabel = pred.label
      this.runCount = 1
      this.runConfSum = pred.confidence
      this.emittedThisRun = false
      return emit
    }

    // Same label, continuing.
    this.runCount++
    this.runConfSum += pred.confidence

    // If the run is long enough and hasn't been emitted yet, emit now.
    if (this.runCount >= this.minFrames && !this.emittedThisRun) {
      return this.emit(nowMs)
    }

    return null
  }

  /** Force emit whatever is in the current run (e.g. on sign end). */
  flush(nowMs: number): SignEmission | null {
    return this.maybeEmit(nowMs)
  }

  get progress(): number {
    return Math.min(1, this.runCount / this.minFrames)
  }

  get currentLabel(): string | null {
    return this.runLabel
  }

  reset() {
    this.resetRun()
    this.lastEmitTime = 0
  }

  // ── internal ──────────────────────────────────────────────────────────

  private emit(nowMs: number): SignEmission | null {
    if (nowMs - this.lastEmitTime < this.cooldownMs) return null
    if (!this.runLabel) return null
    const avgConf = this.runConfSum / this.runCount
    this.lastEmitTime = nowMs
    this.emittedThisRun = true
    return {
      label: this.runLabel,
      confidence: avgConf,
      frameCount: this.runCount,
    }
  }

  private maybeEmit(nowMs: number): SignEmission | null {
    if (
      this.runLabel &&
      this.runCount >= this.minFrames &&
      !this.emittedThisRun &&
      nowMs - this.lastEmitTime >= this.cooldownMs
    ) {
      return this.emit(nowMs)
    }
    return null
  }

  private resetRun() {
    this.runLabel = null
    this.runCount = 0
    this.runConfSum = 0
    this.emittedThisRun = false
  }
}
