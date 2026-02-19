import type { DifficultyTier } from '../contracts'
import {
  STORY_SPEC_SCHEMA_VERSION,
  type NormalizedStoryDifficultyIntent,
  type NormalizedStoryEnemySpec,
  type NormalizedStoryRulesIntent,
  type NormalizedStorySpec,
  type NormalizedStoryThemeIntent,
  type StoryEnemyMovementSpec,
  type StorySpec,
} from './contracts'

export const DEFAULT_STORY_RULES_INTENT: NormalizedStoryRulesIntent = {
  rift: {
    defaultDelta: 3,
    baseEnergyCost: 0,
  },
  interaction: {
    maxPushChain: 4,
    allowPull: true,
  },
  detection: {
    enabled: true,
    delayTurns: 1,
    maxDistance: 2,
  },
}

export const DEFAULT_STORY_THEME_INTENT: NormalizedStoryThemeIntent = {
  id: 'minimal-mono',
  iconPackId: 'default-mono',
  cssVars: {
    '--ink': '#111111',
    '--paper': '#ffffff',
    '--panel': '#ffffff',
    '--accent': '#111111',
    '--grid': '#111111',
    '--border': '#111111',
    '--muted': '#666666',
  },
}

function comparePosition3D(
  left: { x: number; y: number; t: number },
  right: { x: number; y: number; t: number },
): number {
  if (left.t !== right.t) {
    return left.t - right.t
  }

  if (left.y !== right.y) {
    return left.y - right.y
  }

  return left.x - right.x
}

function toSlug(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  return normalized.length > 0 ? normalized : 'story-pack'
}

function sanitizeId(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._/-]/g, '-')
    .replace(/-{2,}/g, '-')

  return normalized.length > 0 ? normalized : 'item'
}

function indexToAlpha(index: number): string {
  let value = index
  let label = ''

  do {
    label = String.fromCharCode(97 + (value % 26)) + label
    value = Math.floor(value / 26) - 1
  } while (value >= 0)

  return label
}

