import { defineConfig } from 'tsup';

export default defineConfig(({ watch }) => ({
  entry: ['./src/*.ts', '!./src/**/*.{test,spec}.ts'],
  outDir:
    watch || process.env.CI === 'true'
      ? // it must be under `node_modules`
        './node_modules/storybook-playwright-ct/dist'
      : './dist',
  format: ['cjs'],
  bundle: false,
  clean: true,
  dts: true,
}));
