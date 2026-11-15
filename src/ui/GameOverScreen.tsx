import type { GameOverReason } from '../game/core/types'

interface GameOverScreenProps {
  score: number
  highScore: number
  isNewBest: boolean
  slicedCount: number
  bestCombo: number
  reason: GameOverReason | null
  onRestart: () => void
  onMenu: () => void
}

const REASON_TEXT: Record<GameOverReason, string> = {
  undampori: 'You sliced the undampori!',
  lives: 'Too many snacks fell.',
}

export function GameOverScreen({
  score,
  highScore,
  isNewBest,
  slicedCount,
  bestCombo,
  reason,
  onRestart,
  onMenu,
}: GameOverScreenProps) {
  return (
    // Delayed fade-in lets the explosion / last miss play out first.
    <div className="overlay overlay-delayed">
      <div className="panel">
        <h2 className="heading">Game over</h2>
        {reason && <p className="subtitle">{REASON_TEXT[reason]}</p>}

        <p className="score-line">
          Score <strong>{score}</strong>
        </p>
        {isNewBest ? (
          <p className="new-best">New best!</p>
        ) : (
          <p className="stat-line">Best {highScore}</p>
        )}
        <p className="stat-line">
          {slicedCount} sliced · best combo {bestCombo > 0 ? `${bestCombo}×` : '—'}
        </p>

        <button className="btn btn-primary" onClick={onRestart} autoFocus>
          Play again
        </button>
        <button className="btn" onClick={onMenu}>
          Main menu
        </button>
      </div>
    </div>
  )
}
