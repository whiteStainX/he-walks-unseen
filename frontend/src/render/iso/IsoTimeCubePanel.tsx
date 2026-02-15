import { Edges, Line, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MOUSE, type OrthographicCamera } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import type { IsoCubeViewModel } from './buildIsoViewModel'
import { buildTrackRenderModel, type IsoPathMode, type IsoTrackPoint } from './trajectory'
import { minimalMonoTheme } from '../theme'

interface IsoTimeCubePanelProps {
  boardSize: number
  currentTurn: number
  viewModel: IsoCubeViewModel
}

const CELL_SPACING = 1
const SLICE_SPACING = 0.86
const SLICE_THICKNESS = 0.06
const OBJECT_SIZE = 0.58
const OBJECT_HEIGHT = 0.3
const PLAYER_SIZE = 0.5
const PLAYER_HEIGHT = 0.44
const CAMERA_POSITION: [number, number, number] = [11.2, 12.8, 11.2]
const DEFAULT_ZOOM_IN_STEPS = 5
const ZOOM_STEP_FACTOR = 1.15

function sliceOpacity(t: number, focusT: number): number {
  const delta = Math.abs(t - focusT)
  return Math.max(0.34, 1 - delta * 0.1)
}

function slabOpacity(t: number, focusT: number): number {
  const delta = Math.abs(t - focusT)

  if (delta === 0) {
    return 0.08
  }

  return Math.max(0.02, 0.05 - (delta - 1) * 0.008)
}

function pathOpacity(t: number, focusT: number, maxOpacity = 0.8): number {
  const delta = Math.abs(t - focusT)
  return Math.max(0.25, maxOpacity - delta * 0.08)
}

function cellToWorld(
  x: number,
  y: number,
  t: number,
  startT: number,
  boardSize: number,
): [number, number, number] {
  const half = (boardSize - 1) / 2
  return [(x - half) * CELL_SPACING, (t - startT) * SLICE_SPACING, (y - half) * CELL_SPACING]
}

function trackPointToWorld(
  point: IsoTrackPoint,
  startT: number,
  boardSize: number,
  yOffset: number,
): [number, number, number] {
  const world = cellToWorld(point.x, point.y, point.t, startT, boardSize)
  return [world[0], world[1] + yOffset, world[2]]
}

function sliceFramePoints(boardSize: number, levelY: number): Array<[number, number, number]> {
  const half = (boardSize * CELL_SPACING) / 2
  return [
    [-half, levelY, -half],
    [half, levelY, -half],
    [half, levelY, half],
    [-half, levelY, half],
    [-half, levelY, -half],
  ]
}

function ObjectBlock({
  kind,
  colorFill,
  colorStroke,
  opacity,
  position,
}: {
  kind: string
  colorFill: string
  colorStroke: string
  opacity: number
  position: [number, number, number]
}) {
  const objectHeight = kind === 'exit' ? OBJECT_HEIGHT * 0.7 : OBJECT_HEIGHT

  return (
    <group position={[position[0], position[1] + objectHeight / 2 + SLICE_THICKNESS / 2, position[2]]}>
      <mesh>
        <boxGeometry args={[OBJECT_SIZE, objectHeight, OBJECT_SIZE]} />
        <meshBasicMaterial color={colorFill} transparent opacity={opacity} />
        <Edges
          color={colorStroke}
          scale={1.001}
          threshold={15}
          transparent
          opacity={Math.min(1, opacity + 0.15)}
        />
      </mesh>
    </group>
  )
}

function PlayerBlock({
  colorFill,
  colorStroke,
  opacity,
  position,
}: {
  colorFill: string
  colorStroke: string
  opacity: number
  position: [number, number, number]
}) {
  return (
    <group position={[position[0], position[1] + PLAYER_HEIGHT / 2 + SLICE_THICKNESS / 2, position[2]]}>
      <mesh>
        <boxGeometry args={[PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE]} />
        <meshBasicMaterial color={colorFill} transparent opacity={opacity} />
        <Edges
          color={colorStroke}
          scale={1.001}
          threshold={15}
          transparent
          opacity={Math.min(1, opacity + 0.2)}
        />
      </mesh>
    </group>
  )
}

