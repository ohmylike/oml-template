import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { migrateDb } from './migrate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await migrateDb({
  url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
  migrationsFolder: path.resolve(__dirname, '../../drizzle'),
})
