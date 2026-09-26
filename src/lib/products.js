// Garment silhouette used for drawing a product: 'oversized' | 'regular' | 'fitted'.
const CUT_BY_TYPE = { 'Oversized Tee': 'oversized', 'Regular Fit Tee': 'regular', 'Fitted Baby Tee': 'fitted' }
export const cutOf = (product) => CUT_BY_TYPE[product.type] ?? 'regular'
