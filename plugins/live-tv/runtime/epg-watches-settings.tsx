'use client'

import { useEffect, useState } from 'react'
import { LtBtn, LtNote, LtRows, LtTextRow, UI } from './settings-ui'
import { useHubText } from './hub-strings'
import { EPG_WATCH_MIN_QUERY, addEpgWatch, getEpgWatches, onEpgWatchesChanged, removeEpgWatch, type EpgWatch } from './epg-watches'

/** Sökorden, levande: ändras de på en annan yta (TV-menyn, en annan enhet) ritas listan om. */
export function useEpgWatches(): EpgWatch[] {
  const [list, setList] = useState<EpgWatch[]>(() => getEpgWatches())
  useEffect(() => {
    const sync = () => setList(getEpgWatches())
    sync()
    return onEpgWatchesChanged(sync)
  }, [])
  return list
}

/** Bevaka i tablån — skrivbordet och telefonen (Lt-primitiverna). TV:n har egna rader i tv-settings-views.tsx. */
export function EpgWatchesCard() {
  const { h } = useHubText()
  const watches = useEpgWatches()
  const [draft, setDraft] = useState('')
  const add = () => {
    if (draft.trim().length < EPG_WATCH_MIN_QUERY) return
    addEpgWatch(draft)
    setDraft('')
  }
  return (
    <div data-testid="lt-epg-watches">
      <LtNote>{h('epgWatchesHint')}</LtNote>
      <LtRows>
        <LtTextRow
          first
          label={h('epgWatchAddLabel')}
          value={draft}
          onChange={setDraft}
          placeholder={h('epgWatchPlaceholder')}
          fieldWidth={220}
          button={h('epgWatchAdd')}
          onButton={add}
          buttonDisabled={draft.trim().length < EPG_WATCH_MIN_QUERY}
          testId="lt-epg-watch-add"
        />
        {watches.map((watch) => (
          <div
            key={watch.id}
            data-testid={`lt-epg-watch-${watch.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: `1px solid ${UI.lineSoft}`, padding: '12px 0' }}
          >
            <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 13.5, color: UI.text }}>{watch.query}</p>
            <LtBtn onClick={() => removeEpgWatch(watch.id)} testId={`lt-epg-watch-remove-${watch.id}`}>{h('epgWatchRemove')}</LtBtn>
          </div>
        ))}
      </LtRows>
    </div>
  )
}
