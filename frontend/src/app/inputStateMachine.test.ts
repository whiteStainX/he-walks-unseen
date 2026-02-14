import { describe, expect, it } from 'vitest'

import {
  closeTopLayer,
  createInputStateMachine,
  flushDirectionalInput,
  pushDirectionalInput,
  selectDirectionalMode,
  toggleActionMenu,
  toggleLogOverlay,
  toggleSystemMenu,
} from './inputStateMachine'

describe('inputStateMachine', () => {
  it('dispatches direction immediately in gameplay layer', () => {
    const machine = createInputStateMachine()
    const result = pushDirectionalInput(machine, 'east')

    expect(result.immediate).toEqual({ mode: 'Move', direction: 'east' })
    expect(result.next.queuedDirectional).toBeNull()
  })

  it('buffers one directional intent in non-gameplay layers', () => {
    const machine = toggleActionMenu(createInputStateMachine())
    const first = pushDirectionalInput(machine, 'north')
    const second = pushDirectionalInput(first.next, 'west')

    expect(first.immediate).toBeNull()
    expect(first.next.queuedDirectional).toEqual({ mode: 'Move', direction: 'north' })
    expect(second.immediate).toBeNull()
    expect(second.next.queuedDirectional).toEqual({ mode: 'Move', direction: 'north' })
  })

  it('flushes buffered intent when returning to gameplay', () => {
    const machine = toggleActionMenu(createInputStateMachine())
    const queued = pushDirectionalInput(machine, 'south').next
    const resumed = closeTopLayer(queued)
    const flushed = flushDirectionalInput(resumed)

    expect(flushed.immediate).toEqual({ mode: 'Move', direction: 'south' })
    expect(flushed.next.queuedDirectional).toBeNull()
  })

  it('respects layer priority for system menu', () => {
    const machine = toggleSystemMenu(createInputStateMachine())
    const actionAttempt = toggleActionMenu(machine)
    const logAttempt = toggleLogOverlay(machine)

    expect(actionAttempt.layer).toBe('SystemMenu')
    expect(logAttempt.layer).toBe('SystemMenu')
  })

  it('selecting mode from action menu returns to gameplay', () => {
    const machine = toggleActionMenu(createInputStateMachine())
    const selected = selectDirectionalMode(machine, 'Push')

    expect(selected.mode).toBe('Push')
    expect(selected.layer).toBe('Gameplay')
  })
})
