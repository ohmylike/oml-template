import { defineConfig } from 'drizzle-kit'

const env = process.env.OML_ENV ?? 'local'
const isLocal = env === 'local'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: isLocal
      ? (process.env.TURSO_DATABASE_URL ?? 'file:local.db')
      : process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
