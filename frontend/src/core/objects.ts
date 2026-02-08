import type { Position3D } from './position'
import type { Component } from './components'

export interface ObjectRender {
  glyph?: string
  fill?: string
  stroke?: string
}

export interface ObjectArchetype {
  kind: string
  components: Component[]
  render: ObjectRender
}

export interface ObjectInstance {
  id: string
  archetype: string
  position: Position3D
  overrides?: Partial<ObjectArchetype>
}

export interface ObjectRegistry {
  archetypes: Record<string, ObjectArchetype>
}

export type ObjectRegistryError = { kind: 'UnknownArchetype'; archetype: string }

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export interface ResolvedObjectInstance {
  id: string
  archetypeKey: string
  position: Position3D
  archetype: ObjectArchetype
}

export interface LevelObjectsConfig {
  archetypes: Record<string, ObjectArchetype>
  instances: ObjectInstance[]
}

export function createObjectRegistry(archetypes: Record<string, ObjectArchetype>): ObjectRegistry {
  return { archetypes }
}

export function resolveArchetype(
  registry: ObjectRegistry,
  archetypeKey: string,
): Result<ObjectArchetype, ObjectRegistryError> {
  const archetype = registry.archetypes[archetypeKey]

  if (!archetype) {
    return {
      ok: false,
      error: { kind: 'UnknownArchetype', archetype: archetypeKey },
    }
  }

  return { ok: true, value: archetype }
}

export function resolveObjectInstance(
  registry: ObjectRegistry,
  instance: ObjectInstance,
): Result<ResolvedObjectInstance, ObjectRegistryError> {
  const archetypeResult = resolveArchetype(registry, instance.archetype)

  if (!archetypeResult.ok) {
    return archetypeResult
  }

  const baseArchetype = archetypeResult.value
  const overrides = instance.overrides

  const resolvedArchetype: ObjectArchetype = overrides
    ? {
        ...baseArchetype,
        ...overrides,
        components: overrides.components ?? baseArchetype.components,
        render: {
          ...baseArchetype.render,
          ...overrides.render,
        },
      }
    : baseArchetype

  return {
    ok: true,
    value: {
      id: instance.id,
      archetypeKey: instance.archetype,
      position: instance.position,
      archetype: resolvedArchetype,
    },
  }
}
