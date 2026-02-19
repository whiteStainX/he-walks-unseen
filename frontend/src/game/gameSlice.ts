import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { DetectionConfig } from '../core/detection'
import type { ParadoxConfig } from '../core/paradox'
import type { Direction2D, Position3D } from '../core/position'
import type { RiftInstruction, RiftResources, RiftSettings } from '../core/rift'
import { createWorldLine } from '../core/worldLine'
import type { LevelObjectsConfig, ObjectRegistry } from '../core/objects'
import { loadDefaultBootContent, type LoadedBootContent } from '../data/loader'
import { bootstrapLevelObjects, defaultLevelObjectsConfig } from './levelObjects'
import { runInteractionPipeline } from './interactions/pipeline'
import { resolveBootstrapPolicy } from './bootstrapPolicy'
import type {
  GamePhase,
  InteractionAction,
  InteractionConfig,
  InteractionHistoryEntry,
  InteractionState,
} from './interactions/types'
import type { TimeCube } from '../core/timeCube'

const bootContent = loadDefaultBootContent()
const BOOT_POLICY = resolveBootstrapPolicy(import.meta.env)
const DEFAULT_CONTENT_PACK_ID = 'default'
const FALLBACK_BOARD_WIDTH = 12
const FALLBACK_BOARD_HEIGHT = 12
const FALLBACK_TIME_DEPTH = 24
const FALLBACK_START_POSITION: Position3D = { x: 5, y: 5, t: 0 }

const DEFAULT_BOARD_WIDTH = bootContent.ok ? bootContent.value.boardWidth : FALLBACK_BOARD_WIDTH
const DEFAULT_BOARD_HEIGHT = bootContent.ok ? bootContent.value.boardHeight : FALLBACK_BOARD_HEIGHT
const DEFAULT_TIME_DEPTH = bootContent.ok ? bootContent.value.timeDepth : FALLBACK_TIME_DEPTH
const DEFAULT_START_POSITION: Position3D = bootContent.ok
  ? bootContent.value.startPosition
  : FALLBACK_START_POSITION
const DEFAULT_RIFT_SETTINGS: RiftSettings = bootContent.ok
  ? bootContent.value.riftSettings
  : {
      defaultDelta: 3,
      baseEnergyCost: 0,
    }
const DEFAULT_RIFT_RESOURCES: RiftResources = {
  energy: null,
}
const DEFAULT_INTERACTION_CONFIG: InteractionConfig = bootContent.ok
  ? bootContent.value.interactionConfig
  : {
      maxPushChain: 4,
      allowPull: true,
    }
const DEFAULT_DETECTION_CONFIG: DetectionConfig = bootContent.ok
  ? bootContent.value.detectionConfig
  : {
      enabled: true,
      delayTurns: 1,
      maxDistance: 2,
    }
const DEFAULT_ENEMY_DETECTION_CONFIG_BY_ID: Record<string, DetectionConfig> = bootContent.ok
  ? bootContent.value.enemyDetectionConfigById
  : {}
const DEFAULT_PARADOX_CONFIG: ParadoxConfig = {
  enabled: true,
}
const DEFAULT_LEVEL_OBJECTS_CONFIG: LevelObjectsConfig | null = bootContent.ok
  ? bootContent.value.levelObjectsConfig
  : BOOT_POLICY.allowDevFallbackLevel
    ? defaultLevelObjectsConfig
    : null
const DEFAULT_THEME_CSS_VARS: Record<string, string> = bootContent.ok
  ? bootContent.value.themeCssVars
  : {}
const DEFAULT_ICON_PACK_ID = bootContent.ok ? bootContent.value.iconPackId : 'default-mono'
const BOOT_FAILURE_STATUS = bootContent.ok
  ? null
  : `Boot content failed (${bootContent.error.kind}); gameplay disabled until valid content is loaded`
const BOOT_FALLBACK_STATUS = bootContent.ok
  ? null
  : `Boot content failed (${bootContent.error.kind}); using dev fallback level`

