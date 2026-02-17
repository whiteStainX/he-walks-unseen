import type { Component } from '../core/components'
import type { DetectionConfig } from '../core/detection'
import type { LevelObjectsConfig, ObjectArchetype, ObjectInstance } from '../core/objects'
import type { ContentComponent, ContentPack } from './contracts'
import {
  behaviorToPatrolComponent,
  resolveBehaviorPolicy,
  resolveEnemyDetectionConfig,
} from './behaviorResolver'

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

/**
 * Convert validated content pack data into runtime `LevelObjectsConfig`.
 * This applies behavior policy overrides on top of level archetype components.
 */
export function buildLevelObjectsConfigFromContent(content: ContentPack): LevelObjectsConfig {
  const archetypes: Record<string, ObjectArchetype> = {}

  for (const [key, archetype] of Object.entries(content.level.archetypes)) {
    archetypes[key] = {
      kind: archetype.kind,
      components: archetype.components.map(toCoreComponent),
      render: archetype.render,
    }
  }

  const instances: ObjectInstance[] = content.level.instances.map((instance) => {
    const behaviorPolicy = resolveBehaviorPolicy(content.behavior, instance.id) ?? undefined
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

/**
 * Derive global detection config from content rules.
 */
export function deriveRulesDetectionConfig(content: ContentPack): DetectionConfig {
  return {
    enabled: content.rules.detection.enabled,
    delayTurns: content.rules.detection.delayTurns,
    maxDistance: content.rules.detection.maxDistance,
  }
}

/**
 * Resolve per-enemy detection overrides from behavior profiles + assignments.
 */
export function buildEnemyDetectionConfigByIdFromContent(
  content: ContentPack,
): Record<string, DetectionConfig> {
  const rulesDefault = deriveRulesDetectionConfig(content)
  const enemyDetectionConfigById: Record<string, DetectionConfig> = {}
  const profiles = content.behavior.detectionProfiles

  if (!profiles) {
    return enemyDetectionConfigById
  }

  const defaultProfileKey = content.behavior.defaultDetectionProfile
  const hasDefaultProfile = Boolean(defaultProfileKey && profiles[defaultProfileKey])

  for (const instance of content.level.instances) {
    const archetype = content.level.archetypes[instance.archetype]

    if (!archetype || archetype.kind !== 'enemy') {
      continue
    }

    const assignedProfileKey = content.behavior.detectionAssignments?.[instance.id]
    const hasAssignedProfile = Boolean(assignedProfileKey && profiles[assignedProfileKey])

    if (!hasAssignedProfile && !hasDefaultProfile) {
      continue
    }

    enemyDetectionConfigById[instance.id] = resolveEnemyDetectionConfig({
      behavior: content.behavior,
      enemyId: instance.id,
      rulesDefault,
    })
  }

  return enemyDetectionConfigById
}

