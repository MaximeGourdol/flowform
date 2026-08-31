import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@formjourney/adapter-core',
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
