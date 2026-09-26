import { useCallback, useMemo, useState } from 'react'
import { bodyFromSilhouette } from '../lib/worn'

export const MEASURES = [
  ['chest', 'Chest'],
  ['waist', 'Waist'],
  ['hip', 'Hip'],
  ['torsoLength', 'Torso length'],
]

export const toCm = (v) => (v === '' || v == null ? NaN : Number(v))

/**
 * Everything the shopper tells us about their body, from either path, reduced to one
 * `body` object for fit.js. Lives at page level so every product can be sized from it.
 */
export function useBodyInputs() {
  const [source, setSource] = useState('manual')
  const [manual, setManual] = useState({ chest: '96', waist: '88', hip: '98', torsoLength: '52' })
  const [heightCm, setHeightCm] = useState('175')
  // Raw silhouette estimate from body.js, what the person wears in the photo, and any
  // values the user typed over the corrected estimate.
  const [photoEstimate, setPhotoEstimate] = useState(null)
  const [worn, setWornState] = useState('regular')
  const [photoEdits, setPhotoEdits] = useState({})

  const onEstimate = useCallback((est) => {
    setPhotoEstimate(est)
    setPhotoEdits({})
  }, [])

  const setWorn = (next) => {
    setWornState(next)
    setPhotoEdits({})
  }

  // Editable photo fields: { [key]: { value: string, pm: number, edited: boolean } }
  const photoFields = useMemo(() => {
    if (!photoEstimate) return null
    const corrected = bodyFromSilhouette(photoEstimate, worn)
    return Object.fromEntries(
      MEASURES.map(([k]) =>
        k in photoEdits
          ? [k, { value: photoEdits[k], pm: 0, edited: true }]
          : [k, { value: String(corrected[k].value), pm: corrected[k].uncertainty, edited: false }],
      ),
    )
  }, [photoEstimate, worn, photoEdits])

  const editPhotoField = (k, value) => setPhotoEdits((e) => ({ ...e, [k]: value }))

  // Both paths produce the same shape; fit.js never knows which one ran.
  const body = useMemo(() => {
    if (source === 'manual') {
      return Object.fromEntries(Object.entries(manual).map(([k, v]) => [k, { cm: toCm(v), pm: 0 }]))
    }
    if (!photoFields) return null
    return Object.fromEntries(Object.entries(photoFields).map(([k, f]) => [k, { cm: toCm(f.value), pm: f.pm }]))
  }, [source, manual, photoFields])

  return {
    source,
    setSource,
    manual,
    setManual,
    heightCm,
    setHeightCm,
    photoEstimate,
    onEstimate,
    worn,
    setWorn,
    photoFields,
    editPhotoField,
    body,
  }
}
