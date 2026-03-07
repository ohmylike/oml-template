import { cli, define, type CliOptions } from 'gunshi'
import { exportCommand } from './commands/export'
import { importCommand } from './commands/import'
import { schemaCommand } from './commands/schema'

const CLI_NAME = 'oml-__SERVICE_NAME__'
const CLI_VERSION = '0.0.1'

const rootCommand = define({
  name: CLI_NAME,
  description: 'CLI-first workflows for schema inspection and data movement.',
})

const subCommands = {
  export: exportCommand,
  import: importCommand,
  schema: schemaCommand,
}

function createCliOptions(overrides: Partial<CliOptions> = {}): CliOptions {
  return {
    name: CLI_NAME,
    version: CLI_VERSION,
    usageSilent: true,
    subCommands,
    ...overrides,
  }
}

export async function runCli(
  args: string[],
  overrides: Partial<CliOptions> = {},
) {
  const normalizedArgs = args.length === 0 ? ['--help'] : args

  return cli(normalizedArgs, rootCommand, createCliOptions(overrides))
}

export async function executeCli(args = process.argv.slice(2)) {
  try {
    const output = await runCli(args)

    if (output) {
      console.log(output)
    }

    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unexpected error: ${String(error)}`

    console.error(`Error: ${message}`)
    return 1
  }
}
