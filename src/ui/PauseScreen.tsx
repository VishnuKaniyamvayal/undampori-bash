import { SoundToggle } from './SoundToggle'

interface PauseScreenProps {
  muted: boolean
  onResume: () => void
  onRestart: () => void
  onMenu: () => void
  onToggleMute: () => void
}

export function PauseScreen({ muted, onResume, onRestart, onMenu, onToggleMute }: PauseScreenProps) {
  return (
    <div className="overlay">
      <div className="panel">
        <h2 className="heading">Paused</h2>
        <button className="btn btn-primary" onClick={onResume} autoFocus>
          Resume
        </button>
        <button className="btn" onClick={onRestart}>
          Restart
        </button>
        <SoundToggle muted={muted} onToggle={onToggleMute} />
        <button className="btn" onClick={onMenu}>
          Main menu
        </button>
      </div>
    </div>
  )
}
