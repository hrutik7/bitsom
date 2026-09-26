// Catmull-Rom through the points, emitted as cubic béziers.
export function smoothPath(pts, closed = true) {
  const n = pts.length
  const at = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return closed ? d + 'Z' : d
}

// Stadium shape of radius r around segment a→b.
export function capsulePath([ax, ay], [bx, by], r) {
  const len = Math.hypot(bx - ax, by - ay) || 1
  const nx = (-(by - ay) / len) * r
  const ny = ((bx - ax) / len) * r
  return `M${ax + nx},${ay + ny} L${bx + nx},${by + ny} A${r},${r} 0 0 1 ${bx - nx},${by - ny} L${ax - nx},${ay - ny} A${r},${r} 0 0 1 ${ax + nx},${ay + ny}Z`
}
