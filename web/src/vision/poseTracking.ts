import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

// Self-hosted for PWA offline support. In dev mode Vite serves these from /public.
const WASM_BASE = '/wasm'
const MODEL_URL = '/models/pose_landmarker_lite.task'

let instance: Promise<PoseLandmarker> | null = null

/** Lazily create the shared PoseLandmarker (WASM + model download on first call). */
export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!instance) {
    instance = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    })()
    instance.catch(() => {
      instance = null
    })
  }
  return instance
}
