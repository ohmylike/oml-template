import fs from 'node:fs'
import path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const templatePreviewServiceName = 'template-preview'

function resolveCloudflareConfigPath() {
  const sourcePath = path.resolve(import.meta.dirname, './wrangler.toml')
  const source = fs.readFileSync(sourcePath, 'utf8')

  if (!source.includes('__SERVICE_NAME__')) {
    return sourcePath
  }

  const cacheDir = path.resolve(import.meta.dirname, '../../.wrangler/tmp')
  const generatedPath = path.join(cacheDir, 'www.vite.wrangler.toml')

  fs.mkdirSync(cacheDir, { recursive: true })
  fs.writeFileSync(
    generatedPath,
    source.replaceAll('__SERVICE_NAME__', templatePreviewServiceName),
  )

  return generatedPath
}

export default defineConfig({
  plugins: [
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      configPath: resolveCloudflareConfigPath(),
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
