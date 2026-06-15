import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['docs/**/tests/**/*.test.ts'],
    environment: 'node',
  },
})
