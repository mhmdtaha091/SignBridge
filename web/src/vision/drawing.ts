import type { Landmark } from './types'

/** Bone connections between the 21 MediaPipe hand landmarks. */
const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm edge
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

  for (const [a, b] of CONNECTIONS) {
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
