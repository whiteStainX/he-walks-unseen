import type { ContentArchetype, ContentPack } from '../contracts'
import type { SolvabilityReport } from './contracts'

interface SolverCell {
  x: number
  y: number
}

function cellKey(cell: SolverCell): string {
  return `${cell.x},${cell.y}`
}

function hasComponent(archetype: ContentArchetype, kind: string): boolean {
  return archetype.components.some((component) => component.kind === kind)
}

function buildBlockingSet(pack: ContentPack): Set<string> {
  const blocked = new Set<string>()

  for (const instance of pack.level.instances) {
    const archetype = pack.level.archetypes[instance.archetype]

    if (!archetype) {
      continue
    }

    if (!hasComponent(archetype, 'BlocksMovement')) {
      continue
    }

    if (instance.position.t !== 0) {
      continue
    }

    blocked.add(cellKey(instance.position))
  }

  return blocked
}

function buildExitSet(pack: ContentPack): Set<string> {
  const exits = new Set<string>()

  for (const instance of pack.level.instances) {
    const archetype = pack.level.archetypes[instance.archetype]

    if (!archetype) {
      continue
    }

    if (!hasComponent(archetype, 'Exit')) {
      continue
    }

    if (instance.position.t !== 0) {
      continue
    }

    exits.add(cellKey(instance.position))
  }

  return exits
}

export function evaluateSolvabilityV1(pack: ContentPack): SolvabilityReport {
  const start = pack.level.map.start
  const startCell = { x: start.x, y: start.y }
  const width = pack.level.map.width
  const height = pack.level.map.height
  const blocked = buildBlockingSet(pack)
  const exits = buildExitSet(pack)
  const startKey = cellKey(startCell)

  if (exits.size === 0) {
    return { solved: false, shortestPathLength: null, visitedNodes: 0 }
  }

  if (blocked.has(startKey)) {
    return { solved: false, shortestPathLength: null, visitedNodes: 0 }
  }

  const queue: Array<{ cell: SolverCell; distance: number }> = [{ cell: startCell, distance: 0 }]
  const visited = new Set<string>([startKey])
  let visitedNodes = 0
  const directions: SolverCell[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ]

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    const currentKey = cellKey(current.cell)
    visitedNodes += 1

    if (exits.has(currentKey)) {
      return {
        solved: true,
        shortestPathLength: current.distance,
        visitedNodes,
      }
    }

    for (const direction of directions) {
      const next = {
        x: current.cell.x + direction.x,
        y: current.cell.y + direction.y,
      }

      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) {
        continue
      }

      const nextKey = cellKey(next)

      if (visited.has(nextKey)) {
        continue
      }

      if (blocked.has(nextKey) && !exits.has(nextKey)) {
        continue
      }

      visited.add(nextKey)
      queue.push({
        cell: next,
        distance: current.distance + 1,
      })
    }
  }

  return {
    solved: false,
    shortestPathLength: null,
    visitedNodes,
  }
}
