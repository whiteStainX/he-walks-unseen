import type { Position2D, Position3D } from '../../core/position'
import type { DifficultyTier } from '../contracts'

/** Canonical schema version for StorySpec payloads. */
export const STORY_SPEC_SCHEMA_VERSION = 1

/** Base board geometry requested by story authoring. */
export interface StoryBoardSpec {
  width: number
  height: number
  timeDepth: number
}

/** Goal intent currently supported by story compiler. */
export interface StoryGoalSpec {
  type: 'ReachExit'
  target: Position3D
}

/** Static wall placement intent. */
export interface StoryWallSpec {
  id?: string
  position: Position3D
}

/** Box placement intent. */
export interface StoryBoxSpec {
  id?: string
  position: Position3D
}

/** Rift placement intent from source to target in spacetime. */
export interface StoryRiftSpec {
  id?: string
  source: Position3D
  target: Position3D
  bidirectional?: boolean
}

export type StoryEnemyMovementSpec =
  | { kind: 'Static' }
  | { kind: 'PatrolLoop'; path: Position2D[] }
  | { kind: 'PatrolPingPong'; path: Position2D[] }

/** Optional per-enemy detection override intent. */
export interface StoryEnemyDetectionSpec {
  enabled?: boolean
  delayTurns?: number
  maxDistance?: number
}

/** Enemy spawn and behavior intent. */
export interface StoryEnemySpec {
  id?: string
  position: Position3D
  movement?: StoryEnemyMovementSpec
  detection?: StoryEnemyDetectionSpec
}

/** Story intent knobs that map to rules.json. */
export interface StoryRulesIntent {
  rift?: {
    defaultDelta?: number
    baseEnergyCost?: number
  }
  interaction?: {
    maxPushChain?: number
    allowPull?: boolean
  }
  detection?: {
    enabled?: boolean
    delayTurns?: number
    maxDistance?: number
  }
}

/** Theme intent knobs that map to theme.json. */
export interface StoryThemeIntent {
  id?: string
  iconPackId?: string
  cssVars?: Record<string, string>
}

/** Difficulty intent metadata for manifest/progression authoring. */
export interface StoryDifficultyIntent {
  tier?: DifficultyTier
  flavor?: string
}

/** LLM-emitted intermediate contract for deterministic compilation. */
export interface StorySpec {
  schemaVersion: 1
  storyId: string
  title: string
  board: StoryBoardSpec
  start: Position3D
  goal: StoryGoalSpec
  layout: {
    walls?: StoryWallSpec[]
  }
  actors: {
    enemies?: StoryEnemySpec[]
  }
  interactives?: {
    boxes?: StoryBoxSpec[]
    rifts?: StoryRiftSpec[]
  }
  rulesIntent?: StoryRulesIntent
  difficultyIntent?: StoryDifficultyIntent
  themeIntent?: StoryThemeIntent
}

export interface NormalizedStoryRulesIntent {
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

export interface NormalizedStoryThemeIntent {
  id: string
  iconPackId: string
  cssVars: Record<string, string>
}

export interface NormalizedStoryDifficultyIntent {
  tier: DifficultyTier
  flavor?: string
}

export interface NormalizedStoryEnemySpec {
  id: string
  position: Position3D
  movement: StoryEnemyMovementSpec
  detection: {
    enabled: boolean
    delayTurns: number
    maxDistance: number
  }
}

export interface NormalizedStorySpec {
  schemaVersion: 1
  storyId: string
  title: string
  board: StoryBoardSpec
  start: Position3D
  goal: StoryGoalSpec
  layout: {
    walls: Array<{
      id: string
      position: Position3D
    }>
  }
  actors: {
    enemies: NormalizedStoryEnemySpec[]
  }
  interactives: {
    boxes: Array<{
      id: string
      position: Position3D
    }>
    rifts: Array<{
      id: string
      source: Position3D
      target: Position3D
      bidirectional: boolean
    }>
  }
  rulesIntent: NormalizedStoryRulesIntent
  difficultyIntent: NormalizedStoryDifficultyIntent
  themeIntent: NormalizedStoryThemeIntent
}

export interface StorySpecValidationIssue {
  path: string
  message: string
}

export type StorySpecValidationError = {
  kind: 'InvalidStorySpec'
  issues: StorySpecValidationIssue[]
}
