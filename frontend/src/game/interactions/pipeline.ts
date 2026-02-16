import { evaluateDetectionV1 } from '../../core/detection'
import { evaluateParadoxV1, type CausalAnchor } from '../../core/paradox'
import { getObjectById, hasExit } from '../../core/timeCube'
import { currentPosition } from '../../core/worldLine'
import { executeRegisteredInteraction } from './registry'
import type { InteractionAction, InteractionState, SuccessfulOutcome } from './types'

function guardActivePhase(state: InteractionState): boolean {
  if (state.phase !== 'Playing') {
    state.status = 'Game already ended. Press R to restart.'
    return false
  }

  return true
}

function buildCommitAnchors(
  state: InteractionState,
  outcome: SuccessfulOutcome,
  turn: number,
): { anchors: CausalAnchor[]; affectedFromTime: number } {
  const playerAnchor: CausalAnchor = {
    id: `turn-${turn}-player`,
    requirement: {
      kind: 'PlayerAt',
      position: outcome.to,
      sourceTurn: turn,
    },
  }
  const anchors: CausalAnchor[] = [playerAnchor]
  let affectedFromTime = outcome.to.t

  if (outcome.kind === 'Pushed' || outcome.kind === 'Pulled') {
    let index = 0

    for (const objectId of outcome.movedObjectIds) {
      const object = getObjectById(state.cube, objectId)

      if (!object.ok) {
        continue
      }

      anchors.push({
        id: `turn-${turn}-object-${index}`,
        requirement: {
          kind: 'ObjectAt',
          objectId,
          position: object.value.position,
          sourceTurn: turn,
        },
      })
      affectedFromTime = Math.min(affectedFromTime, object.value.position.t)
      index += 1
    }
  }

  return { anchors, affectedFromTime }
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
  const commitMeta = buildCommitAnchors(state, result.outcome, state.turn)
  state.causalAnchors.push(...commitMeta.anchors)
  state.history.push({
    turn: state.turn,
    action,
    outcome: result.outcome,
    anchors: commitMeta.anchors,
    affectedFromTime: commitMeta.affectedFromTime,
  })

  const paradox = evaluateParadoxV1({
    cube: state.cube,
    worldLine: state.worldLine,
    anchors: state.causalAnchors,
    checkedFromTime: commitMeta.affectedFromTime,
    config: state.paradoxConfig,
  })

  if (paradox.paradox) {
    const primary = paradox.violations[0]
    state.lastParadox = paradox
    state.lastDetection = null
    state.phase = 'Paradox'
    state.status = `Turn ${state.turn}: paradox (${primary.reason})`
    return
  }

  state.lastParadox = null

  if (hasExit(state.cube, player)) {
    state.lastDetection = null
    state.phase = 'Won'
    state.status = `Turn ${state.turn}: reached exit at (${player.x}, ${player.y}, t=${player.t})`
    return
  }

  const detection = evaluateDetectionV1({
    cube: state.cube,
    worldLine: state.worldLine,
    currentTime: player.t,
    config: state.detectionConfig,
    configByEnemyId: state.enemyDetectionConfigById,
  })

  if (detection.detected) {
    const primary = detection.events[0]
    state.lastDetection = detection
    state.phase = 'Detected'
    state.status = `Turn ${state.turn}: detected by ${primary.enemyId} (observed t=${primary.observedPlayer.t})`
    return
  }

  state.lastDetection = null

  state.status = `Turn ${state.turn}: ${result.status}`
}
