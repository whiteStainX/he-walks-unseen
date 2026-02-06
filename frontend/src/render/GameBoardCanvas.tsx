import { useEffect, useRef } from 'react'

import type { Position3D } from '../core/position'
import type { PositionAtTime } from '../core/worldLine'
import { minimalMonoTheme } from './theme'

interface GameBoardCanvasProps {
  boardSize: number
  selvesAtCurrentTime: PositionAtTime[]
  currentTurn: number
}

const CANVAS_SIZE = 560

export function GameBoardCanvas({
  boardSize,
  selvesAtCurrentTime,
  currentTurn,
}: GameBoardCanvasProps) {
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

    const drawSelf = (position: Position3D, fill: string, stroke: string) => {
      context.fillStyle = fill
      context.fillRect(
        position.x * cellSize + cellSize * 0.15,
        position.y * cellSize + cellSize * 0.15,
        cellSize * 0.7,
        cellSize * 0.7,
      )

      context.strokeStyle = stroke
      context.lineWidth = 2
      context.strokeRect(
        position.x * cellSize + cellSize * 0.15,
        position.y * cellSize + cellSize * 0.15,
        cellSize * 0.7,
        cellSize * 0.7,
      )
    }

    for (const self of selvesAtCurrentTime) {
      if (self.turn === currentTurn) {
        continue
      }

      drawSelf(self.position, '#9a9a9a', '#4d4d4d')
    }

    const currentSelf = selvesAtCurrentTime.find((self) => self.turn === currentTurn)

    if (currentSelf) {
      drawSelf(currentSelf.position, theme.playerFill, theme.playerStroke)
    }
  }, [boardSize, selvesAtCurrentTime, currentTurn])

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
