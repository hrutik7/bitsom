// A 3D tee built from size-chart numbers (centimetres), posed from live landmarks.
// Torso is one extruded, bevelled panel; each sleeve is its own piece hinged at the shoulder
// seam so it can follow the upper arm.
import * as THREE from 'three'
import { circumferenceToWidth } from './geometry'

// Cut-specific construction, cm: seam offset past the shoulder, seam drop down the arm,
// armhole depth from the neck line, sleeve length and opening.
const CUT = {
  oversized: { seamOut: 3, seamDrop: 7, armhole: 27, sleeveLen: 22, sleeveOpen: 19 },
  regular: { seamOut: 0.5, seamDrop: 1.5, armhole: 22, sleeveLen: 18, sleeveOpen: 15 },
  fitted: { seamOut: -0.5, seamDrop: 0.5, armhole: 18, sleeveLen: 11, sleeveOpen: 12 },
}
const COLLAR_HALF = 8
const NECK_DIP = 6
const BEVEL = { bevelEnabled: true, bevelThickness: 3, bevelSize: 2.2, bevelSegments: 5, curveSegments: 18 }
// Standard proportions for what we never measure: silhouette shoulder width vs chest width,
// and the landmark shoulder span (joint centres) vs silhouette shoulder width.
const SHOULDER_OVER_CHEST = 1.12
const JOINTS_OVER_SHOULDER = 0.85
const HPS_ABOVE_SHOULDER_JOINTS = 4 // cm, collar base above the shoulder landmarks
const REST_ARM = -1.25 // radians, sleeves hanging when an elbow is not visible

/** Garment circumferences (cm) + the wearer's chest → drawable dimensions. */
export function teeDimensions({ chest, hem, length }, bodyChest) {
  const chestW = circumferenceToWidth(chest)
  const bodyChestW = circumferenceToWidth(bodyChest)
  return {
    chestW,
    hemW: circumferenceToWidth(hem ?? chest),
    length,
    shoulderHalf: (bodyChestW * SHOULDER_OVER_CHEST) / 2,
    // Distance between MediaPipe's shoulder landmarks on this wearer, for scaling.
    jointSpan: bodyChestW * SHOULDER_OVER_CHEST * JOINTS_OVER_SHOULDER,
  }
}

function extrude(shape, depth) {
  const g = new THREE.ExtrudeGeometry(shape, { ...BEVEL, depth })
  g.translate(0, 0, -depth / 2)
  return g
}

/**
 * @returns { group, sleeves: [plusX, minusX], dispose }  group origin = collar base (HPS)
 */
export function buildTee({ dims, cut, color, printTexture }) {
  const c = CUT[cut] ?? CUT.regular
  const halfC = dims.chestW / 2
  const halfH = dims.hemW / 2
  const seamX = Math.max(dims.shoulderHalf, halfC) + c.seamOut
  const depth = Math.max(6, dims.chestW * 0.5 - 2 * BEVEL.bevelThickness)

  const torso = new THREE.Shape()
  torso.moveTo(-COLLAR_HALF, 0)
  torso.quadraticCurveTo(0, -NECK_DIP, COLLAR_HALF, 0)
  torso.lineTo(dims.shoulderHalf, -1.5)
  torso.lineTo(seamX, -c.seamDrop)
  torso.lineTo(halfC, -c.armhole)
  torso.lineTo(halfH, -dims.length)
  torso.quadraticCurveTo(0, -dims.length - 1.5, -halfH, -dims.length)
  torso.lineTo(-halfC, -c.armhole)
  torso.lineTo(-seamX, -c.seamDrop)
  torso.lineTo(-dims.shoulderHalf, -1.5)
  torso.closePath()

  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.93, metalness: 0 })
  const disposables = [material]
  const group = new THREE.Group()

  const torsoGeo = extrude(torso, depth)
  disposables.push(torsoGeo)
  group.add(new THREE.Mesh(torsoGeo, material))

  // Sleeve axis runs along +x from the hinge (outer edge on y = 0, opening below it).
  const sleeves = [1, -1].map((side) => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(side * c.sleeveLen, 0)
    s.lineTo(side * c.sleeveLen, -c.sleeveOpen)
    s.lineTo(0, -(c.armhole - c.seamDrop))
    s.closePath()
    const geo = extrude(s, depth * 0.72)
    disposables.push(geo)
    const hinge = new THREE.Group()
    hinge.position.set(side * seamX, -c.seamDrop, 0)
    hinge.add(new THREE.Mesh(geo, material))
    hinge.userData.side = side
    setSleeveAngle(hinge, REST_ARM)
    group.add(hinge)
    return hinge
  })

  if (printTexture) {
    const w = halfC * 1.1
    const printMat = new THREE.MeshStandardMaterial({ map: printTexture, transparent: true, roughness: 0.85 })
    const printGeo = new THREE.PlaneGeometry(w, (w * 190) / 180)
    disposables.push(printMat, printGeo)
    const print = new THREE.Mesh(printGeo, printMat)
    print.position.set(0, -dims.length * 0.34, depth / 2 + BEVEL.bevelThickness + 0.15)
    group.add(print)
  }

  return {
    group,
    sleeves,
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}

