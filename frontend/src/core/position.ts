export interface Position2D {
  x: number
  y: number
}

export type SpatialPos = Position2D

export interface Position3D extends Position2D {
  t: number
}

export type Direction2D = 'north' | 'south' | 'east' | 'west'

export function movePosition(position: Position2D, direction: Direction2D): Position2D {
  switch (direction) {
    case 'north':
      return { x: position.x, y: position.y - 1 }
    case 'south':
      return { x: position.x, y: position.y + 1 }
    case 'east':
      return { x: position.x + 1, y: position.y }
    case 'west':
      return { x: position.x - 1, y: position.y }
  }
}

export function isInBounds(position: Position2D, width: number, height = width): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < width &&
    position.y < height
  )
}

export function manhattanDistance(a: Position2D, b: Position2D): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}
