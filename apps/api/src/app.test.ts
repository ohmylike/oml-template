import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app'
import type { AppBindings, AppEnv } from './env'
import { requireAuth } from './lib/auth'

const { createDbMock } = vi.hoisted(() => ({
  createDbMock: vi.fn(() => ({ mocked: true })),
}))

vi.mock('@oml-__SERVICE_NAME__/core/db/client', () => ({
  createDb: createDbMock,
}))

function createEnv(overrides: Partial<AppBindings> = {}): AppBindings {
  return {
    TURSO_DATABASE_URL: 'libsql://sandbox.test',
    TURSO_AUTH_TOKEN: 'test-token',
    ENVIRONMENT: 'development',
    SERVICE_NAME: '__SERVICE_NAME__',
    AUTH_MODE: 'disabled',
    BETTER_AUTH_SECRET: 'test-secret-0123456789abcdefghijklmnop',
    BETTER_AUTH_URL: 'https://api.sandbox.ohmylike.app',
    CACHE: {} as KVNamespace,
    UPLOADS: {} as R2Bucket,
    ...overrides,
  }
}

function createErrorRoutes() {
  const app = new Hono<AppEnv>()

  app.get('/boom', () => {
    throw new Error('boom')
  })

  app.get('/http-boom', () => {
    throw new HTTPException(401, { message: 'Denied' })
  })

  return app
}

function createProtectedRoutes() {
  const app = new Hono<AppEnv>()

  app.get('/protected', requireAuth(), (c) => {
    return c.json({
      userId: c.get('auth').userId,
      method: c.get('auth').method,
    })
  })

  return app
}

