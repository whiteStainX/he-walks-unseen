import { useEffect, useRef } from 'react'

import type { Position2D } from '../core/position'

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

    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    context.fillStyle = '#f6f2e9'
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    context.strokeStyle = '#1e293b'
    context.lineWidth = 1

    for (let index = 0; index <= boardSize; index += 1) {
      const offset = index * cellSize

      context.beginPath()
      context.moveTo(offset, 0)
      context.lineTo(offset, CANVAS_SIZE)
      context.stroke()

      context.beginPath()
      context.moveTo(0, offset)
      context.lineTo(CANVAS_SIZE, offset)
      context.stroke()
    }

    context.fillStyle = '#0f766e'
    context.fillRect(
      player.x * cellSize + cellSize * 0.15,
      player.y * cellSize + cellSize * 0.15,
      cellSize * 0.7,
      cellSize * 0.7,
    )

    context.strokeStyle = '#042f2e'
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
