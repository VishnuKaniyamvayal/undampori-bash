import type { Piece, Snack } from '../entities/types'

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover'

export type GameOverReason = 'undampori' | 'lives'

/** Short-lived floating text drawn on the canvas (combo bonus, missed snack). */
export interface Popup {
  kind: 'combo' | 'miss'
  text: string
  x: number
  y: number
  /** Seconds since it appeared. */
  age: number
}

/** Authoritative mutable game state, owned by Game. */
export interface GameState {
  status: GameStatus
  score: number
  /** Best score ever (this session until persistence lands in Step 5); updated live. */
  highScore: number
  /** High score at the start of this round, to detect a new best. */
  startHighScore: number
  lives: number
  /** Seconds of active play in the current round; the clock for combos. */
  elapsedTime: number
  /** Length of the current slice chain (0 = none). */
  combo: number
  /** `elapsedTime` of the most recent snack slice. */
  lastSliceTime: number
  /** Where the most recent slice happened (combo popup anchor). */
  lastSliceX: number
  lastSliceY: number
  /** Longest combo this round. */
  bestCombo: number
  gameOverReason: GameOverReason | null
  popups: Popup[]
  /** Screen shake: seconds left, total duration and peak offset (world units). */
  shakeTime: number
  shakeDuration: number
  shakeStrength: number
  /** Explosion flash intensity, 1 → 0. */
  flash: number
  /** Live snacks and undamporis (one list; `kind` tells them apart). */
  snacks: Snack[]
  /** Halves of sliced snacks, falling away. */
  pieces: Piece[]
  /** Snacks sliced this round. */
  slicedCount: number
  /** Snacks that fell away unsliced this round. */
  missedCount: number
}

/** Immutable view of the state that the React UI cares about. */
export interface UiSnapshot {
  readonly status: GameStatus
  readonly score: number
  readonly highScore: number
  readonly isNewBest: boolean
  readonly lives: number
  readonly slicedCount: number
  readonly bestCombo: number
  readonly gameOverReason: GameOverReason | null
  readonly muted: boolean
  /** True until images have finished loading (or failed and fallen back). */
  readonly loading: boolean
}

/** Visible world size (in world units) and how it maps to the canvas. */
export interface Viewport {
  /** Visible world width in world units. */
  width: number
  /** Visible world height in world units. */
  height: number
  /** CSS pixels per world unit. */
  scale: number
  /** Device pixel ratio used for the backing store. */
  dpr: number
}

export interface Point {
  x: number
  y: number
}
