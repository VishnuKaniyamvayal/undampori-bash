import { SoundToggle } from './SoundToggle'

interface MenuScreenProps {
  loading: boolean
  highScore: number
  muted: boolean
  onStart: () => void
  onToggleMute: () => void
}

export function MenuScreen({ loading, highScore, muted, onStart, onToggleMute }: MenuScreenProps) {
  return (
    <div className="overlay">
      <div className="panel">
        <h1 className="title">Undampori Bash</h1>
        <p className="subtitle">Swipe to slice the snacks. Don&apos;t touch the undampori!</p>
        {highScore > 0 && <p className="stat-line">Best {highScore}</p>}
        <button className="btn btn-primary" onClick={onStart} disabled={loading} autoFocus>
          {loading ? 'Loading…' : 'Start'}
        </button>
        <SoundToggle muted={muted} onToggle={onToggleMute} />
        <p className="hint">Esc / P to pause · M to mute</p>
      </div>
    </div>
  )
}
