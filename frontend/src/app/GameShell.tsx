import { useEffect, useMemo, useState } from 'react'

import type { Direction2D } from '../core/position'
import { objectsAtTime } from '../core/timeCube'
import { currentPosition, positionsAtTime } from '../core/worldLine'
import { useAppDispatch, useAppSelector } from '../game/hooks'
import {
  applyRift,
  configureRiftSettings,
  movePlayer2D,
  pullPlayer2D,
  pushPlayer2D,
  restart,
  setStatus,
  setInteractionConfig,
  waitTurn,
} from '../game/gameSlice'
import { GameBoardCanvas } from '../render/board/GameBoardCanvas'
import { buildIsoViewModel } from '../render/iso/buildIsoViewModel'
import { IsoTimeCubePanel } from '../render/iso/IsoTimeCubePanel'

type DirectionalActionMode = 'Move' | 'Push' | 'Pull'

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
  const [directionalActionMode, setDirectionalActionMode] = useState<DirectionalActionMode>('Move')
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
  const boardSize = useAppSelector((state) => state.game.boardSize)
  const cube = useAppSelector((state) => state.game.cube)
  const worldLine = useAppSelector((state) => state.game.worldLine)
  const currentTime = useAppSelector((state) => state.game.currentTime)
  const turn = useAppSelector((state) => state.game.turn)
  const timeDepth = useAppSelector((state) => state.game.timeDepth)
  const phase = useAppSelector((state) => state.game.phase)
  const riftDefaultDelta = useAppSelector((state) => state.game.riftSettings.defaultDelta)
  const interactionConfig = useAppSelector((state) => state.game.interactionConfig)
  const historyLength = useAppSelector((state) => state.game.history.length)
  const status = useAppSelector((state) => state.game.status)
  const player = currentPosition(worldLine)
  const selvesAtCurrentTime = positionsAtTime(worldLine, currentTime)
  const objectsAtCurrentTime = objectsAtTime(cube, currentTime)
  const isoViewModel = useMemo(
    () =>
      buildIsoViewModel({
        currentT: currentTime,
        timeDepth,
        worldLine,
        cube,
        maxWindow: 10,
      }),
    [currentTime, timeDepth, worldLine, cube],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const direction = directionForKey(event.key)

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        setIsActionMenuOpen((open) => !open)
        return
      }

      if (isActionMenuOpen) {
        if (event.key === '1') {
          event.preventDefault()
          setDirectionalActionMode('Move')
          setIsActionMenuOpen(false)
          return
        }

        if (event.key === '2') {
          event.preventDefault()
          setDirectionalActionMode('Push')
          setIsActionMenuOpen(false)
          return
        }

        if (event.key === '3') {
          event.preventDefault()
          setDirectionalActionMode('Pull')
          setIsActionMenuOpen(false)
          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          setIsActionMenuOpen(false)
          return
        }

        return
      }

      if (direction) {
        event.preventDefault()
        switch (directionalActionMode) {
          case 'Move':
            dispatch(movePlayer2D(direction))
            break
          case 'Push':
            dispatch(pushPlayer2D(direction))
            break
          case 'Pull':
            dispatch(pullPlayer2D(direction))
            break
        }
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

      if (event.key === '-') {
        event.preventDefault()
        dispatch(
          setInteractionConfig({
            maxPushChain: Math.max(1, interactionConfig.maxPushChain - 1),
          }),
        )
        return
      }

      if (event.key === '=') {
        event.preventDefault()
        dispatch(
          setInteractionConfig({
            maxPushChain: interactionConfig.maxPushChain + 1,
          }),
        )
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
  }, [directionalActionMode, dispatch, interactionConfig.maxPushChain, isActionMenuOpen, riftDefaultDelta])

  return (
    <div className="game-shell">
      <header className="game-header">
        <h1>He Walks Unseen</h1>
        <p>Phase 4: interaction pipeline (move/wait/rift/push/pull)</p>
      </header>

      <main className="game-layout">
        <section className="board-panel">
          <div className="board-stage">
            <div className="board-stage-item">
              <GameBoardCanvas
                boardSize={boardSize}
                objectsAtCurrentTime={objectsAtCurrentTime}
                selvesAtCurrentTime={selvesAtCurrentTime}
                currentTurn={turn}
              />
            </div>
            <div className="board-stage-item iso-stage-item">
              <IsoTimeCubePanel boardSize={boardSize} currentTurn={turn} viewModel={isoViewModel} />
              <p className="iso-caption">
                Iso window t={isoViewModel.startT}..{isoViewModel.endT}, focus={isoViewModel.focusT}
              </p>
            </div>
          </div>
        </section>

        <aside className="sidebar-panel">
          <h2>State</h2>
          <p>Board: {boardSize} x {boardSize}</p>
          <p>Turn (n): {turn}</p>
          <p>Time (t): {currentTime}</p>
          <p>Time depth: {timeDepth}</p>
          <p>Phase: {phase}</p>
          <p>Directional action: {directionalActionMode}</p>
          <p>Action menu: {isActionMenuOpen ? 'open (1/2/3 to select)' : 'closed (F to open)'}</p>
          <p>Rift default delta: -{riftDefaultDelta}</p>
          <p>Max push chain: {interactionConfig.maxPushChain}</p>
          <p>Pull enabled: {interactionConfig.allowPull ? 'yes' : 'no'}</p>
          <p>History entries: {historyLength}</p>
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
        <span>F: Open/close action menu</span>
        <span>1/2/3: Move/Push/Pull mode</span>
        <span>WASD / Arrows: Direction for selected action</span>
        <span>Space: Rift (configurable)</span>
        <span>[ / ]: Rift delta -/+</span>
        <span>- / =: Push chain -/+</span>
        <span>Enter: Wait</span>
        <span>R: Restart</span>
        <span>Reach E: Win</span>
      </footer>
    </div>
  )
}
