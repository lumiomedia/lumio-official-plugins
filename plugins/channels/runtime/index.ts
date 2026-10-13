import type { LumioPlugin } from '@/lib/plugin-sdk'
import { S } from './strings'

export const ChannelsPlugin: LumioPlugin = {
  id: 'com.lumio.channels',
  name: S.pluginName,
  version: '0.1.0',
  description: S.description,
  preinstalled: false,
  register() {
    // Fylls på i Task 10–12.
  },
}

export default ChannelsPlugin
