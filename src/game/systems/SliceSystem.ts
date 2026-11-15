import type { Piece, Snack } from '../entities/types'
import {
  MAX_PIECES,
  PIECE_SPIN_MAX,
  PIECE_SPIN_MIN,
  PIECE_SPLIT_SPEED,
  PIECE_VELOCITY_INHERIT,
} from '../utils/constants'
import { randRange, segmentIntersectsCircle, type Rng } from '../utils/math'
import type { SwipeSegment } from './InputSystem'

export interface SliceHit {
  snack: Snack
  /** Unit direction of the swipe that cut it. */
  dirX: number
  dirY: number
}

/**
 * Test every segment against every live, unsliced snack.
 * A hit snack is marked `sliced` immediately, so later segments in the same
 * batch (or later frames) can never hit it again.
 */
export function findSlices(
  segments: readonly SwipeSegment[],
  snacks: readonly Snack[],
  padding: number,
  out: SliceHit[],
): void {
  for (const seg of segments) {
    for (const snack of snacks) {
      if (!snack.active || snack.sliced) continue
      const r = snack.radius + padding
      if (!segmentIntersectsCircle(seg.ax, seg.ay, seg.bx, seg.by, snack.x, snack.y, r)) continue
      snack.sliced = true
      const dx = seg.bx - seg.ax
      const dy = seg.by - seg.ay
      const len = Math.hypot(dx, dy) // > 0, guaranteed by segmentIntersectsCircle
      out.push({ snack, dirX: dx / len, dirY: dy / len })
    }
  }
}

/** Replace a sliced snack with two halves flying apart perpendicular to the cut. */
export function spawnHalves(hit: SliceHit, pieces: Piece[], rng: Rng = Math.random): void {
  const { snack, dirX, dirY } = hit
  // Cut-line angle; local +y of a piece is the normal (−dirY, dirX).
  const cutAngle = Math.atan2(dirY, dirX)
  const nx = -dirY
  const ny = dirX

  for (const side of [0, 1] as const) {
    const sign = side === 0 ? 1 : -1
    const spin = randRange(PIECE_SPIN_MIN, PIECE_SPIN_MAX, rng) * sign
    pieces.push({
      type: snack.type,
      radius: snack.radius,
      side,
      x: snack.x + nx * sign * snack.radius * 0.1,
      y: snack.y + ny * sign * snack.radius * 0.1,
      vx: snack.vx * PIECE_VELOCITY_INHERIT + nx * sign * PIECE_SPLIT_SPEED,
      vy: snack.vy * PIECE_VELOCITY_INHERIT + ny * sign * PIECE_SPLIT_SPEED,
      rotation: cutAngle,
      imageRotation: snack.rotation - cutAngle,
      angularVelocity: snack.angularVelocity * 0.5 + spin,
      active: true,
    })
  }

  if (pieces.length > MAX_PIECES) pieces.splice(0, pieces.length - MAX_PIECES)
}
