import type { Direction2D } from '../core/position'

export type DirectionalActionMode = 'Move' | 'Push' | 'Pull'

export type InputLayer = 'Gameplay' | 'ActionMenu' | 'StateOverlay' | 'LogOverlay' | 'SystemMenu'

export interface DirectionalIntent {
  mode: DirectionalActionMode
  direction: Direction2D
}

export interface InputStateMachine {
  layer: InputLayer
  mode: DirectionalActionMode
}

export interface DirectionalInputResult {
  immediate: DirectionalIntent | null
}

export function createInputStateMachine(): InputStateMachine {
  return {
    layer: 'Gameplay',
    mode: 'Move',
  }
}

export function toggleActionMenu(machine: InputStateMachine): InputStateMachine {
  if (
    machine.layer === 'SystemMenu' ||
    machine.layer === 'LogOverlay' ||
    machine.layer === 'StateOverlay'
  ) {
    return machine
  }

  return {
    ...machine,
    layer: machine.layer === 'ActionMenu' ? 'Gameplay' : 'ActionMenu',
  }
}

export function toggleLogOverlay(machine: InputStateMachine): InputStateMachine {
  if (machine.layer === 'SystemMenu' || machine.layer === 'StateOverlay') {
    return machine
  }

  return {
    ...machine,
    layer: machine.layer === 'LogOverlay' ? 'Gameplay' : 'LogOverlay',
  }
}

export function toggleSystemMenu(machine: InputStateMachine): InputStateMachine {
  if (machine.layer === 'StateOverlay') {
    return machine
  }

  return {
    ...machine,
    layer: machine.layer === 'SystemMenu' ? 'Gameplay' : 'SystemMenu',
  }
}

export function toggleStateOverlay(machine: InputStateMachine): InputStateMachine {
  if (machine.layer === 'SystemMenu' || machine.layer === 'LogOverlay' || machine.layer === 'ActionMenu') {
    return machine
  }

  return {
    ...machine,
    layer: machine.layer === 'StateOverlay' ? 'Gameplay' : 'StateOverlay',
  }
}

export function closeTopLayer(machine: InputStateMachine): InputStateMachine {
  if (machine.layer === 'Gameplay') {
    return machine
  }

  return {
    ...machine,
    layer: 'Gameplay',
  }
}

export function selectDirectionalMode(
  machine: InputStateMachine,
  mode: DirectionalActionMode,
): InputStateMachine {
  return {
    ...machine,
    mode,
    layer: machine.layer === 'ActionMenu' ? 'Gameplay' : machine.layer,
  }
}

export function pushDirectionalInput(
  machine: InputStateMachine,
  direction: Direction2D,
): DirectionalInputResult {
  const intent: DirectionalIntent = {
    mode: machine.mode,
    direction,
  }

  if (machine.layer === 'Gameplay') {
    return {
      immediate: intent,
    }
  }

  return {
    immediate: null,
  }
}
