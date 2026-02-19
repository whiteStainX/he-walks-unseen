import type { Result } from '../../core/result'
import type {
  ContentArchetype,
  ContentLoadError,
  ContentPack,
  DifficultyTier,
} from '../contracts'
import type {
  PublicContentPackClass,
  PublicContentPackManifestEntry,
} from '../loader'
import { validateContentPack } from '../validate'
import type { NormalizedStorySpec } from './contracts'

export interface StoryCompileOptions {
  packId?: string
  packClass?: PublicContentPackClass
  tags?: string[]
  author?: string
  sourceSeed?: string
  sourceProfileId?: string
}

export interface StoryProgressionSuggestion {
  packId: string
  title: string
  difficulty: DifficultyTier
  difficultyTarget: DifficultyTier
  difficultyFlavor?: string
  tags: string[]
}

export interface StoryCompileResult {
  packId: string
  content: ContentPack
  manifestEntry: PublicContentPackManifestEntry
  progressionSuggestion: StoryProgressionSuggestion
  warnings: string[]
}

export type StoryCompileError =
  | { kind: 'InvalidPackId'; message: string }
  | { kind: 'CompileValidationFailed'; error: ContentLoadError }

function isDifferentDetection(
  left: { enabled: boolean; delayTurns: number; maxDistance: number },
  right: { enabled: boolean; delayTurns: number; maxDistance: number },
): boolean {
  return (
    left.enabled !== right.enabled ||
    left.delayTurns !== right.delayTurns ||
    left.maxDistance !== right.maxDistance
  )
}

function detectionKey(profile: { enabled: boolean; delayTurns: number; maxDistance: number }): string {
  return `${profile.enabled ? '1' : '0'}:${profile.delayTurns}:${profile.maxDistance}`
}

function sanitizeArchetypeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function createBaseArchetypes(): Record<string, ContentArchetype> {
  return {
    wall: {
      kind: 'wall',
      components: [{ kind: 'BlocksMovement' }, { kind: 'BlocksVision' }, { kind: 'TimePersistent' }],
      render: { fill: '#f0f0f0', stroke: '#111111', symbol: 'wall' },
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
      render: { fill: '#d9d9d9', stroke: '#111111', symbol: 'box' },
    },
    enemy: {
      kind: 'enemy',
      components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
      render: { fill: '#c6c6c6', stroke: '#111111', symbol: 'enemy' },
    },
  }
}

function toDefaultPackId(spec: NormalizedStorySpec): string {
  return `generated/${spec.storyId}`
}

function isValidPackId(packId: string): boolean {
  return /^[a-zA-Z0-9._/-]+$/.test(packId)
}

/**
 * Compile normalized StorySpec into runtime content pack and manifest metadata.
 */
