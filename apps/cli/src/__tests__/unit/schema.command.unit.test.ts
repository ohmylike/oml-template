import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CliRuntime } from '../../runtime'

vi.mock('../../api', () => ({
  requestApiSchema: vi.fn(),
}))

vi.mock('../../db-connection', () => ({
  resolveDbConnection: vi.fn(),
}))

vi.mock('../../db-schema', () => ({
  describeDatabaseSchema: vi.fn(),
  describeSchema: vi.fn(),
}))

import { requestApiSchema } from '../../api'
import { schemaCommand } from '../../commands/schema'
import { resolveDbConnection } from '../../db-connection'
import { describeDatabaseSchema, describeSchema } from '../../db-schema'

const databaseRuntime: CliRuntime = {
  transport: 'database',
}

const apiRuntime: CliRuntime = {
  transport: 'api',
  apiBaseUrl: 'https://preview.api.ohmylike.app',
  apiClient: {} as never,
}

async function runSchema(values: Record<string, unknown> = {}, runtime: CliRuntime = databaseRuntime) {
  return schemaCommand.run({
    values,
    extensions: {
      cliRuntime: runtime,
    },
  } as Parameters<typeof schemaCommand.run>[0])
}

describe('schema command unit', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('serializes the code schema with default service metadata in database mode', async () => {
    vi.mocked(describeSchema).mockReturnValue({
      source: 'code',
      tables: [{ name: 'posts', columns: [] }],
    } as never)

    const output = await runSchema()

    expect(describeSchema).toHaveBeenCalledOnce()
    expect(describeDatabaseSchema).not.toHaveBeenCalled()
    expect(JSON.parse(output ?? '')).toEqual({
      formatVersion: 1,
      service: 'oml-__SERVICE_NAME__',
      source: 'code',
      tables: [{ name: 'posts', columns: [] }],
    })
  })

  it('describes the live database when source=database is selected', async () => {
    const connection = {
      url: 'file:test.db',
      authToken: 'secret',
    }

    vi.mocked(resolveDbConnection).mockReturnValue(connection)
    vi.mocked(describeDatabaseSchema).mockResolvedValue({
      formatVersion: 2,
      service: '__SERVICE_NAME__',
      source: 'database',
      tables: [{ name: 'drafts', columns: [] }],
    } as never)

    const output = await runSchema({
      source: 'database',
      url: connection.url,
      authToken: connection.authToken,
    })

    expect(resolveDbConnection).toHaveBeenCalledWith({
      source: 'database',
      url: connection.url,
      authToken: connection.authToken,
    })
    expect(describeDatabaseSchema).toHaveBeenCalledWith(connection)
    expect(JSON.parse(output ?? '')).toEqual({
      formatVersion: 2,
      service: '__SERVICE_NAME__',
      source: 'database',
      tables: [{ name: 'drafts', columns: [] }],
    })
  })

  it('uses the API transport when api mode is active', async () => {
    vi.mocked(requestApiSchema).mockResolvedValue({
      formatVersion: 7,
      service: 'preview-service',
      source: 'database',
      tables: [{ name: 'posts', columns: [] }],
    } as never)

    const output = await runSchema({ source: 'database' }, apiRuntime)

    expect(requestApiSchema).toHaveBeenCalledWith(apiRuntime.apiClient, 'database')
    expect(describeSchema).not.toHaveBeenCalled()
    expect(describeDatabaseSchema).not.toHaveBeenCalled()
    expect(JSON.parse(output ?? '')).toEqual({
      formatVersion: 7,
      service: 'preview-service',
      source: 'database',
      tables: [{ name: 'posts', columns: [] }],
    })
  })

  it('surfaces transport failures', async () => {
    vi.mocked(requestApiSchema).mockRejectedValue(new Error('schema fetch failed'))

    await expect(runSchema({}, apiRuntime)).rejects.toThrow('schema fetch failed')
  })
})
