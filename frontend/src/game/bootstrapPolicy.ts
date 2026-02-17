export interface BootstrapPolicy {
  allowDevFallbackLevel: boolean
}

interface EnvLike {
  DEV?: boolean
  VITE_ENABLE_DEV_FALLBACK_LEVEL?: string
}

/**
 * Dev fallback level is opt-in.
 * It is only enabled when running in dev mode and explicitly toggled on.
 */
export function resolveBootstrapPolicy(env: EnvLike): BootstrapPolicy {
  return {
    allowDevFallbackLevel:
      Boolean(env.DEV) && env.VITE_ENABLE_DEV_FALLBACK_LEVEL === 'true',
  }
}

