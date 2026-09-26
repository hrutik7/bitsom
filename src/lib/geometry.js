// Torso cross-section model shared by the photo estimator and the fit preview:
// an ellipse whose depth is DEPTH_RATIO × its front width.
export const DEPTH_RATIO = 0.7

// Ramanujan's approximation of an ellipse perimeter with semi-axes a, b.
export function ellipsePerimeter(a, b) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
}

// Circumference per unit of front width, and its inverse.
const PERIMETER_PER_WIDTH = ellipsePerimeter(0.5, DEPTH_RATIO / 2)
export const widthToCircumference = (w) => w * PERIMETER_PER_WIDTH
export const circumferenceToWidth = (c) => c / PERIMETER_PER_WIDTH
