import { describe, expect, it } from 'vitest'
import { dtw } from './dtw'

function fakeFrame(dim: number, seed: number): number[] {
  return Array.from({ length: dim }, (_, i) => Math.sin(seed + i * 0.3) * 0.1)
}

describe('dtw', () => {
  const dim = 63

  it('returns near-zero distance for identical sequences', () => {
    const a = [fakeFrame(dim, 0), fakeFrame(dim, 1), fakeFrame(dim, 2)]
    const result = dtw(a, a)
    expect(result.distance).toBe(0)
    expect(result.normalizedDistance).toBe(0)
  })

  it('returns low distance for very similar sequences', () => {
    const a = [fakeFrame(dim, 0), fakeFrame(dim, 1), fakeFrame(dim, 2)]
    // b is a with tiny noise
    const b = a.map((f) => f.map((v) => v + 0.001))
    const result = dtw(a, b)
    expect(result.distance).toBeLessThan(1)
    expect(result.normalizedDistance).toBeLessThan(0.3)
  })

  it('returns higher distance for clearly different sequences', () => {
    const a = [fakeFrame(dim, 0), fakeFrame(dim, 1)]
    const b = [fakeFrame(dim, 10), fakeFrame(dim, 11)]
    const result = dtw(a, b)
    // Should be significantly higher than similar sequences
    expect(result.distance).toBeGreaterThan(0.5)
    expect(result.normalizedDistance).toBeGreaterThan(0.3)
  })

  it('handles empty sequences gracefully', () => {
    const result = dtw([], [])
    expect(result.distance).toBe(Infinity)
    expect(result.normalizedDistance).toBe(1)
  })

  it('handles one empty sequence', () => {
    const a = [fakeFrame(dim, 0)]
    expect(dtw(a, []).distance).toBe(Infinity)
    expect(dtw([], a).distance).toBe(Infinity)
  })

  it('returns a valid warp path', () => {
    const a = [fakeFrame(dim, 0), fakeFrame(dim, 1), fakeFrame(dim, 2)]
    const b = [fakeFrame(dim, 0), fakeFrame(dim, 1)]
    const result = dtw(a, b)
    expect(result.path.length).toBeGreaterThanOrEqual(Math.max(a.length, b.length))
    // Path should start at (0,0) and end at (a.length-1, b.length-1)
    expect(result.path[0]).toEqual([0, 0])
    const last = result.path[result.path.length - 1]
    expect(last[0]).toBe(a.length - 1)
    expect(last[1]).toBe(b.length - 1)
  })

  it('normalizedDistance saturates at 1', () => {
    const a = [Array.from({ length: dim }, () => 1.0)]
    const b = [Array.from({ length: dim }, () => -1.0)]
    const result = dtw(a, b)
    expect(result.normalizedDistance).toBeLessThanOrEqual(1)
  })

  it('works with 159-dim feature vectors (PSL two-hand)', () => {
    const dim159 = 159
    const a = [fakeFrame(dim159, 0), fakeFrame(dim159, 1)]
    const b = [fakeFrame(dim159, 0), fakeFrame(dim159, 1.5)]
    const result = dtw(a, b)
    expect(result.distance).toBeGreaterThan(0)
    expect(result.path.length).toBeGreaterThanOrEqual(2)
  })
})
