import { describe, expect, it, vi } from 'vitest'
import { authenticateRequest, resolveRequestAuth } from './auth'

describe('authenticateRequest', () => {
  it('returns a disabled auth state when auth mode is off', async () => {
    const result = await resolveRequestAuth(
      {
        AUTH_MODE: 'disabled',
        ENVIRONMENT: 'development',
        SERVICE_NAME: '__SERVICE_NAME__',
      },
      {} as never,
      new Request('https://api.sandbox.ohmylike.app/api/health'),
    )

    expect(result).toEqual({
      enabled: false,
      isAuthenticated: false,
      method: null,
      userId: null,
      userEmail: null,
      sessionId: null,
      apiKeyId: null,
    })
  })

  it('maps a bearer-backed session into the shared auth context', async () => {
    const auth = {
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: {
            id: 'user_123',
            email: 'user@example.com',
          },
          session: {
            id: 'session_123',
          },
        }),
        verifyApiKey: vi.fn(),
      },
    } as never

    const result = await authenticateRequest(
      auth,
      new Request('https://api.sandbox.ohmylike.app/api/protected', {
        headers: {
          Authorization: 'Bearer token-123',
        },
      }),
    )

    expect(result).toEqual({
      enabled: true,
      isAuthenticated: true,
      method: 'bearer',
      userId: 'user_123',
      userEmail: 'user@example.com',
      sessionId: 'session_123',
      apiKeyId: null,
    })
  })

  it('maps a verified API key into the shared auth context', async () => {
    const auth = {
      api: {
        getSession: vi.fn(),
        verifyApiKey: vi.fn().mockResolvedValue({
          valid: true,
          key: {
            id: 'key_123',
            referenceId: 'user_123',
          },
        }),
      },
    } as never

    const result = await authenticateRequest(
      auth,
      new Request('https://api.sandbox.ohmylike.app/api/protected', {
        headers: {
          'x-api-key': 'sandbox_key',
        },
      }),
    )

    expect(result).toEqual({
      enabled: true,
      isAuthenticated: true,
      method: 'api-key',
      userId: 'user_123',
      userEmail: null,
      sessionId: null,
      apiKeyId: 'key_123',
    })
  })

  it('falls back to API key validation when bearer auth cannot establish a session', async () => {
    const auth = {
      api: {
        getSession: vi.fn().mockRejectedValue(new Error('bad bearer token')),
        verifyApiKey: vi.fn().mockResolvedValue({
          valid: true,
          key: {
            id: 'key_456',
            referenceId: 'service-account_1',
          },
        }),
      },
    } as never

    const result = await authenticateRequest(
      auth,
      new Request('https://api.sandbox.ohmylike.app/api/protected', {
        headers: {
          Authorization: 'Bearer bad-token',
          'x-api-key': 'sandbox_key',
        },
      }),
    )

    expect(result).toEqual({
      enabled: true,
      isAuthenticated: true,
      method: 'api-key',
      userId: 'service-account_1',
      userEmail: null,
      sessionId: null,
      apiKeyId: 'key_456',
    })
  })
})
