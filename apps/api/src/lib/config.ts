import type { AppBindings } from '../env'

export type AuthMode = 'disabled' | 'better-auth'

export interface ResolvedAppConfig {
  authMode: AuthMode
  authEnabled: boolean
  betterAuthSecret?: string
  betterAuthUrl?: string
  corsAllowedOrigins: string[]
}

const DEFAULT_AUTH_CORS_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
}

function wildcardToRegExp(pattern: string): RegExp {
  return new RegExp(
    `^${escapeRegex(pattern).replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
  )
}

function getUrlOrigin(value: string): string | null {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getUrlHost(value: string): string | null {
  try {
    return new URL(value).host
  } catch {
    return null
  }
}

function parseOriginList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function resolveAppConfig(
  env: Pick<
    AppBindings,
    'AUTH_MODE' | 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL' | 'CORS_ALLOWED_ORIGINS'
  >,
): ResolvedAppConfig {
  const authMode = env.AUTH_MODE === 'better-auth' ? 'better-auth' : 'disabled'
  const configuredOrigins = parseOriginList(env.CORS_ALLOWED_ORIGINS)
  const corsAllowedOrigins = configuredOrigins.length > 0
    ? configuredOrigins
    : authMode === 'better-auth'
      ? DEFAULT_AUTH_CORS_ALLOWED_ORIGINS
      : ['*']

  if (authMode === 'better-auth' && corsAllowedOrigins.includes('*')) {
    throw new Error('CORS wildcard "*" is not allowed when AUTH_MODE=better-auth')
  }

  return {
    authMode,
    authEnabled: authMode === 'better-auth',
    betterAuthSecret: env.BETTER_AUTH_SECRET,
    betterAuthUrl: env.BETTER_AUTH_URL,
    corsAllowedOrigins,
  }
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes('*')) {
    return true
  }

  return allowedOrigins.some((pattern) => {
    if (pattern.includes('*') || pattern.includes('?')) {
      if (pattern.includes('://')) {
        const value = getUrlOrigin(origin)
        return value ? wildcardToRegExp(pattern).test(value) : false
      }

      const host = getUrlHost(origin)
      return host ? wildcardToRegExp(pattern).test(host) : false
    }

    return getUrlOrigin(origin) === pattern
  })
}
