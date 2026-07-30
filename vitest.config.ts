import { defineConfig } from 'vitest/config';

// Workspace mode: each package with its own vitest.config.ts runs as an
// isolated project. Empty placeholder packages (no config) are skipped.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: ['packages/*/vitest.config.ts'],
  },
});
