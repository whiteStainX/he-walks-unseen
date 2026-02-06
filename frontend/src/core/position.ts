export interface Position2D {
  x: number
  y: number
}

export type Direction2D = 'north' | 'south' | 'east' | 'west'

export function move_position(position: Position2D, direction: Direction2D): Position2D {
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

export function is_in_bounds(position: Position2D, board_size: number): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < board_size &&
    position.y < board_size
  )
}
