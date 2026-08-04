import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@flowform/react',
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
  },
});
