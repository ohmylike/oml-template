import { beforeAll, describe, expect, it } from 'vitest'
import path from 'node:path'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { runBuiltCli } from '../test/run-built-cli'
import { createEmptyPostsDb, createTempDb, readPosts, setupPostsDb } from '../test/cli-fixtures'

const previewApiUrl = process.env.CLI_E2E_API_URL?.trim()
const previewServiceName = process.env.CLI_E2E_SERVICE_NAME?.trim() || '__SERVICE_NAME__'

beforeAll(async () => {
  await runBuiltCli(['--help'], { build: true })
})

describe('cli e2e', () => {

  it('prints root help from the built binary', async () => {
    const result = await runBuiltCli(['--help'])

    expect(result.stdout).toContain('schema')
    expect(result.stdout).toContain('export')
    expect(result.stdout).toContain('import')
  })

  it('round-trips a bundle through the built binary', async () => {
    const sourceDb = await createTempDb()
    await setupPostsDb(sourceDb.url)

    const bundleDir = await mkdtemp(path.join(tmpdir(), 'oml-__SERVICE_NAME__-e2e-bundle-'))
    const bundlePath = path.join(bundleDir, 'bundle.json')

    await runBuiltCli(['export', '--url', sourceDb.url, '--output', bundlePath])

    const bundle = JSON.parse(await readFile(bundlePath, 'utf8'))
    expect(bundle.data.posts).toHaveLength(1)

    const targetDb = await createTempDb()
    await createEmptyPostsDb(targetDb.url)

    const result = await runBuiltCli(['import', '--url', targetDb.url, '--input', bundlePath])
    const summary = JSON.parse(result.stdout)

    expect(summary).toMatchObject({
      command: 'import',
      tables: [{ name: 'posts', rowCount: 1 }],
    })
    await expect(readPosts(targetDb.url)).resolves.toMatchObject([
      { id: 'post-1', title: 'Hello', content: 'world' },
    ])
  })
})

describe.runIf(Boolean(previewApiUrl))('cli e2e against preview api', () => {
  it('prints the schema from the preview API', async () => {
    const result = await runBuiltCli(['schema', '--api-url', previewApiUrl!])
    const schema = JSON.parse(result.stdout)

    expect(schema).toMatchObject({
      formatVersion: 1,
      service: previewServiceName,
      source: 'code',
      tables: expect.arrayContaining([expect.objectContaining({ name: 'posts' })]),
    })
  })

  it('exports a bundle from the preview API', async () => {
    const bundleDir = await mkdtemp(path.join(tmpdir(), 'oml-__SERVICE_NAME__-preview-e2e-bundle-'))
    const bundlePath = path.join(bundleDir, 'bundle.json')

    const result = await runBuiltCli([
      'export',
      '--api-url',
      previewApiUrl!,
      '--output',
      bundlePath,
    ])

    expect(result.stdout).toBe('')

    const bundle = JSON.parse(await readFile(bundlePath, 'utf8'))
    expect(bundle).toMatchObject({
      formatVersion: 1,
      service: previewServiceName,
      exportedAt: expect.any(String),
      schema: {
        source: 'drizzle',
        tables: expect.any(Array),
      },
      data: expect.any(Object),
    })
  })
})
