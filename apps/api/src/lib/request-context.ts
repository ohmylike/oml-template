import type { Context } from 'hono'
import type { AppEnv } from '../env'

export function getCfRay(c: Pick<Context<AppEnv>, 'req'>): string | null {
  return c.req.header('cf-ray') ?? null
}

export function getRequestId(c: Pick<Context<AppEnv>, 'get' | 'req'>): string {
  return c.get('requestId') ?? getCfRay(c) ?? crypto.randomUUID()
}
