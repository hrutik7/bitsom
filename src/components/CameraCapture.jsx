import { useEffect, useId, useRef, useState } from 'react'
import { capsulePath, smoothPath } from '../lib/svgPath'

const COUNTDOWN_S = 3
const GUIDE_TEXT = 'stand 3m back · arms away from body · head to knees in frame'
const BLOCKED = 'Camera blocked — use Upload instead'
const INSECURE = 'Camera needs https or localhost — use Upload'
const NOT_FOUND = 'No camera found — check it is switched on, or use Upload'

const stopStream = (stream) => stream?.getTracks().forEach((t) => t.stop())

function cameraErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return BLOCKED
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return NOT_FOUND
    default:
      return `Camera could not start${err?.message ? ` (${err.message})` : ''} — use Upload instead`
  }
}

/**
 * Live preview → 3s countdown → one still frame as a JPEG blob. The stream only lives
 * while this component is mounted: unmounting (capture, tab switch, leaving the photo
 * tab) stops every track so the camera light goes off.
 */
export default function CameraCapture({ onCapture, onError }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const [aspect, setAspect] = useState(null) // set once frames arrive
  const [mirrored, setMirrored] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [facing, setFacing] = useState('user') // front camera by default; phones can flip
  const [canFlip, setCanFlip] = useState(false)

  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      onError(INSECURE)
      return
    }
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) return stopStream(stream)
        streamRef.current = stream
        // Laptops only have a front camera; mirror that preview so moving feels natural.
        setMirrored(stream.getVideoTracks()[0]?.getSettings().facingMode !== 'environment')
        videoRef.current.srcObject = stream
        return navigator.mediaDevices.enumerateDevices().then((devices) => {
          if (!cancelled) setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1)
        })
      })
      .catch((err) => {
        if (!cancelled) onError(cameraErrorMessage(err))
      })
    return () => {
      cancelled = true
      clearInterval(timerRef.current)
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [facing, onError])

  const flip = () => {
    clearInterval(timerRef.current)
    setCountdown(null)
    setAspect(null) // back to "Starting camera…" until the new stream's frames arrive
    setFacing((f) => (f === 'user' ? 'environment' : 'user'))
  }

  const capture = () => {
    const video = videoRef.current
    if (!video?.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopStream(streamRef.current)
    streamRef.current = null
    canvas.toBlob(
      (blob) => (blob ? onCapture(blob) : onError('Could not capture a frame — use Upload instead')),
      'image/jpeg',
      0.92,
    )
  }

  const toggleCountdown = () => {
    clearInterval(timerRef.current)
    if (countdown != null) return setCountdown(null) // second press cancels
    let n = COUNTDOWN_S
    setCountdown(n)
    timerRef.current = setInterval(() => {
      n -= 1
      if (n > 0) return setCountdown(n)
      clearInterval(timerRef.current)
      setCountdown(null)
      capture()
    }, 1000)
  }

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-lg bg-black ring-1 ring-slate-800"
        style={{ aspectRatio: aspect ?? 4 / 3 }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => setAspect(e.currentTarget.videoWidth / e.currentTarget.videoHeight)}
          className={`block h-full w-full object-cover ${mirrored ? '-scale-x-100' : ''}`}
        />
        <FramingGuide />
        {canFlip && (
          <button
            type="button"
            onClick={flip}
            className="absolute right-2 top-2 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-900"
          >
            {facing === 'user' ? 'Use back camera' : 'Use front camera'}
          </button>
        )}
        {aspect == null && (
          <div className="absolute inset-0 grid place-items-center text-xs text-slate-400">Starting camera…</div>
        )}
        {countdown != null && (
          <div className="absolute inset-0 grid place-items-center text-8xl font-semibold tabular-nums text-white/90">
            {countdown}
          </div>
        )}
        <p className="absolute inset-x-0 bottom-0 bg-slate-950/70 px-3 py-2 text-center text-xs text-slate-200">
          {GUIDE_TEXT}
        </p>
      </div>
      <button
        type="button"
        onClick={toggleCountdown}
        disabled={aspect == null}
        className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
          countdown != null
            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            : 'bg-orange-500 text-slate-950 hover:bg-orange-400'
        }`}
      >
        {countdown != null ? 'Cancel' : `Capture in ${COUNTDOWN_S}s`}
      </button>
    </div>
  )
}

// A-pose ghost, drawn as an outline ring: mask = (silhouette dilated) − silhouette.
const GUIDE_CX = 60
const GUIDE_TORSO = [[5, 33], [8, 40], [21, 45], [25, 52], [20, 68], [18, 92], [15, 112], [19, 126], [16, 140], [0, 146]]
const guideTorso = smoothPath([
  ...GUIDE_TORSO.map(([dx, y]) => [GUIDE_CX + dx, y]),
  ...GUIDE_TORSO.map(([dx, y]) => [GUIDE_CX - dx, y]).reverse(),
])
const guideLimbs = [1, -1].flatMap((s) => {
  const x = (dx) => GUIDE_CX + s * dx
  return [
    capsulePath([x(21), 48], [x(31), 86], 5.5),
    capsulePath([x(31), 86], [x(41), 122], 4.5),
    capsulePath([x(10), 128], [x(12), 184], 8.5),
    capsulePath([x(12), 184], [x(13), 228], 6),
  ]
})

function FramingGuide() {
  const id = `guide-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const shapes = (
    <>
      <ellipse cx={GUIDE_CX} cy={19} rx={10} ry={13} />
      <path d={guideTorso} />
      {guideLimbs.map((d) => (
        <path key={d} d={d} />
      ))}
    </>
  )
  return (
    <svg
      viewBox="0 0 120 240"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-x-0 top-[5%] h-[82%] w-full"
      aria-hidden="true"
    >
      <defs>
        <mask id={id}>
          <g fill="white" stroke="white" strokeWidth="2.4" strokeLinejoin="round">
            {shapes}
          </g>
          <g fill="black">{shapes}</g>
        </mask>
      </defs>
      <rect width="120" height="240" fill="white" opacity="0.5" mask={`url(#${id})`} />
    </svg>
  )
}
