import { describe, expect, it } from 'vitest'
import { segmentIntersectsCircle as hit } from '../src/game/utils/math'

// Circle at (100, 100), radius 20 for all cases.
const C = [100, 100, 20] as const

describe('segmentIntersectsCircle', () => {
  it('hits when the segment passes through the centre', () => {
    expect(hit(50, 100, 150, 100, ...C)).toBe(true)
  })

  it('hits when the segment just touches the edge (tangent)', () => {
    expect(hit(50, 120, 150, 120, ...C)).toBe(true)
  })

  it('misses when the segment passes just outside the edge', () => {
    expect(hit(50, 120.01, 150, 120.01, ...C)).toBe(false)
  })

  it('hits when only an endpoint is inside the circle', () => {
    expect(hit(0, 100, 90, 100, ...C)).toBe(true)
    expect(hit(105, 105, 300, 300, ...C)).toBe(true)
  })

  it('hits when the whole segment is inside the circle', () => {
    expect(hit(95, 95, 105, 105, ...C)).toBe(true)
  })

  it('misses when the segment stops short, even though its infinite line would hit', () => {
    // Line y = 100 goes through the centre, but the segment ends at x = 70.
    expect(hit(0, 100, 70, 100, ...C)).toBe(false)
    // Same on the far side.
    expect(hit(130, 100, 200, 100, ...C)).toBe(false)
  })

  it('handles diagonal and reversed segments', () => {
    expect(hit(0, 0, 200, 200, ...C)).toBe(true)
    expect(hit(200, 200, 0, 0, ...C)).toBe(true)
    expect(hit(0, 50, 50, 0, ...C)).toBe(false)
  })

  it('treats zero-length segments as no hit without producing NaN', () => {
    expect(hit(100, 100, 100, 100, ...C)).toBe(false)
    expect(hit(0, 0, 0, 0, ...C)).toBe(false)
  })

  it('rejects non-finite input', () => {
    expect(hit(NaN, 100, 150, 100, ...C)).toBe(false)
    expect(hit(0, 0, Infinity, 100, ...C)).toBe(false)
  })

  it('catches a fast swipe that jumps clean over the circle in one segment', () => {
    // Start and end are both far outside, the circle sits in the middle.
    expect(hit(-1000, 90, 1000, 110, ...C)).toBe(true)
  })
})
