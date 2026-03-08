import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CliRuntime } from '../../runtime'

vi.mock('../../api', () => ({
  requestApiExport: vi.fn(),
}))

vi.mock('../../db', () => ({
  exportDatabase: vi.fn(),
}))

vi.mock('../../db-connection', () => ({
  resolveDbConnection: vi.fn(),
}))

vi.mock('../../io', () => ({
  writeTextOutput: vi.fn(),
}))

import { requestApiExport } from '../../api'
import { exportCommand } from '../../commands/export'
import { exportDatabase } from '../../db'
import { resolveDbConnection } from '../../db-connection'
import { writeTextOutput } from '../../io'

const databaseRuntime: CliRuntime = {
  transport: 'database',
}

const apiRuntime: CliRuntime = {
  transport: 'api',
  apiBaseUrl: 'https://preview.api.ohmylike.app',
  apiClient: {} as never,
}

async function runExport(values: Record<string, unknown> = {}, runtime: CliRuntime = databaseRuntime) {
  return exportCommand.run({
    values,
    extensions: {
      cliRuntime: runtime,
    },
  } as Parameters<typeof exportCommand.run>[0])
}

describe('export command unit', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns the dry-run contract without invoking transports', async () => {
    const output = await runExport({
      dryRun: true,
      output: 'bundle.json',
    })

    expect(requestApiExport).not.toHaveBeenCalled()
    expect(exportDatabase).not.toHaveBeenCalled()
    expect(writeTextOutput).not.toHaveBeenCalled()
    expect(JSON.parse(output ?? '')).toEqual({
      command: 'export',
      dryRun: true,
      output: 'bundle.json',
      format: 'json',
      source: 'database',
      implemented: false,
      nextStep: 'Remove --dry-run after export execution is implemented.',
    })
  })

  it('writes the exported bundle to a file in database mode', async () => {
    const connection = {
      url: 'file:test.db',
      authToken: 'secret',
    }
    const bundle = {
      formatVersion: 1,
      service: 'oml-__SERVICE_NAME__',
      data: {
        posts: [{ id: 'post-1' }],
      },
    }

    vi.mocked(resolveDbConnection).mockReturnValue(connection)
    vi.mocked(exportDatabase).mockResolvedValue(bundle as never)
    vi.mocked(writeTextOutput).mockResolvedValue(true)

    const output = await runExport(
      {
        output: '/tmp/bundle.json',
        url: connection.url,
        authToken: connection.authToken,
      },
      databaseRuntime,
    )

    expect(resolveDbConnection).toHaveBeenCalledWith({
      output: '/tmp/bundle.json',
      url: connection.url,
      authToken: connection.authToken,
    })
    expect(exportDatabase).toHaveBeenCalledWith(connection)
    expect(writeTextOutput).toHaveBeenCalledWith(
      '/tmp/bundle.json',
      `${JSON.stringify(bundle, null, 2)}\n`,
    )
    expect(output).toBeUndefined()
  })

  it('returns the bundle JSON when no file output is requested', async () => {
    const connection = {
      url: 'file:test.db',
    }
    const bundle = {
      formatVersion: 1,
      service: 'oml-__SERVICE_NAME__',
      data: {
        posts: [{ id: 'post-1' }],
      },
    }

    vi.mocked(resolveDbConnection).mockReturnValue(connection)
    vi.mocked(exportDatabase).mockResolvedValue(bundle as never)
    vi.mocked(writeTextOutput).mockResolvedValue(false)

    const output = await runExport({
      url: connection.url,
    })

    expect(writeTextOutput).toHaveBeenCalledWith(undefined, `${JSON.stringify(bundle, null, 2)}\n`)
    expect(JSON.parse(output ?? '')).toEqual(bundle)
  })

  it('uses the API transport when api mode is active', async () => {
    const bundle = {
      formatVersion: 1,
      service: 'preview-service',
      data: {
        posts: [{ id: 'post-1' }],
      },
    }

    vi.mocked(requestApiExport).mockResolvedValue(bundle as never)
    vi.mocked(writeTextOutput).mockResolvedValue(false)

    const output = await runExport({}, apiRuntime)

    expect(requestApiExport).toHaveBeenCalledWith(apiRuntime.apiClient)
    expect(exportDatabase).not.toHaveBeenCalled()
    expect(JSON.parse(output ?? '')).toEqual(bundle)
  })

  it('surfaces export transport failures', async () => {
    vi.mocked(requestApiExport).mockRejectedValue(new Error('export failed'))

    await expect(runExport({}, apiRuntime)).rejects.toThrow('export failed')
  })
})
