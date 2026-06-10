import { describe, expect, it } from 'vitest'
import { StabilityGate } from './stability'

const pred = (label: string, confidence = 0.9) => ({ label, confidence })

function feedN(gate: StabilityGate, label: string, n: number, startT: number, dt = 33) {
  let emitted: string | null = null
  for (let i = 0; i < n; i++) {
    const out = gate.feed(pred(label), startT + i * dt)
    if (out) emitted = out
  }
  return emitted
}

describe('StabilityGate', () => {
  it('emits after minFrames stable frames', () => {
    const gate = new StabilityGate({ minFrames: 5 })
    expect(feedN(gate, 'A', 4, 0)).toBeNull()
    expect(gate.feed(pred('A'), 200)).toBe('A')
  })

  it('does not emit low-confidence predictions', () => {
    const gate = new StabilityGate({ minFrames: 3, minConfidence: 0.7 })
    for (let i = 0; i < 10; i++) {
      expect(gate.feed(pred('A', 0.5), i * 33)).toBeNull()
    }
  })

  it('does not re-emit while the pose is held', () => {
    const gate = new StabilityGate({ minFrames: 3 })
    expect(feedN(gate, 'B', 3, 0)).toBe('B')
    expect(feedN(gate, 'B', 60, 100)).toBeNull()
  })

  it('label flapping never emits', () => {
    const gate = new StabilityGate({ minFrames: 4 })
    for (let i = 0; i < 40; i++) {
      expect(gate.feed(pred(i % 2 ? 'A' : 'B'), i * 33)).toBeNull()
    }
  })

  it('allows a double letter after a break and cooldown', () => {
    const gate = new StabilityGate({ minFrames: 3, cooldownMs: 500 })
    expect(feedN(gate, 'L', 3, 0)).toBe('L')
    gate.feed(null, 200) // hand dropped
    expect(feedN(gate, 'L', 3, 900)).toBe('L')
  })

  it('suppresses a jittery instant repeat of the same letter', () => {
    const gate = new StabilityGate({ minFrames: 3, cooldownMs: 500 })
    expect(feedN(gate, 'L', 3, 0)).toBe('L')
    gate.feed(null, 100) // momentary tracking dropout
    expect(feedN(gate, 'L', 3, 150)).toBeNull()
  })

  it('different letters emit back to back without a break', () => {
    const gate = new StabilityGate({ minFrames: 3 })
    expect(feedN(gate, 'H', 3, 0)).toBe('H')
    expect(feedN(gate, 'I', 3, 200)).toBe('I')
  })
})