export function compileStorySpecToPack(
  spec: NormalizedStorySpec,
  options: StoryCompileOptions = {},
): Result<StoryCompileResult, StoryCompileError> {
  const packId = options.packId ?? toDefaultPackId(spec)

  if (!isValidPackId(packId)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidPackId',
        message: `pack id contains unsupported characters: ${packId}`,
      },
    }
  }

  const archetypes = createBaseArchetypes()

  for (const rift of spec.interactives.rifts) {
    const archetypeKey = `rift.${sanitizeArchetypeKey(rift.id)}`
    archetypes[archetypeKey] = {
      kind: 'rift',
      components: [
        { kind: 'TimePersistent' },
        { kind: 'Rift', target: rift.target, bidirectional: rift.bidirectional },
      ],
      render: { fill: '#ffffff', stroke: '#111111', symbol: 'rift' },
    }
  }

  const instances: ContentPack['level']['instances'] = []

  for (const wall of spec.layout.walls) {
    instances.push({
      id: wall.id,
      archetype: 'wall',
      position: wall.position,
    })
  }

  instances.push({
    id: 'exit.main',
    archetype: 'exit',
    position: spec.goal.target,
  })

  for (const box of spec.interactives.boxes) {
    instances.push({
      id: box.id,
      archetype: 'box',
      position: box.position,
    })
  }

  for (const enemy of spec.actors.enemies) {
    instances.push({
      id: enemy.id,
      archetype: 'enemy',
      position: enemy.position,
    })
  }

  for (const rift of spec.interactives.rifts) {
    instances.push({
      id: rift.id,
      archetype: `rift.${sanitizeArchetypeKey(rift.id)}`,
      position: rift.source,
    })
  }

  const policies: ContentPack['behavior']['policies'] = {}
  const assignments: ContentPack['behavior']['assignments'] = {}
  const staticPolicyId = 'enemy.policy.static'

  for (const enemy of spec.actors.enemies) {
    if (enemy.movement.kind === 'Static') {
      if (!policies[staticPolicyId]) {
        policies[staticPolicyId] = { kind: 'Static' }
      }

      assignments[enemy.id] = staticPolicyId
      continue
    }

    const policyId = `enemy.policy.${sanitizeArchetypeKey(enemy.id)}`
    policies[policyId] = enemy.movement
    assignments[enemy.id] = policyId
  }

  const detectionProfiles: Record<string, { enabled: boolean; delayTurns: number; maxDistance: number }> = {
    default: {
      enabled: spec.rulesIntent.detection.enabled,
      delayTurns: spec.rulesIntent.detection.delayTurns,
      maxDistance: spec.rulesIntent.detection.maxDistance,
    },
  }
  const detectionAssignments: Record<string, string> = {}
  const detectionSignatureToProfileKey = new Map<string, string>([
    [detectionKey(detectionProfiles.default), 'default'],
  ])

  for (const enemy of spec.actors.enemies) {
    if (!isDifferentDetection(enemy.detection, detectionProfiles.default)) {
      continue
    }

    const signature = detectionKey(enemy.detection)
    const existingProfile = detectionSignatureToProfileKey.get(signature)

    if (existingProfile) {
      detectionAssignments[enemy.id] = existingProfile
      continue
    }

    const profileKey = `enemy.detect.${sanitizeArchetypeKey(enemy.id)}`
    detectionProfiles[profileKey] = {
      enabled: enemy.detection.enabled,
      delayTurns: enemy.detection.delayTurns,
      maxDistance: enemy.detection.maxDistance,
    }
    detectionSignatureToProfileKey.set(signature, profileKey)
    detectionAssignments[enemy.id] = profileKey
  }

  const behavior: ContentPack['behavior'] = {
    schemaVersion: 1,
    policies,
    assignments,
    detectionProfiles,
    detectionAssignments,
    defaultDetectionProfile: 'default',
  }

  const content: ContentPack = {
    level: {
      schemaVersion: 1,
      meta: {
        id: spec.storyId,
        name: spec.title,
      },
      map: {
        width: spec.board.width,
        height: spec.board.height,
        timeDepth: spec.board.timeDepth,
        start: spec.start,
      },
      archetypes,
      instances,
    },
    behavior,
    rules: {
      schemaVersion: 1,
      rift: {
        defaultDelta: spec.rulesIntent.rift.defaultDelta,
        baseEnergyCost: spec.rulesIntent.rift.baseEnergyCost,
      },
      interaction: {
        maxPushChain: spec.rulesIntent.interaction.maxPushChain,
        allowPull: spec.rulesIntent.interaction.allowPull,
      },
      detection: {
        enabled: spec.rulesIntent.detection.enabled,
        delayTurns: spec.rulesIntent.detection.delayTurns,
        maxDistance: spec.rulesIntent.detection.maxDistance,
      },
    },
    theme: {
      schemaVersion: 1,
      id: spec.themeIntent.id,
      iconPackId: spec.themeIntent.iconPackId,
      cssVars: spec.themeIntent.cssVars,
    },
  }

  const validated = validateContentPack(content)

  if (!validated.ok) {
    return {
      ok: false,
      error: {
        kind: 'CompileValidationFailed',
        error: validated.error,
      },
    }
  }

  const tags = options.tags && options.tags.length > 0 ? options.tags : ['story', 'generated']
  const packClass = options.packClass ?? 'experimental'

  return {
    ok: true,
    value: {
      packId,
      content: validated.value,
      manifestEntry: {
        id: packId,
        name: spec.title,
        class: packClass,
        difficulty: spec.difficultyIntent.tier,
        tags,
        source: {
          kind: 'generator',
          seed: options.sourceSeed ?? spec.storyId,
          profileId: options.sourceProfileId ?? 'story-spec-v1',
          author: options.author,
        },
      },
      progressionSuggestion: {
        packId,
        title: spec.title,
        difficulty: spec.difficultyIntent.tier,
        difficultyTarget: spec.difficultyIntent.tier,
        difficultyFlavor: spec.difficultyIntent.flavor,
        tags: ['story-generated'],
      },
      warnings: [],
    },
  }
}
