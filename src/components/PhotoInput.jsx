import { useCallback, useEffect, useRef, useState } from 'react'
import { debug, estimateBody } from '../lib/body'
import { drawOverlay } from '../lib/drawOverlay'
import CameraCapture from './CameraCapture'
import { Segmented } from './ui'

const MIN_HEIGHT = 100
const MAX_HEIGHT = 250

// `active` false (e.g. the drawer is closed) unmounts the camera so its light goes off.
export default function PhotoInput({ heightCm, onEstimate, active = true }) {
  const [source, setSource] = useState('upload')
  const [notice, setNotice] = useState(null) // why the camera fell back to upload
  const [url, setUrl] = useState(null)
  const [loadedUrl, setLoadedUrl] = useState(null)
  // Result of the last finished job, tagged with the url|height it ran for.
  const [finished, setFinished] = useState({ key: null })
  const [showOverlay, setShowOverlay] = useState(true)
  const [dragging, setDragging] = useState(false)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const inputRef = useRef(null)

  // Uploaded files and captured frames take the same path: object URL → <img> → estimateBody.
  const takeImage = (blob) => {
    if (!blob || !blob.type.startsWith('image/')) return
    if (url) URL.revokeObjectURL(url)
    setUrl(URL.createObjectURL(blob))
    setNotice(null)
    onEstimate(null)
  }

  const clearImage = () => {
    if (url) URL.revokeObjectURL(url)
    setUrl(null)
    onEstimate(null)
  }

  const switchSource = (next) => {
    if (next === source) return
    clearImage()
    setNotice(null)
    setSource(next)
  }

  const onCameraError = useCallback((message) => {
    setSource('upload')
    setNotice(message)
  }, [])

  const height = Number(heightCm)
  const heightValid = height >= MIN_HEIGHT && height <= MAX_HEIGHT
  const ready = url != null && loadedUrl === url
  const jobKey = ready && heightValid ? `${url}|${height}` : null
  const status = jobKey == null ? { kind: 'idle' } : finished.key === jobKey ? finished : { kind: 'running' }

  useEffect(() => {
    if (jobKey == null) return
    let cancelled = false
    estimateBody(imgRef.current, height)
      .then((result) => {
        if (cancelled) return
        drawOverlay(canvasRef.current, debug)
        setFinished({ key: jobKey, kind: 'done', overlay: true, cmPerPixel: debug.cmPerPixel, warnings: result.warnings })
        onEstimate(result)
      })
      .catch((err) => {
        if (cancelled) return
        // A rejected measurement still leaves debug populated; show it so the failure is visible.
        const overlay = Boolean(debug.rows)
        if (overlay) drawOverlay(canvasRef.current, debug)
        setFinished({ key: jobKey, kind: 'error', overlay, message: err.message })
        onEstimate(null)
      })
    return () => {
      cancelled = true
    }
  }, [jobKey, height, onEstimate])

  return (
    <div className="space-y-3">
      <Segmented
        value={source}
        onChange={switchSource}
        options={[
          { value: 'upload', label: 'Upload' },
          { value: 'camera', label: 'Camera' },
        ]}
      />
      {notice && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/30">{notice}</p>
      )}
      {url ? (
        <div className="relative overflow-hidden rounded-lg bg-slate-900 ring-1 ring-slate-800">
          <img
            ref={imgRef}
            src={url}
            alt={source === 'camera' ? 'Captured photo' : 'Uploaded photo'}
            onLoad={() => setLoadedUrl(url)}
            className="block max-h-[420px] w-full object-contain"
          />
          <canvas
            ref={canvasRef}
            className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${
              showOverlay && status.overlay ? '' : 'hidden'
            }`}
          />
        </div>
      ) : source === 'camera' ? (
        active && <CameraCapture onCapture={takeImage} onError={onCameraError} />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            takeImage(e.dataTransfer.files?.[0])
          }}
          className={`flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-10 text-sm transition-colors ${
            dragging ? 'border-orange-500 bg-orange-500/5 text-orange-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          <span className="text-slate-200">Drop a photo or click to upload</span>
          <span className="mt-2 text-xs text-slate-500">
            Full body, facing the camera, arms a little away from your sides
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          takeImage(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <div className="flex min-h-5 items-center justify-between gap-4 text-xs">
        <span
          className={
            status.kind === 'error' || (url && !heightValid) ? 'text-red-400' : 'text-slate-500'
          }
        >
          {url && !heightValid
            ? `Enter a height between ${MIN_HEIGHT} and ${MAX_HEIGHT} cm.`
            : status.kind === 'running'
              ? 'Analysing photo…'
              : status.kind === 'error'
                ? status.message
                : status.kind === 'done'
                  ? `Scale ${status.cmPerPixel.toFixed(3)} cm/px`
                  : ''}
        </span>
        {url && (
          <span className="flex shrink-0 gap-4">
            <label className="flex cursor-pointer items-center gap-1.5 text-slate-400">
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(e) => setShowOverlay(e.target.checked)}
                className="accent-orange-500"
              />
              Overlay
            </label>
            <button
              type="button"
              onClick={source === 'camera' ? clearImage : () => inputRef.current?.click()}
              className="text-slate-400 hover:text-orange-400"
            >
              {source === 'camera' ? 'Retake' : 'Replace'}
            </button>
          </span>
        )}
      </div>
      {status.warnings?.map((w) => (
        <p key={w} className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-amber-500/30">
          {w}
        </p>
      ))}
    </div>
  )
}
