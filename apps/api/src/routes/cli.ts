import {
  describeDatabaseSchema,
  describeSchema,
  exportDatabase,
  importDatabase,
} from '@oml-__SERVICE_NAME__/core'
import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../env'
import { createErrorResponse } from '../lib/errors'

const app = new Hono<AppEnv>()

function resolveDbConnection(c: Context<AppEnv>) {
  return {
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  }
}

function requireAuthIfEnabled(c: Context<AppEnv>) {
  const auth = c.get('auth')

  if (!auth.enabled || auth.isAuthenticated) {
    return
  }

  return createErrorResponse(c, 401, 'auth_required', 'Authentication required')
}

app.get('/schema', async (c) => {
  const authError = requireAuthIfEnabled(c)
  if (authError) {
    return authError
  }

  const source = c.req.query('source')
  if (source && source !== 'code' && source !== 'database') {
    return createErrorResponse(c, 400, 'invalid_request', 'Invalid `source`. Use `code` or `database`.')
  }

  const description =
    source === 'database'
      ? await describeDatabaseSchema(resolveDbConnection(c))
      : describeSchema()

  return c.json({
    formatVersion: 1,
    service: c.env.SERVICE_NAME,
    source: description.source,
    tables: description.tables,
  })
})

app.post('/export', async (c) => {
  const authError = requireAuthIfEnabled(c)
  if (authError) {
    return authError
  }

  const bundle = await exportDatabase({
    ...resolveDbConnection(c),
    serviceName: c.env.SERVICE_NAME,
  })

  return c.json(bundle)
})

app.post('/import', async (c) => {
  const authError = requireAuthIfEnabled(c)
  if (authError) {
    return authError
  }

  const bundleText = await c.req.text()
  if (!bundleText.trim()) {
    return createErrorResponse(c, 400, 'invalid_request', 'Request body must contain a JSON bundle.')
  }

  const result = await importDatabase(bundleText, resolveDbConnection(c))

  return c.json({
    service: result.bundle.service,
    tables: result.tables,
  })
})

export default app
