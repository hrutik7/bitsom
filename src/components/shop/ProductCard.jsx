import { inr } from '../../lib/format'
import TeeArt from './TeeArt'

export default function ProductCard({ product, yourSize, onOpen }) {
  const color = product.colors[0]
  return (
    <button type="button" onClick={onOpen} className="group text-left">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-slate-800 ring-1 ring-slate-800 transition group-hover:ring-slate-600">
        <TeeArt product={product} color={color} view="front" className="absolute inset-0 m-auto h-[82%] w-[82%] transition-opacity duration-300 group-hover:opacity-0" />
        <TeeArt product={product} color={color} view="back" className="absolute inset-0 m-auto h-[82%] w-[82%] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {yourSize && (
          <span className="absolute top-3 left-3 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-950">
            YOUR SIZE · {yourSize}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-sm tracking-wide text-slate-100 uppercase">{product.name}</p>
      <p className="text-xs text-slate-500">{product.type}</p>
      <p className="mt-1 text-sm">
        <span className="font-semibold text-slate-100">{inr(product.price)}</span>{' '}
        <span className="text-xs text-slate-500 line-through">{inr(product.mrp)}</span>
      </p>
    </button>
  )
}
