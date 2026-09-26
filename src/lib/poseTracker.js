// Live pose tracking for the try-on. A separate VIDEO-mode landmarker so it never interferes
// with body.js, which measures from single still frames.
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

const BASE = import.meta.env.BASE_URL

let trackerPromise = null

export function getPoseTracker() {
  trackerPromise ??= (async () => {
    const vision = await FilesetResolver.forVisionTasks(`${BASE}wasm`)
    const create = (delegate) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `${BASE}models/pose_landmarker_full.task`, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    // GPU keeps up with video on most laptops; fall back to CPU where WebGL2 is missing.
    try {
      return await create('GPU')
    } catch {
      return await create('CPU')
    }
  })().catch((err) => {
    trackerPromise = null
    throw err
  })
  return trackerPromise
}
