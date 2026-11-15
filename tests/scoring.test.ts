import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState, toSnapshot } from '../src/game/core/state'
import type { GameState } from '../src/game/core/types'
import type { Snack } from '../src/game/entities/types'
import {
  comboBonus,
  processOffscreen,
  registerMiss,
  registerSlice,
  registerUndamporiHit,
  settleCombo,
} from '../src/game/systems/ScoreSystem'
import { findSlices, type SliceHit } from '../src/game/systems/SliceSystem'
import {
  BASE_SLICE_SCORE,
  COMBO_MIN,
  COMBO_WINDOW,
  STARTING_LIVES,
} from '../src/game/utils/constants'

const BOTTOM = 720
const WIDTH = 1280

function makeSnack(overrides: Partial<Snack> = {}): Snack {
  return {
    id: 1,
    kind: 'snack',
    type: 'parippuvada',
    radius: 40,
    x: 300,
    y: 300,
    vx: 0,
    vy: 100,
    rotation: 0,
    angularVelocity: 0,
    active: true,
    sliced: false,
    missed: false,
    ...overrides,
  }
}

/** Slice at a given game time. */
function sliceAt(state: GameState, time: number) {
  state.elapsedTime = time
  registerSlice(state, 100, 100)
}

let state: GameState
beforeEach(() => {
  state = createInitialState('playing')
})

describe('slice scoring', () => {
  it('awards base points per slice', () => {
    sliceAt(state, 1)
    expect(state.score).toBe(BASE_SLICE_SCORE)
    expect(state.slicedCount).toBe(1)
  })

  it('a snack scores only once, even if swiped again', () => {
    const snack = makeSnack({ vy: 0 })
    const hits: SliceHit[] = []
    const swipe = { ax: 0, ay: 300, bx: 600, by: 300, time: 0 }
    for (let i = 0; i < 3; i++) {
      hits.length = 0
      findSlices([swipe], [snack], 0, hits)
      for (const h of hits) registerSlice(state, h.snack.x, h.snack.y)
    }
    expect(state.score).toBe(BASE_SLICE_SCORE)
  })

  it('keeps the high score in sync live', () => {
    state = createInitialState('playing', 2)
    sliceAt(state, 1)
    sliceAt(state, 2)
    expect(state.highScore).toBe(2)
    sliceAt(state, 3)
    expect(state.highScore).toBe(3)
    expect(toSnapshot(state).isNewBest).toBe(true)
  })

  it('ignores slices when not playing', () => {
    state.status = 'paused'
    sliceAt(state, 1)
    expect(state.score).toBe(0)
  })
})

describe('combos', () => {
  it(`gives a bonus for ${COMBO_MIN}+ quick slices once the window closes`, () => {
    sliceAt(state, 1.0)
    sliceAt(state, 1.1)
    sliceAt(state, 1.2)
    expect(state.combo).toBe(3)

    // Still inside the window: not settled yet.
    state.elapsedTime = 1.2 + COMBO_WINDOW
    expect(settleCombo(state)).toBeNull()

    state.elapsedTime = 1.2 + COMBO_WINDOW + 0.01
    const result = settleCombo(state)
    expect(result).toMatchObject({ count: 3, bonus: comboBonus(3) })
    expect(state.score).toBe(3 * BASE_SLICE_SCORE + comboBonus(3))
    expect(state.bestCombo).toBe(3)
    expect(state.combo).toBe(0)
  })

  it('a gap of exactly the window still chains; just over breaks it', () => {
    sliceAt(state, 1)
    sliceAt(state, 1 + COMBO_WINDOW)
    expect(state.combo).toBe(2)
    sliceAt(state, 1 + 2 * COMBO_WINDOW + 0.001)
    expect(state.combo).toBe(1)
  })

  it('chains shorter than the minimum give no bonus', () => {
    sliceAt(state, 1)
    sliceAt(state, 1.1)
    state.elapsedTime = 5
    expect(settleCombo(state)).toBeNull()
    expect(state.score).toBe(2 * BASE_SLICE_SCORE)
    expect(state.combo).toBe(0)
  })

  it('bonus is awarded only once per combo', () => {
    for (let i = 0; i < 4; i++) sliceAt(state, 1 + i * 0.1)
    state.elapsedTime = 5
    settleCombo(state)
    const scoreAfter = state.score
    expect(settleCombo(state)).toBeNull()
    expect(state.score).toBe(scoreAfter)
  })

  it('no combo bonus after the round has ended', () => {
    for (let i = 0; i < 4; i++) sliceAt(state, 1 + i * 0.1)
    registerUndamporiHit(state)
    state.elapsedTime = 5
    expect(settleCombo(state)).toBeNull()
    expect(state.score).toBe(4 * BASE_SLICE_SCORE)
  })
})

describe('lives and game over', () => {
  it('each miss costs one life; running out ends the round', () => {
    for (let i = 1; i < STARTING_LIVES; i++) {
      registerMiss(state)
      expect(state.lives).toBe(STARTING_LIVES - i)
      expect(state.status).toBe('playing')
    }
    registerMiss(state)
    expect(state.lives).toBe(0)
    expect(state.status).toBe('gameover')
    expect(state.gameOverReason).toBe('lives')

    registerMiss(state) // after game over: no effect
    expect(state.lives).toBe(0)
  })

  it('slicing an undampori is immediate game over', () => {
    registerUndamporiHit(state)
    expect(state.status).toBe('gameover')
    expect(state.gameOverReason).toBe('undampori')
    expect(state.lives).toBe(STARTING_LIVES)
  })

  it('a snack falling offscreen costs a life exactly once', () => {
    const snack = makeSnack({ y: BOTTOM + 100 })
    state.snacks.push(snack)
    processOffscreen(state, BOTTOM, WIDTH)
    processOffscreen(state, BOTTOM, WIDTH)
    snack.active = true // even if something re-activated it
    processOffscreen(state, BOTTOM, WIDTH)
    expect(state.lives).toBe(STARTING_LIVES - 1)
    expect(state.missedCount).toBe(1)
    expect(state.popups).toHaveLength(1)
  })

  it('sliced snacks and undamporis never cost lives', () => {
    state.snacks.push(
      makeSnack({ id: 1, y: BOTTOM + 100, sliced: true }),
      makeSnack({ id: 2, y: BOTTOM + 100, kind: 'undampori', type: 'undampori' }),
    )
    processOffscreen(state, BOTTOM, WIDTH)
    expect(state.lives).toBe(STARTING_LIVES)
  })

  it('still-rising snacks below the screen are not misses', () => {
    state.snacks.push(makeSnack({ y: BOTTOM + 100, vy: -500 }))
    processOffscreen(state, BOTTOM, WIDTH)
    expect(state.lives).toBe(STARTING_LIVES)
    expect(state.snacks[0].active).toBe(true)
  })

  it('a fresh round resets everything but keeps the high score', () => {
    sliceAt(state, 1)
    registerMiss(state)
    const next = createInitialState('playing', state.highScore)
    expect(next).toMatchObject({
      score: 0,
      lives: STARTING_LIVES,
      combo: 0,
      highScore: 1,
      gameOverReason: null,
      slicedCount: 0,
      missedCount: 0,
    })
    expect(next.snacks).toHaveLength(0)
    expect(toSnapshot(next).isNewBest).toBe(false)
  })
})
