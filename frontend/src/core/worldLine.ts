import { manhattanDistance, type Position3D } from './position'

export interface WorldLineState {
  path: Position3D[]
  // Sparse membership index: key exists only when (x,y,t) has been visited.
  // We store literal true (instead of boolean flags) for O(1) checks and
  // Redux-friendly serializable state.
  visited: Record<string, true>
}

export type WorldLineError =
  | { kind: 'EmptyWorldLine' }
  | { kind: 'SelfIntersection'; position: Position3D }
  | { kind: 'InvalidNormalStep'; from: Position3D; to: Position3D }

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export interface PositionAtTime {
  position: Position3D
  turn: number
}

export function positionKey(position: Position3D): string {
  return `${position.x},${position.y},${position.t}`
}

export function createWorldLine(start: Position3D): WorldLineState {
  return {
    path: [start],
    visited: { [positionKey(start)]: true },
  }
}

export function currentPosition(worldLine: WorldLineState): Position3D | null {
  return worldLine.path.at(-1) ?? null
}

export function wouldIntersect(worldLine: WorldLineState, position: Position3D): boolean {
  return Boolean(worldLine.visited[positionKey(position)])
}

export function extendNormal(
  worldLine: WorldLineState,
  next: Position3D,
): Result<WorldLineState, WorldLineError> {
  const current = currentPosition(worldLine)

  if (!current) {
    return { ok: false, error: { kind: 'EmptyWorldLine' } }
  }

  if (wouldIntersect(worldLine, next)) {
    return { ok: false, error: { kind: 'SelfIntersection', position: next } }
  }

  const isNextTime = next.t === current.t + 1
  const isAdjacentOrWait = manhattanDistance(current, next) <= 1

  if (!isNextTime || !isAdjacentOrWait) {
    return {
      ok: false,
      error: { kind: 'InvalidNormalStep', from: current, to: next },
    }
  }

  return {
    ok: true,
    value: {
      path: [...worldLine.path, next],
      visited: { ...worldLine.visited, [positionKey(next)]: true },
    },
  }
}

export function extendViaRift(
  worldLine: WorldLineState,
  next: Position3D,
): Result<WorldLineState, WorldLineError> {
  const current = currentPosition(worldLine)

  if (!current) {
    return { ok: false, error: { kind: 'EmptyWorldLine' } }
  }

  if (wouldIntersect(worldLine, next)) {
    return { ok: false, error: { kind: 'SelfIntersection', position: next } }
  }

  return {
    ok: true,
    value: {
      path: [...worldLine.path, next],
      visited: { ...worldLine.visited, [positionKey(next)]: true },
    },
  }
}

export function positionsAtTime(worldLine: WorldLineState, t: number): PositionAtTime[] {
  return worldLine.path
    .map((position, turn) => ({ position, turn }))
    .filter((entry) => entry.position.t === t)
}
