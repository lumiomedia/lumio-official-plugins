'use client'

import { useEffect, useState } from 'react'
import { getTvGlassMenu, type TvGlassMenuAction, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { getLiveTvLists, onLiveTvListsChanged, type LiveTvList } from '../live-tv-data'
import { Heading, Row } from './settings-tabs'
import { dp } from './tv-ui'
import { LtBtn, UI } from '../settings-ui'
import type { TvStringKey } from './tv-strings'
import { addListRow, isBuiltinHubRow, listIdOf, moveHubRow, removeHubRow, toggleHubRow, type BuiltinHubRow, type HubRowPref } from './hub-rows'
import { setTvSettings } from './tv-settings-store'

type TT = (key: TvStringKey, vars?: Record<string, string | number>) => string

const BUILTIN_LABEL: Record<BuiltinHubRow, TvStringKey> = {
  onNow: 'spotlightOnNow', sport: 'xpLiveSport', continue: 'continueWatching', yours: 'xpYours', soon: 'xpSoon', explore: 'xpExplore',
}

/**
 * RADERNA I KANALER (Upplevelse) under Utseende (Jerry 2026-10-31). Varje rad
 * visar om den syns; OK öppnar glasmenyn med Visa/Dölj, Flytta upp/ner och —
 * för en listrad — Ta bort. Sist "Lägg till en lista som rad" med användarens
 * egna listor som inte redan är rader.
 */
export function HubRowsSection({ rows, tt }: { rows: HubRowPref[]; tt: TT }) {
  const [lists, setLists] = useState<LiveTvList[]>(() => getLiveTvLists().filter((l) => l.kind === 'custom'))
  useEffect(() => onLiveTvListsChanged(() => setLists(getLiveTvLists().filter((l) => l.kind === 'custom'))), [])
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const GlassMenu = getTvGlassMenu()
  const save = (next: HubRowPref[]) => setTvSettings({ hubRows: next })
  const nameOf = (id: string): string | null => {
    if (isBuiltinHubRow(id)) return tt(BUILTIN_LABEL[id])
    const list = lists.find((l) => l.id === listIdOf(id))
    return list ? list.label || list.name : null
  }
  // En listrad vars lista tagits bort visas inte, och ändringar sparas utan den
  // (annars kunde Flytta byta plats med en osynlig rad).
  const shown = rows.filter((r) => nameOf(r.id) !== null)
  const open = (row: HubRowPref, index: number, element: HTMLElement) => {
    const actions: TvGlassMenuAction[] = [
      { key: 'toggle', label: row.hidden ? tt('hubRowShow') : tt('hubRowHide'), run: () => save(toggleHubRow(shown, row.id)) },
      ...(index > 0 ? [{ key: 'up', label: tt('hubRowUp'), run: () => save(moveHubRow(shown, row.id, -1)) }] : []),
      ...(index < shown.length - 1 ? [{ key: 'down', label: tt('hubRowDown'), run: () => save(moveHubRow(shown, row.id, 1)) }] : []),
      ...(listIdOf(row.id) ? [{ key: 'remove', label: tt('hubRowRemove'), run: () => save(removeHubRow(shown, row.id)) }] : []),
    ]
    setMenu({ title: nameOf(row.id) ?? '', element, actions })
  }
  const addable = lists.filter((l) => !rows.some((r) => listIdOf(r.id) === l.id))
  const openAdd = (element: HTMLElement) => {
    if (addable.length === 0) return
    setMenu({ title: tt('hubRowAdd'), element, actions: addable.map((l) => ({ key: l.id, label: l.label || l.name, run: () => save(addListRow(shown, l.id)) })) })
  }
  return (
    <section data-testid="hub-rows-settings" style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading hint={tt('hubRowsHint')}>{tt('hubRowsHeading')}</Heading>
      {shown.map((row, index) => (
        <Row
          key={row.id}
          testId={`hub-row-${row.id}`}
          label={nameOf(row.id)}
          right={row.hidden ? tt('hubRowHidden') : tt('hubRowShown')}
          onOk={() => { const el = document.querySelector<HTMLElement>(`[data-testid="hub-row-${row.id}"]`); if (el) open(row, index, el) }}
        />
      ))}
      <Row
        testId="hub-row-add"
        label={tt('hubRowAdd')}
        right={lists.length === 0 ? tt('hubRowNoLists') : addable.length === 0 ? tt('hubRowAllAdded') : '+'}
        onOk={() => { const el = document.querySelector<HTMLElement>('[data-testid="hub-row-add"]'); if (el) openAdd(el) }}
      />
      {menu && GlassMenu ? <GlassMenu target={menu} onClose={() => setMenu(null)} /> : null}
    </section>
  )
}

/** Skrivbordets variant (Live TV-inställningarna): samma rader med knappar i stället för glasmenyn. */
export function HubRowsDesktop({ rows, tt }: { rows: HubRowPref[]; tt: TT }) {
  const [lists, setLists] = useState<LiveTvList[]>(() => getLiveTvLists().filter((l) => l.kind === 'custom'))
  useEffect(() => onLiveTvListsChanged(() => setLists(getLiveTvLists().filter((l) => l.kind === 'custom'))), [])
  const save = (next: HubRowPref[]) => setTvSettings({ hubRows: next })
  const nameOf = (id: string): string | null => {
    if (isBuiltinHubRow(id)) return tt(BUILTIN_LABEL[id])
    const list = lists.find((l) => l.id === listIdOf(id))
    return list ? list.label || list.name : null
  }
  const shown = rows.filter((r) => nameOf(r.id) !== null)
  const addable = lists.filter((l) => !rows.some((r) => listIdOf(r.id) === l.id))
  return (
    <div data-testid="lt-hub-rows" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '17px 0', borderTop: `1px solid ${UI.lineSoft}` }}>
      <p style={{ margin: 0, fontSize: 13.5, color: UI.text }}>{tt('hubRowsHeading')}</p>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: UI.muted, maxWidth: '56ch' }}>{tt('hubRowsHint')}</p>
      {shown.map((row, index) => (
        <div key={row.id} data-testid={`lt-hub-row-${row.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: row.hidden ? UI.muted : UI.text }}>{nameOf(row.id)}</span>
          <LtBtn title={tt('hubRowUp')} disabled={index === 0} onClick={() => save(moveHubRow(shown, row.id, -1))}>↑</LtBtn>
          <LtBtn title={tt('hubRowDown')} disabled={index === shown.length - 1} onClick={() => save(moveHubRow(shown, row.id, 1))}>↓</LtBtn>
          <LtBtn active={!row.hidden} onClick={() => save(toggleHubRow(shown, row.id))}>{row.hidden ? tt('hubRowHidden') : tt('hubRowShown')}</LtBtn>
          {listIdOf(row.id) ? <LtBtn variant="danger" onClick={() => save(removeHubRow(shown, row.id))}>{tt('hubRowRemove')}</LtBtn> : null}
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {addable.map((l) => <LtBtn key={l.id} testId={`lt-hub-row-add-${l.id}`} onClick={() => save(addListRow(shown, l.id))}>+ {l.label || l.name}</LtBtn>)}
        {addable.length === 0 ? <span style={{ fontSize: 12.5, color: UI.muted }}>{lists.length === 0 ? tt('hubRowNoLists') : tt('hubRowAllAdded')}</span> : null}
      </div>
    </div>
  )
}
