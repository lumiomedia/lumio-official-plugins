import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['runtime/**/*.test.{ts,tsx}'],
  },
})
