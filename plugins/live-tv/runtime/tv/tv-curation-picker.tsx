import { useEffect, useMemo, useState } from 'react'
import type { TvNav } from './tv-shell'
import { TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { Check, PickerPanel } from './tv-list-picker'
import type { useTextPrompt } from './tv-text-entry'
import { listGroups } from '../index-client'
import { curatedGroupCounts, mergeNameConflict, normalizeCuration } from '../list-curation'
import { markListCurationSeen, updateLiveTvListCuration, type ListCuration, type LiveTvList } from '../live-tv-data'

const rowStyle = {
  height: dp(64),
  minHeight: dp(64),
  borderRadius: dp(12),
  display: 'flex',
  alignItems: 'center',
  gap: dp(14),
  padding: `0 ${dp(12)}px`,
  fontSize: dp(19),
  cursor: 'pointer',
} as const

/**
 * Kategoripanelen på TV (spec 2026-09-24), på samma PickerPanel-mönster som
 * kanal- och Xtream-väljarna. OK på en grupprad växlar visas/dold. "Slå ihop…"
 * växlar till markeringsläge, där OK markerar i stället och raden "Slå ihop
 * markerade (N)" frågar efter namnet via TV-tangentbordet. OK på en
 * ihopslagen rad delar upp den. Allt är lokalt till Spara.
 */
export function TvCurationPicker({ nav, list, mode, keyboard, onClose }: {
  nav: TvNav
  list: LiveTvList
  mode: 'settings' | 'after-import'
  keyboard: ReturnType<typeof useTextPrompt>
  onClose: () => void
}) {
  const { tt } = useTvText()
  const [groups, setGroups] = useState<{ name: string; count: number }[] | null>(null)
  const [draft, setDraft] = useState<ListCuration>(() => ({
    hidden: [...(list.curation?.hidden ?? [])],
    merges: (list.curation?.merges ?? []).map((m) => ({ name: m.name, groups: [...m.groups] })),
  }))
  const [mergeMode, setMergeMode] = useState(false)
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    listGroups(list.source ?? null)
      .then((fetched) => { if (live) setGroups(fetched.length > 0 ? fetched : (list.groups ?? [])) })
      .catch(() => { if (live) setGroups(list.groups ?? []) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.id, list.source])

  const known = useMemo(() => new Set((groups ?? []).map((g) => g.name)), [groups])
  const claimed = useMemo(() => new Set(draft.merges.flatMap((m) => m.groups)), [draft.merges])
  const merges = draft.merges
    .map((m) => ({
      ...m,
      groups: m.groups.filter((g) => known.has(g)),
      count: (groups ?? []).filter((g) => m.groups.includes(g.name)).reduce((sum, g) => sum + g.count, 0),
    }))
    .filter((m) => m.groups.length > 0)
  const plain = (groups ?? [])
    .filter((g) => !claimed.has(g.name))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const summary = groups
    ? tt('curationSummary', {
        groups: curatedGroupCounts(groups, draft).length,
        hidden: draft.hidden.filter((g) => known.has(g)).length,
        merged: draft.merges.length,
      })
    : ''

  const toggleHidden = (name: string) => setDraft((d) => ({ ...d, hidden: d.hidden.includes(name) ? d.hidden.filter((g) => g !== name) : [...d.hidden, name] }))
  const toggleMark = (name: string) => setMarked((m) => {
    const next = new Set(m)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })
  const finishMerge = () => {
    if (marked.size < 2) return
    keyboard.ask(tt('mergeNameLabel'), '', (value) => {
      const conflict = mergeNameConflict(value, groups ?? [], draft, [...marked])
      if (conflict) {
        setError(conflict === 'empty' ? tt('mergeNameEmpty') : conflict === 'duplicate' ? tt('mergeNameTaken') : tt('mergeNameIsGroup'))
        return
      }
      const members = [...marked]
      setDraft((d) => ({ ...d, merges: [...d.merges, { name: value.trim(), groups: members }] }))
      setMarked(new Set())
      setMergeMode(false)
      setError(null)
    })
  }
  const save = () => { updateLiveTvListCuration(list.id, normalizeCuration(draft)); onClose() }
  const skip = () => { markListCurationSeen(list.id); onClose() }
  const dismiss = mode === 'after-import' ? skip : onClose

  return (
    <PickerPanel
      nav={nav}
      title={`${tt('categories')} · ${list.name}`}
      testId="curation-picker"
      onClose={dismiss}
      chips={<div style={{ fontSize: dp(16), color: TV.dim }}>{mode === 'after-import' ? tt('curationIntro') : summary}</div>}
      rows={(
        <>
          <div data-testid="curation-save" {...station(save, undefined, { 'data-init': '' })} style={{ ...rowStyle, color: TV.acc }}>{tt('save')}</div>
          <div data-testid="curation-skip" {...station(dismiss)} style={rowStyle}>{mode === 'after-import' ? tt('skip') : tt('cancel')}</div>
          <div {...station(() => setDraft((d) => ({ ...d, hidden: [] })))} style={rowStyle}>{tt('showAll')}</div>
          <div {...station(() => setDraft((d) => ({ ...d, hidden: plain.map((g) => g.name) })))} style={rowStyle}>{tt('hideAll')}</div>
          <div
            data-testid="curation-merge-mode"
            {...station(() => { setMergeMode((m) => !m); setMarked(new Set()); setError(null) })}
            style={{ ...rowStyle, color: mergeMode ? TV.acc : undefined }}
          >
            {tt('mergeInto')}
          </div>
          {mergeMode ? (
            <div data-testid="curation-merge-done" {...station(finishMerge)} style={{ ...rowStyle, color: marked.size >= 2 ? TV.acc : TV.dim }}>
              {tt('mergeSelected', { n: marked.size })}
            </div>
          ) : null}
          {error ? <div role="alert" style={{ padding: dp(12), fontSize: dp(16), color: '#fca5a5' }}>{error}</div> : null}
          {groups === null ? <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('loadingChannels')}</div> : null}
          {groups && groups.length === 0 ? <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('noCategoriesInList')}</div> : null}
          {merges.map((m) => (
            <div
              key={`m:${m.name}`}
              data-testid={`curation-merge-${m.name}`}
              {...station(() => setDraft((d) => ({ ...d, merges: d.merges.filter((x) => x.name !== m.name) })))}
              style={rowStyle}
            >
              <Check on label={m.name} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
                <span style={{ color: TV.dim, fontSize: dp(15) }}> · {tt('mergeContains', { groups: m.groups.join(', ') })} · {tt('splitMerge')}</span>
              </span>
              <span style={{ color: TV.dim }}>{m.count}</span>
            </div>
          ))}
          {plain.map((g) => (
            <div
              key={`g:${g.name}`}
              data-testid={`curation-row-${g.name}`}
              {...station(() => (mergeMode ? toggleMark(g.name) : toggleHidden(g.name)))}
              style={rowStyle}
            >
              <Check on={mergeMode ? marked.has(g.name) : !draft.hidden.includes(g.name)} label={g.name} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: draft.hidden.includes(g.name) && !mergeMode ? TV.dim : undefined }}>
                {g.name}
              </span>
              <span style={{ color: TV.dim }}>{g.count}</span>
            </div>
          ))}
        </>
      )}
    />
  )
}
