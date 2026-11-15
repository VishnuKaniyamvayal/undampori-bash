import { describe, expect, it } from 'vitest'
import type { Piece, Snack } from '../src/game/entities/types'
import type { SwipeSegment } from '../src/game/systems/InputSystem'
import { findSlices, spawnHalves, type SliceHit } from '../src/game/systems/SliceSystem'

function makeSnack(overrides: Partial<Snack> = {}): Snack {
  return {
    id: 1,
    kind: 'snack',
    type: 'pazhampori',
    radius: 40,
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    rotation: 0,
    angularVelocity: 0,
    active: true,
    sliced: false,
    missed: false,
    ...overrides,
  }
}

const seg = (ax: number, ay: number, bx: number, by: number): SwipeSegment => ({
  ax,
  ay,
  bx,
  by,
  time: 0,
})

describe('findSlices', () => {
  it('slices a snack once even when several segments cross it', () => {
    const snack = makeSnack()
    const hits: SliceHit[] = []
    findSlices([seg(0, 100, 200, 100), seg(100, 0, 100, 200), seg(0, 0, 200, 200)], [snack], 0, hits)
    expect(hits).toHaveLength(1)
    expect(snack.sliced).toBe(true)
  })

  it('never re-slices on a later frame', () => {
    const snack = makeSnack()
    const hits: SliceHit[] = []
    findSlices([seg(0, 100, 200, 100)], [snack], 0, hits)
    findSlices([seg(0, 100, 200, 100)], [snack], 0, hits)
    expect(hits).toHaveLength(1)
  })

  it('one swipe can slice several snacks', () => {
    const a = makeSnack({ id: 1, x: 100 })
    const b = makeSnack({ id: 2, x: 300 })
    const c = makeSnack({ id: 3, x: 300, y: 400 }) // not on the line
    const hits: SliceHit[] = []
    findSlices([seg(0, 100, 400, 100)], [a, b, c], 0, hits)
    expect(hits.map((h) => h.snack.id)).toEqual([1, 2])
  })

  it('skips inactive and already-sliced snacks', () => {
    const inactive = makeSnack({ active: false })
    const done = makeSnack({ sliced: true })
    const hits: SliceHit[] = []
    findSlices([seg(0, 100, 200, 100)], [inactive, done], 0, hits)
    expect(hits).toHaveLength(0)
  })

  it('padding widens the hit area', () => {
    const snack = makeSnack()
    const hits: SliceHit[] = []
    findSlices([seg(0, 145, 200, 145)], [snack], 0, hits) // 45 from centre, radius 40
    expect(hits).toHaveLength(0)
    findSlices([seg(0, 145, 200, 145)], [snack], 6, hits)
    expect(hits).toHaveLength(1)
  })

  it('reports a unit swipe direction', () => {
    const hits: SliceHit[] = []
    findSlices([seg(0, 100, 300, 100)], [makeSnack()], 0, hits)
    expect(hits[0].dirX).toBeCloseTo(1)
    expect(hits[0].dirY).toBeCloseTo(0)
  })
})

describe('spawnHalves', () => {
  it('creates two halves pushed apart perpendicular to the cut', () => {
    const pieces: Piece[] = []
    // Horizontal cut → halves separate vertically.
    spawnHalves({ snack: makeSnack(), dirX: 1, dirY: 0 }, pieces, () => 0.5)
    expect(pieces).toHaveLength(2)
    const [a, b] = pieces
    expect(a.side).toBe(0)
    expect(b.side).toBe(1)
    expect(Math.sign(a.vy)).toBe(-Math.sign(b.vy))
    expect(Math.abs(a.vx)).toBeLessThan(1e-9)
  })
})
