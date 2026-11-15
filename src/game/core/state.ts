import { STARTING_LIVES } from '../utils/constants'
import type { GameState, GameStatus, UiSnapshot } from './types'

export function createInitialState(status: GameStatus, highScore = 0): GameState {
  return {
    status,
    score: 0,
    highScore,
    startHighScore: highScore,
    lives: STARTING_LIVES,
    elapsedTime: 0,
    combo: 0,
    lastSliceTime: 0,
    lastSliceX: 0,
    lastSliceY: 0,
    bestCombo: 0,
    gameOverReason: null,
    popups: [],
    shakeTime: 0,
    shakeDuration: 0,
    shakeStrength: 0,
    flash: 0,
    snacks: [],
    pieces: [],
    slicedCount: 0,
    missedCount: 0,
  }
}

export interface SnapshotExtras {
  muted: boolean
  loading: boolean
}

export function toSnapshot(
  state: GameState,
  extras: SnapshotExtras = { muted: false, loading: false },
): UiSnapshot {
  return {
    ...extras,
    status: state.status,
    score: state.score,
    highScore: state.highScore,
    isNewBest: state.score > 0 && state.score > state.startHighScore,
    lives: state.lives,
    slicedCount: state.slicedCount,
    bestCombo: state.bestCombo,
    gameOverReason: state.gameOverReason,
  }
}

export function snapshotsEqual(a: UiSnapshot, b: UiSnapshot): boolean {
  for (const key of Object.keys(a) as (keyof UiSnapshot)[]) {
    if (a[key] !== b[key]) return false
  }
  return true
}
