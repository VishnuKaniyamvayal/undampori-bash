import { loadBackground, loadImages } from '../assets/AssetLoader'
import { Renderer } from '../rendering/Renderer'
import { AudioSystem } from '../systems/AudioSystem'
import { startFlash, startShake, updateEffects } from '../systems/EffectsSystem'
import { InputSystem } from '../systems/InputSystem'
import { emitExplosion, emitJuice, ParticlePool } from '../systems/ParticleSystem'
import { integrateAll, pruneInPlace } from '../systems/PhysicsSystem'
import {
  addPopup,
  processOffscreen,
  registerSlice,
  registerUndamporiHit,
  settleCombo,
  updatePopups,
} from '../systems/ScoreSystem'
import { findSlices, spawnHalves, type SliceHit } from '../systems/SliceSystem'
import { SpawnSystem } from '../systems/SpawnSystem'
import {
  GRAVITY,
  MAX_DEVICE_PIXEL_RATIO,
  SHAKE_DURATION,
  SHAKE_STRENGTH,
  SLICE_PADDING,
  SNACK_LOOKS,
  SNACK_TYPES,
  WORLD_SHORT_SIDE,
} from '../utils/constants'
import { loadHighScore, loadMuted, saveHighScore, saveMuted } from '../utils/storage'
import { EventBus } from './EventBus'
import { GameLoop } from './GameLoop'
import { createInitialState, snapshotsEqual, toSnapshot } from './state'
import type { GameState, Point, UiSnapshot, Viewport } from './types'

type GameEvents = {
  change: UiSnapshot
}

/**
 * Owns the canvas, the loop and the authoritative game state.
 * Framework-agnostic: React talks to it through methods + the `change` event.
 */
export class Game {
  readonly events = new EventBus<GameEvents>()
  readonly viewport: Viewport = { width: WORLD_SHORT_SIDE, height: WORLD_SHORT_SIDE, scale: 1, dpr: 1 }

  private readonly canvas: HTMLCanvasElement
  private readonly loop: GameLoop
  private readonly renderer: Renderer
  private readonly resizeObserver: ResizeObserver
  private readonly input: InputSystem
  private readonly audio: AudioSystem
  private readonly spawner = new SpawnSystem()
  private readonly particles = new ParticlePool()
  /** Reused every step to avoid per-frame allocation. */
  private readonly hits: SliceHit[] = []
  private readonly reducedMotion: MediaQueryList | null
  private state: GameState
  private snapshot: UiSnapshot
  private savedHighScore: number
  private muted: boolean
  private loading = true
  private destroyed = false

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context is not available')
    this.canvas = canvas

    this.savedHighScore = loadHighScore()
    this.muted = loadMuted()
    this.state = createInitialState('menu', this.savedHighScore)
    this.snapshot = this.makeSnapshot()

