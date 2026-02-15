import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  closeTopLayer,
  createInputStateMachine,
  flushDirectionalInput,
  pushDirectionalInput,
  selectDirectionalMode,
  toggleStateOverlay,
  toggleActionMenu,
  toggleLogOverlay,
  toggleSystemMenu,
  type DirectionalActionMode,
  type InputStateMachine,
} from './inputStateMachine'
import { evaluateDetectionV1 } from '../core/detection'
import type { Direction2D } from '../core/position'
import { objectsAtTime } from '../core/timeCube'
import { currentPosition, positionsAtTime } from '../core/worldLine'
import { loadBootContentFromPublic, loadContentPackManifestFromPublic } from '../data/loader'
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
import { buildActionPreview } from '../render/board/preview'
import { buildIsoViewModel } from '../render/iso/buildIsoViewModel'
import { applyCssVars } from '../render/theme'

const LazyIsoTimeCubePanel = lazy(async () => {
  const module = await import('../render/iso/IsoTimeCubePanel')
  return { default: module.IsoTimeCubePanel }
})

type DirectionalOption = { mode: DirectionalActionMode; keyLabel: '1' | '2' | '3'; description: string }
interface UiSettings {
  showIsoPanel: boolean
  compactHints: boolean
  defaultDangerPreview: boolean
}

const DEFAULT_PACK_SEQUENCE = ['default', 'variant']
const UI_SETTINGS_STORAGE_KEY = 'he-walks-unseen.ui-settings.v1'
const defaultUiSettings: UiSettings = {
  showIsoPanel: true,
  compactHints: false,
  defaultDangerPreview: false,
}

const directionalOptions: DirectionalOption[] = [
  { mode: 'Move', keyLabel: '1', description: 'Normal movement' },
  { mode: 'Push', keyLabel: '2', description: 'Push chain forward' },
  { mode: 'Pull', keyLabel: '3', description: 'Pull from behind' },
]

