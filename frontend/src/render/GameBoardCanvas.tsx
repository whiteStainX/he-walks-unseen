import { useEffect, useRef } from 'react'

import type { Position2D } from '../core/position'
import { minimalMonoTheme } from './theme'

interface GameBoardCanvasProps {
  boardSize: number
  player: Position2D
}

const CANVAS_SIZE = 560

export function GameBoardCanvas({ boardSize, player }: GameBoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const cellSize = CANVAS_SIZE / boardSize
    const theme = minimalMonoTheme.canvas

    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    context.fillStyle = theme.boardBackground
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    context.fillStyle = theme.playerFill
    context.fillRect(
      player.x * cellSize + cellSize * 0.15,
      player.y * cellSize + cellSize * 0.15,
      cellSize * 0.7,
      cellSize * 0.7,
    )

    context.strokeStyle = theme.playerStroke
    context.lineWidth = 2
    context.strokeRect(
      player.x * cellSize + cellSize * 0.15,
      player.y * cellSize + cellSize * 0.15,
      cellSize * 0.7,
      cellSize * 0.7,
    )
  }, [boardSize, player])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="board-canvas"
      aria-label="Game board"
    />
  )
}
