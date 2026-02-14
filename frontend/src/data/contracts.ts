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

export interface BehaviorConfig {
  schemaVersion: 1
  policies: Record<string, BehaviorPolicy>
  assignments: Record<string, string>
}

export interface ThemeConfig {
  schemaVersion: 1
  id: string
  cssVars: Record<string, string>
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

export type ContentLoadError =
  | { kind: 'InvalidShape'; file: string; message: string }
  | { kind: 'InvalidSchemaVersion'; file: string; expected: number; actual: unknown }
  | { kind: 'UnknownArchetypeReference'; instanceId: string; archetype: string }
  | { kind: 'UnknownBehaviorReference'; instanceId: string; behavior: string }
  | { kind: 'UnknownBehaviorAssignmentInstance'; instanceId: string }
  | { kind: 'InvalidMapBounds'; width: number; height: number; timeDepth: number }
  | { kind: 'InvalidStartPosition'; start: Position3D }
  | { kind: 'UnsupportedBehaviorPolicy'; key: string; policyKind: string }
