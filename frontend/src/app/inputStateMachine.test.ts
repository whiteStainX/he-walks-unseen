import { describe, expect, it } from 'vitest'

import {
  closeTopLayer,
  createInputStateMachine,
  flushDirectionalInput,
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
    expect(result.next.queuedDirectional).toBeNull()
  })

  it('does not buffer directional intent in non-gameplay layers', () => {
    const machine = toggleActionMenu(createInputStateMachine())
    const result = pushDirectionalInput(machine, 'north')

    expect(result.immediate).toBeNull()
    expect(result.next.queuedDirectional).toBeNull()
  })

  it('flush keeps no-op behavior when no directional intent is queued', () => {
    const machine = closeTopLayer(toggleActionMenu(createInputStateMachine()))
    const flushed = flushDirectionalInput(machine)

    expect(flushed.immediate).toBeNull()
    expect(flushed.next.queuedDirectional).toBeNull()
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

    const closed = toggleStateOverlay(opened)
    expect(closed.layer).toBe('Gameplay')
  })
})
