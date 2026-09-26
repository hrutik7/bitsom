import { CLASS_STYLE } from '../../lib/classes'
import { fmtCm } from '../../lib/fit'
import { circumferenceToWidth } from '../../lib/geometry'
import { capsulePath, smoothPath } from '../../lib/svgPath'

// Illustrative try-on. Everything is in centimetres (1 SVG unit = 1 cm). Torso widths and
// the tee come from the same numbers fit.js uses; head, limbs and shoulder width follow
// standard figure proportions of the height, since those are never measured.
const PROPORTION = {
  headRy: 0.062, headRx: 0.047, neckW: 0.066, hps: 0.155, shoulder: 0.18,
  crotchDrop: 0.06, knee: 0.72, ankle: 0.955, upperArm: 0.028, foreArm: 0.022,
}
const SHOULDER_OVER_CHEST = 1.12
const SLEEVE = {
  // length (× height) · opening (× upper-arm radius) · seam drop (× height)
  oversized: { len: 0.13, open: 1.8, drop: 0.045 },
  regular: { len: 0.1, open: 1.4, drop: 0.004 },
  fitted: { len: 0.06, open: 1.12, drop: 0 },
}
const MANNEQUIN = '#46444a'
const LABEL_X = 34

const finite = (n) => Number.isFinite(n)
const mirror = (pts) => [...pts, ...pts.map(([x, y]) => [-x, y]).reverse()]

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

