import { describe, expect, it } from 'vitest'
import { alphaBounds, fitContain } from '../src/game/assets/AssetLoader'

/** Build RGBA data for a w×h image with the given opaque pixels. */
function rgba(w: number, h: number, opaque: [number, number][]) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (const [x, y] of opaque) data[(y * w + x) * 4 + 3] = 255
  return data
}

describe('alphaBounds', () => {
  it('finds the box around visible pixels', () => {
    const data = rgba(10, 8, [
      [2, 3],
      [6, 1],
      [4, 5],
    ])
    expect(alphaBounds(data, 10, 8)).toEqual({ x: 2, y: 1, width: 5, height: 5 })
  })

  it('ignores faint pixels below the threshold', () => {
    const data = rgba(4, 4, [[1, 1]])
    data[(3 * 4 + 3) * 4 + 3] = 10 // faint corner pixel
    expect(alphaBounds(data, 4, 4)).toEqual({ x: 1, y: 1, width: 1, height: 1 })
  })

  it('returns null for a fully transparent image', () => {
    expect(alphaBounds(rgba(4, 4, []), 4, 4)).toBeNull()
  })
})

describe('fitContain', () => {
  it('keeps aspect ratio for wide images', () => {
    expect(fitContain(1536, 1024, 96)).toEqual({ width: 96, height: 64 })
  })

  it('keeps aspect ratio for tall images', () => {
    expect(fitContain(50, 100, 80)).toEqual({ width: 40, height: 80 })
  })

  it('square stays square', () => {
    expect(fitContain(1254, 1254, 88)).toEqual({ width: 88, height: 88 })
  })
})
