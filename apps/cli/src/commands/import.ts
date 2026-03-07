import { define } from 'gunshi'
import { parseBundle } from '../bundle'
import { resolveDbConnection } from '../db-connection'
import { importDatabase, summarizeBundle } from '../db'
import { readTextInput } from '../io'
import { stringifyJson } from '../json'

export const importCommand = define({
  name: 'import',
  description: 'Import data from a JSON bundle',
  toKebab: true,
  args: {
    input: {
      type: 'string',
      short: 'i',
      description: 'Read the import bundle from this path. Use - for stdin.',
    },
    url: {
      type: 'string',
      description: 'Database URL. Defaults to TURSO_DATABASE_URL.',
    },
    authToken: {
      type: 'string',
      description: 'Database auth token. Defaults to TURSO_AUTH_TOKEN.',
    },
    dryRun: {
      type: 'boolean',
      short: 'd',
      description: 'Print the import plan without writing to the database.',
    },
  },
  run: async ({ values }) => {
    const bundleText = await readTextInput(values.input)

    if (values.dryRun) {
      const bundle = parseBundle(bundleText)

      return stringifyJson({
        command: 'import',
        dryRun: true,
        input: values.input ?? '-',
        format: 'json',
        destination: 'database',
        tables: summarizeBundle(bundle),
      })
    }

    const result = await importDatabase(bundleText, resolveDbConnection(values))

    return stringifyJson({
      command: 'import',
      dryRun: false,
      input: values.input ?? '-',
      service: result.bundle.service,
      tables: result.tables,
    })
  },
})
