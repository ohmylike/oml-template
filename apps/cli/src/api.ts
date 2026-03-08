import type { ApiClient } from '@oml-__SERVICE_NAME__/api-client'
import { parseBundle } from './bundle'

async function readApiJson(response: Response) {
  if (response.ok) {
    return response.json()
  }

  let apiErrorMessage: string | undefined

  try {
    const payload = await response.json() as {
      error?: {
        message?: string
      }
    }

    apiErrorMessage = payload.error?.message
  } catch {}

  if (apiErrorMessage) {
    throw new Error(apiErrorMessage)
  }

  throw new Error(`API request failed: ${response.status} ${response.statusText}`)
}

export async function requestApiSchema(client: ApiClient, source?: 'code' | 'database') {
  const response = await client.api.cli.schema.$get({
    query: source ? { source } : {},
  })

  return readApiJson(response)
}

export async function requestApiExport(client: ApiClient) {
  const response = await client.api.cli.export.$post()
  return readApiJson(response)
}

export async function requestApiImport(client: ApiClient, bundleText: string) {
  const response = await client.api.cli.import.$post({
    json: parseBundle(bundleText),
  })

  return readApiJson(response)
}
