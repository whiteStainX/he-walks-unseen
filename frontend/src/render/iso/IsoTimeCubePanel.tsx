import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OrthographicCamera } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import { IsoActors } from './IsoActors'
import { IsoControlBar, IsoOrbitSceneControls } from './IsoCameraControls'
import { IsoSlices } from './IsoSlices'
import { IsoTracks } from './IsoTracks'
import type { IsoCubeViewModel } from './buildIsoViewModel'
import { applyIsoCameraReset } from './camera'
import { buildTrackRenderModel, type IsoPathMode } from './trajectory'
import { minimalMonoTheme } from '../theme'

interface IsoTimeCubePanelProps {
  boardWidth: number
  boardHeight: number
  currentTurn: number
  viewModel: IsoCubeViewModel
}

export function IsoTimeCubePanel({
  boardWidth,
  boardHeight,
  currentTurn,
  viewModel,
}: IsoTimeCubePanelProps) {
  const cameraRef = useRef<OrthographicCamera | null>(null)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [pathMode, setPathMode] = useState<IsoPathMode>('organic')
  const theme = minimalMonoTheme.iso

  const levelCount = viewModel.slices.length
  const boardSpanX = boardWidth * theme.view.cellSpacing
  const boardSpanZ = boardHeight * theme.view.cellSpacing
  const boardSpanMax = Math.max(boardSpanX, boardSpanZ)
  const verticalSpan = Math.max(0, (levelCount - 1) * theme.view.sliceSpacing)
  const verticalOffset = -verticalSpan / 2
  const framingSpan = Math.max(boardSpanMax * 1.4, verticalSpan * 2 + boardSpanMax * 0.58)
  const fitZoom = Math.max(12, 110 / framingSpan)
  const baseZoom = fitZoom * theme.view.zoomStepFactor ** theme.view.defaultZoomInSteps
  const minZoom = fitZoom * 0.7
  const maxZoom = fitZoom * 3.2

  const playerTrack = useMemo(
    () => buildTrackRenderModel(viewModel.playerAnchors, pathMode),
    [pathMode, viewModel.playerAnchors],
  )

  const movingObjectTracks = useMemo(
    () =>
      viewModel.movingObjectTracks.map((track) => ({
        ...track,
        renderTrack: buildTrackRenderModel(track.anchors, pathMode),
      })),
    [pathMode, viewModel.movingObjectTracks],
  )

  const applyResetView = useCallback(() => {
    applyIsoCameraReset(
      cameraRef,
      controlsRef,
      theme.view.cameraPosition,
      baseZoom,
    )
  }, [baseZoom, theme.view.cameraPosition])

  const stepZoom = useCallback(
    (delta: 'in' | 'out') => {
      const camera = cameraRef.current
      const controls = controlsRef.current

      if (!camera || !controls) {
        return
      }

      const factor =
        delta === 'in' ? theme.view.zoomStepFactor : 1 / theme.view.zoomStepFactor
      const nextZoom = Math.min(maxZoom, Math.max(minZoom, camera.zoom * factor))

      camera.zoom = nextZoom
      camera.updateProjectionMatrix()
      controls.update()
    },
    [maxZoom, minZoom, theme.view.zoomStepFactor],
  )

  useEffect(() => {
    applyResetView()
  }, [applyResetView])

  return (
    <div className="iso-cube-wrap" aria-label="Isometric TimeCube panel">
      <IsoControlBar
        pathMode={pathMode}
        onPathModeChange={setPathMode}
        onZoomIn={() => stepZoom('in')}
        onZoomOut={() => stepZoom('out')}
        onReset={applyResetView}
      />
      <Canvas
        orthographic
        dpr={[1, 1.5]}
        onCreated={({ camera }) => {
          cameraRef.current = camera as OrthographicCamera
          applyResetView()
        }}
        camera={{
          position: theme.view.cameraPosition,
          zoom: baseZoom,
          near: 0.1,
          far: 500,
        }}
      >
        <color attach="background" args={[theme.background]} />
        <group position={[0, verticalOffset, 0]}>
          <IsoSlices
            boardWidth={boardWidth}
            boardHeight={boardHeight}
            viewModel={viewModel}
            theme={theme}
          />
          <IsoTracks
            boardWidth={boardWidth}
            boardHeight={boardHeight}
            currentTurn={currentTurn}
            viewModel={viewModel}
            playerTrack={playerTrack}
            movingObjectTracks={movingObjectTracks}
            theme={theme}
          />
          <IsoActors
            boardWidth={boardWidth}
            boardHeight={boardHeight}
            currentTurn={currentTurn}
            viewModel={viewModel}
            theme={theme}
          />
        </group>
        <IsoOrbitSceneControls
          controlsRef={controlsRef}
          minZoom={minZoom}
          maxZoom={maxZoom}
        />
      </Canvas>
    </div>
  )
}
