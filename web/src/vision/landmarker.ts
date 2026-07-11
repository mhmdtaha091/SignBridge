import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

// Self-hosted for PWA offline support. In dev mode Vite serves these from /public.
const WASM_BASE = '/wasm'
const MODEL_URL = '/models/hand_landmarker.task'

let instance: Promise<HandLandmarker> | null = null

/** Lazily create the shared HandLandmarker (WASM + model download on first call). */
export function getHandLandmarker(): Promise<HandLandmarker> {
  if (!instance) {
    instance = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    })()
    // Allow a retry if the network failed mid-download.
    instance.catch(() => {
      instance = null
    })
  }
  return instance
}
