import type { Position2D } from '../core/position'
import type { Component } from '../core/components'
import type { BehaviorPolicy } from './contracts'

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

export function resolveBehaviorPosition(input: {
  policy: BehaviorPolicy
  origin: Position2D
  time: number
}): Position2D {
  const { policy, origin, time } = input

  switch (policy.kind) {
    case 'Static':
      return origin
    case 'PatrolLoop': {
      if (policy.path.length === 0) {
        return origin
      }

      return policy.path[modulo(time, policy.path.length)]
    }
    case 'PatrolPingPong': {
      if (policy.path.length === 0) {
        return origin
      }

      if (policy.path.length === 1) {
        return policy.path[0]
      }

      const period = policy.path.length * 2 - 2
      const index = modulo(time, period)
      const mapped = index < policy.path.length ? index : period - index

      return policy.path[mapped]
    }
    case 'ScriptedTimeline': {
      if (policy.points.length === 0) {
        return origin
      }

      const exact = policy.points.find((point) => point.t === time)

      if (exact) {
        return { x: exact.x, y: exact.y }
      }

      const sorted = [...policy.points].sort((a, b) => a.t - b.t)
      let fallback = sorted[0]

      for (const point of sorted) {
        if (point.t <= time) {
          fallback = point
        } else {
          break
        }
      }

      return { x: fallback.x, y: fallback.y }
    }
  }
}

export function behaviorToPatrolComponent(policy: BehaviorPolicy): Extract<Component, { kind: 'Patrol' }> | null {
  switch (policy.kind) {
    case 'PatrolLoop':
      return { kind: 'Patrol', path: policy.path, loops: true }
    case 'PatrolPingPong':
      return { kind: 'Patrol', path: policy.path, loops: false }
    case 'Static':
    case 'ScriptedTimeline':
      return null
  }
}
