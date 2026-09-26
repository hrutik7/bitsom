import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as THREE from 'three'
import { cameraErrorMessage, cameraSupportError, stopStream } from '../../lib/camera'
import { getPoseTracker } from '../../lib/poseTracker'
import { buildTee, poseTee, teeDimensions } from '../../lib/tee3d'
import TeeArt from './TeeArt'

const SMOOTH = 0.45 // landmark smoothing per frame: 0 = frozen, 1 = raw (jittery)

// The product's front print as a texture, rendered from the same SVG artwork as the gallery.
function printTexture(product, color) {
  const svg = renderToStaticMarkup(<TeeArt product={product} color={color} printOnly />).replaceAll(
    'var(--font-display)',
    "'Arial Black', Impact, sans-serif",
  )
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 540
      canvas.height = 570
      const ctx = canvas.getContext('2d')
      // The view is mirrored like a selfie camera; pre-flip so the print reads correctly.
      ctx.scale(-1, 1)
      ctx.drawImage(img, -canvas.width, 0, canvas.width, canvas.height)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      resolve(texture)
    }
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

const MESSAGES = {
  starting: 'Starting camera…',
  loading: 'Loading body tracker…',
  searching: 'Step back — shoulders to hips in view',
}

/**
 * Full-screen live try-on: a 3D tee built from the chart for `size`, posed on the camera feed
 * every frame. Mount it only while open; unmounting stops the camera and frees the GPU.
 * @param garment { chest, hem, length } garment circumferences and length (cm) for `size`
 */
export default function LiveTryOn({ product, color, onColor, sizes, size, recommended, onSize, garment, bodyChest, cut, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('starting')
  const [error, setError] = useState(null)
  const unsupported = cameraSupportError()

  const spec = useMemo(
    () => ({ key: `${product.id}|${color.id}|${size}`, product, color, cut, dims: teeDimensions(garment, bodyChest) }),
    [product, color, cut, size, garment, bodyChest],
  )
  const specRef = useRef(spec)
  useEffect(() => {
    specRef.current = spec
  }, [spec])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => {
    if (unsupported) return
    let cancelled = false
    let stream = null
    let renderer = null
    let tee = null
    let builtKey = null
    let raf = 0
    const textures = new Map() // product|color → texture, or null while rendering
    const smoothed = []

    const fail = (message) => !cancelled && setError(message)

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch (err) {
        return fail(cameraErrorMessage(err))
      }
      if (cancelled) return stopStream(stream)
      const video = videoRef.current
      video.srcObject = stream
      await video.play().catch(() => {})
      if (video.readyState < 2) await new Promise((r) => video.addEventListener('loadeddata', r, { once: true }))
      if (cancelled) return
      const W = video.videoWidth
      const H = video.videoHeight
      setStatus('loading')

      // Scene in image pixels: x right, y up (image y negated), orthographic front view.
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
      renderer.setSize(W, H, false)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(0, W, 0, -H, -5000, 5000)
      camera.position.z = 2000
      scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a40, 1.5))
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
      keyLight.position.set(W * 0.3, H * 0.25, 1500)
      keyLight.target.position.set(W / 2, -H / 2, 0)
      scene.add(keyLight, keyLight.target)

      let tracker
      try {
        tracker = await getPoseTracker()
      } catch (err) {
        return fail(`Body tracker failed to load (${err.message ?? err}).`)
      }
      if (cancelled) return
      setStatus('searching')

      let lastVideoTime = -1
      let lastStatus = 'searching'
      const loop = () => {
        raf = requestAnimationFrame(loop)
        const s = specRef.current

        // (Re)build when size, colour or print texture changes.
        const texKey = `${s.product.id}|${s.color.id}`
        if (!textures.has(texKey)) {
          textures.set(texKey, null)
          printTexture(s.product, s.color)
            .then((t) => (cancelled ? t.dispose() : textures.set(texKey, t)))
            .catch(() => {})
        }
        const tex = textures.get(texKey)
        const wantKey = `${s.key}|${tex ? 'print' : 'plain'}`
        if (wantKey !== builtKey) {
          const visible = tee?.group.visible ?? false
          if (tee) {
            scene.remove(tee.group)
            tee.dispose()
          }
          tee = buildTee({ dims: s.dims, cut: s.cut, color: s.color.hex, printTexture: tex })
          tee.group.visible = visible
          scene.add(tee.group)
          builtKey = wantKey
        }

        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime
          const lm = tracker.detectForVideo(video, performance.now()).landmarks?.[0]
          if (lm) {
            lm.forEach((p, i) => {
              const q = (smoothed[i] ??= { ...p })
              q.x += (p.x - q.x) * SMOOTH
              q.y += (p.y - q.y) * SMOOTH
              q.z += (p.z - q.z) * SMOOTH
              q.visibility = p.visibility
            })
          }
          let tracking = false
          if (lm) tracking = poseTee(tee, smoothed, W, H, s.dims.jointSpan)
          else tee.group.visible = false
          const next = tracking ? 'tracking' : 'searching'
          if (next !== lastStatus) {
            lastStatus = next
            setStatus(next)
          }
        }
        renderer.render(scene, camera)
      }
      loop()
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stopStream(stream)
      tee?.dispose()
      textures.forEach((t) => t?.dispose())
      renderer?.dispose()
    }
  }, [unsupported])

  const message = unsupported ?? error
  const mirror = { transform: 'scaleX(-1)' }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950" role="dialog" aria-label="Live try-on">
      <header className="flex items-center justify-between px-5 py-3 lg:px-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500">Live try-on · 試着</p>
          <p className="font-display text-lg text-slate-50">{product.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full text-2xl text-slate-400 hover:bg-slate-900 hover:text-slate-100"
          aria-label="Close try-on"
        >
          ×
        </button>
      </header>

      <div className="relative min-h-0 flex-1 bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-contain" style={mirror} />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-contain" style={mirror} />
        <p
          className={`absolute top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap ${
            message ? 'bg-red-500/90 text-white' : status === 'tracking' ? 'bg-slate-950/70 text-slate-100' : 'bg-orange-500 text-slate-950'
          }`}
          role="status"
        >
          {message ?? (status === 'tracking' ? `Size ${size} · move around, it follows you` : MESSAGES[status])}
        </p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <div className="flex gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSize(s)}
              className={`relative h-10 min-w-10 rounded-full px-3 text-xs font-semibold transition ${
                s === size ? 'bg-slate-50 text-slate-950' : 'text-slate-200 ring-1 ring-slate-700 hover:ring-slate-500'
              }`}
              aria-pressed={s === size}
            >
              {s}
              {s === recommended && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-slate-950" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {product.colors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onColor(c.id)}
              className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-slate-950 ${c.id === color.id ? 'ring-2 ring-orange-500' : 'ring-1 ring-slate-700'}`}
              style={{ background: c.hex }}
              aria-label={c.name}
              aria-pressed={c.id === color.id}
            />
          ))}
        </div>
        <p className="w-full text-center text-[11px] text-slate-500 sm:w-auto">
          3D tee generated from the {size} size chart · runs on your device
        </p>
      </footer>
    </div>
  )
}
