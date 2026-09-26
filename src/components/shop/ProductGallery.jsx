import FitPreview from './FitPreview'
import { Icon } from './ShopChrome'
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

/**
 * @param onYou null until the shopper has a fit profile; then
 *              { preview: FitPreview props, sizes, selectedSize, recommended, onSize }
 */
export default function ProductGallery({ product, color, view, onView, onYou, onFindSize, onTryOn }) {
  const showOnYou = view === 'onyou' && onYou
  const tryOn = (
    <button
      type="button"
      onClick={onTryOn}
      className={`absolute right-4 z-10 inline-flex items-center gap-2 rounded-full bg-slate-950/80 px-4 py-2.5 text-xs font-semibold text-slate-50 ring-1 ring-slate-700 backdrop-blur transition hover:ring-orange-500 ${
        showOnYou ? 'top-4' : 'bottom-4'
      }`}
    >
      <Icon name="camera" className="h-4 w-4 text-orange-500" />
      Try on live
    </button>
  )

  return (
    <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-800">
        <SpeedLines />
        {tryOn}
        {showOnYou ? (
          <>
            <div className="absolute top-5 left-5 z-10">
              <p className="font-display text-sm text-slate-50">Size {onYou.preview.sizeResult?.size} on you</p>
              <p className="text-[11px] text-slate-400">Drawn to scale from your measurements</p>
            </div>
            <div className="absolute inset-x-4 top-16 bottom-20">
              <FitPreview {...onYou.preview} />
            </div>
            <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
              {onYou.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onYou.onSize(s)}
                  className={`relative h-10 min-w-10 rounded-full px-3 text-xs font-semibold transition ${
                    s === onYou.selectedSize ? 'bg-slate-50 text-slate-950' : 'bg-slate-950/70 text-slate-200 hover:bg-slate-900'
                  }`}
                  aria-pressed={s === onYou.selectedSize}
                >
                  {s}
                  {s === onYou.recommended && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-slate-800" />}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
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
            <TeeArt product={product} color={color} view={view === 'onyou' ? 'front' : view} className="absolute inset-0 m-auto h-[84%] w-[84%]" />
          </>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {VIEWS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            className={`relative aspect-square overflow-hidden rounded-xl bg-slate-800 transition ${
              view === v ? 'ring-2 ring-orange-500' : 'ring-1 ring-slate-800 hover:ring-slate-600'
            }`}
            aria-label={label}
            aria-pressed={view === v}
          >
            <TeeArt product={product} color={color} view={v} className="absolute inset-0 m-auto h-[80%] w-[80%]" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => (onYou ? onView('onyou') : onFindSize())}
          className={`relative aspect-square overflow-hidden rounded-xl bg-slate-800 transition ${
            showOnYou ? 'ring-2 ring-orange-500' : 'ring-1 ring-slate-800 hover:ring-slate-600'
          }`}
          aria-label={onYou ? 'On you' : 'Find your size to see it on you'}
          aria-pressed={Boolean(showOnYou)}
        >
          {onYou ? (
            <div className="absolute inset-1.5">
              <FitPreview {...onYou.preview} />
            </div>
          ) : (
            <span className="absolute inset-0 grid place-items-center px-2 text-center text-[11px] leading-tight text-slate-400">
              <span>
                <span className="block font-display text-sm text-orange-500">On you</span>
                find your size
              </span>
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
