import { fmtCm, intendedBand, THRESHOLDS } from '../../lib/fit'
import { inr } from '../../lib/format'
import { Icon } from './ShopChrome'

function fitNote(chart) {
  if (chart.kind === 'body') return 'Fitted cut, sized to body measurements. Stretch rib hugs the body.'
  if (chart.designEase > 0) {
    const [lo, hi] = intendedBand(chart.designEase)
    return `Oversized cut with dropped shoulders, built for ${fmtCm(lo)}–${fmtCm(hi)}cm of room. Take your usual size for the drape; size down for a closer fit.`
  }
  return `Regular cut with ${fmtCm(THRESHOLDS.tight)}–${fmtCm(THRESHOLDS['in range'])}cm of room at the chest.`
}

function Accordion({ title, children, defaultOpen = false }) {
  return (
    <details className="group border-b border-slate-800" open={defaultOpen}>
      <summary className="flex cursor-pointer items-center justify-between py-4 text-sm font-medium text-slate-200">
        {title}
        <span className="text-lg text-slate-500 transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="pb-5 text-sm leading-relaxed text-slate-400">{children}</div>
    </details>
  )
}

export default function BuyBox({
  product,
  color,
  onColor,
  chart,
  selectedSize,
  onSize,
  fit, // computeFit result, only once the shopper saved a fit profile
  onFindSize,
  onAdd,
  sizeHint,
}) {
  const off = Math.round((1 - product.price / product.mrp) * 100)
  const sizes = chart.rows.map((r) => String(r.size).trim()).filter(Boolean)
  const measured = ['chest', 'hip', 'length'].filter((k) => chart.rows.some((r) => r[k] !== '' && r[k] != null))

  return (
    <div className="lg:py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
        {product.drop} · {product.jp}
      </p>
      <h1 className="mt-3 font-display text-5xl leading-[0.95] text-slate-50 uppercase sm:text-6xl">{product.name}</h1>
      <p className="mt-3 text-slate-400">
        {product.type} · {product.material.split(',')[1]?.trim() ?? product.material}
      </p>

      <div className="mt-6 flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-slate-50">{inr(product.price)}</span>
        <span className="text-slate-500 line-through">{inr(product.mrp)}</span>
        <span className="text-sm font-semibold text-orange-500">{off}% OFF</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">Inclusive of all taxes</p>

      {/* Colour */}
      <div className="mt-8">
        <p className="text-sm text-slate-400">
          Colour <span className="text-slate-200">— {color.name}</span>
        </p>
        <div className="mt-3 flex gap-3">
          {product.colors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onColor(c.id)}
              className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-slate-950 transition ${
                c.id === color.id ? 'ring-2 ring-orange-500' : 'ring-1 ring-slate-700 hover:ring-slate-500'
              }`}
              style={{ background: c.hex }}
              aria-label={c.name}
              aria-pressed={c.id === color.id}
            />
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-slate-400">
            Size {selectedSize && <span className="text-slate-200">— {selectedSize}</span>}
          </p>
          <button type="button" onClick={onFindSize} className="inline-flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300">
            <Icon name="ruler" className="h-4 w-4" />
            {fit ? 'Edit fit profile' : 'Find my size'}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {sizes.map((s) => {
            const recommended = fit?.recommended === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSize(s)}
                className={`relative rounded-lg py-3 text-sm font-semibold transition ${
                  selectedSize === s
                    ? 'bg-slate-50 text-slate-950'
                    : 'text-slate-200 ring-1 ring-slate-700 hover:ring-slate-400'
                }`}
                aria-pressed={selectedSize === s}
              >
                {s}
                {recommended && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-sm bg-orange-500 px-1.5 text-[9px] leading-4 font-bold tracking-wider whitespace-nowrap text-slate-950">
                    YOUR FIT
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {sizeHint && <p className="mt-2 text-xs text-orange-400">{sizeHint}</p>}

        {/* Fit strip */}
        {fit?.recommended ? (
          <div className="mt-5 rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Fitline · based on your profile</p>
            <p className="mt-1.5 text-slate-100">
              Your size is <span className="font-display text-orange-500">{fit.recommended}</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">{fit.reason.split(' — ')[1] ?? fit.reason}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onFindSize}
            className="mt-5 flex w-full items-center gap-4 rounded-xl bg-slate-900 p-4 text-left ring-1 ring-slate-800 transition hover:ring-orange-500/60"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-500/15 text-orange-400">
              <Icon name="ruler" />
            </span>
            <span>
              <span className="block text-sm font-medium text-slate-100">Not sure about your size?</span>
              <span className="block text-xs text-slate-400">Photo, camera or tape measure. 30 seconds, stays on your device.</span>
            </span>
            <span className="ml-auto text-orange-400">→</span>
          </button>
        )}
      </div>

      {/* Buy */}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 rounded-full bg-orange-500 py-4 font-display text-sm tracking-wider text-slate-950 uppercase transition-colors hover:bg-orange-400"
        >
          Add to bag
        </button>
        <button type="button" className="grid w-14 place-items-center rounded-full text-slate-300 ring-1 ring-slate-700 hover:text-orange-400" aria-label="Save to wishlist">
          <Icon name="heart" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-slate-400">
        {[
          ['truck', 'Free shipping over ₹999'],
          ['swap', '7-day size exchange'],
          ['shield', 'Cash on delivery'],
        ].map(([icon, label]) => (
          <div key={label} className="flex items-center gap-2">
            <Icon name={icon} className="h-4 w-4 shrink-0 text-slate-500" />
            {label}
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-slate-800">
        <Accordion title="Fit" defaultOpen>
          {fitNote(chart)}
        </Accordion>
        <Accordion title="Size chart (garment, cm)">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-1.5 text-left font-medium">Size</th>
                {measured.map((k) => (
                  <th key={k} className="py-1.5 text-right font-medium capitalize">
                    {k === 'hip' && chart.designEase > 0 ? 'Hem' : k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {chart.rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-800">
                  <td className="py-1.5 font-medium text-slate-200">{r.size}</td>
                  {measured.map((k) => (
                    <td key={k} className="py-1.5 text-right">
                      {r[k] === '' || r[k] == null ? '—' : r[k]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {chart.kind === 'body' && <p className="mt-2 text-xs text-slate-500">This chart lists body measurements.</p>}
        </Accordion>
        <Accordion title="Fabric & print">
          {product.material}. {product.print}.
        </Accordion>
        <Accordion title="Wash care">Cold wash inside out. Do not iron on print. Dry in shade.</Accordion>
      </div>
    </div>
  )
}
