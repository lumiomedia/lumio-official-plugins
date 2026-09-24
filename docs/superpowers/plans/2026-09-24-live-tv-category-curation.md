# Live TV kategorikuratering — implementationsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per m3u/Xtream-källa kan användaren dölja kategorier och slå ihop kategorier; reglerna tillämpas i pluginets modell så att dolda kanaler försvinner överallt, och panelen öppnas efter första importen.

**Architecture:** Reglerna (`ListCuration`) sparas på `LiveTvList` i pluginlagringen. En ren funktion `applyCuration` tillämpas i `loadChannelsShared` per källa innan minnescachen skrivs; en lagringsprenumeration nollställer cachen när reglerna ändras. Kategorimenyn läser hela den kuraterade grupplistan ur modellen. Två paneler (skrivbord/telefon på Card-primitiver, TV på PickerPanel) redigerar reglerna; importvägarna öppnar panelen en gång.

**Tech Stack:** TypeScript/React 18, Vitest + @testing-library/react (happy-dom), pluginets SDK-stubbar i `src/__test-stubs__`, inline-stilar via `@/lib/plugin-sdk` (Card, Checkbox, PillBtn, TOKENS, inputStyle) och TV-primitiver (`PickerPanel`-mönstret, `station`, `dp`, `TV`).

**Spec:** `docs/superpowers/specs/2026-09-24-live-tv-category-curation-design.md`

Arbetskatalog för alla kommandon: `/Users/jerry/Local Sites/lumio-official-plugins/plugins/live-tv`. Tester körs med `npx vitest run <fil>`.

## Global Constraints

- Ingen Rust-/app-ändring; enbart plugin `live-tv`, version 0.10.0 → 0.11.0.
- Kuratering per källa; dolda kanaler borta överallt; ihopslagning ersätter originalen; en grupp i högst en merge och inte samtidigt dold.
- Panelen öppnas automatiskt bara efter en import som svarar `done` för en lista utan `curationSeen`; aldrig vid omhämtning med `curationSeen`, aldrig vid fel.
- Tom kuratering sparas som frånvarande fält.
- Skrivbord/telefon: pluginets Card-primitiver, inline-stilar, ingen yttre box. TV: `PickerPanel`-mönster, `station()`, `dp()`.
- Strängar på engelska och svenska i `hub-strings.ts` (skrivbord/telefon) och `tv/tv-strings.ts` (TV). Ingen text hårdkodad i JSX.
- Avvikelse mot specen, avsiktlig: `model.groups` behåller typen `string[]` men blir HELA den kuraterade listan sorterad efter antal; antalen exponeras separat som `model.groupCounts`. Skälet: fem konsumenter (`tv-guide.tsx:150`, `tv-guide-shared.tsx:27`, `hub-data.ts:44`, `mobile/guide-phone.tsx:63`, `live-tv-grid.tsx`) använder `.slice`/`.includes` på namn och behöver då inte skrivas om.
- Xtreams befintliga kategorival vid import (`login.categoryIds`) rörs inte.
- `.env.local`, dist-filer och andra plugins rörs inte; commits innehåller bara filer under `plugins/live-tv/` (och CHANGELOG/plugin.json där uppgiften säger det).

## Review Focus

1. **Grupp med semikolon ("Sport;HD")** där bara en delgrupp döljs: kanalen ska stå kvar under den andra delgruppen, aldrig försvinna. Test i Task 1.
2. **Merge-namn som redan är en synlig originalgrupp** ("Sport" när "Sport" finns odold): ska avvisas i panelen, inte tyst slås ihop med originalet. Test i Task 1 (normalisering) och Task 5 (panelens felrad).
3. **Två listor med samma källa** (samma m3u-URL importerad två gånger): första listan för källan vinner, samma regel som logotypswitchen (`logoFallbackStateSnapshot`). Test i Task 2.
4. **Alla kategorier dolda:** rutnätet ska visa ett tomt tillstånd med väg tillbaka till panelen, inte en oändlig laddning. Test i Task 3.
5. **Omhämtning av en lista där leverantören tagit bort en grupp som ingår i en merge:** mergen ska ligga kvar utan fel, och panelen ska inte visa den saknade gruppen som rad men fortfarande visa mergen med de grupper som finns. Test i Task 1 (`curatedGroupCounts` med okänd grupp) och Task 5.

---

### Task 1: Kurateringsmodellen — typer, normalisering, tillämpning, lagring

**Files:**
- Create: `runtime/list-curation.ts`
- Create: `runtime/list-curation.test.ts`
- Modify: `runtime/live-tv-data.ts` (typen `LiveTvList` rad 73–120; nya exporter intill `updateLiveTvListEpg` rad 429)

**Interfaces:**
- Produces:
  - `export interface ListCuration { hidden: string[]; merges: { name: string; groups: string[] }[] }` (i `live-tv-data.ts`)
  - `LiveTvList.curation?: ListCuration`, `LiveTvList.curationSeen?: boolean`
  - `export function normalizeCuration(curation: ListCuration | undefined): ListCuration | undefined` — returnerar `undefined` för tom kuratering
  - `export function applyCuration<T extends { group: string }>(channels: readonly T[], curation: ListCuration | undefined): T[]`
  - `export function curatedGroupCounts(groups: readonly { name: string; count: number }[], curation: ListCuration | undefined): { name: string; count: number }[]` — panelens och menyns underlag: dolda borttagna, merges summerade, sorterat efter antal fallande sedan namn
  - `export function mergeNameConflict(name: string, groups: readonly { name: string }[], curation: ListCuration): 'empty' | 'duplicate' | 'visible-group' | null`
  - `export function updateLiveTvListCuration(listId: string, curation: ListCuration | undefined): void` (skriver normaliserat, sätter `curationSeen: true`)
  - `export function markListCurationSeen(listId: string): void`

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/list-curation.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { __resetForTests, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { applyCuration, curatedGroupCounts, mergeNameConflict, normalizeCuration } from './list-curation'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, markListCurationSeen, updateLiveTvListCuration, type LiveTvList } from './live-tv-data'

const ch = (name: string, group: string) => ({ name, group, url: `http://x/${name}`, tvgId: null, logo: null })

describe('applyCuration', () => {
  it('är identitet utan regler', () => {
    const items = [ch('a', 'Sport'), ch('b', 'News')]
    expect(applyCuration(items, undefined)).toEqual(items)
  })
  it('filtrerar bort dolda grupper', () => {
    const out = applyCuration([ch('a', 'Sport'), ch('b', 'News')], { hidden: ['News'], merges: [] })
    expect(out.map((c) => c.name)).toEqual(['a'])
  })
  it('skriver om grupper i en merge till merge-namnet', () => {
    const out = applyCuration([ch('a', 'UK Sport'), ch('b', 'Sports UK')], { hidden: [], merges: [{ name: 'Sport', groups: ['UK Sport', 'Sports UK'] }] })
    expect(out.map((c) => c.group)).toEqual(['Sport', 'Sport'])
  })
  it('behåller en multigrupp-kanal när bara en delgrupp döljs', () => {
    const out = applyCuration([ch('a', 'Sport;HD')], { hidden: ['HD'], merges: [] })
    expect(out[0].group).toBe('Sport')
  })
  it('tar bort en multigrupp-kanal när alla delgrupper är dolda', () => {
    expect(applyCuration([ch('a', 'Sport;HD')], { hidden: ['HD', 'Sport'], merges: [] })).toEqual([])
  })
  it('ger dubblettfritt gruppfält när två delgrupper landar i samma merge', () => {
    const out = applyCuration([ch('a', 'UK Sport;Sports UK')], { hidden: [], merges: [{ name: 'Sport', groups: ['UK Sport', 'Sports UK'] }] })
    expect(out[0].group).toBe('Sport')
  })
  it('lämnar kanaler utan grupp orörda', () => {
    const out = applyCuration([ch('a', '')], { hidden: ['X'], merges: [] })
    expect(out).toHaveLength(1)
  })
})

