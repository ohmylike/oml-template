import { mkdtemp, readFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { runCli } from '../../cli'
import {
  createEmptyPostsDb,
  createTempDb,
  readPosts,
  setupDivergedDb,
  setupPostsDb,
} from '../../../../../test/cli-fixtures'

describe('runCli integration', () => {
  it('shows schema, export, and import in root help', async () => {
    const output = await runCli(['--help'])

    expect(output).toContain('schema')
    expect(output).toContain('export')
    expect(output).toContain('import')
    expect(output).toContain('--api-url')
  })

  it('fails clearly when API mode is selected before API routes exist', async () => {
    await expect(runCli(['--api-url', 'https://preview.api.ohmylike.app', 'schema'])).rejects.toThrow(
      'API transport for `schema` is not implemented yet. Remove `--api-url` or unset `API_BASE_URL` to use direct database mode.',
    )
  })

  it('can introspect code and live database schemas separately', async () => {
    const db = await createTempDb()
    await setupDivergedDb(db.url)

    const codeOutput = await runCli(['schema'])
    const codeSchema = JSON.parse(codeOutput ?? '')
    const dbOutput = await runCli(['schema', '--source', 'database', '--url', db.url])
    const dbSchema = JSON.parse(dbOutput ?? '')

    expect(codeSchema).toMatchObject({
      source: 'code',
      tables: expect.arrayContaining([expect.objectContaining({ name: 'posts' })]),
    })
    expect(dbSchema).toMatchObject({
      source: 'database',
      tables: expect.arrayContaining([
        expect.objectContaining({ name: 'drafts' }),
        expect.objectContaining({
          name: 'posts',
          columns: expect.arrayContaining([expect.objectContaining({ name: 'published_at' })]),
        }),
      ]),
    })
  })

  it('writes export bundles to a file and imports them back', async () => {
    const sourceDb = await createTempDb()
    await setupPostsDb(sourceDb.url)

    const bundleDir = await mkdtemp(path.join(tmpdir(), 'oml-__SERVICE_NAME__-bundle-'))
    const bundlePath = path.join(bundleDir, 'bundle.json')

    const exportOutput = await runCli(['export', '--url', sourceDb.url, '--output', bundlePath])

    expect(exportOutput).toBeUndefined()

    const writtenBundle = JSON.parse(await readFile(bundlePath, 'utf8'))
    expect(writtenBundle.data.posts).toHaveLength(1)

    const targetDb = await createTempDb()
    await createEmptyPostsDb(targetDb.url)

    const importOutput = await runCli(['import', '--url', targetDb.url, '--input', bundlePath])
    const importSummary = JSON.parse(importOutput ?? '')

    expect(importSummary).toMatchObject({
      command: 'import',
      tables: [
        {
          name: 'posts',
          rowCount: 1,
        },
      ],
    })

    await expect(readPosts(targetDb.url)).resolves.toMatchObject([
      {
        id: 'post-1',
        title: 'Hello',
        content: 'world',
      },
    ])
  })
})
