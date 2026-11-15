import type { GameOverReason, GameState, Popup } from '../core/types'
import {
  BASE_SLICE_SCORE,
  COMBO_BONUS_PER_SNACK,
  COMBO_MIN,
  COMBO_WINDOW,
  POPUP_LIFETIME,
} from '../utils/constants'
import { clamp } from '../utils/math'
import { pruneInPlace } from './PhysicsSystem'

// Gameplay rules: scoring, combos, lives and round end.
// Pure functions over GameState so they can be unit tested without a browser.
// Combo timing uses `state.elapsedTime`, so pausing never breaks or extends a combo.

export interface ComboResult {
  count: number
  bonus: number
  x: number
  y: number
}

export function comboBonus(count: number): number {
  return count >= COMBO_MIN ? count * COMBO_BONUS_PER_SNACK : 0
}

/** A snack was sliced at (x, y). */
export function registerSlice(state: GameState, x: number, y: number): void {
  if (state.status !== 'playing') return
  const now = state.elapsedTime

  state.combo = state.combo > 0 && now - state.lastSliceTime <= COMBO_WINDOW ? state.combo + 1 : 1
  state.lastSliceTime = now
  state.lastSliceX = x
  state.lastSliceY = y
  state.slicedCount++
  addScore(state, BASE_SLICE_SCORE)
}

/**
 * Close the current chain once the combo window has passed with no new slice.
 * Returns the combo (with any bonus already added to the score), or null if none ended.
 */
export function settleCombo(state: GameState): ComboResult | null {
  if (state.combo === 0) return null
  if (state.elapsedTime - state.lastSliceTime <= COMBO_WINDOW) return null

  const count = state.combo
  state.combo = 0
  if (state.status !== 'playing') return null

  const bonus = comboBonus(count)
  if (bonus === 0) return null
  state.bestCombo = Math.max(state.bestCombo, count)
  addScore(state, bonus)
  return { count, bonus, x: state.lastSliceX, y: state.lastSliceY }
}

/** A snack fell away unsliced. */
export function registerMiss(state: GameState): void {
  if (state.status !== 'playing') return
  state.missedCount++
  state.lives = Math.max(0, state.lives - 1)
  if (state.lives === 0) endRound(state, 'lives')
}

/** The player sliced an undampori: immediate game over. */
export function registerUndamporiHit(state: GameState): void {
  if (state.status !== 'playing') return
  endRound(state, 'undampori')
}

export function endRound(state: GameState, reason: GameOverReason): void {
  state.status = 'gameover'
  state.gameOverReason = reason
  state.combo = 0
}

/**
 * Deactivate snacks and pieces that fell below `bottom`.
 * Each unsliced snack costs exactly one life (guarded by its `missed` flag).
 */
export function processOffscreen(state: GameState, bottom: number, worldWidth: number): void {
  for (const snack of state.snacks) {
    if (!snack.active || snack.vy <= 0 || snack.y - snack.radius <= bottom) continue
    snack.active = false
    if (snack.kind !== 'snack' || snack.sliced || snack.missed) continue
    snack.missed = true
    if (state.status !== 'playing') continue
    registerMiss(state)
    addPopup(state, 'miss', '✕', clamp(snack.x, 40, worldWidth - 40), bottom - 40)
  }
  for (const piece of state.pieces) {
    if (piece.vy > 0 && piece.y - piece.radius > bottom) piece.active = false
  }
}

export function addPopup(state: GameState, kind: Popup['kind'], text: string, x: number, y: number): void {
  state.popups.push({ kind, text, x, y, age: 0 })
}

export function updatePopups(state: GameState, dt: number): void {
  for (const popup of state.popups) popup.age += dt
  pruneInPlace(state.popups, (p) => p.age < POPUP_LIFETIME)
}

function addScore(state: GameState, points: number): void {
  state.score += points
  if (state.score > state.highScore) state.highScore = state.score
}
