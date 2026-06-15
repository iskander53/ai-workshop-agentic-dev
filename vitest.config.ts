import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Components don't import React — emit the automatic JSX runtime.
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['docs/**/tests/**/*.test.{ts,tsx}'],
    // node by default (core + e2e); *.test.tsx opt into jsdom via a per-file
    // `// @vitest-environment jsdom` docblock.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
})
