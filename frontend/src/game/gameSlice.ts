import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { Direction2D, Position3D } from '../core/position'
import type { RiftInstruction, RiftResources, RiftSettings } from '../core/rift'
import { createWorldLine } from '../core/worldLine'
import type { ObjectRegistry } from '../core/objects'
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

const DEFAULT_BOARD_SIZE = 12
const DEFAULT_TIME_DEPTH = 24
const DEFAULT_RIFT_DELTA = 3
const DEFAULT_START_POSITION: Position3D = { x: 5, y: 5, t: 0 }
const DEFAULT_RIFT_SETTINGS: RiftSettings = {
  defaultDelta: DEFAULT_RIFT_DELTA,
  baseEnergyCost: 0,
}
const DEFAULT_RIFT_RESOURCES: RiftResources = {
  energy: null,
}
const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  maxPushChain: 4,
  allowPull: true,
}

export interface GameState extends InteractionState {
  objectRegistry: ObjectRegistry
}

function bootstrapObjectState(): {
  objectRegistry: ObjectRegistry
  cube: TimeCube
  status: string
} {
  const bootstrap = bootstrapLevelObjects(DEFAULT_BOARD_SIZE, DEFAULT_TIME_DEPTH)

  if (bootstrap.ok) {
    return {
      objectRegistry: bootstrap.value.objectRegistry,
      cube: bootstrap.value.cube,
      status:
        '-_-',
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
    restart(state) {
      const objectState = bootstrapObjectState()

      state.objectRegistry = objectState.objectRegistry
      state.cube = objectState.cube
      state.worldLine = createWorldLine(DEFAULT_START_POSITION)
      state.currentTime = DEFAULT_START_POSITION.t
      state.turn = 0
      state.phase = 'Playing'
      state.riftSettings = { ...DEFAULT_RIFT_SETTINGS }
      state.riftResources = { ...DEFAULT_RIFT_RESOURCES }
      state.interactionConfig = { ...DEFAULT_INTERACTION_CONFIG }
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
  restart,
  setStatus,
} = gameSlice.actions
export const gameReducer = gameSlice.reducer

export type { GamePhase, InteractionHistoryEntry }