describe('normalizeCuration', () => {
  it('ger undefined för tom kuratering', () => {
    expect(normalizeCuration({ hidden: [], merges: [] })).toBeUndefined()
    expect(normalizeCuration(undefined)).toBeUndefined()
  })
  it('tar bort en grupp ur hidden när den också ingår i en merge, och kastar tomma namn', () => {
    const out = normalizeCuration({ hidden: ['A', 'A', ''], merges: [{ name: ' Sport ', groups: ['A', 'B', 'B'] }, { name: '', groups: ['C'] }] })
    expect(out).toEqual({ hidden: [], merges: [{ name: 'Sport', groups: ['A', 'B'] }] })
  })
  it('låter en grupp ingå i högst en merge (första vinner)', () => {
    const out = normalizeCuration({ hidden: [], merges: [{ name: 'X', groups: ['A'] }, { name: 'Y', groups: ['A', 'B'] }] })
    expect(out).toEqual({ hidden: [], merges: [{ name: 'X', groups: ['A'] }, { name: 'Y', groups: ['B'] }] })
  })
})

describe('curatedGroupCounts', () => {
  const groups = [{ name: 'A', count: 5 }, { name: 'B', count: 3 }, { name: 'C', count: 10 }]
  it('utan regler: sorterat efter antal fallande', () => {
    expect(curatedGroupCounts(groups, undefined).map((g) => g.name)).toEqual(['C', 'A', 'B'])
  })
  it('döljer och summerar merges', () => {
    const out = curatedGroupCounts(groups, { hidden: ['C'], merges: [{ name: 'AB', groups: ['A', 'B'] }] })
    expect(out).toEqual([{ name: 'AB', count: 8 }])
  })
  it('en merge vars grupper saknas i källan visas inte, men en delvis känd merge visas med känt antal', () => {
    const out = curatedGroupCounts(groups, { hidden: [], merges: [{ name: 'Gone', groups: ['Z'] }, { name: 'Part', groups: ['A', 'Z'] }] })
    expect(out.map((g) => g.name)).toEqual(['C', 'Part', 'B'])
    expect(out.find((g) => g.name === 'Part')?.count).toBe(5)
  })
})

describe('mergeNameConflict', () => {
  const groups = [{ name: 'Sport' }, { name: 'News' }]
  it('tomt namn', () => expect(mergeNameConflict('  ', groups, { hidden: [], merges: [] })).toBe('empty'))
  it('kollision med synlig originalgrupp', () => expect(mergeNameConflict('Sport', groups, { hidden: [], merges: [] })).toBe('visible-group'))
  it('tillåtet när originalgruppen är dold', () => expect(mergeNameConflict('Sport', groups, { hidden: ['Sport'], merges: [] })).toBeNull())
  it('kollision med befintlig merge', () => expect(mergeNameConflict('Mix', groups, { hidden: [], merges: [{ name: 'Mix', groups: ['News'] }] })).toBe('duplicate'))
})

