import type { RiftInstruction, RiftResources, RiftSettings } from '../../core/rift'
import type { TimeCube } from '../../core/timeCube'
import type { Direction2D, Position3D } from '../../core/position'
import type { WorldLineState } from '../../core/worldLine'
import type { Result } from '../../core/result'
import type { DetectionConfig, DetectionReport } from '../../core/detection'
import type {
  CausalAnchor,
  ParadoxConfig,
  ParadoxReport,
} from '../../core/paradox'

export type GamePhase = 'Playing' | 'Won' | 'Detected' | 'Paradox'

export type InteractionAction =
  | { kind: 'Move'; direction: Direction2D }
  | { kind: 'Wait' }
  | { kind: 'ApplyRift'; instruction?: RiftInstruction }
  | { kind: 'Push'; direction: Direction2D }
  | { kind: 'Pull'; direction: Direction2D }

export type InteractionError =
  | { kind: 'OutOfBounds' }
  | { kind: 'TimeBoundary' }
  | { kind: 'BlockedByObject'; objectId?: string }
  | { kind: 'NotPushable' }
  | { kind: 'NotPullable' }
  | { kind: 'PushChainTooLong'; length: number; max: number }
  | { kind: 'NoSpaceToPush' }
  | { kind: 'NothingToPull' }
  | { kind: 'SelfIntersection' }
  | { kind: 'InvalidRiftTarget' }
  | { kind: 'InsufficientEnergy' }
  | { kind: 'Internal'; message: string }

export type SuccessfulOutcome =
  | { kind: 'Moved'; to: Position3D }
  | { kind: 'Rifted'; to: Position3D; mode: RiftInstruction['kind'] }
  | { kind: 'Pushed'; to: Position3D; movedObjectIds: string[] }
  | { kind: 'Pulled'; to: Position3D; movedObjectIds: string[] }

export type InteractionOutcome = SuccessfulOutcome | { kind: 'Blocked'; reason: InteractionError }

export interface InteractionHistoryEntry {
  turn: number
  action: InteractionAction
  outcome: SuccessfulOutcome
  anchors?: CausalAnchor[]
  affectedFromTime?: number
}

export interface InteractionConfig {
  maxPushChain: number
  allowPull: boolean
}

export interface InteractionState {
  boardSize: number
  timeDepth: number
  cube: TimeCube
  worldLine: WorldLineState
  currentTime: number
  turn: number
  phase: GamePhase
  riftSettings: RiftSettings
  riftResources: RiftResources
  interactionConfig: InteractionConfig
  history: InteractionHistoryEntry[]
  detectionConfig: DetectionConfig
  enemyDetectionConfigById: Record<string, DetectionConfig>
  lastDetection: DetectionReport | null
  paradoxConfig: ParadoxConfig
  lastParadox: ParadoxReport | null
  causalAnchors: CausalAnchor[]
  status: string
}

export type InteractionHandlerResult =
  | { ok: true; outcome: SuccessfulOutcome; status: string }
  | { ok: false; error: InteractionError; status: string }

export type InteractionHandler<K extends InteractionAction['kind']> = {
  kind: K
  execute(
    state: InteractionState,
    action: Extract<InteractionAction, { kind: K }>,
  ): InteractionHandlerResult
}

export type InteractionRegistry = {
  [K in InteractionAction['kind']]: InteractionHandler<K>
}

export type InteractionResult<T> = Result<T, InteractionError>

export function isBlockedError(result: InteractionHandlerResult): result is {
  ok: false
  error: InteractionError
  status: string
} {
  return !result.ok
}
