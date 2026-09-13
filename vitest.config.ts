import path from 'node:path'

export default {
  resolve: {
    alias: { '@': path.resolve(__dirname, '../Moviefinder') },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
}
