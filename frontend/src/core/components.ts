import type { Position2D, Position3D } from './position'

export type MarkerComponentKind =
  | 'BlocksMovement'
  | 'BlocksVision'
  | 'TimePersistent'
  | 'Exit'
  | 'Pushable'
  | 'Pullable'

export type MarkerComponent = {
  kind: MarkerComponentKind
}

export type PatrolComponent = {
  kind: 'Patrol'
  path: Position2D[]
  loops: boolean
}

export type RiftComponent = {
  kind: 'Rift'
  target: Position3D
  bidirectional: boolean
}

export type Component = MarkerComponent | PatrolComponent | RiftComponent

export function hasComponent(components: Component[], kind: Component['kind']): boolean {
  return components.some((component) => component.kind === kind)
}
