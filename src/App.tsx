import { useEffect, useState } from 'react'
import type { Game } from './game/core/Game'
import { GameCanvas } from './ui/GameCanvas'
import { GameOverScreen } from './ui/GameOverScreen'
import { Hud } from './ui/Hud'
import { MenuScreen } from './ui/MenuScreen'
import { PauseScreen } from './ui/PauseScreen'
import { useGameSnapshot } from './ui/useGameSnapshot'

function App() {
  const [game, setGame] = useState<Game | null>(null)
  const snap = useGameSnapshot(game)
  const { status } = snap

  // Keyboard: Esc / P toggles pause, M toggles sound.
  useEffect(() => {
    if (!game) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'escape' || key === 'p') game.togglePause()
      else if (key === 'm') game.toggleMute()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [game])

  return (
    <main className="app">
      <GameCanvas onGameChange={setGame} />
      {game && status === 'menu' && (
        <MenuScreen
          loading={snap.loading}
          highScore={snap.highScore}
          muted={snap.muted}
          onStart={() => game.start()}
          onToggleMute={() => game.toggleMute()}
        />
      )}
      {game && (status === 'playing' || status === 'paused') && (
        <Hud
          score={snap.score}
          highScore={snap.highScore}
          lives={snap.lives}
          muted={snap.muted}
          onPause={() => game.pause()}
          onToggleMute={() => game.toggleMute()}
        />
      )}
      {game && status === 'paused' && (
        <PauseScreen
          muted={snap.muted}
          onToggleMute={() => game.toggleMute()}
          onResume={() => game.resume()}
          onRestart={() => game.restart()}
          onMenu={() => game.goToMenu()}
        />
      )}
      {game && status === 'gameover' && (
        <GameOverScreen
          score={snap.score}
          highScore={snap.highScore}
          isNewBest={snap.isNewBest}
          slicedCount={snap.slicedCount}
          bestCombo={snap.bestCombo}
          reason={snap.gameOverReason}
          onRestart={() => game.restart()}
          onMenu={() => game.goToMenu()}
        />
      )}
    </main>
  )
}

export default App
