// Renders body.js `debug` onto a canvas the size of the analysed image, to check the
// silhouette, arm corridors, measurement rows and height span by eye.
export function drawOverlay(canvas, d) {
  canvas.width = d.width
  canvas.height = d.height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, d.width, d.height)
  const unit = Math.max(1, d.width / 500) // stroke/label scale

  // Silhouette after arm removal.
  const img = ctx.createImageData(d.width, d.height)
  for (let i = 0; i < d.mask.length; i++) {
    if (!d.mask[i]) continue
    img.data[i * 4] = 56
    img.data[i * 4 + 1] = 189
    img.data[i * 4 + 2] = 248
    img.data[i * 4 + 3] = 70
  }
  ctx.putImageData(img, 0, 0)

  // Arm corridors that were erased.
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)'
  ctx.lineWidth = d.armRadius * 2
  ctx.lineCap = 'round'
  for (const [a, b] of d.arms) {
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  // Torso core that arm erasure may not touch.
  if (d.protectBand && d.arms.length) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.10)'
    ctx.fillRect(d.protectBand.left, d.shoulderY, d.protectBand.right - d.protectBand.left, d.hipY - d.shoulderY)
  }

  // Scale span: head top → floor (full body) or shoulder line → hip line (torso).
  ctx.setLineDash([6 * unit, 6 * unit])
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)'
  ctx.lineWidth = unit
  for (const y of [d.scaleTopY, d.scaleBottomY]) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(d.width, y)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Measurement rows.
  ctx.font = `${12 * unit}px ui-sans-serif, system-ui, sans-serif`
  ctx.textBaseline = 'bottom'
  for (const r of d.rows) {
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 2.5 * unit
    ctx.beginPath()
    ctx.moveTo(r.left, r.y)
    ctx.lineTo(r.right, r.y)
    ctx.stroke()
    for (const x of [r.left, r.right]) {
      ctx.beginPath()
      ctx.moveTo(x, r.y - 6 * unit)
      ctx.lineTo(x, r.y + 6 * unit)
      ctx.stroke()
    }
    const label = `${r.name} ${r.widthPx}px · ${r.widthCm.toFixed(1)}cm wide`
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)'
    const tw = ctx.measureText(label).width
    ctx.fillRect(r.right + 8 * unit, r.y - 16 * unit, tw + 8 * unit, 18 * unit)
    ctx.fillStyle = '#fed7aa'
    ctx.fillText(label, r.right + 12 * unit, r.y)
  }
}
