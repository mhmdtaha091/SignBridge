import type { RefObject, ReactNode } from 'react'
import type { FullTrackingStatus } from '../vision/useFullTracking'

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  status: FullTrackingStatus
  fps: number
  handPresent?: boolean
  children?: ReactNode
}

const statusCopy: Partial<Record<FullTrackingStatus, { title: string; body: string }>> = {
  'loading-model': {
    title: 'Warming up the hand + pose trackers…',
    body: 'Downloading on-device vision models (a few MB, first visit only).',
  },
  'requesting-camera': {
    title: 'Waiting for camera permission',
    body: 'SignBridge needs your camera to see your signs. Video never leaves this device.',
  },
  denied: {
    title: 'Camera access was blocked',
    body: 'Click the camera icon in your browser\'s address bar to allow access, then reload.',
  },
  'no-camera': {
    title: 'No camera found',
    body: 'Connect a webcam (or switch to a device with one) to use live signing.',
  },
  error: {
    title: 'Could not load the vision models',
    body: 'Check your internet connection and reload — the models download once, then are cached.',
  },
}

export default function FullCameraView({ videoRef, canvasRef, status, fps, handPresent, children }: Props) {
  const overlay = statusCopy[status]

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-3xl bg-ink-900 shadow-lift">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover -scale-x-100"
        aria-label="Live camera view (mirrored)"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover -scale-x-100"
        aria-hidden="true"
      />

      {status === 'running' && (
        <div className="absolute top-3 left-3 flex gap-2" aria-live="polite">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-extrabold backdrop-blur ${
              handPresent ? 'bg-leaf-500/90 text-white' : 'bg-ink-900/60 text-cream-100'
            }`}
          >
            {handPresent ? '✋ Hands detected' : 'Show your hands'}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-ink-900/60 text-cream-100 backdrop-blur tabular-nums">
            {fps} fps
          </span>
        </div>
      )}

      {overlay && (
        <div
          role="status"
          className="absolute inset-0 grid place-items-center bg-ink-900/85 text-center p-6"
        >
          <div className="max-w-sm">
            {(status === 'loading-model' || status === 'requesting-camera') && (
              <div
                aria-hidden="true"
                className="mx-auto mb-4 w-10 h-10 rounded-full border-4 border-cream-200/30 border-t-coral-500 animate-spin"
              />
            )}
            <h2 className="text-cream-50 font-extrabold text-lg">{overlay.title}</h2>
            <p className="mt-2 text-cream-200 text-sm">{overlay.body}</p>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
