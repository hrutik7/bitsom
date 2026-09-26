// Photo → body measurements. PoseLandmarker places the rows, ImageSegmenter gives the
// silhouette (geometry in silhouette.js), height sets the scale. Pure: no UI, no React.
import { FilesetResolver, ImageSegmenter, PoseLandmarker } from '@mediapipe/tasks-vision'
import { LM, measureSilhouette } from './silhouette'

const BASE = import.meta.env.BASE_URL
const WASM_PATH = `${BASE}wasm`
const POSE_MODEL = `${BASE}models/pose_landmarker_full.task`
const SEGMENTER_MODEL = `${BASE}models/selfie_segmenter.tflite`

const DEPTH_RATIO = 0.7 // torso depth ÷ width, for the ellipse
// Scale modes. Full body: head top → floor spans the whole height. Torso (half-body
// framing, no ankles): shoulder line → hip line spans ~30% of height, a population average.
const TORSO_HEIGHT_FRACTION = 0.3
const UNCERTAINTY = { 'full-body': 0.08, torso: 0.12 } // ± fraction of each value
const TORSO_NOTE = 'torso-scaled — full-body framing is more accurate'
const MAX_SIDE = 1280 // downscale large phone photos before inference
const MIN_VISIBILITY = 0.5
// ~21 MB of wasm + models; on a slow link (phone over a tunnel) say so instead of hanging.
const MODEL_TIMEOUT_MS = 90_000
const MODEL_TIMEOUT =
  'Vision models (~21 MB) are still downloading — slow connection or tunnel. Wait a moment, then Retake / Replace to try again.'
// Plausibility guard: a torso width outside this range, or hips narrower than half the
// chest, means the silhouette was mis-measured, not that the person is unusual.
const WIDTH_RANGE_CM = [15, 80]
const MIN_HIP_TO_CHEST = 0.5

const UNRELIABLE =
  'Could not measure reliably from this photo — try a standing A-pose, arms away from the body, full body in frame, plain background.'

export class BodyEstimateError extends Error {
  name = 'BodyEstimateError'
}

// ── Models: loaded once per page, warmed at import ─────────────────────────────

let modelsPromise = null

function getModels() {
  modelsPromise ??= (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
    const [pose, segmenter] = await Promise.all([
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'CPU' },
        runningMode: 'IMAGE',
        numPoses: 1,
      }),
      ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: SEGMENTER_MODEL, delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      }),
    ])
    return { pose, segmenter }
  })().catch((err) => {
    modelsPromise = null // allow a retry on the next call
    throw new BodyEstimateError(`Could not load vision models: ${err.message ?? err}`)
  })
  return modelsPromise
}

getModels().catch(() => {}) // warm-up; real errors surface from estimateBody

// ── Debug: refreshed on every estimateBody call (also when it throws after measuring) ──

export const debug = {}

// ── Pixel analysis (height-independent, cached per image) ─────────────────────

const analysisCache = new WeakMap()

// Draw to a canvas: applies EXIF orientation and caps resolution.
function toCanvas(image) {
  const w = image.naturalWidth ?? image.width
  const h = image.naturalHeight ?? image.height
  if (!w || !h) throw new BodyEstimateError('Image has not finished loading.')
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

function personMask(segmenter, canvas) {
  let out = null
  segmenter.segment(canvas, (result) => {
    const masks = result.confidenceMasks ?? []
    // Selfie segmenter emits one person-confidence channel; multi-class models put person last.
    const m = masks[masks.length - 1]
    if (!m) return
    const conf = m.getAsFloat32Array()
    const mask = new Uint8Array(m.width * m.height)
    for (let i = 0; i < mask.length; i++) mask[i] = conf[i] > 0.5 ? 1 : 0
    out = { mask, width: m.width, height: m.height }
  })
  if (!out) throw new BodyEstimateError('Segmentation returned no mask.')
  return out
}

function analyse(image, models) {
  const canvas = toCanvas(image)
  const W = canvas.width
  const H = canvas.height

  const lm = models.pose.detect(canvas).landmarks?.[0]
  if (!lm) {
    throw new BodyEstimateError('No person detected. Use a full-body photo, standing and facing the camera.')
  }
  const visible = (i) => (lm[i].visibility ?? 1) >= MIN_VISIBILITY
  // Out-of-frame landmarks are still returned (extrapolated), so also require them in the image.
  const inFrame = (i) => visible(i) && lm[i].x >= 0 && lm[i].x <= 1 && lm[i].y >= 0 && lm[i].y <= 1
  if (![LM.nose, LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip].every(visible)) {
    throw new BodyEstimateError('Head, shoulders and hips must be visible. Step back so at least head to knees is in frame.')
  }
  const p = lm.map((l) => ({ x: l.x * W, y: l.y * H, visibility: l.visibility }))

  const { mask, width: mW, height: mH } = personMask(models.segmenter, canvas)
  if (mW !== W || mH !== H) throw new BodyEstimateError(`Mask size ${mW}×${mH} does not match image ${W}×${H}.`)

  const sil = measureSilhouette(mask, W, H, p)
  if (sil.error) throw new BodyEstimateError(`${sil.error} ${UNRELIABLE}`)

  let scale
  // A foot counts only when ankle AND heel are in frame: at a knee-height crop the model
  // still places an ankle right on the bottom edge with passing visibility.
  const footInFrame = [[LM.lAnkle, LM.lHeel], [LM.rAnkle, LM.rHeel]].some(([a, h]) => inFrame(a) && inFrame(h))
  if (footInFrame) {
    // Head top: nose minus half a head, head height ≈ nose-to-shoulder distance.
    const headHeight = sil.shoulder.y - p[LM.nose].y
    const topY = p[LM.nose].y - 0.5 * headHeight
    // Heels sit on the floor; ankle joints are ~7cm above it. Take whichever is lowest.
    const bottomY = Math.max(...[LM.lAnkle, LM.rAnkle, LM.lHeel, LM.rHeel].filter(inFrame).map((i) => p[i].y))
    scale = { mode: 'full-body', topY, bottomY, fraction: 1 }
  } else {
    scale = { mode: 'torso', topY: sil.shoulder.y, bottomY: sil.hip.y, fraction: TORSO_HEIGHT_FRACTION }
  }
  scale.px = scale.bottomY - scale.topY
  if (!(scale.px > 0)) throw new BodyEstimateError('Could not find a reference length in the photo.')

  const warnings = scale.mode === 'torso' ? [...sil.warnings, TORSO_NOTE] : sil.warnings
  return { W, H, landmarks: p, ...sil, warnings, scale }
}

// ── Public API ─────────────────────────────────────────────────────────────────

function ellipsePerimeter(a, b) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
}