    this.renderer = new Renderer(ctx)
    this.audio = new AudioSystem(this.muted)
    this.input = new InputSystem(canvas, (x, y) => this.toWorld(x, y))
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: (frameDelta) => this.render(frameDelta),
    })
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    document.addEventListener('visibilitychange', this.onVisibilityChange)

    this.resize()
    this.loop.start()

    // Preload art before play; missing images fall back to drawn shapes.
    void Promise.all([loadImages(), loadBackground()]).then(([images, background]) => {
      if (this.destroyed) return
      this.renderer.setImages(images)
      this.renderer.setBackgroundImage(background)
      // Don't mix real art with placeholder shapes: if any snack has an image,
      // only launch snacks that have one.
      this.spawner.setSnackTypes(SNACK_TYPES.filter((type) => images[type]))
      this.loading = false
      this.publish()
    })
  }

  // ---- React integration (useSyncExternalStore) ----

  getSnapshot = (): UiSnapshot => this.snapshot

  subscribe = (onChange: () => void): (() => void) => this.events.on('change', onChange)

  // ---- Scene transitions (called from UI events, which also unlock audio) ----

  start(): void {
    this.audio.unlock()
    this.persistHighScore()
    this.state = createInitialState('playing', this.state.highScore)
    this.spawner.reset()
    this.particles.clear()
    this.input.clear()
    this.loop.resetTiming()
    this.publish()
  }

  restart(): void {
    this.start()
  }

  pause(): void {
    if (this.state.status !== 'playing') return
    this.state.status = 'paused'
    this.persistHighScore()
    this.publish()
  }

  resume(): void {
    if (this.state.status !== 'paused') return
    this.audio.unlock()
    this.state.status = 'playing'
    this.loop.resetTiming()
    this.publish()
  }

  togglePause(): void {
    if (this.state.status === 'playing') this.pause()
    else if (this.state.status === 'paused') this.resume()
  }

  goToMenu(): void {
    this.persistHighScore()
    this.state = createInitialState('menu', this.state.highScore)
    this.particles.clear()
    this.publish()
  }

  toggleMute(): void {
    this.muted = !this.muted
    this.audio.unlock()
    this.audio.setMuted(this.muted)
    saveMuted(this.muted)
    this.publish()
  }

  destroy(): void {
    this.destroyed = true
    this.persistHighScore()
    this.loop.stop()
    this.input.destroy()
    this.audio.destroy()
    this.resizeObserver.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.events.clear()
  }

  /** Convert client (CSS pixel) coordinates to world coordinates. */
  toWorld(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / this.viewport.scale,
      y: (clientY - rect.top) / this.viewport.scale,
    }
  }

  // ---- Internals ----

  private update(dt: number): void {
    const state = this.state
    // After game over the world keeps moving (explosion, falling halves) behind the overlay,
    // but nothing spawns, slices or scores.
    if (state.status !== 'playing' && state.status !== 'gameover') return
    const playing = state.status === 'playing'
    const gravity = this.gravity()

    if (playing) {
      state.elapsedTime += dt
      this.spawner.update(dt, state.elapsedTime, this.viewport, gravity, state.snacks)
    }
    integrateAll(state.snacks, dt, gravity)
    integrateAll(state.pieces, dt, gravity)

    if (playing) {
      this.resolveSlices()
      const combo = settleCombo(state)
      if (combo) {
        const y = Math.max(combo.y - 60, 60)
        addPopup(state, 'combo', `${combo.count}× combo  +${combo.bonus}`, combo.x, y)
        this.audio.play('combo', combo.count)
      }
    }

    const missesBefore = state.missedCount
    processOffscreen(state, this.viewport.height, this.viewport.width)
    if (state.missedCount > missesBefore) this.audio.play('miss')

    updatePopups(state, dt)
    this.particles.update(dt, gravity)
    updateEffects(state, dt)
    pruneInPlace(state.snacks, (s) => s.active)
    pruneInPlace(state.pieces, (p) => p.active)

    if (playing && state.status === 'gameover') this.persistHighScore()
    this.publish()
  }

  /** Consume queued swipe segments and apply what they cut. */
  private resolveSlices(): void {
    const state = this.state
    const hits = this.hits
    hits.length = 0
    findSlices(this.input.pendingSegments, state.snacks, SLICE_PADDING, hits)
    this.input.clearSegments()
    if (hits.length === 0) return

    let slicedSnack = false
    for (const hit of hits) {
      const snack = hit.snack
      snack.active = false
      spawnHalves(hit, state.pieces)

      if (snack.kind === 'undampori') {
        registerUndamporiHit(state)
        emitExplosion(this.particles, snack.x, snack.y)
        startFlash(state)
        if (!this.reducedMotion?.matches) startShake(state, SHAKE_DURATION, SHAKE_STRENGTH)
        this.audio.play('undampori')
      } else {
        registerSlice(state, snack.x, snack.y)
        const look = SNACK_LOOKS[snack.type]
        emitJuice(this.particles, snack.x, snack.y, [look.inside, look.fill])
        slicedSnack = true
      }
    }
    // One swish per step, even when a swipe cuts several snacks at once.
    if (slicedSnack) this.audio.play('slice')
  }

  /** Gravity scaled to world height so flight time is the same in any orientation. */
  private gravity(): number {
    return GRAVITY * (this.viewport.height / WORLD_SHORT_SIDE)
  }

  private render(frameDelta: number): void {
    const now = performance.now() / 1000
    this.input.pruneTrail(now)
    this.renderer.render(this.state, this.viewport, frameDelta, {
      trails: this.input.strokes,
      particles: this.particles.items,
      now,
    })
  }

  private resize(): void {
    const cssWidth = Math.max(1, this.canvas.clientWidth)
    const cssHeight = Math.max(1, this.canvas.clientHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO)
    const scale = Math.min(cssWidth, cssHeight) / WORLD_SHORT_SIDE

    this.canvas.width = Math.round(cssWidth * dpr)
    this.canvas.height = Math.round(cssHeight * dpr)

    this.viewport.width = cssWidth / scale
    this.viewport.height = cssHeight / scale
    this.viewport.scale = scale
    this.viewport.dpr = dpr

    this.renderer.resize(this.viewport)
    // Resizing clears the canvas; redraw immediately to avoid a flash.
    this.render(0)
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.pause()
      this.persistHighScore()
    }
    this.loop.resetTiming()
  }

  private persistHighScore(): void {
    if (this.state.highScore <= this.savedHighScore) return
    this.savedHighScore = this.state.highScore
    saveHighScore(this.savedHighScore)
  }

  private makeSnapshot(): UiSnapshot {
    return toSnapshot(this.state, { muted: this.muted, loading: this.loading })
  }

  /** Emit a new UI snapshot if anything React cares about changed. */
  private publish(): void {
    // Swipes only count while playing; leaving that state drops any in-progress swipe.
    this.input.setEnabled(this.state.status === 'playing')
    const next = this.makeSnapshot()
    if (snapshotsEqual(next, this.snapshot)) return
    this.snapshot = next
    this.events.emit('change', next)
  }
}
