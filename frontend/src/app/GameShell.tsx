import { useEffect } from 'react'

import type { Direction2D } from '../core/position'
import { objectsAtTime } from '../core/timeCube'
import { currentPosition, positionsAtTime } from '../core/worldLine'
import { useAppDispatch, useAppSelector } from '../game/hooks'
import {
  applyRift,
  configureRiftSettings,
  movePlayer2D,
  restart,
  setStatus,
  waitTurn,
} from '../game/gameSlice'
import { GameBoardCanvas } from '../render/GameBoardCanvas'

function directionForKey(key: string): Direction2D | null {
  switch (key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      return 'north'
    case 'a':
    case 'A':
    case 'ArrowLeft':
      return 'west'
    case 's':
    case 'S':
    case 'ArrowDown':
      return 'south'
    case 'd':
    case 'D':
    case 'ArrowRight':
      return 'east'
    default:
      return null
  }
}

export function GameShell() {
  const dispatch = useAppDispatch()
  const boardSize = useAppSelector((state) => state.game.boardSize)
  const cube = useAppSelector((state) => state.game.cube)
  const worldLine = useAppSelector((state) => state.game.worldLine)
  const currentTime = useAppSelector((state) => state.game.currentTime)
  const turn = useAppSelector((state) => state.game.turn)
  const timeDepth = useAppSelector((state) => state.game.timeDepth)
  const phase = useAppSelector((state) => state.game.phase)
  const riftDefaultDelta = useAppSelector((state) => state.game.riftSettings.defaultDelta)
  const status = useAppSelector((state) => state.game.status)
  const player = currentPosition(worldLine)
  const selvesAtCurrentTime = positionsAtTime(worldLine, currentTime)
  const objectsAtCurrentTime = objectsAtTime(cube, currentTime)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const direction = directionForKey(event.key)

      if (direction) {
        event.preventDefault()
        dispatch(movePlayer2D(direction))
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        dispatch(applyRift(undefined))
        return
      }

      if (event.key === '[') {
        event.preventDefault()
        dispatch(configureRiftSettings({ defaultDelta: Math.max(1, riftDefaultDelta - 1) }))
        return
      }

      if (event.key === ']') {
        event.preventDefault()
        dispatch(configureRiftSettings({ defaultDelta: riftDefaultDelta + 1 }))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        dispatch(waitTurn())
        return
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        dispatch(restart())
        return
      }

      if (event.key === 'q' || event.key === 'Q' || event.key === 'Escape') {
        event.preventDefault()
        dispatch(setStatus('Quit is not wired in web build.'))
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [dispatch, riftDefaultDelta])

  return (
    <div className="game-shell">
      <header className="game-header">
        <h1>He Walks Unseen</h1>
        <p>Phase 3: objects and occupancy foundation</p>
      </header>

      <main className="game-layout">
        <section className="board-panel">
          <GameBoardCanvas
            boardSize={boardSize}
            objectsAtCurrentTime={objectsAtCurrentTime}
            selvesAtCurrentTime={selvesAtCurrentTime}
            currentTurn={turn}
          />
        </section>

        <aside className="sidebar-panel">
          <h2>State</h2>
          <p>Board: {boardSize} x {boardSize}</p>
          <p>Turn (n): {turn}</p>
          <p>Time (t): {currentTime}</p>
          <p>Time depth: {timeDepth}</p>
          <p>Phase: {phase}</p>
          <p>Rift default delta: -{riftDefaultDelta}</p>
          <p>World line length: {worldLine.path.length}</p>
          <p>Objects on slice: {objectsAtCurrentTime.length}</p>
          <p>
            Player: {player ? `(${player.x}, ${player.y}, t=${player.t})` : 'N/A'}
          </p>
          <h2>Status</h2>
          <p>{status}</p>
        </aside>
      </main>

      <footer className="bottom-bar">
        <span>WASD / Arrows: Move</span>
        <span>Space: Rift (configurable)</span>
        <span>[ / ]: Rift delta -/+</span>
        <span>Enter: Wait</span>
        <span>R: Restart</span>
        <span>Reach E: Win</span>
      </footer>
    </div>
  )
}
