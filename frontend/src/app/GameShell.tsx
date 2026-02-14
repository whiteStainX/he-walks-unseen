import { useEffect, useMemo, useState } from 'react'

import { evaluateDetectionV1 } from '../core/detection'
import type { Direction2D } from '../core/position'
import { objectsAtTime } from '../core/timeCube'
import { currentPosition, positionsAtTime } from '../core/worldLine'
import { loadBootContentFromPublic } from '../data/loader'
import { useAppDispatch, useAppSelector } from '../game/hooks'
import {
  applyLoadedContent,
  applyRift,
  configureRiftSettings,
  movePlayer2D,
  pullPlayer2D,
  pushPlayer2D,
  restart,
  setContentPackId,
  setStatus,
  setInteractionConfig,
  waitTurn,
} from '../game/gameSlice'
import { GameBoardCanvas } from '../render/board/GameBoardCanvas'
import { buildIsoViewModel } from '../render/iso/buildIsoViewModel'
import { IsoTimeCubePanel } from '../render/iso/IsoTimeCubePanel'
import { applyCssVars } from '../render/theme'

type DirectionalActionMode = 'Move' | 'Push' | 'Pull'
type DirectionalOption = { mode: DirectionalActionMode; keyLabel: '1' | '2' | '3'; description: string }
const PUBLIC_CONTENT_PACKS = ['default', 'variant'] as const

const directionalOptions: DirectionalOption[] = [
  { mode: 'Move', keyLabel: '1', description: 'Normal movement' },
  { mode: 'Push', keyLabel: '2', description: 'Push chain forward' },
  { mode: 'Pull', keyLabel: '3', description: 'Pull from behind' },
]

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

function actionSummary(entry: { action: { kind: string; direction?: string }; outcome: { kind: string } }): string {
  const actionText =
    entry.action.kind === 'Move' ||
    entry.action.kind === 'Push' ||
    entry.action.kind === 'Pull'
      ? `${entry.action.kind.toLowerCase()} ${entry.action.direction ?? ''}`.trim()
      : entry.action.kind === 'ApplyRift'
        ? 'rift'
        : entry.action.kind.toLowerCase()

  return `${actionText} -> ${entry.outcome.kind.toLowerCase()}`
}

