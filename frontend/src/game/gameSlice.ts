import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { isInBounds, movePosition, type Direction2D, type Position3D } from '../core/position'
import {
  createWorldLine,
  currentPosition,
  extendNormal,
  extendViaRift,
  type WorldLineState,
} from '../core/worldLine'

const DEFAULT_BOARD_SIZE = 12
const DEFAULT_TIME_DEPTH = 24
const DEFAULT_RIFT_DELTA = 3
const DEFAULT_START_POSITION: Position3D = { x: 5, y: 5, t: 0 }

export interface GameState {
  boardSize: number
  timeDepth: number
  worldLine: WorldLineState
  currentTime: number
  turn: number
  riftDelta: number
  status: string
}

const initialState: GameState = {
  boardSize: DEFAULT_BOARD_SIZE,
  timeDepth: DEFAULT_TIME_DEPTH,
  worldLine: createWorldLine(DEFAULT_START_POSITION),
  currentTime: DEFAULT_START_POSITION.t,
  turn: 0,
  riftDelta: DEFAULT_RIFT_DELTA,
  status: 'Move: WASD/Arrows | Rift: Space',
}

function nextNormalPosition(
  state: GameState,
  direction: Direction2D,
): Position3D | { error: string } {
  const current = currentPosition(state.worldLine)

  if (!current) {
    return { error: 'Internal error: empty world line' }
  }

  const spatial = movePosition(current, direction)

  if (!isInBounds(spatial, state.boardSize)) {
    return { error: 'Blocked by boundary' }
  }

  const nextTime = current.t + 1

  if (nextTime >= state.timeDepth) {
    return { error: 'Blocked by time boundary' }
  }

  return {
    x: spatial.x,
    y: spatial.y,
    t: nextTime,
  }
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    movePlayer2D(state, action: PayloadAction<Direction2D>) {
      const next = nextNormalPosition(state, action.payload)

      if ('error' in next) {
        state.status = next.error
        return
      }

      const result = extendNormal(state.worldLine, next)

      if (!result.ok) {
        state.status =
          result.error.kind === 'SelfIntersection' ? 'Blocked by self-intersection' : 'Invalid move'
        return
      }

      state.worldLine = result.value
      state.currentTime = next.t
      state.turn += 1
      state.status = `Turn ${state.turn}: (${next.x}, ${next.y}, t=${next.t})`
    },
    waitTurn(state) {
      const current = currentPosition(state.worldLine)

      if (!current) {
        state.status = 'Internal error: empty world line'
        return
      }

      const nextTime = current.t + 1

      if (nextTime >= state.timeDepth) {
        state.status = 'Blocked by time boundary'
        return
      }

      const next: Position3D = { x: current.x, y: current.y, t: nextTime }
      const result = extendNormal(state.worldLine, next)

      if (!result.ok) {
        state.status =
          result.error.kind === 'SelfIntersection' ? 'Blocked by self-intersection' : 'Invalid wait'
        return
      }

      state.worldLine = result.value
      state.currentTime = next.t
      state.turn += 1
      state.status = `Turn ${state.turn}: wait at t=${next.t}`
    },
    riftToTime(state, action: PayloadAction<{ targetTime?: number } | undefined>) {
      const current = currentPosition(state.worldLine)

      if (!current) {
        state.status = 'Internal error: empty world line'
        return
      }

      const targetTime = action.payload?.targetTime ?? current.t - state.riftDelta

      if (targetTime < 0 || targetTime >= state.timeDepth) {
        state.status = 'Invalid rift target time'
        return
      }

      const next: Position3D = {
        x: current.x,
        y: current.y,
        t: targetTime,
      }

      const result = extendViaRift(state.worldLine, next)

      if (!result.ok) {
        state.status =
          result.error.kind === 'SelfIntersection' ? 'Blocked by self-intersection' : 'Invalid rift'
        return
      }

      state.worldLine = result.value
      state.currentTime = next.t
      state.turn += 1
      state.status = `Turn ${state.turn}: rift to t=${next.t}`
    },
    restart(state) {
      state.worldLine = createWorldLine(DEFAULT_START_POSITION)
      state.currentTime = DEFAULT_START_POSITION.t
      state.turn = 0
      state.status = 'Restarted'
    },
    setStatus(state, action: PayloadAction<string>) {
      state.status = action.payload
    },
  },
})

export const { movePlayer2D, waitTurn, riftToTime, restart, setStatus } = gameSlice.actions
export const gameReducer = gameSlice.reducer
