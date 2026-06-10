import { useEffect, useRef, useState } from 'react'
import { getHandLandmarker } from './landmarker'
import { drawHand } from './drawing'
import { normalizeHand } from './normalize'
import type { HandFrame, Handedness } from './types'

export type TrackingStatus =
  | 'loading-model'
  | 'requesting-camera'
  | 'running'
  | 'denied'
  | 'no-camera'
  | 'error'

export interface TrackedFrame {
  /** Raw hand for this frame, or null when no hand is visible. */
  frame: HandFrame | null
  /** Normalized 63-dim feature vector, or null when no hand is visible. */
  features: number[] | null
  timestampMs: number
}

interface Options {
  onFrame?: (tracked: TrackedFrame) => void
  /** Draw the landmark skeleton on the overlay canvas (default true). */
  drawOverlay?: boolean
}

/**
 * Owns the whole live-vision pipeline: camera permission → video stream →
 * MediaPipe HandLandmarker loop → normalized features per frame.
 * Attach `videoRef` and `canvasRef` to a <video> and an overlay <canvas>.
 */
export function useHandTracking({ onFrame, drawOverlay = true }: Options = {}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<TrackingStatus>('loading-model')
  const [fps, setFps] = useState(0)
  const [handPresent, setHandPresent] = useState(false)

  // Keep the latest callback without restarting the pipeline.
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame
  const drawRef = useRef(drawOverlay)
  drawRef.current = drawOverlay

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

      let landmarker
      try {
        landmarker = await getHandLandmarker()
      } catch {
        if (!cancelled) setStatus('error')
        return
      }
      if (cancelled) return

      setStatus('requesting-camera')
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } },
          audio: false,
        })
      } catch (err) {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ''
        setStatus(
          name === 'NotFoundError' || name === 'OverconstrainedError' ? 'no-camera' : 'denied',
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
        const result = landmarker.detectForVideo(video, now)

        if (lastTs) {
          const inst = 1000 / (now - lastTs)
          emaFps = emaFps ? emaFps * 0.9 + inst * 0.1 : inst
          // Update React state sparingly.
          setFps((prev) => (Math.abs(prev - emaFps) > 1 ? Math.round(emaFps) : prev))
        }
        lastTs = now

        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }

        let tracked: TrackedFrame
        if (result.landmarks.length > 0) {
          const frame: HandFrame = {
            landmarks: result.landmarks[0],
            handedness: (result.handedness[0]?.[0]?.categoryName ?? 'Right') as Handedness,
            score: result.handedness[0]?.[0]?.score ?? 0,
          }
          if (ctx && canvas && drawRef.current) {
            drawHand(ctx, frame.landmarks, canvas.width, canvas.height)
          }
          tracked = { frame, features: normalizeHand(frame), timestampMs: now }
        } else {
          tracked = { frame: null, features: null, timestampMs: now }
        }

        if (lastHandPresent !== (tracked.frame !== null)) {
          lastHandPresent = tracked.frame !== null
          setHandPresent(lastHandPresent)
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
  }, [])

  return { videoRef, canvasRef, status, fps, handPresent }
}
