import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app'
import type { AppBindings } from '../env'
import {
  createEmptyPostsDb,
  createTempDb,
  readPosts,
  setupDivergedDb,
  setupPostsDb,
} from '../../../../test/cli-fixtures'

function createEnv(overrides: Partial<AppBindings> = {}): AppBindings {
  return {
    TURSO_DATABASE_URL: 'file:local.db',
    TURSO_AUTH_TOKEN: 'test-token',
    ENVIRONMENT: 'development',
    SERVICE_NAME: '__SERVICE_NAME__',
    AUTH_MODE: 'disabled',
    BETTER_AUTH_SECRET: 'test-secret-0123456789abcdefghijklmnop',
    BETTER_AUTH_URL: 'https://api.sandbox.ohmylike.app',
    CACHE: {} as KVNamespace,
    UPLOADS: {} as R2Bucket,
    ...overrides,
  }
}

describe('CLI routes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns code schema from /api/cli/schema', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const app = createApp()
    const res = await app.request('/api/cli/schema', undefined, createEnv())

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      formatVersion: 1,
      service: '__SERVICE_NAME__',
      source: 'code',
      tables: expect.arrayContaining([expect.objectContaining({ name: 'posts' })]),
    })
  })

  it('returns live database schema from /api/cli/schema?source=database', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const db = await createTempDb()
    await setupDivergedDb(db.url)

    const app = createApp()
    const res = await app.request('/api/cli/schema?source=database', undefined, createEnv({
      TURSO_DATABASE_URL: db.url,
    }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      source: 'database',
      tables: expect.arrayContaining([
        expect.objectContaining({ name: 'drafts' }),
        expect.objectContaining({ name: 'posts' }),
      ]),
    })
  })

  it('exports managed tables as a JSON bundle', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const db = await createTempDb()
    await setupPostsDb(db.url)

    const app = createApp()
    const res = await app.request('/api/cli/export', { method: 'POST' }, createEnv({
      TURSO_DATABASE_URL: db.url,
    }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      formatVersion: 1,
      service: '__SERVICE_NAME__',
      data: {
        posts: [expect.objectContaining({ id: 'post-1', title: 'Hello' })],
      },
    })
  })

  it('imports a bundle into the configured database', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const targetDb = await createTempDb()
    await createEmptyPostsDb(targetDb.url)

    const app = createApp()
    const res = await app.request(
      '/api/cli/import',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          formatVersion: 1,
          service: '__SERVICE_NAME__',
          exportedAt: '2026-03-08T00:00:00.000Z',
          schema: {
            source: 'drizzle',
            tables: [],
          },
          data: {
            posts: [
              {
                id: 'post-1',
                title: 'Hello',
                content: 'world',
                created_at: '2026-03-08T00:00:00.000Z',
                updated_at: '2026-03-08T00:00:00.000Z',
              },
            ],
          },
        }),
      },
      createEnv({
        TURSO_DATABASE_URL: targetDb.url,
      }),
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      service: '__SERVICE_NAME__',
      tables: [{ name: 'posts', rowCount: 1 }],
    })
    await expect(readPosts(targetDb.url)).resolves.toMatchObject([
      { id: 'post-1', title: 'Hello', content: 'world' },
    ])
  })

  it('requires authentication only when auth is enabled', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const app = createApp()
    const res = await app.request(
      '/api/cli/export',
      { method: 'POST' },
      createEnv({
        AUTH_MODE: 'better-auth',
      }),
    )

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      requestId: expect.any(String),
      error: {
        code: 'auth_required',
        message: 'Authentication required',
      },
    })
  })
})
