import type { Db } from '@oml-__SERVICE_NAME__/core/db/client'

export type AuthMethod = 'bearer' | 'api-key' | null

export interface RequestAuth {
  enabled: boolean
  isAuthenticated: boolean
  method: AuthMethod
  userId: string | null
  userEmail: string | null
  sessionId: string | null
  apiKeyId: string | null
}

export interface AppBindings {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  ENVIRONMENT: string
  SERVICE_NAME: string
  AUTH_MODE?: string
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  CORS_ALLOWED_ORIGINS?: string
  CACHE: KVNamespace
  UPLOADS: R2Bucket
}

export interface AppVariables {
  db: Db
  requestId: string
  auth: RequestAuth
}

export interface AppEnv {
  Bindings: AppBindings
  Variables: AppVariables
}
