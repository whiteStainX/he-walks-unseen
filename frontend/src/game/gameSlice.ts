import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { DetectionConfig } from '../core/detection'
import type { Direction2D, Position3D } from '../core/position'
import type { RiftInstruction, RiftResources, RiftSettings } from '../core/rift'
import { createWorldLine } from '../core/worldLine'
import type { LevelObjectsConfig, ObjectRegistry } from '../core/objects'
import { loadDefaultBootContent, type LoadedBootContent } from '../data/loader'
import { bootstrapLevelObjects } from './levelObjects'
import { runInteractionPipeline } from './interactions/pipeline'
import type {
  GamePhase,
  InteractionAction,
  InteractionConfig,
  InteractionHistoryEntry,
  InteractionState,
} from './interactions/types'
import type { TimeCube } from '../core/timeCube'

const bootContent = loadDefaultBootContent()
const DEFAULT_CONTENT_PACK_ID = 'default'

const DEFAULT_BOARD_SIZE = bootContent.ok ? bootContent.value.boardSize : 12
const DEFAULT_TIME_DEPTH = bootContent.ok ? bootContent.value.timeDepth : 24
const DEFAULT_START_POSITION: Position3D = bootContent.ok
  ? bootContent.value.startPosition
  : { x: 5, y: 5, t: 0 }
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
const DEFAULT_LEVEL_OBJECTS_CONFIG: LevelObjectsConfig | null = bootContent.ok
  ? bootContent.value.levelObjectsConfig
  : null
const DEFAULT_THEME_CSS_VARS: Record<string, string> = bootContent.ok
  ? bootContent.value.themeCssVars
  : {}

export interface GameState extends InteractionState {
  objectRegistry: ObjectRegistry
  contentPackId: string
  levelObjectsConfig: LevelObjectsConfig | null
  startPosition: Position3D
  defaultRiftSettings: RiftSettings
  defaultInteractionConfig: InteractionConfig
  defaultDetectionConfig: DetectionConfig
  themeCssVars: Record<string, string>
}

function bootstrapObjectState(): {
  objectRegistry: ObjectRegistry
  cube: TimeCube
  status: string
} {
  const bootstrap = bootstrapLevelObjects(
    DEFAULT_BOARD_SIZE,
    DEFAULT_TIME_DEPTH,
    bootContent.ok ? bootContent.value.levelObjectsConfig : undefined,
  )

  if (bootstrap.ok) {
    return {
      objectRegistry: bootstrap.value.objectRegistry,
      cube: bootstrap.value.cube,
      status: '-_-',
    }
  }

  return {
    objectRegistry: { archetypes: {} },
    cube: {
      width: DEFAULT_BOARD_SIZE,
      height: DEFAULT_BOARD_SIZE,
      timeDepth: DEFAULT_TIME_DEPTH,
      slices: Array.from({ length: DEFAULT_TIME_DEPTH }, (_, t) => ({
        t,
        objectIds: [],
        spatialIndex: {},
      })),
      objectsById: {},
    },
    status: 'Object bootstrap failed; running without objects',
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
    content.boardSize,
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
    boardSize: DEFAULT_BOARD_SIZE,
    timeDepth: DEFAULT_TIME_DEPTH,
    objectRegistry: objectState.objectRegistry,
    cube: objectState.cube,
    worldLine: createWorldLine(DEFAULT_START_POSITION),
    currentTime: DEFAULT_START_POSITION.t,
    turn: 0,
    phase: 'Playing',
    riftSettings: { ...DEFAULT_RIFT_SETTINGS },
    riftResources: { ...DEFAULT_RIFT_RESOURCES },
    interactionConfig: { ...DEFAULT_INTERACTION_CONFIG },
    defaultRiftSettings: { ...DEFAULT_RIFT_SETTINGS },
    defaultInteractionConfig: { ...DEFAULT_INTERACTION_CONFIG },
    detectionConfig: { ...DEFAULT_DETECTION_CONFIG },
    defaultDetectionConfig: { ...DEFAULT_DETECTION_CONFIG },
    contentPackId: DEFAULT_CONTENT_PACK_ID,
    levelObjectsConfig: DEFAULT_LEVEL_OBJECTS_CONFIG,
    startPosition: DEFAULT_START_POSITION,
    themeCssVars: { ...DEFAULT_THEME_CSS_VARS },
    lastDetection: null,
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
      state.boardSize = action.payload.content.boardSize
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
      state.themeCssVars = { ...action.payload.content.themeCssVars }
      state.lastDetection = null
      state.history = []
      state.status = `Loaded content pack: ${action.payload.packId}`
    },
    restart(state) {
      const objectState = state.levelObjectsConfig
        ? bootstrapLevelObjects(state.boardSize, state.timeDepth, state.levelObjectsConfig)
        : bootstrapLevelObjects(state.boardSize, state.timeDepth)

      if (!objectState.ok) {
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
      state.lastDetection = null
      state.history = []
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
  setContentPackId,
  applyLoadedContent,
  restart,
  setStatus,
} = gameSlice.actions
export const gameReducer = gameSlice.reducer

export type { GamePhase, InteractionHistoryEntry }
