import type { Body } from '../entities/types'

/** Semi-implicit Euler integration with gravity and spin. */
export function integrateBody(body: Body, dt: number, gravity: number): void {
  body.vy += gravity * dt
  body.x += body.vx * dt
  body.y += body.vy * dt
  body.rotation += body.angularVelocity * dt
}

export function integrateAll(bodies: readonly Body[], dt: number, gravity: number): void {
  for (let i = 0; i < bodies.length; i++) integrateBody(bodies[i], dt, gravity)
}

/** Remove items failing `keep` in place (no new array allocation). */
export function pruneInPlace<T>(items: T[], keep: (item: T) => boolean): void {
  let write = 0
  for (let read = 0; read < items.length; read++) {
    const item = items[read]
    if (keep(item)) items[write++] = item
  }
  items.length = write
}
