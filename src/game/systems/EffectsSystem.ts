import type { GameState } from '../core/types'
import { FLASH_DURATION } from '../utils/constants'

/** Start (or extend) a screen shake. Stronger shakes win over weaker ones. */
export function startShake(state: GameState, duration: number, strength: number): void {
  const current = state.shakeTime > 0 ? state.shakeStrength * (state.shakeTime / state.shakeDuration) : 0
  if (strength < current) return
  state.shakeTime = duration
  state.shakeDuration = duration
  state.shakeStrength = strength
}

export function startFlash(state: GameState): void {
  state.flash = 1
}

export function updateEffects(state: GameState, dt: number): void {
  if (state.shakeTime > 0) state.shakeTime = Math.max(0, state.shakeTime - dt)
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt / FLASH_DURATION)
}
