import { useId } from 'react'
import { cutOf } from '../../lib/products'

// Original tee mockups and prints, drawn in SVG so the shop needs no image assets.
const ACCENT = '#ff4a1c'
const PAPER = '#f1eee7'
const SUMI = '#151517'

// Garment outlines in a 400×460 box. Front necklines dip; backs sit high.
const OUTLINES = {
  oversized: (back) =>
    `M150,34 Q200,${back ? 48 : 80} 250,34 L336,62 C356,70 372,110 388,168 L330,196 C326,180 322,168 316,158 L318,424 C250,432 150,432 82,424 L84,158 C78,168 74,180 70,196 L12,168 C28,110 44,70 64,62 Z`,
  regular: (back) =>
    `M160,40 Q200,${back ? 52 : 82} 240,40 L310,60 C328,70 342,104 354,150 L312,172 C306,160 300,150 296,140 L298,420 C240,428 160,428 102,420 L104,140 C100,150 94,160 88,172 L46,150 C58,104 72,70 90,60 Z`,
  fitted: (back) =>
    `M166,46 Q200,${back ? 56 : 84} 234,46 L292,62 C306,72 318,98 328,128 L298,144 C294,136 290,130 286,124 C284,190 276,240 290,300 C292,330 294,356 294,382 C240,390 160,390 106,382 C106,356 108,330 110,300 C124,240 116,190 114,124 C110,130 106,136 102,144 L72,128 C82,98 94,72 108,62 Z`,
}
const NECKS = {
  oversized: (back) => `M150,34 Q200,${back ? 48 : 80} 250,34`,
  regular: (back) => `M160,40 Q200,${back ? 52 : 82} 240,40`,
  fitted: (back) => `M166,46 Q200,${back ? 56 : 84} 234,46`,
}
const FOLDS = {
  oversized: ['M96,170 C110,200 104,240 110,300', 'M304,170 C290,200 296,240 290,300', 'M150,420 C160,380 150,340 158,300'],
  regular: ['M114,150 C124,190 118,240 124,300', 'M286,150 C276,190 282,240 276,300'],
  fitted: ['M124,140 C132,180 126,210 130,250', 'M276,140 C268,180 274,210 270,250'],
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function Vertical({ text, x, y, size, fill }) {
  return [...text].map((ch, i) => (
    <text key={i} x={x} y={y + i * size * 1.05} fontSize={size} fill={fill} textAnchor="middle" fontFamily="var(--font-display)">
      {ch}
    </text>
  ))
}

const PRINTS = {
  ronin: ({ ink, shirt, back }) =>
    back ? (
      <g>
        <circle cx="200" cy="190" r="92" fill={ACCENT} />
        {[150, 172, 194, 216].map((y) => (
          <rect key={y} x="100" y={y} width="200" height="7" fill={shirt} />
        ))}
        <path d="M104,262 L150,206 L178,232 L214,176 L258,236 L276,218 L300,262 Z" fill={ink} />
        <line x1="120" y1="300" x2="290" y2="110" stroke={ink} strokeWidth="5" strokeLinecap="round" />
        <rect x="143" y="266" width="18" height="6" fill={ink} transform="rotate(-48 152 269)" />
        <Vertical text="真夜中の浪人" x={322} y={112} size={20} fill={ink} />
        <text x="200" y="320" fontSize="17" fill={ink} textAnchor="middle" fontFamily="var(--font-display)" letterSpacing="3">
          MIDNIGHT RONIN
        </text>
        <text x="200" y="340" fontSize="9" fill={ACCENT} textAnchor="middle" letterSpacing="4">
          SENPAI SUPPLY · DROP 04
        </text>
      </g>
    ) : (
      <g>
        <circle cx="200" cy="168" r="44" fill={ACCENT} />
        {[152, 166, 180].map((y) => (
          <rect key={y} x="150" y={y} width="100" height="5" fill={shirt} />
        ))}
        <line x1="150" y1="226" x2="252" y2="118" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        <Vertical text="浪人" x={266} y={150} size={16} fill={ink} />
        <text x="200" y="244" fontSize="12" fill={ink} textAnchor="middle" fontFamily="var(--font-display)" letterSpacing="2.5">
          MIDNIGHT RONIN
        </text>
      </g>
    ),
  kaiju: ({ ink, back, dots }) => {
    const spikes = 'M118,236 L140,196 L152,222 L170,176 L186,214 L204,164 L220,212 L238,180 L252,220 L270,198 L284,236 Z'
    return back ? (
      <g>
        <circle cx="200" cy="200" r="96" fill={`url(#${dots})`} />
        <path d={spikes} fill={ink} transform="translate(-20 40) scale(1.1)" />
        <text x="200" y="150" fontSize="44" fill={ink} textAnchor="middle" fontFamily="var(--font-display)">
          KAIJU
        </text>
        <text x="200" y="196" fontSize="44" fill={ACCENT} textAnchor="middle" fontFamily="var(--font-display)">
          CLUB
        </text>
        <text x="200" y="330" fontSize="22" fill={ink} textAnchor="middle" fontFamily="var(--font-display)" letterSpacing="6">
          怪獣クラブ
        </text>
      </g>
    ) : (
      <g>
        <circle cx="200" cy="176" r="52" fill={`url(#${dots})`} />
        <path d={spikes} fill={ink} transform="translate(80 70) scale(0.6)" />
        <text x="200" y="252" fontSize="14" fill={ink} textAnchor="middle" fontFamily="var(--font-display)" letterSpacing="3">
          怪獣クラブ
        </text>
      </g>
    )
  },
  neko: ({ ink, back }) =>
    back ? (
      <g>
        <text x="200" y="96" fontSize="11" fill={ink} textAnchor="middle" fontFamily="var(--font-display)" letterSpacing="3">
          ねこラーメン · EST. 2024
        </text>
      </g>
    ) : (
      <g>
        {[176, 200, 224].map((x) => (
          <path key={x} d={`M${x},132 C${x - 8},120 ${x + 8},112 ${x},100`} stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        ))}
        <path d="M172,168 L178,140 L192,158 Z M228,168 L222,140 L208,158 Z" fill={ink} />
        <circle cx="200" cy="170" r="26" fill={ink} />
        <circle cx="191" cy="168" r="3" fill={ACCENT} />
        <circle cx="209" cy="168" r="3" fill={ACCENT} />
        <path d="M140,180 L260,180 C260,220 236,244 200,244 C164,244 140,220 140,180 Z" fill={ACCENT} />
        <path d="M152,192 L248,192" stroke={ink} strokeWidth="3" />
        <text x="200" y="272" fontSize="14" fill={ink} textAnchor="middle" fontFamily="var(--font-display)" letterSpacing="2">
          ねこラーメン
        </text>
      </g>
    ),
  sakura: ({ ink, back }) => {
    const flower = (cx, cy, r, key) => (
      <g key={key}>
        {[0, 72, 144, 216, 288].map((a) => (
          <circle
            key={a}
            cx={cx + Math.cos(((a - 90) * Math.PI) / 180) * r}
            cy={cy + Math.sin(((a - 90) * Math.PI) / 180) * r}
            r={r * 0.72}
            fill={ACCENT}
          />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.4} fill={ink} />
      </g>
    )
    return back ? (
      <g>
        <text x="200" y="100" fontSize="11" fill={ink} textAnchor="middle" fontFamily="var(--font-display)" letterSpacing="3">
          桜ノイズ
        </text>
      </g>
    ) : (
      <g>
        {flower(186, 168, 18, 'a')}
        {flower(226, 196, 11, 'b')}
        {flower(166, 208, 8, 'c')}
        {[150, 162, 238].map((y, i) => (
          <rect key={y} x={140 + i * 12} y={y} width={60 + i * 18} height="3" fill={ink} opacity="0.8" />
        ))}
        <text x="200" y="258" fontSize="16" fill={ink} textAnchor="middle" fontFamily="var(--font-display)" letterSpacing="3">
          桜ノイズ
        </text>
      </g>
    )
  },
}

/**
 * @param product from products.json
 * @param color   one of product.colors
 * @param view    'front' | 'back' | 'detail' (zoom on the front print)
 * @param printOnly just the front print on a transparent background (a 3D texture)
 */
export default function TeeArt({ product, color, view = 'front', className = '', printOnly = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const cut = cutOf(product)
  const back = view === 'back'
  const dark = luminance(color.hex) < 0.4
  const ink = dark ? PAPER : SUMI
  const shade = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'
  const Print = PRINTS[product.art]
  const dots = `dots-${uid}`
  const clip = `clip-${uid}`

  if (printOnly) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="110 84 180 190" width="540" height="570">
        <defs>
          <pattern id={dots} width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2.2" fill={ACCENT} />
          </pattern>
        </defs>
        {Print && <Print ink={ink} shirt={color.hex} back={false} dots={dots} />}
      </svg>
    )
  }

  return (
    <svg
      viewBox={view === 'detail' ? '110 84 180 190' : '0 0 400 460'}
      className={className}
      role="img"
      aria-label={`${product.name} ${product.type}, ${color.name}, ${view}`}
    >
      <defs>
        <pattern id={dots} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2.2" fill={ACCENT} />
        </pattern>
        <clipPath id={clip}>
          <path d={OUTLINES[cut](back)} />
        </clipPath>
      </defs>
      <path d={OUTLINES[cut](back)} fill={color.hex} />
      <g clipPath={`url(#${clip})`}>
        {FOLDS[cut].map((d) => (
          <path key={d} d={d} stroke={shade} strokeWidth="3" fill="none" strokeLinecap="round" />
        ))}
        {Print && <Print ink={ink} shirt={color.hex} back={back} dots={dots} />}
      </g>
      <path d={NECKS[cut](back)} stroke={shade} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d={OUTLINES[cut](back)} fill="none" stroke={dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'} strokeWidth="1.5" />
    </svg>
  )
}
