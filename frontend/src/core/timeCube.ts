import { hasComponent } from './components'
import type { Position2D, Position3D } from './position'
import type { ResolvedObjectInstance } from './objects'
import type { Result } from './result'

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

export type RelocationError =
  | { kind: 'InvalidRelocationTime'; t: number }
  | { kind: 'EntityNotInSlice'; id: string; t: number }
  | { kind: 'TargetOccupied'; id: string; x: number; y: number; t: number }

export interface ObjectRelocation {
  id: string
  from: Position3D
  to: Position3D
}

function spatialKey(position: Position2D): string {
  return `${position.x},${position.y}`
}

function parseSpatialKey(key: string): Position2D | null {
  const [xText, yText] = key.split(',')
  const x = Number(xText)
  const y = Number(yText)

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  return { x, y }
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

function isInPlaneBounds(cube: TimeCube, position: Position2D): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < cube.width &&
    position.y < cube.height
  )
}

function isInCubeBounds(cube: TimeCube, position: Position3D): boolean {
  return (
    position.t >= 0 &&
    position.t < cube.timeDepth &&
    isInPlaneBounds(cube, { x: position.x, y: position.y })
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
    .map((id) => {
      const object = cube.objectsById[id]

      if (!object) {
        return null
      }

      return {
        ...object,
        position: { x: position.x, y: position.y, t: position.t },
      } satisfies ResolvedObjectInstance
    })
    .filter((object): object is ResolvedObjectInstance => Boolean(object))
}

export function objectsAtTime(cube: TimeCube, t: number): ResolvedObjectInstance[] {
  if (t < 0 || t >= cube.timeDepth) {
    return []
  }

  const slice = cube.slices[t]
  const results: ResolvedObjectInstance[] = []

  for (const [key, ids] of Object.entries(slice.spatialIndex)) {
    const position = parseSpatialKey(key)

    if (!position) {
      continue
    }

    for (const id of ids) {
      const object = cube.objectsById[id]

      if (!object) {
        continue
      }

      results.push({
        ...object,
        position: { x: position.x, y: position.y, t },
      })
    }
  }

  return results
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

function cloneSlice(slice: TimeSlice): TimeSlice {
  const nextIndex: TimeSlice['spatialIndex'] = {}

  for (const [key, ids] of Object.entries(slice.spatialIndex)) {
    nextIndex[key] = [...ids]
  }

  return {
    t: slice.t,
    objectIds: [...slice.objectIds],
    spatialIndex: nextIndex,
  }
}

function removeId(ids: string[], id: string): string[] {
  return ids.filter((entry) => entry !== id)
}

export function applyRelocationsFromTime(
  cube: TimeCube,
  startTime: number,
  relocations: ObjectRelocation[],
): Result<TimeCube, CubeError | RelocationError> {
  if (startTime < 0 || startTime >= cube.timeDepth) {
    return { ok: false, error: { kind: 'InvalidRelocationTime', t: startTime } }
  }

  if (relocations.length === 0) {
    return { ok: true, value: cube }
  }

  const nextSlices = cube.slices.map(cloneSlice)
  const relocatedIds = new Set(relocations.map((relocation) => relocation.id))
  const nextObjectsById = { ...cube.objectsById }

  for (let t = startTime; t < cube.timeDepth; t += 1) {
    const slice = nextSlices[t]

    for (const relocation of relocations) {
      if (!isInPlaneBounds(cube, relocation.to)) {
        return {
          ok: false,
          error: {
            kind: 'OutOfBounds',
            x: relocation.to.x,
            y: relocation.to.y,
            t,
          },
        }
      }

      const toKey = spatialKey(relocation.to)
      const targetIds = slice.spatialIndex[toKey] ?? []
      const remaining = targetIds.filter((id) => !relocatedIds.has(id))

      if (remaining.length > 0) {
        return {
          ok: false,
          error: {
            kind: 'TargetOccupied',
            id: remaining[0],
            x: relocation.to.x,
            y: relocation.to.y,
            t,
          },
        }
      }
    }

    for (const relocation of relocations) {
      const fromKey = spatialKey(relocation.from)
      const sourceIds = slice.spatialIndex[fromKey] ?? []

      if (!sourceIds.includes(relocation.id)) {
        return {
          ok: false,
          error: {
            kind: 'EntityNotInSlice',
            id: relocation.id,
            t,
          },
        }
      }

      const nextSourceIds = removeId(sourceIds, relocation.id)

      if (nextSourceIds.length === 0) {
        delete slice.spatialIndex[fromKey]
      } else {
        slice.spatialIndex[fromKey] = nextSourceIds
      }
    }

    for (const relocation of relocations) {
      const toKey = spatialKey(relocation.to)
      const targetIds = slice.spatialIndex[toKey] ?? []
      slice.spatialIndex[toKey] = [...targetIds, relocation.id]
    }
  }

  for (const relocation of relocations) {
    const object = nextObjectsById[relocation.id]

    if (!object) {
      return { ok: false, error: { kind: 'EntityNotFound', id: relocation.id } }
    }

    nextObjectsById[relocation.id] = {
      ...object,
      position: { x: relocation.to.x, y: relocation.to.y, t: startTime },
    }
  }

  return {
    ok: true,
    value: {
      ...cube,
      objectsById: nextObjectsById,
      slices: nextSlices,
    },
  }
}
