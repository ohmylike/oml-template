import { createDb } from '@oml-__SERVICE_NAME__/core/db/client'
import { createBetterAuthInstance } from './src/lib/auth'

const auth = createBetterAuthInstance(
  {
    SERVICE_NAME: process.env.SERVICE_NAME ?? '__SERVICE_NAME__',
    ENVIRONMENT: process.env.ENVIRONMENT ?? 'development',
    AUTH_MODE: 'better-auth',
    BETTER_AUTH_SECRET:
      process.env.BETTER_AUTH_SECRET ?? 'dev-secret-0123456789abcdef0123456789',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:8787',
    CORS_ALLOWED_ORIGINS:
      process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173',
  },
  createDb({
    url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
)

if (!auth) {
  throw new Error('better-auth config could not be created')
}

export default auth
