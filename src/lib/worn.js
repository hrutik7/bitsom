// The segmenter outlines clothes, not skin. What the person wears in the photo adds its own
// ease on top of the body; subtract a typical allowance for it, per region (circumference, cm).
// Allowances follow common pattern-making ease: fitted ~0–5, regular ~8–12, oversized ~20–30.
// Straight-cut tops hang past a narrower waist, so the waist gets a little more.
export const WORN_EASE = {
  fitted: { chest: 2, waist: 2, hip: 2 },
  regular: { chest: 8, waist: 10, hip: 8 },
  oversized: { chest: 20, waist: 26, hip: 22 },
}

export const WORN_LABELS = { fitted: 'Fitted', regular: 'Regular', oversized: 'Oversized' }

// How unsure we are of the allowance itself, as a fraction of it. Combined in quadrature
// with the photo's own uncertainty.
const ALLOWANCE_UNCERTAINTY = 0.25

const round1 = (n) => Math.round(n * 10) / 10

/**
 * @param estimate result of estimateBody: { chest, waist, hip, torsoLength } as { value, uncertainty }
 * @param worn     key of WORN_EASE
 * @returns same shape, circumferences reduced by the worn allowance; torsoLength untouched
 */
export function bodyFromSilhouette(estimate, worn) {
  const ease = WORN_EASE[worn] ?? WORN_EASE.fitted
  const out = { torsoLength: estimate.torsoLength }
  for (const region of Object.keys(ease)) {
    const { value, uncertainty } = estimate[region]
    const a = ease[region]
    out[region] = {
      value: round1(value - a),
      uncertainty: round1(Math.hypot(uncertainty, ALLOWANCE_UNCERTAINTY * a)),
    }
  }
  return out
}

// A body's front silhouette is narrower at the waist than the chest for most people, and about
// level for slim builds. When the waist reads clearly wider, the torso is usually hidden: a loose
// top hanging straight down, or arms against the sides cutting the chest row short.
const BOXY_WAIST_TO_CHEST = 1.1

export function looksBoxy(estimate) {
  return estimate.waist.value >= BOXY_WAIST_TO_CHEST * estimate.chest.value
}
