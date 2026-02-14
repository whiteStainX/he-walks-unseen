import type { Component } from '../core/components'
import type { ObjectArchetype, ObjectInstance, LevelObjectsConfig } from '../core/objects'
import type { Result } from '../core/result'
import type { DetectionConfig } from '../core/detection'
import type { RiftSettings } from '../core/rift'
import type { ContentComponent, ContentLoadError, ContentPack } from './contracts'
import { validateContentPack } from './validate'

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

  switch (policy.kind) {
    case 'Static':
      return nonPatrol
    case 'PatrolLoop':
      return [...nonPatrol, { kind: 'Patrol', path: policy.path, loops: true }]
    case 'PatrolPingPong':
      return [...nonPatrol, { kind: 'Patrol', path: policy.path, loops: false }]
    case 'ScriptedTimeline':
      return nonPatrol
  }
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

  return {
    ok: true,
    value: {
      levelObjectsConfig: toLevelObjectsConfig(validated.value),
      boardSize: validated.value.level.map.width,
      timeDepth: validated.value.level.map.timeDepth,
      startPosition: validated.value.level.map.start,
      riftSettings: {
        defaultDelta: validated.value.rules.rift.defaultDelta,
        baseEnergyCost: validated.value.rules.rift.baseEnergyCost,
      },
      interactionConfig: {
        maxPushChain: validated.value.rules.interaction.maxPushChain,
        allowPull: validated.value.rules.interaction.allowPull,
      },
      detectionConfig: {
        enabled: validated.value.rules.detection.enabled,
        delayTurns: validated.value.rules.detection.delayTurns,
        maxDistance: validated.value.rules.detection.maxDistance,
      },
      themeCssVars: validated.value.theme.cssVars,
    },
  }
}