describe('lagring', () => {
  const list: LiveTvList = { id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], kind: 'm3u', source: 'http://x/p.m3u', url: 'http://x/p.m3u' }
  beforeEach(() => { __resetForTests(); writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list]) })
  it('updateLiveTvListCuration skriver normaliserat och sätter curationSeen', () => {
    updateLiveTvListCuration('l1', { hidden: ['X', 'X'], merges: [] })
    const stored = getLiveTvLists().find((l) => l.id === 'l1')!
    expect(stored.curation).toEqual({ hidden: ['X'], merges: [] })
    expect(stored.curationSeen).toBe(true)
  })
  it('tom kuratering sparas som frånvarande fält', () => {
    updateLiveTvListCuration('l1', { hidden: [], merges: [] })
    const raw = readPluginJson<LiveTvList[]>(LIVE_TV_PLUGIN_ID, 'lists', [])
    expect('curation' in raw[0]).toBe(false)
  })
  it('markListCurationSeen rör inte reglerna', () => {
    updateLiveTvListCuration('l1', { hidden: ['X'], merges: [] })
    markListCurationSeen('l1')
    expect(getLiveTvLists()[0].curation).toEqual({ hidden: ['X'], merges: [] })
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `npx vitest run runtime/list-curation.test.ts`
Expected: FAIL — `./list-curation` saknas.

- [ ] **Step 3: Lägg typerna och lagringen i `live-tv-data.ts`**

I `LiveTvList` (efter `truncated?: boolean`):

```ts
  /**
   * Kategorikuratering per källa (spec 2026-09-24): dolda originalgrupper
   * och ihopslagningar. Tillämpas i modellen ovanpå indexet
   * (`applyCuration` i list-curation.ts) — indexet bär alltid
   * originalgrupperna, så `groups` nedan är OKURATERADE.
   * Frånvarande = allt syns.
   */
  curation?: ListCuration
  /** Kategoripanelen har visats (sparad eller överhoppad) efter en import. */
  curationSeen?: boolean
```

Före `LiveTvList`:

```ts
export interface ListCuration {
  /** Originalgruppnamn som döljs. */
  hidden: string[]
  /** Ihopslagningar; `groups` är originalgruppnamn, `name` det nya namnet. */
  merges: { name: string; groups: string[] }[]
}
```

Efter `updateLiveTvListEpg`:

```ts
/** Skriver kurateringen normaliserad (tom = fältet tas bort) och markerar panelen som visad. */
export function updateLiveTvListCuration(listId: string, curation: ListCuration | undefined): void {
  const normalized = normalizeCuration(curation)
  writeLists(
    readLists().map((list) => {
      if (list.id !== listId) return list
      const { curation: _dropped, ...rest } = list
      return normalized ? { ...rest, curation: normalized, curationSeen: true } : { ...rest, curationSeen: true }
    }),
  )
}

export function markListCurationSeen(listId: string): void {
  writeLists(readLists().map((list) => (list.id === listId ? { ...list, curationSeen: true } : list)))
}
```

Import överst: `import { normalizeCuration } from './list-curation'`. `list-curation.ts` får inte importera från `live-tv-data.ts` annat än typen (`import type { ListCuration } from './live-tv-data'`) — annars cykel.

- [ ] **Step 4: Skriv `runtime/list-curation.ts`**

```ts
import type { ListCuration } from './live-tv-data'

/**
 * Rena funktioner för kategorikuratering (spec 2026-09-24). Gruppfältet kan
 * vara semikolonseparerat ("Sport;HD") — samma regel som Rust-indexets
 * `groups_of`: varje delgrupp bedöms för sig.
 */

function splitGroups(group: string): string[] {
  return group.split(';').map((s) => s.trim()).filter(Boolean)
}

export function normalizeCuration(curation: ListCuration | undefined): ListCuration | undefined {
  if (!curation) return undefined
  const merges: { name: string; groups: string[] }[] = []
  const claimed = new Set<string>()
  const names = new Set<string>()
  for (const merge of curation.merges ?? []) {
    const name = (merge.name ?? '').trim()
    if (!name || names.has(name)) continue
    const groups: string[] = []
    for (const raw of merge.groups ?? []) {
      const g = (raw ?? '').trim()
      if (!g || claimed.has(g)) continue
      claimed.add(g)
      groups.push(g)
    }
    if (groups.length === 0) continue
    names.add(name)
    merges.push({ name, groups })
  }
  const hidden: string[] = []
  for (const raw of curation.hidden ?? []) {
    const g = (raw ?? '').trim()
    if (!g || claimed.has(g) || hidden.includes(g)) continue
    hidden.push(g)
  }
  if (hidden.length === 0 && merges.length === 0) return undefined
  return { hidden, merges }
}

function mergeNameFor(curation: ListCuration): Map<string, string> {
  const map = new Map<string, string>()
  for (const merge of curation.merges) for (const g of merge.groups) map.set(g, merge.name)
  return map
}

export function applyCuration<T extends { group: string }>(channels: readonly T[], curation: ListCuration | undefined): T[] {
  if (!curation || (curation.hidden.length === 0 && curation.merges.length === 0)) return [...channels]
  const hidden = new Set(curation.hidden)
  const renamed = mergeNameFor(curation)
  const out: T[] = []
  for (const channel of channels) {
    const parts = splitGroups(channel.group)
    if (parts.length === 0) { out.push(channel); continue }
    const kept: string[] = []
    for (const part of parts) {
      if (hidden.has(part)) continue
      const name = renamed.get(part) ?? part
      if (!kept.includes(name)) kept.push(name)
    }
    if (kept.length === 0) continue
    const group = kept.join(';')
    out.push(group === channel.group ? channel : { ...channel, group })
  }
  return out
}

export function curatedGroupCounts(
  groups: readonly { name: string; count: number }[],
  curation: ListCuration | undefined,
): { name: string; count: number }[] {
  const hidden = new Set(curation?.hidden ?? [])
  const renamed = curation ? mergeNameFor(curation) : new Map<string, string>()
  const counts = new Map<string, number>()
  for (const { name, count } of groups) {
    if (hidden.has(name)) continue
    const target = renamed.get(name) ?? name
    counts.set(target, (counts.get(target) ?? 0) + count)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function mergeNameConflict(
  name: string,
  groups: readonly { name: string }[],
  curation: ListCuration,
): 'empty' | 'duplicate' | 'visible-group' | null {
  const trimmed = name.trim()
  if (!trimmed) return 'empty'
  if (curation.merges.some((m) => m.name === trimmed)) return 'duplicate'
  const claimed = new Set(curation.merges.flatMap((m) => m.groups))
  const hidden = new Set(curation.hidden)
  if (groups.some((g) => g.name === trimmed && !hidden.has(g.name) && !claimed.has(g.name))) return 'visible-group'
  return null
}
```

- [ ] **Step 5: Kör testerna**

Run: `npx vitest run runtime/list-curation.test.ts`
Expected: PASS (alla).

- [ ] **Step 6: Typkontroll och commit**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: inga fel.

```bash
git add plugins/live-tv/runtime/list-curation.ts plugins/live-tv/runtime/list-curation.test.ts plugins/live-tv/runtime/live-tv-data.ts
git commit -m "live-tv: kurateringsmodell per lista — dolda grupper, ihopslagningar, normalisering"
```

---

### Task 2: Tillämpa kurateringen i modellen och exponera hela grupplistan

**Files:**
- Modify: `runtime/live-tv-model.ts` (`loadChannelsShared` rad 409–445; `ensureLogoFallbackSwitchSubscription` rad 306–320 som mönster; `groups`-memot rad 621; `LiveTvModel` rad 110–150; returobjektet rad 836–850; `__resetLiveTvModelForTests` rad 454–468)
- Create: `runtime/live-tv-model-curation.test.ts`

**Interfaces:**
- Consumes: `applyCuration`, `curatedGroupCounts` (Task 1); `getLiveTvLists`, `onLiveTvListsChanged` (befintliga).
- Produces: `LiveTvModel.groups: string[]` = alla kuraterade gruppnamn sorterade efter antal; `LiveTvModel.groupCounts: { name: string; count: number }[]`; `export function curationForSource(source: string): ListCuration | undefined`.

- [ ] **Step 1: Skriv fallerande test**

```ts
// runtime/live-tv-model-curation.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests, getPluginMemoryCache, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, updateLiveTvListCuration, type LiveTvList } from './live-tv-data'
import { __resetLiveTvModelForTests, channelsCacheKey, curationForSource, loadChannelsShared } from './live-tv-model'

const SOURCE = 'http://x/p.m3u'
const list: LiveTvList = { id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], kind: 'm3u', source: SOURCE, url: SOURCE, curation: { hidden: ['News'], merges: [{ name: 'Sport', groups: ['UK Sport'] }] } }
const ITEMS = [
  { name: 'a', group: 'UK Sport', url: 'http://x/a', tvgId: null, logo: null, key: 'a::http://x/a', number: 1, tvgIdResolved: null },
  { name: 'b', group: 'News', url: 'http://x/b', tvgId: null, logo: null, key: 'b::http://x/b', number: 2, tvgIdResolved: null },
]

beforeEach(() => {
  __resetForTests(); __resetLiveTvModelForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true, status: 200,
    json: async () => (String(url).includes('/api/live-tv/status') ? { sourceIds: [SOURCE], sources: [] } : { items: ITEMS, total: ITEMS.length, known: true }),
  })))
})
afterEach(() => vi.unstubAllGlobals())

describe('kuratering i modellen', () => {
  it('första listan för källan ger kurateringen', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list, { ...list, id: 'l2', curation: undefined }])
    expect(curationForSource(SOURCE)?.hidden).toEqual(['News'])
  })
  it('tillämpas när kanalerna laddas och hamnar kuraterade i cachen', async () => {
    const items = await loadChannelsShared(SOURCE)
    expect(items.map((c) => `${c.name}:${c.group}`)).toEqual(['a:Sport'])
    expect(getPluginMemoryCache<unknown[]>(LIVE_TV_PLUGIN_ID, channelsCacheKey(SOURCE))).toHaveLength(1)
  })
  it('sparad kuratering nollställer källans cache och "alla"', async () => {
    await loadChannelsShared(SOURCE)
    updateLiveTvListCuration('l1', undefined)
    expect(getPluginMemoryCache(LIVE_TV_PLUGIN_ID, channelsCacheKey(SOURCE))).toBeUndefined()
    expect(getPluginMemoryCache(LIVE_TV_PLUGIN_ID, channelsCacheKey(null))).toBeUndefined()
    const items = await loadChannelsShared(SOURCE)
    expect(items).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Kör och se det falla**

Run: `npx vitest run runtime/live-tv-model-curation.test.ts`
Expected: FAIL — `curationForSource` saknas / kanalerna okuraterade.

- [ ] **Step 3: Implementera i modellen**

Import: `import { applyCuration, curatedGroupCounts } from './list-curation'` och `type ListCuration` från `./live-tv-data`.

Ny exporterad funktion intill `logoFallbackStateSnapshot`:

```ts
/** Första listan för källan vinner — samma upplösning som logotypswitchen. */
export function curationForSource(source: string): ListCuration | undefined {
  return getLiveTvLists().find((entry) => entry.source === source)?.curation
}

let curationSubscription: (() => void) | null = null
let curationBySource: Map<string, string> | null = null

function curationSnapshot(): Map<string, string> {
  const snapshot = new Map<string, string>()
  for (const list of getLiveTvLists()) {
    if (!list.source || snapshot.has(list.source)) continue
    snapshot.set(list.source, JSON.stringify(list.curation ?? null))
  }
  return snapshot
}

/**
 * Sparad kuratering måste nå de kanaler som redan ligger varma i minnet —
 * annars ser Spara ut att göra ingenting tills något orelaterat tömmer cachen.
 * Samma mönster som `ensureLogoFallbackSwitchSubscription`.
 */
function ensureCurationSubscription(): void {
  if (curationSubscription || typeof window === 'undefined') return
  curationBySource = curationSnapshot()
  curationSubscription = onLiveTvListsChanged(() => {
    const next = curationSnapshot()
    const previous = curationBySource
    curationBySource = next
    let changed = false
    for (const [source, value] of next) {
      if (previous?.get(source) === value) continue
      changed = true
      channelAborts.get(channelsCacheKey(source))?.abort()
      channelLoads.delete(channelsCacheKey(source))
      clearPluginMemoryCache(LIVE_TV_PLUGIN_ID, channelsCacheKey(source))
    }
    if (changed) {
      channelAborts.get(channelsCacheKey(null))?.abort()
      channelLoads.delete(channelsCacheKey(null))
      clearPluginMemoryCache(LIVE_TV_PLUGIN_ID, channelsCacheKey(null))
      for (const listener of generationListeners) listener()
    }
  })
}
```

I `loadChannelsShared`: anropa `ensureCurationSubscription()` direkt efter `ensureLogoFallbackSwitchSubscription()`, och byt raden `if (source !== null) applyLogoFallbackSwitch(source, items)` mot:

```ts
    if (source !== null) applyLogoFallbackSwitch(source, items)
    const curated = source !== null ? applyCuration(items, curationForSource(source)) : items
    setPluginMemoryCache(LIVE_TV_PLUGIN_ID, cacheKey, curated)
    return curated
```

(`loadEveryChannel` bygger "alla" av `loadChannelsShared(source)` per källa, så unionen blir kuraterad utan mer kod.)

Grupperna: ersätt `const groups = useMemo(() => topGroups(channels), [channels])` med

```ts
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const channel of channels) {
      for (const part of String(channel.group ?? '').split(';').map((s) => s.trim()).filter(Boolean)) {
        counts.set(part, (counts.get(part) ?? 0) + 1)
      }
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [channels])
  const groups = useMemo(() => groupCounts.map((g) => g.name), [groupCounts])
```

(Kanalerna är redan kuraterade här, så `curatedGroupCounts` behövs inte i modellen; den används av panelen mot listans okuraterade kvitto.)

`LiveTvModel`: ändra doc på `groups` till "Alla kuraterade gruppnamn, sorterade efter antal fallande" och lägg till `groupCounts: { name: string; count: number }[]`. Returobjektet: lägg `groupCounts,` efter `groups,`. `__resetLiveTvModelForTests`: lägg till `curationSubscription?.(); curationSubscription = null; curationBySource = null`.

- [ ] **Step 4: Kör hela testsviten**

Run: `npx vitest run`
Expected: PASS. Om något test förutsatte att `model.groups` var åtta poster, uppdatera testet (chipraden tar `.slice(0, MAX_CHIPS)` i `hub-data.ts` och påverkas inte).

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/runtime/live-tv-model.ts plugins/live-tv/runtime/live-tv-model-curation.test.ts
git commit -m "live-tv: kurateringen tillämpas per källa i modellen; groups = hela listan, groupCounts nytt"
```

---

### Task 3: Kategorimenyn ur modellen, med antal och tomt tillstånd

**Files:**
- Modify: `runtime/live-tv-grid.tsx` (`categories` rad 732–745; menyn rad 1105–1160; tomt tillstånd där `filtered.length === 0` renderas)
- Modify: `runtime/live-tv-grid-categories.test.tsx`
- Modify: `runtime/hub-strings.ts` (nycklar `allCategoriesHidden`, `openCategories`)

**Interfaces:**
- Consumes: `model.groupCounts` (Task 2).
- Produces: rutnätet skickar `data-testid="grid-open-curation"` på knappen i tomma tillståndet; knappen anropar `openCurationForList(list)` som Task 5 kopplar in (tills dess `window.dispatchEvent(new CustomEvent('lumio-live-tv-open-curation', { detail: { listId } }))`).

- [ ] **Step 1: Utöka testet**

Lägg i `live-tv-grid-categories.test.tsx`:

```ts
  it('listar alla kategorier med antal ur modellen, oberoende av sidan som visas', async () => {
    render(<LiveTvGrid />)
    fireEvent.click(await screen.findByRole('button', { name: /allCategories/i }))
    expect(await screen.findByRole('button', { name: /Land 97/ })).toHaveTextContent('1')
    expect(screen.getAllByRole('button', { name: /^Land / })).toHaveLength(97)
  })
  it('visar ett tomt tillstånd med väg till panelen när alla kategorier är dolda', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ id: 'l1', name: 'P', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], kind: 'm3u', source: PLAYLIST_URL, url: PLAYLIST_URL, curation: { hidden: CATEGORIES, merges: [] } }])
    render(<LiveTvGrid />)
    expect(await screen.findByText(/all categories in this playlist are hidden/i)).toBeInTheDocument()
    expect(screen.getByTestId('grid-open-curation')).toBeInTheDocument()
  })
```

(`t()` ur stubbens `useLang` returnerar nyckelnamnet; `h()` ur `useHubText` returnerar den engelska texten — matcha därefter.)

- [ ] **Step 2: Kör och se de nya falla**

Run: `npx vitest run runtime/live-tv-grid-categories.test.tsx`
Expected: två FAIL.

- [ ] **Step 3: Implementera**

I `live-tv-grid.tsx`: ta bort `categories`-memot ur `visibleChannels` och ersätt med

```ts
  // Hela den kuraterade listan ur modellen — inte det som råkar vara laddat i
  // vyn (testaren såg nio kategorier av flera hundra).
  const categories = model.groupCounts
```

I menyn: `categories.map((cat) => …)` blir `categories.map(({ name: cat, count }) => …)`, `key={cat}`, och antalet läggs till höger: `<span className="text-slate-500 tabular-nums">{count.toLocaleString(locale)}</span>` före bocken (locale finns i komponenten via `useHubText`/`useLang`; om inte, använd `count.toLocaleString()`).

Tomt tillstånd: där rutnätet visar "inga kanaler" när `filtered.length === 0 && !loading`, lägg ett fall före: om `model.channels.length === 0 && (activeList ?? model.lists.find((l) => l.source === model.activeSource))?.curation?.hidden.length` är större än 0:

```tsx
<div className="flex flex-col items-center gap-3 py-16 text-center">
  <p className="text-sm text-slate-300">{h('allCategoriesHidden')}</p>
  <button type="button" data-testid="grid-open-curation" className={neutralPillClass}
    onClick={() => window.dispatchEvent(new CustomEvent('lumio-live-tv-open-curation', { detail: { listId: curatedList.id } }))}>
    {h('openCategories')}
  </button>
</div>
```

Strängar i `hub-strings.ts` (EN/SV): `allCategoriesHidden: 'All categories in this playlist are hidden.' / 'Alla kategorier i den här spellistan är dolda.'`, `openCategories: 'Choose categories' / 'Välj kategorier'`.

- [ ] **Step 4: Kör testerna**

Run: `npx vitest run runtime/live-tv-grid-categories.test.tsx runtime/live-tv-grid-guide.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/runtime/live-tv-grid.tsx plugins/live-tv/runtime/live-tv-grid-categories.test.tsx plugins/live-tv/runtime/hub-strings.ts
git commit -m "live-tv: kategorimenyn listar hela den kuraterade grupplistan med antal; tomt tillstånd när allt är dolt"
```

---

### Task 4: Strängar för panelerna

**Files:**
- Modify: `runtime/hub-strings.ts` (EN och SV)
- Modify: `runtime/tv/tv-strings.ts` (EN och SV)

**Interfaces:**
- Produces nycklar (samma namn i båda tabellerna): `categories`, `curationSummary` ('{groups} categories · {hidden} hidden · {merged} merged'), `showAll`, `hideAll`, `mergeInto`, `mergeAction`, `mergeSelected` ('Merge selected ({n})'), `splitMerge`, `mergeContains` ('Contains {groups}'), `markForMerge`, `save`, `skip`, `cancel`, `mergeNameLabel`, `mergeNameEmpty`, `mergeNameTaken`, `mergeNameIsGroup`, `noCategoriesInList`, `searchCategories`, `curationIntro` ('Choose which categories to show. You can change this later under the playlist's settings.').

- [ ] **Step 1: Lägg in nycklarna**

EN (hub-strings.ts och tv-strings.ts):

```ts
  categories: 'Categories',
  curationSummary: '{groups} categories · {hidden} hidden · {merged} merged',
  showAll: 'Show all',
  hideAll: 'Hide all',
  mergeInto: 'Merge into…',
  mergeAction: 'Merge',
  mergeSelected: 'Merge selected ({n})',
  splitMerge: 'Split',
  mergeContains: 'Contains {groups}',
  markForMerge: 'Mark',
  save: 'Save',
  skip: 'Skip',
  cancel: 'Cancel',
  mergeNameLabel: 'Name of the merged category',
  mergeNameEmpty: 'Give the category a name.',
  mergeNameTaken: 'A merged category with that name already exists.',
  mergeNameIsGroup: 'That name is already a visible category.',
  noCategoriesInList: 'This playlist has no categories.',
  searchCategories: 'Search categories',
  curationIntro: 'Choose which categories to show. You can change this later under the playlist’s settings.',
```

SV:

```ts
  categories: 'Kategorier',
  curationSummary: '{groups} kategorier · {hidden} dolda · {merged} ihopslagna',
  showAll: 'Visa alla',
  hideAll: 'Dölj alla',
  mergeInto: 'Slå ihop till…',
  mergeAction: 'Slå ihop',
  mergeSelected: 'Slå ihop markerade ({n})',
  splitMerge: 'Dela upp',
  mergeContains: 'Innehåller {groups}',
  markForMerge: 'Markera',
  save: 'Spara',
  skip: 'Hoppa över',
  cancel: 'Avbryt',
  mergeNameLabel: 'Namn på den ihopslagna kategorin',
  mergeNameEmpty: 'Ge kategorin ett namn.',
  mergeNameTaken: 'Det finns redan en ihopslagen kategori med det namnet.',
  mergeNameIsGroup: 'Det namnet är redan en synlig kategori.',
  noCategoriesInList: 'Den här spellistan har inga kategorier.',
  searchCategories: 'Sök kategorier',
  curationIntro: 'Välj vilka kategorier som ska visas. Du kan ändra det senare under spellistans inställningar.',
```

Om en nyckel redan finns (t.ex. `cancel`, `save`), behåll den befintliga och lägg inte en dubblett.

- [ ] **Step 2: Typkontroll och commit**

Run: `npx tsc --noEmit -p tsconfig.json` (SV-tabellen i tv-strings är `Record<keyof typeof EN, string>` — en saknad nyckel faller här).

```bash
git add plugins/live-tv/runtime/hub-strings.ts plugins/live-tv/runtime/tv/tv-strings.ts
git commit -m "live-tv: strängar för kategoripanelen (en/sv)"
```

---

### Task 5: Panelen på skrivbord och telefon + knapp och auto-öppning i inställningarna

**Files:**
- Create: `runtime/category-curation-panel.tsx`
- Create: `runtime/category-curation-panel.test.tsx`
- Modify: `runtime/live-tv-settings-section.tsx` (listkortets knapprad rad ~360–376; `handleFetchM3uList` rad ~120–148; `handleRefetchList` rad ~170–180; lyssnare på `lumio-live-tv-open-curation`)

**Interfaces:**
- Consumes: `curatedGroupCounts`, `mergeNameConflict`, `normalizeCuration` (Task 1), `updateLiveTvListCuration`, `markListCurationSeen` (Task 1), `listGroups` (index-client), strängar (Task 4).
- Produces: `export function CategoryCurationPanel({ list, mode, onClose }: { list: LiveTvList; mode: 'settings' | 'after-import'; onClose: () => void })`. Panelen sköter själv Spara/Hoppa över/Avbryt och anropar `onClose()` efteråt.

- [ ] **Step 1: Skriv fallerande tester**

```tsx
// runtime/category-curation-panel.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { CategoryCurationPanel } from './category-curation-panel'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, type LiveTvList } from './live-tv-data'

const SOURCE = 'http://x/p.m3u'
const list: LiveTvList = { id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], kind: 'm3u', source: SOURCE, url: SOURCE, groups: [{ name: 'Sport', count: 5 }, { name: 'News', count: 3 }, { name: 'Kids', count: 1 }] }

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ groups: list.groups }) })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('CategoryCurationPanel', () => {
  it('Spara skriver dolda grupper och curationSeen', async () => {
    const onClose = vi.fn()
    render(<CategoryCurationPanel list={list} mode="settings" onClose={onClose} />)
    fireEvent.click(await screen.findByLabelText('News'))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const stored = getLiveTvLists()[0]
    expect(stored.curation).toEqual({ hidden: ['News'], merges: [] })
    expect(stored.curationSeen).toBe(true)
  })
  it('Hoppa över skriver bara curationSeen', async () => {
    const onClose = vi.fn()
    render(<CategoryCurationPanel list={list} mode="after-import" onClose={onClose} />)
    fireEvent.click(await screen.findByRole('button', { name: /^skip$/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(getLiveTvLists()[0].curationSeen).toBe(true)
    expect(getLiveTvLists()[0].curation).toBeUndefined()
  })
  it('Slå ihop kräver två markerade och ett namn som inte krockar', async () => {
    render(<CategoryCurationPanel list={list} mode="settings" onClose={() => {}} />)
    await screen.findByLabelText('News')
    fireEvent.click(screen.getByTestId('mark-Sport'))
    expect(screen.queryByRole('button', { name: /^merge$/i })).toBeNull()
    fireEvent.click(screen.getByTestId('mark-News'))
    fireEvent.change(screen.getByLabelText(/name of the merged category/i), { target: { value: 'Kids' } })
    fireEvent.click(screen.getByRole('button', { name: /^merge$/i }))
    expect(screen.getByText(/already a visible category/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/name of the merged category/i), { target: { value: 'Mix' } })
    fireEvent.click(screen.getByRole('button', { name: /^merge$/i }))
    expect(screen.getByText('Mix')).toBeInTheDocument()
    expect(screen.getByText(/contains sport, news/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(getLiveTvLists()[0].curation?.merges).toEqual([{ name: 'Mix', groups: ['Sport', 'News'] }]))
  })
  it('en merge med en grupp leverantören tagit bort visas med de grupper som finns', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, curation: { hidden: [], merges: [{ name: 'Mix', groups: ['Sport', 'Gone'] }] } }])
    render(<CategoryCurationPanel list={getLiveTvLists()[0]} mode="settings" onClose={() => {}} />)
    expect(await screen.findByText('Mix')).toBeInTheDocument()
    expect(screen.queryByText('Gone')).toBeNull()
  })
})
```

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/category-curation-panel.test.tsx`
Expected: FAIL — komponenten saknas.

- [ ] **Step 3: Skriv komponenten**

```tsx
// runtime/category-curation-panel.tsx
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
 * Kategoripanelen (spec 2026-09-24). Allt är lokalt tillstånd tills Spara;
 * Avbryt/Hoppa över kastar ändringarna. Underlaget är listans OKURATERADE
 * grupper ur indexet (`listGroups`), med kvittot `list.groups` som reserv.
 */
export function CategoryCurationPanel({ list, mode, onClose }: { list: LiveTvList; mode: 'settings' | 'after-import'; onClose: () => void }) {
  const { h, locale } = useHubText()
  const [groups, setGroups] = useState<{ name: string; count: number }[] | null>(null)
  const [draft, setDraft] = useState<ListCuration>(() => ({ hidden: [...(list.curation?.hidden ?? [])], merges: (list.curation?.merges ?? []).map((m) => ({ name: m.name, groups: [...m.groups] })) }))
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
    const merged: Row[] = draft.merges
      .map((m) => ({ kind: 'merge' as const, name: m.name, groups: m.groups.filter((g) => known.has(g)), count: groups.filter((g) => m.groups.includes(g.name)).reduce((sum, g) => sum + g.count, 0) }))
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
  const toggleMark = (name: string) => setMarked((m) => { const next = new Set(m); if (next.has(name)) next.delete(name); else next.add(name); return next })
  const merge = () => {
    const conflict = mergeNameConflict(mergeName, groups ?? [], draft)
    if (conflict) { setMergeError(conflict === 'empty' ? h('mergeNameEmpty') : conflict === 'duplicate' ? h('mergeNameTaken') : h('mergeNameIsGroup')); return }
    const members = [...marked]
    setDraft((d) => ({ hidden: d.hidden.filter((g) => !members.includes(g)), merges: [...d.merges, { name: mergeName.trim(), groups: members }] }))
    setMarked(new Set()); setMergeName(''); setMergeError(null)
  }
  const split = (name: string) => setDraft((d) => ({ ...d, merges: d.merges.filter((m) => m.name !== name) }))
  const save = () => { updateLiveTvListCuration(list.id, normalizeCuration(draft)); onClose() }
  const skip = () => { markListCurationSeen(list.id); onClose() }

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${TOKENS.border}` } as const

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>{h('categories')} · {list.name}</div>
          {groups ? (
            <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>
              {h('curationSummary', { groups: visibleCount.toLocaleString(locale), hidden: draft.hidden.filter((g) => known.has(g)).length, merged: draft.merges.length })}
            </div>
          ) : null}
          {mode === 'after-import' ? <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 6 }}>{h('curationIntro')}</div> : null}
        </div>
        {groups && groups.length === 0 ? (
          <div style={{ fontSize: 13, color: TOKENS.textMute }}>{h('noCategoriesInList')}</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input aria-label={h('searchCategories')} placeholder={h('searchCategories')} value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160, padding: '0 12px' }} />
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
                <input aria-label={h('mergeNameLabel')} placeholder={h('mergeInto')} value={mergeName} onChange={(e) => { setMergeName(e.target.value); setMergeError(null) }} style={{ ...inputStyle, flex: 1, minWidth: 160, padding: '0 12px' }} />
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
```

Kontrollera att `Checkbox` i `@/lib/plugin-sdk` tar `label` och att `PillBtn` tar `size`/`variant` som i `live-tv-settings-section.tsx`; anpassa prop-namnen efter den riktiga SDK:n (stubben i `src/__test-stubs__/plugin-sdk.ts` speglar den).

- [ ] **Step 4: Koppla in i inställningarna**

I `LiveTvSettingsSection`:

```ts
  const [curationList, setCurationList] = useState<{ list: LiveTvList; mode: 'settings' | 'after-import' } | null>(null)
  useEffect(() => {
    const onOpen = (event: Event) => {
      const listId = (event as CustomEvent<{ listId: string }>).detail?.listId
      const target = getLiveTvLists().find((entry) => entry.id === listId)
      if (target) setCurationList({ list: target, mode: 'settings' })
    }
    window.addEventListener('lumio-live-tv-open-curation', onOpen)
    return () => window.removeEventListener('lumio-live-tv-open-curation', onOpen)
  }, [])
  /** Öppnas EN gång per lista: efter den första importen som svarar done. */
  function maybeOpenCurationAfterImport(listId: string) {
    const fresh = getLiveTvLists().find((entry) => entry.id === listId)
    if (fresh && fresh.curationSeen !== true) setCurationList({ list: fresh, mode: 'after-import' })
  }
```

I `handleFetchM3uList`, efter `importList` när `status.state !== 'error'`: `maybeOpenCurationAfterImport(list.id)`. I `handleRefetchList`, efter `recordListImportOutcome(...)` när `status.state === 'done'`: `maybeOpenCurationAfterImport(list.id)`. (En lista som redan har `curationSeen` öppnar inget — det är villkoret i funktionen.)

På listkortets knapprad, före Ta bort-knappen, för `importable`-listor:

```tsx
<PillBtn size="sm" onClick={() => setCurationList({ list, mode: 'settings' })}>{h('categories')}</PillBtn>
```

Rendera panelen direkt efter listkorten:

```tsx
{curationList ? <CategoryCurationPanel list={curationList.list} mode={curationList.mode} onClose={() => setCurationList(null)} /> : null}
```

- [ ] **Step 5: Kör testerna**

Run: `npx vitest run runtime/category-curation-panel.test.tsx runtime/live-tv-ui.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/live-tv/runtime/category-curation-panel.tsx plugins/live-tv/runtime/category-curation-panel.test.tsx plugins/live-tv/runtime/live-tv-settings-section.tsx
git commit -m "live-tv: kategoripanel på skrivbord/telefon, knapp per lista, öppnas efter första importen"
```

---

### Task 6: Panelen på TV + rad i Spellistor + auto-öppning

**Files:**
- Create: `runtime/tv/tv-curation-picker.tsx`
- Create: `runtime/tv/tv-curation-picker.test.tsx`
- Modify: `runtime/tv/tv-list-picker.tsx` (exportera `PickerPanel` och `Check`: byt `function PickerPanel` → `export function PickerPanel`, `function Check` → `export function Check`)
- Modify: `runtime/tv/settings-tabs.tsx` (`ListRow` rad 182–340: ny prop `onCategories`; `PlaylistsTab` rad 351–600: tillstånd, rad, picker, auto-öppning i `runImport`)

**Interfaces:**
- Consumes: Task 1 (`curatedGroupCounts`, `mergeNameConflict`, `normalizeCuration`, `updateLiveTvListCuration`, `markListCurationSeen`), `listGroups`, `PickerPanel`, `Check`, `station`, `dp`, `TV`, `useTvText`, `useTextPrompt`, strängar (Task 4).
- Produces: `export function TvCurationPicker({ nav, list, mode, keyboard, onClose }: { nav: TvNav; list: LiveTvList; mode: 'settings' | 'after-import'; keyboard: ReturnType<typeof useTextPrompt>; onClose: () => void })`.

- [ ] **Step 1: Skriv fallerande test**

```tsx
// runtime/tv/tv-curation-picker.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { TvCurationPicker } from './tv-curation-picker'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, type LiveTvList } from '../live-tv-data'

const SOURCE = 'http://x/p.m3u'
const list: LiveTvList = { id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], kind: 'm3u', source: SOURCE, url: SOURCE, groups: [{ name: 'Sport', count: 5 }, { name: 'News', count: 3 }] }
const nav = { pushLayer: () => () => {} } as never
const keyboard = { available: true, node: null, ask: (_t: string, _v: string, cb: (value: string) => void) => cb('Mix') } as never

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ groups: list.groups }) })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('TvCurationPicker', () => {
  it('OK på en grupprad döljer den, Spara skriver', async () => {
    const onClose = vi.fn()
    render(<TvCurationPicker nav={nav} list={list} mode="settings" keyboard={keyboard} onClose={onClose} />)
    fireEvent.click(await screen.findByTestId('curation-row-News'))
    fireEvent.click(screen.getByTestId('curation-save'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(getLiveTvLists()[0].curation).toEqual({ hidden: ['News'], merges: [] })
  })
  it('Slå ihop-läge: markera två, Klar frågar efter namn och skapar mergen', async () => {
    render(<TvCurationPicker nav={nav} list={list} mode="settings" keyboard={keyboard} onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('curation-merge-mode'))
    fireEvent.click(screen.getByTestId('curation-row-Sport'))
    fireEvent.click(screen.getByTestId('curation-row-News'))
    fireEvent.click(screen.getByTestId('curation-merge-done'))
    expect(await screen.findByText('Mix')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('curation-save'))
    await waitFor(() => expect(getLiveTvLists()[0].curation?.merges).toEqual([{ name: 'Mix', groups: ['Sport', 'News'] }]))
  })
  it('Hoppa över skriver bara curationSeen', async () => {
    const onClose = vi.fn()
    render(<TvCurationPicker nav={nav} list={list} mode="after-import" keyboard={keyboard} onClose={onClose} />)
    fireEvent.click(await screen.findByTestId('curation-skip'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(getLiveTvLists()[0].curationSeen).toBe(true)
  })
})
```

(`station(onOk)` binder OK till klick/Enter på elementet — kontrollera i `tv-ui.tsx:229` att `onClick` sätts; annars använd `fireEvent.keyDown(el, { key: 'Enter' })`.)

- [ ] **Step 2: Kör och se det falla**

Run: `npx vitest run runtime/tv/tv-curation-picker.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Skriv komponenten**

```tsx
// runtime/tv/tv-curation-picker.tsx
import { useEffect, useMemo, useState } from 'react'
import type { TvNav } from './tv-shell'
import { TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { Check, PickerPanel } from './tv-list-picker'
import type { useTextPrompt } from './tv-text-entry'
import { listGroups } from '../index-client'
import { curatedGroupCounts, mergeNameConflict, normalizeCuration } from '../list-curation'
import { markListCurationSeen, updateLiveTvListCuration, type ListCuration, type LiveTvList } from '../live-tv-data'

const rowStyle = { height: dp(64), minHeight: dp(64), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, fontSize: dp(19), cursor: 'pointer' } as const

export function TvCurationPicker({ nav, list, mode, keyboard, onClose }: {
  nav: TvNav
  list: LiveTvList
  mode: 'settings' | 'after-import'
  keyboard: ReturnType<typeof useTextPrompt>
  onClose: () => void
}) {
  const { tt } = useTvText()
  const [groups, setGroups] = useState<{ name: string; count: number }[] | null>(null)
  const [draft, setDraft] = useState<ListCuration>(() => ({ hidden: [...(list.curation?.hidden ?? [])], merges: (list.curation?.merges ?? []).map((m) => ({ name: m.name, groups: [...m.groups] })) }))
  const [mergeMode, setMergeMode] = useState(false)
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    listGroups(list.source ?? null)
      .then((fetched) => { if (live) setGroups(fetched.length > 0 ? fetched : (list.groups ?? [])) })
      .catch(() => { if (live) setGroups(list.groups ?? []) })
    return () => { live = false }
  }, [list.source, list.groups])

  const known = useMemo(() => new Set((groups ?? []).map((g) => g.name)), [groups])
  const claimed = useMemo(() => new Set(draft.merges.flatMap((m) => m.groups)), [draft.merges])
  const merges = draft.merges.map((m) => ({ ...m, groups: m.groups.filter((g) => known.has(g)), count: (groups ?? []).filter((g) => m.groups.includes(g.name)).reduce((s, g) => s + g.count, 0) })).filter((m) => m.groups.length > 0)
  const plain = (groups ?? []).filter((g) => !claimed.has(g.name)).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const summary = groups ? tt('curationSummary', { groups: curatedGroupCounts(groups, draft).length, hidden: draft.hidden.filter((g) => known.has(g)).length, merged: draft.merges.length }) : ''

  const toggleHidden = (name: string) => setDraft((d) => ({ ...d, hidden: d.hidden.includes(name) ? d.hidden.filter((g) => g !== name) : [...d.hidden, name] }))
  const toggleMark = (name: string) => setMarked((m) => { const next = new Set(m); if (next.has(name)) next.delete(name); else next.add(name); return next })
  const finishMerge = () => {
    if (marked.size < 2) return
    keyboard.ask(tt('mergeNameLabel'), '', (value) => {
      const conflict = mergeNameConflict(value, groups ?? [], draft)
      if (conflict) { setError(conflict === 'empty' ? tt('mergeNameEmpty') : conflict === 'duplicate' ? tt('mergeNameTaken') : tt('mergeNameIsGroup')); return }
      const members = [...marked]
      setDraft((d) => ({ hidden: d.hidden.filter((g) => !members.includes(g)), merges: [...d.merges, { name: value.trim(), groups: members }] }))
      setMarked(new Set()); setMergeMode(false); setError(null)
    })
  }
  const save = () => { updateLiveTvListCuration(list.id, normalizeCuration(draft)); onClose() }
  const skip = () => { markListCurationSeen(list.id); onClose() }

  return (
    <PickerPanel
      nav={nav}
      title={`${tt('categories')} · ${list.name}`}
      testId="curation-picker"
      onClose={mode === 'after-import' ? skip : onClose}
      chips={<div style={{ fontSize: dp(16), color: TV.dim }}>{mode === 'after-import' ? tt('curationIntro') : summary}</div>}
      rows={(
        <>
          <div data-testid="curation-save" {...station(save, undefined, { 'data-init': '' })} style={{ ...rowStyle, color: TV.acc }}>{tt('save')}</div>
          <div data-testid="curation-skip" {...station(mode === 'after-import' ? skip : onClose)} style={rowStyle}>{mode === 'after-import' ? tt('skip') : tt('cancel')}</div>
          <div {...station(() => setDraft((d) => ({ ...d, hidden: [] })))} style={rowStyle}>{tt('showAll')}</div>
          <div {...station(() => setDraft((d) => ({ ...d, hidden: plain.map((g) => g.name) })))} style={rowStyle}>{tt('hideAll')}</div>
          <div data-testid="curation-merge-mode" {...station(() => { setMergeMode((m) => !m); setMarked(new Set()); setError(null) })} style={{ ...rowStyle, color: mergeMode ? TV.acc : undefined }}>{tt('mergeInto')}</div>
          {mergeMode ? <div data-testid="curation-merge-done" {...station(finishMerge)} style={{ ...rowStyle, color: marked.size >= 2 ? TV.acc : TV.dim }}>{tt('mergeSelected', { n: marked.size })}</div> : null}
          {error ? <div role="alert" style={{ padding: dp(12), fontSize: dp(16), color: '#fca5a5' }}>{error}</div> : null}
          {groups === null ? <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('loadingChannels')}</div> : null}
          {groups && groups.length === 0 ? <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('noCategoriesInList')}</div> : null}
          {merges.map((m) => (
            <div key={`m:${m.name}`} data-testid={`curation-merge-${m.name}`} {...station(() => setDraft((d) => ({ ...d, merges: d.merges.filter((x) => x.name !== m.name) })))} style={rowStyle}>
              <Check on label={m.name} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name} <span style={{ color: TV.dim, fontSize: dp(15) }}>· {tt('mergeContains', { groups: m.groups.join(', ') })} · {tt('splitMerge')}</span></span>
              <span style={{ color: TV.dim }}>{m.count}</span>
            </div>
          ))}
          {plain.map((g) => (
            <div key={`g:${g.name}`} data-testid={`curation-row-${g.name}`} {...station(() => (mergeMode ? toggleMark(g.name) : toggleHidden(g.name)))} style={rowStyle}>
              <Check on={mergeMode ? marked.has(g.name) : !draft.hidden.includes(g.name)} label={g.name} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: draft.hidden.includes(g.name) && !mergeMode ? TV.dim : undefined }}>{g.name}</span>
              <span style={{ color: TV.dim }}>{g.count}</span>
            </div>
          ))}
        </>
      )}
    />
  )
}
```

Lägg till nyckeln `loadingChannels` om den inte redan finns i tv-strings (den används av `TvCategoryPicker`, så den finns).

- [ ] **Step 4: Koppla in i `settings-tabs.tsx`**

`ListRow`: ny prop `onCategories: (list: LiveTvList) => void`; för `importable`-listor lägg `<Action phone={phone} testId={`list-categories-${list.id}`} label={tt('categories')} onOk={() => onCategories(list)} />` intill Uppdatera-knappen.

`PlaylistsTab`:

```ts
  const [curation, setCuration] = useState<{ listId: string; mode: 'settings' | 'after-import' } | null>(null)
  const onCategories = useCallback((list: LiveTvList) => setCuration({ listId: list.id, mode: 'settings' }), [])
