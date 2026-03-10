import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/ui-matrix.ts'],
  format: 'esm',
  fixedExtension: false,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  dts: true,
  clean: true,
})
