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

export type CausalAnchorIndexByTime = Record<number, CausalAnchor[]>

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

function requirementKey(requirement: CausalRequirement): string {
  if (requirement.kind === 'PlayerAt') {
    return `PlayerAt:${requirement.position.x},${requirement.position.y},${requirement.position.t}`
  }

  return `ObjectAt:${requirement.objectId}:${requirement.position.x},${requirement.position.y},${requirement.position.t}`
}

function cloneRequirement(requirement: CausalRequirement): CausalRequirement {
  if (requirement.kind === 'PlayerAt') {
    return {
      kind: 'PlayerAt',
      position: requirement.position,
      sourceTurn: requirement.sourceTurn,
    }
  }

  return {
    kind: 'ObjectAt',
    objectId: requirement.objectId,
    position: requirement.position,
    sourceTurn: requirement.sourceTurn,
  }
}

function indexAnchorsByTime(anchors: CausalAnchor[]): CausalAnchorIndexByTime {
  const index: CausalAnchorIndexByTime = {}

  for (const anchor of anchors) {
    const t = requirementTime(anchor.requirement)
    const entries = index[t] ?? []
    index[t] = [...entries, anchor]
  }

  return index
}

export function canonicalizeCausalAnchors(input: {
  anchors: CausalAnchor[]
}): { anchors: CausalAnchor[]; anchorsByTime: CausalAnchorIndexByTime } {
  const byRequirement = new Map<string, CausalAnchor>()

  for (const anchor of input.anchors) {
    const key = requirementKey(anchor.requirement)
    const existing = byRequirement.get(key)

    if (!existing) {
      byRequirement.set(key, {
        id: anchor.id,
        requirement: cloneRequirement(anchor.requirement),
      })
      continue
    }

    if (sourceTurn(anchor.requirement) < sourceTurn(existing.requirement)) {
      existing.requirement = {
        ...existing.requirement,
        sourceTurn: sourceTurn(anchor.requirement),
      }
    }
  }

  const anchors = [...byRequirement.values()]

  return {
    anchors,
    anchorsByTime: indexAnchorsByTime(anchors),
  }
}

export function mergeCausalAnchors(input: {
  existing: CausalAnchor[]
  incoming: CausalAnchor[]
}): { anchors: CausalAnchor[]; anchorsByTime: CausalAnchorIndexByTime } {
  if (input.incoming.length === 0) {
    return canonicalizeCausalAnchors({ anchors: input.existing })
  }

  const canonical = canonicalizeCausalAnchors({ anchors: input.existing })
  const byRequirement = new Map<string, number>()

  for (let index = 0; index < canonical.anchors.length; index += 1) {
    const anchor = canonical.anchors[index]
    byRequirement.set(requirementKey(anchor.requirement), index)
  }

  for (const incoming of input.incoming) {
    const key = requirementKey(incoming.requirement)
    const existingIndex = byRequirement.get(key)

    if (existingIndex === undefined) {
      byRequirement.set(key, canonical.anchors.length)
      canonical.anchors.push({
        id: incoming.id,
        requirement: cloneRequirement(incoming.requirement),
      })
      continue
    }

    const existing = canonical.anchors[existingIndex]

    if (sourceTurn(incoming.requirement) < sourceTurn(existing.requirement)) {
      existing.requirement = {
        ...existing.requirement,
        sourceTurn: sourceTurn(incoming.requirement),
      }
    }
  }

  return {
    anchors: canonical.anchors,
    anchorsByTime: indexAnchorsByTime(canonical.anchors),
  }
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
  anchorsByTime?: CausalAnchorIndexByTime
  checkedFromTime: number
  config: ParadoxConfig
}): ParadoxReport {
  const { cube, worldLine, anchors, anchorsByTime, checkedFromTime, config } = input

  if (!config.enabled) {
    return {
      paradox: false,
      checkedFromTime,
      earliestSourceTurn: null,
      violations: [],
    }
  }

  const filteredAnchors: CausalAnchor[] = anchorsByTime
    ? Object.entries(anchorsByTime)
        .filter(([t]) => Number(t) >= checkedFromTime)
        .flatMap(([, timeAnchors]) => timeAnchors)
    : anchors.filter((anchor) => requirementTime(anchor.requirement) >= checkedFromTime)
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
