export interface SeededRng {
  nextFloat(): number
  nextInt(minInclusive: number, maxInclusive: number): number
  pick<T>(values: T[]): T
}

function normalizeSeed(seed: string | number): string {
  return String(seed)
}

export function hashSeed(seed: string | number): number {
  const text = normalizeSeed(seed)
  let hash = 2166136261

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeededRng(seed: string | number): SeededRng {
  const rand = mulberry32(hashSeed(seed))

  return {
    nextFloat(): number {
      return rand()
    },
    nextInt(minInclusive: number, maxInclusive: number): number {
      if (maxInclusive < minInclusive) {
        return minInclusive
      }

      const span = maxInclusive - minInclusive + 1
      return minInclusive + Math.floor(rand() * span)
    },
    pick<T>(values: T[]): T {
      if (values.length === 0) {
        throw new Error('Cannot pick from empty list')
      }

      const index = Math.floor(rand() * values.length)
      return values[index]
    },
  }
}
