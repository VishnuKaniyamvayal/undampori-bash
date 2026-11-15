import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../src/game/core/state'
import { startShake, updateEffects } from '../src/game/systems/EffectsSystem'
import { emitExplosion, emitJuice, ParticlePool } from '../src/game/systems/ParticleSystem'
import {
  EXPLOSION_PARTICLES,
  JUICE_PARTICLES,
  MAX_PARTICLES,
} from '../src/game/utils/constants'
import { loadHighScore, loadMuted, saveHighScore, saveMuted } from '../src/game/utils/storage'

describe('ParticlePool', () => {
  it('never grows beyond its fixed size, recycling the oldest particles', () => {
    const pool = new ParticlePool()
    const items = pool.items
    for (let i = 0; i < 20; i++) emitExplosion(pool, 0, 0)
    expect(pool.items).toBe(items)
    expect(pool.items).toHaveLength(MAX_PARTICLES)
    expect(pool.activeCount).toBe(MAX_PARTICLES)
  })

  it('emits the configured counts and expires particles', () => {
    const pool = new ParticlePool()
    emitJuice(pool, 0, 0, ['#fff'])
    expect(pool.activeCount).toBe(JUICE_PARTICLES)
    emitExplosion(pool, 0, 0)
    expect(pool.activeCount).toBe(JUICE_PARTICLES + EXPLOSION_PARTICLES)
    for (let i = 0; i < 120; i++) pool.update(1 / 60, 1100) // 2 s: longer than any life
    expect(pool.activeCount).toBe(0)
  })

  it('clear() deactivates everything', () => {
    const pool = new ParticlePool()
    emitJuice(pool, 0, 0, ['#fff'])
    pool.clear()
    expect(pool.activeCount).toBe(0)
  })
})

describe('screen shake / flash', () => {
  it('decays to zero', () => {
    const state = createInitialState('playing')
    startShake(state, 0.5, 16)
    state.flash = 1
    for (let i = 0; i < 60; i++) updateEffects(state, 1 / 60)
    expect(state.shakeTime).toBe(0)
    expect(state.flash).toBe(0)
  })

  it('a weaker shake does not cut short a stronger one', () => {
    const state = createInitialState('playing')
    startShake(state, 0.5, 16)
    startShake(state, 0.2, 2)
    expect(state.shakeStrength).toBe(16)
  })
})

describe('storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubStorage() {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    })
    return data
  }

  it('falls back to defaults when localStorage is unavailable', () => {
    expect(loadHighScore()).toBe(0)
    expect(loadMuted()).toBe(false)
    expect(() => saveHighScore(5)).not.toThrow()
  })

  it('falls back when storage throws (e.g. blocked / private mode)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })
    expect(loadHighScore()).toBe(0)
    expect(() => saveMuted(true)).not.toThrow()
  })

  it('round-trips high score and mute', () => {
    stubStorage()
    saveHighScore(42)
    saveMuted(true)
    expect(loadHighScore()).toBe(42)
    expect(loadMuted()).toBe(true)
  })

  it('ignores corrupt values', () => {
    const data = stubStorage()
    data.set('undampori-bash:highScore', 'banana')
    expect(loadHighScore()).toBe(0)
    data.set('undampori-bash:highScore', '-7')
    expect(loadHighScore()).toBe(0)
  })
})
