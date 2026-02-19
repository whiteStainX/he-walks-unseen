import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { evaluateDetectionV1 } from '../core/detection'
import type { Direction2D } from '../core/position'
import { objectsAtTime } from '../core/timeCube'
import { currentPosition, positionsAtTime } from '../core/worldLine'
import { useAppDispatch, useAppSelector } from '../game/hooks'
import { movePlayer2D, pullPlayer2D, pushPlayer2D, setContentPackId } from '../game/gameSlice'
import { buildActionPreview } from '../render/board/preview'
import { GameBoardCanvas } from '../render/board/GameBoardCanvas'
import { buildIsoViewModel } from '../render/iso/buildIsoViewModel'
import { applyCssVars } from '../render/theme'
import {
  closeTopLayer,
  createInputStateMachine,
  type DirectionalActionMode,
  type InputStateMachine,
} from './inputStateMachine'
import { BottomHintsBar } from './shell/BottomHintsBar'
import { DEFAULT_PACK_SEQUENCE, directionalOptions } from './shell/constants'
import { HudPanels } from './shell/HudPanels'
import { LogOverlay } from './shell/LogOverlay'
import { ProgressionOverlay } from './shell/ProgressionOverlay'
import { SettingsOverlay } from './shell/SettingsOverlay'
import { StateOverlay } from './shell/StateOverlay'
import {
  type PackDisplayMeta,
  useContentPackManifest,
  useEnsureSelectedContentPack,
  useLoadSelectedContentPack,
} from './shell/useContentPackLoading'
import { useKeyboardControls } from './shell/useKeyboardControls'
import { useProgressionState } from './shell/useProgressionState'
import { useUiSettings } from './shell/useUiSettings'

const LazyIsoTimeCubePanel = lazy(async () => {
  const module = await import('../render/iso/IsoTimeCubePanel')
  return { default: module.IsoTimeCubePanel }
})

const BUILD_CHANNEL = String(import.meta.env.MODE ?? 'development').toUpperCase()

export function GameShell() {
  const dispatch = useAppDispatch()
  const [inputMachine, setInputMachine] = useState(createInputStateMachine)
  const [availablePackIds, setAvailablePackIds] = useState<string[]>(DEFAULT_PACK_SEQUENCE)
  const [packMetaById, setPackMetaById] = useState<Record<string, PackDisplayMeta>>({})

  const {
    uiSettings,
    setUiSettings,
    showDangerPreview,
    setShowDangerPreview,
  } = useUiSettings()

  const logOverlayRef = useRef<HTMLElement | null>(null)
  const settingsOverlayRef = useRef<HTMLElement | null>(null)
  const stateOverlayRef = useRef<HTMLElement | null>(null)
  const progressionOverlayRef = useRef<HTMLElement | null>(null)

  const boardWidth = useAppSelector((state) => state.game.boardWidth)
  const boardHeight = useAppSelector((state) => state.game.boardHeight)
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
  const isProgressionOverlayOpen = inputMachine.layer === 'ProgressionOverlay'

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
        boardWidth,
        boardHeight,
        timeDepth,
        intent: null,
        maxPushChain: interactionConfig.maxPushChain,
        allowPull: interactionConfig.allowPull,
      }),
    [
      cube,
      worldLine,
      boardWidth,
      boardHeight,
      timeDepth,
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
      setInputMachine(nextMachine)
    },
    [],
  )

  useContentPackManifest(setAvailablePackIds, setPackMetaById)
  useEnsureSelectedContentPack(dispatch, availablePackIds, contentPackId)
  useLoadSelectedContentPack(dispatch, contentPackId)
  const {
    progressionManifest,
    progressionState,
    progressionError,
    setSelectedTrack,
    setCurrentEntryIndex,
  } = useProgressionState()

  useKeyboardControls({
    dispatch,
    inputMachine,
    isActionMenuOpen,
    isProgressionOverlayOpen,
    availablePackIds,
    contentPackId,
    riftDefaultDelta,
    interactionMaxPushChain: interactionConfig.maxPushChain,
    progressionManifest,
    progressionState,
    setSelectedTrack,
    setCurrentEntryIndex,
    applyMachineTransition,
    dispatchDirectionalIntent,
    setShowDangerPreview,
  })

  useEffect(() => {
    applyCssVars(themeCssVars)
  }, [themeCssVars])

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
    if (isProgressionOverlayOpen) {
      progressionOverlayRef.current?.focus()
    }
  }, [isProgressionOverlayOpen])

  return (
    <div className="game-shell">
      <header className="game-header">
        <h1>He Walks Unseen</h1>
        <p>{`Pack: ${contentPackId} | Channel: ${BUILD_CHANNEL}`}</p>
      </header>

      <main className="game-layout">
        <section className="board-panel" aria-label="Gameplay Panel">
          <div className={['board-stage', uiSettings.showIsoPanel ? '' : 'board-stage--single'].filter(Boolean).join(' ')}>
            <div className="board-stage-item">
              <GameBoardCanvas
                boardWidth={boardWidth}
                boardHeight={boardHeight}
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
                  <LazyIsoTimeCubePanel
                    boardWidth={boardWidth}
                    boardHeight={boardHeight}
                    currentTurn={turn}
                    viewModel={isoViewModel}
                  />
                </Suspense>
                <p className="iso-caption">
                  Iso window t={isoViewModel.startT}..{isoViewModel.endT}, focus={isoViewModel.focusT}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <HudPanels
          directionalActionMode={directionalActionMode}
          isActionMenuOpen={isActionMenuOpen}
          directionalOptions={directionalOptions}
          turn={turn}
          currentTime={currentTime}
          phase={phase}
          riftDefaultDelta={riftDefaultDelta}
          showDangerPreview={showDangerPreview}
          status={status}
        />
      </main>

      <BottomHintsBar uiSettings={uiSettings} />

      <LogOverlay isOpen={isLogOpen} overlayRef={logOverlayRef} history={history} />

      <StateOverlay
        isOpen={isStateOverlayOpen}
        overlayRef={stateOverlayRef}
        boardWidth={boardWidth}
        boardHeight={boardHeight}
        timeDepth={timeDepth}
        turn={turn}
        currentTime={currentTime}
        phase={phase}
        directionalActionMode={directionalActionMode}
        riftDefaultDelta={riftDefaultDelta}
        interactionConfig={interactionConfig}
        showDangerPreview={showDangerPreview}
        objectsAtCurrentTimeCount={objectsAtCurrentTime.length}
        player={player}
        contentPackId={contentPackId}
        contentPackClass={packMetaById[contentPackId]?.class}
        contentPackDifficulty={packMetaById[contentPackId]?.difficulty}
      />

      <SettingsOverlay
        isOpen={isSystemMenuOpen}
        overlayRef={settingsOverlayRef}
        uiSettings={uiSettings}
        setUiSettings={setUiSettings}
        setShowDangerPreview={setShowDangerPreview}
      />

      <ProgressionOverlay
        isOpen={isProgressionOverlayOpen}
        overlayRef={progressionOverlayRef}
        progressionManifest={progressionManifest}
        progressionState={progressionState}
        progressionError={progressionError}
        packMetaById={packMetaById}
        currentContentPackId={contentPackId}
        onSelectTrack={setSelectedTrack}
        onSelectEntryIndex={setCurrentEntryIndex}
        onLoadPack={(packId) => {
          dispatch(setContentPackId(packId))
          applyMachineTransition(closeTopLayer(inputMachine))
        }}
      />
    </div>
  )
}
