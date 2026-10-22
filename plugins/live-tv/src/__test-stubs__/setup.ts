import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// @testing-library/dom's waitFor uses a `jest` global probe to detect fake
// timers (so it advances them instead of waiting on real ones). Vitest doesn't
// expose `jest`, so without this shim waitFor hangs when vi.useFakeTimers() is
// active. Aliasing `jest` to `vi` lets the detection work.
;(globalThis as unknown as { jest: typeof vi }).jest = vi

// Sportens nyckelfria källor (ESPN) gör riktiga nätanrop: av i alla tester utom
// deras egna (router.ts läser flaggan när en router skapas).
;(globalThis as unknown as { __lumioNoKeylessSources: boolean }).__lumioNoKeylessSources = true
