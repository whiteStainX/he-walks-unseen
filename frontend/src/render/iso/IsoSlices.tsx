import { Line } from '@react-three/drei'

import type { IsoCubeViewModel } from './buildIsoViewModel'
import { slabOpacity, sliceFramePoints, sliceOpacity } from './constants'
import type { IsoTheme } from '../theme'

interface IsoSlicesProps {
  boardWidth: number
  boardHeight: number
  viewModel: IsoCubeViewModel
  theme: IsoTheme
}

export function IsoSlices({ boardWidth, boardHeight, viewModel, theme }: IsoSlicesProps) {
  const boardSpanX = boardWidth * theme.view.cellSpacing
  const boardSpanZ = boardHeight * theme.view.cellSpacing

  return (
    <>
      {viewModel.slices.map((slice) => {
        const levelY = (slice.t - viewModel.startT) * theme.view.sliceSpacing
        const frameOpacity = sliceOpacity(slice.t, viewModel.focusT, theme)
        const slabFillOpacity = slabOpacity(slice.t, viewModel.focusT, theme)
        const lineColor = slice.isFocus ? theme.layerLineFocus : theme.layerLine
        const slabFill = slice.isFocus ? theme.layerFillFocus : theme.layerFill

        return (
          <group key={`slice-frame-${slice.t}`}>
            <mesh position={[0, levelY, 0]}>
              <boxGeometry args={[boardSpanX, theme.view.sliceThickness, boardSpanZ]} />
              <meshBasicMaterial
                color={slabFill}
                transparent
                opacity={slabFillOpacity}
                depthWrite={false}
              />
            </mesh>
            <Line
              points={sliceFramePoints(
                boardWidth,
                boardHeight,
                levelY + theme.view.sliceThickness / 2 + 0.01,
                theme,
              )}
              color={lineColor}
              transparent
              opacity={frameOpacity}
              lineWidth={slice.isFocus ? 1.8 : 1.1}
            />
          </group>
        )
      })}
    </>
  )
}

