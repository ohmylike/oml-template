import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createDb } from './client'
import { migrateDb } from './migrate'
import { posts } from './schema'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.resolve(__dirname, '../../drizzle')
const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function createTempDbUrl() {
  const dir = await mkdtemp(path.join(tmpdir(), 'oml-core-db-'))
  tempDirs.push(dir)
  return `file:${path.join(dir, 'local.db')}`
}

describe('migrateDb', () => {
  it('applies migrations and supports CRUD operations', async () => {
    const url = await createTempDbUrl()

    await migrateDb({
      url,
      migrationsFolder,
    })

    const db = createDb({ url })

    try {
      const createdAt = '2026-03-08T00:00:00.000Z'
      const updatedAt = '2026-03-08T01:00:00.000Z'

      await db.insert(posts).values({
        id: 'post-1',
        title: 'Hello',
        content: 'world',
        createdAt,
        updatedAt: createdAt,
      })

      const inserted = await db.select().from(posts).where(eq(posts.id, 'post-1'))
      expect(inserted).toMatchObject([
        {
          id: 'post-1',
          title: 'Hello',
          content: 'world',
          createdAt,
          updatedAt: createdAt,
        },
      ])

      await db
        .update(posts)
        .set({
          title: 'Updated',
          updatedAt,
        })
        .where(eq(posts.id, 'post-1'))

      const updated = await db.select().from(posts).where(eq(posts.id, 'post-1'))
      expect(updated).toMatchObject([
        {
          id: 'post-1',
          title: 'Updated',
          content: 'world',
          createdAt,
          updatedAt,
        },
      ])

      await db.delete(posts).where(eq(posts.id, 'post-1'))

      const remaining = await db.select().from(posts)
      expect(remaining).toHaveLength(0)
    } finally {
      db.$client.close()
    }
  })
})