const withUncertainty = (value, fraction) => ({
  value: Math.round(value * 10) / 10,
  uncertainty: Math.round(value * fraction * 10) / 10,
})

/**
 * @param {HTMLImageElement | HTMLCanvasElement} imageElement a loaded image
 * @param {number} heightCm the person's height
 * @returns {Promise<{ chest, waist, hip, torsoLength, warnings, scaleMode }>} measurements
 *          are { value, uncertainty } in cm; warnings is an array of strings; scaleMode is
 *          'full-body' or 'torso' (no ankles in frame)
 */
export async function estimateBody(imageElement, heightCm) {
  for (const k of Object.keys(debug)) delete debug[k]
  if (!(heightCm > 0)) throw new BodyEstimateError('Enter your height first.')
  // Only the wait times out; the download keeps going, so a retry picks it up.
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new BodyEstimateError(MODEL_TIMEOUT)), MODEL_TIMEOUT_MS)
  })
  const models = await Promise.race([getModels(), timeout]).finally(() => clearTimeout(timer))

  const key = imageElement.currentSrc || imageElement.src || null
  let analysis = analysisCache.get(imageElement)
  if (!analysis || analysis.key !== key || !key) {
    analysis = { key, ...analyse(imageElement, models) }
    analysisCache.set(imageElement, analysis)
  }

  const { scale } = analysis
  const cmPerPixel = (heightCm * scale.fraction) / scale.px
  const uncertainty = UNCERTAINTY[scale.mode]
  const rows = analysis.rows.map((r) => {
    const widthCm = r.widthPx * cmPerPixel
    const depthCm = DEPTH_RATIO * widthCm
    return { ...r, widthCm, depthCm, circumference: ellipsePerimeter(widthCm / 2, depthCm / 2) }
  })
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]))
  const torsoLength = (analysis.hip.y - analysis.shoulder.y) * cmPerPixel

  Object.assign(debug, {
    width: analysis.W,
    height: analysis.H,
    mask: analysis.mask, // the person's component, after arm corridors are erased
    landmarks: analysis.landmarks,
    arms: analysis.armsErased ? analysis.arms : [],
    armRadius: analysis.armRadius,
    torsoBand: analysis.torsoBand,
    protectBand: analysis.protectBand,
    shoulderY: analysis.shoulder.y,
    hipY: analysis.hip.y,
    scaleMode: scale.mode,
    scaleTopY: scale.topY, // the pixel span that cmPerPixel is calibrated on
    scaleBottomY: scale.bottomY,
    cmPerPixel,
    rows,
    warnings: analysis.warnings,
  })

  const [minW, maxW] = WIDTH_RANGE_CM
  if (
    rows.some((r) => r.widthCm < minW || r.widthCm > maxW) ||
    byName.hip.widthCm < MIN_HIP_TO_CHEST * byName.chest.widthCm
  ) {
    throw new BodyEstimateError(UNRELIABLE)
  }

  return {
    chest: withUncertainty(byName.chest.circumference, uncertainty),
    waist: withUncertainty(byName.waist.circumference, uncertainty),
    hip: withUncertainty(byName.hip.circumference, uncertainty),
    torsoLength: withUncertainty(torsoLength, uncertainty),
    warnings: analysis.warnings,
    scaleMode: scale.mode,
  }
}
