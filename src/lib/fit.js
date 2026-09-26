// Fit computation: body measurements × size chart × fabric → per-region ease and a size.
// STRETCH and THRESHOLDS are the only tuned constants; everything else derives from them.

export const STRETCH = { cotton: 1.0, 'cotton-elastane': 1.08, jersey: 1.05 }

// Inclusive upper bound of ease (cm) for each class. Above the last bound is 'loose'.
export const THRESHOLDS = { strain: 2, tight: 5, 'in range': 12 }

export const REGIONS = ['chest', 'waist', 'hip']

// Best → worst. A fitted garment is still wearable; a baggy one reads as the wrong size.
const RANK = ['in range', 'tight', 'loose', 'strain']

// A BODY chart value is the body the size is cut for, so the brand's own ease is already
// inside it. Adding stretch or our own ease on top would count it twice. Instead we assume
// a body that exactly matches the chart gets mid-band ease, and offset from there.
const BODY_CHART_EASE = (THRESHOLDS.tight + THRESHOLDS['in range']) / 2

export function classify(ease) {
  if (ease <= THRESHOLDS.strain) return 'strain'
  if (ease <= THRESHOLDS.tight) return 'tight'
  if (ease <= THRESHOLDS['in range']) return 'in range'
  return 'loose'
}

// How far ease sits outside the in-range band; breaks ties between sizes of equal class.
function bandDistance(ease) {
  if (ease <= THRESHOLDS.tight) return THRESHOLDS.tight - ease
  if (ease > THRESHOLDS['in range']) return ease - THRESHOLDS['in range']
  return 0
}

const rankOf = (cls) => RANK.indexOf(cls)

// Accepts a plain number or { cm, pm } (value ± uncertainty).
function measure(m) {
  if (m == null) return null
  const cm = typeof m === 'number' ? m : m.cm
  const pm = typeof m === 'number' ? 0 : (m.pm ?? 0)
  return Number.isFinite(cm) ? { cm, pm } : null
}

function evaluateSize(row, body, stretch, isBodyChart) {
  const regions = []
  for (const region of REGIONS) {
    const b = measure(body[region])
    const chartCm = row[region]
    if (!b || !Number.isFinite(chartCm)) continue

    const effective = isBodyChart ? chartCm : chartCm * stretch
    const ease = isBodyChart ? chartCm - b.cm + BODY_CHART_EASE : effective - b.cm
    const cls = classify(ease)
    regions.push({
      region,
      chart: chartCm,
      effective,
      body: b.cm,
      ease,
      pm: b.pm,
      cls,
      // Uncertainty is wide enough that the class could flip.
      uncertain: b.pm > 0 && (classify(ease - b.pm) !== cls || classify(ease + b.pm) !== cls),
    })
  }

  let worst = null
  for (const r of regions) {
    if (
      !worst ||
      rankOf(r.cls) > rankOf(worst.cls) ||
      (rankOf(r.cls) === rankOf(worst.cls) && bandDistance(r.ease) > bandDistance(worst.ease))
    ) {
      worst = r
    }
  }

  const torso = measure(body.torsoLength)
  const lengthDelta = torso && Number.isFinite(row.length) ? row.length - torso.cm : null

  return { size: row.size, regions, worst, lengthDelta }
}

// Lower is better: [class rank of worst region, its distance from the in-range band].
function compareSizes(a, b) {
  const byRank = rankOf(a.worst.cls) - rankOf(b.worst.cls)
  return byRank !== 0 ? byRank : bandDistance(a.worst.ease) - bandDistance(b.worst.ease)
}

export function fmtCm(n) {
  const r = Math.round(n * 10) / 10
  return (Object.is(r, -0) ? 0 : r).toString().replace('-', '−')
}

function explain(sizes, idx) {
  const rec = sizes[idx]
  const w = rec.worst
  const prev = sizes[idx - 1]
  const next = sizes[idx + 1]

  if (w.cls === 'strain') {
    return {
      drivingRegion: w.region,
      reason: `${rec.size} — the ${sizes.length > 1 ? 'roomiest size' : 'only size'}, but your ${w.region} still leaves just ${fmtCm(w.ease)}cm ease.`,
    }
  }
  if (prev?.worst && compareSizes(prev, rec) > 0) {
    return {
      drivingRegion: prev.worst.region,
      reason: `${rec.size} — your ${prev.worst.region} leaves ${fmtCm(prev.worst.ease)}cm ease in ${prev.size}.`,
    }
  }
  if (next?.worst && compareSizes(next, rec) > 0) {
    return {
      drivingRegion: next.worst.region,
      reason: `${rec.size} — your ${next.worst.region} would have ${fmtCm(next.worst.ease)}cm ease in ${next.size}.`,
    }
  }
  return {
    drivingRegion: w.region,
    reason: `${rec.size} — your ${w.region} is the limiting region at ${fmtCm(w.ease)}cm ease.`,
  }
}

/**
 * @param body   { chest, waist, hip, torsoLength } — cm numbers or { cm, pm }
 * @param chart  { kind: 'garment' | 'body', sizes: [{ size, chest, waist, hip, length }] }
 * @param fabric key of STRETCH
 */
export function computeFit({ body, chart, fabric }) {
  const isBodyChart = chart.kind === 'body'
  const stretch = STRETCH[fabric] ?? 1
  const sizes = chart.sizes.map((row) => evaluateSize(row, body, stretch, isBodyChart))

  const notes = []
  if (isBodyChart) {
    notes.push(
      `Chart lists body measurements: stretch not applied, and a size is assumed to give ${fmtCm(BODY_CHART_EASE)}cm ease on the body it lists.`,
    )
  }

  const candidates = sizes.map((s, i) => ({ s, i })).filter(({ s }) => s.worst)
  if (candidates.length === 0) {
    return { sizes, stretch, isBodyChart, notes, recommended: null, drivingRegion: null, reason: null }
  }

  const best = candidates.reduce((a, b) => (compareSizes(b.s, a.s) < 0 ? b : a))
  const { drivingRegion, reason } = explain(sizes, best.i)

  return {
    sizes,
    stretch,
    isBodyChart,
    notes,
    recommended: best.s.size,
    recommendedIndex: best.i,
    drivingRegion,
    reason,
  }
}
