// Mask geometry for body.js: pure functions over a binary person mask (Uint8Array, W×H,
// 1 = person) and pixel-space landmarks. No MediaPipe, so it runs on synthetic masks too.

export const LM = {
  nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lIndex: 19, rIndex: 20, lHip: 23, rHip: 24, lAnkle: 27, rAnkle: 28, lHeel: 29, rHeel: 30,
}
const ARM_SEGMENTS = [
  [LM.lShoulder, LM.lElbow], [LM.lElbow, LM.lWrist], [LM.lWrist, LM.lIndex],
  [LM.rShoulder, LM.rElbow], [LM.rElbow, LM.rWrist], [LM.rWrist, LM.rIndex],
]

// Measurement rows as a fraction of the way from shoulder line to hip line.
const ROWS = { chest: 0.25, waist: 0.55, hip: 0.85 }
const ARM_RADIUS_FRAC = 0.06 // max arm corridor radius, × image width
const ARM_RADIUS_MARGIN = 1.15 // corridor radius ÷ measured arm half-thickness
const TORSO_BAND_MARGIN = 0.05 // × torso span, each side, for picking the torso run
const MIN_RUN = 5 // px; shorter person runs are treated as noise
const ROW_SAMPLES = 2 // scan y±2 and take the median width
const SEED_SEARCH_FRAC = 0.02 // × image width, to find the mask near a landmark

export const ARMS_CROSSED_WARNING = 'arms across body — measurement may include arms; use an A-pose'

// ── Connected component ──────────────────────────────────────────────────────

function nearestOn(mask, W, H, pt, radius) {
  const cx = Math.round(pt.x)
  const cy = Math.round(pt.y)
  let best = -1
  let bestD = Infinity
  for (let y = Math.max(0, cy - radius); y <= Math.min(H - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(W - 1, cx + radius); x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2
      if (mask[y * W + x] && d < bestD) {
        best = y * W + x
        bestD = d
      }
    }
  }
  return best
}

// The 4-connected component under the first seed that lands on the mask. Drops other
// people and background blobs. Returns null if no seed hits the mask.
export function keepComponent(mask, W, H, seeds) {
  const radius = Math.max(2, Math.round(SEED_SEARCH_FRAC * W))
  let seed = -1
  for (const s of seeds) {
    seed = nearestOn(mask, W, H, s, radius)
    if (seed >= 0) break
  }
  if (seed < 0) return null

  const out = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  let head = 0
  let tail = 0
  out[seed] = 1
  queue[tail++] = seed
  while (head < tail) {
    const i = queue[head++]
    const x = i % W
    const neighbours = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]
    for (const j of neighbours) {
      if (j >= 0 && j < mask.length && mask[j] && !out[j]) {
        out[j] = 1
        queue[tail++] = j
      }
    }
  }
  return out
}

// ── Arms ─────────────────────────────────────────────────────────────────────

// A wrist over the torso: inside the shoulders horizontally AND between the shoulder and
// hip lines vertically. Wrist-above-hip alone would flag every A-pose and T-pose.
export function armsCrossed(p) {
  const xMin = Math.min(p[LM.lShoulder].x, p[LM.rShoulder].x)
  const xMax = Math.max(p[LM.lShoulder].x, p[LM.rShoulder].x)
  const yTop = Math.min(p[LM.lShoulder].y, p[LM.rShoulder].y)
  const yBottom = Math.max(p[LM.lHip].y, p[LM.rHip].y)
  return [p[LM.lWrist], p[LM.rWrist]].some(
    (w) => w.x > xMin && w.x < xMax && w.y > yTop && w.y < yBottom,
  )
}

// Walk from (x,y) along (ux,uy) until the mask ends; returns the distance in px.
function extent(mask, W, H, x, y, ux, uy, max) {
  for (let d = 0; d <= max; d++) {
    const px = Math.round(x + ux * d)
    const py = Math.round(y + uy * d)
    if (px < 0 || py < 0 || px >= W || py >= H || !mask[py * W + px]) return d
  }
  return max
}

// Arm half-thickness from the mask, perpendicular to the forearm and lower upper arm.
// Per sample we take the shorter side: the other side may run into the torso.
function armHalfThickness(mask, W, H, p, max) {
  const halves = []
  const sample = (a, b, t) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len < 1) return
    const [nx, ny] = [-dy / len, dx / len]
    const x = a.x + t * dx
    const y = a.y + t * dy
    if (!mask[Math.round(y) * W + Math.round(x)]) return
    halves.push(Math.min(extent(mask, W, H, x, y, nx, ny, max), extent(mask, W, H, x, y, -nx, -ny, max)))
  }
  for (const [s, e, w] of [[LM.lShoulder, LM.lElbow, LM.lWrist], [LM.rShoulder, LM.rElbow, LM.rWrist]]) {
    for (const t of [0.3, 0.5, 0.7]) sample(p[e], p[w], t)
    for (const t of [0.6, 0.8]) sample(p[s], p[e], t)
  }
  if (halves.length === 0) return null
  halves.sort((a, b) => a - b)
  return halves[Math.floor(halves.length / 2)]
}

