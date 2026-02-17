import { Edges } from '@react-three/drei'

import type { IsoCubeViewModel } from './buildIsoViewModel'
import { cellToWorld, sliceOpacity } from './constants'
import type { IsoTheme } from '../theme'

function ObjectBlock({
  kind,
  colorFill,
  colorStroke,
  opacity,
  position,
  theme,
}: {
  kind: string
  colorFill: string
  colorStroke: string
  opacity: number
  position: [number, number, number]
  theme: IsoTheme
}) {
  const objectHeight = kind === 'exit' ? theme.view.objectHeight * 0.7 : theme.view.objectHeight

  return (
    <group
      position={[
        position[0],
        position[1] + objectHeight / 2 + theme.view.sliceThickness / 2,
        position[2],
      ]}
    >
      <mesh>
        <boxGeometry args={[theme.view.objectSize, objectHeight, theme.view.objectSize]} />
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
  theme,
}: {
  colorFill: string
  colorStroke: string
  opacity: number
  position: [number, number, number]
  theme: IsoTheme
}) {
  return (
    <group
      position={[
        position[0],
        position[1] + theme.view.playerHeight / 2 + theme.view.sliceThickness / 2,
        position[2],
      ]}
    >
      <mesh>
        <boxGeometry args={[theme.view.playerSize, theme.view.playerHeight, theme.view.playerSize]} />
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

interface IsoActorsProps {
  boardWidth: number
  boardHeight: number
  currentTurn: number
  viewModel: IsoCubeViewModel
  theme: IsoTheme
}

export function IsoActors({
  boardWidth,
  boardHeight,
  currentTurn,
  viewModel,
  theme,
}: IsoActorsProps) {
  return (
    <>
      {viewModel.slices.map((slice) => {
        const objectOpacity = sliceOpacity(slice.t, viewModel.focusT, theme)

        return slice.objects.map((object) => {
          if (!slice.isFocus) {
            return null
          }

          const position = cellToWorld(
            object.x,
            object.y,
            slice.t,
            viewModel.startT,
            boardWidth,
            boardHeight,
            theme,
          )
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
              theme={theme}
            />
          )
        })
      })}

      {viewModel.slices.map((slice) => {
        const selfOpacity = sliceOpacity(slice.t, viewModel.focusT, theme)

        return slice.playerSelves.map((self) => {
          const isCurrentTurnSelf = self.turn === currentTurn
          const position = cellToWorld(
            self.x,
            self.y,
            slice.t,
            viewModel.startT,
            boardWidth,
            boardHeight,
            theme,
          )

          return (
            <PlayerBlock
              key={`self-${slice.t}-${self.turn}`}
              position={position}
              opacity={selfOpacity}
              colorFill={isCurrentTurnSelf ? theme.selfFill : theme.pastSelfFill}
              colorStroke={isCurrentTurnSelf ? theme.selfStroke : theme.pastSelfStroke}
              theme={theme}
            />
          )
        })
      })}
    </>
  )
}

