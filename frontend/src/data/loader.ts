import type { Component } from '../core/components'
import type { ObjectArchetype, ObjectInstance, LevelObjectsConfig } from '../core/objects'
import type { Result } from '../core/result'
import type { DetectionConfig } from '../core/detection'
import type { RiftSettings } from '../core/rift'
import type { ContentComponent, ContentLoadError, ContentPack } from './contracts'
import { validateContentPack } from './validate'
import { behaviorToPatrolComponent } from './behaviorResolver'

import defaultLevel from './content/default.level.json'
import defaultBehavior from './content/default.behavior.json'
import defaultTheme from './content/default.theme.json'
import defaultRules from './content/default.rules.json'

function toCoreComponent(component: ContentComponent): Component {
  switch (component.kind) {
    case 'BlocksMovement':
    case 'BlocksVision':
    case 'TimePersistent':
    case 'Exit':
    case 'Pushable':
    case 'Pullable':
      return { kind: component.kind }
    case 'Patrol':
      return { kind: 'Patrol', path: component.path, loops: component.loops }
    case 'Rift':
      return { kind: 'Rift', target: component.target, bidirectional: component.bidirectional }
  }
}

function applyBehaviorComponents(
  baseComponents: Component[],
  policy: ContentPack['behavior']['policies'][string] | undefined,
): Component[] {
  if (!policy) {
    return baseComponents
  }

  const nonPatrol = baseComponents.filter((component) => component.kind !== 'Patrol')

  const patrol = behaviorToPatrolComponent(policy)

  return patrol ? [...nonPatrol, patrol] : nonPatrol
}

function toLevelObjectsConfig(content: ContentPack): LevelObjectsConfig {
  const archetypes: Record<string, ObjectArchetype> = {}

  for (const [key, archetype] of Object.entries(content.level.archetypes)) {
    archetypes[key] = {
      kind: archetype.kind,
      components: archetype.components.map(toCoreComponent),
      render: archetype.render,
    }
  }

  const instances: ObjectInstance[] = content.level.instances.map((instance) => {
    const behaviorKey = content.behavior.assignments[instance.id]
    const behaviorPolicy = behaviorKey ? content.behavior.policies[behaviorKey] : undefined
    const baseArchetype = archetypes[instance.archetype]

    if (!baseArchetype || !behaviorPolicy) {
      return {
        id: instance.id,
        archetype: instance.archetype,
        position: instance.position,
      }
    }

    const overriddenComponents = applyBehaviorComponents(baseArchetype.components, behaviorPolicy)

    return {
      id: instance.id,
      archetype: instance.archetype,
      position: instance.position,
      overrides: {
        components: overriddenComponents,
      },
    }
  })

  return {
    archetypes,
    instances,
  }
}

export interface LoadedBootContent {
  levelObjectsConfig: LevelObjectsConfig
  boardSize: number
  timeDepth: number
  startPosition: ContentPack['level']['map']['start']
  riftSettings: RiftSettings
  interactionConfig: {
    maxPushChain: number
    allowPull: boolean
  }
  detectionConfig: DetectionConfig
  themeCssVars: Record<string, string>
}

export type PublicContentLoadError =
  | ContentLoadError
  | { kind: 'FetchFailed'; file: string; status?: number; message: string }

function toLoadedBootContent(content: ContentPack): LoadedBootContent {
  return {
    levelObjectsConfig: toLevelObjectsConfig(content),
    boardSize: content.level.map.width,
    timeDepth: content.level.map.timeDepth,
    startPosition: content.level.map.start,
    riftSettings: {
      defaultDelta: content.rules.rift.defaultDelta,
      baseEnergyCost: content.rules.rift.baseEnergyCost,
    },
    interactionConfig: {
      maxPushChain: content.rules.interaction.maxPushChain,
      allowPull: content.rules.interaction.allowPull,
    },
    detectionConfig: {
      enabled: content.rules.detection.enabled,
      delayTurns: content.rules.detection.delayTurns,
      maxDistance: content.rules.detection.maxDistance,
    },
    themeCssVars: content.theme.cssVars,
  }
}

export function loadDefaultBootContent(): Result<LoadedBootContent, ContentLoadError> {
  const validated = validateContentPack({
    level: defaultLevel,
    behavior: defaultBehavior,
    theme: defaultTheme,
    rules: defaultRules,
  })

  if (!validated.ok) {
    return validated
  }

  return { ok: true, value: toLoadedBootContent(validated.value) }
}

async function fetchJson(path: string): Promise<Result<unknown, PublicContentLoadError>> {
  try {
    const response = await fetch(path)

    if (!response.ok) {
      return {
        ok: false,
        error: {
          kind: 'FetchFailed',
          file: path,
          status: response.status,
          message: `HTTP ${response.status}`,
        },
      }
    }

    const value = await response.json()
    return { ok: true, value }
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: 'FetchFailed',
        file: path,
        message: error instanceof Error ? error.message : 'Unknown fetch error',
      },
    }
  }
}

export async function loadBootContentFromPublic(
  options: {
    basePath?: string
    packId?: string
  } = {},
): Promise<Result<LoadedBootContent, PublicContentLoadError>> {
  const basePath = options.basePath ?? '/data'
  const packId = options.packId ?? 'default'

  const [level, behavior, theme, rules] = await Promise.all([
    fetchJson(`${basePath}/${packId}.level.json`),
    fetchJson(`${basePath}/${packId}.behavior.json`),
    fetchJson(`${basePath}/${packId}.theme.json`),
    fetchJson(`${basePath}/${packId}.rules.json`),
  ])

  if (!level.ok) {
    return level
  }

  if (!behavior.ok) {
    return behavior
  }

  if (!theme.ok) {
    return theme
  }

  if (!rules.ok) {
    return rules
  }

  const validated = validateContentPack({
    level: level.value,
    behavior: behavior.value,
    theme: theme.value,
    rules: rules.value,
  })

  if (!validated.ok) {
    return validated
  }

  return {
    ok: true,
    value: toLoadedBootContent(validated.value),
  }
}
