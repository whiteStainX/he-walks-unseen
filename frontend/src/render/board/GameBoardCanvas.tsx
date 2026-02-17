import { useEffect, useRef, useState } from 'react'

import type { DetectionEvent } from '../../core/detection'
import type { ResolvedObjectInstance } from '../../core/objects'
import type { Position3D } from '../../core/position'
import type { PositionAtTime } from '../../core/worldLine'
import { minimalMonoTheme } from '../theme'
import type { ActionPreview } from './preview'
import {
  DANGER_ICON_SLOT,
  PAST_SELF_ICON_SLOT,
  PLAYER_ICON_SLOT,
  resolveObjectIconSlot,
} from './iconPack'
import { loadIconPackCached, warmIconPackSlots } from './iconCache'

interface GameBoardCanvasProps {
  boardWidth: number
  boardHeight: number
  iconPackId: string
  objectsAtCurrentTime: ResolvedObjectInstance[]
  selvesAtCurrentTime: PositionAtTime[]
  currentTurn: number
  showDangerPreview: boolean
  detectionEvents: DetectionEvent[]
  actionPreview: ActionPreview | null
}

const DEFAULT_CANVAS_WIDTH = 560
const DEFAULT_CANVAS_HEIGHT = 560

interface CanvasViewport {
  cssWidth: number
  cssHeight: number
  dpr: number
}

function normalizeViewport(next: CanvasViewport): CanvasViewport {
  return {
    cssWidth: Math.max(1, Math.floor(next.cssWidth)),
    cssHeight: Math.max(1, Math.floor(next.cssHeight)),
    dpr: Math.max(1, next.dpr),
  }
}

function drawFallbackIcon(
  context: CanvasRenderingContext2D,
  slot: string,
  x: number,
  y: number,
  size: number,
): void {
  const centerX = x + size / 2
  const centerY = y + size / 2

  context.strokeStyle = '#111111'
  context.fillStyle = '#efefef'
  context.lineWidth = 2

  switch (slot) {
    case PLAYER_ICON_SLOT:
      context.fillStyle = '#111111'
      context.fillRect(x, y, size, size)
      context.fillStyle = '#ffffff'
      context.beginPath()
      context.arc(centerX, centerY, Math.max(2, size * 0.15), 0, Math.PI * 2)
      context.fill()
      break
    case PAST_SELF_ICON_SLOT:
      context.fillStyle = '#b5b5b5'
      context.fillRect(x, y, size, size)
      context.strokeRect(x, y, size, size)
      break
    case 'enemy':
      context.beginPath()
      context.moveTo(centerX, y)
      context.lineTo(x + size, centerY)
      context.lineTo(centerX, y + size)
      context.lineTo(x, centerY)
      context.closePath()
      context.fill()
      context.stroke()
      break
    case 'exit':
      context.strokeRect(x, y, size, size)
      context.beginPath()
      context.moveTo(x + size * 0.3, centerY)
      context.lineTo(x + size * 0.8, centerY)
      context.lineTo(x + size * 0.65, centerY - size * 0.18)
      context.moveTo(x + size * 0.8, centerY)
      context.lineTo(x + size * 0.65, centerY + size * 0.18)
      context.stroke()
      break
    case DANGER_ICON_SLOT:
      context.strokeRect(x, y, size, size)
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + size, y + size)
      context.moveTo(x + size, y)
      context.lineTo(x, y + size)
      context.stroke()
      break
    default:
      context.strokeRect(x, y, size, size)
  }
}

