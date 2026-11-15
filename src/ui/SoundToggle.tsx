interface SoundToggleProps {
  muted: boolean
  onToggle: () => void
  /** 'icon' = round HUD button, 'text' = full-width menu button. */
  variant?: 'icon' | 'text'
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

export function SoundToggle({ muted, onToggle, variant = 'text' }: SoundToggleProps) {
  if (variant === 'icon') {
    return (
      <button
        className="hud-button"
        onClick={onToggle}
        aria-label="Sound"
        aria-pressed={!muted}
        title={muted ? 'Unmute (M)' : 'Mute (M)'}
      >
        <SpeakerIcon muted={muted} />
      </button>
    )
  }
  return (
    <button className="btn btn-with-icon" onClick={onToggle} aria-pressed={!muted}>
      <SpeakerIcon muted={muted} />
      Sound: {muted ? 'Off' : 'On'}
    </button>
  )
}
