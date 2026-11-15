import type { Point } from '../core/types'
import { MAX_TRAIL_POINTS, MIN_SWIPE_STEP, TRAIL_LIFETIME } from '../utils/constants'

/** A piece of a swipe in world coordinates, created between two pointer samples. */
export interface SwipeSegment {
  ax: number
  ay: number
  bx: number
  by: number
  /** Seconds (performance.now timebase). */
  time: number
}

export interface TrailPoint {
  x: number
  y: number
  /** Seconds (performance.now timebase). */
  time: number
}

/** One continuous drag. Multiple strokes can exist at once (multi-touch, fading strokes). */
export interface TrailStroke {
  pointerId: number
  /** Recent points for drawing; old ones expire. */
  points: TrailPoint[]
  /** Last sample, kept even when `points` has expired, so segments stay continuous. */
  last: TrailPoint
  /** False once the pointer is lifted; the stroke then just fades out. */
  active: boolean
}

/**
 * Turns Pointer Events (mouse, touch, pen) into swipe segments + a visual trail.
 * Only produces input while enabled (i.e. while playing).
 */
export class InputSystem {
  readonly strokes: TrailStroke[] = []

  private readonly canvas: HTMLCanvasElement
  private readonly toWorld: (clientX: number, clientY: number) => Point
  private readonly segments: SwipeSegment[] = []
  private readonly activeStrokes = new Map<number, TrailStroke>()
  private enabled = false

  constructor(canvas: HTMLCanvasElement, toWorld: (clientX: number, clientY: number) => Point) {
    this.canvas = canvas
    this.toWorld = toWorld
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerEnd)
    canvas.addEventListener('pointercancel', this.onPointerEnd)
    canvas.addEventListener('lostpointercapture', this.onPointerEnd)
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) this.clear()
  }

  /** Segments received since the last `clearSegments()`. */
  get pendingSegments(): readonly SwipeSegment[] {
    return this.segments
  }

  clearSegments(): void {
    this.segments.length = 0
  }

  /** Drop all strokes and pending segments (pause, restart). */
  clear(): void {
    this.segments.length = 0
    this.strokes.length = 0
    this.activeStrokes.clear()
  }

  /** Expire old trail points and finished strokes. */
  pruneTrail(now: number): void {
    const cutoff = now - TRAIL_LIFETIME
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const stroke = this.strokes[i]
      const points = stroke.points
      let expired = 0
      while (expired < points.length && points[expired].time < cutoff) expired++
      if (expired > 0) points.splice(0, expired)
      if (!stroke.active && points.length === 0) this.strokes.splice(i, 1)
    }
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerEnd)
    this.canvas.removeEventListener('pointercancel', this.onPointerEnd)
    this.canvas.removeEventListener('lostpointercapture', this.onPointerEnd)
    this.clear()
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    try {
      this.canvas.setPointerCapture(e.pointerId)
    } catch {
      // Capture can fail for synthetic events; tracking still works without it.
    }
    const p = this.toWorld(e.clientX, e.clientY)
    const point: TrailPoint = { x: p.x, y: p.y, time: e.timeStamp / 1000 }
    const stroke: TrailStroke = { pointerId: e.pointerId, points: [point], last: point, active: true }
    this.endStroke(e.pointerId) // finish any stale stroke for this pointer
    this.activeStrokes.set(e.pointerId, stroke)
    this.strokes.push(stroke)
  }

  private onPointerMove = (e: PointerEvent): void => {
    const stroke = this.activeStrokes.get(e.pointerId)
    if (!stroke) return
    // Coalesced events give every hardware sample, so fast swipes stay accurate.
    const samples = e.getCoalescedEvents?.()
    if (samples && samples.length > 0) {
      for (const sample of samples) this.addSample(stroke, sample)
    } else {
      this.addSample(stroke, e)
    }
  }

  private onPointerEnd = (e: PointerEvent): void => {
    this.endStroke(e.pointerId)
  }

  private endStroke(pointerId: number): void {
    const stroke = this.activeStrokes.get(pointerId)
    if (!stroke) return
    stroke.active = false
    this.activeStrokes.delete(pointerId)
  }

  private addSample(stroke: TrailStroke, e: PointerEvent): void {
    const p = this.toWorld(e.clientX, e.clientY)
    const last = stroke.last
    const dx = p.x - last.x
    const dy = p.y - last.y
    if (dx * dx + dy * dy < MIN_SWIPE_STEP * MIN_SWIPE_STEP) return

    const time = e.timeStamp / 1000
    this.segments.push({ ax: last.x, ay: last.y, bx: p.x, by: p.y, time })

    const point: TrailPoint = { x: p.x, y: p.y, time }
    stroke.points.push(point)
    if (stroke.points.length > MAX_TRAIL_POINTS) stroke.points.shift()
    stroke.last = point
  }
}
