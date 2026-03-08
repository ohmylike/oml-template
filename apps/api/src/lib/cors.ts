import type { MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from '../env'
import { isOriginAllowed, resolveAppConfig } from './config'

const ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-API-Key']
const ALLOW_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

export function createApiCors(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const config = resolveAppConfig(c.env)

    return cors({
      origin: (origin) => {
        if (!origin) {
          return undefined
        }

        if (!config.authEnabled && config.corsAllowedOrigins.includes('*')) {
          return '*'
        }

        return isOriginAllowed(origin, config.corsAllowedOrigins) ? origin : undefined
      },
      allowHeaders: ALLOW_HEADERS,
      allowMethods: ALLOW_METHODS,
      exposeHeaders: ['X-Request-Id'],
      credentials: config.authEnabled,
      maxAge: 86400,
    })(c, next)
  }
}
