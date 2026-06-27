/**
 * Classic Dynamic Time Warping on multivariate time series.
 *
 * Used by both:
 * - M3 word-sign classifier (DTW against reference trajectories)
 * - M4 tutor mode (scoring learner form vs reference)
 *
 * Complexity: O(T1 × T2). For 60-frame windows this is ~3600 cells — trivial in JS.
 */

export interface DtwResult {
  /** Raw DTW distance (lower = more similar). */
  distance: number
  /** Normalized distance 0–1 (saturates; ~0.15 is "different signer same sign"). */
  normalizedDistance: number
  /** Warp path: pairs of (refFrameIndex, liveFrameIndex). */
  path: Array<[number, number]>
}

/** Euclidean distance between two frames (same-length arrays). */
function frameDist(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

/**
 * Compute DTW distance between two multivariate time series.
 * `a` and `b` are arrays of frames, each frame is a number[].
 */
export function dtw(a: number[][], b: number[][]): DtwResult {
  const n = a.length
  const m = b.length
  if (n === 0 || m === 0) {
    return { distance: Infinity, normalizedDistance: 1, path: [] }
  }

  // Accumulated cost matrix.
  const d: Float64Array[] = new Array(n)
  for (let i = 0; i < n; i++) d[i] = new Float64Array(m)

  d[0][0] = frameDist(a[0], b[0])

  // First row.
  for (let j = 1; j < m; j++) {
    d[0][j] = frameDist(a[0], b[j]) + d[0][j - 1]
  }
  // First column.
  for (let i = 1; i < n; i++) {
    d[i][0] = frameDist(a[i], b[0]) + d[i - 1][0]
  }

  for (let i = 1; i < n; i++) {
    for (let j = 1; j < m; j++) {
      const cost = frameDist(a[i], b[j])
      d[i][j] = cost + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1])
    }
  }

  // Backtrack.
  const path: Array<[number, number]> = []
  let i = n - 1
  let j = m - 1
  while (i > 0 || j > 0) {
    path.push([i, j])
    if (i === 0) { j-- }
    else if (j === 0) { i-- }
    else {
      const up = d[i - 1][j]
      const left = d[i][j - 1]
      const diag = d[i - 1][j - 1]
      if (diag <= up && diag <= left) { i--; j-- }
      else if (up <= left) { i-- }
      else { j-- }
    }
  }
  path.push([0, 0])
  path.reverse()

  const distance = d[n - 1][m - 1]
  const normalizedDistance = Math.min(1, distance / Math.sqrt(n * m))

  return { distance, normalizedDistance, path }
}
