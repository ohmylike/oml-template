import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const repoRoot = path.resolve(import.meta.dirname, '..')
const cliEntrypoint = path.resolve(repoRoot, 'apps/cli/dist/index.js')

let built = false

async function ensureBuilt(force = false) {
  if (built && !force) {
    return
  }

  await execFileAsync('pnpm', ['--filter', '@oml-__SERVICE_NAME__/core', 'build'], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  })

  await execFileAsync('pnpm', ['--filter', '@oml-__SERVICE_NAME__/cli', 'build'], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  })

  built = true
}

export async function runBuiltCli(
  args: string[],
  options: { build?: boolean; env?: NodeJS.ProcessEnv } = {},
) {
  await ensureBuilt(options.build === true)

  const result = await execFileAsync(process.execPath, [cliEntrypoint, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...options.env,
    },
    maxBuffer: 10 * 1024 * 1024,
  })

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  }
}
