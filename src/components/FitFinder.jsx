import { useEffect, useState } from 'react'
import { MEASURES } from '../hooks/useBodyInputs'
import { CLASS_STYLE } from '../lib/classes'
import { fmtCm, intendedBand, STRETCH, THRESHOLDS } from '../lib/fit'
import { looksBoxy, WORN_EASE, WORN_LABELS } from '../lib/worn'
import BodyFigure from './BodyFigure'
import EaseTable from './EaseTable'
import PhotoInput from './PhotoInput'
import SizeChartEditor from './SizeChartEditor'
import { NumberField, Section, Segmented, Select } from './ui'

const FABRIC_LABELS = { cotton: 'Cotton', 'cotton-elastane': 'Cotton–elastane', jersey: 'Jersey' }

/**
 * The size finder drawer: body inputs on the left, the fit for this product on the right.
 * Stays mounted while closed so a photo survives reopening; the camera is paused instead.
 */
export default function FitFinder({
  open,
  onClose,
  product,
  inputs,
  chart,
  chartEdited,
  onChartRows,
  onChartKind,
  onResetChart,
  fabric,
  onFabric,
  result,
  onApply,
}) {
  const [preview, setPreview] = useState({ result: null, index: null })

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const selectedIndex =
    result && preview.result === result ? preview.index : result?.recommendedIndex ?? null
  const selected = result && selectedIndex != null ? result.sizes[selectedIndex] : null
  const { source, setSource, manual, setManual, heightCm, setHeightCm, photoEstimate, onEstimate, worn, setWorn, photoFields, editPhotoField } =
    inputs

  return (
    <div
      className={`fixed inset-0 z-50 transition ${open ? 'visible' : 'invisible'}`}
      inert={!open}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-label="Find your size"
        className={`absolute inset-y-0 right-0 flex w-full max-w-[1120px] flex-col bg-slate-950 ring-1 ring-slate-800 transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4 lg:px-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500">サイズ診断 · Fitline</p>
            <h2 className="font-display text-xl text-slate-50">
              Find your size <span className="text-slate-500">— {product.name}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full text-2xl text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-12 px-6 py-8 lg:grid-cols-[360px_1fr] lg:px-8">
            {/* Inputs */}
            <div className="space-y-10">
              <Section title="Your body">
                <Segmented
                  value={source}
                  onChange={setSource}
                  options={[
                    { value: 'manual', label: 'Tape measure' },
                    { value: 'photo', label: 'Photo / camera' },
                  ]}
                />
                {source === 'manual' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <NumberField label="Height" value={heightCm} onChange={setHeightCm} />
                    </div>
                    {MEASURES.map(([k, label]) => (
                      <NumberField
                        key={k}
                        label={label}
                        value={manual[k]}
                        onChange={(v) => setManual((m) => ({ ...m, [k]: v }))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <NumberField label="Your height" value={heightCm} onChange={setHeightCm} />
                    <PhotoInput heightCm={heightCm} onEstimate={onEstimate} active={open} />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-400">Wearing in photo</span>
                        <Segmented
                          value={worn}
                          onChange={setWorn}
                          options={Object.keys(WORN_EASE).map((k) => ({ value: k, label: WORN_LABELS[k] }))}
                        />
                      </div>
                      <p className="text-xs leading-relaxed text-slate-500">
                        The photo sees clothes, not skin. Subtracting {WORN_EASE[worn].chest} / {WORN_EASE[worn].waist} /{' '}
                        {WORN_EASE[worn].hip} cm (chest / waist / hip) for a {WORN_LABELS[worn].toLowerCase()} top.
                      </p>
                      {photoEstimate && looksBoxy(photoEstimate) && worn !== 'oversized' && (
                        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-amber-500/30">
                          Your waist reads clearly wider than your chest. That usually means a loose top hanging straight
                          down, or arms against your sides. Pick Oversized, or retake with arms away from your body.
                        </p>
                      )}
                    </div>
                    {photoFields && (
                      <div className="grid grid-cols-2 gap-4">
                        {MEASURES.map(([k, label]) => {
                          const f = photoFields[k]
                          return (
                            <NumberField
                              key={k}
                              label={label}
                              value={f.value}
                              onChange={(v) => editPhotoField(k, v)}
                              hint={f.edited ? 'edited' : `est. ±${f.pm}`}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Section>

              <details className="group rounded-lg ring-1 ring-slate-800">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm text-slate-300">
                  <span>
                    Product data <span className="text-slate-500">· chart, fabric</span>
                    {chartEdited && <span className="ml-2 text-xs text-orange-400">edited</span>}
                  </span>
                  <span className="text-slate-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="space-y-5 border-t border-slate-800 px-4 py-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-slate-400">Fabric</span>
                    <Select
                      value={fabric}
                      onChange={onFabric}
                      options={Object.keys(STRETCH).map((k) => ({
                        value: k,
                        label: `${FABRIC_LABELS[k] ?? k}  ·  ×${STRETCH[k].toFixed(2)} stretch`,
                      }))}
                    />
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Chart lists</span>
                    <Segmented
                      value={chart.kind}
                      onChange={onChartKind}
                      options={[
                        { value: 'garment', label: 'Garment' },
                        { value: 'body', label: 'Body' },
                      ]}
                    />
                  </div>
                  <SizeChartEditor rows={chart.rows} onChange={onChartRows} />
                  <p className="text-xs leading-relaxed text-slate-500">
                    {chart.kind === 'garment'
                      ? 'Garment circumferences (flat width × 2), cm.'
                      : 'The body each size is cut for; the brand’s ease is already inside, cm.'}
                    {chart.kind === 'garment' && chart.designEase > 0 &&
                      ` Cut declares +${fmtCm(chart.designEase)}cm design ease (oversized).`}
                  </p>
                  {chartEdited && (
                    <button type="button" onClick={onResetChart} className="text-xs text-slate-400 hover:text-orange-400">
                      Reset to product data
                    </button>
                  )}
                </div>
              </details>
            </div>

            {/* Result */}
            <div className="min-w-0">
              {!result ? (
                <EmptyState
                  text={
                    source === 'photo'
                      ? 'Upload a photo or use the camera to estimate your measurements.'
                      : 'Add your measurements to see your size.'
                  }
                />
              ) : result.recommended == null ? (
                <EmptyState text="No size has both a chart value and a body measurement for any region." />
              ) : (
                <div className="space-y-10">
                  <div className="grid items-center gap-8 md:grid-cols-[1fr_minmax(0,380px)]">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Your size in {product.name}</p>
                      <p className="mt-2 font-display text-[7rem] leading-none text-orange-500">{result.recommended}</p>
                      <p className="mt-6 max-w-sm text-lg leading-snug text-slate-200">{result.reason}</p>
                      {result.notes.map((n) => (
                        <p key={n} className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                          {n}
                        </p>
                      ))}
                      <Legend designEase={result.designEase} />
                    </div>
                    <div>
                      <BodyFigure
                        sizeResult={selected}
                        drivingRegion={selectedIndex === result.recommendedIndex ? result.drivingRegion : null}
                      />
                      <p className="mt-2 text-center text-xs text-slate-500">
                        {selectedIndex === result.recommendedIndex
                          ? `Showing ${selected.size}, the recommendation`
                          : `Previewing ${selected.size || '—'}`}
                      </p>
                    </div>
                  </div>
                  <Section title="Room by size and region">
                    <EaseTable result={result} selectedIndex={selectedIndex} onSelect={(index) => setPreview({ result, index })} />
                  </Section>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-slate-800 bg-slate-950 px-6 py-4 lg:px-8">
          <p className="hidden text-xs text-slate-500 sm:block">Runs on your device. Photos never leave your browser.</p>
          <button
            type="button"
            disabled={!result?.recommended}
            onClick={() => onApply(result.recommended)}
            className="ml-auto rounded-full bg-orange-500 px-7 py-3 font-display text-sm uppercase tracking-wider text-slate-950 transition-colors hover:bg-orange-400 disabled:opacity-40"
          >
            {result?.recommended ? `Select size ${result.recommended}` : 'Select size'}
          </button>
        </footer>
      </aside>
    </div>
  )
}

function Legend({ designEase = 0 }) {
  const t = THRESHOLDS
  const [, hi] = intendedBand(designEase)
  const entries = [
    ['strain', `≤ ${fmtCm(t.strain + designEase)}`],
    ['tight', `≤ ${fmtCm(t.tight + designEase)}`],
    ['in range', `≤ ${fmtCm(hi)}`],
    ['loose', `> ${fmtCm(hi)}`],
  ]
  return (
    <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
      {entries.map(([cls, range]) => (
        <span key={cls} className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${CLASS_STYLE[cls].dot}`} />
          {cls} <span className="text-slate-600">{range} cm</span>
        </span>
      ))}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-800 px-6 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}
