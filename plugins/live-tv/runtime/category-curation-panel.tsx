'use client'

import { useEffect, useMemo, useState } from 'react'
import { LtBtn, LtCheckMark, LtDialog, LtEyebrow, LtInput, LtNote, ToastHost, UI, fmtInt, useToast } from './settings-ui'
import { useHubText } from './hub-strings'
import { listGroups } from './index-client'
import { mergeNameConflict, normalizeCuration, renameMerge } from './list-curation'
import { markListCurationSeen, updateLiveTvListCuration, type ListCuration, type LiveTvList } from './live-tv-data'
import { playlistHost } from './playlist-card'

type Group = { name: string; count: number }

function cloneCuration(curation: ListCuration | undefined): ListCuration {
  return {
    hidden: [...(curation?.hidden ?? [])],
    merges: (curation?.merges ?? []).map((m) => ({ name: m.name, groups: [...m.groups] })),
  }
}

/**
 * KATEGORIDIALOGEN för skrivbord och telefon (handoff §4.1).
 *
 * Allt är ett lokalt utkast tills Save; Cancel/Skip (och Bakåt/Escape) kastar
 * det. Underlaget är listans OKURATERADE grupper ur indexet (`listGroups`),
 * med importkvittot `list.groups` som reserv när anropet faller — dialogen
 * ska gå att öppna även när servern är upptagen.
 *
 * Reglerna (§2): en kategori i högst en merge; medlemmar syns inte i
 * kategorilistan; Split lägger tillbaka dem med det dolda läge de hade
 * (det vilar under mergen, se list-curation.ts); mergens antal är summan.
 *
 * `mode`: 'after-import' är den automatiska öppningen efter första importen
 * (Skip i stället för Cancel). Båda knapparna markerar dialogen som visad så
 * att den inte kommer tillbaka.
 */
export function CategoriesDialog({ list, mode, onClose }: { list: LiveTvList; mode: 'settings' | 'after-import'; onClose: () => void }) {
  return (
    <ToastHost>
      <DialogBody list={list} mode={mode} onClose={onClose} />
    </ToastHost>
  )
}

/** Äldre namn — rutnätets tomma läge importerar det. Samma komponent. */
export const CategoryCurationPanel = CategoriesDialog

