import { fitContain, type ImageMap, type Sprite } from '../assets/AssetLoader'
import type { GameState, Popup, Viewport } from '../core/types'
import type { Particle, Piece, Snack } from '../entities/types'
import type { TrailStroke } from '../systems/InputSystem'
import {
  BACKGROUND_DIM,
  IMAGE_SCALE,
  POPUP_LIFETIME,
  SHOW_DEBUG_INFO,
  SNACK_LOOKS,
} from '../utils/constants'
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
  private backgroundImage: HTMLImageElement | null = null
  /** Background image pre-rendered (cover-fit + dim) at screen resolution; rebuilt on resize. */
  private backgroundCache: HTMLCanvasElement | null = null
  private lastViewport: Viewport | null = null
  private images: ImageMap = {}
  private fps = 60

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  setImages(images: ImageMap): void {
    this.images = images
  }

  setBackgroundImage(image: HTMLImageElement | null): void {
    this.backgroundImage = image
    if (this.lastViewport) this.resize(this.lastViewport)
  }

  /** Rebuild size-dependent cached resources. */
  resize(viewport: Viewport): void {
    this.lastViewport = viewport
    this.backgroundCache = this.backgroundImage ? this.buildBackground(this.backgroundImage, viewport) : null
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

    const bgW = width + SHAKE_MARGIN * 2
    const bgH = height + SHAKE_MARGIN * 2
    if (this.backgroundCache) {
      ctx.drawImage(this.backgroundCache, -SHAKE_MARGIN, -SHAKE_MARGIN, bgW, bgH)
    } else {
      ctx.fillStyle = this.background ?? '#1a0f0a'
      ctx.fillRect(-SHAKE_MARGIN, -SHAKE_MARGIN, bgW, bgH)
    }

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

  /**
   * Draw the image "cover"-fitted (fills the screen, keeps aspect ratio, crops overflow)
   * plus the dim overlay, once, into a screen-sized canvas. Drawing that each frame is cheap.
   */
  private buildBackground(image: HTMLImageElement, viewport: Viewport): HTMLCanvasElement | null {
    const k = viewport.scale * viewport.dpr
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((viewport.width + SHAKE_MARGIN * 2) * k))
    canvas.height = Math.max(1, Math.round((viewport.height + SHAKE_MARGIN * 2) * k))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const cover = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
    const w = image.naturalWidth * cover
    const h = image.naturalHeight * cover
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)

    if (BACKGROUND_DIM > 0) {
      ctx.fillStyle = `rgba(10, 5, 2, ${BACKGROUND_DIM})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    return canvas
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
      this.drawSprite(image, r)
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

  /** Draw a sprite centred on the origin, longest side = 2r × IMAGE_SCALE, aspect ratio kept. */
  private drawSprite(sprite: Sprite, r: number): void {
    const size = fitContain(sprite.width, sprite.height, r * 2 * IMAGE_SCALE)
    this.ctx.drawImage(sprite.source, -size.width / 2, -size.height / 2, size.width, size.height)
  }

  /**
   * A half of a sliced snack. With art: the whole sprite clipped by a straight cut
   * (a half-plane, so no corners are lost and no seam line is drawn).
   * Without art: a half-disc with a lighter cut face.
   */
  private drawPiece(piece: Piece): void {
    const ctx = this.ctx
    const r = piece.radius
    const image = this.images[piece.type]

    ctx.save()
    ctx.translate(piece.x, piece.y)
    ctx.rotate(piece.rotation)

    if (image) {
      // Local +y is side 0's half; R comfortably covers the sprite's corners.
      const R = r * IMAGE_SCALE * 1.5
      ctx.beginPath()
      ctx.rect(-R, piece.side === 0 ? 0 : -R, R * 2, R)
      ctx.clip()
      ctx.rotate(piece.imageRotation)
      this.drawSprite(image, r)
    } else {
      const look = SNACK_LOOKS[piece.type]
      const start = piece.side === 0 ? 0 : Math.PI
      ctx.beginPath()
      ctx.arc(0, 0, r, start, start + Math.PI)
      ctx.closePath()
      ctx.fillStyle = look.fill
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = look.accent
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(-r + 3, 0)
      ctx.lineTo(r - 3, 0)
      ctx.lineWidth = 5
      ctx.strokeStyle = look.inside
      ctx.stroke()
    }

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
