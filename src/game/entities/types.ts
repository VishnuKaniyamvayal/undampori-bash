import type { SnackType } from '../utils/constants'

/** 'snack' is sliceable for points; 'undampori' is the bomb. */
export type EntityKind = 'snack' | 'undampori'

/** Anything that flies: shared kinematic shape. */
export interface Body {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  angularVelocity: number
}

/** A launched snack or undampori. */
export interface Snack extends Body {
  id: number
  kind: EntityKind
  /** Visual type; 'undampori' for the bomb. */
  type: SnackType | 'undampori'
  radius: number
  /** False once it should be removed from the world. */
  active: boolean
  /** Set the moment it is hit, so it is never sliced twice. */
  sliced: boolean
  /** Set when a snack leaves the screen unsliced (costs a life in Step 4). */
  missed: boolean
}

/**
 * One half of a sliced snack. Drawn as a half-disc whose flat edge is the local x axis:
 * side 0 is the +y half, side 1 the −y half.
 */
export interface Piece extends Body {
  type: Snack['type']
  radius: number
  side: 0 | 1
  /** Image orientation relative to the cut line, so the halves line up with the whole snack. */
  imageRotation: number
  active: boolean
}

/** A pooled juice / explosion particle. */
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  /** Seconds left. */
  life: number
  maxLife: number
  size: number
  color: string
  active: boolean
}
