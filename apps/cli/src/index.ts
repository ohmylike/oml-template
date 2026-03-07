import { cli, define } from 'gunshi'

const CLI_NAME = 'oml-__SERVICE_NAME__'
const CLI_VERSION = '0.0.1'

const mainCommand = define({
  name: CLI_NAME,
  description: `${CLI_NAME} CLI`,
  run: async () => {
    console.log(`${CLI_NAME} v${CLI_VERSION}`)
    console.log('Use --help to see available commands.')
  },
})

try {
  await cli(process.argv.slice(2), mainCommand, {
    name: CLI_NAME,
    version: CLI_VERSION,
  })
} catch (err) {
  if (err instanceof Error) {
    console.error(`Error: ${err.message}`)
  } else {
    console.error(`Unexpected error: ${String(err)}`)
  }
  process.exit(1)
}
