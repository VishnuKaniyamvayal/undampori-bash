import { useSyncExternalStore } from 'react'
import type { Game } from '../game/core/Game'
import { createInitialState, toSnapshot } from '../game/core/state'
import type { UiSnapshot } from '../game/core/types'

const INITIAL_SNAPSHOT: UiSnapshot = toSnapshot(createInitialState('menu'))
const noopSubscribe = () => () => {}
const getInitialSnapshot = () => INITIAL_SNAPSHOT

/** Subscribe a component to the game's UI snapshot. Re-renders only when it changes. */
export function useGameSnapshot(game: Game | null): UiSnapshot {
  return useSyncExternalStore(
    game ? game.subscribe : noopSubscribe,
    game ? game.getSnapshot : getInitialSnapshot,
  )
}
