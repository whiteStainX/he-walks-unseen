import { describe, expect, it } from 'vitest'

import {
  closeTopLayer,
  createInputStateMachine,
  pushDirectionalInput,
  selectDirectionalMode,
  toggleActionMenu,
  toggleLogOverlay,
  toggleStateOverlay,
  toggleSystemMenu,
} from './inputStateMachine'

describe('inputStateMachine', () => {
  it('dispatches direction immediately in gameplay layer', () => {
    const machine = createInputStateMachine()
    const result = pushDirectionalInput(machine, 'east')

    expect(result.immediate).toEqual({ mode: 'Move', direction: 'east' })
  })

  it('ignores directional dispatch in non-gameplay layers', () => {
    const machine = toggleActionMenu(createInputStateMachine())
    const result = pushDirectionalInput(machine, 'north')

    expect(result.immediate).toBeNull()
  })

  it('respects layer priority for system menu', () => {
    const machine = toggleSystemMenu(createInputStateMachine())
    const actionAttempt = toggleActionMenu(machine)
    const logAttempt = toggleLogOverlay(machine)
    const stateAttempt = toggleStateOverlay(machine)

    expect(actionAttempt.layer).toBe('SystemMenu')
    expect(logAttempt.layer).toBe('SystemMenu')
    expect(stateAttempt.layer).toBe('SystemMenu')
  })

  it('selecting mode from action menu returns to gameplay', () => {
    const machine = toggleActionMenu(createInputStateMachine())
    const selected = selectDirectionalMode(machine, 'Push')

    expect(selected.mode).toBe('Push')
    expect(selected.layer).toBe('Gameplay')
  })

  it('toggles state overlay from gameplay and back', () => {
    const opened = toggleStateOverlay(createInputStateMachine())
    expect(opened.layer).toBe('StateOverlay')

    const closed = closeTopLayer(opened)
    expect(closed.layer).toBe('Gameplay')
  })
})
