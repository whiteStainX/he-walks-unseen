import type { Result } from '../../core/result'
import type { ContentLoadError, ContentPack } from '../contracts'

export type MapGenDifficulty = 'easy' | 'normal' | 'hard'

/** Board geometry for generated level output. */
export interface MapGenBoard {
  width: number
  height: number
  timeDepth: number
}

/** Upper bounds for generator placement counts. */
export interface MapGenBudgets {
  maxWalls: number
  maxDynamicObjects: number
  maxEnemies: number
  maxRifts: number
}

/** Feature toggles that influence generated rules/config. */
export interface MapGenFeatureFlags {
  allowPull: boolean
  allowPushChains: boolean
  allowFutureRifts: boolean
}

/** External request contract for seeded map generation. */
export interface MapGenRequest {
  seed: string | number
  board: MapGenBoard
  difficulty?: MapGenDifficulty
  budgets?: Partial<MapGenBudgets>
  featureFlags?: Partial<MapGenFeatureFlags>
  maxAttempts?: number
  qualityThreshold?: number
  packId?: string
  themeId?: string
  iconPackId?: string
}

/** Deterministic solver summary used by generator gating. */
export interface SolvabilityReport {
  solved: boolean
  shortestPathLength: number | null
  visitedNodes: number
}

/** Metadata attached to accepted generation output. */
export interface MapGenMetadata {
  seed: string
  attempt: number
  qualityScore: number
  solver: SolvabilityReport
}

/** Accepted generation payload. */
export interface MapGenResult {
  content: ContentPack
  metadata: MapGenMetadata
}

export type MapGenError =
  | { kind: 'InvalidGenerationRequest'; message: string }
  | { kind: 'GeneratedContentInvalid'; attempt: number; error: ContentLoadError }
  | { kind: 'GenerationFailed'; attempts: number; lastReason: string }

export type MapGenGenerationResult = Result<MapGenResult, MapGenError>
