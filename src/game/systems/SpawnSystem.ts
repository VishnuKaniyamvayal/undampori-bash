import type { Viewport } from '../core/types'
import type { EntityKind, Snack } from '../entities/types'
import {
  APEX_MAX,
  APEX_MIN,
  APEX_X_MAX,
  APEX_X_MIN,
  DIFFICULTY_RAMP_SECONDS,
  FIRST_WAVE_DELAY,
  LAUNCH_X_MAX,
  LAUNCH_X_MIN,
  SNACK_LOOKS,
  SNACK_TYPES,
  SPIN_MAX,
  SPIN_MIN,
  UNDAMPORI_CHANCE_END,
  UNDAMPORI_CHANCE_START,
  WAVE_INTERVAL_END,
  WAVE_INTERVAL_START,
  WAVE_SIZE_MAX_END,
  WAVE_SIZE_MAX_START,
  WAVE_SIZE_MIN,
  WAVE_STAGGER_MAX,
  WAVE_STAGGER_MIN,
} from '../utils/constants'
import { clamp, lerp, pick, randInt, randRange, type Rng } from '../utils/math'

interface PendingLaunch {
  /** Seconds until launch. */
  delay: number
  kind: EntityKind
}

/** 0 at round start → 1 once DIFFICULTY_RAMP_SECONDS have passed. */
export function difficultyProgress(elapsedTime: number): number {
  return clamp(elapsedTime / DIFFICULTY_RAMP_SECONDS, 0, 1)
}

/** Schedules waves of snacks (and the occasional undampori) and launches them. */
export class SpawnSystem {
  private readonly rng: Rng
  private timeUntilWave = FIRST_WAVE_DELAY
  private pending: PendingLaunch[] = []
  private nextId = 1

  constructor(rng: Rng = Math.random) {
    this.rng = rng
  }

  reset(): void {
    this.timeUntilWave = FIRST_WAVE_DELAY
    this.pending.length = 0
  }

  update(dt: number, elapsedTime: number, viewport: Viewport, gravity: number, out: Snack[]): void {
    const progress = difficultyProgress(elapsedTime)

    this.timeUntilWave -= dt
    if (this.timeUntilWave <= 0) {
      this.scheduleWave(progress)
      this.timeUntilWave += lerp(WAVE_INTERVAL_START, WAVE_INTERVAL_END, progress)
    }

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const launch = this.pending[i]
      launch.delay -= dt
      if (launch.delay <= 0) {
        out.push(this.createLaunch(launch.kind, viewport, gravity))
        this.pending.splice(i, 1)
      }
    }
  }

  private scheduleWave(progress: number): void {
    const maxSize = Math.round(lerp(WAVE_SIZE_MAX_START, WAVE_SIZE_MAX_END, progress))
    const size = randInt(WAVE_SIZE_MIN, maxSize, this.rng)
    const withUndampori =
      this.rng() < lerp(UNDAMPORI_CHANCE_START, UNDAMPORI_CHANCE_END, progress)
    const kinds: EntityKind[] = new Array<EntityKind>(size).fill('snack')
    // The undampori is an extra item at a random position, so a wave always has a snack.
    if (withUndampori) kinds.splice(randInt(0, size, this.rng), 0, 'undampori')

    let delay = 0
    for (const kind of kinds) {
      this.pending.push({ delay, kind })
      delay += randRange(WAVE_STAGGER_MIN, WAVE_STAGGER_MAX, this.rng)
    }
  }

  private createLaunch(kind: EntityKind, viewport: Viewport, gravity: number): Snack {
    const rng = this.rng
    const { width, height } = viewport
    const type = kind === 'undampori' ? 'undampori' : pick(SNACK_TYPES, rng)
    const radius = SNACK_LOOKS[type].radius

    const x = width * randRange(LAUNCH_X_MIN, LAUNCH_X_MAX, rng)
    const y = height + radius
    // Choose an apex height, then solve for the launch speed that reaches it.
    const rise = y - height * (1 - randRange(APEX_MIN, APEX_MAX, rng))
    const vy = -Math.sqrt(2 * gravity * rise)
    const timeToApex = -vy / gravity
    const apexX = width * randRange(APEX_X_MIN, APEX_X_MAX, rng)
    const vx = (apexX - x) / timeToApex

    const spin = randRange(SPIN_MIN, SPIN_MAX, rng) * (rng() < 0.5 ? -1 : 1)

    return {
      id: this.nextId++,
      kind,
      type,
      radius,
      x,
      y,
      vx,
      vy,
      rotation: randRange(0, Math.PI * 2, rng),
      angularVelocity: spin,
      active: true,
      sliced: false,
      missed: false,
    }
  }
}
