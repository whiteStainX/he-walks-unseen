import type { ContentPack } from '../contracts'
import type { SolvabilityReport } from './contracts'

function countInstancesByArchetype(pack: ContentPack, archetypeKind: string): number {
  return pack.level.instances.filter((instance) => {
    const archetype = pack.level.archetypes[instance.archetype]
    return archetype?.kind === archetypeKind
  }).length
}

export function scoreGeneratedContent(input: {
  content: ContentPack
  solver: SolvabilityReport
}): number {
  if (!input.solver.solved || input.solver.shortestPathLength === null) {
    return 0
  }

  const pathScore = Math.min(input.solver.shortestPathLength, 30)
  const enemyCount = countInstancesByArchetype(input.content, 'enemy')
  const wallCount = countInstancesByArchetype(input.content, 'wall')
  const boxCount = countInstancesByArchetype(input.content, 'box')
  const pressureScore = Math.min(enemyCount * 8, 24)
  const structureScore = Math.min(Math.floor(wallCount / 3), 20)
  const interactionScore = Math.min(boxCount * 6, 18)

  return 20 + pathScore + pressureScore + structureScore + interactionScore
}
