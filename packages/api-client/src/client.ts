import { hc } from 'hono/client'
import type { AppType } from '@oml-__SERVICE_NAME__/api'

export interface CreateApiClientOptions {
  baseUrl?: string
  customFetch?: typeof fetch
  headers?: Record<string, string>
}

export function createApiClient(options: CreateApiClientOptions = {}) {
  return hc<AppType>(options.baseUrl ?? '', {
    ...(options.customFetch ? { fetch: options.customFetch } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
  })
}

export type ApiClient = ReturnType<typeof createApiClient>
