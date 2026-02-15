import type { ObjectRender } from '../../core/objects'

export const BOARD_ICON_SLOT_BY_KIND: Record<string, string> = {
  wall: 'wall',
  box: 'box',
  exit: 'exit',
  enemy: 'enemy',
  marker: 'marker',
  patrol: 'patrol',
  rift: 'rift',
}

export const PLAYER_ICON_SLOT = 'player'
export const PAST_SELF_ICON_SLOT = 'pastSelf'
export const DANGER_ICON_SLOT = 'danger'

export function resolveObjectIconSlot(kind: string, render: ObjectRender): string | null {
  if (typeof render.symbol === 'string' && render.symbol.length > 0) {
    return render.symbol
  }

  return BOARD_ICON_SLOT_BY_KIND[kind] ?? null
}
