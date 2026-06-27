import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

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
