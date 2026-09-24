import { useEffect, useMemo, useState } from 'react'
import { Card, Checkbox, PillBtn, TOKENS, inputStyle } from '@/lib/plugin-sdk'
import { useHubText } from './hub-strings'
import { listGroups } from './index-client'
import { curatedGroupCounts, mergeNameConflict, normalizeCuration } from './list-curation'
import { markListCurationSeen, updateLiveTvListCuration, type ListCuration, type LiveTvList } from './live-tv-data'

type Row =
  | { kind: 'group'; name: string; count: number; hidden: boolean }
  | { kind: 'merge'; name: string; count: number; groups: string[] }

/**
 * Kategoripanelen för skrivbord och telefon (spec 2026-09-24).
 *
 * Allt är lokalt tillstånd tills Spara; Avbryt/Hoppa över kastar ändringarna.
 * Underlaget är listans OKURATERADE grupper ur indexet (`listGroups`), med
 * importkvittot `list.groups` som reserv när anropet faller — panelen ska gå
 * att öppna även när servern är upptagen.
 *
 * `mode`: 'after-import' är den automatiska öppningen efter första importen
 * (Hoppa över i stället för Avbryt, en förklarande rad överst). Båda knapparna
 * markerar panelen som visad så att den inte kommer tillbaka.
 */
