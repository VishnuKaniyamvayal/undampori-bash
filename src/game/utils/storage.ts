// localStorage helpers that never throw: private mode, blocked storage or a
// missing `localStorage` (tests, SSR) all fall back to defaults.

const PREFIX = 'undampori-bash:'

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function read(key: string): string | null {
  try {
    return storage()?.getItem(PREFIX + key) ?? null
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    storage()?.setItem(PREFIX + key, value)
  } catch {
    // Quota exceeded / blocked: preferences just won't persist.
  }
}

export function loadHighScore(): number {
  const raw = read('highScore')
  if (raw === null) return 0
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

export function saveHighScore(score: number): void {
  write('highScore', String(Math.max(0, Math.floor(score))))
}

export function loadMuted(): boolean {
  return read('muted') === 'true'
}

export function saveMuted(muted: boolean): void {
  write('muted', String(muted))
}
