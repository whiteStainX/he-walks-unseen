import type { IsoTrackPoint } from './trajectory'
import type { IsoTheme } from '../theme'

export function sliceOpacity(t: number, focusT: number, theme: IsoTheme): number {
  const delta = Math.abs(t - focusT)
  return Math.max(theme.view.sliceOpacityMin, 1 - delta * theme.view.sliceOpacityDecay)
}

export function slabOpacity(t: number, focusT: number, theme: IsoTheme): number {
  const delta = Math.abs(t - focusT)

  if (delta === 0) {
    return theme.view.slabFocusOpacity
  }

  return Math.max(
    theme.view.slabMinOpacity,
    theme.view.slabFocusOpacity - (delta - 1) * theme.view.slabOpacityDecay,
  )
}

export function pathOpacity(
  t: number,
  focusT: number,
  theme: IsoTheme,
  maxOpacity = 0.8,
): number {
  const delta = Math.abs(t - focusT)
  return Math.max(theme.view.pathOpacityMin, maxOpacity - delta * theme.view.pathOpacityDecay)
}

export function cellToWorld(
  x: number,
  y: number,
  t: number,
  startT: number,
  boardWidth: number,
  boardHeight: number,
  theme: IsoTheme,
): [number, number, number] {
  const halfX = (boardWidth - 1) / 2
  const halfZ = (boardHeight - 1) / 2
  const spacing = theme.view.cellSpacing

  return [(x - halfX) * spacing, (t - startT) * theme.view.sliceSpacing, (y - halfZ) * spacing]
}

export function trackPointToWorld(
  point: IsoTrackPoint,
  startT: number,
  boardWidth: number,
  boardHeight: number,
  yOffset: number,
  theme: IsoTheme,
): [number, number, number] {
  const world = cellToWorld(point.x, point.y, point.t, startT, boardWidth, boardHeight, theme)
  return [world[0], world[1] + yOffset, world[2]]
}

export function sliceFramePoints(
  boardWidth: number,
  boardHeight: number,
  levelY: number,
  theme: IsoTheme,
): Array<[number, number, number]> {
  const halfX = (boardWidth * theme.view.cellSpacing) / 2
  const halfZ = (boardHeight * theme.view.cellSpacing) / 2

  return [
    [-halfX, levelY, -halfZ],
    [halfX, levelY, -halfZ],
    [halfX, levelY, halfZ],
    [-halfX, levelY, halfZ],
    [-halfX, levelY, -halfZ],
  ]
}