export interface GameState extends InteractionState {
  objectRegistry: ObjectRegistry
  contentPackId: string
  levelObjectsConfig: LevelObjectsConfig | null
  startPosition: Position3D
  defaultRiftSettings: RiftSettings
  defaultInteractionConfig: InteractionConfig
  defaultDetectionConfig: DetectionConfig
  defaultEnemyDetectionConfigById: Record<string, DetectionConfig>
  defaultParadoxConfig: ParadoxConfig
  themeCssVars: Record<string, string>
  iconPackId: string
}

function bootstrapObjectState(): {
  objectRegistry: ObjectRegistry
  cube: TimeCube
  status: string
  phase: GamePhase
} {
  if (!bootContent.ok && !BOOT_POLICY.allowDevFallbackLevel) {
    return {
      objectRegistry: { archetypes: {} },
      cube: {
        width: DEFAULT_BOARD_WIDTH,
        height: DEFAULT_BOARD_HEIGHT,
        timeDepth: DEFAULT_TIME_DEPTH,
        slices: Array.from({ length: DEFAULT_TIME_DEPTH }, (_, t) => ({
          t,
          objectIds: [],
          spatialIndex: {},
        })),
        objectsById: {},
      },
      phase: 'BootError',
      status: BOOT_FAILURE_STATUS ?? 'Boot content failed',
    }
  }

  const bootstrap = bootstrapLevelObjects(
    DEFAULT_BOARD_WIDTH,
    DEFAULT_BOARD_HEIGHT,
    DEFAULT_TIME_DEPTH,
    DEFAULT_LEVEL_OBJECTS_CONFIG ?? undefined,
  )

  if (bootstrap.ok) {
    return {
      objectRegistry: bootstrap.value.objectRegistry,
      cube: bootstrap.value.cube,
      phase: 'Playing',
      status: bootContent.ok ? '-_-' : BOOT_FALLBACK_STATUS ?? '-_-',
    }
  }

  return {
    objectRegistry: { archetypes: {} },
    cube: {
      width: DEFAULT_BOARD_WIDTH,
      height: DEFAULT_BOARD_HEIGHT,
      timeDepth: DEFAULT_TIME_DEPTH,
      slices: Array.from({ length: DEFAULT_TIME_DEPTH }, (_, t) => ({
        t,
        objectIds: [],
        spatialIndex: {},
      })),
      objectsById: {},
    },
    phase: 'BootError',
    status: 'Object bootstrap failed; gameplay disabled until valid content is loaded',
  }
}

function bootstrapObjectStateForContent(content: LoadedBootContent): {
  ok: true
  objectRegistry: ObjectRegistry
  cube: TimeCube
} | {
  ok: false
  message: string
} {
  const bootstrap = bootstrapLevelObjects(
    content.boardWidth,
    content.boardHeight,
    content.timeDepth,
    content.levelObjectsConfig,
  )

  if (!bootstrap.ok) {
    return { ok: false, message: 'Loaded content bootstrap failed' }
  }

  return {
    ok: true,
    objectRegistry: bootstrap.value.objectRegistry,
    cube: bootstrap.value.cube,
  }
}