function DialogBody({ list, mode, onClose }: { list: LiveTvList; mode: 'settings' | 'after-import'; onClose: () => void }) {
  const { h, locale } = useHubText()
  const toast = useToast()
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [draft, setDraft] = useState<ListCuration>(() => cloneCuration(list.curation))
  const [marked, setMarked] = useState<string[]>([])
  const [mergeName, setMergeName] = useState('')
  const [query, setQuery] = useState('')
  /** Namnet under redigering per merge-index — skrivs in i utkastet vid blur, när det är giltigt. */
  const [editNames, setEditNames] = useState<Record<number, string>>({})

  useEffect(() => {
    let live = true
    listGroups(list.source ?? null)
      .then((fetched) => { if (live) setGroups(fetched.length > 0 ? fetched : (list.groups ?? [])) })
      .catch(() => { if (live) setGroups(list.groups ?? []) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.id, list.source])

  const known = useMemo(() => new Set((groups ?? []).map((g) => g.name)), [groups])
  const countOf = useMemo(() => new Map((groups ?? []).map((g) => [g.name, g.count])), [groups])
  const claimed = useMemo(() => new Set(draft.merges.flatMap((m) => m.groups)), [draft.merges])
  // En merge vars grupper leverantören tagit bort visas med det som finns
  // kvar; är inget kvar visas den inte alls (regeln ligger kvar i lagringen
  // ifall gruppen kommer tillbaka).
  const merges = draft.merges
    .map((m, index) => ({ index, name: m.name, members: m.groups.filter((g) => known.has(g)), count: m.groups.reduce((sum, g) => sum + (countOf.get(g) ?? 0), 0) }))
    .filter((m) => m.members.length > 0)
  const needle = query.trim().toLowerCase()
  const rows = (groups ?? [])
    .filter((g) => !claimed.has(g.name))
    .filter((g) => !needle || g.name.toLowerCase().includes(needle))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const summary = h('curationSummary', {
    groups: known.size,
    hidden: draft.hidden.filter((g) => known.has(g)).length,
    merged: draft.merges.filter((m) => m.groups.some((g) => known.has(g))).length,
  })

  const toggleHidden = (name: string) => setDraft((d) => ({ ...d, hidden: d.hidden.includes(name) ? d.hidden.filter((g) => g !== name) : [...d.hidden, name] }))
  const toggleMark = (name: string) => setMarked((m) => (m.includes(name) ? m.filter((x) => x !== name) : [...m, name]))
  const merge = () => {
    const conflict = mergeNameConflict(mergeName, groups ?? [], draft, marked)
    if (conflict) {
      toast(conflict === 'empty' ? h('giveMergedName') : conflict === 'duplicate' ? h('mergeNameTaken') : h('mergeNameIsGroup'))
      return
    }
    const name = mergeName.trim()
    setDraft((d) => ({ ...d, merges: [...d.merges, { name, groups: [...marked] }] }))
    setMarked([])
    setMergeName('')
    toast(h('mergedInto', { name }))
  }
  const split = (index: number) => {
    const name = draft.merges[index]?.name ?? ''
    setDraft((d) => ({ ...d, merges: d.merges.filter((_, i) => i !== index) }))
    setEditNames({})
    toast(h('splitDone', { name }))
  }
  const commitRename = (index: number) => {
    const value = editNames[index]
    if (value === undefined) return
    const next = renameMerge(draft, index, value)
    const changed = next.merges[index]?.name !== draft.merges[index]?.name
    if (!changed && value.trim() !== draft.merges[index]?.name) {
      toast(value.trim() ? h('mergeNameTaken') : h('giveMergedName'))
    }
    if (changed) setDraft(next)
    setEditNames((e) => { const copy = { ...e }; delete copy[index]; return copy })
  }
  const save = () => {
    updateLiveTvListCuration(list.id, normalizeCuration(draft))
    toast(h('categoriesSaved'))
    onClose()
  }
  const dismiss = () => {
    if (mode === 'after-import') markListCurationSeen(list.id)
    onClose()
  }

  const smallBtn = { padding: '7px 13px', fontSize: 12.5 } as const

  return (
    <LtDialog title={h('categoriesTitle', { host: playlistHost(list) })} body={h('categoriesBody')} width={620} onClose={dismiss} testId="categories-dialog">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        <LtNote>{groups ? summary : ''}</LtNote>
        {mode === 'after-import' ? <LtNote>{h('curationIntro')}</LtNote> : null}
        {groups && groups.length === 0 ? (
          <LtNote>{h('noCategoriesInList')}</LtNote>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <LtInput title={h('searchCategories')} placeholder={h('searchCategories')} value={query} onChange={setQuery} style={{ flex: '1 1 180px' }} />
              <LtBtn style={smallBtn} onClick={() => setDraft((d) => ({ ...d, hidden: [] }))}>{h('showAll')}</LtBtn>
              <LtBtn style={smallBtn} onClick={() => setDraft((d) => ({ ...d, hidden: (groups ?? []).map((g) => g.name).filter((g) => !claimed.has(g)) }))}>{h('hideAll')}</LtBtn>
            </div>
            {merges.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <LtEyebrow>{h('merged')}</LtEyebrow>
                {merges.map((m) => (
                  <div key={`m:${m.index}`} data-merge-row="" style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 9, background: UI.inset, padding: '10px 12px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <input
                        type="text"
                        aria-label={h('mergeNameLabel')}
                        value={editNames[m.index] ?? m.name}
                        onChange={(event) => setEditNames((e) => ({ ...e, [m.index]: event.target.value }))}
                        onBlur={() => commitRename(m.index)}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); (event.target as HTMLInputElement).blur() } }}
                        style={{ width: '100%', border: 0, borderRadius: 6, background: 'transparent', padding: '2px 0', fontSize: 13.5, fontFamily: 'inherit', color: UI.text, outline: 'none' }}
                      />
                      <p style={{ margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: UI.muted }}>
                        {h('mergedMeta', { members: m.members.join(' · '), channels: fmtInt(m.count, locale) })}
                      </p>
                    </div>
                    <LtBtn style={{ padding: '6px 11px' }} onClick={() => split(m.index)}>{h('splitMerge')}</LtBtn>
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ display: 'flex', maxHeight: 300, flexDirection: 'column', overflowY: 'auto', borderRadius: 9, background: UI.inset, padding: '0 12px' }}>
              {groups === null ? <LtNote style={{ padding: '10px 0' }}>{h('listImportProgressUnknown')}</LtNote> : null}
              {rows.map((g, i) => {
                const hidden = draft.hidden.includes(g.name)
                const isMarked = marked.includes(g.name)
                return (
                  <div key={`g:${g.name}`} data-cat-row="" style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: `1px solid ${i === 0 ? 'transparent' : UI.lineSoft}`, padding: '10px 0' }}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={!hidden}
                      aria-label={g.name}
                      onClick={() => toggleHidden(g.name)}
                      style={{ display: 'flex', flex: 'none', cursor: 'pointer', background: 'transparent', border: 0, padding: 0 }}
                    >
                      <LtCheckMark on={!hidden} />
                    </button>
                    <span onClick={() => toggleHidden(g.name)} style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5, cursor: 'pointer', color: hidden ? UI.muted : UI.text }}>{g.name}</span>
                    <span style={{ flex: 'none', fontSize: 12.5, fontFamily: UI.mono, color: UI.muted }}>{fmtInt(g.count, locale)}</span>
                    <LtBtn active={isMarked} style={{ padding: '5px 11px', color: isMarked ? UI.text : UI.muted }} onClick={() => toggleMark(g.name)}>
                      {isMarked ? h('marked') : h('mark')}
                    </LtBtn>
                  </div>
                )
              })}
            </div>
            {marked.length >= 2 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 9, borderWidth: 1, borderStyle: 'solid', borderColor: UI.accent700, background: UI.accent900, padding: 12 }}>
                <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: UI.soft }}>{marked.join(' · ')}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <LtInput title={h('mergeNameLabel')} placeholder={h('mergeNameSuggest')} value={mergeName} onChange={setMergeName} onEnter={merge} dark style={{ flex: 1 }} />
                  <LtBtn variant="accent" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={merge}>{h('mergeN', { n: marked.length })}</LtBtn>
                </div>
              </div>
            ) : (
              <LtNote>{h('mergeHelp')}</LtNote>
            )}
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <LtBtn size="md" onClick={dismiss}>{mode === 'after-import' ? h('skip') : h('cancel')}</LtBtn>
          <LtBtn size="md" variant="accent" onClick={save} disabled={groups === null}>{h('save')}</LtBtn>
        </div>
      </div>
    </LtDialog>
  )
}
