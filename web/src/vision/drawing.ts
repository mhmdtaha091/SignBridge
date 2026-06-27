import type { Landmark } from './types'

/** Bone connections between the 21 MediaPipe hand landmarks. */
const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm edge
]

/** Upper-body pose connections for the 11-landmark subset used in normalization. */
const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 3], [3, 4],  // nose → shoulders
  [0, 1], [0, 2],  // nose → ears
  [3, 5], [4, 6],  // shoulders → elbows
  [5, 7], [6, 8],  // elbows → wrists
  [3, 9], [4, 10], // shoulders → hips
]

/**
 * Draw a friendly hand skeleton onto an overlay canvas.
 * Coordinates are MediaPipe-normalized (0–1); the canvas is assumed to be
 * mirrored via CSS together with the video, so no flipping happens here.
 */
export function drawHand(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
) {
  ctx.lineWidth = Math.max(3, width / 220)
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255, 107, 74, 0.9)' // coral bones
  ctx.shadowColor = 'rgba(255, 107, 74, 0.5)'
  ctx.shadowBlur = 8

  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath()
    ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height)
    ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
  ctx.fillStyle = '#FFB02E' // sun joints
  const r = Math.max(3.5, width / 260)
  for (const p of landmarks) {
    ctx.beginPath()
    ctx.arc(p.x * width, p.y * height, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Draw both hands with distinct colours so the user can tell left from right.
 */
export function drawBothHands(
  ctx: CanvasRenderingContext2D,
  leftLandmarks: Landmark[] | null,
  rightLandmarks: Landmark[] | null,
  width: number,
  height: number,
) {
  if (rightLandmarks && rightLandmarks.length >= 21) {
    ctx.strokeStyle = 'rgba(255, 107, 74, 0.9)' // coral = right
    ctx.shadowColor = 'rgba(255, 107, 74, 0.5)'
    drawHandSkeleton(ctx, rightLandmarks, width, height)
  }
  if (leftLandmarks && leftLandmarks.length >= 21) {
    ctx.strokeStyle = 'rgba(74, 144, 255, 0.9)' // blue = left
    ctx.shadowColor = 'rgba(74, 144, 255, 0.5)'
    drawHandSkeleton(ctx, leftLandmarks, width, height)
  }
}

function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
) {
  ctx.lineWidth = Math.max(3, width / 220)
  ctx.lineCap = 'round'
  ctx.shadowBlur = 8

  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath()
    ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height)
    ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
  ctx.fillStyle = '#FFB02E'
  const r = Math.max(3.5, width / 260)
  for (const p of landmarks) {
    ctx.beginPath()
    ctx.arc(p.x * width, p.y * height, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Draw the upper-body pose skeleton from the full 33-landmark set.
 * Only the subset used for sign recognition is drawn (shoulders, elbows,
 * wrists, hips, head).
 */
export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
) {
  if (landmarks.length < 25) return

  ctx.lineWidth = Math.max(2.5, width / 300)
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)' // sky
  ctx.shadowColor = 'rgba(56, 189, 248, 0.4)'
  ctx.shadowBlur = 6

  for (const [a, b] of POSE_CONNECTIONS) {
    const la = landmarks[a]
    const lb = landmarks[b]
    if (!la || !lb) continue
    ctx.beginPath()
    ctx.moveTo(la.x * width, la.y * height)
    ctx.lineTo(lb.x * width, lb.y * height)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
  ctx.fillStyle = '#38BDF8'
  const r = Math.max(3, width / 280)
  for (const idx of [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24]) {
    const p = landmarks[idx]
    if (!p) continue
    ctx.beginPath()
    ctx.arc(p.x * width, p.y * height, r, 0, Math.PI * 2)
    ctx.fill()
  }
}
