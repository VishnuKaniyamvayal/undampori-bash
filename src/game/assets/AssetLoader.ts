import { SNACK_TYPES, type SnackType } from '../utils/constants'

export type ImageKey = SnackType | 'undampori'
export type ImageMap = Partial<Record<ImageKey, HTMLImageElement>>

const BASE = import.meta.env.BASE_URL

export function imageUrl(key: ImageKey): string {
  return key === 'undampori'
    ? `${BASE}assets/undampori/undampori.png`
    : `${BASE}assets/snacks/${key}.png`
}

/** Resolves with the decoded image, or null if it is missing or broken. */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * Preload every snack image (in parallel) before play starts.
 * Missing files are simply left out; the renderer draws fallback shapes for them.
 */
export async function loadImages(): Promise<ImageMap> {
  const keys: ImageKey[] = [...SNACK_TYPES, 'undampori']
  const images = await Promise.all(keys.map((key) => loadImage(imageUrl(key))))
  const map: ImageMap = {}
  keys.forEach((key, i) => {
    const img = images[i]
    if (img) map[key] = img
  })
  return map
}
