import { objectsAtTime, type TimeCube } from '../../core/timeCube'
import type { WorldLineState } from '../../core/worldLine'
import { selectIsoWindow } from './selectIsoWindow'
import type { IsoTrackPoint } from './trajectory'

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

export interface IsoObjectPillar {
  id: string
  x: number
  y: number
  startT: number
  endT: number
  kind: string
  render: { fill?: string; stroke?: string; symbol?: string }
}

export interface IsoMovingObjectTrack {
  id: string
  kind: string
  render: { fill?: string; stroke?: string; symbol?: string }
  anchors: IsoTrackPoint[]
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
  playerAnchors: IsoTrackPoint[]
  objectPillars: IsoObjectPillar[]
  movingObjectTracks: IsoMovingObjectTrack[]
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
  const objectPointsById = new Map<
    string,
    {
      id: string
      kind: string
      render: { fill?: string; stroke?: string; symbol?: string }
      anchors: IsoTrackPoint[]
    }
  >()

  for (let t = window.startT; t <= window.endT; t += 1) {
    const playerSelves = input.worldLine.path
      .map((position, turn) => ({ position, turn }))
      .filter((entry) => entry.position.t === t)
      .map((entry) => ({
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

    for (const object of objects) {
      const existing = objectPointsById.get(object.id)

      if (!existing) {
        objectPointsById.set(object.id, {
          id: object.id,
          kind: object.kind,
          render: object.render,
          anchors: [{ x: object.x, y: object.y, t }],
        })
        continue
      }

      existing.anchors.push({ x: object.x, y: object.y, t })
    }

    slices.push({
      t,
      isFocus: t === window.focusT,
      playerSelves,
      objects,
    })
  }

  const playerAnchors: IsoTrackPoint[] = input.worldLine.path
    .map((position, turn) => ({
      x: position.x,
      y: position.y,
      t: position.t,
      turn,
    }))
    .filter((entry) => entry.t >= window.startT && entry.t <= window.endT)
    .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0))

  const objectPillars: IsoObjectPillar[] = []
  const movingObjectTracks: IsoMovingObjectTrack[] = []

  for (const entry of objectPointsById.values()) {
    const sortedAnchors = [...entry.anchors].sort((a, b) => a.t - b.t)
    const isStatic =
      sortedAnchors.length > 1 &&
      sortedAnchors.every(
        (anchor) => anchor.x === sortedAnchors[0].x && anchor.y === sortedAnchors[0].y,
      )

    if (isStatic) {
      objectPillars.push({
        id: entry.id,
        kind: entry.kind,
        render: entry.render,
        x: sortedAnchors[0].x,
        y: sortedAnchors[0].y,
        startT: sortedAnchors[0].t,
        endT: sortedAnchors[sortedAnchors.length - 1].t,
      })
      continue
    }

    if (sortedAnchors.length >= 2) {
      movingObjectTracks.push({
        id: entry.id,
        kind: entry.kind,
        render: entry.render,
        anchors: sortedAnchors,
      })
    }
  }

  return {
    startT: window.startT,
    endT: window.endT,
    focusT: window.focusT,
    slices,
    playerAnchors,
    objectPillars,
    movingObjectTracks,
  }
}
