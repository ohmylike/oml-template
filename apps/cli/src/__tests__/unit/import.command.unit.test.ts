import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CliRuntime } from '../../runtime'

vi.mock('../../api', () => ({
  requestApiImport: vi.fn(),
}))

vi.mock('../../bundle', () => ({
  parseBundle: vi.fn(),
}))

vi.mock('../../db', () => ({
  importDatabase: vi.fn(),
  summarizeBundle: vi.fn(),
}))

vi.mock('../../db-connection', () => ({
  resolveDbConnection: vi.fn(),
}))

vi.mock('../../io', () => ({
  readTextInput: vi.fn(),
}))

import { requestApiImport } from '../../api'
import { parseBundle } from '../../bundle'
import { importCommand } from '../../commands/import'
import { importDatabase, summarizeBundle } from '../../db'
import { resolveDbConnection } from '../../db-connection'
import { readTextInput } from '../../io'

const databaseRuntime: CliRuntime = {
  transport: 'database',
}

const apiRuntime: CliRuntime = {
  transport: 'api',
  apiBaseUrl: 'https://preview.api.ohmylike.app',
  apiClient: {} as never,
}

async function runImport(values: Record<string, unknown> = {}, runtime: CliRuntime = databaseRuntime) {
  return importCommand.run({
    values,
    extensions: {
      cliRuntime: runtime,
    },
  } as Parameters<typeof importCommand.run>[0])
}

describe('import command unit', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns the dry-run import summary contract', async () => {
    const bundle = {
      service: 'oml-__SERVICE_NAME__',
      data: {
        posts: [{ id: 'post-1' }],
      },
    }
    const tables = [{ name: 'posts', rowCount: 1 }]

    vi.mocked(readTextInput).mockResolvedValue('{ "formatVersion": 1 }')
    vi.mocked(parseBundle).mockReturnValue(bundle as never)
    vi.mocked(summarizeBundle).mockReturnValue(tables as never)

    const output = await runImport({
      dryRun: true,
      input: 'bundle.json',
    })

    expect(parseBundle).toHaveBeenCalledWith('{ "formatVersion": 1 }')
    expect(summarizeBundle).toHaveBeenCalledWith(bundle)
    expect(importDatabase).not.toHaveBeenCalled()
    expect(requestApiImport).not.toHaveBeenCalled()
    expect(JSON.parse(output ?? '')).toEqual({
      command: 'import',
      dryRun: true,
      input: 'bundle.json',
      format: 'json',
      destination: 'database',
      tables,
    })
  })

  it('imports into the database transport and reports the bundle service', async () => {
    const connection = {
      url: 'file:test.db',
      authToken: 'secret',
    }
    const result = {
      bundle: {
        service: '__SERVICE_NAME__',
      },
      tables: [{ name: 'posts', rowCount: 1 }],
    }

    vi.mocked(readTextInput).mockResolvedValue('{"formatVersion":1}')
    vi.mocked(resolveDbConnection).mockReturnValue(connection)
    vi.mocked(importDatabase).mockResolvedValue(result as never)

    const output = await runImport({
      input: 'bundle.json',
      url: connection.url,
      authToken: connection.authToken,
    })

    expect(readTextInput).toHaveBeenCalledWith('bundle.json')
    expect(resolveDbConnection).toHaveBeenCalledWith({
      input: 'bundle.json',
      url: connection.url,
      authToken: connection.authToken,
    })
    expect(importDatabase).toHaveBeenCalledWith('{"formatVersion":1}', connection)
    expect(JSON.parse(output ?? '')).toEqual({
      command: 'import',
      dryRun: false,
      input: 'bundle.json',
      service: '__SERVICE_NAME__',
      tables: [{ name: 'posts', rowCount: 1 }],
    })
  })

  it('imports through the API transport when api mode is active', async () => {
    vi.mocked(readTextInput).mockResolvedValue('{"formatVersion":1}')
    vi.mocked(requestApiImport).mockResolvedValue({
      service: 'preview-service',
      tables: [{ name: 'posts', rowCount: 2 }],
    } as never)

    const output = await runImport(
      {
        input: 'bundle.json',
      },
      apiRuntime,
    )

    expect(requestApiImport).toHaveBeenCalledWith(apiRuntime.apiClient, '{"formatVersion":1}')
    expect(importDatabase).not.toHaveBeenCalled()
    expect(JSON.parse(output ?? '')).toEqual({
      command: 'import',
      dryRun: false,
      input: 'bundle.json',
      service: 'preview-service',
      tables: [{ name: 'posts', rowCount: 2 }],
    })
  })

  it('surfaces input read failures', async () => {
    vi.mocked(readTextInput).mockRejectedValue(new Error('input missing'))

    await expect(runImport({ input: 'bundle.json' })).rejects.toThrow('input missing')
  })
})
