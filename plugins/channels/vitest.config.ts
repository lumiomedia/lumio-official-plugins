import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@/lib/plugin-sdk': resolve(__dirname, 'runtime/__test-stubs__/plugin-sdk.ts'),
      '@/lib/tv-focus': resolve(__dirname, 'runtime/__test-stubs__/tv-focus.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['runtime/**/*.test.{ts,tsx}'],
  },
})
