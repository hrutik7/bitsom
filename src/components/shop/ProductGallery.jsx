import { useState } from 'react'
import TeeArt from './TeeArt'

const VIEWS = [
  ['front', 'Front'],
  ['back', 'Back'],
  ['detail', 'Print detail'],
]

// Manga speed lines radiating from the centre.
function SpeedLines() {
  const lines = Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2
    const r0 = 26 + (i % 3) * 5
    return [50 + Math.cos(a) * r0, 50 + Math.sin(a) * r0, 50 + Math.cos(a) * 90, 50 + Math.sin(a) * 90]
  })
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e6e2d8" strokeOpacity="0.06" strokeWidth={i % 2 ? 0.25 : 0.5} />
      ))}
    </svg>
  )
}

export default function ProductGallery({ product, color }) {
  const [view, setView] = useState('front')

  return (
    <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-800">
        <SpeedLines />
        <p
          className="absolute top-6 right-5 font-display text-6xl leading-none text-slate-700/70 select-none"
          style={{ writingMode: 'vertical-rl' }}
          aria-hidden="true"
        >
          {product.jp}
        </p>
        <span className="absolute top-5 left-5 -rotate-3 bg-orange-500 px-3 py-1 font-display text-xs tracking-wider text-slate-950">
          {product.drop.toUpperCase()}
        </span>
        <TeeArt product={product} color={color} view={view} className="absolute inset-0 m-auto h-[84%] w-[84%]" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {VIEWS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`relative aspect-square overflow-hidden rounded-xl bg-slate-800 transition ${
              view === v ? 'ring-2 ring-orange-500' : 'ring-1 ring-slate-800 hover:ring-slate-600'
            }`}
            aria-label={label}
            aria-pressed={view === v}
          >
            <TeeArt product={product} color={color} view={v} className="absolute inset-0 m-auto h-[80%] w-[80%]" />
          </button>
        ))}
      </div>
    </div>
  )
}
