import { useMemo, useState } from 'react'
import sizeCharts from './data/sizeCharts.json'
import { computeFit, STRETCH, THRESHOLDS } from './lib/fit'
import { CLASS_STYLE } from './lib/classes'
import BodyFigure from './components/BodyFigure'
import EaseTable from './components/EaseTable'
import SizeChartEditor from './components/SizeChartEditor'
import { NumberField, Section, Segmented, Select } from './components/ui'

const toCm = (v) => (v === '' || v == null ? NaN : Number(v))
const toEditable = (sizes) => sizes.map((s) => ({ ...s }))

const FABRIC_LABELS = { cotton: 'Cotton', 'cotton-elastane': 'Cotton–elastane', jersey: 'Jersey' }

export default function App() {
  const [source, setSource] = useState('manual')
  const [manual, setManual] = useState({ chest: '96', waist: '88', hip: '98', torsoLength: '52' })
  const [heightCm, setHeightCm] = useState('175')
  const [fabric, setFabric] = useState('cotton')
  const [chartId, setChartId] = useState(sizeCharts[0].id)
  const [chartKind, setChartKind] = useState(sizeCharts[0].kind)
  const [chartRows, setChartRows] = useState(() => toEditable(sizeCharts[0].sizes))
  const [preview, setPreview] = useState({ result: null, index: null })

  const loadChart = (id) => {
    const c = sizeCharts.find((x) => x.id === id)
    setChartId(id)
    setChartKind(c.kind)
    setChartRows(toEditable(c.sizes))
  }

  // Vision path plugs in here; until then only manual measurements produce a body.
  const body = useMemo(() => {
    if (source !== 'manual') return null
    return Object.fromEntries(Object.entries(manual).map(([k, v]) => [k, { cm: toCm(v), pm: 0 }]))
  }, [source, manual])

  const result = useMemo(() => {
    if (!body) return null
    const sizes = chartRows
      .filter((r) => String(r.size).trim() !== '')
      .map((r) => ({
        size: String(r.size).trim(),
        chest: toCm(r.chest),
        waist: toCm(r.waist),
        hip: toCm(r.hip),
        length: toCm(r.length),
      }))
    return computeFit({ body, chart: { kind: chartKind, sizes }, fabric })
  }, [body, chartRows, chartKind, fabric])

  const selectedIndex =
    result && preview.result === result ? preview.index : result?.recommendedIndex ?? null
  const selected = result && selectedIndex != null ? result.sizes[selectedIndex] : null

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
      <header className="mb-12 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span className="h-2.5 w-2.5 translate-y-[-2px] rounded-full bg-orange-500" />
          <h1 className="text-xl font-semibold tracking-tight text-white">Fitline</h1>
          <span className="hidden text-sm text-slate-500 sm:inline">
            body × size chart × fabric → the size that fits
          </span>
        </div>
        <span className="text-xs text-slate-600">runs entirely on-device</span>
      </header>

      <div className="grid gap-14 lg:grid-cols-[400px_1fr]">
        {/* Inputs */}
        <aside className="space-y-10">
          <Section title="Body">
            <Segmented
              value={source}
              onChange={setSource}
              options={[
                { value: 'manual', label: 'Manual measurements' },
                { value: 'photo', label: 'From photo' },
              ]}
            />
            {source === 'manual' ? (
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Chest" value={manual.chest} onChange={(v) => setManual({ ...manual, chest: v })} />
                <NumberField label="Waist" value={manual.waist} onChange={(v) => setManual({ ...manual, waist: v })} />
                <NumberField label="Hip" value={manual.hip} onChange={(v) => setManual({ ...manual, hip: v })} />
                <NumberField
                  label="Torso length"
                  value={manual.torsoLength}
                  onChange={(v) => setManual({ ...manual, torsoLength: v })}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <NumberField label="Your height" value={heightCm} onChange={setHeightCm} />
                <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
                  Photo estimation is not wired up yet.
                  <br />
                  Use manual measurements for now.
                </div>
              </div>
            )}
          </Section>

          <Section title="Fabric">
            <Select
              value={fabric}
              onChange={setFabric}
              options={Object.keys(STRETCH).map((k) => ({
                value: k,
                label: `${FABRIC_LABELS[k] ?? k}  ·  ×${STRETCH[k].toFixed(2)} stretch`,
              }))}
            />
          </Section>

          <Section
            title="Size chart"
            aside={
              <Segmented
                value={chartKind}
                onChange={setChartKind}
                options={[
                  { value: 'garment', label: 'Garment' },
                  { value: 'body', label: 'Body' },
                ]}
              />
            }
          >
            <Select
              value={chartId}
              onChange={loadChart}
              options={sizeCharts.map((c) => ({ value: c.id, label: c.name }))}
            />
            <SizeChartEditor rows={chartRows} onChange={setChartRows} />
            <p className="text-xs leading-relaxed text-slate-500">
              {chartKind === 'garment'
                ? 'Values are the garment’s own circumferences, flat width × 2.'
                : 'Values are the body each size is cut for; the brand’s ease is already inside them.'}
            </p>
          </Section>
        </aside>

        {/* Result */}
        <main className="min-w-0">
          {!result ? (
            <EmptyState text="Add measurements to see a recommendation." />
          ) : result.recommended == null ? (
            <EmptyState text="No size has both a chart value and a body measurement for any region." />
          ) : (
            <div className="space-y-12">
              <div className="grid items-center gap-10 md:grid-cols-[1fr_minmax(0,420px)]">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Recommended size
                  </p>
                  <p className="mt-2 text-[7rem] leading-none font-semibold tracking-tight text-orange-500">
                    {result.recommended}
                  </p>
                  <p className="mt-6 max-w-sm text-lg leading-snug text-slate-200">{result.reason}</p>
                  {result.notes.map((n) => (
                    <p key={n} className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                      {n}
                    </p>
                  ))}
                  <Legend />
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

              <Section title="Ease by size and region">
                <EaseTable
                  result={result}
                  selectedIndex={selectedIndex}
                  onSelect={(index) => setPreview({ result, index })}
                />
              </Section>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function Legend() {
  const entries = [
    ['strain', `≤ ${THRESHOLDS.strain}`],
    ['tight', `≤ ${THRESHOLDS.tight}`],
    ['in range', `≤ ${THRESHOLDS['in range']}`],
    ['loose', `> ${THRESHOLDS['in range']}`],
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
    <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
      {text}
    </div>
  )
}
