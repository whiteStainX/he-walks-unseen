import type { ContentPack } from '../contracts'
import type { GenerationQualityWeights, SolvabilityReport } from './contracts'

function countInstancesByArchetype(pack: ContentPack, archetypeKind: string): number {
  return pack.level.instances.filter((instance) => {
    const archetype = pack.level.archetypes[instance.archetype]
    return archetype?.kind === archetypeKind
  }).length
}

export function scoreGeneratedContent(input: {
  content: ContentPack
  solver: SolvabilityReport
  weights: GenerationQualityWeights
}): number {
  if (!input.solver.solved || input.solver.shortestPathLength === null) {
    return 0
  }

  const pathScore = Math.min(input.solver.shortestPathLength, input.weights.pathCap)
  const enemyCount = countInstancesByArchetype(input.content, 'enemy')
  const wallCount = countInstancesByArchetype(input.content, 'wall')
  const boxCount = countInstancesByArchetype(input.content, 'box')
  const pressureScore = Math.min(enemyCount * input.weights.enemyWeight, input.weights.enemyCap)
  const structureScore = Math.min(Math.floor(wallCount / input.weights.wallDivisor), input.weights.wallCap)
  const interactionScore = Math.min(boxCount * input.weights.boxWeight, input.weights.boxCap)

  return input.weights.baseScore + pathScore + pressureScore + structureScore + interactionScore
}
