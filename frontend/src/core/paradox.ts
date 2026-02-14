import { objectsAt, type TimeCube } from './timeCube'
import { positionKey, type WorldLineState } from './worldLine'
import type { Position3D } from './position'

/**
 * Runtime toggle for paradox validation.
 */
export interface ParadoxConfig {
  enabled: boolean
}

/**
 * A committed requirement that must remain true.
 */
export type CausalRequirement =
  | { kind: 'PlayerAt'; position: Position3D; sourceTurn: number }
  | { kind: 'ObjectAt'; objectId: string; position: Position3D; sourceTurn: number }

/**
 * Stable identity wrapper for a causal requirement.
 */
export interface CausalAnchor {
  id: string
  requirement: CausalRequirement
}

/**
 * Classified inconsistency for a broken anchor.
 */
export interface ParadoxViolation {
  anchorId: string
  requirement: CausalRequirement
  reason: 'PlayerMissing' | 'ObjectMissing' | 'ObjectMismatch'
}

/**
 * Paradox evaluation result for one post-check pass.
 */
export interface ParadoxReport {
  paradox: boolean
  checkedFromTime: number
  earliestSourceTurn: number | null
  violations: ParadoxViolation[]
}

function requirementTime(requirement: CausalRequirement): number {
  return requirement.position.t
}

function sourceTurn(requirement: CausalRequirement): number {
  return requirement.sourceTurn
}

function isAnchorSatisfied(
  cube: TimeCube,
  worldLine: WorldLineState,
  anchor: CausalAnchor,
): ParadoxViolation | null {
  const requirement = anchor.requirement

  if (requirement.kind === 'PlayerAt') {
    if (!worldLine.visited[positionKey(requirement.position)]) {
      return {
        anchorId: anchor.id,
        requirement,
        reason: 'PlayerMissing',
      }
    }

    return null
  }

  const object = cube.objectsById[requirement.objectId]

  if (!object) {
    return {
      anchorId: anchor.id,
      requirement,
      reason: 'ObjectMissing',
    }
  }

  const idsAtCell = objectsAt(cube, requirement.position).map((entry) => entry.id)

  if (!idsAtCell.includes(requirement.objectId)) {
    return {
      anchorId: anchor.id,
      requirement,
      reason: 'ObjectMismatch',
    }
  }

  return null
}

export function evaluateParadoxV1(input: {
  cube: TimeCube
  worldLine: WorldLineState
  anchors: CausalAnchor[]
  checkedFromTime: number
  config: ParadoxConfig
}): ParadoxReport {
  const { cube, worldLine, anchors, checkedFromTime, config } = input

  if (!config.enabled) {
    return {
      paradox: false,
      checkedFromTime,
      earliestSourceTurn: null,
      violations: [],
    }
  }

  const filteredAnchors = anchors.filter(
    (anchor) => requirementTime(anchor.requirement) >= checkedFromTime,
  )
  const violations: ParadoxViolation[] = []

  for (const anchor of filteredAnchors) {
    const violation = isAnchorSatisfied(cube, worldLine, anchor)

    if (violation) {
      violations.push(violation)
    }
  }

  return {
    paradox: violations.length > 0,
    checkedFromTime,
    earliestSourceTurn:
      violations.length > 0
        ? Math.min(...violations.map((violation) => sourceTurn(violation.requirement)))
        : null,
    violations,
  }
}