describe('createApp', () => {
  beforeEach(() => {
    createDbMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns health with an X-Request-Id header and structured request log', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const app = createApp()
    const res = await app.request('/api/health', undefined, createEnv())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
    expect(res.headers.get('X-Request-Id')).toBeTruthy()
    expect(createDbMock).toHaveBeenCalledTimes(1)
    expect(infoSpy).toHaveBeenCalledTimes(1)
    expect(infoSpy.mock.calls[0]?.[0]).toMatchObject({
      event: 'request_finished',
      service: '__SERVICE_NAME__',
      environment: 'development',
      method: 'GET',
      path: '/api/health',
      status: 200,
      outcome: 'success',
      requestId: res.headers.get('X-Request-Id'),
    })
  })

  it('allows wildcard CORS for auth-free services and skips DB setup on preflight', async () => {
    const app = createApp()
    const res = await app.request(
      '/api/health',
      {
        method: 'OPTIONS',
        headers: {
          origin: 'https://example.com',
          'access-control-request-method': 'GET',
        },
      },
      createEnv(),
    )

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-API-Key')
    expect(createDbMock).not.toHaveBeenCalled()
  })

  it('echoes trusted wildcard origins and enables credentials when better-auth is on', async () => {
    const app = createApp()
    const res = await app.request(
      '/api/health',
      {
        method: 'OPTIONS',
        headers: {
          origin: 'https://pr-42.sandbox.ohmylike.app',
          'access-control-request-method': 'GET',
        },
      },
      createEnv({
        AUTH_MODE: 'better-auth',
        CORS_ALLOWED_ORIGINS: 'https://*.sandbox.ohmylike.app',
      }),
    )

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://pr-42.sandbox.ohmylike.app')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(createDbMock).not.toHaveBeenCalled()
  })

  it('prefers Cloudflare Ray ID over client supplied X-Request-Id', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const app = createApp()
    const res = await app.request(
      '/api/health',
      {
        headers: {
          'cf-ray': 'ray-123',
          'x-request-id': 'client-ignored',
        },
      },
      createEnv(),
    )

    expect(res.headers.get('X-Request-Id')).toBe('ray-123')
    expect(infoSpy.mock.calls[0]?.[0]).toMatchObject({
      requestId: 'ray-123',
      cfRay: 'ray-123',
    })
  })

  it('returns a not found error envelope and skips DB setup for non-api routes', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('generated-request-id')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const app = createApp()
    const res = await app.request(
      '/missing',
      {
        headers: {
          'x-request-id': 'client-ignored',
        },
      },
      createEnv(),
    )

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      requestId: 'generated-request-id',
      error: {
        code: 'not_found',
        message: 'Route not found',
      },
    })
    expect(res.headers.get('X-Request-Id')).toBe('generated-request-id')
    expect(createDbMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toMatchObject({
      event: 'request_finished',
      path: '/missing',
      status: 404,
      outcome: 'client_error',
      requestId: 'generated-request-id',
    })
  })

  it('fails closed if a protected route is mounted while auth is disabled', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const app = createApp().route('/api', createProtectedRoutes())
    const res = await app.request('/api/protected', undefined, createEnv())

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      requestId: expect.any(String),
      error: {
        code: 'auth_not_enabled',
        message: 'Authentication is not enabled for this service',
      },
    })
    expect(warnSpy.mock.calls[0]?.[0]).toMatchObject({
      path: '/api/protected',
      status: 503,
      outcome: 'server_error',
    })
  })

  it('returns 401 for protected routes when better-auth is enabled but no credentials are provided', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const app = createApp().route('/api', createProtectedRoutes())
    const res = await app.request(
      '/api/protected',
      undefined,
      createEnv({
        AUTH_MODE: 'better-auth',
      }),
    )

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      requestId: expect.any(String),
      error: {
        code: 'auth_required',
        message: 'Authentication required',
      },
    })
    expect(warnSpy.mock.calls[0]?.[0]).toMatchObject({
      path: '/api/protected',
      status: 401,
      outcome: 'client_error',
    })
  })

  it('returns a development 500 envelope and emits a structured error log', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const app = createApp().route('/api', createErrorRoutes())
    const res = await app.request(
      '/api/boom',
      {
        headers: {
          'cf-ray': 'ray-error',
          authorization: 'Bearer secret',
        },
      },
      createEnv(),
    )

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      requestId: 'ray-error',
      error: {
        code: 'internal_error',
        message: 'boom',
      },
    })
    expect(res.headers.get('X-Request-Id')).toBe('ray-error')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0]?.[0]).toMatchObject({
      event: 'request_error',
      service: '__SERVICE_NAME__',
      environment: 'development',
      requestId: 'ray-error',
      cfRay: 'ray-error',
      method: 'GET',
      path: '/api/boom',
      status: 500,
      outcome: 'server_error',
      errorName: 'Error',
      errorMessage: 'boom',
    })
    expect(errorSpy.mock.calls[0]?.[0]).not.toHaveProperty('authorization')
    expect(errorSpy.mock.calls[0]?.[0]).not.toHaveProperty('body')
  })

  it('hides internal error messages in production', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const app = createApp().route('/api', createErrorRoutes())
    const res = await app.request(
      '/api/boom',
      {
        headers: {
          'cf-ray': 'ray-prod',
        },
      },
      createEnv({ ENVIRONMENT: 'production' }),
    )

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      requestId: 'ray-prod',
      error: {
        code: 'internal_error',
        message: 'Internal Server Error',
      },
    })
  })

  it('preserves HTTPException status and message in the shared error envelope', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const app = createApp().route('/api', createErrorRoutes())
    const res = await app.request(
      '/api/http-boom',
      {
        headers: {
          'cf-ray': 'ray-http',
        },
      },
      createEnv(),
    )

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      requestId: 'ray-http',
      error: {
        code: 'http_error',
        message: 'Denied',
      },
    })
    expect(errorSpy.mock.calls[0]?.[0]).toMatchObject({
      event: 'request_error',
      status: 401,
      outcome: 'client_error',
      requestId: 'ray-http',
    })
  })
})
