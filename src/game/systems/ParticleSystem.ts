import type { Particle } from '../entities/types'
import {
  EXPLOSION_PARTICLES,
  JUICE_PARTICLES,
  MAX_PARTICLES,
  PARTICLE_GRAVITY_SCALE,
} from '../utils/constants'
import { randRange, type Rng } from '../utils/math'

const EXPLOSION_COLORS = ['#fff3c4', '#ffd166', '#f2a541', '#e23b2e', '#3a2418'] as const

/**
 * Fixed-size ring buffer of particles. Spawning reuses the oldest slot,
 * so the count is bounded and nothing is allocated during play.
 */
export class ParticlePool {
  readonly items: Particle[]
  private cursor = 0

  constructor(size = MAX_PARTICLES) {
    this.items = Array.from({ length: size }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      color: '#fff',
      active: false,
    }))
  }

  spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string): void {
    const p = this.items[this.cursor]
    this.cursor = (this.cursor + 1) % this.items.length
    p.x = x
    p.y = y
    p.vx = vx
    p.vy = vy
    p.life = life
    p.maxLife = life
    p.size = size
    p.color = color
    p.active = true
  }

  update(dt: number, gravity: number): void {
    const g = gravity * PARTICLE_GRAVITY_SCALE
    const drag = Math.pow(0.2, dt) // lose 80% of speed per second
    for (const p of this.items) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        continue
      }
      p.vx *= drag
      p.vy = p.vy * drag + g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
  }

  get activeCount(): number {
    let n = 0
    for (const p of this.items) if (p.active) n++
    return n
  }

  clear(): void {
    for (const p of this.items) p.active = false
  }
}

/** Juice droplets spraying out of a sliced snack, mostly sideways from the cut. */
export function emitJuice(
  pool: ParticlePool,
  x: number,
  y: number,
  colors: readonly string[],
  rng: Rng = Math.random,
): void {
  for (let i = 0; i < JUICE_PARTICLES; i++) {
    const angle = randRange(0, Math.PI * 2, rng)
    const speed = randRange(120, 420, rng)
    pool.spawn(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 80,
      randRange(0.35, 0.75, rng),
      randRange(3, 7, rng),
      colors[i % colors.length],
    )
  }
}

/** Fiery burst for a sliced undampori. */
export function emitExplosion(pool: ParticlePool, x: number, y: number, rng: Rng = Math.random): void {
  for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
    const angle = randRange(0, Math.PI * 2, rng)
    const speed = randRange(150, 800, rng)
    pool.spawn(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      randRange(0.5, 1.1, rng),
      randRange(4, 11, rng),
      EXPLOSION_COLORS[i % EXPLOSION_COLORS.length],
    )
  }
}
