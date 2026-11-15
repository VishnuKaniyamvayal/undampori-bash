import { useEffect, useRef } from 'react'
import { Game } from '../game/core/Game'

interface GameCanvasProps {
  /** Called with the Game once created, and with null when it is destroyed. */
  onGameChange: (game: Game | null) => void
}

export function GameCanvas({ onGameChange }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new Game(canvas)
    onGameChange(game)
    return () => {
      game.destroy()
      onGameChange(null)
    }
  }, [onGameChange])

  return <canvas ref={canvasRef} className="game-canvas" />
}
