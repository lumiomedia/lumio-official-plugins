'use client'

import { useEffect, useMemo, useState } from 'react'
import { LtBtn, LtCheckMark, LtDialog, LtInput, LtNote, UI } from './settings-ui'
import { useHubText } from './hub-strings'
import { fetchXtreamCategories, saveXtreamLogin, type XtreamCategory, type XtreamLogin } from './live-tv-data'

/**
 * XTREAMS KATEGORIVAL PÅ SERVERN — vilka av panelens kategorier som hämtas
 * alls (`login.categoryIds`, tomt = alla). Skilt från kurateringen: det här
 * styr vad som kommer in i indexet, kurateringen vad som syns. Fanns i det
 * gamla kontokortet; handoffen saknade det, men ingen funktionalitet får
 * försvinna (Jerry 2026-09-24), så det bor nu som en egen dialog/vy i
 * handoffens stil, öppnad från spellistans kort och TV:ns L:list.
 *
 * Panelens kategorilista cachas per konto så att kortets etikett
 * ("2 of 140") kan sättas utan en ny hämtning efter att väljaren varit öppen.
 */
const categoriesCache = new Map<string, XtreamCategory[]>()
const cacheListeners = new Set<() => void>()

function cacheKey(login: Pick<XtreamLogin, 'base' | 'username'>): string {
  return `${login.base}|${login.username}`
}

export function knownXtreamCategoryCount(login: Pick<XtreamLogin, 'base' | 'username'> | null): number | null {
  if (!login) return null
  return categoriesCache.get(cacheKey(login))?.length ?? null
}

export function __resetXtreamCategoriesCacheForTests(): void {
  categoriesCache.clear()
}

/** Hämtar (och cachar) panelens kategorier; `null` medan de laddas. */
export function useXtreamCategories(login: XtreamLogin): XtreamCategory[] | null {
  const key = cacheKey(login)
  const [categories, setCategories] = useState<XtreamCategory[] | null>(() => categoriesCache.get(key) ?? null)
  useEffect(() => {
    let live = true
    const cached = categoriesCache.get(key)
    if (cached) {
      setCategories(cached)
      return
    }
    fetchXtreamCategories(login)
      .then((fetched) => {
        categoriesCache.set(key, fetched)
        for (const cb of cacheListeners) cb()
        if (live) setCategories(fetched)
      })
      .catch(() => { if (live) setCategories([]) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return categories
}

/** Omrendering när cachen fylls (kortets etikett). */
export function useXtreamCategoryCount(login: Pick<XtreamLogin, 'base' | 'username'> | null): number | null {
  const [, bump] = useState(0)
  useEffect(() => {
    const cb = () => bump((n) => n + 1)
    cacheListeners.add(cb)
    return () => { cacheListeners.delete(cb) }
  }, [])
  return knownXtreamCategoryCount(login)
}

/** Etiketten på kortets knapp: `· all`, `· 2 of 140` eller `· 2 selected` när totalen inte är känd. */
export function serverCategoriesLabel(login: XtreamLogin, total: number | null, h: ReturnType<typeof useHubText>['h']): string {
  if (login.categoryIds.length === 0) return h('serverCategoriesAll')
  if (total !== null) return h('serverCategoriesCount', { n: login.categoryIds.length, total })
  return h('serverCategoriesSelected', { n: login.categoryIds.length })
}

/**
 * Tomt val betyder ALLA — så en enskild kategori visas som vald när valet
 * är tomt, och att bocka av en kategori ur "alla" ger "alla utom den".
 * Blir alla valda igen faller valet tillbaka till tomt.
 */
export function isCategorySelected(selected: Set<string>, id: string): boolean {
  return selected.size === 0 || selected.has(id)
}

export function toggleCategory(selected: Set<string>, id: string, allIds: readonly string[]): Set<string> {
  const next = selected.size === 0 ? new Set(allIds) : new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  if (allIds.length > 0 && allIds.every((x) => next.has(x))) return new Set()
  return next
}

/**
 * Sparar valet på kontot. Tomt val = alla. Anroparen hämtar om listan.
 */
export function applyServerCategories(login: XtreamLogin, categoryIds: string[]): XtreamLogin {
  const next = { ...login, categoryIds }
  saveXtreamLogin(next)
  return next
}

/** Dialogen på skrivbord/telefon, i kategoridialogens stil (§4.1). */
export function ServerCategoriesDialog({ login, host, onClose, onApplied }: {
  login: XtreamLogin
  host: string
  onClose: () => void
  onApplied: () => void
}) {
  const { h } = useHubText()
  const categories = useXtreamCategories(login)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(login.categoryIds))
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const rows = useMemo(() => (categories ?? []).filter((c) => !needle || c.name.toLowerCase().includes(needle)), [categories, needle])
  const allIds = useMemo(() => (categories ?? []).map((c) => c.id), [categories])
  const toggle = (id: string) => setSelected((cur) => toggleCategory(cur, id, allIds))
  const apply = () => {
    applyServerCategories(login, [...selected])
    onApplied()
    onClose()
  }
  const rowBase = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' } as const

  return (
    <LtDialog title={h('serverCategoriesTitle', { host })} body={h('serverCategoriesBody')} width={620} onClose={onClose} testId="server-categories-dialog">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        <LtInput title={h('searchCategories')} placeholder={h('searchCategories')} value={query} onChange={setQuery} style={{ flex: '1 1 180px' }} />
        <div style={{ display: 'flex', maxHeight: 300, flexDirection: 'column', overflowY: 'auto', borderRadius: 9, background: UI.inset, padding: '0 12px' }}>
          <button type="button" role="checkbox" aria-checked={selected.size === 0} aria-label={h('allCategories')} onClick={() => setSelected(new Set())} style={{ ...rowBase, background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: UI.text }}>
            <LtCheckMark on={selected.size === 0} />
            <span style={{ fontSize: 13.5 }}>{h('allCategories')}</span>
          </button>
          {categories === null ? <LtNote style={{ padding: '10px 0' }}>{h('listImportProgressUnknown')}</LtNote> : null}
          {rows.map((c) => {
            const on = isCategorySelected(selected, c.id)
            return (
              <button key={c.id} type="button" role="checkbox" aria-checked={on} aria-label={c.name} onClick={() => toggle(c.id)} style={{ ...rowBase, borderTop: `1px solid ${UI.lineSoft}`, background: 'transparent', border: 0, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: UI.lineSoft, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: on ? UI.text : UI.muted }}>
                <LtCheckMark on={on} />
                <span style={{ fontSize: 13.5, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <LtBtn size="md" onClick={onClose}>{h('cancel')}</LtBtn>
          <LtBtn size="md" variant="accent" onClick={apply} disabled={categories === null}>{h('applyAndFetch')}</LtBtn>
        </div>
      </div>
    </LtDialog>
  )
}