export function GameShell() {
  const dispatch = useAppDispatch()
  const [directionalActionMode, setDirectionalActionMode] = useState<DirectionalActionMode>('Move')
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [showDangerPreview, setShowDangerPreview] = useState(false)
  const boardSize = useAppSelector((state) => state.game.boardSize)
  const cube = useAppSelector((state) => state.game.cube)
  const worldLine = useAppSelector((state) => state.game.worldLine)
  const currentTime = useAppSelector((state) => state.game.currentTime)
  const turn = useAppSelector((state) => state.game.turn)
  const timeDepth = useAppSelector((state) => state.game.timeDepth)
  const phase = useAppSelector((state) => state.game.phase)
  const contentPackId = useAppSelector((state) => state.game.contentPackId)
  const riftDefaultDelta = useAppSelector((state) => state.game.riftSettings.defaultDelta)
  const interactionConfig = useAppSelector((state) => state.game.interactionConfig)
  const detectionConfig = useAppSelector((state) => state.game.detectionConfig)
  const themeCssVars = useAppSelector((state) => state.game.themeCssVars)
  const history = useAppSelector((state) => state.game.history)
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
  const recentHistory = useMemo(() => history.slice(-5).reverse(), [history])
  const detectionPreviewReport = useMemo(
    () =>
      evaluateDetectionV1({
        cube,
        worldLine,
        currentTime,
        config: detectionConfig,
      }),
    [cube, worldLine, currentTime, detectionConfig],
  )

  useEffect(() => {
    applyCssVars(themeCssVars)
  }, [themeCssVars])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const loaded = await loadBootContentFromPublic({ packId: contentPackId })

      if (cancelled) {
        return
      }

      if (!loaded.ok) {
        dispatch(setStatus(`Content load failed (${contentPackId}): ${loaded.error.kind}`))
        return
      }

      dispatch(applyLoadedContent({ packId: contentPackId, content: loaded.value }))
    })()

    return () => {
      cancelled = true
    }
  }, [contentPackId, dispatch])

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

      if (event.key === 'l' || event.key === 'L') {
        event.preventDefault()
        setIsLogOpen((open) => !open)
        return
      }

      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault()
        setShowDangerPreview((enabled) => !enabled)
        return
      }

      if (event.key === 'v' || event.key === 'V') {
        event.preventDefault()
        const currentIndex = PUBLIC_CONTENT_PACKS.findIndex((id) => id === contentPackId)
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % PUBLIC_CONTENT_PACKS.length
        dispatch(setContentPackId(PUBLIC_CONTENT_PACKS[nextIndex]))
        return
      }

      if (event.key === 'Escape' && isLogOpen) {
        event.preventDefault()
        setIsLogOpen(false)
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
  }, [
    directionalActionMode,
    dispatch,
    interactionConfig.maxPushChain,
    isActionMenuOpen,
    isLogOpen,
    contentPackId,
    riftDefaultDelta,
  ])

  return (
    <div className="game-shell">
      <header className="game-header">
        <h1>He Walks Unseen</h1>
        <p>Phase 5: detection baseline + danger preview</p>
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
                showDangerPreview={showDangerPreview}
                detectionEvents={detectionPreviewReport.events}
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

        <aside className="hud-stack">
          <section className="ui-window command-window">
            <h2 className="ui-window-title">Command</h2>
            <div className="ui-window-body">
              <p className="window-note">F: {isActionMenuOpen ? 'close menu' : 'open menu'}</p>
              <div className="command-list">
                {directionalOptions.map((option) => (
                  <div
                    key={option.mode}
                    className={[
                      'command-row',
                      directionalActionMode === option.mode ? 'is-selected' : '',
                      isActionMenuOpen ? 'is-menu-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="command-key">{option.keyLabel}</span>
                    <span className="command-text">{option.mode}</span>
                    <span className="command-desc">{option.description}</span>
                  </div>
                ))}
              </div>
              <div className="command-meta">
                <span>Direction: WASD / Arrows</span>
                <span>Space: Rift</span>
                <span>Enter: Wait</span>
                <span>V: Switch pack</span>
              </div>
            </div>
          </section>

          <section className="ui-window state-window">
            <h2 className="ui-window-title">State</h2>
            <div className="ui-window-body">
              <div className="state-sections">
                <section className="state-block">
                  <h3 className="state-block-title">Core</h3>
                  <div className="metric-grid">
                    <div className="metric-item">
                      <span className="metric-label">Board</span>
                      <span className="metric-value">{boardSize} x {boardSize}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Turn</span>
                      <span className="metric-value">{turn}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Time</span>
                      <span className="metric-value">{currentTime}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Depth</span>
                      <span className="metric-value">{timeDepth}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Phase</span>
                      <span className="metric-value">{phase}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Mode</span>
                      <span className="metric-value">{directionalActionMode}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Pack</span>
                      <span className="metric-value">{contentPackId}</span>
                    </div>
                  </div>
                </section>

                <section className="state-block">
                  <h3 className="state-block-title">Interaction</h3>
                  <div className="metric-grid">
                    <div className="metric-item">
                      <span className="metric-label">Rift Delta</span>
                      <span className="metric-value">-{riftDefaultDelta}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Push Max</span>
                      <span className="metric-value">{interactionConfig.maxPushChain}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Pull</span>
                      <span className="metric-value">{interactionConfig.allowPull ? 'on' : 'off'}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Danger</span>
                      <span className="metric-value">{showDangerPreview ? 'on' : 'off'}</span>
                    </div>
                  </div>
                </section>

                <section className="state-block">
                  <h3 className="state-block-title">Detection</h3>
                  <div className="metric-grid">
                    <div className="metric-item">
                      <span className="metric-label">Enabled</span>
                      <span className="metric-value">{detectionConfig.enabled ? 'on' : 'off'}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Delay</span>
                      <span className="metric-value">{detectionConfig.delayTurns}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Range</span>
                      <span className="metric-value">{detectionConfig.maxDistance}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Events</span>
                      <span className="metric-value">{detectionPreviewReport.events.length}</span>
                    </div>
                  </div>
                </section>

                <section className="state-block">
                  <h3 className="state-block-title">Slice</h3>
                  <div className="metric-grid metric-grid-single">
                    <div className="metric-item">
                      <span className="metric-label">WorldLine</span>
                      <span className="metric-value">{worldLine.path.length}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Slice Obj</span>
                      <span className="metric-value">{objectsAtCurrentTime.length}</span>
                    </div>
                    <div className="metric-item metric-item-wide">
                      <span className="metric-label">Player</span>
                      <span className="metric-value">
                        {player ? `${player.x},${player.y},t=${player.t}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </section>

          <section className="ui-window log-window">
            <h2 className="ui-window-title">Log</h2>
            <div className="ui-window-body log-body-compact">
              <p className="window-note status-line">{status}</p>
            </div>
          </section>
        </aside>
      </main>

      <footer className="bottom-bar">
        <span>F Menu</span>
        <span>1/2/3 Mode</span>
        <span>WASD/Arrows Direction</span>
        <span>Space Rift</span>
        <span>Enter Wait</span>
        <span>L Log</span>
        <span>P Danger</span>
        <span>V Pack</span>
        <span>[ ] Rift +/-</span>
        <span>- = Push Max +/-</span>
        <span>R Restart</span>
      </footer>

      {isLogOpen ? (
        <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Action Log">
          <section className="overlay-window">
            <header className="overlay-header">
              <h2>Action Log</h2>
              <p>L / Esc: close</p>
            </header>
            <div className="overlay-body">
              {recentHistory.length === 0 ? (
                <p className="empty-log">No actions yet.</p>
              ) : (
                history
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div className="log-row" key={`${entry.turn}-${entry.action.kind}`}>
                      <span className="log-turn">T{entry.turn}</span>
                      <span className="log-text">{actionSummary(entry)}</span>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
