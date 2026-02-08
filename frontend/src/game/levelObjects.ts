import { type ObjectRegistryError, createObjectRegistry, resolveObjectInstance, type LevelObjectsConfig, type ObjectRegistry, type ResolvedObjectInstance } from '../core/objects'
import { createTimeCube, placeObjects, type CubeError, type TimeCube } from '../core/timeCube'

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
      render: { fill: '#ffffff', stroke: '#111111', glyph: 'E' },
    },
    box: {
      kind: 'box',
      components: [{ kind: 'BlocksMovement' }, { kind: 'Pushable' }, { kind: 'TimePersistent' }],
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
      render: { fill: '#c6c6c6', stroke: '#111111', glyph: 'X' },
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
  | { kind: 'CubeError'; error: CubeError }

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export interface BootstrapObjectsResult {
  objectRegistry: ObjectRegistry
  cube: TimeCube
  objects: ResolvedObjectInstance[]
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

  return {
    ok: true,
    value: {
      objectRegistry,
      cube: placed.value,
      objects: resolvedObjects,
    },
  }
}
