import { vi } from 'vitest'
import * as pluginSdkStub from './plugins/live-tv/src/__test-stubs__/plugin-sdk'

vi.mock('@/lib/plugin-sdk', () => pluginSdkStub)
