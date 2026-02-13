import { hasExit } from '../../core/timeCube'
import { currentPosition } from '../../core/worldLine'
import { executeRegisteredInteraction } from './registry'
import type { InteractionAction, InteractionState } from './types'

function guardActivePhase(state: InteractionState): boolean {
  if (state.phase !== 'Playing') {
    state.status = 'Game already ended. Press R to restart.'
    return false
  }

  return true
}

export function runInteractionPipeline(
  state: InteractionState,
  action: InteractionAction,
): void {
  if (!guardActivePhase(state)) {
    return
  }

  const result = executeRegisteredInteraction(state, action)

  if (!result.ok) {
    state.status = result.status
    return
  }

  const player = currentPosition(state.worldLine)

  if (!player) {
    state.status = 'Internal error: empty world line'
    return
  }

  state.turn += 1
  state.currentTime = player.t
  state.history.push({
    turn: state.turn,
    action,
    outcome: result.outcome,
  })

  if (hasExit(state.cube, player)) {
    state.phase = 'Won'
    state.status = `Turn ${state.turn}: reached exit at (${player.x}, ${player.y}, t=${player.t})`
    return
  }

  state.status = `Turn ${state.turn}: ${result.status}`
}
