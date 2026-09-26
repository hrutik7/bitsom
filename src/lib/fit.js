// Fit computation: body measurements × size chart × fabric → per-region ease and a size.
// STRETCH and THRESHOLDS are the only tuned constants; everything else derives from them.
// A garment chart may declare `designEase`: extra room the cut intends beyond a regular fit
// (an oversized tee). Classes are judged on ease − designEase; displayed ease stays real.

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

// The in-range band of real ease (cm) for a cut with the given design ease.
export function intendedBand(designEase = 0) {
  return [THRESHOLDS.tight + designEase, THRESHOLDS['in range'] + designEase]
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

function evaluateSize(row, body, stretch, isBodyChart, designEase) {
  const regions = []
  for (const region of REGIONS) {
    const b = measure(body[region])
    const chartCm = row[region]
    if (!b || !Number.isFinite(chartCm)) continue

    const effective = isBodyChart ? chartCm : chartCm * stretch
    const ease = isBodyChart ? chartCm - b.cm + BODY_CHART_EASE : effective - b.cm
    const judged = ease - designEase // ease relative to a regular cut
    const cls = classify(judged)
    regions.push({
      region,
      chart: chartCm,
      effective,
      body: b.cm,
      ease,
      judged,
      pm: b.pm,
      cls,
      // Uncertainty is wide enough that the class could flip.
      uncertain: b.pm > 0 && (classify(judged - b.pm) !== cls || classify(judged + b.pm) !== cls),
    })
  }

  let worst = null
  for (const r of regions) {
    if (
      !worst ||
      rankOf(r.cls) > rankOf(worst.cls) ||
      (rankOf(r.cls) === rankOf(worst.cls) && bandDistance(r.judged) > bandDistance(worst.judged))
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
  return byRank !== 0 ? byRank : bandDistance(a.worst.judged) - bandDistance(b.worst.judged)
}

export function fmtCm(n) {
  const r = Math.round(n * 10) / 10
  return (Object.is(r, -0) ? 0 : r).toString().replace('-', '−')
}

function explain(sizes, idx, designEase) {
  const rec = sizes[idx]
  const w = rec.worst
  const prev = sizes[idx - 1]
  const next = sizes[idx + 1]

  // For an intentionally roomy cut, "8cm ease" is not self-explanatory; name the intended band.
  const [lo, hi] = intendedBand(designEase)
  const band = `this cut is designed for ${fmtCm(lo)}–${fmtCm(hi)}cm`
  if (w.cls === 'strain') {
    const which = sizes.length > 1 ? 'roomiest size' : 'only size'
    return {
      drivingRegion: w.region,
      reason: designEase
        ? `${rec.size} — the ${which}, but your ${w.region} still gets just ${fmtCm(w.ease)}cm of room; ${band}.`
        : `${rec.size} — the ${which}, but your ${w.region} still leaves just ${fmtCm(w.ease)}cm ease.`,
    }
  }
  if (prev?.worst && compareSizes(prev, rec) > 0) {
    const r = prev.worst
    return {
      drivingRegion: r.region,
      reason: designEase
        ? `${rec.size} — ${prev.size} gives your ${r.region} only ${fmtCm(r.ease)}cm of room; ${band}.`
        : `${rec.size} — your ${r.region} leaves ${fmtCm(r.ease)}cm ease in ${prev.size}.`,
    }
  }
  if (next?.worst && compareSizes(next, rec) > 0) {
    const r = next.worst
    return {
      drivingRegion: r.region,
      reason: designEase
        ? `${rec.size} — ${next.size} gives your ${r.region} ${fmtCm(r.ease)}cm of room, past the ${fmtCm(lo)}–${fmtCm(hi)}cm this cut is designed for.`
        : `${rec.size} — your ${r.region} would have ${fmtCm(r.ease)}cm ease in ${next.size}.`,
    }
  }
  return {
    drivingRegion: w.region,
    reason: `${rec.size} — your ${w.region} is the limiting region at ${fmtCm(w.ease)}cm ease.`,
  }
}

/**
 * @param body   { chest, waist, hip, torsoLength } — cm numbers or { cm, pm }
 * @param chart  { kind: 'garment' | 'body', designEase?, sizes: [{ size, chest, waist, hip, length }] }
 * @param fabric key of STRETCH
 */
export function computeFit({ body, chart, fabric }) {
  const isBodyChart = chart.kind === 'body'
  const stretch = STRETCH[fabric] ?? 1
  // A body chart already carries the brand's intended ease, oversized or not.
  const designEase = isBodyChart ? 0 : (chart.designEase ?? 0)
  const sizes = chart.sizes.map((row) => evaluateSize(row, body, stretch, isBodyChart, designEase))

  const notes = []
  if (isBodyChart) {
    notes.push(
      `Chart lists body measurements: stretch not applied, and a size is assumed to give ${fmtCm(BODY_CHART_EASE)}cm ease on the body it lists.`,
    )
  }
  if (designEase) {
    const [lo, hi] = intendedBand(designEase)
    notes.push(
      `Oversized cut: sizes are judged against ${fmtCm(lo)}–${fmtCm(hi)}cm of room, not the regular ${fmtCm(THRESHOLDS.tight)}–${fmtCm(THRESHOLDS['in range'])}cm.`,
    )
  }

  const candidates = sizes.map((s, i) => ({ s, i })).filter(({ s }) => s.worst)
  if (candidates.length === 0) {
    return { sizes, stretch, isBodyChart, designEase, notes, recommended: null, drivingRegion: null, reason: null }
  }

  const best = candidates.reduce((a, b) => (compareSizes(b.s, a.s) < 0 ? b : a))
  const { drivingRegion, reason } = explain(sizes, best.i, designEase)

  return {
    sizes,
    stretch,
    isBodyChart,
    designEase,
    notes,
    recommended: best.s.size,
    recommendedIndex: best.i,
    drivingRegion,
    reason,
  }
}
