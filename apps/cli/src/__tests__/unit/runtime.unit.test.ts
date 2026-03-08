import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeApiBaseUrl, resolveCliRuntime } from '../../runtime'

describe('resolveCliRuntime', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to direct database mode when no API URL is configured', () => {
    expect(resolveCliRuntime({})).toEqual({
      transport: 'database',
    })
  })

  it('resolves API mode from an explicit --api-url flag', () => {
    const runtime = resolveCliRuntime({
      apiUrl: 'https://pr-42.api.ohmylike.app/',
    })

    expect(runtime.transport).toBe('api')
    if (runtime.transport !== 'api') {
      throw new Error('Expected API transport runtime')
    }

    expect(runtime.apiBaseUrl).toBe('https://pr-42.api.ohmylike.app')
    expect(runtime.apiClient).toBeTruthy()
  })

  it('falls back to API_BASE_URL when --api-url is omitted', () => {
    vi.stubEnv('API_BASE_URL', 'https://preview.api.ohmylike.app/v1/')

    const runtime = resolveCliRuntime({})

    expect(runtime.transport).toBe('api')
    if (runtime.transport !== 'api') {
      throw new Error('Expected API transport runtime')
    }

    expect(runtime.apiBaseUrl).toBe('https://preview.api.ohmylike.app/v1')
  })

  it('rejects mixing API mode with explicit database flags', () => {
    expect(() =>
      resolveCliRuntime(
        {
          apiUrl: 'https://preview.api.ohmylike.app',
          url: 'file:test.db',
        },
        { url: true },
      ),
    ).toThrow(
      'Cannot combine API mode with `--url` or `--auth-token`. Remove `--api-url` or unset `API_BASE_URL` to use direct database mode.',
    )
  })

  it('validates API URLs early', () => {
    expect(() => normalizeApiBaseUrl('preview-api')).toThrow(
      'Invalid API base URL. Pass an absolute URL via `--api-url` or `API_BASE_URL`.',
    )
  })
})
