// getUserMedia helpers shared by still capture and live try-on.
export const CAMERA_BLOCKED = 'Camera blocked — use Upload instead'
export const CAMERA_INSECURE = 'Camera needs https or localhost — use Upload'
export const CAMERA_NOT_FOUND = 'No camera found — check it is switched on, or use Upload'
export const CAMERA_BUSY = 'Camera is in use by another app or tab (or dropped out) — close it and retry, or use Upload'

export const stopStream = (stream) => stream?.getTracks().forEach((t) => t.stop())

// Null when the camera API is usable on this page.
export function cameraSupportError() {
  return !window.isSecureContext || !navigator.mediaDevices?.getUserMedia ? CAMERA_INSECURE : null
}

export function cameraErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return CAMERA_BLOCKED
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return CAMERA_NOT_FOUND
    case 'NotReadableError':
    case 'TrackStartError':
      return CAMERA_BUSY
    default:
      return `Camera could not start${err?.message ? ` (${err.message})` : ''} — use Upload instead`
  }
}
