import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

export interface DbOptions {
  url: string
  authToken?: string
}

export function createDb(options: DbOptions) {
  const client = createClient({
    url: options.url,
    authToken: options.authToken,
  })
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>