function reserveUniqueId(
  requested: string | undefined,
  fallbackId: string,
  used: Set<string>,
): string {
  let base = sanitizeId(requested ?? fallbackId)

  if (base.length === 0) {
    base = fallbackId
  }

  if (!used.has(base)) {
    used.add(base)
    return base
  }

  let suffix = 2

  while (used.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  const next = `${base}-${suffix}`
  used.add(next)
  return next
}

function cloneMovement(movement: StoryEnemyMovementSpec): StoryEnemyMovementSpec {
  if (movement.kind === 'Static') {
    return movement
  }

  return {
    kind: movement.kind,
    path: [...movement.path],
  }
}

function normalizeDifficultyIntent(input: StorySpec): NormalizedStoryDifficultyIntent {
  const tier = input.difficultyIntent?.tier ?? 'normal'
  const safeTier: DifficultyTier =
    tier === 'easy' || tier === 'normal' || tier === 'hard' || tier === 'expert' ? tier : 'normal'

  return {
    tier: safeTier,
    flavor: input.difficultyIntent?.flavor,
  }
}

function normalizeRulesIntent(input: StorySpec): NormalizedStoryRulesIntent {
  return {
    rift: {
      defaultDelta:
        input.rulesIntent?.rift?.defaultDelta ?? DEFAULT_STORY_RULES_INTENT.rift.defaultDelta,
      baseEnergyCost:
        input.rulesIntent?.rift?.baseEnergyCost ?? DEFAULT_STORY_RULES_INTENT.rift.baseEnergyCost,
    },
    interaction: {
      maxPushChain:
        input.rulesIntent?.interaction?.maxPushChain ??
        DEFAULT_STORY_RULES_INTENT.interaction.maxPushChain,
      allowPull:
        input.rulesIntent?.interaction?.allowPull ?? DEFAULT_STORY_RULES_INTENT.interaction.allowPull,
    },
    detection: {
      enabled:
        input.rulesIntent?.detection?.enabled ?? DEFAULT_STORY_RULES_INTENT.detection.enabled,
      delayTurns:
        input.rulesIntent?.detection?.delayTurns ?? DEFAULT_STORY_RULES_INTENT.detection.delayTurns,
      maxDistance:
        input.rulesIntent?.detection?.maxDistance ?? DEFAULT_STORY_RULES_INTENT.detection.maxDistance,
    },
  }
}

function normalizeThemeIntent(input: StorySpec): NormalizedStoryThemeIntent {
  return {
    id: input.themeIntent?.id ?? DEFAULT_STORY_THEME_INTENT.id,
    iconPackId: input.themeIntent?.iconPackId ?? DEFAULT_STORY_THEME_INTENT.iconPackId,
    cssVars: {
      ...DEFAULT_STORY_THEME_INTENT.cssVars,
      ...(input.themeIntent?.cssVars ?? {}),
    },
  }
}

function normalizeEnemies(
  input: StorySpec,
  rules: NormalizedStoryRulesIntent,
): NormalizedStoryEnemySpec[] {
  const usedIds = new Set<string>()
  const sortedEnemies = [...(input.actors.enemies ?? [])].sort((left, right) => {
    const byPosition = comparePosition3D(left.position, right.position)

    if (byPosition !== 0) {
      return byPosition
    }

    const leftId = left.id ?? ''
    const rightId = right.id ?? ''
    return leftId.localeCompare(rightId)
  })

  const normalizedEnemies: NormalizedStoryEnemySpec[] = []

  for (let index = 0; index < sortedEnemies.length; index += 1) {
    const source = sortedEnemies[index]
    const id = reserveUniqueId(source.id, `enemy.${indexToAlpha(index)}`, usedIds)
    const movement = source.movement
      ? cloneMovement(source.movement)
      : ({ kind: 'Static' } satisfies StoryEnemyMovementSpec)

    normalizedEnemies.push({
      id,
      position: { ...source.position },
      movement,
      detection: {
        enabled: source.detection?.enabled ?? rules.detection.enabled,
        delayTurns: source.detection?.delayTurns ?? rules.detection.delayTurns,
        maxDistance: source.detection?.maxDistance ?? rules.detection.maxDistance,
      },
    })
  }

  return normalizedEnemies.sort((left, right) => left.id.localeCompare(right.id))
}

/**
 * Normalize a validated StorySpec into deterministic, fully-explicit values.
 */
export function normalizeStorySpec(input: StorySpec): NormalizedStorySpec {
  const rulesIntent = normalizeRulesIntent(input)
  const storyId = toSlug(input.storyId)
  const title = input.title.trim()

  const wallUsedIds = new Set<string>()
  const walls = [...(input.layout.walls ?? [])]
    .sort((left, right) => {
      const byPosition = comparePosition3D(left.position, right.position)

      if (byPosition !== 0) {
        return byPosition
      }

      return (left.id ?? '').localeCompare(right.id ?? '')
    })
    .map((wall, index) => ({
      id: reserveUniqueId(wall.id, `wall.${index + 1}`, wallUsedIds),
      position: { ...wall.position },
    }))
    .sort((left, right) => left.id.localeCompare(right.id))

  const boxUsedIds = new Set<string>()
  const boxes = [...(input.interactives?.boxes ?? [])]
    .sort((left, right) => {
      const byPosition = comparePosition3D(left.position, right.position)

      if (byPosition !== 0) {
        return byPosition
      }

      return (left.id ?? '').localeCompare(right.id ?? '')
    })
    .map((box, index) => ({
      id: reserveUniqueId(box.id, `box.${index + 1}`, boxUsedIds),
      position: { ...box.position },
    }))
    .sort((left, right) => left.id.localeCompare(right.id))

  const riftUsedIds = new Set<string>()
  const rifts = [...(input.interactives?.rifts ?? [])]
    .sort((left, right) => {
      const bySource = comparePosition3D(left.source, right.source)

      if (bySource !== 0) {
        return bySource
      }

      const byTarget = comparePosition3D(left.target, right.target)

      if (byTarget !== 0) {
        return byTarget
      }

      return (left.id ?? '').localeCompare(right.id ?? '')
    })
    .map((rift, index) => ({
      id: reserveUniqueId(rift.id, `rift.${index + 1}`, riftUsedIds),
      source: { ...rift.source },
      target: { ...rift.target },
      bidirectional: rift.bidirectional ?? true,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))

  const enemies = normalizeEnemies(input, rulesIntent)

  const normalized: NormalizedStorySpec = {
    schemaVersion: STORY_SPEC_SCHEMA_VERSION,
    storyId,
    title,
    board: {
      width: input.board.width,
      height: input.board.height,
      timeDepth: input.board.timeDepth,
    },
    start: {
      x: input.start.x,
      y: input.start.y,
      t: input.start.t,
    },
    goal: {
      type: 'ReachExit',
      target: {
        x: input.goal.target.x,
        y: input.goal.target.y,
        t: input.goal.target.t,
      },
    },
    layout: {
      walls,
    },
    actors: {
      enemies,
    },
    interactives: {
      boxes,
      rifts,
    },
    rulesIntent,
    difficultyIntent: normalizeDifficultyIntent(input),
    themeIntent: normalizeThemeIntent(input),
  }

  return normalized
}
