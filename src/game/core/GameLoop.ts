import { MAX_FRAME_DELTA, MAX_STEPS_PER_FRAME, PHYSICS_STEP } from '../utils/constants'

export interface LoopCallbacks {
  /** Called zero or more times per frame with a fixed step (seconds). */
  update(dt: number): void
  /** Called once per animation frame. `frameDelta` is the clamped real time since last frame. */
  render(frameDelta: number): void
}

/**
 * requestAnimationFrame loop with a fixed-timestep accumulator for gameplay updates.
 * Rendering happens every frame; updates run at PHYSICS_STEP regardless of display rate.
 */
export class GameLoop {
  private readonly callbacks: LoopCallbacks
  private rafId = 0
  private lastTime = -1
  private accumulator = 0
  private running = false

  constructor(callbacks: LoopCallbacks) {
    this.callbacks = callbacks
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.resetTiming()
    this.rafId = requestAnimationFrame(this.frame)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  /** Forget elapsed time, e.g. after resuming, so no catch-up burst happens. */
  resetTiming(): void {
    this.lastTime = -1
    this.accumulator = 0
  }

  private frame = (now: number): void => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.frame)

    if (this.lastTime < 0) this.lastTime = now
    const delta = Math.min((now - this.lastTime) / 1000, MAX_FRAME_DELTA)
    this.lastTime = now

    this.accumulator += delta
    let steps = 0
    while (this.accumulator >= PHYSICS_STEP && steps < MAX_STEPS_PER_FRAME) {
      this.callbacks.update(PHYSICS_STEP)
      this.accumulator -= PHYSICS_STEP
      steps++
    }
    // Too far behind (slow device): drop the backlog instead of spiralling.
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0

    this.callbacks.render(delta)
  }
}
