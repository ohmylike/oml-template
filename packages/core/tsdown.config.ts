import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/db/schema.ts',
    'src/db/client.ts',
    'src/db/migrate.ts',
  ],
  format: 'esm',
  fixedExtension: false,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  dts: true,
  clean: true,
})