```

I `runImport`, efter `recordListImportOutcome(list.id)` och före `return true`:

```ts
      const fresh = getLiveTvLists().find((entry) => entry.id === list.id)
      if (fresh && fresh.curationSeen !== true) setCuration({ listId: list.id, mode: 'after-import' })
```

Skicka `onCategories={onCategories}` till `ListRow`. Rendera efter `TvListPicker`-blocket:

```tsx
      {curation ? (() => {
        const target = lists.find((entry) => entry.id === curation.listId)
        return target ? <TvCurationPicker nav={nav} list={target} mode={curation.mode} keyboard={keyboard} onClose={() => setCuration(null)} /> : null
      })() : null}
```

Import: `import { TvCurationPicker } from './tv-curation-picker'`.

- [ ] **Step 5: Kör testerna**

Run: `npx vitest run runtime/tv`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-curation-picker.tsx plugins/live-tv/runtime/tv/tv-curation-picker.test.tsx plugins/live-tv/runtime/tv/tv-list-picker.tsx plugins/live-tv/runtime/tv/settings-tabs.tsx
git commit -m "live-tv: kategoripanel på TV — dölj med OK, slå ihop-läge med namn via tangentbordet, rad per lista, öppnas efter import"
```

---

### Task 7: Version, changelog, full kontroll och testbygge

