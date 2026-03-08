import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import type { AppEnv } from './env'
import { createAuthContextMiddleware, handleAuthRequest } from './lib/auth'
import { createApiCors } from './lib/cors'
import { createErrorResponse, getErrorResponseDetails } from './lib/errors'
import { createRequestLogger } from './lib/logging'
import { getRequestId } from './lib/request-context'
import cliRoutes from './routes/cli'
import healthRoutes from './routes/health'

export function createApp() {
  const app = new Hono<AppEnv>()

  app.use(
    '*',
    requestId({
      headerName: '',
      generator: (c) => c.req.header('cf-ray') ?? crypto.randomUUID(),
    }),
  )

  app.use('*', async (c, next) => {
    await next()
    c.header('X-Request-Id', getRequestId(c))
  })

  app.use('*', createRequestLogger())

  app.use('/api/*', createApiCors())

  app.use('/api/*', async (c, next) => {
    const { createDb } = await import('@oml-__SERVICE_NAME__/core/db/client')
    c.set('db', createDb({
      url: c.env.TURSO_DATABASE_URL,
      authToken: c.env.TURSO_AUTH_TOKEN,
    }))
    await next()
  })

  app.use('/api/*', createAuthContextMiddleware())

  app.on(['GET', 'POST'], '/api/auth/*', handleAuthRequest)

  app.route('/api', healthRoutes)
  app.route('/api/cli', cliRoutes)

  app.notFound((c) => {
    return createErrorResponse(c, 404, 'not_found', 'Route not found')
  })

  app.onError((error, c) => {
    const details = getErrorResponseDetails(error, c.env.ENVIRONMENT)
    return createErrorResponse(c, details.status, details.code, details.message)
  })

  return app
}

export type AppType = ReturnType<typeof createApp>
