// All tunable game values live here so balancing never needs edits in multiple modules.

// ---- Display ----

/** The shorter side of the screen always spans this many world units. */
export const WORLD_SHORT_SIDE = 720

/** Upper bound for devicePixelRatio, to keep fill-rate sane on very dense screens. */
export const MAX_DEVICE_PIXEL_RATIO = 2

/** Cartoon display font for canvas text (bundled via @fontsource; see main.tsx). */
export const DISPLAY_FONT = '"Luckiest Guy", "Fredoka Variable", system-ui, sans-serif'

/** Draw an FPS / entity counter in development builds. */
export const SHOW_DEBUG_INFO = import.meta.env.DEV

// ---- Loop ----

/** Fixed physics step (seconds). */
export const PHYSICS_STEP = 1 / 60

/** Largest frame delta accepted (seconds); larger gaps (e.g. tab inactive) are clamped. */
export const MAX_FRAME_DELTA = 0.25

/** Max physics steps per animation frame before dropping the backlog. */
export const MAX_STEPS_PER_FRAME = 5

// ---- Rules ----

export const STARTING_LIVES = 3

/** Points for each snack sliced. */
export const BASE_SLICE_SCORE = 1

/** Max gap between consecutive slices for them to chain into a combo (s). */
export const COMBO_WINDOW = 0.25

/** Smallest chain that counts as a combo. */
export const COMBO_MIN = 3

/** Bonus points per snack in a combo (a 4× combo gives 4 × this). */
export const COMBO_BONUS_PER_SNACK = 1

/** How long combo / miss popups stay on screen (s). */
export const POPUP_LIFETIME = 0.9

// ---- Physics ----

/**
 * Gravity (world units / s²) for a 720-unit-tall world. Scaled with world height,
 * so flight time feels the same in landscape and portrait.
 */
export const GRAVITY = 1100

/** Launch apex, as a fraction of world height measured from the bottom. */
export const APEX_MIN = 0.55
export const APEX_MAX = 0.85

/** Launch x positions, as fractions of world width. */
export const LAUNCH_X_MIN = 0.12
export const LAUNCH_X_MAX = 0.88

/** Where launches aim to be (horizontally) at their apex, as fractions of world width. */
export const APEX_X_MIN = 0.25
export const APEX_X_MAX = 0.75

/** Spin speed range (radians / s); direction is random. */
export const SPIN_MIN = 1
export const SPIN_MAX = 4

// ---- Spawning / difficulty ----

/** Seconds of play until difficulty maxes out. */
export const DIFFICULTY_RAMP_SECONDS = 120

/** Delay before the first wave of a round (s). */
export const FIRST_WAVE_DELAY = 0.8

/** Seconds between waves at the easiest / hardest difficulty. */
export const WAVE_INTERVAL_START = 2.4
export const WAVE_INTERVAL_END = 1.0

/** Snacks per wave: [min, max] at the start, max grows to WAVE_SIZE_MAX_END. */
export const WAVE_SIZE_MIN = 1
export const WAVE_SIZE_MAX_START = 3
export const WAVE_SIZE_MAX_END = 6

/** Stagger between launches inside one wave (s). */
export const WAVE_STAGGER_MIN = 0.08
export const WAVE_STAGGER_MAX = 0.3

/** Chance a wave includes an undampori, at the easiest / hardest difficulty. */
export const UNDAMPORI_CHANCE_START = 0.12
export const UNDAMPORI_CHANCE_END = 0.35

// ---- Input / slicing ----

/** How long a swipe-trail point stays visible (s). */
export const TRAIL_LIFETIME = 0.13

/** Trail thickness at its newest point (world units). */
export const TRAIL_WIDTH = 12

/** Cap on stored points per stroke (keeps memory bounded on long drags). */
export const MAX_TRAIL_POINTS = 64

/** Pointer moves shorter than this (world units) are ignored. */
export const MIN_SWIPE_STEP = 0.5

/** Extra hit radius for forgiving slices (world units). */
export const SLICE_PADDING = 6

// ---- Sliced pieces ----

/** Speed at which the two halves push apart, perpendicular to the cut (units / s). */
export const PIECE_SPLIT_SPEED = 170

/** Fraction of the whole snack's velocity each half keeps. */
export const PIECE_VELOCITY_INHERIT = 0.6

/** Extra spin range for halves (rad / s). */
export const PIECE_SPIN_MIN = 2
export const PIECE_SPIN_MAX = 6

/** Hard cap on live halves; the oldest are dropped first. */
export const MAX_PIECES = 60

// ---- Juice / effects ----

/** Size of the reusable particle pool; the oldest particle is recycled when full. */
export const MAX_PARTICLES = 300

/** Particles per sliced snack. */
export const JUICE_PARTICLES = 14

/** Particles in an undampori explosion. */
export const EXPLOSION_PARTICLES = 60

/** Fraction of world gravity applied to particles. */
export const PARTICLE_GRAVITY_SCALE = 0.6

/** Screen shake when an undampori is sliced. */
export const SHAKE_DURATION = 0.5
export const SHAKE_STRENGTH = 16

/** How long the explosion flash takes to fade (s). */
export const FLASH_DURATION = 0.45

// ---- Audio ----

export const MASTER_VOLUME = 0.6

/** Optional sound files: public/assets/sounds/<name>.mp3 (synthesised if missing). */
export const SOUND_NAMES = ['slice', 'combo', 'miss', 'undampori'] as const
export type SoundName = (typeof SOUND_NAMES)[number]

// ---- Assets ----

/** A snack image's longest side is drawn at 2 × radius × this (aspect ratio is kept). */
export const IMAGE_SCALE = 1.1

/** Images are cropped to their visible pixels and downscaled to at most this many px. */
export const SPRITE_MAX_PX = 320

/**
 * Optional background image: public/assets/background/background.<ext>,
 * tried in this order. Falls back to the drawn gradient.
 */
export const BACKGROUND_EXTENSIONS = ['jpg', 'png', 'webp'] as const

/** Dark overlay on the background image (0–1) so snacks stand out. */
export const BACKGROUND_DIM = 0.3

/**
 * Optional foreground strip: public/assets/foreground/foreground.<ext>, tried in this order.
 * Drawn full-width, anchored to the bottom, in front of the snacks.
 */
export const FOREGROUND_EXTENSIONS = ['png', 'webp', 'jpg'] as const

/** Max share of the screen height the foreground may cover; taller images overflow off the bottom. */
export const FOREGROUND_MAX_HEIGHT = 1

// ---- Entities ----

export const SNACK_TYPES = [
  'pazhampori',
  'parippuvada',
  'achappam',
  'arimurukku'
] as const
export type SnackType = (typeof SNACK_TYPES)[number]

interface Look {
  radius: number
  /** Fallback colours until images are provided. */
  fill: string
  accent: string
  /** Colour of the cut face on sliced halves. */
  inside: string
}

export const SNACK_LOOKS: Record<SnackType | 'undampori', Look> = {
  pazhampori: { radius: 44, fill: '#e8a33d', accent: '#b8701c', inside: '#f7e08a' },
  parippuvada: { radius: 40, fill: '#c98a3c', accent: '#8a5a22', inside: '#e2b56a' },
  achappam: { radius: 42, fill: '#f0c96a', accent: '#c99a3a', inside: '#fff1c4' },
  arimurukku: { radius: 42, fill: '#d99a4e', accent: '#9c6428', inside: '#f3e3c3' },
  undampori: { radius: 42, fill: '#3a2418', accent: '#e23b2e', inside: '#f2d9a0' },
}
