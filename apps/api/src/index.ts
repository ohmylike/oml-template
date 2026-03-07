import { createApp } from './app'

export { createApp } from './app'
export type { AppType } from './app'

const app = createApp()

export default {
  fetch: app.fetch,
}
