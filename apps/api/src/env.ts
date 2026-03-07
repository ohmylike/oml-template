import type { Db } from '@oml-__SERVICE_NAME__/core/db/client'

export interface AppBindings {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  ENVIRONMENT: string
  SERVICE_NAME: string
  CACHE: KVNamespace
  UPLOADS: R2Bucket
}

export interface AppVariables {
  db: Db
}

export interface AppEnv {
  Bindings: AppBindings
  Variables: AppVariables
}
