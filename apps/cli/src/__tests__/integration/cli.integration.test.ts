import { mkdtemp, readFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCli } from '../../cli'
import {
  createEmptyPostsDb,
  createTempDb,
  readPosts,
  setupDivergedDb,
  setupPostsDb,
} from '../../../../../test/cli-fixtures'

describe('runCli integration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows schema, export, and import in root help', async () => {
    const output = await runCli(['--help'])

    expect(output).toContain('schema')
    expect(output).toContain('export')
    expect(output).toContain('import')
    expect(output).toContain('--api-url')
  })

  it('calls the preview API when API mode is selected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          formatVersion: 1,
          service: 'oml-__SERVICE_NAME__',
          source: 'code',
          tables: [{ name: 'posts', columns: [] }],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const output = await runCli(['--api-url', 'https://preview.api.ohmylike.app', 'schema'])

    expect(fetchMock).toHaveBeenCalledWith(
      'https://preview.api.ohmylike.app/api/cli/schema?',
      expect.objectContaining({
        method: 'GET',
      }),
    )
    expect(JSON.parse(output ?? '')).toEqual({
      formatVersion: 1,
      service: 'oml-__SERVICE_NAME__',
      source: 'code',
      tables: [{ name: 'posts', columns: [] }],
    })
  })

  it('surfaces API error envelopes through the CLI', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          requestId: 'req_123',
          error: {
            code: 'auth_required',
            message: 'Authentication required',
          },
        }),
        {
          status: 401,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(runCli(['schema', '--api-url', 'https://preview.api.ohmylike.app'])).rejects.toThrow(
      'Authentication required',
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
