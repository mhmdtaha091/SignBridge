import { describe, expect, it } from 'vitest'
import { normalizeHand, featureDistance } from './normalize'
import type { HandFrame, Landmark } from './types'

function makeHand(offset = 0, scale = 1): Landmark[] {
  // A deterministic fake hand: 21 distinct points.
  return Array.from({ length: 21 }, (_, i) => ({
    x: offset + scale * (0.1 + i * 0.01),
    y: offset + scale * (0.2 + i * 0.02),
    z: scale * (i * 0.005),
  }))
}

const frame = (landmarks: Landmark[], handedness: 'Left' | 'Right' = 'Right'): HandFrame => ({
  landmarks,
  handedness,
  score: 1,
})

describe('normalizeHand', () => {
  it('produces 63 features', () => {
    expect(normalizeHand(frame(makeHand()))).toHaveLength(63)
  })

  it('is translation invariant', () => {
    const a = normalizeHand(frame(makeHand(0)))
    const b = normalizeHand(frame(makeHand(0.3)))
    expect(featureDistance(a, b)).toBeLessThan(1e-9)
  })

  it('is scale invariant', () => {
    const a = normalizeHand(frame(makeHand(0, 1)))
    const b = normalizeHand(frame(makeHand(0, 2.5)))
    expect(featureDistance(a, b)).toBeLessThan(1e-9)
  })

  it('maps mirrored left hands onto right hands', () => {
    const right = makeHand()
    const left = right.map((p) => ({ ...p, x: 1 - p.x })) // horizontally flipped
    const a = normalizeHand(frame(right, 'Right'))
    const b = normalizeHand(frame(left, 'Left'))
    expect(featureDistance(a, b)).toBeLessThan(1e-9)
  })

  it('places the wrist at the origin', () => {
    const f = normalizeHand(frame(makeHand()))
    expect(f[0]).toBe(0)
    expect(f[1]).toBe(0)
    expect(f[2]).toBe(0)
  })

  it('rejects malformed input', () => {
    expect(() => normalizeHand(frame(makeHand().slice(0, 5)))).toThrow()
  })
})