export function CategoryCurationPanel({ list, mode, onClose }: { list: LiveTvList; mode: 'settings' | 'after-import'; onClose: () => void }) {
  const { h, locale } = useHubText()
  const [groups, setGroups] = useState<{ name: string; count: number }[] | null>(null)
  const [draft, setDraft] = useState<ListCuration>(() => ({
    hidden: [...(list.curation?.hidden ?? [])],
    merges: (list.curation?.merges ?? []).map((m) => ({ name: m.name, groups: [...m.groups] })),
  }))
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [mergeName, setMergeName] = useState('')
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let live = true
    listGroups(list.source ?? null)
      .then((fetched) => { if (live) setGroups(fetched.length > 0 ? fetched : (list.groups ?? [])) })
      .catch(() => { if (live) setGroups(list.groups ?? []) })
    return () => { live = false }
  }, [list.source, list.groups])

  const known = useMemo(() => new Set((groups ?? []).map((g) => g.name)), [groups])
  const claimed = useMemo(() => new Set(draft.merges.flatMap((m) => m.groups)), [draft.merges])
  const rows = useMemo<Row[]>(() => {
    if (!groups) return []
    // En merge vars grupper leverantören tagit bort visas med det som finns
    // kvar; är inget kvar visas den inte alls (regeln ligger kvar i lagringen
    // ifall gruppen kommer tillbaka).
    const merged: Row[] = draft.merges
      .map((m) => ({
        kind: 'merge' as const,
        name: m.name,
        groups: m.groups.filter((g) => known.has(g)),
        count: groups.filter((g) => m.groups.includes(g.name)).reduce((sum, g) => sum + g.count, 0),
      }))
      .filter((m) => m.groups.length > 0)
    const plain: Row[] = groups
      .filter((g) => !claimed.has(g.name))
      .map((g) => ({ kind: 'group' as const, name: g.name, count: g.count, hidden: draft.hidden.includes(g.name) }))
    const needle = query.trim().toLowerCase()
    return [...merged, ...plain]
      .filter((r) => !needle || r.name.toLowerCase().includes(needle))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [groups, draft, claimed, known, query])

  const visibleCount = curatedGroupCounts(groups ?? [], draft).length
  const toggleHidden = (name: string) => setDraft((d) => ({ ...d, hidden: d.hidden.includes(name) ? d.hidden.filter((g) => g !== name) : [...d.hidden, name] }))
  const toggleMark = (name: string) => setMarked((m) => {
    const next = new Set(m)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })
  const merge = () => {
    const conflict = mergeNameConflict(mergeName, groups ?? [], draft)
    if (conflict) {
      setMergeError(conflict === 'empty' ? h('mergeNameEmpty') : conflict === 'duplicate' ? h('mergeNameTaken') : h('mergeNameIsGroup'))
      return
    }
    const members = [...marked]
    setDraft((d) => ({ hidden: d.hidden.filter((g) => !members.includes(g)), merges: [...d.merges, { name: mergeName.trim(), groups: members }] }))
    setMarked(new Set())
    setMergeName('')
    setMergeError(null)
  }
  const split = (name: string) => setDraft((d) => ({ ...d, merges: d.merges.filter((m) => m.name !== name) }))
  const save = () => { updateLiveTvListCuration(list.id, normalizeCuration(draft)); onClose() }
  const skip = () => { markListCurationSeen(list.id); onClose() }

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${TOKENS.border}` } as const
  const fieldStyle = { ...inputStyle, flex: 1, minWidth: 160, padding: '0 12px', background: 'transparent', color: TOKENS.text } as const

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>{h('categories')} · {list.name}</div>
          {groups ? (
            <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>
              {h('curationSummary', {
                groups: visibleCount.toLocaleString(locale),
                hidden: draft.hidden.filter((g) => known.has(g)).length,
                merged: draft.merges.length,
              })}
            </div>
          ) : null}
          {mode === 'after-import' ? <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 6 }}>{h('curationIntro')}</div> : null}
        </div>
        {groups && groups.length === 0 ? (
          <div style={{ fontSize: 13, color: TOKENS.textMute }}>{h('noCategoriesInList')}</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input aria-label={h('searchCategories')} placeholder={h('searchCategories')} value={query} onChange={(e) => setQuery(e.target.value)} style={fieldStyle} />
              <PillBtn size="sm" onClick={() => setDraft((d) => ({ ...d, hidden: [] }))}>{h('showAll')}</PillBtn>
              <PillBtn size="sm" onClick={() => setDraft((d) => ({ ...d, hidden: (groups ?? []).map((g) => g.name).filter((g) => !claimed.has(g)) }))}>{h('hideAll')}</PillBtn>
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {rows.map((row) => row.kind === 'merge' ? (
                <div key={`m:${row.name}`} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: TOKENS.text }}>{row.name}</div>
                    <div style={{ fontSize: 11.5, color: TOKENS.textMute }}>{h('mergeContains', { groups: row.groups.join(', ') })}</div>
                  </div>
                  <span style={{ fontSize: 12, color: TOKENS.textMute }}>{row.count.toLocaleString(locale)}</span>
                  <PillBtn size="sm" onClick={() => split(row.name)}>{h('splitMerge')}</PillBtn>
                </div>
              ) : (
                <div key={`g:${row.name}`} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Checkbox checked={!row.hidden} onChange={() => toggleHidden(row.name)} label={row.name} />
                  </div>
                  <span style={{ fontSize: 12, color: TOKENS.textMute }}>{row.count.toLocaleString(locale)}</span>
                  <label style={{ fontSize: 11.5, color: TOKENS.textMute, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input data-testid={`mark-${row.name}`} type="checkbox" checked={marked.has(row.name)} onChange={() => toggleMark(row.name)} />
                    {h('markForMerge')}
                  </label>
                </div>
              ))}
            </div>
            {marked.size >= 2 ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input aria-label={h('mergeNameLabel')} placeholder={h('mergeInto')} value={mergeName} onChange={(e) => { setMergeName(e.target.value); setMergeError(null) }} style={fieldStyle} />
                <PillBtn size="sm" variant="accent" onClick={merge}>{h('mergeAction')}</PillBtn>
                {mergeError ? <div role="alert" style={{ fontSize: 12, color: '#fca5a5', width: '100%' }}>{mergeError}</div> : null}
              </div>
            ) : null}
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <PillBtn size="sm" onClick={mode === 'after-import' ? skip : onClose}>{mode === 'after-import' ? h('skip') : h('cancel')}</PillBtn>
          <PillBtn size="sm" variant="accent" onClick={save} disabled={groups === null}>{h('save')}</PillBtn>
        </div>
      </div>
    </Card>
  )
}
