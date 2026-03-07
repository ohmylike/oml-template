import type { Context, MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../env'
import { getCfRay, getRequestId } from './request-context'

interface RequestLog {
  event: 'request_finished' | 'request_error'
  service: string
  environment: string
  requestId: string
  cfRay: string | null
  method: string
  host: string
  path: string
  status: number
  outcome: 'success' | 'client_error' | 'server_error'
  durationMs: number
}

function getOutcome(status: number): RequestLog['outcome'] {
  if (status >= 500) {
    return 'server_error'
  }
  if (status >= 400) {
    return 'client_error'
  }
  return 'success'
}

function buildRequestLog(
  c: Context<AppEnv>,
  event: RequestLog['event'],
  status: number,
  durationMs: number,
): RequestLog {
  const url = new URL(c.req.url)

  return {
    event,
    service: c.env.SERVICE_NAME,
    environment: c.env.ENVIRONMENT,
    requestId: getRequestId(c),
    cfRay: getCfRay(c),
    method: c.req.method,
    host: c.req.header('host') ?? url.host,
    path: url.pathname,
    status,
    outcome: getOutcome(status),
    durationMs,
  }
}

function getErrorStatus(error: unknown): number {
  if (error instanceof HTTPException) {
    return error.status
  }
  return 500
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error'
}

export function createRequestLogger(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const start = Date.now()

    try {
      await next()
    } catch (error) {
      const status = getErrorStatus(error)
      const log = buildRequestLog(c, 'request_error', status, Date.now() - start)

      console.error({
        ...log,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: getErrorMessage(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      })

      throw error
    }

    if (c.error) {
      const log = buildRequestLog(c, 'request_error', c.res.status, Date.now() - start)

      console.error({
        ...log,
        errorName: c.error.name,
        errorMessage: c.error.message,
        errorStack: c.error.stack,
      })
      return
    }

    const log = buildRequestLog(c, 'request_finished', c.res.status, Date.now() - start)

    if (log.status >= 400) {
      console.warn(log)
      return
    }

    console.info(log)
  }
}
