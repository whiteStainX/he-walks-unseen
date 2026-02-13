import { describe, expect, it } from 'vitest'

import { interactionRegistry } from './registry'
import type { InteractionAction } from './types'

describe('interaction registry', () => {
  it('registers handlers for every action kind', () => {
    const actionKinds: InteractionAction['kind'][] = ['Move', 'Wait', 'ApplyRift', 'Push', 'Pull']

    for (const kind of actionKinds) {
      expect(interactionRegistry[kind]).toBeDefined()
      expect(interactionRegistry[kind].kind).toBe(kind)
      expect(typeof interactionRegistry[kind].execute).toBe('function')
    }
  })
})
