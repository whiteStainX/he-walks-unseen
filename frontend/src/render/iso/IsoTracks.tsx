import { Edges, Line } from '@react-three/drei'
import { useMemo } from 'react'
import { CatmullRomCurve3, Vector3 } from 'three'

import type { IsoCubeViewModel, IsoMovingObjectTrack } from './buildIsoViewModel'
import { pathOpacity, trackPointToWorld } from './constants'
import type { IsoTrackRenderModel } from './trajectory'
import type { IsoTheme } from '../theme'

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
  theme,
}: {
  x: number
  z: number
  centerY: number
  height: number
  colorFill: string
  colorStroke: string
  theme: IsoTheme
}) {
  return (
    <group position={[x, centerY, z]}>
      <mesh>
        <boxGeometry args={[theme.view.objectSize * 0.22, height, theme.view.objectSize * 0.22]} />
        <meshBasicMaterial color={colorFill} transparent opacity={0.36} />
        <Edges color={colorStroke} scale={1.001} threshold={15} transparent opacity={0.55} />
      </mesh>
    </group>
  )
}

function ObjectTrackTube({
  points,
  color,
  opacity,
  theme,
}: {
  points: Array<[number, number, number]>
  color: string
  opacity: number
  theme: IsoTheme
}) {
  const curve = useMemo(() => {
    if (points.length < 2) {
      return null
    }

    return new CatmullRomCurve3(
      points.map((point) => new Vector3(point[0], point[1], point[2])),
      false,
      'centripetal',
      0.5,
    )
  }, [points])

  if (!curve) {
    return null
  }

  const tubularSegments = Math.max(12, points.length * 4)

  return (
    <mesh>
      <tubeGeometry args={[curve, tubularSegments, theme.view.objectTrackTubeRadius, 8, false]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

interface MovingObjectTrackWithRender extends IsoMovingObjectTrack {
  renderTrack: IsoTrackRenderModel
}

interface IsoTracksProps {
  boardWidth: number
  boardHeight: number
  currentTurn: number
  viewModel: IsoCubeViewModel
  playerTrack: IsoTrackRenderModel
  movingObjectTracks: MovingObjectTrackWithRender[]
  theme: IsoTheme
}

export function IsoTracks({
  boardWidth,
  boardHeight,
  currentTurn,
  viewModel,
  playerTrack,
  movingObjectTracks,
  theme,
}: IsoTracksProps) {
  return (
    <>
      {viewModel.objectPillars.map((pillar) => {
        const base = trackPointToWorld(
          { x: pillar.x, y: pillar.y, t: pillar.startT },
          viewModel.startT,
          boardWidth,
          boardHeight,
          0,
          theme,
        )
        const startY = (pillar.startT - viewModel.startT) * theme.view.sliceSpacing + theme.view.sliceThickness / 2
        const endY = (pillar.endT - viewModel.startT) * theme.view.sliceSpacing + theme.view.sliceThickness / 2
        const height = Math.max(
          theme.view.sliceSpacing * 0.65,
          endY - startY + theme.view.objectHeight * 0.55,
        )
        const centerY = (startY + endY) / 2 + theme.view.objectHeight * 0.1

        return (
          <ObjectPillar
            key={`pillar-${pillar.id}`}
            x={base[0]}
            z={base[2]}
            centerY={centerY}
            height={height}
            colorFill={pillar.render.fill ?? theme.objectFill}
            colorStroke={pillar.render.stroke ?? theme.objectStroke}
            theme={theme}
          />
        )
      })}

      {movingObjectTracks.map((track) => {
        const pathColor = track.render.stroke ?? theme.objectStroke

        return (
          <group key={`object-track-${track.id}`}>
            {track.renderTrack.localPaths.map((path, index) => {
              const worldPoints = path.map((point) =>
                trackPointToWorld(
                  point,
                  viewModel.startT,
                  boardWidth,
                  boardHeight,
                  theme.view.objectHeight + 0.12,
                  theme,
                ),
              )
              const averageT = path.reduce((sum, point) => sum + point.t, 0) / path.length

              return (
                <ObjectTrackTube
                  key={`object-track-local-${track.id}-${index}`}
                  points={worldPoints}
                  color={pathColor}
                  opacity={pathOpacity(averageT, viewModel.focusT, theme, 0.58)}
                  theme={theme}
                />
              )
            })}

            {track.renderTrack.riftBridges.map((bridge, index) => (
              <Line
                key={`object-track-rift-${track.id}-${index}`}
                points={[
                  trackPointToWorld(
                    bridge.from,
                    viewModel.startT,
                    boardWidth,
                    boardHeight,
                    theme.view.objectHeight + 0.12,
                    theme,
                  ),
                  trackPointToWorld(
                    bridge.to,
                    viewModel.startT,
                    boardWidth,
                    boardHeight,
                    theme.view.objectHeight + 0.12,
                    theme,
                  ),
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
                position={trackPointToWorld(
                  anchor,
                  viewModel.startT,
                  boardWidth,
                  boardHeight,
                  theme.view.objectHeight + 0.12,
                  theme,
                )}
                size={0.055}
                color={pathColor}
                opacity={0.6}
              />
            ))}
          </group>
        )
      })}

      {playerTrack.localPaths.map((path, index) => {
        const worldPoints = path.map((point) =>
          trackPointToWorld(
            point,
            viewModel.startT,
            boardWidth,
            boardHeight,
            theme.view.playerHeight + 0.16,
            theme,
          ),
        )
        const averageT = path.reduce((sum, point) => sum + point.t, 0) / path.length

        return (
          <Line
            key={`player-track-local-${index}`}
            points={worldPoints}
            color={theme.worldLine}
            transparent
            opacity={pathOpacity(averageT, viewModel.focusT, theme, 0.9)}
            lineWidth={1.35}
          />
        )
      })}

      {playerTrack.riftBridges.map((bridge, index) => (
        <Line
          key={`player-track-rift-${index}`}
          points={[
            trackPointToWorld(
              bridge.from,
              viewModel.startT,
              boardWidth,
              boardHeight,
              theme.view.playerHeight + 0.16,
              theme,
            ),
            trackPointToWorld(
              bridge.to,
              viewModel.startT,
              boardWidth,
              boardHeight,
              theme.view.playerHeight + 0.16,
              theme,
            ),
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
        const position = trackPointToWorld(
          anchor,
          viewModel.startT,
          boardWidth,
          boardHeight,
          theme.view.playerHeight + 0.16,
          theme,
        )

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
    </>
  )
}

