export function Section({ title, aside, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-900 p-1 ring-1 ring-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            value === o.value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function NumberField({ label, value, onChange, suffix = 'cm' }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-slate-400">{label}</span>
      <div className="flex items-center rounded-lg bg-slate-900 ring-1 ring-slate-800 focus-within:ring-orange-500">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-2 tabular-nums text-slate-100 outline-none"
        />
        <span className="pr-3 text-sm text-slate-500">{suffix}</span>
      </div>
    </label>
  )
}

export function Select({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-orange-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