export default function FitPreview({ product, color, cut, body, heightCm, sizeResult, row }) {
  const H = finite(heightCm) && heightCm > 100 ? heightCm : 175
  const P = Object.fromEntries(Object.entries(PROPORTION).map(([k, f]) => [k, f * H]))

  // Body circumferences → front widths.
  const bc = {
    chest: body.chest?.cm,
    waist: body.waist?.cm,
    hip: body.hip?.cm,
  }
  bc.chest = finite(bc.chest) ? bc.chest : 96
  bc.hip = finite(bc.hip) ? bc.hip : bc.chest
  bc.waist = finite(bc.waist) ? bc.waist : (bc.chest + bc.hip) / 2
  const bw = Object.fromEntries(Object.entries(bc).map(([k, c]) => [k, circumferenceToWidth(c)]))

  const torso = finite(body.torsoLength?.cm) ? Math.min(0.4 * H, Math.max(0.22 * H, body.torsoLength.cm)) : 0.3 * H
  const shoulderY = P.shoulder
  const hipY = shoulderY + torso
  const rowY = { chest: shoulderY + 0.25 * torso, waist: shoulderY + 0.55 * torso, hip: shoulderY + 0.85 * torso }
  const shoulderHalf = (bw.chest * SHOULDER_OVER_CHEST) / 2
  const crotchY = hipY + P.crotchDrop

  // Garment circumference per region = body + ease (exactly what fit.js computed).
  const regions = Object.fromEntries((sizeResult?.regions ?? []).map((r) => [r.region, r]))
  const gc = { chest: regions.chest && regions.chest.body + regions.chest.ease, hip: regions.hip && regions.hip.body + regions.hip.ease }
  gc.chest ??= gc.hip ?? bc.chest
  gc.hip ??= gc.chest
  const gWaist = regions.waist ? regions.waist.body + regions.waist.ease : (gc.chest + gc.hip) / 2
  // A garment smaller than the body is stretched onto it; a bigger one hangs at its own width.
  const gw = {
    chest: Math.max(bw.chest, circumferenceToWidth(gc.chest)),
    waist: Math.max(bw.waist, circumferenceToWidth(gWaist)),
    hip: Math.max(bw.hip, circumferenceToWidth(gc.hip)),
  }

  // ── Mannequin ──
  const torsoPath = smoothPath(
    mirror([
      [P.neckW / 2, P.headRy * 2 - 1],
      [P.neckW / 2, P.hps],
      [shoulderHalf, shoulderY],
      [bw.chest / 2 + 0.5, shoulderY + 0.12 * torso],
      [bw.chest / 2, rowY.chest],
      [bw.waist / 2, rowY.waist],
      [bw.hip / 2, rowY.hip],
      [bw.hip / 2 - 0.5, crotchY],
      [0.6, crotchY + 1],
    ]),
  )
  const legs = [1, -1].map((s) =>
    smoothPath(
      [
        [s * (bw.hip / 2 - 0.5), crotchY - 3],
        [s * bw.hip * 0.3, P.knee],
        [s * bw.hip * 0.2, P.ankle],
        [s * bw.hip * 0.07, P.ankle],
        [s * bw.hip * 0.05, P.knee],
        [s * 1, crotchY],
      ],
      true,
    ),
  )
  const elbowOut = shoulderHalf + 4
  const arms = [1, -1].map((s) => {
    const sh = [s * (shoulderHalf - 1.5), shoulderY + 2]
    const el = [s * elbowOut, shoulderY + 0.19 * H]
    const wr = [s * (elbowOut + 3), shoulderY + 0.35 * H]
    return { sh, el, wr, d: [capsulePath(sh, el, P.upperArm), capsulePath(el, wr, P.foreArm)] }
  })

  // ── Tee ──
  const sleeve = SLEEVE[cut] ?? SLEEVE.regular
  const hemY = finite(row?.length) ? P.hps + row.length : hipY + 8
  const widthAt = (y) => {
    // Straight fall below the hip row; linear between rows above it.
    const stops = [[rowY.chest, gw.chest], [rowY.waist, gw.waist], [rowY.hip, gw.hip]]
    if (y <= stops[0][0]) return stops[0][1]
    for (let i = 1; i < stops.length; i++) {
      const [y0, w0] = stops[i - 1]
      const [y1, w1] = stops[i]
      if (y <= y1) return w0 + ((y - y0) / (y1 - y0)) * (w1 - w0)
    }
    return stops[stops.length - 1][1]
  }
  const seam = [Math.max(shoulderHalf, gw.chest / 2) + (cut === 'oversized' ? 3 : 0.5), shoulderY + sleeve.drop * H]
  const [ax, ay] = [arms[0].el[0] - arms[0].sh[0], arms[0].el[1] - arms[0].sh[1]]
  const alen = Math.hypot(ax, ay)
  const [ux, uy] = [ax / alen, ay / alen]
  const open = P.upperArm * sleeve.open
  const sleeveEnd = [seam[0] + ux * sleeve.len * H, seam[1] + uy * sleeve.len * H]
  const outer = [sleeveEnd[0] + uy * open, sleeveEnd[1] - ux * open]
  const inner = [sleeveEnd[0] - uy * open, sleeveEnd[1] + ux * open]
  const underarm = [gw.chest / 2, shoulderY + (cut === 'oversized' ? 0.24 : 0.15) * torso]
  const sideYs = [rowY.chest, rowY.waist, rowY.hip].filter((y) => y < hemY - 2)
  const collar = P.neckW / 2 + 1.6
  const right = [
    [collar, P.hps],
    // Fabric rides over the shoulder before a dropped seam falls down the arm.
    [shoulderHalf + 0.8, shoulderY - 0.8],
    seam,
    outer,
    inner,
    underarm,
    ...sideYs.map((y) => [widthAt(y) / 2, y]),
    [widthAt(hemY) / 2, hemY],
  ]
  const tee =
    `M${-collar},${P.hps} Q0,${P.hps + 0.03 * H} ${collar},${P.hps} ` +
    right.slice(1).map(([x, y]) => `L${x},${y}`).join(' ') +
    ` Q0,${hemY + 1.2} ${-widthAt(hemY) / 2},${hemY} ` +
    [...right.slice(1)].reverse().slice(1).map(([x, y]) => `L${-x},${y}`).join(' ') +
    'Z'

  const dark = luminance(color.hex) < 0.4
  const crease = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)'

  // Fit cues per measured region: pull lines when strained/tight, drape folds when loose.
  const cues = Object.entries(rowY).flatMap(([region, y]) => {
    const r = regions[region]
    if (!r || y > hemY) return []
    const half = widthAt(y) / 2
    if (r.cls === 'strain' || r.cls === 'tight') {
      const n = r.cls === 'strain' ? 3 : 2
      return Array.from({ length: n }, (_, i) => {
        const x = -half * 0.6 + (i * half * 1.2) / Math.max(1, n - 1)
        return <path key={`${region}${i}`} d={`M${x - 3},${y - 2} L${x + 3},${y + 2}`} stroke={CLASS_STYLE[r.cls].fill} strokeWidth="0.6" strokeLinecap="round" />
      })
    }
    if (r.cls === 'loose') {
      return [1, -1].map((s) => (
        <path key={`${region}${s}`} d={`M${s * (half - 3)},${y - 7} C${s * (half - 5)},${y - 2} ${s * (half - 2)},${y + 3} ${s * (half - 4)},${y + 8}`} stroke={crease} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      ))
    }
    return []
  })

  const hemBelowHip = hemY - hipY
  const left = -Math.max(sleeveEnd[0] + open + 4, bw.hip + 4, 36)
  const width = LABEL_X + 40 - left

  return (
    <svg viewBox={`${left} -4 ${width} ${H + 8}`} className="h-full w-full" role="img" aria-label={`${product.name} size ${sizeResult?.size} on your measurements`}>
      {/* mannequin */}
      <g fill={MANNEQUIN}>
        <ellipse cx="0" cy={P.headRy} rx={P.headRx} ry={P.headRy} />
        {legs.map((d, i) => <path key={i} d={d} />)}
        <path d={torsoPath} />
        {arms.map((a, i) => (
          <g key={i}>
            {a.d.map((d) => <path key={d} d={d} />)}
            <circle cx={a.wr[0]} cy={a.wr[1] + 3} r={0.026 * H} />
          </g>
        ))}
        <ellipse cx={-bw.hip * 0.14} cy={H - 1.5} rx="5" ry="1.8" />
        <ellipse cx={bw.hip * 0.14} cy={H - 1.5} rx="5" ry="1.8" />
      </g>

      {/* hip line reference */}
      <line x1={left + 2} x2={LABEL_X - 2} y1={hipY} y2={hipY} stroke="#7c7973" strokeWidth="0.3" strokeDasharray="1.5 1.5" />

      {/* tee */}
      <path d={tee} fill={color.hex} stroke={dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.25)'} strokeWidth="0.4" strokeLinejoin="round" />
      <path d={`M${-collar},${P.hps} Q0,${P.hps + 0.03 * H} ${collar},${P.hps}`} stroke={crease} strokeWidth="1.4" fill="none" />
      <circle cx="0" cy={rowY.chest + 1} r={0.028 * H} fill="#ff4a1c" />
      {cues}

      {/* labels */}
      {Object.entries(rowY).map(([region, y]) => {
        const r = regions[region]
        const c = r ? CLASS_STYLE[r.cls].fill : '#7c7973'
        return (
          <g key={region}>
            <line x1={widthAt(y) / 2 + 1} x2={LABEL_X - 1.5} y1={y} y2={y} stroke={c} strokeWidth="0.3" strokeDasharray="1 1.2" />
            <text x={LABEL_X} y={y - 1.4} fontSize="2.4" fill="#7c7973" letterSpacing="0.3">
              {region.toUpperCase()}
            </text>
            <text x={LABEL_X} y={y + 2.4} fontSize="3.4" fill={c}>
              {r ? `${r.ease >= 0 ? '+' : ''}${fmtCm(r.ease)} · ${r.cls}` : 'no data'}
            </text>
          </g>
        )
      })}
      <text x={LABEL_X} y={hemY + 1} fontSize="2.4" fill="#7c7973" letterSpacing="0.3">
        HEM
      </text>
      <text x={LABEL_X} y={hemY + 4.8} fontSize="3.4" fill="#e6e2d8">
        {hemBelowHip >= 0 ? `${fmtCm(hemBelowHip)} below hip` : `${fmtCm(-hemBelowHip)} above hip`}
      </text>
    </svg>
  )
}
