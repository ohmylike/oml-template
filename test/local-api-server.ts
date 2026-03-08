import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from '../apps/api/src/app'
import type { AppBindings } from '../apps/api/src/env'

export interface LocalApiServer {
  baseUrl: string
  close(): Promise<void>
}

function createDefaultEnv(overrides: Partial<AppBindings> = {}): AppBindings {
  return {
    TURSO_DATABASE_URL: 'file:local.db',
    TURSO_AUTH_TOKEN: 'test-token',
    ENVIRONMENT: 'development',
    SERVICE_NAME: '__SERVICE_NAME__',
    AUTH_MODE: 'disabled',
    BETTER_AUTH_SECRET: 'test-secret-0123456789abcdefghijklmnop',
    BETTER_AUTH_URL: 'http://127.0.0.1:8787',
    CACHE: {} as KVNamespace,
    UPLOADS: {} as R2Bucket,
    ...overrides,
  }
}

async function readRequestBody(request: Parameters<Parameters<typeof createServer>[0]>[0]) {
  const chunks: Uint8Array[] = []

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (chunks.length === 0) {
    return
  }

  return Buffer.concat(chunks)
}

export async function startLocalApiServer(
  overrides: Partial<AppBindings> = {},
): Promise<LocalApiServer> {
  const app = createApp()
  const env = createDefaultEnv(overrides)

  const server = createServer(async (request, response) => {
    const body = await readRequestBody(request)
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`)
    const honoResponse = await app.request(
      url.toString(),
      {
        method: request.method,
        headers: request.headers as HeadersInit,
        body: body && request.method !== 'GET' && request.method !== 'HEAD' ? body : undefined,
      },
      env,
    )

    response.statusCode = honoResponse.status
    honoResponse.headers.forEach((value, key) => {
      response.setHeader(key, value)
    })

    const payload = await honoResponse.arrayBuffer()
    response.end(Buffer.from(payload))
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve local API server address.')
  }

  return {
    baseUrl: `http://127.0.0.1:${(address as AddressInfo).port}`,
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      })
    },
  }
}
