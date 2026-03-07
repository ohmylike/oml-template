import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate as drizzleMigrate } from 'drizzle-orm/libsql/migrator'
import type { DbOptions } from './client'

export async function migrateDb(options: DbOptions & { migrationsFolder: string }) {
  const client = createClient({
    url: options.url,
    authToken: options.authToken,
  })
  const db = drizzle(client)

  console.log('[migrate] running migrations...')
  await drizzleMigrate(db, {
    migrationsFolder: options.migrationsFolder,
  })

  client.close()
  console.log('[migrate] done')
}