export function GameBoardCanvas({
  boardWidth,
  boardHeight,
  iconPackId,
  objectsAtCurrentTime,
  selvesAtCurrentTime,
  currentTurn,
  showDangerPreview,
  detectionEvents,
  actionPreview,
}: GameBoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [viewport, setViewport] = useState<CanvasViewport>({
    cssWidth: DEFAULT_CANVAS_WIDTH,
    cssHeight: DEFAULT_CANVAS_HEIGHT,
    dpr: 1,
  })
  const [loadedIconsState, setLoadedIconsState] = useState<{
    packId: string
    slots: Record<string, HTMLImageElement>
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const updateViewport = () => {
      const bounds = canvas.getBoundingClientRect()
      const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
      const next = normalizeViewport({
        cssWidth: bounds.width || DEFAULT_CANVAS_WIDTH,
        cssHeight: bounds.height || DEFAULT_CANVAS_HEIGHT,
        dpr,
      })

      setViewport((current) => {
        if (
          current.cssWidth === next.cssWidth &&
          current.cssHeight === next.cssHeight &&
          current.dpr === next.dpr
        ) {
          return current
        }

        return next
      })
    }

    updateViewport()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateViewport()
      })
      observer.observe(canvas)

      return () => {
        observer.disconnect()
      }
    }

    window.addEventListener('resize', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const iconPack = await loadIconPackCached(iconPackId)

      if (cancelled) {
        return
      }

      if (!iconPack.ok) {
        console.warn(`Icon pack load failed (${iconPackId}): ${iconPack.error.kind}`)
        return
      }

      const slots = await warmIconPackSlots(iconPack.value)

      if (!cancelled) {
        setLoadedIconsState({ packId: iconPackId, slots })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [iconPackId])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const pixelWidth = Math.max(1, Math.floor(viewport.cssWidth * viewport.dpr))
    const pixelHeight = Math.max(1, Math.floor(viewport.cssHeight * viewport.dpr))

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
    }

    context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0)

    const canvasWidth = viewport.cssWidth
    const canvasHeight = viewport.cssHeight
    const cellSize = Math.min(canvasWidth / boardWidth, canvasHeight / boardHeight)
    const boardPixelWidth = cellSize * boardWidth
    const boardPixelHeight = cellSize * boardHeight
    const originX = (canvasWidth - boardPixelWidth) / 2
    const originY = (canvasHeight - boardPixelHeight) / 2
    const theme = minimalMonoTheme.canvas
    const loadedSlotIcons = loadedIconsState?.packId === iconPackId ? loadedIconsState.slots : {}

    context.clearRect(0, 0, canvasWidth, canvasHeight)

    context.fillStyle = theme.boardBackground
    context.fillRect(0, 0, canvasWidth, canvasHeight)

    const drawRect = (position: Position3D, fill: string, stroke: string, inset: number) => {
      const x = originX + position.x * cellSize + cellSize * inset
      const y = originY + position.y * cellSize + cellSize * inset
      const size = cellSize * (1 - inset * 2)

      context.fillStyle = fill
      context.fillRect(x, y, size, size)

      context.strokeStyle = stroke
      context.lineWidth = 2
      context.strokeRect(x, y, size, size)
    }

    const drawIconAt = (position: Position3D, slot: string, inset = 0.2) => {
      const x = originX + position.x * cellSize + cellSize * inset
      const y = originY + position.y * cellSize + cellSize * inset
      const size = cellSize * (1 - inset * 2)
      const loaded = loadedSlotIcons[slot]

      if (loaded) {
        context.drawImage(loaded, x, y, size, size)
        return
      }

      drawFallbackIcon(context, slot, x, y, size)
    }

    for (const object of objectsAtCurrentTime) {
      const fill = object.archetype.render.fill ?? theme.objectFill
      const stroke = object.archetype.render.stroke ?? theme.objectStroke
      const slot = resolveObjectIconSlot(object.archetype.kind, object.archetype.render)

      drawRect(object.position, fill, stroke, 0.08)

      if (slot) {
        drawIconAt(object.position, slot)
      }
    }

    for (const self of selvesAtCurrentTime) {
      if (self.turn === currentTurn) {
        continue
      }

      drawRect(self.position, theme.pastSelfFill, theme.pastSelfStroke, 0.2)
      drawIconAt(self.position, PAST_SELF_ICON_SLOT, 0.26)
    }

    const currentSelf = selvesAtCurrentTime.find((self) => self.turn === currentTurn)

    if (currentSelf) {
      drawRect(currentSelf.position, theme.playerFill, theme.playerStroke, 0.18)
      drawIconAt(currentSelf.position, PLAYER_ICON_SLOT, 0.24)
    }

    if (showDangerPreview) {
      const uniqueMarkers = new Map<string, Position3D>()

      for (const event of detectionEvents) {
        uniqueMarkers.set(event.enemyId, event.enemyPosition)
      }

      for (const position of uniqueMarkers.values()) {
        drawIconAt(position, DANGER_ICON_SLOT, 0.12)
      }
    }

    if (actionPreview) {
      const x = originX + actionPreview.to.x * cellSize
      const y = originY + actionPreview.to.y * cellSize
      const inset = cellSize * 0.12
      const size = cellSize - inset * 2

      context.strokeStyle = theme.objectStroke
      context.fillStyle = actionPreview.blocked ? '#d7d7d7' : '#f2f2f2'
      context.setLineDash([5, 3])
      context.lineWidth = 2
      context.fillRect(x + inset, y + inset, size, size)
      context.strokeRect(x + inset, y + inset, size, size)
      context.setLineDash([])

      if (actionPreview.blocked) {
        context.beginPath()
        context.moveTo(x + inset, y + inset)
        context.lineTo(x + cellSize - inset, y + cellSize - inset)
        context.moveTo(x + cellSize - inset, y + inset)
        context.lineTo(x + inset, y + cellSize - inset)
        context.stroke()
      }
    }
  }, [
    boardWidth,
    boardHeight,
    iconPackId,
    loadedIconsState,
    objectsAtCurrentTime,
    selvesAtCurrentTime,
    currentTurn,
    showDangerPreview,
    detectionEvents,
    actionPreview,
    viewport,
  ])

  return (
    <canvas
      ref={canvasRef}
      className="board-canvas"
      aria-label="Game board"
    />
  )
}