function TrackAnchor({
  position,
  size,
  color,
  opacity,
}: {
  position: [number, number, number]
  size: number
  color: string
  opacity: number
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={[size, size, size]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

function ObjectPillar({
  x,
  z,
  centerY,
  height,
  colorFill,
  colorStroke,
}: {
  x: number
  z: number
  centerY: number
  height: number
  colorFill: string
  colorStroke: string
}) {
  return (
    <group position={[x, centerY, z]}>
      <mesh>
        <boxGeometry args={[OBJECT_SIZE * 0.22, height, OBJECT_SIZE * 0.22]} />
        <meshBasicMaterial color={colorFill} transparent opacity={0.36} />
        <Edges color={colorStroke} scale={1.001} threshold={15} transparent opacity={0.55} />
      </mesh>
    </group>
  )
}

export function IsoTimeCubePanel({ boardSize, currentTurn, viewModel }: IsoTimeCubePanelProps) {
  const cameraRef = useRef<OrthographicCamera | null>(null)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [pathMode, setPathMode] = useState<IsoPathMode>('organic')
  const theme = minimalMonoTheme.iso
  const levelCount = viewModel.slices.length
  const boardSpan = boardSize * CELL_SPACING
  const verticalSpan = Math.max(0, (levelCount - 1) * SLICE_SPACING)
  const verticalOffset = -verticalSpan / 2
  const framingSpan = Math.max(boardSpan * 1.4, verticalSpan * 2 + boardSpan * 0.58)
  const fitZoom = Math.max(12, 110 / framingSpan)
  const baseZoom = fitZoom * ZOOM_STEP_FACTOR ** DEFAULT_ZOOM_IN_STEPS
  const minZoom = fitZoom * 0.7
  const maxZoom = fitZoom * 3.2

  const staticObjectIds = useMemo(
    () => new Set(viewModel.objectPillars.map((pillar) => pillar.id)),
    [viewModel.objectPillars],
  )

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
    const camera = cameraRef.current
    const controls = controlsRef.current

    if (!camera || !controls) {
      return
    }

    camera.position.set(CAMERA_POSITION[0], CAMERA_POSITION[1], CAMERA_POSITION[2])
    camera.zoom = baseZoom
    camera.updateProjectionMatrix()
    controls.target.set(0, 0, 0)
    controls.update()
  }, [baseZoom])

  const stepZoom = useCallback(
    (delta: 'in' | 'out') => {
      const camera = cameraRef.current
      const controls = controlsRef.current

      if (!camera || !controls) {
        return
      }

      const factor = delta === 'in' ? ZOOM_STEP_FACTOR : 1 / ZOOM_STEP_FACTOR
      const nextZoom = Math.min(maxZoom, Math.max(minZoom, camera.zoom * factor))

      camera.zoom = nextZoom
      camera.updateProjectionMatrix()
      controls.update()
    },
    [maxZoom, minZoom],
  )

  useEffect(() => {
    applyResetView()
  }, [applyResetView])

  return (
    <div className="iso-cube-wrap" aria-label="Isometric TimeCube panel">
      <div className="iso-controls" aria-label="Isometric camera controls">
        <button
          type="button"
          className="iso-control-button"
          onClick={() => stepZoom('out')}
          aria-label="Zoom out isometric view"
        >
          -
        </button>
        <button
          type="button"
          className="iso-control-button"
          onClick={() => stepZoom('in')}
          aria-label="Zoom in isometric view"
        >
          +
        </button>
        <button
          type="button"
          className="iso-control-button"
          onClick={applyResetView}
          aria-label="Reset isometric view"
        >
          Reset
        </button>
        <button
          type="button"
          className={['iso-control-button', pathMode === 'organic' ? 'is-active' : ''].join(' ')}
          onClick={() => setPathMode('organic')}
          aria-label="Use organic trajectory view"
        >
          Org
        </button>
        <button
          type="button"
          className={['iso-control-button', pathMode === 'exact' ? 'is-active' : ''].join(' ')}
          onClick={() => setPathMode('exact')}
          aria-label="Use exact trajectory view"
        >
          Exact
        </button>
      </div>
      <Canvas
        orthographic
        dpr={[1, 1.5]}
        onCreated={({ camera }) => {
          cameraRef.current = camera as OrthographicCamera
          applyResetView()
        }}
        camera={{
          position: CAMERA_POSITION,
          zoom: baseZoom,
          near: 0.1,
          far: 500,
        }}
      >
        <color attach="background" args={[theme.background]} />
        <group position={[0, verticalOffset, 0]}>
          {viewModel.slices.map((slice) => {
            const levelY = (slice.t - viewModel.startT) * SLICE_SPACING
            const frameOpacity = sliceOpacity(slice.t, viewModel.focusT)
            const slabFillOpacity = slabOpacity(slice.t, viewModel.focusT)
            const lineColor = slice.isFocus ? theme.layerLineFocus : theme.layerLine
            const slabFill = slice.isFocus ? theme.layerFillFocus : theme.layerFill

            return (
              <group key={`slice-frame-${slice.t}`}>
                <mesh position={[0, levelY, 0]}>
                  <boxGeometry args={[boardSpan, SLICE_THICKNESS, boardSpan]} />
                  <meshBasicMaterial
                    color={slabFill}
                    transparent
                    opacity={slabFillOpacity}
                    depthWrite={false}
                  />
                </mesh>
                <Line
                  points={sliceFramePoints(boardSize, levelY + SLICE_THICKNESS / 2 + 0.01)}
                  color={lineColor}
                  transparent
                  opacity={frameOpacity}
                  lineWidth={slice.isFocus ? 1.8 : 1.1}
                />
              </group>
            )
          })}

          {viewModel.objectPillars.map((pillar) => {
            const base = cellToWorld(pillar.x, pillar.y, pillar.startT, viewModel.startT, boardSize)
            const startY = (pillar.startT - viewModel.startT) * SLICE_SPACING + SLICE_THICKNESS / 2
            const endY = (pillar.endT - viewModel.startT) * SLICE_SPACING + SLICE_THICKNESS / 2
            const height = Math.max(SLICE_SPACING * 0.65, endY - startY + OBJECT_HEIGHT * 0.55)
            const centerY = (startY + endY) / 2 + OBJECT_HEIGHT * 0.1

            return (
              <ObjectPillar
                key={`pillar-${pillar.id}`}
                x={base[0]}
                z={base[2]}
                centerY={centerY}
                height={height}
                colorFill={pillar.render.fill ?? theme.objectFill}
                colorStroke={pillar.render.stroke ?? theme.objectStroke}
              />
            )
          })}

          {movingObjectTracks.map((track) => {
            const pathColor = track.render.stroke ?? theme.objectStroke

            return (
              <group key={`object-track-${track.id}`}>
                {track.renderTrack.localPaths.map((path, index) => {
                  const worldPoints = path.map((point) =>
                    trackPointToWorld(point, viewModel.startT, boardSize, OBJECT_HEIGHT + 0.12),
                  )
                  const averageT = path.reduce((sum, point) => sum + point.t, 0) / path.length

                  return (
                    <Line
                      key={`object-track-local-${track.id}-${index}`}
                      points={worldPoints}
                      color={pathColor}
                      transparent
                      opacity={pathOpacity(averageT, viewModel.focusT, 0.58)}
                      lineWidth={1}
                    />
                  )
                })}

                {track.renderTrack.riftBridges.map((bridge, index) => (
                  <Line
                    key={`object-track-rift-${track.id}-${index}`}
                    points={[
                      trackPointToWorld(bridge.from, viewModel.startT, boardSize, OBJECT_HEIGHT + 0.12),
                      trackPointToWorld(bridge.to, viewModel.startT, boardSize, OBJECT_HEIGHT + 0.12),
                    ]}
                    color={pathColor}
                    dashed
                    dashSize={0.12}
                    gapSize={0.08}
                    transparent
                    opacity={0.48}
                    lineWidth={1}
                  />
                ))}

                {track.renderTrack.anchors.map((anchor, index) => (
                  <TrackAnchor
                    key={`object-track-anchor-${track.id}-${index}`}
                    position={trackPointToWorld(anchor, viewModel.startT, boardSize, OBJECT_HEIGHT + 0.12)}
                    size={0.055}
                    color={pathColor}
                    opacity={0.6}
                  />
                ))}
              </group>
            )
          })}

          {viewModel.slices.map((slice) => {
            const objectOpacity = sliceOpacity(slice.t, viewModel.focusT)

            return slice.objects.map((object) => {
              if (staticObjectIds.has(object.id) && !slice.isFocus) {
                return null
              }

              const position = cellToWorld(object.x, object.y, slice.t, viewModel.startT, boardSize)
              const palette =
                object.kind === 'enemy'
                  ? {
                      fill: theme.enemyFill,
                      stroke: theme.enemyStroke,
                    }
                  : object.kind === 'exit'
                    ? {
                        fill: theme.exitFill,
                        stroke: theme.exitStroke,
                      }
                    : {
                        fill: object.render.fill ?? theme.objectFill,
                        stroke: object.render.stroke ?? theme.objectStroke,
                      }

              return (
                <ObjectBlock
                  key={`object-${slice.t}-${object.id}`}
                  kind={object.kind}
                  position={position}
                  opacity={objectOpacity}
                  colorFill={palette.fill}
                  colorStroke={palette.stroke}
                />
              )
            })
          })}

          {viewModel.slices.map((slice) => {
            const selfOpacity = sliceOpacity(slice.t, viewModel.focusT)

            return slice.playerSelves.map((self) => {
              const isCurrentTurnSelf = self.turn === currentTurn
              const position = cellToWorld(self.x, self.y, slice.t, viewModel.startT, boardSize)

              return (
                <PlayerBlock
                  key={`self-${slice.t}-${self.turn}`}
                  position={position}
                  opacity={selfOpacity}
                  colorFill={isCurrentTurnSelf ? theme.selfFill : theme.pastSelfFill}
                  colorStroke={isCurrentTurnSelf ? theme.selfStroke : theme.pastSelfStroke}
                />
              )
            })
          })}

          {playerTrack.localPaths.map((path, index) => {
            const worldPoints = path.map((point) =>
              trackPointToWorld(point, viewModel.startT, boardSize, PLAYER_HEIGHT + 0.16),
            )
            const averageT = path.reduce((sum, point) => sum + point.t, 0) / path.length

            return (
              <Line
                key={`player-track-local-${index}`}
                points={worldPoints}
                color={theme.worldLine}
                transparent
                opacity={pathOpacity(averageT, viewModel.focusT, 0.9)}
                lineWidth={1.35}
              />
            )
          })}

          {playerTrack.riftBridges.map((bridge, index) => (
            <Line
              key={`player-track-rift-${index}`}
              points={[
                trackPointToWorld(bridge.from, viewModel.startT, boardSize, PLAYER_HEIGHT + 0.16),
                trackPointToWorld(bridge.to, viewModel.startT, boardSize, PLAYER_HEIGHT + 0.16),
              ]}
              color={theme.worldLine}
              dashed
              dashSize={0.14}
              gapSize={0.1}
              transparent
              opacity={0.72}
              lineWidth={1.15}
            />
          ))}

          {playerTrack.anchors.map((anchor) => {
            const isCurrentTurnAnchor = anchor.turn === currentTurn
            const position = trackPointToWorld(anchor, viewModel.startT, boardSize, PLAYER_HEIGHT + 0.16)

            return (
              <TrackAnchor
                key={`player-anchor-${anchor.turn ?? `${anchor.x}-${anchor.y}-${anchor.t}`}`}
                position={position}
                size={isCurrentTurnAnchor ? 0.11 : 0.085}
                color={isCurrentTurnAnchor ? theme.selfStroke : theme.pastSelfStroke}
                opacity={isCurrentTurnAnchor ? 1 : 0.78}
              />
            )
          })}
        </group>
        <OrbitControls
          ref={controlsRef}
          enableRotate={false}
          enablePan
          enableZoom
          screenSpacePanning
          minZoom={minZoom}
          maxZoom={maxZoom}
          mouseButtons={{
            LEFT: MOUSE.PAN,
            RIGHT: MOUSE.PAN,
            MIDDLE: MOUSE.DOLLY,
          }}
        />
      </Canvas>
    </div>
  )
}
