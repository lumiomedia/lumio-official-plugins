import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/lib/plugin-sdk': resolve(__dirname, 'src/__test-stubs__/plugin-sdk.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    setupFiles: ['./src/__test-stubs__/setup.ts'],
    include: ['runtime/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
})
