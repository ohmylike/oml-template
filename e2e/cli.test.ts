import { beforeAll, describe, expect, it } from 'vitest'
import path from 'node:path'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { runBuiltCli } from '../test/run-built-cli'
import { createEmptyPostsDb, createTempDb, readPosts, setupPostsDb } from '../test/cli-fixtures'

describe('cli e2e', () => {
  beforeAll(async () => {
    await runBuiltCli(['--help'], { build: true })
  })

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
