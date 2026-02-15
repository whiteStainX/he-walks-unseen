import { CatmullRomCurve3, Vector3 } from 'three'

export type IsoPathMode = 'organic' | 'exact'

export interface IsoTrackPoint {
  x: number
  y: number
  t: number
  turn?: number
}

export interface IsoTrackBridge {
  from: IsoTrackPoint
  to: IsoTrackPoint
}

export interface IsoTrackRenderModel {
  anchors: IsoTrackPoint[]
  localPaths: IsoTrackPoint[][]
  riftBridges: IsoTrackBridge[]
}

function manhattan2D(a: IsoTrackPoint, b: IsoTrackPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function isLocalEdge(a: IsoTrackPoint, b: IsoTrackPoint): boolean {
  return Math.abs(a.t - b.t) === 1 && manhattan2D(a, b) <= 1
}

function smoothPath(points: IsoTrackPoint[]): IsoTrackPoint[] {
  if (points.length < 3) {
    return points
  }

  const curve = new CatmullRomCurve3(
    points.map((point) => new Vector3(point.x, point.t, point.y)),
    false,
    'centripetal',
    0.5,
  )
  const sampleCount = Math.max((points.length - 1) * 10, 16)

  return curve.getPoints(sampleCount).map((sample) => ({
    x: sample.x,
    y: sample.z,
    t: sample.y,
  }))
}

export function buildTrackRenderModel(
  anchors: IsoTrackPoint[],
  mode: IsoPathMode,
): IsoTrackRenderModel {
  if (anchors.length === 0) {
    return {
      anchors: [],
      localPaths: [],
      riftBridges: [],
    }
  }

  if (anchors.length === 1) {
    return {
      anchors,
      localPaths: [],
      riftBridges: [],
    }
  }

  const localSegments: IsoTrackPoint[][] = []
  const riftBridges: IsoTrackBridge[] = []
  let currentSegment: IsoTrackPoint[] = [anchors[0]]

  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1]
    const next = anchors[index]

    if (isLocalEdge(previous, next)) {
      currentSegment.push(next)
      continue
    }

    if (currentSegment.length >= 2) {
      localSegments.push(currentSegment)
    }

    riftBridges.push({ from: previous, to: next })
    currentSegment = [next]
  }

  if (currentSegment.length >= 2) {
    localSegments.push(currentSegment)
  }

  const localPaths =
    mode === 'organic'
      ? localSegments.map((segment) => smoothPath(segment))
      : localSegments

  return {
    anchors,
    localPaths,
    riftBridges,
  }
}
