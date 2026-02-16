import { hasComponent, type Component } from '../core/components'
import { type ObjectRegistryError, createObjectRegistry, resolveObjectInstance, type LevelObjectsConfig, type ObjectRegistry, type ResolvedObjectInstance } from '../core/objects'
import type { Result } from '../core/result'
import { applyRelocationsFromTime, createTimeCube, placeObjects, type CubeError, type RelocationError, type TimeCube } from '../core/timeCube'
import type { Position2D } from '../core/position'

export const defaultLevelObjectsConfig: LevelObjectsConfig = {
  archetypes: {
    wall: {
      kind: 'wall',
      components: [{ kind: 'BlocksMovement' }, { kind: 'BlocksVision' }, { kind: 'TimePersistent' }],
      render: { fill: '#f0f0f0', stroke: '#111111' },
    },
    exit: {
      kind: 'exit',
      components: [{ kind: 'Exit' }, { kind: 'TimePersistent' }],
      render: { fill: '#ffffff', stroke: '#111111', symbol: 'exit' },
    },
    box: {
      kind: 'box',
      components: [
        { kind: 'BlocksMovement' },
        { kind: 'Pushable' },
        { kind: 'Pullable' },
        { kind: 'TimePersistent' },
      ],
      render: { fill: '#d9d9d9', stroke: '#111111' },
    },
    enemy: {
      kind: 'enemy',
      components: [
        { kind: 'BlocksMovement' },
        { kind: 'TimePersistent' },
        {
          kind: 'Patrol',
          path: [
            { x: 2, y: 8 },
            { x: 3, y: 8 },
            { x: 3, y: 9 },
            { x: 2, y: 9 },
          ],
          loops: true,
        },
      ],
      render: { fill: '#c6c6c6', stroke: '#111111', symbol: 'enemy' },
    },
  },
  instances: [
    { id: 'wall.north-start', archetype: 'wall', position: { x: 5, y: 4, t: 0 } },
    { id: 'wall.center', archetype: 'wall', position: { x: 6, y: 6, t: 0 } },
    { id: 'exit.main', archetype: 'exit', position: { x: 10, y: 10, t: 0 } },
    { id: 'box.main', archetype: 'box', position: { x: 8, y: 6, t: 0 } },
    { id: 'enemy.alpha', archetype: 'enemy', position: { x: 2, y: 8, t: 0 } },
  ],
}

export type ObjectBootstrapError =
  | { kind: 'RegistryError'; error: ObjectRegistryError }
  | { kind: 'CubeError'; error: CubeError | RelocationError }

export interface BootstrapObjectsResult {
  objectRegistry: ObjectRegistry
  cube: TimeCube
  objects: ResolvedObjectInstance[]
}

interface PatrolProjectionState {
  id: string
  loops: boolean
  path: Position2D[]
  previous: Position2D
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

function getPatrolComponent(
  components: Component[],
): Extract<Component, { kind: 'Patrol' }> | null {
  for (const component of components) {
    if (component.kind === 'Patrol') {
      return component
    }
  }

  return null
}

function resolvePatrolPosition(path: Position2D[], loops: boolean, t: number): Position2D {
  if (path.length === 0) {
    return { x: 0, y: 0 }
  }

  if (loops) {
    return path[modulo(t, path.length)]
  }

  if (path.length === 1) {
    return path[0]
  }

  const period = path.length * 2 - 2
  const offset = modulo(t, period)

  if (offset < path.length) {
    return path[offset]
  }

  return path[period - offset]
}

function buildPatrolProjectionStates(objects: ResolvedObjectInstance[]): PatrolProjectionState[] {
  const states: PatrolProjectionState[] = []

  for (const object of objects) {
    const patrol = getPatrolComponent(object.archetype.components)

    if (!patrol || !hasComponent(object.archetype.components, 'TimePersistent')) {
      continue
    }

    states.push({
      id: object.id,
      loops: patrol.loops,
      path: patrol.path,
      previous: { x: object.position.x, y: object.position.y },
    })
  }

  return states
}

function applyProjectedPatrolOccupancy(
  cube: TimeCube,
  objects: ResolvedObjectInstance[],
): Result<TimeCube, CubeError | RelocationError> {
  const projectionStates = buildPatrolProjectionStates(objects)

  if (projectionStates.length === 0) {
    return { ok: true, value: cube }
  }

  let nextCube = cube

  for (let t = 0; t < cube.timeDepth; t += 1) {
    const relocations = projectionStates
      .map((state) => {
        const target = resolvePatrolPosition(state.path, state.loops, t)
        const from = state.previous

        state.previous = target

        if (target.x === from.x && target.y === from.y) {
          return null
        }

        return {
          id: state.id,
          from: { x: from.x, y: from.y, t },
          to: { x: target.x, y: target.y, t },
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

    if (relocations.length === 0) {
      continue
    }

    const relocated = applyRelocationsFromTime(nextCube, t, relocations)

    if (!relocated.ok) {
      return relocated
    }

    nextCube = relocated.value
  }

  return { ok: true, value: nextCube }
}

export function bootstrapLevelObjects(
  boardSize: number,
  timeDepth: number,
  config: LevelObjectsConfig = defaultLevelObjectsConfig,
): Result<BootstrapObjectsResult, ObjectBootstrapError> {
  const objectRegistry = createObjectRegistry(config.archetypes)
  const resolvedObjects: ResolvedObjectInstance[] = []

  for (const instance of config.instances) {
    const resolved = resolveObjectInstance(objectRegistry, instance)

    if (!resolved.ok) {
      return {
        ok: false,
        error: {
          kind: 'RegistryError',
          error: resolved.error,
        },
      }
    }

    resolvedObjects.push(resolved.value)
  }

  const emptyCube = createTimeCube(boardSize, boardSize, timeDepth)
  const placed = placeObjects(emptyCube, resolvedObjects)

  if (!placed.ok) {
    return {
      ok: false,
      error: {
        kind: 'CubeError',
        error: placed.error,
      },
    }
  }

  const projected = applyProjectedPatrolOccupancy(placed.value, resolvedObjects)

  if (!projected.ok) {
    return {
      ok: false,
      error: {
        kind: 'CubeError',
        error: projected.error,
      },
    }
  }

  return {
    ok: true,
    value: {
      objectRegistry,
      cube: projected.value,
      objects: resolvedObjects,
    },
  }
}
