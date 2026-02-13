import { useEffect, useRef } from 'react'

import type { ResolvedObjectInstance } from '../../core/objects'
import type { Position3D } from '../../core/position'
import type { PositionAtTime } from '../../core/worldLine'
import { minimalMonoTheme } from '../theme'

interface GameBoardCanvasProps {
  boardSize: number
  objectsAtCurrentTime: ResolvedObjectInstance[]
  selvesAtCurrentTime: PositionAtTime[]
  currentTurn: number
}

const CANVAS_SIZE = 560

export function GameBoardCanvas({
  boardSize,
  objectsAtCurrentTime,
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

    const drawRect = (position: Position3D, fill: string, stroke: string, inset: number) => {
      const x = position.x * cellSize + cellSize * inset
      const y = position.y * cellSize + cellSize * inset
      const size = cellSize * (1 - inset * 2)

      context.fillStyle = fill
      context.fillRect(x, y, size, size)

      context.strokeStyle = stroke
      context.lineWidth = 2
      context.strokeRect(x, y, size, size)
    }

    for (const object of objectsAtCurrentTime) {
      const fill = object.archetype.render.fill ?? theme.objectFill
      const stroke = object.archetype.render.stroke ?? theme.objectStroke
      const glyph = object.archetype.render.glyph

      drawRect(object.position, fill, stroke, 0.08)

      if (glyph) {
        context.fillStyle = theme.objectGlyph
        context.font = `${Math.max(11, Math.floor(cellSize * 0.45))}px monospace`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(
          glyph,
          object.position.x * cellSize + cellSize * 0.5,
          object.position.y * cellSize + cellSize * 0.52,
        )
      }
    }

    for (const self of selvesAtCurrentTime) {
      if (self.turn === currentTurn) {
        continue
      }

      drawRect(self.position, theme.pastSelfFill, theme.pastSelfStroke, 0.2)
    }

    const currentSelf = selvesAtCurrentTime.find((self) => self.turn === currentTurn)

    if (currentSelf) {
      drawRect(currentSelf.position, theme.playerFill, theme.playerStroke, 0.18)
    }
  }, [boardSize, objectsAtCurrentTime, selvesAtCurrentTime, currentTurn])

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
