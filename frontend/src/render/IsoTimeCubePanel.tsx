import { Line } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

import type { IsoCubeViewModel } from './iso/buildIsoViewModel'
import { minimalMonoTheme } from './theme'

interface IsoTimeCubePanelProps {
  boardSize: number
  currentTurn: number
  viewModel: IsoCubeViewModel
}

const CELL_SPACING = 1
const SLICE_SPACING = 0.78
const OBJECT_SIZE = 0.6
const OBJECT_HEIGHT = 0.22
const PLAYER_SIZE = 0.52
const PLAYER_HEIGHT = 0.34

function sliceOpacity(t: number, focusT: number): number {
  const delta = Math.abs(t - focusT)
  return Math.max(0.3, 1 - delta * 0.11)
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
  const half = boardSize / 2
  return [
    [-half, levelY, -half],
    [half, levelY, -half],
    [half, levelY, half],
    [-half, levelY, half],
    [-half, levelY, -half],
  ]
}

function ObjectBlock({
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
    <group position={[position[0], position[1] + OBJECT_HEIGHT / 2, position[2]]}>
      <mesh>
        <boxGeometry args={[OBJECT_SIZE, OBJECT_HEIGHT, OBJECT_SIZE]} />
        <meshBasicMaterial color={colorFill} transparent opacity={opacity} />
      </mesh>
      <mesh>
        <boxGeometry args={[OBJECT_SIZE, OBJECT_HEIGHT, OBJECT_SIZE]} />
        <meshBasicMaterial color={colorStroke} wireframe transparent opacity={Math.min(1, opacity + 0.15)} />
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
    <group position={[position[0], position[1] + PLAYER_HEIGHT / 2, position[2]]}>
      <mesh>
        <boxGeometry args={[PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE]} />
        <meshBasicMaterial color={colorFill} transparent opacity={opacity} />
      </mesh>
      <mesh>
        <boxGeometry args={[PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE]} />
        <meshBasicMaterial color={colorStroke} wireframe transparent opacity={Math.min(1, opacity + 0.2)} />
      </mesh>
    </group>
  )
}

export function IsoTimeCubePanel({ boardSize, currentTurn, viewModel }: IsoTimeCubePanelProps) {
  const theme = minimalMonoTheme.iso

  return (
    <div className="iso-cube-wrap" aria-label="Isometric TimeCube panel">
      <Canvas
        orthographic
        dpr={[1, 1.5]}
        camera={{
          position: [9.5, 10.5, 9.5],
          zoom: 32,
          near: 0.1,
          far: 200,
        }}
      >
        <color attach="background" args={[theme.background]} />

        {viewModel.slices.map((slice) => {
          const levelY = (slice.t - viewModel.startT) * SLICE_SPACING
          const frameOpacity = sliceOpacity(slice.t, viewModel.focusT)
          const lineColor = slice.isFocus ? theme.layerLineFocus : theme.layerLine

          return (
            <Line
              key={`slice-frame-${slice.t}`}
              points={sliceFramePoints(boardSize, levelY)}
              color={lineColor}
              transparent
              opacity={frameOpacity}
              lineWidth={slice.isFocus ? 1.4 : 1}
            />
          )
        })}

        {viewModel.slices.map((slice) => {
          const objectOpacity = sliceOpacity(slice.t, viewModel.focusT)

          return slice.objects.map((object) => {
            const position = cellToWorld(object.x, object.y, slice.t, viewModel.startT, boardSize)

            return (
              <ObjectBlock
                key={`object-${slice.t}-${object.id}`}
                position={position}
                opacity={objectOpacity}
                colorFill={object.render.fill ?? theme.objectFill}
                colorStroke={object.render.stroke ?? theme.objectStroke}
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
      </Canvas>
    </div>
  )
}

