import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { is_in_bounds, move_position, type Direction2D, type Position2D } from '../core/position'

export interface GameState {
  boardSize: number
  player: Position2D
  turn: number
  status: string
}

const initialState: GameState = {
  boardSize: 12,
  player: { x: 5, y: 5 },
  turn: 0,
  status: 'Move with WASD or Arrow Keys',
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    movePlayer(state, action: PayloadAction<Direction2D>) {
      const next = move_position(state.player, action.payload)

      if (!is_in_bounds(next, state.boardSize)) {
        state.status = 'Blocked by boundary'
        return
      }

      state.player = next
      state.turn += 1
      state.status = `Turn ${state.turn}: player at (${state.player.x}, ${state.player.y})`
    },
    restart(state) {
      state.player = initialState.player
      state.turn = 0
      state.status = 'Restarted'
    },
    setStatus(state, action: PayloadAction<string>) {
      state.status = action.payload
    },
  },
})

export const { movePlayer, restart, setStatus } = gameSlice.actions
export const gameReducer = gameSlice.reducer
