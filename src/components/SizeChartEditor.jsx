const FIELDS = ['chest', 'waist', 'hip', 'length']

export default function SizeChartEditor({ rows, onChange }) {
  const update = (i, field, value) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)))
  const remove = (i) => onChange(rows.filter((_, j) => j !== i))
  const add = () => onChange([...rows, { size: '', chest: '', waist: '', hip: '', length: '' }])

  const cell =
    'w-full rounded-md bg-transparent px-2 py-1.5 tabular-nums text-slate-100 outline-none hover:bg-slate-800/60 focus:bg-slate-800 focus:ring-1 focus:ring-orange-500'

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 text-xs text-slate-500">
          <tr>
            <th className="px-2 py-2 text-left font-medium">Size</th>
            {FIELDS.map((f) => (
              <th key={f} className="px-2 py-2 text-right font-medium capitalize">
                {f}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="px-1 py-0.5">
                <input
                  value={r.size}
                  onChange={(e) => update(i, 'size', e.target.value)}
                  className={`${cell} text-left font-medium`}
                />
              </td>
              {FIELDS.map((f) => (
                <td key={f} className="px-1 py-0.5">
                  <input
                    type="number"
                    value={r[f]}
                    onChange={(e) => update(i, f, e.target.value)}
                    className={`${cell} text-right`}
                  />
                </td>
              ))}
              <td className="pr-1 text-center">
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-slate-600 hover:text-red-400"
                  aria-label={`Remove size ${r.size}`}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={add}
        className="w-full border-t border-slate-800 py-2 text-sm text-slate-500 hover:bg-slate-900 hover:text-orange-400"
      >
        + Add size
      </button>
    </div>
  )
}
