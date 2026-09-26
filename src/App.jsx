import { useCallback, useMemo, useRef, useState } from 'react'
import products from './data/products.json'
import sizeCharts from './data/sizeCharts.json'
import { toCm, useBodyInputs } from './hooks/useBodyInputs'
import { computeFit } from './lib/fit'
import FitFinder from './components/FitFinder'
import BuyBox from './components/shop/BuyBox'
import ProductCard from './components/shop/ProductCard'
import ProductGallery from './components/shop/ProductGallery'
import { AnnouncementBar, ShopFooter, ShopHeader, Toast } from './components/shop/ShopChrome'

// A product's chart as the shopper currently sees it: catalogue data plus any edits made in
// the finder's "Product data" panel.
function chartFor(product, chartEdits) {
  const base = sizeCharts.find((c) => c.id === product.chartId)
  const edit = chartEdits[product.id]
  return { kind: edit?.kind ?? base.kind, designEase: base.designEase ?? 0, rows: edit?.rows ?? base.sizes }
}

function toFitChart(chart) {
  const sizes = chart.rows
    .filter((r) => String(r.size).trim() !== '')
    .map((r) => ({
      size: String(r.size).trim(),
      chest: toCm(r.chest),
      waist: toCm(r.waist),
      hip: toCm(r.hip),
      length: toCm(r.length),
    }))
  return { kind: chart.kind, designEase: chart.designEase, sizes }
}

export default function App() {
  const inputs = useBodyInputs()
  const [productId, setProductId] = useState(products[0].id)
  const [colorByProduct, setColorByProduct] = useState({})
  const [sizeByProduct, setSizeByProduct] = useState({})
  const [chartEdits, setChartEdits] = useState({})
  const [fabricEdits, setFabricEdits] = useState({})
  const [finderOpen, setFinderOpen] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [bag, setBag] = useState([])
  const [toast, setToast] = useState(null)
  const [sizeHint, setSizeHint] = useState(null)
  const toastTimer = useRef(null)

  const product = products.find((p) => p.id === productId)
  const color = product.colors.find((c) => c.id === colorByProduct[product.id]) ?? product.colors[0]
  const chart = chartFor(product, chartEdits)
  const fabric = fabricEdits[product.id] ?? product.fabric

  // One body, every product: the fit for each item in the catalogue.
  const fits = useMemo(() => {
    if (!inputs.body) return {}
    return Object.fromEntries(
      products.map((p) => [
        p.id,
        computeFit({ body: inputs.body, chart: toFitChart(chartFor(p, chartEdits)), fabric: fabricEdits[p.id] ?? p.fabric }),
      ]),
    )
  }, [inputs.body, chartEdits, fabricEdits])

  const fit = fits[product.id] ?? null
  const shownFit = profileSaved ? fit : null
  const selectedSize = sizeByProduct[product.id] ?? shownFit?.recommended ?? null

  const say = (message) => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  const openProduct = (id) => {
    setProductId(id)
    setSizeHint(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addToBag = () => {
    if (!selectedSize) {
      setSizeHint('Pick a size first, or let Fitline find it.')
      return
    }
    setBag((b) => [...b, { id: product.id, size: selectedSize, color: color.id }])
    say(`Added ${product.name} · ${selectedSize} · ${color.name}`)
  }

  const applyFit = (size) => {
    setSizeByProduct((s) => ({ ...s, [product.id]: size }))
    setProfileSaved(true)
    setFinderOpen(false)
    setSizeHint(null)
    say(`Size ${size} selected. Your fit now shows on every product.`)
  }

  const closeFinder = useCallback(() => setFinderOpen(false), [])
  const updateChart = (patch) =>
    setChartEdits((e) => ({ ...e, [product.id]: { kind: chart.kind, rows: chart.rows, ...patch } }))

  const others = products.filter((p) => p.id !== product.id)

  return (
    <>
      <AnnouncementBar />
      <ShopHeader bagCount={bag.length} profileSaved={profileSaved} onFit={() => setFinderOpen(true)} />

      <main className="mx-auto max-w-7xl px-5 lg:px-10">
        <nav className="py-5 text-xs text-slate-500">
          Home <span className="mx-1.5">/</span> {product.type}s <span className="mx-1.5">/</span>
          <span className="text-slate-300">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <ProductGallery key={product.id} product={product} color={color} />
          <BuyBox
            product={product}
            color={color}
            onColor={(id) => setColorByProduct((c) => ({ ...c, [product.id]: id }))}
            chart={chart}
            selectedSize={selectedSize}
            onSize={(s) => {
              setSizeByProduct((m) => ({ ...m, [product.id]: s }))
              setSizeHint(null)
            }}
            fit={shownFit}
            onFindSize={() => setFinderOpen(true)}
            onAdd={addToBag}
            sizeHint={sizeHint}
          />
        </div>

        <section className="mt-24">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-3xl text-slate-50 uppercase">
              Pair it with <span className="text-orange-500">一緒に</span>
            </h2>
            {profileSaved && <p className="hidden text-xs text-slate-500 sm:block">Sizes from your fit profile</p>}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3">
            {others.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                yourSize={profileSaved ? fits[p.id]?.recommended : null}
                onOpen={() => openProduct(p.id)}
              />
            ))}
          </div>
        </section>
      </main>

      <ShopFooter />

      <FitFinder
        open={finderOpen}
        onClose={closeFinder}
        product={product}
        inputs={inputs}
        chart={chart}
        chartEdited={product.id in chartEdits || product.id in fabricEdits}
        onChartRows={(rows) => updateChart({ rows })}
        onChartKind={(kind) => updateChart({ kind })}
        onResetChart={() => {
          setChartEdits(({ [product.id]: _c, ...rest }) => rest)
          setFabricEdits(({ [product.id]: _f, ...rest }) => rest)
        }}
        fabric={fabric}
        onFabric={(f) => setFabricEdits((e) => ({ ...e, [product.id]: f }))}
        result={fit}
        onApply={applyFit}
      />
      <Toast message={toast} />
    </>
  )
}
