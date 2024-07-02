import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/*.ts', '!./src/**/*.{test,spec}.ts'],
  outDir: './dist',
  clean: true,
  dts: true,
});
