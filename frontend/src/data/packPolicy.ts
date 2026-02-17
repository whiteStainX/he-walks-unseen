import type { ContentPack } from './contracts'
import type {
  PublicContentPackClass,
  PublicContentPackManifestEntry,
} from './loader'
import { scoreGeneratedContent } from './generation/quality'
import { loadDefaultGenerationProfile } from './generation/profile'
import { evaluateSolvabilityV1 } from './generation/solver'

export interface PackPolicyEvaluation {
  ok: boolean
  packClass: PublicContentPackClass
  warnings: string[]
  metrics?: {
    solved: boolean
    shortestPathLength: number | null
    visitedNodes: number
    qualityScore?: number
    qualityThreshold?: number
  }
  failureReason?: string
}

function resolvePackClass(entry: PublicContentPackManifestEntry): PublicContentPackClass {
  if (entry.class) {
    return entry.class
  }

  if (entry.id.startsWith('generated/')) {
    return 'generated'
  }

  return 'curated'
}

function resolveDifficultyKey(
  difficulty: string | undefined,
  fallback: 'easy' | 'normal' | 'hard',
): 'easy' | 'normal' | 'hard' {
  if (difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard') {
    return difficulty
  }

  return fallback
}

export function evaluatePackClassPolicy(input: {
  entry: PublicContentPackManifestEntry
  content: ContentPack
}): PackPolicyEvaluation {
  const packClass = resolvePackClass(input.entry)

  if (packClass === 'experimental') {
    return {
      ok: true,
      packClass,
      warnings: ['experimental pack: solver/quality policy not enforced'],
    }
  }

  const profile = loadDefaultGenerationProfile()

  if (!profile.ok) {
    return {
      ok: false,
      packClass,
      warnings: [],
      failureReason: `generation profile unavailable: ${profile.error.message}`,
    }
  }

  const difficulty = resolveDifficultyKey(input.entry.difficulty, profile.value.defaultDifficulty)
  const qualityThreshold = profile.value.difficultyProfiles[difficulty].qualityThreshold
  const solver = evaluateSolvabilityV1(input.content, {
    maxDepth: Math.min(profile.value.solverGate.maxDepthCap, input.content.level.map.timeDepth),
    maxNodes: profile.value.solverGate.maxNodes,
    includePushPull: profile.value.solverGate.includePushPull,
    includeRift: profile.value.solverGate.includeRift,
  })
  const metrics: PackPolicyEvaluation['metrics'] = {
    solved: solver.solved,
    shortestPathLength: solver.shortestPathLength,
    visitedNodes: solver.visitedNodes,
  }

  if (packClass === 'curated') {
    const warnings = solver.solved ? [] : ['curated pack is not solver-confirmed under current gate']

    return {
      ok: true,
      packClass,
      warnings,
      metrics,
    }
  }

  if (!solver.solved) {
    return {
      ok: false,
      packClass,
      warnings: [],
      metrics,
      failureReason: 'solver gate failed (no solution found)',
    }
  }

  const qualityScore = scoreGeneratedContent({
    content: input.content,
    solver,
    weights: profile.value.qualityWeights,
  })
  metrics.qualityScore = qualityScore
  metrics.qualityThreshold = qualityThreshold

  if (qualityScore < qualityThreshold) {
    return {
      ok: false,
      packClass,
      warnings: [],
      metrics,
      failureReason: `quality gate failed (${qualityScore} < ${qualityThreshold})`,
    }
  }

  return {
    ok: true,
    packClass,
    warnings: [],
    metrics,
  }
}

