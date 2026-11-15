import {
  BACKGROUND_EXTENSIONS,
  FOREGROUND_EXTENSIONS,
  SNACK_TYPES,
  SPRITE_MAX_PX,
  type SnackType,
} from '../utils/constants'

export type ImageKey = SnackType | 'undampori'

/** A snack image cropped to its visible pixels and downscaled. Aspect ratio = width / height. */
export interface Sprite {
  source: CanvasImageSource
  width: number
  height: number
}

export type ImageMap = Partial<Record<ImageKey, Sprite>>

const BASE = import.meta.env.BASE_URL

/** Pixels with alpha at or below this count as empty background. */
const ALPHA_THRESHOLD = 24

/** Resolution used to find the visible bounds (fast; precise enough for cropping). */
const BOUNDS_SAMPLE_PX = 256

export function imageUrl(key: ImageKey): string {
  return key === 'undampori'
    ? `${BASE}assets/undampori/undampori.png`
    : `${BASE}assets/snacks/${key}.png`
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Bounding box of pixels whose alpha exceeds `threshold`, from RGBA data.
 * Returns null if the image is fully transparent.
 */
export function alphaBounds(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  threshold = ALPHA_THRESHOLD,
): Bounds | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] <= threshold) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** Size that fits `width × height` inside a `maxSide` square without changing aspect ratio. */
export function fitContain(width: number, height: number, maxSide: number): { width: number; height: number } {
  const k = maxSide / Math.max(width, height)
  return { width: width * k, height: height * k }
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

/** Find the visible region of `img` (in its own pixel coordinates). */
function findVisibleBounds(img: HTMLImageElement): Bounds {
  const full: Bounds = { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight }
  const sample = fitContain(img.naturalWidth, img.naturalHeight, BOUNDS_SAMPLE_PX)
  const canvas = makeCanvas(sample.width, sample.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return full
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  let bounds: Bounds | null
  try {
    bounds = alphaBounds(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
  } catch {
    return full // tainted canvas (cross-origin): use the whole image
  }
  if (!bounds) return full

  // Scale back up, padding one sample pixel so soft edges are not clipped.
  const kx = img.naturalWidth / canvas.width
  const ky = img.naturalHeight / canvas.height
  const x = Math.max(0, (bounds.x - 1) * kx)
  const y = Math.max(0, (bounds.y - 1) * ky)
  return {
    x,
    y,
    width: Math.min(img.naturalWidth - x, (bounds.width + 2) * kx),
    height: Math.min(img.naturalHeight - y, (bounds.height + 2) * ky),
  }
}

/**
 * Crop to the visible pixels and downscale (in halving steps, for quality)
 * so the longest side is at most SPRITE_MAX_PX.
 */
function toSprite(img: HTMLImageElement): Sprite {
  const crop = findVisibleBounds(img)
  const target = fitContain(crop.width, crop.height, Math.min(SPRITE_MAX_PX, Math.max(crop.width, crop.height)))

  let source: CanvasImageSource = img
  let sx = crop.x
  let sy = crop.y
  let sw = crop.width
  let sh = crop.height
  while (sw / 2 >= target.width && sh / 2 >= target.height) {
    const step = makeCanvas(sw / 2, sh / 2)
    const ctx = step.getContext('2d')
    if (!ctx) break
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, step.width, step.height)
    source = step
    sx = 0
    sy = 0
    sw = step.width
    sh = step.height
  }

  const out = makeCanvas(target.width, target.height)
  const ctx = out.getContext('2d')
  if (!ctx) return { source: img, width: img.naturalWidth, height: img.naturalHeight }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height)
  return { source: out, width: out.width, height: out.height }
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
    if (img) map[key] = toSprite(img)
  })
  return map
}

/** Optional full-screen background: the first of background.jpg / .png / .webp that exists. */
export function loadBackground(): Promise<HTMLImageElement | null> {
  return loadFirstExisting('background', BACKGROUND_EXTENSIONS)
}

/** Optional bottom strip drawn in front of the snacks: the first foreground.png / .webp / .jpg. */
export async function loadForeground(): Promise<Sprite | null> {
  const img = await loadFirstExisting('foreground', FOREGROUND_EXTENSIONS)
  return img ? trimVertically(img) : null
}

/**
 * Remove fully transparent rows above and below the artwork (full width is kept),
 * so a full-screen PNG with art only at the bottom becomes a proper strip.
 */
function trimVertically(img: HTMLImageElement): Sprite {
  const bounds = findVisibleBounds(img)
  const top = Math.floor(bounds.y)
  const height = Math.min(img.naturalHeight - top, Math.ceil(bounds.height))
  const canvas = makeCanvas(img.naturalWidth, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return { source: img, width: img.naturalWidth, height: img.naturalHeight }
  ctx.drawImage(img, 0, top, img.naturalWidth, height, 0, 0, canvas.width, canvas.height)
  return { source: canvas, width: canvas.width, height: canvas.height }
}

/** Load public/assets/<name>/<name>.<ext> for the first extension that exists. */
async function loadFirstExisting(
  name: string,
  extensions: readonly string[],
): Promise<HTMLImageElement | null> {
  for (const ext of extensions) {
    const img = await loadImage(`${BASE}assets/${name}/${name}.${ext}`)
    if (img) return img
  }
  return null
}

/** Make sure the web fonts are ready before canvas text is drawn with them. */
export async function loadFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  try {
    await Promise.all([
      document.fonts.load('40px "Luckiest Guy"'),
      document.fonts.load('16px "Fredoka Variable"'),
    ])
  } catch {
    // Fonts unavailable: canvas falls back to system fonts.
  }
}
