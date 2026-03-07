import { Hono } from 'hono'
import { describe, it, expect } from 'vitest'
import healthRoutes from './health'

describe('GET /health', () => {
  const app = new Hono().route('/', healthRoutes)

  it('returns status ok', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
