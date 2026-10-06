import type { LumioPlugin } from '@/lib/plugin-sdk'
import { S } from './strings'

export const SimklPlugin: LumioPlugin = {
  id: 'com.lumio.simkl',
  name: S.pluginName,
  version: '0.1.0',
  description: S.description,
  preinstalled: true,
  register() {},
}
