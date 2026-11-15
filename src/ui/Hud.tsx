import { STARTING_LIVES } from '../game/utils/constants'
import { SoundToggle } from './SoundToggle'

interface HudProps {
  score: number
  highScore: number
  lives: number
  muted: boolean
  onPause: () => void
  onToggleMute: () => void
}

/** In-game overlay: score, best, lives and the pause button. */
export function Hud({ score, highScore, lives, muted, onPause, onToggleMute }: HudProps) {
  return (
    <div className="hud">
      <div className="hud-score" aria-live="polite">
        {/* key restarts the bump animation on every change */}
        <span key={score} className="hud-score-value">
          {score}
        </span>
        <span className="hud-best">Best {highScore}</span>
      </div>

      <div className="hud-right">
        <div className="hud-lives" role="img" aria-label={`${lives} of ${STARTING_LIVES} lives left`}>
          {Array.from({ length: STARTING_LIVES }, (_, i) => (
            <span key={i} className={i < lives ? 'life' : 'life life-lost'} aria-hidden="true">
              {i < lives ? '' : '✕'}
            </span>
          ))}
        </div>
        <SoundToggle muted={muted} onToggle={onToggleMute} variant="icon" />
        <button className="hud-button" onClick={onPause} aria-label="Pause" title="Pause (Esc)">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
            <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  )
}
