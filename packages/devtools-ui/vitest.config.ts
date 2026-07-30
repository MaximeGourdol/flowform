import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@flowform/devtools-ui',
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
  },
});
