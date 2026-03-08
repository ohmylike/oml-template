import { cli, type CliOptions } from 'gunshi'
import { exportCommand } from './commands/export'
import { importCommand } from './commands/import'
import { schemaCommand } from './commands/schema'
import { cliPlugins, defineCliCommand, type CliGunshiParams } from './runtime'

const CLI_NAME = 'oml-__SERVICE_NAME__'
const CLI_VERSION = '0.0.1'

const rootCommand = defineCliCommand({
  name: CLI_NAME,
  description: 'CLI-first workflows for schema inspection and data movement.',
  toKebab: true,
})

const subCommands = {
  export: exportCommand,
  import: importCommand,
  schema: schemaCommand,
}

function isApiUrlOption(arg: string) {
  return arg === '--api-url' || arg === '--apiUrl' || arg.startsWith('--api-url=') || arg.startsWith('--apiUrl=')
}

function normalizeCliArgs(args: string[]) {
  const normalizedArgs = args.length === 0 ? ['--help'] : [...args]
  const restDelimiterIndex = normalizedArgs.indexOf('--')
  const scanLimit = restDelimiterIndex === -1 ? normalizedArgs.length : restDelimiterIndex
  const apiUrlTokens: string[] = []
  const remainingTokens: string[] = []

  for (let index = 0; index < scanLimit; index += 1) {
    const arg = normalizedArgs[index]

    if (!isApiUrlOption(arg)) {
      remainingTokens.push(arg)
      continue
    }

    apiUrlTokens.push(arg)
    if ((arg === '--api-url' || arg === '--apiUrl') && index + 1 < scanLimit) {
      apiUrlTokens.push(normalizedArgs[index + 1])
      index += 1
    }
  }

  const trailingTokens = normalizedArgs.slice(scanLimit)

  if (apiUrlTokens.length === 0) {
    return normalizedArgs
  }

  const subCommandIndex = remainingTokens.findIndex((arg) => arg in subCommands)
  if (subCommandIndex === -1) {
    return [...remainingTokens, ...apiUrlTokens, ...trailingTokens]
  }

  return [
    ...remainingTokens.slice(0, subCommandIndex + 1),
    ...apiUrlTokens,
    ...remainingTokens.slice(subCommandIndex + 1),
    ...trailingTokens,
  ]
}

function createCliOptions(
  overrides: Partial<CliOptions<CliGunshiParams>> = {},
): CliOptions<CliGunshiParams> {
  return {
    name: CLI_NAME,
    version: CLI_VERSION,
    usageSilent: true,
    subCommands,
    ...overrides,
    plugins: [...cliPlugins, ...(overrides.plugins ?? [])],
  }
}

export async function runCli(
  args: string[],
  overrides: Partial<CliOptions<CliGunshiParams>> = {},
) {
  const normalizedArgs = normalizeCliArgs(args)

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