// `angle` is the arm direction in the torso frame as atan2(y, x), reflected for the -x side so
// both arms share one convention (hanging down-and-out ≈ REST_ARM). The -x sleeve's shape is
// mirrored, so it rotates the opposite way.
function setSleeveAngle(hinge, angle) {
  hinge.rotation.z = hinge.userData.side > 0 ? angle : -angle
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * Place the tee on the person. Landmarks are MediaPipe normalized (x, y in 0..1, z relative);
 * the scene uses image pixels with y up (three y = -image y).
 * @returns false when the shoulders are not tracked (tee hidden)
 */
export function poseTee(tee, lm, W, H, jointSpanCm) {
  const [a, b] = [lm[11], lm[12]].sort((p, q) => p.x - q.x) // image-left, image-right
  if (!a || !b || Math.min(a.visibility ?? 1, b.visibility ?? 1) < 0.5) {
    tee.group.visible = false
    return false
  }
  const dx = (b.x - a.x) * W
  const dy = (b.y - a.y) * H
  const dz = (b.z - a.z) * W
  const scale = Math.hypot(dx, dy, dz) / jointSpanCm // px per cm, robust to turning
  const roll = Math.atan2(-dy, dx)
  const yaw = clamp(Math.atan2(dz, Math.abs(dx)) * 0.9, -1, 1)

  const up = [-Math.sin(roll), Math.cos(roll)]
  const mid = [((a.x + b.x) / 2) * W, -((a.y + b.y) / 2) * H]
  tee.group.position.set(mid[0] + up[0] * HPS_ABOVE_SHOULDER_JOINTS * scale, mid[1] + up[1] * HPS_ABOVE_SHOULDER_JOINTS * scale, 0)
  tee.group.rotation.set(0, yaw, roll)
  tee.group.scale.setScalar(scale)
  tee.group.visible = true

  // Sleeves: +x sleeve follows the image-right shoulder's upper arm, -x the image-left's.
  const elbowOf = (shoulder) => lm[shoulder === lm[11] ? 13 : 14]
  for (const [hinge, sh] of [[tee.sleeves[0], b], [tee.sleeves[1], a]]) {
    const el = elbowOf(sh)
    if (!el || (el.visibility ?? 1) < 0.5) {
      setSleeveAngle(hinge, REST_ARM)
      continue
    }
    const world = Math.atan2(-(el.y - sh.y) * H, (el.x - sh.x) * W)
    // Into the torso frame; for the -x sleeve reflect so both share one convention.
    let local = world - roll
    if (hinge.userData.side < 0) local = Math.PI - local
    local = Math.atan2(Math.sin(local), Math.cos(local))
    setSleeveAngle(hinge, clamp(local, -2.6, 0.9))
  }
  return true
}
