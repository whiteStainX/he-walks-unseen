import { useEffect, useRef } from 'react'

import type { DetectionEvent } from '../../core/detection'
import type { ResolvedObjectInstance } from '../../core/objects'
import type { Position3D } from '../../core/position'
import type { PositionAtTime } from '../../core/worldLine'
import { minimalMonoTheme } from '../theme'

interface GameBoardCanvasProps {
  boardSize: number
  objectsAtCurrentTime: ResolvedObjectInstance[]
  selvesAtCurrentTime: PositionAtTime[]
  currentTurn: number
  showDangerPreview: boolean
  detectionEvents: DetectionEvent[]
}

const CANVAS_SIZE = 560

export function GameBoardCanvas({
  boardSize,
  objectsAtCurrentTime,
  selvesAtCurrentTime,
  currentTurn,
  showDangerPreview,
  detectionEvents,
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

    if (showDangerPreview) {
      const uniqueMarkers = new Map<string, Position3D>()

      for (const event of detectionEvents) {
        uniqueMarkers.set(event.enemyId, event.enemyPosition)
      }

      context.strokeStyle = theme.dangerMarkerStroke
      context.fillStyle = theme.dangerMarkerFill
      context.lineWidth = 2

      for (const position of uniqueMarkers.values()) {
        const x = position.x * cellSize
        const y = position.y * cellSize
        const inset = cellSize * 0.06
        const size = cellSize - inset * 2
        const centerX = x + cellSize * 0.5
        const centerY = y + cellSize * 0.5

        context.strokeRect(x + inset, y + inset, size, size)
        context.beginPath()
        context.moveTo(x + inset, y + inset)
        context.lineTo(x + cellSize - inset, y + cellSize - inset)
        context.moveTo(x + cellSize - inset, y + inset)
        context.lineTo(x + inset, y + cellSize - inset)
        context.stroke()

        context.beginPath()
        context.arc(centerX, centerY, Math.max(3, cellSize * 0.08), 0, Math.PI * 2)
        context.fill()
      }
    }
  }, [
    boardSize,
    objectsAtCurrentTime,
    selvesAtCurrentTime,
    currentTurn,
    showDangerPreview,
    detectionEvents,
  ])

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
