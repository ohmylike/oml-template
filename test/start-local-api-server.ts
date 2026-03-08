import { startLocalApiServer } from './local-api-server'

const server = await startLocalApiServer({
  SERVICE_NAME: process.env.CLI_E2E_SERVICE_NAME?.trim() || '__SERVICE_NAME__',
})

console.log(server.baseUrl)

const shutdown = async () => {
  await server.close()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown()
})

process.on('SIGTERM', () => {
  void shutdown()
})

setInterval(() => {}, 1 << 30)
