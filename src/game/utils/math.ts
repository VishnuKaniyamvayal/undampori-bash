/** Random-number source; injectable so systems can be tested deterministically. */
export type Rng = () => number

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const randRange = (min: number, max: number, rng: Rng = Math.random): number =>
  min + (max - min) * rng()

/** Integer in [min, max] inclusive. */
export const randInt = (min: number, max: number, rng: Rng = Math.random): number =>
  Math.floor(randRange(min, max + 1, rng))

export const pick = <T>(items: readonly T[], rng: Rng = Math.random): T =>
  items[Math.floor(rng() * items.length)]

/**
 * Does segment A→B touch the circle (C, r)?
 * Projects C onto the segment, clamps to [0, 1] so the segment's ends are respected,
 * and compares squared distance to r². Zero-length / non-finite segments never hit.
 * Takes plain numbers to stay allocation-free in the hot loop.
 */
export function segmentIntersectsCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  if (!(lengthSq > 0) || !Number.isFinite(lengthSq)) return false
  const t = clamp(((cx - ax) * dx + (cy - ay) * dy) / lengthSq, 0, 1)
  const px = ax + t * dx - cx
  const py = ay + t * dy - cy
  return px * px + py * py <= r * r
}
