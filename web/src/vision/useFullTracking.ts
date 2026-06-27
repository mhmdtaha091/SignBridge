import { useEffect, useRef, useState } from 'react'
import { getHandLandmarker } from './landmarker'
import { getPoseLandmarker } from './poseTracking'
import { drawBothHands, drawPose } from './drawing'
import { buildFullFeatures } from './normalize'
import type { FullTrackedFrame, HandFrame, Handedness } from './types'

export type FullTrackingStatus =
  | 'loading-model'
  | 'requesting-camera'
  | 'running'
  | 'denied'
  | 'no-camera'
  | 'error'

interface Options {
  onFrame?: (tracked: FullTrackedFrame) => void
  /** Draw landmark overlays on the canvas (default true). */
  drawOverlay?: boolean
  /** Whether to run PoseLandmarker (default true). */
  trackPose?: boolean
}

/**
 * Owns the whole combined-vision pipeline: camera → HandLandmarker (both
 * hands) + optional PoseLandmarker → normalized 159-dim features per frame.
 *
 * Attach `videoRef` and `canvasRef` to a `<video>` and overlay `<canvas>`.
 *
 * The existing `useHandTracking` hook is untouched — use that for
 * fingerspelling pages; use this one for word-sign recognition.
 */
export function useFullTracking({
  onFrame,
  drawOverlay = true,
  trackPose = true,
}: Options = {}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<FullTrackingStatus>('loading-model')
  const [fps, setFps] = useState(0)
  const [handPresent, setHandPresent] = useState(false)

  // Keep latest callback without restarting the pipeline.
  const onFrameRef = useRef(onFrame)
  const drawRef = useRef(drawOverlay)
  const poseRef = useRef(trackPose)
  useEffect(() => {
    onFrameRef.current = onFrame
    drawRef.current = drawOverlay
    poseRef.current = trackPose
  })

  useEffect(() => {
    let cancelled = false
    let rafId = 0
    let stream: MediaStream | null = null
    let lastVideoTime = -1
    let emaFps = 0
    let lastTs = 0
    let lastHandPresent: boolean | null = null

    async function start() {
      const video = videoRef.current
      if (!video) return

      let handLandmarker
      let poseLandmarker
      try {
        ;[handLandmarker, poseLandmarker] = await Promise.all([
          getHandLandmarker(),
          trackPose ? getPoseLandmarker() : Promise.resolve(null),
        ])
      } catch {
        if (!cancelled) setStatus('error')
        return
      }
      if (cancelled) return

      setStatus('requesting-camera')
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 960 },
            height: { ideal: 540 },
          },
          audio: false,
        })
      } catch (err) {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ''
        setStatus(
          name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'no-camera'
            : 'denied',
        )
        return
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      video.srcObject = stream
      await video.play().catch(() => {})
      if (cancelled) return
      setStatus('running')

      const loop = () => {
        if (cancelled) return
        rafId = requestAnimationFrame(loop)
        if (video.readyState < 2 || video.currentTime === lastVideoTime) return
        lastVideoTime = video.currentTime

        const now = performance.now()

        // Run both landmarkers.
        const handResult = handLandmarker.detectForVideo(video, now)
        const poseResult = poseLandmarker?.detectForVideo(video, now)

        if (lastTs) {
          const inst = 1000 / (now - lastTs)
          emaFps = emaFps ? emaFps * 0.9 + inst * 0.1 : inst
          setFps((prev) =>
            Math.abs(prev - emaFps) > 1 ? Math.round(emaFps) : prev,
          )
        }
        lastTs = now

        // Canvas setup.
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
          if (
            canvas.width !== video.videoWidth ||
            canvas.height !== video.videoHeight
          ) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }

        // Classify detected hands into left/right.
        let leftHand: HandFrame | null = null
        let rightHand: HandFrame | null = null

        for (let i = 0; i < handResult.landmarks.length; i++) {
          const h = handResult.handedness[i]?.[0]
          const handedness = (h?.categoryName ?? 'Right') as Handedness
          const frame: HandFrame = {
            landmarks: handResult.landmarks[i],
            handedness,
            score: h?.score ?? 0,
          }
          if (handedness === 'Left') leftHand = frame
          else rightHand = frame
        }

        const poseLandmarks =
          poseResult && poseResult.landmarks.length > 0
            ? poseResult.landmarks[0]
            : null

        // Draw overlays.
        if (ctx && canvas && drawRef.current) {
          drawBothHands(
            ctx,
            leftHand?.landmarks ?? null,
            rightHand?.landmarks ?? null,
            canvas.width,
            canvas.height,
          )
          if (poseLandmarks) {
            drawPose(ctx, poseLandmarks, canvas.width, canvas.height)
          }
        }

        const hasHand = leftHand !== null || rightHand !== null
        if (lastHandPresent !== hasHand) {
          lastHandPresent = hasHand
          setHandPresent(hasHand)
        }

        const tracked: FullTrackedFrame = {
          leftHand,
          rightHand,
          poseLandmarks,
          features: buildFullFeatures(leftHand, rightHand, poseLandmarks),
          timestampMs: now,
        }
        onFrameRef.current?.(tracked)
      }
      rafId = requestAnimationFrame(loop)
    }

    void start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [trackPose])

  return { videoRef, canvasRef, status, fps, handPresent }
}
