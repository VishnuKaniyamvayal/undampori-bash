import type { ImageMap } from '../assets/AssetLoader'
import type { GameState, Popup, Viewport } from '../core/types'
import type { Particle, Piece, Snack } from '../entities/types'
import type { TrailStroke } from '../systems/InputSystem'
import { IMAGE_SCALE, POPUP_LIFETIME, SHOW_DEBUG_INFO, SNACK_LOOKS } from '../utils/constants'
import { drawTrails } from './TrailRenderer'

/** Margin drawn around the visible area so screen shake never reveals an edge. */
const SHAKE_MARGIN = 40

export interface RenderInput {
  trails: readonly TrailStroke[]
  particles: readonly Particle[]
  /** Seconds (performance.now timebase). */
  now: number
}

/** Draws the game. Reads state, never mutates it. */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D
  private background: CanvasGradient | null = null
  private images: ImageMap = {}
  private fps = 60

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  setImages(images: ImageMap): void {
    this.images = images
  }

  /** Rebuild size-dependent cached resources. */
  resize(viewport: Viewport): void {
    const { width, height } = viewport
    const g = this.ctx.createRadialGradient(
      width / 2,
      height * 0.45,
      0,
      width / 2,
      height * 0.45,
      Math.hypot(width, height) * 0.6,
    )
    g.addColorStop(0, '#5a3418')
    g.addColorStop(0.6, '#2e1a0e')
    g.addColorStop(1, '#140a05')
    this.background = g
  }

  render(state: GameState, viewport: Viewport, frameDelta: number, input: RenderInput): void {
    const ctx = this.ctx
    const { width, height, scale, dpr } = viewport
    const k = dpr * scale

    // Screen shake: random offset that decays over the shake duration.
    let ox = 0
    let oy = 0
    if (state.shakeTime > 0 && state.shakeDuration > 0) {
      const amount = state.shakeStrength * (state.shakeTime / state.shakeDuration)
      ox = (Math.random() * 2 - 1) * amount
      oy = (Math.random() * 2 - 1) * amount
    }
    ctx.setTransform(k, 0, 0, k, ox * k, oy * k)

    ctx.fillStyle = this.background ?? '#1a0f0a'
    ctx.fillRect(-SHAKE_MARGIN, -SHAKE_MARGIN, width + SHAKE_MARGIN * 2, height + SHAKE_MARGIN * 2)

    for (const piece of state.pieces) this.drawPiece(piece)
    for (const snack of state.snacks) this.drawSnack(snack, input.now)
    this.drawParticles(input.particles)
    for (const popup of state.popups) this.drawPopup(popup)
    drawTrails(ctx, input.trails, input.now)

    // Unshaken overlays.
    ctx.setTransform(k, 0, 0, k, 0, 0)
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 226, 180, ${0.85 * state.flash * state.flash})`
      ctx.fillRect(0, 0, width, height)
    }
    if (SHOW_DEBUG_INFO) this.drawDebug(state, input.particles, height, frameDelta)
  }

  private drawSnack(snack: Snack, now: number): void {
    const ctx = this.ctx
    const look = SNACK_LOOKS[snack.type]
    const r = snack.radius
    const image = this.images[snack.type]
    const isUndampori = snack.kind === 'undampori'

    ctx.save()
    ctx.translate(snack.x, snack.y)

    // Pulsing danger ring so the undampori is always recognisable, art or not.
    if (isUndampori) {
      const pulse = 0.55 + 0.35 * Math.sin(now * 10)
      ctx.beginPath()
      ctx.arc(0, 0, r + 7, 0, Math.PI * 2)
      ctx.lineWidth = 5
      ctx.strokeStyle = `rgba(226, 59, 46, ${pulse})`
      ctx.stroke()
    }

    ctx.rotate(snack.rotation)

    if (image) {
      const s = r * IMAGE_SCALE
      ctx.drawImage(image, -s, -s, s * 2, s * 2)
    } else {
      // Placeholder: coloured disc with a stripe so rotation is visible.
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fillStyle = look.fill
      ctx.fill()
      ctx.lineWidth = isUndampori ? 5 : 3
      ctx.strokeStyle = look.accent
      ctx.stroke()

      ctx.fillStyle = look.accent
      ctx.fillRect(-r * 0.6, -r * 0.12, r * 1.2, r * 0.24)

      if (isUndampori) {
        ctx.rotate(-snack.rotation) // keep the warning upright
        ctx.fillStyle = look.accent
        ctx.font = `bold ${Math.round(r)}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('!', 0, 2)
      }
    }

    ctx.restore()
  }

  /** A half: the snack image (or fallback disc) clipped to a half-disc, with a cut face. */
  private drawPiece(piece: Piece): void {
    const ctx = this.ctx
    const look = SNACK_LOOKS[piece.type]
    const r = piece.radius
    const start = piece.side === 0 ? 0 : Math.PI
    const image = this.images[piece.type]

    ctx.save()
    ctx.translate(piece.x, piece.y)
    ctx.rotate(piece.rotation)

    ctx.beginPath()
    ctx.arc(0, 0, image ? r * IMAGE_SCALE : r, start, start + Math.PI)
    ctx.closePath()

    if (image) {
      ctx.save()
      ctx.clip()
      ctx.rotate(piece.imageRotation)
      const s = r * IMAGE_SCALE
      ctx.drawImage(image, -s, -s, s * 2, s * 2)
      ctx.restore()
    } else {
      ctx.fillStyle = look.fill
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = look.accent
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.moveTo(-r + 3, 0)
    ctx.lineTo(r - 3, 0)
    ctx.lineWidth = image ? 3 : 5
    ctx.strokeStyle = look.inside
    ctx.stroke()

    ctx.restore()
  }

  private drawParticles(particles: readonly Particle[]): void {
    const ctx = this.ctx
    for (const p of particles) {
      if (!p.active) continue
      const t = p.life / p.maxLife
      ctx.globalAlpha = Math.min(1, t * 1.5)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * t), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  /** Floating text: pops in with a little overshoot, drifts up and fades out. */
  private drawPopup(popup: Popup): void {
    const ctx = this.ctx
    const t = popup.age / POPUP_LIFETIME
    const pop = Math.min(1, popup.age / 0.12)
    const overshoot = pop < 1 ? pop : 1 + 0.15 * Math.max(0, 1 - (popup.age - 0.12) / 0.15)
    const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
    const isCombo = popup.kind === 'combo'
    const size = (isCombo ? 34 : 44) * (0.6 + 0.4 * overshoot)

    ctx.save()
    ctx.globalAlpha = Math.max(0, alpha)
    ctx.translate(popup.x, popup.y - t * 40)
    ctx.font = `800 ${Math.round(size)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 6
    ctx.strokeStyle = 'rgba(20, 10, 5, 0.85)'
    ctx.strokeText(popup.text, 0, 0)
    ctx.fillStyle = isCombo ? '#ffd166' : '#ff5a4a'
    ctx.fillText(popup.text, 0, 0)
    ctx.restore()
  }

  private drawDebug(
    state: GameState,
    particles: readonly Particle[],
    height: number,
    frameDelta: number,
  ): void {
    const ctx = this.ctx
    if (frameDelta > 0) this.fps += (1 / frameDelta - this.fps) * 0.05
    let liveParticles = 0
    for (const p of particles) if (p.active) liveParticles++
    ctx.fillStyle = 'rgba(255, 244, 224, 0.5)'
    ctx.font = '14px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(
      `${Math.round(this.fps)} fps · ${state.snacks.length} live · ${state.pieces.length} pieces · ` +
        `${liveParticles} particles`,
      8,
      height - 8,
    )
  }
}
