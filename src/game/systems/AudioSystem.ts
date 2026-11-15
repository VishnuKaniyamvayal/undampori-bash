import { MASTER_VOLUME, SOUND_NAMES, type SoundName } from '../utils/constants'

const BASE = import.meta.env.BASE_URL

/** Fetch an optional sound file; null if missing (dev servers may answer with HTML). */
async function fetchSound(name: SoundName): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${BASE}assets/sounds/${name}.mp3`)
    if (!res.ok || res.headers.get('content-type')?.includes('text/html')) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

type AudioContextCtor = typeof AudioContext

/**
 * Web Audio sound effects. Uses public/assets/sounds/<name>.mp3 when present,
 * otherwise synthesises a fallback. The AudioContext is created on the first
 * user gesture (`unlock`) to satisfy browser autoplay rules.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private readonly buffers = new Map<SoundName, AudioBuffer>()
  /** Files are downloaded up front; decoding waits for the AudioContext. */
  private readonly files = new Map<SoundName, Promise<ArrayBuffer | null>>()
  private muted: boolean

  constructor(muted: boolean) {
    this.muted = muted
    for (const name of SOUND_NAMES) this.files.set(name, fetchSound(name))
  }

  /** Call from a user gesture (click / key / tap). Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME
      this.master.connect(ctx.destination)
      this.noise = createNoiseBuffer(ctx)
      void this.decodeFiles(ctx)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.02)
    }
  }

  /** `intensity` lets sounds vary, e.g. combo size. */
  play(name: SoundName, intensity = 0): void {
    const { ctx, master } = this
    if (this.muted || !ctx || !master || ctx.state !== 'running') return

    const buffer = this.buffers.get(name)
    if (buffer) {
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.playbackRate.value =
        name === 'combo' ? 1 + Math.min(intensity, 10) * 0.04 : 0.95 + Math.random() * 0.1
      src.connect(master)
      src.start()
      return
    }

    switch (name) {
      case 'slice':
        this.synthSlice(ctx, master)
        break
      case 'combo':
        this.synthCombo(ctx, master, intensity)
        break
      case 'miss':
        tone(ctx, master, 'triangle', 320, 110, ctx.currentTime, 0.3, 0.35)
        break
      case 'undampori':
        this.synthExplosion(ctx, master)
        break
    }
  }

  destroy(): void {
    void this.ctx?.close()
    this.ctx = null
    this.master = null
  }

  private async decodeFiles(ctx: AudioContext): Promise<void> {
    for (const [name, file] of this.files) {
      const data = await file
      if (!data) continue
      try {
        this.buffers.set(name, await ctx.decodeAudioData(data))
      } catch {
        // Not a valid audio file: keep the synthesised fallback.
      }
    }
  }

  /** Quick filtered-noise "swish". */
  private synthSlice(ctx: AudioContext, out: AudioNode): void {
    if (!this.noise) return
    const t = ctx.currentTime
    const pitch = 0.85 + Math.random() * 0.3

    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.4
    filter.frequency.setValueAtTime(5200 * pitch, t)
    filter.frequency.exponentialRampToValueAtTime(900 * pitch, t + 0.13)
    const gain = envelope(ctx, t, 0.005, 0.15, 0.55)

    src.connect(filter).connect(gain).connect(out)
    src.start(t, Math.random() * 0.5)
    src.stop(t + 0.18)
  }

  /** Rising arpeggio; bigger combos start higher. */
  private synthCombo(ctx: AudioContext, out: AudioNode, count: number): void {
    const base = 523.25 * Math.pow(2, Math.min(Math.max(count - 3, 0), 7) / 12)
    const t = ctx.currentTime
    ;[0, 4, 7, 12].forEach((semitones, i) => {
      const f = base * Math.pow(2, semitones / 12)
      tone(ctx, out, 'triangle', f, f, t + i * 0.06, 0.14, 0.28)
    })
  }

  /** Noise blast plus a low thump. */
  private synthExplosion(ctx: AudioContext, out: AudioNode): void {
    if (!this.noise) return
    const t = ctx.currentTime

    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2200, t)
    filter.frequency.exponentialRampToValueAtTime(160, t + 0.8)
    const gain = envelope(ctx, t, 0.005, 0.9, 0.9)
    src.connect(filter).connect(gain).connect(out)
    src.start(t)
    src.stop(t + 0.95)

    tone(ctx, out, 'sine', 110, 32, t, 0.6, 0.9)
  }
}

/** Gain node with a fast attack and exponential decay. */
function envelope(ctx: AudioContext, t: number, attack: number, decay: number, peak: number): GainNode {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.linearRampToValueAtTime(peak, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  return gain
}

function tone(
  ctx: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  fromHz: number,
  toHz: number,
  t: number,
  duration: number,
  volume: number,
): void {
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(fromHz, t)
  if (toHz !== fromHz) osc.frequency.exponentialRampToValueAtTime(toHz, t + duration)
  const gain = envelope(ctx, t, 0.01, duration, volume)
  osc.connect(gain).connect(out)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}
