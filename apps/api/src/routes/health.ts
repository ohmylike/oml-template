import { Hono } from 'hono'
import type { AppEnv } from '../env'

const app = new Hono<AppEnv>()

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

export default app
