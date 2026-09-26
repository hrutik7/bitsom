import { CLASS_STYLE } from '../lib/classes'
import { fmtCm, REGIONS } from '../lib/fit'
import { smoothPath } from '../lib/svgPath'

const CX = 100
const BAND_Y = { chest: 140, waist: 190, hip: 238 }
const BAND_H = 22
const LABEL_X = 196

// Right-half outline points [dx, y]; mirrored for the left side.
const TORSO = [
  [11, 60], [30, 72], [52, 82], [58, 95], [47, 116], [45, 140],
  [39, 165], [35, 190], [41, 215], [46, 238], [46, 262], [20, 276],
]
const LEG = [
  [46, 258], [42, 320], [33, 385], [30, 412], [10, 412], [9, 340], [4, 278],
]
const ARM = [
  [60, 92], [65, 150], [71, 200], [75, 250], [68, 262], [62, 250], [57, 200], [52, 150], [49, 118],
]

const side = (pts, sign) => pts.map(([dx, y]) => [CX + sign * dx, y])
const torsoPath = smoothPath([...side(TORSO, 1), ...side(TORSO, -1).reverse()])
const legPaths = [smoothPath(side(LEG, 1)), smoothPath(side(LEG, -1))]
const armPaths = [smoothPath(side(ARM, 1)), smoothPath(side(ARM, -1))]

export default function BodyFigure({ sizeResult, drivingRegion }) {
  const byRegion = Object.fromEntries((sizeResult?.regions ?? []).map((r) => [r.region, r]))

  return (
    <svg viewBox="0 0 340 430" className="h-full w-full" role="img" aria-label="Fit by body region">
      <defs>
        <clipPath id="torso-clip">
          <path d={torsoPath} />
        </clipPath>
      </defs>

      <g fill="#28272a" stroke="#5b5955" strokeWidth="1.25">
        <ellipse cx={CX} cy={32} rx={18} ry={22} />
        {legPaths.map((d, i) => <path key={`l${i}`} d={d} />)}
        {armPaths.map((d, i) => <path key={`a${i}`} d={d} />)}
        <path d={torsoPath} />
      </g>

      <g clipPath="url(#torso-clip)">
        {REGIONS.map((region) => {
          const r = byRegion[region]
          if (!r) return null
          return (
            <rect
              key={region}
              x={CX - 70}
              y={BAND_Y[region] - BAND_H / 2}
              width={140}
              height={BAND_H}
              fill={CLASS_STYLE[r.cls].fill}
              opacity={0.85}
            />
          )
        })}
      </g>
      <path d={torsoPath} fill="none" stroke="#5b5955" strokeWidth="1.25" />

      {REGIONS.map((region) => {
        const r = byRegion[region]
        const y = BAND_Y[region]
        const colour = r ? CLASS_STYLE[r.cls].fill : '#5b5955'
        const driving = region === drivingRegion
        return (
          <g key={region}>
            <line x1={CX + 82} y1={y} x2={LABEL_X - 8} y2={y} stroke={colour} strokeWidth="1" strokeDasharray="2 3" />
            <text x={LABEL_X} y={y - 6} fontSize="10" letterSpacing="1.4" fill={driving ? '#ff6b40' : '#7c7973'}>
              {region.toUpperCase()}
              {driving ? ' ·  DRIVER' : ''}
            </text>
            <text x={LABEL_X} y={y + 12} fontSize="15" fill="#e6e2d8" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {r ? (
                <>
                  {r.ease >= 0 ? '+' : ''}
                  {fmtCm(r.ease)}
                  {r.pm > 0 ? ` ±${fmtCm(r.pm)}` : ''} cm
                  <tspan fill={colour} fontSize="12" dx="8">
                    {r.cls}
                  </tspan>
                </>
              ) : (
                <tspan fill="#7c7973">no data</tspan>
              )}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
