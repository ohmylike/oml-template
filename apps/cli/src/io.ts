import { readFile, writeFile } from 'node:fs/promises'

async function readStdin() {
  const chunks: string[] = []

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
  }

  return chunks.join('')
}

export async function readTextInput(input: string | undefined) {
  if (!input || input === '-') {
    return readStdin()
  }

  return readFile(input, 'utf8')
}

export async function writeTextOutput(output: string | undefined, text: string) {
  if (!output || output === '-') {
    return false
  }

  await writeFile(output, text, 'utf8')
  return true
}
