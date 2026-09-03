'use client'

import { useLang, type BrowsePageProps } from '@/lib/plugin-sdk'

/** Visas bara när menyvalet öppnas utan ett byggt index — säger var man bygger det. */
export function JellyfinFallbackPage(_props: BrowsePageProps) {
  const { lang } = useLang()
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/45 px-6 py-10 text-center text-slate-300">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Jellyfin</p>
      <p className="mt-3 text-sm text-slate-200">
        {lang === 'sv'
          ? 'Inget index ännu. Anslut servern och bygg indexet under Inställningar → Jellyfin.'
          : 'No index yet. Connect the server and build the index under Settings → Jellyfin.'}
      </p>
    </div>
  )
}
