import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/worker.ts'],
  format: 'esm',
  fixedExtension: false,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  dts: true,
  clean: false,
})
