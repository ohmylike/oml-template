import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/app.ts'],
  format: 'esm',
  fixedExtension: false,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  dts: true,
  clean: true,
})