function createInitialState(): GameState {
  const objectState = bootstrapObjectState()

  return {
    boardWidth: DEFAULT_BOARD_WIDTH,
    boardHeight: DEFAULT_BOARD_HEIGHT,
    timeDepth: DEFAULT_TIME_DEPTH,
    objectRegistry: objectState.objectRegistry,
    cube: objectState.cube,
    worldLine: createWorldLine(DEFAULT_START_POSITION),
    currentTime: DEFAULT_START_POSITION.t,
    turn: 0,
    phase: objectState.phase,
    riftSettings: { ...DEFAULT_RIFT_SETTINGS },
    riftResources: { ...DEFAULT_RIFT_RESOURCES },
    interactionConfig: { ...DEFAULT_INTERACTION_CONFIG },
    defaultRiftSettings: { ...DEFAULT_RIFT_SETTINGS },
    defaultInteractionConfig: { ...DEFAULT_INTERACTION_CONFIG },
    detectionConfig: { ...DEFAULT_DETECTION_CONFIG },
    enemyDetectionConfigById: { ...DEFAULT_ENEMY_DETECTION_CONFIG_BY_ID },
    defaultDetectionConfig: { ...DEFAULT_DETECTION_CONFIG },
    defaultEnemyDetectionConfigById: { ...DEFAULT_ENEMY_DETECTION_CONFIG_BY_ID },
    paradoxConfig: { ...DEFAULT_PARADOX_CONFIG },
    defaultParadoxConfig: { ...DEFAULT_PARADOX_CONFIG },
    contentPackId: DEFAULT_CONTENT_PACK_ID,
    levelObjectsConfig: DEFAULT_LEVEL_OBJECTS_CONFIG,
    startPosition: DEFAULT_START_POSITION,
    themeCssVars: { ...DEFAULT_THEME_CSS_VARS },
    iconPackId: DEFAULT_ICON_PACK_ID,
    lastDetection: null,
    lastParadox: null,
    causalAnchors: [],
    causalAnchorsByTime: {},
    history: [],
    status: objectState.status,
  }
}

const initialState: GameState = createInitialState()

