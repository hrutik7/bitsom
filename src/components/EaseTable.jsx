import { CLASS_STYLE } from '../lib/classes'
import { fmtCm, REGIONS } from '../lib/fit'

export default function EaseTable({ result, selectedIndex, onSelect }) {
  const { sizes, recommendedIndex, stretch, isBodyChart } = result

  return (
    <div>
      <div className="overflow-hidden rounded-lg ring-1 ring-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Size</th>
              {REGIONS.map((r) => (
                <th key={r} className="px-3 py-2 text-right font-medium capitalize">
                  {r} ease
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">Length vs torso</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((s, i) => {
              const byRegion = Object.fromEntries(s.regions.map((r) => [r.region, r]))
              const selected = i === selectedIndex
              return (
                <tr
                  key={i}
                  onClick={() => onSelect(i)}
                  className={`cursor-pointer border-t border-slate-800 transition-colors ${
                    selected ? 'bg-slate-800/70' : 'hover:bg-slate-900'
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-slate-100">
                    {s.size || '—'}
                    {i === recommendedIndex && (
                      <span className="ml-2 rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-orange-400">
                        pick
                      </span>
                    )}
                  </td>
                  {REGIONS.map((region) => {
                    const r = byRegion[region]
                    if (!r) {
                      return (
                        <td key={region} className="px-3 py-2 text-right text-slate-600">
                          —
                        </td>
                      )
                    }
                    const st = CLASS_STYLE[r.cls]
                    return (
                      <td
                        key={region}
                        className="px-3 py-2 text-right tabular-nums"
                        title={
                          isBodyChart
                            ? `chart ${r.chart} − body ${fmtCm(r.body)} + built-in ease`
                            : `${r.chart} × ${stretch} − ${fmtCm(r.body)} = ${fmtCm(r.ease)}`
                        }
                      >
                        <span className="text-slate-200">{fmtCm(r.ease)}</span>
                        {r.pm > 0 && <span className="text-slate-500"> ±{fmtCm(r.pm)}</span>}
                        <span className={`ml-2 inline-block h-2 w-2 rounded-full ${st.dot} ${r.uncertain ? 'opacity-40' : ''}`} />
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                    {s.lengthDelta == null ? '—' : `${s.lengthDelta >= 0 ? '+' : ''}${fmtCm(s.lengthDelta)}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        {isBodyChart
          ? 'Ease = chart body − your body + the ease a size builds in. '
          : `Ease = chart × ${stretch} stretch − your body. `}
        All values in cm. Hover a cell for the arithmetic; click a row to preview it on the figure.
      </p>
    </div>
  )
}