function loadUiSettings(): UiSettings {
  if (typeof window === 'undefined') {
    return defaultUiSettings
  }

  const raw = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY)

  if (!raw) {
    return defaultUiSettings
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UiSettings>

    return {
      showIsoPanel: parsed.showIsoPanel ?? defaultUiSettings.showIsoPanel,
      compactHints: parsed.compactHints ?? defaultUiSettings.compactHints,
      defaultDangerPreview: parsed.defaultDangerPreview ?? defaultUiSettings.defaultDangerPreview,
    }
  } catch {
    return defaultUiSettings
  }
}

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
  const [inputMachine, setInputMachine] = useState(createInputStateMachine)
  const [uiSettings, setUiSettings] = useState(loadUiSettings)
  const [showDangerPreview, setShowDangerPreview] = useState(loadUiSettings().defaultDangerPreview)
  const [availablePackIds, setAvailablePackIds] = useState<string[]>(DEFAULT_PACK_SEQUENCE)
  const logOverlayRef = useRef<HTMLElement | null>(null)
  const settingsOverlayRef = useRef<HTMLElement | null>(null)
  const stateOverlayRef = useRef<HTMLElement | null>(null)

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
  const iconPackId = useAppSelector((state) => state.game.iconPackId)
  const history = useAppSelector((state) => state.game.history)
  const status = useAppSelector((state) => state.game.status)

  const directionalActionMode = inputMachine.mode
  const isActionMenuOpen = inputMachine.layer === 'ActionMenu'
  const isStateOverlayOpen = inputMachine.layer === 'StateOverlay'
  const isLogOpen = inputMachine.layer === 'LogOverlay'
  const isSystemMenuOpen = inputMachine.layer === 'SystemMenu'

  const player = currentPosition(worldLine)
  const selvesAtCurrentTime = positionsAtTime(worldLine, currentTime)
  const objectsAtCurrentTime = objectsAtTime(cube, currentTime)
  const recentHistory = useMemo(() => history.slice(-5).reverse(), [history])
  const queuedIntent = inputMachine.queuedDirectional

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

  const actionPreview = useMemo(
    () =>
      buildActionPreview({
        cube,
        worldLine,
        boardSize,
        timeDepth,
        intent: queuedIntent,
        maxPushChain: interactionConfig.maxPushChain,
        allowPull: interactionConfig.allowPull,
      }),
    [
      cube,
      worldLine,
      boardSize,
      timeDepth,
      queuedIntent,
      interactionConfig.maxPushChain,
      interactionConfig.allowPull,
    ],
  )

  const dispatchDirectionalIntent = useCallback(
    (intent: { mode: DirectionalActionMode; direction: Direction2D }) => {
      switch (intent.mode) {
        case 'Move':
          dispatch(movePlayer2D(intent.direction))
          break
        case 'Push':
          dispatch(pushPlayer2D(intent.direction))
          break
        case 'Pull':
          dispatch(pullPlayer2D(intent.direction))
          break
      }
    },
    [dispatch],
  )

  const applyMachineTransition = useCallback(
    (nextMachine: InputStateMachine) => {
      const flushed = flushDirectionalInput(nextMachine)
      setInputMachine(flushed.next)

      if (flushed.immediate) {
        dispatchDirectionalIntent(flushed.immediate)
      }
    },
    [dispatchDirectionalIntent],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(uiSettings))
  }, [uiSettings])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const manifest = await loadContentPackManifestFromPublic('/data')

      if (cancelled || !manifest.ok) {
        return
      }

      const packIds = manifest.value.packs.map((pack) => pack.id)

      if (packIds.length > 0) {
        setAvailablePackIds(packIds)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (availablePackIds.length === 0) {
      return
    }

    if (!availablePackIds.includes(contentPackId)) {
      dispatch(setContentPackId(availablePackIds[0]))
    }
  }, [availablePackIds, contentPackId, dispatch])

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
    if (isLogOpen) {
      logOverlayRef.current?.focus()
    }
  }, [isLogOpen])

  useEffect(() => {
    if (isSystemMenuOpen) {
      settingsOverlayRef.current?.focus()
    }
  }, [isSystemMenuOpen])

  useEffect(() => {
    if (isStateOverlayOpen) {
      stateOverlayRef.current?.focus()
    }
  }, [isStateOverlayOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const direction = directionForKey(event.key)

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        applyMachineTransition(toggleActionMenu(inputMachine))
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        applyMachineTransition(toggleStateOverlay(inputMachine))
        return
      }

      if (event.key === 'l' || event.key === 'L') {
        event.preventDefault()
        applyMachineTransition(toggleLogOverlay(inputMachine))
        return
      }

      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault()
        applyMachineTransition(toggleSystemMenu(inputMachine))
        return
      }

      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault()
        setShowDangerPreview((enabled) => !enabled)
        return
      }

      if (event.key === 'v' || event.key === 'V') {
        event.preventDefault()
        if (availablePackIds.length > 0) {
          const currentIndex = availablePackIds.findIndex((id) => id === contentPackId)
          const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % availablePackIds.length
          dispatch(setContentPackId(availablePackIds[nextIndex]))
        }
        return
      }

      if (event.key === 'Escape') {
        const next = closeTopLayer(inputMachine)

        if (next !== inputMachine) {
          event.preventDefault()
          applyMachineTransition(next)
          return
        }
      }

      if (isActionMenuOpen) {
        if (event.key === '1') {
          event.preventDefault()
          applyMachineTransition(selectDirectionalMode(inputMachine, 'Move'))
          return
        }

        if (event.key === '2') {
          event.preventDefault()
          applyMachineTransition(selectDirectionalMode(inputMachine, 'Push'))
          return
        }

        if (event.key === '3') {
          event.preventDefault()
          applyMachineTransition(selectDirectionalMode(inputMachine, 'Pull'))
          return
        }
      }

      if (direction) {
        event.preventDefault()
        const result = pushDirectionalInput(inputMachine, direction)

        if (result.immediate) {
          dispatchDirectionalIntent(result.immediate)
        } else {
          applyMachineTransition(result.next)
        }

        return
      }

      if (inputMachine.layer !== 'Gameplay') {
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

      if (event.key === 'q' || event.key === 'Q') {
        event.preventDefault()
        dispatch(setStatus('Quit is not wired in web build.'))
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    availablePackIds,
    contentPackId,
    dispatch,
    applyMachineTransition,
    dispatchDirectionalIntent,
    inputMachine,
    interactionConfig.maxPushChain,
    isActionMenuOpen,
    isStateOverlayOpen,
    riftDefaultDelta,
  ])

  const bottomHints = uiSettings.compactHints
    ? ['F Menu', 'Tab State', 'WASD/Arrows', 'Space Rift', 'Enter Wait', 'M Settings', 'R Restart']
    : [
        'F Menu',
        '1/2/3 Mode',
        'Tab State',
        'WASD/Arrows Direction',
        'Space Rift',
        'Enter Wait',
        'L Log',
        'P Danger',
        'V Pack',
        '[ ] Rift +/-',
        '- = Push Max +/-',
        'M Settings',
        'R Restart',
      ]

  return (
    <div className="game-shell">
      <header className="game-header">
        <h1>He Walks Unseen</h1>
        <p>Phase 9: HUD + Isometric + Icon System</p>
      </header>

      <main className="game-layout">
        <section className="board-panel" aria-label="Gameplay Panel">
          <div className={['board-stage', uiSettings.showIsoPanel ? '' : 'board-stage--single'].filter(Boolean).join(' ')}>
            <div className="board-stage-item">
              <GameBoardCanvas
                boardSize={boardSize}
                iconPackId={iconPackId}
                objectsAtCurrentTime={objectsAtCurrentTime}
                selvesAtCurrentTime={selvesAtCurrentTime}
                currentTurn={turn}
                showDangerPreview={showDangerPreview}
                detectionEvents={detectionPreviewReport.events}
                actionPreview={actionPreview}
              />
            </div>
            {uiSettings.showIsoPanel ? (
              <div className="board-stage-item iso-stage-item">
                <Suspense fallback={<div className="iso-fallback">Loading isometric view...</div>}>
                  <LazyIsoTimeCubePanel boardSize={boardSize} currentTurn={turn} viewModel={isoViewModel} />
                </Suspense>
                <p className="iso-caption">
                  Iso window t={isoViewModel.startT}..{isoViewModel.endT}, focus={isoViewModel.focusT}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="hud-stack" aria-label="HUD Panel">
          <section className="ui-window command-window" aria-label="Command Window">
            <h2 className="ui-window-title">Command</h2>
            <div className="ui-window-body">
              <p className="window-note">Mode: {directionalActionMode}</p>
              <div className="command-meta command-meta-compact">
                <span>F Menu</span>
                <span>Space Rift</span>
                <span>Enter Wait</span>
                <span>R Restart</span>
              </div>
              {isActionMenuOpen ? (
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
              ) : null}
            </div>
          </section>

          <section className="ui-window state-window" aria-label="State Window">
            <h2 className="ui-window-title">State</h2>
            <div className="ui-window-body">
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-label">Turn</span>
                  <span className="metric-value">{turn}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Time</span>
                  <span className="metric-value">{currentTime}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Phase</span>
                  <span className="metric-value">{phase}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Rift Delta</span>
                  <span className="metric-value">-{riftDefaultDelta}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Danger</span>
                  <span className="metric-value">{showDangerPreview ? 'on' : 'off'}</span>
                </div>
              </div>
              <p className="window-note state-zoom-note">Tab: details</p>
            </div>
          </section>

          <section className="ui-window log-window" aria-label="Log Window">
            <h2 className="ui-window-title">Log</h2>
            <div className="ui-window-body log-body-compact">
              <p className="window-note status-line" role="status" aria-live="polite">
                {status}
              </p>
            </div>
          </section>
        </aside>
      </main>

      <footer className={['bottom-bar', uiSettings.compactHints ? 'is-compact' : ''].filter(Boolean).join(' ')}>
        {bottomHints.map((hint) => (
          <span key={hint}>{hint}</span>
        ))}
      </footer>

      {isLogOpen ? (
        <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Action Log">
          <section className="overlay-window" ref={logOverlayRef} tabIndex={-1}>
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

      {isStateOverlayOpen ? (
        <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="State Details">
          <section className="overlay-window" ref={stateOverlayRef} tabIndex={-1}>
            <header className="overlay-header">
              <h2>State Details</h2>
              <p>Tab / Esc: close</p>
            </header>
            <div className="overlay-body state-overlay-body">
              <section className="state-block">
                <h3 className="state-block-title">Core</h3>
                <div className="metric-grid">
                  <div className="metric-item">
                    <span className="metric-label">Board</span>
                    <span className="metric-value">{boardSize} x {boardSize}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Depth</span>
                    <span className="metric-value">{timeDepth}</span>
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
                    <span className="metric-label">Phase</span>
                    <span className="metric-value">{phase}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Mode</span>
                    <span className="metric-value">{directionalActionMode}</span>
                  </div>
                </div>
              </section>

              <section className="state-block">
                <h3 className="state-block-title">Tools</h3>
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
                <h3 className="state-block-title">Snapshot</h3>
                <div className="metric-grid metric-grid-single">
                  <div className="metric-item">
                    <span className="metric-label">Slice Objects</span>
                    <span className="metric-value">{objectsAtCurrentTime.length}</span>
                  </div>
                  <div className="metric-item metric-item-wide">
                    <span className="metric-label">Player</span>
                    <span className="metric-value">
                      {player ? `${player.x},${player.y},t=${player.t}` : 'N/A'}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Content Pack</span>
                    <span className="metric-value">{contentPackId}</span>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {isSystemMenuOpen ? (
        <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Settings">
          <section className="overlay-window settings-window" ref={settingsOverlayRef} tabIndex={-1}>
            <header className="overlay-header">
              <h2>Settings</h2>
              <p>M / Esc: close</p>
            </header>
            <div className="overlay-body settings-body">
              <label className="settings-row" htmlFor="setting-iso-panel">
                <span>Show isometric panel</span>
                <input
                  id="setting-iso-panel"
                  type="checkbox"
                  checked={uiSettings.showIsoPanel}
                  onChange={(event) => {
                    setUiSettings((settings) => ({
                      ...settings,
                      showIsoPanel: event.target.checked,
                    }))
                  }}
                />
              </label>
              <label className="settings-row" htmlFor="setting-compact-hints">
                <span>Compact bottom hints</span>
                <input
                  id="setting-compact-hints"
                  type="checkbox"
                  checked={uiSettings.compactHints}
                  onChange={(event) => {
                    setUiSettings((settings) => ({
                      ...settings,
                      compactHints: event.target.checked,
                    }))
                  }}
                />
              </label>
              <label className="settings-row" htmlFor="setting-default-danger">
                <span>Default danger preview</span>
                <input
                  id="setting-default-danger"
                  type="checkbox"
                  checked={uiSettings.defaultDangerPreview}
                  onChange={(event) => {
                    const nextValue = event.target.checked

                    setUiSettings((settings) => ({
                      ...settings,
                      defaultDangerPreview: nextValue,
                    }))
                    setShowDangerPreview(nextValue)
                  }}
                />
              </label>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
