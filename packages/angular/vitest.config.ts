import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@flowform/angular',
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
  },
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        useDefineForClassFields: false,
      },
    },
  },
});
