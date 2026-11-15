import { describe, expect, it } from 'vitest'
import type { Viewport } from '../src/game/core/types'
import type { Snack } from '../src/game/entities/types'
import { integrateAll, pruneInPlace } from '../src/game/systems/PhysicsSystem'
import { SpawnSystem } from '../src/game/systems/SpawnSystem'
import { GRAVITY, PHYSICS_STEP, WORLD_SHORT_SIDE } from '../src/game/utils/constants'

/** Small deterministic PRNG (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function simulate(viewport: Viewport, seconds: number) {
  const gravity = GRAVITY * (viewport.height / WORLD_SHORT_SIDE)
  const spawner = new SpawnSystem(seeded(42))
  const snacks: Snack[] = []
  const peakY = new Map<number, number>()
  let maxLive = 0
  let launched = 0
  let undamporis = 0

  for (let t = 0; t < seconds; t += PHYSICS_STEP) {
    const before = snacks.length
    spawner.update(PHYSICS_STEP, t, viewport, gravity, snacks)
    for (let i = before; i < snacks.length; i++) {
      launched++
      if (snacks[i].kind === 'undampori') undamporis++
    }
    integrateAll(snacks, PHYSICS_STEP, gravity)
    for (const s of snacks) {
      peakY.set(s.id, Math.min(peakY.get(s.id) ?? Infinity, s.y))
      if (s.vy > 0 && s.y - s.radius > viewport.height) s.active = false
    }
    pruneInPlace(snacks, (s) => s.active)
    maxLive = Math.max(maxLive, snacks.length)
  }
  return { snacks, peakY, maxLive, launched, undamporis }
}

describe.each([
  ['landscape', { width: 1280, height: 720, scale: 1, dpr: 1 }],
  ['portrait', { width: 720, height: 1560, scale: 1, dpr: 1 }],
])('spawning + physics (%s)', (_name, viewport: Viewport) => {
  const result = simulate(viewport, 180)

  it('launches a steady stream including some undamporis', () => {
    expect(result.launched).toBeGreaterThan(100)
    expect(result.undamporis).toBeGreaterThan(0)
    expect(result.undamporis).toBeLessThan(result.launched / 3)
  })

  it('every launch peaks inside the visible screen', () => {
    const stillFlying = new Set(result.snacks.map((s) => s.id))
    for (const [id, y] of result.peakY) {
      if (stillFlying.has(id)) continue
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(viewport.height * 0.5)
    }
  })

  it('keeps the live entity count bounded', () => {
    expect(result.maxLive).toBeLessThan(25)
  })
})

describe('pruneInPlace', () => {
  it('keeps order and removes rejected items without reallocating', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const ref = items
    pruneInPlace(items, (n) => n % 2 === 0)
    expect(items).toBe(ref)
    expect(items).toEqual([2, 4, 6])
  })
})