// Zero pixels within r of segment a→b, except columns inside the protected band.
function eraseCorridor(mask, W, H, a, b, r, protect) {
  const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x) - r))
  const x1 = Math.min(W - 1, Math.ceil(Math.max(a.x, b.x) + r))
  const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y) - r))
  const y1 = Math.min(H - 1, Math.ceil(Math.max(a.y, b.y) + r))
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  const r2 = r * r
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x >= protect.left && x <= protect.right) continue
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2))
      const ex = a.x + t * dx - x
      const ey = a.y + t * dy - y
      if (ex * ex + ey * ey <= r2) mask[y * W + x] = 0
    }
  }
}

// ── Rows ─────────────────────────────────────────────────────────────────────

// Person runs of at least MIN_RUN px in one row; gaps shorter than MIN_RUN are bridged.
function rowRuns(mask, W, y) {
  const runs = []
  let start = -1
  for (let x = 0; x <= W; x++) {
    const on = x < W && mask[y * W + x] === 1
    if (on && start < 0) start = x
    if (!on && start >= 0) {
      if (x - start >= MIN_RUN) {
        const last = runs[runs.length - 1]
        if (last && start - last[1] - 1 < MIN_RUN) last[1] = x - 1
        else runs.push([start, x - 1])
      }
      start = -1
    }
  }
  return runs
}

// Widest run on row y that intersects the torso band.
function torsoSpan(mask, W, y, band) {
  let best = null
  for (const [left, right] of rowRuns(mask, W, y)) {
    if (right < band.left || left > band.right) continue
    if (!best || right - left + 1 > best.widthPx) best = { left, right, widthPx: right - left + 1 }
  }
  return best
}

/**
 * Isolate the person, remove arms, and measure torso widths in pixels.
 * @param mask Uint8Array W×H, 1 = person (not modified)
 * @param p    landmarks in pixel space, indexed as in MediaPipe Pose
 * @returns { mask, rows, arms, armRadius, armsErased, torsoBand, protectBand, shoulder, hip, warnings }
 *          or { error } when the person cannot be isolated or a row has no torso.
 */
export function measureSilhouette(mask, W, H, p) {
  const shoulder = { x: (p[LM.lShoulder].x + p[LM.rShoulder].x) / 2, y: (p[LM.lShoulder].y + p[LM.rShoulder].y) / 2 }
  const hip = { x: (p[LM.lHip].x + p[LM.rHip].x) / 2, y: (p[LM.lHip].y + p[LM.rHip].y) / 2 }

  const body = keepComponent(mask, W, H, [p[LM.nose], shoulder, hip])
  if (!body) return { error: 'Could not separate you from the background.' }

  const torsoXs = [LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip].map((i) => p[i].x)
  const spanLeft = Math.min(...torsoXs)
  const spanRight = Math.max(...torsoXs)
  const span = spanRight - spanLeft
  const torsoBand = { left: spanLeft - TORSO_BAND_MARGIN * span, right: spanRight + TORSO_BAND_MARGIN * span }

  const maxRadius = ARM_RADIUS_FRAC * W
  const half = armHalfThickness(body, W, H, p, Math.ceil(maxRadius))
  const armRadius = half ? Math.min(maxRadius, half * ARM_RADIUS_MARGIN) : maxRadius

  // Torso core that erasure may never touch: the landmark span pulled in by one arm radius,
  // so a hanging arm (centred under the shoulder joint) can still be cut away cleanly.
  const cx = (spanLeft + spanRight) / 2
  const protectBand =
    span > 2 * armRadius
      ? { left: spanLeft + armRadius, right: spanRight - armRadius }
      : { left: cx, right: cx }

  const warnings = []
  const arms = ARM_SEGMENTS.map(([i, j]) => [p[i], p[j]])
  const crossed = armsCrossed(p)
  if (crossed) warnings.push(ARMS_CROSSED_WARNING)
  else for (const [a, b] of arms) eraseCorridor(body, W, H, a, b, armRadius, protectBand)

  const rows = []
  for (const [name, t] of Object.entries(ROWS)) {
    const y = Math.round(shoulder.y + t * (hip.y - shoulder.y))
    const samples = []
    for (let yy = y - ROW_SAMPLES; yy <= y + ROW_SAMPLES; yy++) {
      if (yy < 0 || yy >= H) continue
      const s = torsoSpan(body, W, yy, torsoBand)
      if (s) samples.push(s)
    }
    if (samples.length === 0) return { error: `Could not find the torso edge at the ${name}.` }
    samples.sort((a, b) => a.widthPx - b.widthPx)
    rows.push({ name, y, ...samples[Math.floor(samples.length / 2)] })
  }

  return {
    mask: body, rows, arms, armRadius, armsErased: !crossed, torsoBand, protectBand, shoulder, hip, warnings,
  }
}
