import { objectsAtTime, type TimeCube } from '../../core/timeCube'
import { positionsAtTime, type WorldLineState } from '../../core/worldLine'
import { selectIsoWindow } from './selectIsoWindow'

export interface IsoRenderObject {
  id: string
  x: number
  y: number
  kind: string
  render: { fill?: string; stroke?: string; symbol?: string }
}

export interface IsoRenderSelf {
  x: number
  y: number
  turn: number
}

export interface IsoWindowSlice {
  t: number
  isFocus: boolean
  playerSelves: IsoRenderSelf[]
  objects: IsoRenderObject[]
}

export interface IsoCubeViewModel {
  startT: number
  endT: number
  focusT: number
  slices: IsoWindowSlice[]
}

export interface BuildIsoViewModelInput {
  currentT: number
  timeDepth: number
  worldLine: WorldLineState
  cube: TimeCube
  maxWindow?: number
}

export function buildIsoViewModel(input: BuildIsoViewModelInput): IsoCubeViewModel {
  const window = selectIsoWindow(input.currentT, input.timeDepth, input.maxWindow)
  const slices: IsoWindowSlice[] = []

  for (let t = window.startT; t <= window.endT; t += 1) {
    const playerSelves = positionsAtTime(input.worldLine, t).map((entry) => ({
      x: entry.position.x,
      y: entry.position.y,
      turn: entry.turn,
    }))

    const objects = objectsAtTime(input.cube, t).map((object) => ({
      id: object.id,
      x: object.position.x,
      y: object.position.y,
      kind: object.archetype.kind,
      render: object.archetype.render,
    }))

    slices.push({
      t,
      isFocus: t === window.focusT,
      playerSelves,
      objects,
    })
  }

  return {
    startT: window.startT,
    endT: window.endT,
    focusT: window.focusT,
    slices,
  }
}
