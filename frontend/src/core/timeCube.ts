import { hasComponent } from './components'
import { isInBounds, type Position2D, type Position3D } from './position'
import type { ResolvedObjectInstance } from './objects'

export interface TimeSlice {
  t: number
  objectIds: string[]
  spatialIndex: Record<string, string[]>
}

export interface TimeCube {
  width: number
  height: number
  timeDepth: number
  slices: TimeSlice[]
  objectsById: Record<string, ResolvedObjectInstance>
}

export type CubeError =
  | { kind: 'OutOfBounds'; x: number; y: number; t: number }
  | { kind: 'EntityAlreadyExists'; id: string; t: number }
  | { kind: 'EntityNotFound'; id: string }

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

function spatialKey(position: Position2D): string {
  return `${position.x},${position.y}`
}

export function createTimeCube(width: number, height: number, timeDepth: number): TimeCube {
  const slices: TimeSlice[] = []

  for (let t = 0; t < timeDepth; t += 1) {
    slices.push({
      t,
      objectIds: [],
      spatialIndex: {},
    })
  }

  return {
    width,
    height,
    timeDepth,
    slices,
    objectsById: {},
  }
}

function isInCubeBounds(cube: TimeCube, position: Position3D): boolean {
  return (
    position.t >= 0 &&
    position.t < cube.timeDepth &&
    isInBounds({ x: position.x, y: position.y }, cube.width)
  )
}

function addToSlice(slice: TimeSlice, objectId: string, position: Position3D): TimeSlice {
  const key = spatialKey(position)
  const existingIds = slice.spatialIndex[key] ?? []

  return {
    ...slice,
    objectIds: [...slice.objectIds, objectId],
    spatialIndex: {
      ...slice.spatialIndex,
      [key]: [...existingIds, objectId],
    },
  }
}

function placeSingleObject(cube: TimeCube, object: ResolvedObjectInstance): Result<TimeCube, CubeError> {
  if (!isInCubeBounds(cube, object.position)) {
    return {
      ok: false,
      error: {
        kind: 'OutOfBounds',
        x: object.position.x,
        y: object.position.y,
        t: object.position.t,
      },
    }
  }

  if (cube.objectsById[object.id]) {
    return {
      ok: false,
      error: {
        kind: 'EntityAlreadyExists',
        id: object.id,
        t: object.position.t,
      },
    }
  }

  const isTimePersistent = hasComponent(object.archetype.components, 'TimePersistent')
  let nextCube: TimeCube = {
    ...cube,
    objectsById: {
      ...cube.objectsById,
      [object.id]: object,
    },
  }

  if (isTimePersistent) {
    const nextSlices = nextCube.slices.map((slice) =>
      addToSlice(
        slice,
        object.id,
        {
          x: object.position.x,
          y: object.position.y,
          t: slice.t,
        },
      ),
    )
    nextCube = { ...nextCube, slices: nextSlices }
  } else {
    const nextSlices = nextCube.slices.map((slice) =>
      slice.t === object.position.t ? addToSlice(slice, object.id, object.position) : slice,
    )
    nextCube = { ...nextCube, slices: nextSlices }
  }

  return { ok: true, value: nextCube }
}

export function placeObjects(
  cube: TimeCube,
  objects: ResolvedObjectInstance[],
): Result<TimeCube, CubeError> {
  let nextCube = cube

  for (const object of objects) {
    const placement = placeSingleObject(nextCube, object)

    if (!placement.ok) {
      return placement
    }

    nextCube = placement.value
  }

  return { ok: true, value: nextCube }
}

export function objectsAt(cube: TimeCube, position: Position3D): ResolvedObjectInstance[] {
  if (!isInCubeBounds(cube, position)) {
    return []
  }

  const slice = cube.slices[position.t]
  const idsAtCell = slice.spatialIndex[spatialKey(position)] ?? []

  return idsAtCell
    .map((id) => cube.objectsById[id])
    .filter((object): object is ResolvedObjectInstance => Boolean(object))
}

export function objectsAtTime(cube: TimeCube, t: number): ResolvedObjectInstance[] {
  if (t < 0 || t >= cube.timeDepth) {
    return []
  }

  return cube.slices[t].objectIds
    .map((id) => cube.objectsById[id])
    .filter((object): object is ResolvedObjectInstance => Boolean(object))
}

export function isBlocked(cube: TimeCube, position: Position3D): boolean {
  return objectsAt(cube, position).some((object) =>
    hasComponent(object.archetype.components, 'BlocksMovement'),
  )
}

export function hasExit(cube: TimeCube, position: Position3D): boolean {
  return objectsAt(cube, position).some((object) => hasComponent(object.archetype.components, 'Exit'))
}

export function getObjectById(
  cube: TimeCube,
  id: string,
): Result<ResolvedObjectInstance, CubeError> {
  const object = cube.objectsById[id]

  if (!object) {
    return { ok: false, error: { kind: 'EntityNotFound', id } }
  }

  return { ok: true, value: object }
}
