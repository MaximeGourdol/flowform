import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@formjourney/plugin-steps-conditional',
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
