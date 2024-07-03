import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/*.ts', '!./src/**/*.{test,spec}.ts'],
  outDir: './dist',
  format: ['cjs'],
  clean: true,
  dts: true,
});
