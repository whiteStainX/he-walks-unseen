import { Edges, Line } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'

import type { IsoCubeViewModel } from './buildIsoViewModel'
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

function sliceOpacity(t: number, focusT: number): number {
  const delta = Math.abs(t - focusT)
  return Math.max(0.34, 1 - delta * 0.1)
}

function slabOpacity(t: number, focusT: number): number {
  const delta = Math.abs(t - focusT)
  return Math.max(0.08, 0.24 - delta * 0.022)
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

export function IsoTimeCubePanel({ boardSize, currentTurn, viewModel }: IsoTimeCubePanelProps) {
  const theme = minimalMonoTheme.iso
  const levelCount = viewModel.slices.length
  const boardSpan = boardSize * CELL_SPACING
  const verticalSpan = Math.max(0, (levelCount - 1) * SLICE_SPACING)
  const verticalOffset = -verticalSpan / 2
  const framingSpan = Math.max(boardSpan * 1.4, verticalSpan * 2 + boardSpan * 0.58)
  const dynamicZoom = Math.max(12, 110 / framingSpan)
  const worldLinePoints = useMemo(() => {
    const points = viewModel.slices
      .flatMap((slice) =>
        slice.playerSelves.map((self) => ({
          x: self.x,
          y: self.y,
          t: slice.t,
          turn: self.turn,
        })),
      )
      .sort((a, b) => a.turn - b.turn)
      .map((point) => {
        const world = cellToWorld(point.x, point.y, point.t, viewModel.startT, boardSize)
        return [world[0], world[1] + PLAYER_HEIGHT + 0.16, world[2]] as [number, number, number]
      })

    return points
  }, [boardSize, viewModel])

  return (
    <div className="iso-cube-wrap" aria-label="Isometric TimeCube panel">
      <Canvas
        orthographic
        dpr={[1, 1.5]}
        camera={{
          position: [11.2, 12.8, 11.2],
          zoom: dynamicZoom,
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
                  <meshBasicMaterial color={slabFill} transparent opacity={slabFillOpacity} />
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

          {viewModel.slices.map((slice) => {
            const objectOpacity = sliceOpacity(slice.t, viewModel.focusT)

            return slice.objects.map((object) => {
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

          {worldLinePoints.length >= 2 && (
            <Line
              points={worldLinePoints}
              color={theme.worldLine}
              transparent
              opacity={0.65}
              lineWidth={1.3}
            />
          )}
        </group>
      </Canvas>
    </div>
  )
}
