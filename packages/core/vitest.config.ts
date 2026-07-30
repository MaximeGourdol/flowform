import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@flowform/core',
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
  },
});
