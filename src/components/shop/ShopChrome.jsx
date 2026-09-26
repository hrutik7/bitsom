export function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    bag: 'M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2',
    search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm5-2 4 4',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
    ruler: 'M3 16 16 3l5 5L8 21l-5-5Zm4-1 2 2m1-5 2 2m1-5 2 2',
    truck: 'M3 6h11v10H3V6Zm11 4h4l3 3v3h-7v-6ZM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    swap: 'M4 8h14l-4-4M20 16H6l4 4',
    shield: 'M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z',
    check: 'm5 12 4 4 10-10',
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

export function AnnouncementBar() {
  const items = ['Free shipping above ₹999', 'Drop 04 is live', 'Size yourself with your camera — new', '7-day exchanges']
  return (
    <div className="bg-orange-500 text-slate-950">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-4 overflow-hidden whitespace-nowrap px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
        {items.map((t, i) => (
          <span key={t} className={`items-center gap-4 ${i > 1 ? 'hidden md:inline-flex' : 'inline-flex'}`}>
            {i > 0 && <span aria-hidden="true">✦</span>}
            {t}
          </span>
        ))}
      </p>
    </div>
  )
}

export function ShopHeader({ bagCount, profileSaved, onFit }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 lg:px-10">
        <nav className="hidden gap-7 text-sm text-slate-300 md:flex">
          {['New drops', 'Oversized', 'Tees', 'Hoodies'].map((l, i) => (
            <a key={l} href="#" className={`hover:text-slate-50 ${i === 1 ? 'text-slate-50' : ''}`}>
              {l}
            </a>
          ))}
        </nav>
        <a href="#" className="col-start-2 text-center leading-none">
          <span className="block text-[9px] tracking-[0.5em] text-orange-500">センパイ</span>
          <span className="font-display text-xl tracking-wide text-slate-50">
            SENPAI<span className="text-orange-500">/</span>SUPPLY
          </span>
        </a>
        <div className="col-start-3 flex items-center justify-end gap-2">
          <button type="button" className="hidden h-10 w-10 place-items-center rounded-full text-slate-300 hover:bg-slate-900 sm:grid" aria-label="Search">
            <Icon name="search" />
          </button>
          <button
            type="button"
            onClick={onFit}
            className={`hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ring-1 transition-colors sm:inline-flex ${
              profileSaved
                ? 'text-orange-400 ring-orange-500/50 hover:bg-orange-500/10'
                : 'text-slate-200 ring-slate-700 hover:ring-slate-500'
            }`}
          >
            <Icon name={profileSaved ? 'check' : 'ruler'} className="h-4 w-4" />
            {profileSaved ? 'Fit profile' : 'Find your fit'}
          </button>
          <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full text-slate-300 hover:bg-slate-900" aria-label={`Bag, ${bagCount} items`}>
            <Icon name="bag" />
            {bagCount > 0 && (
              <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-slate-950">
                {bagCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

export function ShopFooter() {
  return (
    <footer className="mt-24 border-t border-slate-800">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div>
          <p className="font-display text-2xl text-slate-50">
            SENPAI<span className="text-orange-500">/</span>SUPPLY
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
            Heavyweight oversized tees with original anime-inspired art. Printed in small drops.
          </p>
        </div>
        <div className="space-y-2 text-sm text-slate-400">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-600">Help</p>
          <p>Shipping</p>
          <p>Exchanges</p>
          <p>Size guide</p>
        </div>
        <div className="rounded-xl p-5 ring-1 ring-slate-800">
          <p className="text-xs uppercase tracking-[0.18em] text-orange-500">Sizing by Fitline</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Your measurements and photos are processed on your device. Nothing is uploaded.
          </p>
        </div>
      </div>
      <p className="border-t border-slate-800 py-5 text-center text-xs text-slate-600">
        Demo storefront · fictional brand · all artwork original
      </p>
    </footer>
  )
}

export function Toast({ message }) {
  return (
    <div
      role="status"
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-5 transition-all duration-300 ${
        message ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <p className="rounded-full bg-slate-50 px-5 py-3 text-sm font-medium text-slate-950 shadow-lg">{message}</p>
    </div>
  )
}
