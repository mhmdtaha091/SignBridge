import { describe, expect, it } from 'vitest'
import { normalizePoseUpper, buildFullFeatures, featureDistance } from './normalize'
import { FEATURE_SIZE, FULL_FEATURE_SIZE, POSE_UPPER_SIZE } from './types'
import type { HandFrame, Landmark } from './types'

// ── helpers ────────────────────────────────────────────────────────────────

function makeHand(offset = 0, scale = 1): Landmark[] {
  return Array.from({ length: 21 }, (_, i) => ({
    x: offset + scale * (0.1 + i * 0.01),
    y: offset + scale * (0.2 + i * 0.02),
    z: scale * (i * 0.005),
  }))
}

const handFrame = (
  landmarks: Landmark[],
  handedness: 'Left' | 'Right' = 'Right',
): HandFrame => ({ landmarks, handedness, score: 1 })

function makePoseLandmarks(): Landmark[] {
  // All 33 MediaPipe pose landmarks with a realistic upper body.
  const pts: Landmark[] = []
  for (let i = 0; i < 33; i++) {
    pts.push({ x: 0.5 + i * 0.005, y: 0.3 + i * 0.015, z: i * 0.002 })
  }
  // Make shoulders distinct for a well-defined anchor.
  pts[11] = { x: 0.42, y: 0.35, z: 0 }
  pts[12] = { x: 0.58, y: 0.35, z: 0 }
  return pts
}

// ── normalizePoseUpper ─────────────────────────────────────────────────────

describe('normalizePoseUpper', () => {
  it('produces POSE_UPPER_SIZE features', () => {
    const f = normalizePoseUpper(makePoseLandmarks())
    expect(f).toHaveLength(POSE_UPPER_SIZE)
  })

  it('is translation invariant', () => {
    const a = normalizePoseUpper(makePoseLandmarks())
    const shifted = makePoseLandmarks().map((p) => ({
      ...p,
      x: p.x + 0.2,
      y: p.y + 0.1,
    }))
    const b = normalizePoseUpper(shifted)
    expect(featureDistance(a, b)).toBeLessThan(1e-9)
  })

  it('is scale invariant', () => {
    const a = normalizePoseUpper(makePoseLandmarks())
    const scaled = makePoseLandmarks().map((p) => ({
      x: 0.5 + (p.x - 0.5) * 2,
      y: 0.5 + (p.y - 0.5) * 2,
      z: p.z * 2,
    }))
    const b = normalizePoseUpper(scaled)
    expect(featureDistance(a, b)).toBeLessThan(1e-9)
  })

  it('rejects too-few landmarks', () => {
    expect(() => normalizePoseUpper(makePoseLandmarks().slice(0, 10))).toThrow()
  })
})

// ── buildFullFeatures ──────────────────────────────────────────────────────

describe('buildFullFeatures', () => {
  it('produces FULL_FEATURE_SIZE features', () => {
    const f = buildFullFeatures(
      handFrame(makeHand()),
      handFrame(makeHand()),
      makePoseLandmarks(),
    )
    expect(f).toHaveLength(FULL_FEATURE_SIZE)
  })

  it('zero-fills missing right hand', () => {
    const full = buildFullFeatures(
      handFrame(makeHand(), 'Left'),
      null,
      makePoseLandmarks(),
    )
    // Left-hand features present (non-zero).
    const leftSum = full.slice(0, FEATURE_SIZE).reduce((s, v) => s + Math.abs(v), 0)
    expect(leftSum).toBeGreaterThan(0.1)
    // Right-hand features zero.
    const rightSum = full
      .slice(FEATURE_SIZE, FEATURE_SIZE * 2)
      .reduce((s, v) => s + Math.abs(v), 0)
    expect(rightSum).toBe(0)
  })

  it('zero-fills missing pose', () => {
    const full = buildFullFeatures(
      handFrame(makeHand()),
      handFrame(makeHand()),
      null,
    )
    const poseSum = full
      .slice(FEATURE_SIZE * 2)
      .reduce((s, v) => s + Math.abs(v), 0)
    expect(poseSum).toBe(0)
  })

  it('all-zeros when nothing is detected', () => {
    const full = buildFullFeatures(null, null, null)
    const total = full.reduce((s, v) => s + Math.abs(v), 0)
    expect(total).toBe(0)
  })
})
