import type { TrailStroke } from '../systems/InputSystem'
import { TRAIL_LIFETIME, TRAIL_WIDTH } from '../utils/constants'

/** Draw swipe trails that taper and fade with age: a warm glow under a bright core. */
export function drawTrails(ctx: CanvasRenderingContext2D, strokes: readonly TrailStroke[], now: number): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokes) {
    const points = stroke.points
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]
      const b = points[i]
      const life = 1 - (now - b.time) / TRAIL_LIFETIME
      if (life <= 0) continue

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)

      ctx.strokeStyle = `rgba(242, 165, 65, ${0.35 * life})`
      ctx.lineWidth = TRAIL_WIDTH * 1.8 * life
      ctx.stroke()

      ctx.strokeStyle = `rgba(255, 250, 235, ${0.95 * life})`
      ctx.lineWidth = TRAIL_WIDTH * life
      ctx.stroke()
    }
  }
}
