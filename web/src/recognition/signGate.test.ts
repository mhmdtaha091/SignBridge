import { describe, expect, it } from 'vitest'
import { SignGate } from './signGate'
import type { Prediction } from './types'

function pred(label: string, confidence = 0.9): Prediction {
  return { label, confidence }
}

describe('SignGate', () => {
  it('does not emit before minFrames is reached', () => {
    const gate = new SignGate({ minFrames: 6, minConfidence: 0.5, cooldownMs: 0 })
    let emitted = null
    for (let i = 0; i < 5; i++) {
      emitted = gate.feed(pred('hello'), i * 100)
    }
    expect(emitted).toBeNull()
  })

  it('emits when minFrames is reached', () => {
    const gate = new SignGate({ minFrames: 6, minConfidence: 0.5, cooldownMs: 0 })
    let emitted = null
    for (let i = 0; i < 6; i++) {
      emitted = gate.feed(pred('hello'), i * 100)
    }
    expect(emitted).not.toBeNull()
    expect(emitted!.label).toBe('hello')
    expect(emitted!.frameCount).toBe(6)
  })

  it('does not emit when confidence is below threshold', () => {
    const gate = new SignGate({ minFrames: 3, minConfidence: 0.6, cooldownMs: 0 })
    let emitted = null
    for (let i = 0; i < 10; i++) {
      emitted = gate.feed(pred('hello', 0.3), i * 100)
    }
    expect(emitted).toBeNull()
  })

  it('suppresses rapid duplicate emissions via cooldown', () => {
    const gate = new SignGate({ minFrames: 3, minConfidence: 0.5, cooldownMs: 500 })
    // Use realistic timestamps (> cooldownMs) so first emission is not blocked
    const t0 = 10000
    gate.feed(pred('hello'), t0)
    gate.feed(pred('hello'), t0 + 100)
    const emit1 = gate.feed(pred('hello'), t0 + 200)
    expect(emit1).not.toBeNull()

    // Reset run and try again immediately — should be blocked by cooldown
    gate.feed(null, t0 + 250) // resets run
    gate.feed(pred('hello'), t0 + 300)
    gate.feed(pred('hello'), t0 + 350)
    const emit2 = gate.feed(pred('hello'), t0 + 400)
    expect(emit2).toBeNull() // cooldown hasn't elapsed (t0+200 + 500 = t0+700)
  })

  it('allows emission after cooldown elapses', () => {
    const gate = new SignGate({ minFrames: 3, minConfidence: 0.5, cooldownMs: 500 })
    // First emission
    gate.feed(pred('hello'), 0)
    gate.feed(pred('hello'), 100)
    gate.feed(pred('hello'), 200) // emits

    // Wait for cooldown
    gate.feed(null, 300) // resets run
    gate.feed(pred('hello'), 900)
    gate.feed(pred('hello'), 1000)
    const emit = gate.feed(pred('hello'), 1100)
    expect(emit).not.toBeNull()
  })

  it('emits continuously when minFrames reached', () => {
    const gate = new SignGate({ minFrames: 3, minConfidence: 0.5, cooldownMs: 0 })
    const t0 = 10000
    gate.feed(pred('hello'), t0)
    gate.feed(pred('hello'), t0 + 100)
    const emit = gate.feed(pred('hello'), t0 + 200)
    expect(emit).not.toBeNull()
    expect(emit!.label).toBe('hello')
    expect(emit!.frameCount).toBe(3)
  })

  it('resets run and starts new on label change', () => {
    const gate = new SignGate({ minFrames: 3, minConfidence: 0.5, cooldownMs: 0 })
    const t0 = 10000
    gate.feed(pred('hello'), t0)
    gate.feed(pred('hello'), t0 + 100)
    gate.feed(pred('hello'), t0 + 200) // emits 'hello'
    // Label changes — old run was already emitted, new label starts fresh
    gate.feed(pred('goodbye'), t0 + 300)
    expect(gate.currentLabel).toBe('goodbye')
    expect(gate.progress).toBeLessThan(1) // start of new run
  })

  it('does not emit on label change if minFrames not met', () => {
    const gate = new SignGate({ minFrames: 5, minConfidence: 0.5, cooldownMs: 0 })
    const t0 = 10000
    gate.feed(pred('hello'), t0)
    gate.feed(pred('hello'), t0 + 100)
    // Not enough frames yet
    const emit = gate.feed(pred('goodbye'), t0 + 200)
    expect(emit).toBeNull()
  })

  it('reports progress correctly', () => {
    const gate = new SignGate({ minFrames: 10, minConfidence: 0.5 })
    expect(gate.progress).toBe(0)
    gate.feed(pred('hello'), 0)
    gate.feed(pred('hello'), 100)
    gate.feed(pred('hello'), 200)
    expect(gate.progress).toBe(0.3)
  })

  it('resets correctly', () => {
    const gate = new SignGate({ minFrames: 3, minConfidence: 0.5, cooldownMs: 0 })
    gate.feed(pred('hello'), 0)
    gate.feed(pred('hello'), 100)
    gate.reset()
    expect(gate.progress).toBe(0)
    expect(gate.currentLabel).toBeNull()
  })
})
