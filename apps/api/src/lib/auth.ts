import { apiKey } from '@better-auth/api-key'
import type { Db } from '@oml-__SERVICE_NAME__/core/db/client'
import * as dbSchema from '@oml-__SERVICE_NAME__/core/db/schema'
import type { Handler, MiddlewareHandler } from 'hono'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import type { AppBindings, AppEnv, RequestAuth } from '../env'
import { createErrorResponse } from './errors'
import { resolveAppConfig } from './config'

type AuthBindings = Pick<
  AppBindings,
  | 'AUTH_MODE'
  | 'BETTER_AUTH_SECRET'
  | 'BETTER_AUTH_URL'
  | 'CORS_ALLOWED_ORIGINS'
  | 'ENVIRONMENT'
  | 'SERVICE_NAME'
>

type BetterAuthInstance = ReturnType<typeof betterAuth>

interface BetterAuthSessionResult {
  user?: {
    id?: string
    email?: string | null
  } | null
  session?: {
    id?: string | null
  } | null
}

interface ApiKeyVerificationResult {
  valid: boolean
  key: {
    id?: string
    referenceId?: string
  } | null
}

function createAnonymousAuth(enabled: boolean): RequestAuth {
  return {
    enabled,
    isAuthenticated: false,
    method: null,
    userId: null,
    userEmail: null,
    sessionId: null,
    apiKeyId: null,
  }
}

function getRequestApiKey(headers: Headers): string | null {
  const value = headers.get('x-api-key') ?? headers.get('X-API-Key')
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

async function safeGetSession(
  auth: BetterAuthInstance,
  headers: Headers,
): Promise<BetterAuthSessionResult | null> {
  try {
    return await auth.api.getSession({ headers }) as BetterAuthSessionResult | null
  } catch {
    return null
  }
}

async function safeVerifyApiKey(
  auth: BetterAuthInstance,
  headers: Headers,
  key: string,
): Promise<ApiKeyVerificationResult | null> {
  try {
    return await auth.api.verifyApiKey({
      headers,
      body: { key },
    }) as ApiKeyVerificationResult | null
  } catch {
    return null
  }
}

export function createBetterAuthInstance(bindings: AuthBindings, db: Db): BetterAuthInstance | null {
  const config = resolveAppConfig(bindings)

  if (!config.authEnabled) {
    return null
  }

  if (!config.betterAuthSecret) {
    throw new Error('BETTER_AUTH_SECRET is required when AUTH_MODE=better-auth')
  }

  return betterAuth({
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    basePath: '/api/auth',
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: dbSchema,
    }),
    trustedOrigins: config.corsAllowedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      bearer(),
      apiKey({
        defaultPrefix: `${bindings.SERVICE_NAME}_`,
        enableSessionForAPIKeys: false,
      }),
    ],
  })
}

export async function authenticateRequest(
  auth: BetterAuthInstance,
  request: Request,
): Promise<RequestAuth> {
  if (request.headers.has('authorization')) {
    const session = await safeGetSession(auth, request.headers)

    if (session?.user?.id) {
      return {
        enabled: true,
        isAuthenticated: true,
        method: 'bearer',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        sessionId: session.session?.id ?? null,
        apiKeyId: null,
      }
    }
  }

  const rawApiKey = getRequestApiKey(request.headers)
  if (rawApiKey) {
    const verifiedApiKey = await safeVerifyApiKey(auth, request.headers, rawApiKey)

    if (verifiedApiKey?.valid && verifiedApiKey.key?.id && verifiedApiKey.key.referenceId) {
      return {
        enabled: true,
        isAuthenticated: true,
        method: 'api-key',
        userId: verifiedApiKey.key.referenceId,
        userEmail: null,
        sessionId: null,
        apiKeyId: verifiedApiKey.key.id,
      }
    }
  }

  return createAnonymousAuth(true)
}

export async function resolveRequestAuth(
  bindings: AuthBindings,
  db: Db,
  request: Request,
): Promise<RequestAuth> {
  const auth = createBetterAuthInstance(bindings, db)

  if (!auth) {
    return createAnonymousAuth(false)
  }

  return authenticateRequest(auth, request)
}

export function createAuthContextMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set('auth', await resolveRequestAuth(c.env, c.get('db'), c.req.raw))
    await next()
  }
}

export const handleAuthRequest: Handler<AppEnv> = async (c) => {
  const auth = createBetterAuthInstance(c.env, c.get('db'))

  if (!auth) {
    return createErrorResponse(c, 404, 'not_found', 'Route not found')
  }

  return auth.handler(c.req.raw)
}

export function requireAuth(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const auth = c.get('auth')

    if (!auth.enabled) {
      return createErrorResponse(
        c,
        503,
        'auth_not_enabled',
        'Authentication is not enabled for this service',
      )
    }

    if (!auth.isAuthenticated) {
      return createErrorResponse(c, 401, 'auth_required', 'Authentication required')
    }

    await next()
  }
}
