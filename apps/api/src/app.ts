import { Hono } from 'hono'
import type { AppEnv } from './env'
import healthRoutes from './routes/health'

export function createApp() {
  const app = new Hono<AppEnv>()

  app.use('*', async (c, next) => {
    const { createDb } = await import('@oml-__SERVICE_NAME__/core/db/client')
    c.set('db', createDb({
      url: c.env.TURSO_DATABASE_URL,
      authToken: c.env.TURSO_AUTH_TOKEN,
    }))
    await next()
  })

  const routes = app
    .route('/api', healthRoutes)

  return routes
}

export type AppType = ReturnType<typeof createApp>
