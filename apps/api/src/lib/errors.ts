import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../env'
import { getRequestId } from './request-context'

const INTERNAL_ERROR_MESSAGE = 'Internal Server Error'

export interface ErrorResponseBody {
  requestId: string
  error: {
    code: string
    message: string
  }
}

export interface ErrorResponseDetails {
  status: number
  code: string
  message: string
}

export function createErrorResponse(
  c: Context<AppEnv>,
  status: number,
  code: string,
  message: string,
) {
  const body: ErrorResponseBody = {
    requestId: getRequestId(c),
    error: { code, message },
  }

  const response = c.json(body, status)
  response.headers.set('X-Request-Id', body.requestId)
  return response
}

export function getErrorResponseDetails(
  error: unknown,
  environment: string,
): ErrorResponseDetails {
  if (error instanceof HTTPException) {
    return {
      status: error.status,
      code: 'http_error',
      message: error.message || error.getResponse().statusText || 'HTTP Error',
    }
  }

  if (error instanceof Error) {
    return {
      status: 500,
      code: 'internal_error',
      message: environment === 'production'
        ? INTERNAL_ERROR_MESSAGE
        : error.message || INTERNAL_ERROR_MESSAGE,
    }
  }

  return {
    status: 500,
    code: 'internal_error',
    message: INTERNAL_ERROR_MESSAGE,
  }
}
