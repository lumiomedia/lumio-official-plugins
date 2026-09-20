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
      /*
        Bibliotekets typer läses ur APPENS träd, inte kopieras hit.
        `LibraryTitle` är kärnans kontrakt (`library_index.rs` speglat i
        `lib/library/types.ts`); en kopia i pluginet hade glidit isär första
        gången ett fält lades till, och batchen hade börjat tappa data tyst.
        Bygget löser `@/` mot appen ändå — det här gör att TESTERNA gör det med.
      */
      '@/lib/library/types': resolve(__dirname, '../../../Moviefinder/lib/library/types.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    setupFiles: ['./src/__test-stubs__/setup.ts'],
    include: ['runtime/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
})
