import { mkdtemp } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { createClient } from '@libsql/client'

const POSTS_TABLE_SQL = `
  create table posts (
    id text primary key,
    title text not null,
    content text not null,
    created_at text not null,
    updated_at text not null
  )
`

export async function createTempDb() {
  const dir = await mkdtemp(path.join(tmpdir(), 'oml-__SERVICE_NAME__-cli-'))
  return {
    dir,
    url: `file:${path.join(dir, 'local.db')}`,
  }
}

export async function setupPostsDb(url: string) {
  const client = createClient({ url })

  await client.execute(POSTS_TABLE_SQL)
  await client.batch([
    [
      `insert into posts (id, title, content, created_at, updated_at)
       values (?, ?, ?, ?, ?)`,
      ['post-1', 'Hello', 'world', '2026-03-08T00:00:00.000Z', '2026-03-08T00:00:00.000Z'],
    ],
  ])

  client.close()
}

export async function createEmptyPostsDb(url: string) {
  const client = createClient({ url })
  await client.execute(POSTS_TABLE_SQL)
  client.close()
}

export async function setupDivergedDb(url: string) {
  const client = createClient({ url })

  await client.execute(`
    create table posts (
      id text primary key,
      title text not null,
      content text not null,
      published_at text,
      created_at text not null,
      updated_at text not null
    )
  `)
  await client.execute(`
    create table drafts (
      id text primary key,
      title text not null
    )
  `)

  client.close()
}

export async function readPosts(url: string) {
  const client = createClient({ url })
  const result = await client.execute('select * from posts order by id')
  client.close()
  return result.rows
}
