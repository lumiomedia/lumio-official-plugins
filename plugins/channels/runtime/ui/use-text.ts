/** Pluginets texter på värdens språk. `{namn}` ersätts med vars. */
import { useCallback } from 'react'
import { resolvePluginText, useLang } from '@/lib/plugin-sdk'
import { S } from '../strings'

export type TextKey = keyof typeof S

export function useText(): (key: TextKey, vars?: Record<string, string | number>) => string {
  const { lang } = useLang()
  return useCallback(
    (key, vars) => {
      let out = resolvePluginText(S[key], lang)
      if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
      return out
    },
    [lang],
  )
}
