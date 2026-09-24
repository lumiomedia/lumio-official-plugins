import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, TOKENS, useTvMode } from '@/lib/plugin-sdk'
import { Pill, TextField, TvCheck } from './tv-aware-controls'
import { useHubText } from './hub-strings'
import { listGroups } from './index-client'
import { curatedGroupCounts, mergeNameConflict, normalizeCuration } from './list-curation'
import { markListCurationSeen, updateLiveTvListCuration, type ListCuration, type LiveTvList } from './live-tv-data'

/**
 * "Markera"-växeln för ihopslagning: en vanlig kryssruta på skrivbordet, en
 * station med samma testid på TV (en rå <input type=checkbox> går inte att nå
 * med fjärrkontrollen).
 */
function MarkToggle({ name, marked, onToggle, label }: { name: string; marked: boolean; onToggle: () => void; label: string }) {
  const isTv = useTvMode()
  if (isTv) {
    return (
      <button
        type="button"
        data-f=""
        data-testid={`mark-${name}`}
        aria-pressed={marked}
        onClick={onToggle}
        style={{ fontSize: 'var(--st-small)', color: marked ? TOKENS.accent : TOKENS.textMute, background: 'transparent', border: `1px solid ${marked ? TOKENS.accent : TOKENS.borderStrong}`, borderRadius: 10, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        {marked ? '✓ ' : ''}{label}
      </button>
    )
  }
  return (
    <label style={{ fontSize: 'var(--st-label)', color: TOKENS.textMute, display: 'flex', alignItems: 'center', gap: 4 }}>
      <input data-testid={`mark-${name}`} type="checkbox" checked={marked} onChange={onToggle} />
      {label}
    </label>
  )
}

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

  // Efter import ligger panelen under alla listkort — utan det här syns den
  // inte alls på en sida med flera listor (granskning 2026-09-24).
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (mode !== 'after-import') return
    rootRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [mode])

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
    const conflict = mergeNameConflict(mergeName, groups ?? [], draft, [...marked])
    if (conflict) {
      setMergeError(conflict === 'empty' ? h('mergeNameEmpty') : conflict === 'duplicate' ? h('mergeNameTaken') : h('mergeNameIsGroup'))
      return
    }
    const members = [...marked]
    setDraft((d) => ({ ...d, merges: [...d.merges, { name: mergeName.trim(), groups: members }] }))
    setMarked(new Set())
    setMergeName('')
    setMergeError(null)
  }
  const split = (name: string) => setDraft((d) => ({ ...d, merges: d.merges.filter((m) => m.name !== name) }))
  const save = () => { updateLiveTvListCuration(list.id, normalizeCuration(draft)); onClose() }
  const skip = () => { markListCurationSeen(list.id); onClose() }

  // Typografin via appens tokens (`--st-*`), som byter storlek under
  // [data-tv="1"] — råa pixelvärden blev pyttesmå på TV (Jerry 2026-09-24).
  const rowStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${TOKENS.border}` } as const
  const fieldStyle = { flex: 1, minWidth: 160 } as const

  return (
    <Card>
      <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--st-h3)', fontWeight: 600, color: TOKENS.text }}>{h('categories')} · {list.name}</div>
          {groups ? (
            <div style={{ fontSize: 'var(--st-small)', color: TOKENS.textMute, marginTop: 2 }}>
              {h('curationSummary', {
                groups: visibleCount.toLocaleString(locale),
                hidden: draft.hidden.filter((g) => known.has(g)).length,
                merged: draft.merges.length,
              })}
            </div>
          ) : null}
          {mode === 'after-import' ? <div style={{ fontSize: 'var(--st-small)', color: TOKENS.textMute, marginTop: 6 }}>{h('curationIntro')}</div> : null}
        </div>
        {groups && groups.length === 0 ? (
          <div style={{ fontSize: 'var(--st-body)', color: TOKENS.textMute }}>{h('noCategoriesInList')}</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField title={h('searchCategories')} placeholder={h('searchCategories')} value={query} onChange={setQuery} style={fieldStyle} />
              <Pill size="sm" onClick={() => setDraft((d) => ({ ...d, hidden: [] }))}>{h('showAll')}</Pill>
              <Pill size="sm" onClick={() => setDraft((d) => ({ ...d, hidden: (groups ?? []).map((g) => g.name).filter((g) => !claimed.has(g)) }))}>{h('hideAll')}</Pill>
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {rows.map((row) => row.kind === 'merge' ? (
                <div key={`m:${row.name}`} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--st-body)', fontWeight: 600, color: TOKENS.text }}>{row.name}</div>
                    <div style={{ fontSize: 'var(--st-small)', color: TOKENS.textMute }}>{h('mergeContains', { groups: row.groups.join(', ') })}</div>
                  </div>
                  <span style={{ fontSize: 'var(--st-small)', color: TOKENS.textMute }}>{row.count.toLocaleString(locale)}</span>
                  <Pill size="sm" onClick={() => split(row.name)}>{h('splitMerge')}</Pill>
                </div>
              ) : (
                <div key={`g:${row.name}`} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TvCheck checked={!row.hidden} onChange={() => toggleHidden(row.name)} label={row.name} />
                  </div>
                  <span style={{ fontSize: 'var(--st-small)', color: TOKENS.textMute }}>{row.count.toLocaleString(locale)}</span>
                  <MarkToggle name={row.name} marked={marked.has(row.name)} onToggle={() => toggleMark(row.name)} label={h('markForMerge')} />
                </div>
              ))}
            </div>
            {marked.size < 2 ? (
              // Ihopslagningen var osynlig tills två rader markerats — ingen
              // hittade den (Jerry 2026-09-24). Raden säger hur, och byts mot
              // namnfältet så fort villkoret är uppfyllt.
              <div style={{ fontSize: 'var(--st-small)', color: TOKENS.textMute }}>{h('mergeHint')}</div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField title={h('mergeNameLabel')} placeholder={h('mergeInto')} value={mergeName} onChange={(next) => { setMergeName(next); setMergeError(null) }} style={fieldStyle} />
                <Pill size="sm" variant="accent" onClick={merge}>{h('mergeAction')}</Pill>
                {mergeError ? <div role="alert" style={{ fontSize: 'var(--st-small)', color: '#fca5a5', width: '100%' }}>{mergeError}</div> : null}
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Pill size="sm" onClick={mode === 'after-import' ? skip : onClose}>{mode === 'after-import' ? h('skip') : h('cancel')}</Pill>
          <Pill size="sm" variant="accent" onClick={save} disabled={groups === null}>{h('save')}</Pill>
        </div>
      </div>
    </Card>
  )
}