**Files:**
- Modify: `plugin.json` och `package.json` (version 0.10.0 → 0.11.0)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Changelog överst**

```md
## 0.11.0 — Choose your categories

- Each playlist gets a Categories panel: untick the categories you never watch and merge duplicates ("UK Sport", "Sports UK", "UK Sport HD") into one. Hidden categories disappear everywhere — All, search, the guide — and merged ones replace their originals.
- The panel opens by itself after a playlist's first import, with Skip. Afterwards it lives under the playlist in settings, on desktop, phone and TV.
- The category menu now lists every category in the playlist with its channel count, instead of the ones that happened to be on screen.
```

- [ ] **Step 2: Version**

Ändra `"version"` till `0.11.0` i `plugin.json` och `package.json` (och `package-lock.json` om den bär versionen).

- [ ] **Step 3: Full kontroll**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run`
Expected: inga typfel, alla tester gröna.

- [ ] **Step 4: Bygg runtime från main-byggträdet (INTE release)**

Följ rutinen i minnesanteckningen "Lumio pluginbyggen från main": bygg från `.worktrees/main-plugin-build` med appens `scripts/build-plugin-runtime.mjs`, full typkontroll i grinden. Verifiera att `dist/runtime.js` innehåller strängen `curationSummary`. Ingen katalogpublicering utan Jerrys klartecken.

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/plugin.json plugins/live-tv/package.json plugins/live-tv/package-lock.json plugins/live-tv/CHANGELOG.md
git commit -m "live-tv 0.11.0: kategorikuratering per spellista"
```

Manuellt efteråt: tv-sim (`?tvmode=1`) och telefonbredd mot dev-servern, med en riktig m3u med > 50 grupper: dölj, slå ihop, spara, kontrollera att Alla/sök/guide följer, hoppa över efter en ny import.
