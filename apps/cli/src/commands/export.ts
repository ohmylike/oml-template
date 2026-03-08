import { requestApiExport } from '../api'
import { resolveDbConnection } from '../db-connection'
import { exportDatabase } from '../db'
import { writeTextOutput } from '../io'
import { stringifyJson } from '../json'
import { assertDatabaseTransport, defineCliCommand } from '../runtime'

export const exportCommand = defineCliCommand({
  name: 'export',
  description: 'Export data as a JSON bundle',
  toKebab: true,
  args: {
    output: {
      type: 'string',
      short: 'o',
      description: 'Write the export bundle to this path. Use - for stdout.',
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
      description: 'Print the export plan without touching the database.',
    },
  },
  run: async ({ values, extensions }) => {
    if (values.dryRun) {
      return stringifyJson({
        command: 'export',
        dryRun: true,
        output: values.output ?? '-',
        format: 'json',
        source: 'database',
        implemented: false,
        nextStep: 'Remove --dry-run after export execution is implemented.',
      })
    }

    const bundle =
      extensions.cliRuntime.transport === 'api'
        ? await requestApiExport(extensions.cliRuntime.apiClient)
        : await exportDatabase(resolveDbConnection(values))

    if (await writeTextOutput(values.output, stringifyJson(bundle))) {
      return
    }

    return stringifyJson(bundle)
  },
})
