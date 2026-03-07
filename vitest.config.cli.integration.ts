import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['apps/cli/src/__tests__/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
  },
})
