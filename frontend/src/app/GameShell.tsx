import { useEffect } from 'react'

import type { Direction2D } from '../core/position'
import { useAppDispatch, useAppSelector } from '../game/hooks'
import { movePlayer, restart, setStatus } from '../game/gameSlice'
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
  const player = useAppSelector((state) => state.game.player)
  const turn = useAppSelector((state) => state.game.turn)
  const status = useAppSelector((state) => state.game.status)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const direction = directionForKey(event.key)

      if (direction) {
        event.preventDefault()
        dispatch(movePlayer(direction))
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
  }, [dispatch])

  return (
    <div className="game-shell">
      <header className="game-header">
        <h1>He Walks Unseen</h1>
        <p>Phase 1: 2D movement foundation (no time travel yet)</p>
      </header>

      <main className="game-layout">
        <section className="board-panel">
          <GameBoardCanvas boardSize={boardSize} player={player} />
        </section>

        <aside className="sidebar-panel">
          <h2>State</h2>
          <p>Board: {boardSize} x {boardSize}</p>
          <p>Turn: {turn}</p>
          <p>
            Player: ({player.x}, {player.y})
          </p>
          <h2>Status</h2>
          <p>{status}</p>
        </aside>
      </main>

      <footer className="bottom-bar">
        <span>WASD / Arrows: Move</span>
        <span>R: Restart</span>
        <span>Q / Esc: Status only</span>
      </footer>
    </div>
  )
}
