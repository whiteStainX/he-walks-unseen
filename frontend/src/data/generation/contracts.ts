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

/** Difficulty-specific knobs in generation profile. */
export interface GenerationDifficultyProfile {
  budgets: MapGenBudgets
  minWallRatio: number
  detectionRange: number
  qualityThreshold: number
}

/** External JSON contract that drives map-generation defaults. */
export interface GenerationProfile {
  schemaVersion: 1
  id: string
  boardMin: MapGenBoard
  maxAttempts: number
  defaultDifficulty: MapGenDifficulty
  startInset: number
  exitInset: number
  defaultFeatureFlags: MapGenFeatureFlags
  interaction: {
    maxPushChainWhenEnabled: number
    maxPushChainWhenDisabled: number
  }
  rift: {
    defaultDelta: number
    baseEnergyCost: number
  }
  detection: {
    enabled: boolean
    delayTurns: number
  }
  difficultyProfiles: Record<MapGenDifficulty, GenerationDifficultyProfile>
  theme: {
    id: string
    iconPackId: string
    cssVars: Record<string, string>
  }
}

/** External request contract for seeded map generation. */
export interface MapGenRequest {
  seed: string | number
  board: MapGenBoard
  profile?: GenerationProfile
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
  | { kind: 'InvalidGenerationProfile'; message: string }
  | { kind: 'GeneratedContentInvalid'; attempt: number; error: ContentLoadError }
  | { kind: 'GenerationFailed'; attempts: number; lastReason: string }

export type MapGenGenerationResult = Result<MapGenResult, MapGenError>
