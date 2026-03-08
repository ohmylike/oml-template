import { createApiClient, type ApiClient } from '@oml-__SERVICE_NAME__/api-client'
import { defineWithTypes, plugin } from 'gunshi'

export interface DatabaseTransportRuntime {
  transport: 'database'
}

export interface ApiTransportRuntime {
  transport: 'api'
  apiBaseUrl: string
  apiClient: ApiClient
}

export type CliRuntime = DatabaseTransportRuntime | ApiTransportRuntime

interface CliRuntimeValues {
  apiUrl?: string
  url?: string
  authToken?: string
  help?: boolean
  version?: boolean
}

type CliRuntimeExplicit = Partial<Record<'apiUrl' | 'url' | 'authToken', boolean>>

export interface CliGunshiParams {
  extensions: {
    cliRuntime: CliRuntime
  }
}

function getTrimmedValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function normalizeApiBaseUrl(value: string) {
  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw new Error('Invalid API base URL. Pass an absolute URL via `--api-url` or `API_BASE_URL`.')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Invalid API base URL. Use an `http://` or `https://` URL.')
  }

  const pathname = parsed.pathname.replace(/\/+$/, '')

  return `${parsed.origin}${pathname === '' || pathname === '/' ? '' : pathname}`
}

export function resolveApiBaseUrl(values: Pick<CliRuntimeValues, 'apiUrl'>) {
  const rawApiUrl = getTrimmedValue(values.apiUrl) ?? getTrimmedValue(process.env.API_BASE_URL)

  if (!rawApiUrl) {
    return
  }

  return normalizeApiBaseUrl(rawApiUrl)
}

export function resolveCliRuntime(
  values: CliRuntimeValues,
  explicit: CliRuntimeExplicit = {},
): CliRuntime {
  if (values.help || values.version) {
    return { transport: 'database' }
  }

  const apiBaseUrl = resolveApiBaseUrl(values)

  if (!apiBaseUrl) {
    return { transport: 'database' }
  }

  if (explicit.url || explicit.authToken) {
    throw new Error(
      'Cannot combine API mode with `--url` or `--auth-token`. Remove `--api-url` or unset `API_BASE_URL` to use direct database mode.',
    )
  }

  return {
    transport: 'api',
    apiBaseUrl,
    apiClient: createApiClient({ baseUrl: apiBaseUrl }),
  }
}

export function assertDatabaseTransport(commandName: string, runtime: CliRuntime) {
  if (runtime.transport === 'database') {
    return
  }

  throw new Error(
    `API transport for \`${commandName}\` is not implemented yet. Remove \`--api-url\` or unset \`API_BASE_URL\` to use direct database mode.`,
  )
}

const cliRuntimePlugin = plugin({
  id: 'cliRuntime',
  name: 'CLI runtime',
  setup(ctx) {
    ctx.addGlobalOption('apiUrl', {
      type: 'string',
      description: 'API base URL. Defaults to API_BASE_URL.',
    })
  },
  extension(ctx) {
    return resolveCliRuntime(
      ctx.values as CliRuntimeValues,
      ctx.explicit as CliRuntimeExplicit,
    )
  },
})

export const cliPlugins = [cliRuntimePlugin]

export const defineCliCommand = defineWithTypes<CliGunshiParams>()
