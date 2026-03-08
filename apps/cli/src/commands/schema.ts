import { resolveDbConnection } from '../db-connection'
import { describeDatabaseSchema, describeSchema } from '../db-schema'
import { stringifyJson } from '../json'
import { assertDatabaseTransport, defineCliCommand } from '../runtime'

const SERVICE_NAME = 'oml-__SERVICE_NAME__'

export const schemaCommand = defineCliCommand({
  name: 'schema',
  description: 'Print the current schema as JSON',
  toKebab: true,
  args: {
    source: {
      type: 'enum',
      choices: ['code', 'database'],
      description: 'Choose whether to inspect the code schema or the live database schema.',
    },
    url: {
      type: 'string',
      description: 'Database URL. Required when `--source database` is used.',
    },
    authToken: {
      type: 'string',
      description: 'Database auth token. Defaults to TURSO_AUTH_TOKEN.',
    },
  },
  run: async ({ values, extensions }) => {
    assertDatabaseTransport('schema', extensions.cliRuntime)

    const description =
      values.source === 'database'
        ? await describeDatabaseSchema(resolveDbConnection(values))
        : describeSchema()

    return stringifyJson({
      formatVersion: 1,
      service: SERVICE_NAME,
      source: description.source,
      tables: description.tables,
    })
  },
})