function runAction(state: GameState, action: InteractionAction): void {
  runInteractionPipeline(state, action)
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    movePlayer2D(state, action: PayloadAction<Direction2D>) {
      runAction(state, { kind: 'Move', direction: action.payload })
    },
    waitTurn(state) {
      runAction(state, { kind: 'Wait' })
    },
    applyRift(state, action: PayloadAction<RiftInstruction | undefined>) {
      runAction(state, { kind: 'ApplyRift', instruction: action.payload })
    },
    pushPlayer2D(state, action: PayloadAction<Direction2D>) {
      runAction(state, { kind: 'Push', direction: action.payload })
    },
    pullPlayer2D(state, action: PayloadAction<Direction2D>) {
      runAction(state, { kind: 'Pull', direction: action.payload })
    },
    configureRiftSettings(state, action: PayloadAction<Partial<RiftSettings>>) {
      state.riftSettings = { ...state.riftSettings, ...action.payload }
      state.status = `Rift settings updated (delta=${state.riftSettings.defaultDelta}, cost=${state.riftSettings.baseEnergyCost})`
    },
    setInteractionConfig(state, action: PayloadAction<Partial<InteractionConfig>>) {
      state.interactionConfig = { ...state.interactionConfig, ...action.payload }
      state.status = `Interaction config updated (maxPushChain=${state.interactionConfig.maxPushChain}, allowPull=${state.interactionConfig.allowPull})`
    },
    configureDetectionConfig(state, action: PayloadAction<Partial<DetectionConfig>>) {
      state.detectionConfig = { ...state.detectionConfig, ...action.payload }
      state.status = `Detection config updated (enabled=${state.detectionConfig.enabled}, delay=${state.detectionConfig.delayTurns}, range=${state.detectionConfig.maxDistance})`
    },
    configureParadoxConfig(state, action: PayloadAction<Partial<ParadoxConfig>>) {
      state.paradoxConfig = { ...state.paradoxConfig, ...action.payload }
      state.status = `Paradox config updated (enabled=${state.paradoxConfig.enabled})`
    },
    setContentPackId(state, action: PayloadAction<string>) {
      if (state.contentPackId === action.payload) {
        return
      }

      state.contentPackId = action.payload
      state.status = `Loading content pack: ${action.payload}`
    },
    applyLoadedContent(
      state,
      action: PayloadAction<{ packId: string; content: LoadedBootContent }>,
    ) {
      const bootstrapped = bootstrapObjectStateForContent(action.payload.content)

      if (!bootstrapped.ok) {
        state.status = bootstrapped.message
        return
      }

      state.contentPackId = action.payload.packId
      state.levelObjectsConfig = action.payload.content.levelObjectsConfig
      state.boardWidth = action.payload.content.boardWidth
      state.boardHeight = action.payload.content.boardHeight
      state.timeDepth = action.payload.content.timeDepth
      state.startPosition = action.payload.content.startPosition
      state.objectRegistry = bootstrapped.objectRegistry
      state.cube = bootstrapped.cube
      state.worldLine = createWorldLine(action.payload.content.startPosition)
      state.currentTime = action.payload.content.startPosition.t
      state.turn = 0
      state.phase = 'Playing'
      state.riftResources = { ...DEFAULT_RIFT_RESOURCES }
      state.defaultRiftSettings = { ...action.payload.content.riftSettings }
      state.riftSettings = { ...action.payload.content.riftSettings }
      state.defaultInteractionConfig = { ...action.payload.content.interactionConfig }
      state.interactionConfig = { ...action.payload.content.interactionConfig }
      state.defaultDetectionConfig = { ...action.payload.content.detectionConfig }
      state.detectionConfig = { ...action.payload.content.detectionConfig }
      state.defaultEnemyDetectionConfigById = { ...action.payload.content.enemyDetectionConfigById }
      state.enemyDetectionConfigById = { ...action.payload.content.enemyDetectionConfigById }
      state.paradoxConfig = { ...state.defaultParadoxConfig }
      state.themeCssVars = { ...action.payload.content.themeCssVars }
      state.iconPackId = action.payload.content.iconPackId
      state.lastDetection = null
      state.lastParadox = null
      state.causalAnchors = []
      state.causalAnchorsByTime = {}
      state.history = []
      state.status = `Loaded content pack: ${action.payload.packId}`
    },
    restart(state) {
      const restartConfig =
        state.levelObjectsConfig ??
        (BOOT_POLICY.allowDevFallbackLevel ? defaultLevelObjectsConfig : null)

      if (!restartConfig) {
        state.phase = 'BootError'
        state.status = 'Restart blocked: no level loaded. Load a valid content pack.'
        return
      }

      const objectState = bootstrapLevelObjects(
        state.boardWidth,
        state.boardHeight,
        state.timeDepth,
        restartConfig,
      )

      if (!objectState.ok) {
        state.phase = 'BootError'
        state.status = 'Restart failed: object bootstrap error'
        return
      }

      state.objectRegistry = objectState.value.objectRegistry
      state.cube = objectState.value.cube
      state.worldLine = createWorldLine(state.startPosition)
      state.currentTime = state.startPosition.t
      state.turn = 0
      state.phase = 'Playing'
      state.riftSettings = { ...state.defaultRiftSettings }
      state.riftResources = { ...DEFAULT_RIFT_RESOURCES }
      state.interactionConfig = { ...state.defaultInteractionConfig }
      state.detectionConfig = { ...state.defaultDetectionConfig }
      state.enemyDetectionConfigById = { ...state.defaultEnemyDetectionConfigById }
      state.lastDetection = null
      state.paradoxConfig = { ...state.defaultParadoxConfig }
      state.lastParadox = null
      state.causalAnchors = []
      state.causalAnchorsByTime = {}
      state.history = []
      state.phase = 'Playing'
      state.status = 'Restarted'
    },
    setStatus(state, action: PayloadAction<string>) {
      state.status = action.payload
    },
  },
})

export const {
  movePlayer2D,
  waitTurn,
  applyRift,
  pushPlayer2D,
  pullPlayer2D,
  configureRiftSettings,
  setInteractionConfig,
  configureDetectionConfig,
  configureParadoxConfig,
  setContentPackId,
  applyLoadedContent,
  restart,
  setStatus,
} = gameSlice.actions
export const gameReducer = gameSlice.reducer

export type { GamePhase, InteractionHistoryEntry }
