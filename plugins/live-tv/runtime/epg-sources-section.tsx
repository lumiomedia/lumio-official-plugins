'use client'

import { useState } from 'react'

interface Props {
  autoUrl: string | null
  manualUrls: string[]
  onChangeManual: (urls: string[]) => void
}

export function EpgSourcesSection({ autoUrl, manualUrls, onChangeManual }: Props) {
  const [draft, setDraft] = useState('')
  const addUrl = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChangeManual([...manualUrls, trimmed])
    setDraft('')
  }
  const removeUrl = (index: number) => onChangeManual(manualUrls.filter((_, j) => j !== index))
  const hasAny = autoUrl !== null || manualUrls.length > 0
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-white">EPG sources</h3>
      {autoUrl ? (
        <div className="flex items-center justify-between rounded border border-white/5 bg-black/30 px-3 py-2">
          <span className="truncate text-xs text-white/80">{autoUrl}</span>
          <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
            Auto
          </span>
        </div>
      ) : null}
      {manualUrls.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="flex items-center justify-between rounded border border-white/5 bg-black/30 px-3 py-2"
        >
          <span className="truncate text-xs text-white/80">{url}</span>
          <button
            type="button"
            onClick={() => removeUrl(i)}
            aria-label="Remove"
            className="text-xs text-red-300 hover:text-red-200"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="XMLTV URL (e.g. https://epgshare01.online/epgshare01/epg_ripper_SE1.xml.gz)"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addUrl()
            }
          }}
          className="flex-1 rounded border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-400/60"
        />
        <button
          type="button"
          onClick={addUrl}
          className="rounded bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
        >
          Add
        </button>
      </div>
      {!hasAny ? (
        <p className="text-xs text-white/40">
          No EPG sources yet. Try{' '}
          <code className="rounded bg-white/10 px-1">
            https://epgshare01.online/epgshare01/epg_ripper_SE1.xml.gz
          </code>{' '}
          for Swedish channels.
        </p>
      ) : null}
    </section>
  )
}
