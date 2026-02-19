import type { Position2D, Position3D } from '../core/position'

export type MarkerComponentKind =
  | 'BlocksMovement'
  | 'BlocksVision'
  | 'TimePersistent'
  | 'Exit'
  | 'Pushable'
  | 'Pullable'

export type ContentComponent =
  | { kind: MarkerComponentKind }
  | { kind: 'Patrol'; path: Position2D[]; loops: boolean }
  | { kind: 'Rift'; target: Position3D; bidirectional: boolean }

export interface ContentRender {
  symbol?: string
  glyph?: string
  fill?: string
  stroke?: string
}

export interface ContentArchetype {
  kind: string
  components: ContentComponent[]
  render: ContentRender
}

export interface ContentInstance {
  id: string
  archetype: string
  position: Position3D
}

export interface LevelConfig {
  schemaVersion: 1
  meta: {
    id: string
    name: string
  }
  map: {
    width: number
    height: number
    timeDepth: number
    start: Position3D
  }
  archetypes: Record<string, ContentArchetype>
  instances: ContentInstance[]
}

export type BehaviorPolicy =
  | { kind: 'Static' }
  | { kind: 'PatrolLoop'; path: Position2D[] }
  | { kind: 'PatrolPingPong'; path: Position2D[] }
  | { kind: 'ScriptedTimeline'; points: Position3D[] }

export interface BehaviorDetectionProfile {
  enabled: boolean
  delayTurns: number
  maxDistance: number
}

export interface BehaviorConfig {
  schemaVersion: 1
  policies: Record<string, BehaviorPolicy>
  assignments: Record<string, string>
  detectionProfiles?: Record<string, BehaviorDetectionProfile>
  detectionAssignments?: Record<string, string>
  defaultDetectionProfile?: string
}

export interface ThemeConfig {
  schemaVersion: 1
  id: string
  iconPackId: string
  cssVars: Record<string, string>
}

export interface IconAssetRef {
  svg: string
  png?: string
}

export interface IconPackConfig {
  schemaVersion: 1
  id: string
  meta?: {
    name?: string
    author?: string
  }
  defaults?: {
    cellPx?: number
    stroke?: string
    fill?: string
  }
  slots: Record<string, IconAssetRef>
}

export interface GameRulesConfig {
  schemaVersion: 1
  rift: {
    defaultDelta: number
    baseEnergyCost: number
  }
  interaction: {
    maxPushChain: number
    allowPull: boolean
  }
  detection: {
    enabled: boolean
    delayTurns: number
    maxDistance: number
  }
}

export interface ContentPack {
  level: LevelConfig
  behavior: BehaviorConfig
  theme: ThemeConfig
  rules: GameRulesConfig
}

export type DifficultyTier = 'easy' | 'normal' | 'hard' | 'expert'

export interface DifficultyRange {
  min: number
  max: number
}

export interface DifficultyNormalizationConfig {
  shortestSolutionLength: DifficultyRange
  visitedNodes: DifficultyRange
  deadEndRatio: DifficultyRange
  requiredRiftCount: DifficultyRange
  requiredPushPullCount: DifficultyRange
  enemyExposureEvents: DifficultyRange
  paradoxFragilityCount: DifficultyRange
  timeDepth: DifficultyRange
}

export interface DifficultyScoreWeights {
  path: number
  branch: number
  temporal: number
  detection: number
  interaction: number
  paradox: number
}

export interface DifficultyDimensionWeights {
  branchVisitedNodes: number
  branchDeadEndRatio: number
  temporalRiftCount: number
  temporalTimeDepth: number
}

export interface DifficultyTierBounds {
  easy: DifficultyRange
  normal: DifficultyRange
  hard: DifficultyRange
  expert: DifficultyRange
}

export interface DifficultyRampPolicy {
  allowCooldownInMain: boolean
  cooldownMaxTierDrop: number
  allowConsecutiveCooldown: boolean
  requireHardBeforeExpert: boolean
}

export interface DifficultyOverridePolicy {
  noteRequiredMaxDelta: number
  reviewRequiredAboveDelta: number
  requireEvidenceForReview: boolean
}

export interface DifficultyModelConfig {
  schemaVersion: 1
  modelVersion: string
  normalization: DifficultyNormalizationConfig
  scoreWeights: DifficultyScoreWeights
  dimensionWeights: DifficultyDimensionWeights
  tierBounds: DifficultyTierBounds
  rampPolicy: DifficultyRampPolicy
  overridePolicy: DifficultyOverridePolicy
}

export type DifficultyModelConfigError =
  | { kind: 'InvalidDifficultyModel'; path: string; message: string }
  | { kind: 'InvalidDifficultyModelVersion'; expected: number; actual: unknown }

export type ContentLoadError =
  | { kind: 'InvalidShape'; file: string; message: string }
  | { kind: 'InvalidSchemaVersion'; file: string; expected: number; actual: unknown }
  | { kind: 'MissingIconPackId'; themeId: string }
  | { kind: 'UnknownArchetypeReference'; instanceId: string; archetype: string }
  | { kind: 'InvalidRiftTarget'; archetype: string; target: Position3D }
  | { kind: 'ConflictingRiftSource'; source: Position3D; archetype: string }
  | { kind: 'InvalidBehaviorPathPoint'; key: string; point: Position3D | Position2D }
  | { kind: 'UnknownBehaviorReference'; instanceId: string; behavior: string }
  | { kind: 'UnknownBehaviorAssignmentInstance'; instanceId: string }
  | { kind: 'UnknownDetectionProfileReference'; instanceId: string; profile: string }
  | { kind: 'InvalidDetectionProfile'; key: string; message: string }
  | { kind: 'InvalidIconSlotReference'; archetype: string; symbol: string }
  | { kind: 'InvalidMapBounds'; width: number; height: number; timeDepth: number }
  | { kind: 'InvalidStartPosition'; start: Position3D }
  | { kind: 'UnsupportedBehaviorPolicy'; key: string; policyKind: string }
