# Live TV Logotyper v2 — pluginet

> **För agenter:** OBLIGATORISK UNDERSKILL: `superpowers:subagent-driven-development`
> (rekommenderas) eller `superpowers:executing-plans`. Stegen är kryssrutor.

**Mål:** Kanalkortet faller tillbaka på en iptv-org-logotyp när leverantörens saknas eller fallerar, styrt av en switch per lista och fyllt av knappen "Komplettera".

**Arkitektur:** Reserven är ett eget fält (`logoFallback`) som appen skriver på kanalerna i indexet. Pluginet läser det, aldrig skriver det. Bytet från leverantör till reserv sker på ett enda ställe — `LiveTvLogoImage` — så alla fyra renderingsplatser ärver beteendet. Switchen per lista filtrerar bort fältet redan när kanalerna laddas, så ingen vy behöver känna till inställningen.

**Teknikstack:** TypeScript, React, vitest + Testing Library, pluginets SDK (`@/lib/plugin-sdk`).

**Spec:** `docs/superpowers/specs/2026-09-14-live-tv-logos-v2-design.md`

## Globala villkor

- Gren: `feature/live-tv-logos-v2`, utgår från `feature/live-tv-everywhere` (117ffb9).
- `plugins/live-tv/plugin.json`: version `0.7.0`, `minAppVersion` `0.1.598` (bumpas i sista tasken).
- `plugins/twitch/dist/runtime.js` ligger ändrad av en annan session — den filen får ALDRIG med i en commit här.
- Nya strängar läggs där `listRefetch` och `needsReimport` redan bor (pluginets egna strängtabeller, både desktop och `runtime/tv/tv-strings.ts`). Svenska och engelska, som grannraderna.
- Reserven är en reserv: koden får aldrig skriva över eller ersätta `channel.logo`.
- Efter varje task: `npm test` i `plugins/live-tv` grönt före commit. Ingen AI-attribution i commits.

---

### Task P1: Datalagret — fältet, inställningen och filtreringen

**Filer:**
- Ändra: `runtime/live-tv-data.ts` (`M3uChannel`, `LiveTvList`, ny skrivfunktion), `runtime/live-tv-model.ts:310` (`loadChannelsShared`)
- Test: `runtime/live-tv-data.test.ts`, `runtime/live-tv-model.test.ts`

**Gränssnitt:**
- Producerar:
  - `M3uChannel.logoFallback?: string | null`
  - `LiveTvList.logoFallbackEnabled?: boolean` — `undefined` betyder PÅ
  - `export function isLogoFallbackEnabled(list: LiveTvList): boolean`
  - `export function setLogoFallbackEnabled(listId: string, enabled: boolean): void` — skriver i `lists` och sänder samma ändringshändelse som `updateLiveTvListEpg`

- [ ] **Steg 1: Skriv de fallerande testerna**

```ts
it('behandlar listor utan fältet som påslagna', () => {
  expect(isLogoFallbackEnabled({ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [] })).toBe(true)
})

it('respekterar ett uttryckligt av', () => {
  expect(isLogoFallbackEnabled({ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], logoFallbackEnabled: false })).toBe(false)
})

it('sparar switchen på rätt lista', () => {
  writeLists([{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [] }, { id: 'b', name: 'B', createdAt: '', urlTvg: null, epgUrls: [] }])
  setLogoFallbackEnabled('b', false)
  const lists = readLists()
  expect(isLogoFallbackEnabled(lists[0])).toBe(true)
  expect(isLogoFallbackEnabled(lists[1])).toBe(false)
})

it('sanerar logoFallback som tom sträng till null', () => {
  const channel = sanitizeChannel({ name: 'A', url: 'u', logoFallback: '  ' })
  expect(channel.logoFallback).toBeNull()
})
```

och i `live-tv-model.test.ts`:

```ts
it('tar bort reserven när listans switch är av', async () => {
  writeLists([{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u', logoFallbackEnabled: false }])
  mockQueryResponse([{ name: 'K', url: 'u', key: 'K::u', number: 1, logo: null, logoFallback: 'http://x/a.png' }])

  const channels = await loadChannelsShared('http://lista')

  expect(channels[0].logoFallback ?? null).toBeNull()
})

it('behåller reserven när switchen är på', async () => {
  writeLists([{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u' }])
  mockQueryResponse([{ name: 'K', url: 'u', key: 'K::u', number: 1, logo: null, logoFallback: 'http://x/a.png' }])

  const channels = await loadChannelsShared('http://lista')

  expect(channels[0].logoFallback).toBe('http://x/a.png')
})
```

`mockQueryResponse` finns redan i `live-tv-model.test.ts` (eller motsvarande fetch-stubb) — använd den som testerna runt omkring gör, hitta inte på en ny.

- [ ] **Steg 2: Kör testerna och se dem falla**

Kör: `npx vitest run runtime/live-tv-data.test.ts runtime/live-tv-model.test.ts`
Förväntat: `isLogoFallbackEnabled is not a function`.

- [ ] **Steg 3: Implementera**

Lägg `logoFallback?: string | null` i `M3uChannel` direkt under `logo`, med en rad om att fältet ÄGS av appen (matchningen mot iptv-org) och att `logo` alltid vinner. Sanera det i samma funktion som redan sanerar `logo` (`live-tv-data.ts:139`).

`isLogoFallbackEnabled` returnerar `list.logoFallbackEnabled !== false` — förvalet är på, också för listor som skapades före v2.

`setLogoFallbackEnabled` läser listorna, byter fältet på den matchande och skriver tillbaka via samma väg som `updateLiveTvListEpg` använder, så samma lyssnare väcks.

I `loadChannelsShared`: när källans lista har switchen av, nolla `logoFallback` på kanalerna INNAN de läggs i minnescachen (kanalerna är färska ur svaret, så en mutation är rätt ställe — ingen kopia av 17 000 objekt).

- [ ] **Steg 4: Kör testerna och se dem passera**

Kör: `npx vitest run runtime/live-tv-data.test.ts runtime/live-tv-model.test.ts`
Förväntat: grönt.

- [ ] **Steg 5: Commit**

```bash
git add plugins/live-tv/runtime/live-tv-data.ts plugins/live-tv/runtime/live-tv-model.ts plugins/live-tv/runtime/live-tv-data.test.ts plugins/live-tv/runtime/live-tv-model.test.ts
git commit -m "live-tv: reservlogotyp i datalagret och switch per lista"
```

---

### Task P2: Bytet till reserven i bildkomponenten

**Filer:**
- Ändra: `runtime/live-tv-logo-image.tsx`
- Test: `runtime/live-tv-logo-image.test.tsx` (ny fil)

**Gränssnitt:**
- Konsumerar: `M3uChannel.logoFallback` (Task P1)
- Producerar: `LiveTvLogoImage`-propen `fallbackSrc?: string | null`

- [ ] **Steg 1: Skriv de fallerande testerna**

```tsx
it('byter till reserven när leverantörens bild fallerar', () => {
  render(<LiveTvLogoImage src="http://p/primar.png" fallbackSrc="http://p/reserv.png" alt="K" />)
  const img = screen.getByAltText('K')
  fireEvent.load(img) // släpp förbi laddkön
  fireEvent.error(img)
  expect(screen.getByAltText('K')).toHaveAttribute('src', expect.stringContaining('reserv.png'))
})

it('ger upp först när även reserven fallerar', () => {
  render(<LiveTvLogoImage src="http://p/primar.png" fallbackSrc="http://p/reserv.png" alt="K" />)
  fireEvent.error(screen.getByAltText('K'))
  fireEvent.error(screen.getByAltText('K'))
  expect(screen.queryByAltText('K')).toBeNull()
})

it('anropar onError bara när alla källor är slut', () => {
  const onError = vi.fn()
  render(<LiveTvLogoImage src="http://p/primar.png" fallbackSrc="http://p/reserv.png" alt="K" onError={onError} />)
  fireEvent.error(screen.getByAltText('K'))
  expect(onError).not.toHaveBeenCalled()
  fireEvent.error(screen.getByAltText('K'))
  expect(onError).toHaveBeenCalledTimes(1)
})

it('ger upp direkt utan reserv', () => {
  const onError = vi.fn()
  render(<LiveTvLogoImage src="http://p/primar.png" alt="K" onError={onError} />)
  fireEvent.error(screen.getByAltText('K'))
  expect(onError).toHaveBeenCalledTimes(1)
  expect(screen.queryByAltText('K')).toBeNull()
})
```

Stubba `@/lib/plugin-sdk` som de andra runtime-testerna i mappen gör (`isTauriEnv: false`), och sätt `shouldLoad` genom att låta `IntersectionObserver` vara odefinierad i testmiljön — kön startar då laddningen direkt.

- [ ] **Steg 2: Kör testerna och se dem falla**

Kör: `npx vitest run runtime/live-tv-logo-image.test.tsx`
Förväntat: första testet faller — `src` står kvar på `primar.png`.

- [ ] **Steg 3: Implementera**

Håll en `stage`-variabel (`'primary' | 'fallback'`) i stället för enbart `failed`. `onError` går till `fallback` när `fallbackSrc` finns och steget är `primary`; annars sätts `failed` och `onError?.()` anropas som i dag. Bildens `src` är `stage === 'primary' ? src : fallbackSrc`. `useEffect`-nollställningen på `[src]` ska även nollställa steget, och `finishLogoLoad` räknas ned för den källa som faktiskt laddades — annars läcker `activeLogoLoads` och kön står still efter ett par misslyckanden.

- [ ] **Steg 4: Kör testerna och se dem passera**

Kör: `npx vitest run runtime/live-tv-logo-image.test.tsx`
Förväntat: fyra gröna.

- [ ] **Steg 5: Commit**

```bash
git add plugins/live-tv/runtime/live-tv-logo-image.tsx plugins/live-tv/runtime/live-tv-logo-image.test.tsx
git commit -m "live-tv: logotypbilden provar reserven innan den ger upp"
```

---

### Task P3: Reserven på alla fyra renderingsplatser

**Filer:**
- Ändra: `runtime/live-tv-ui.tsx:181`, `runtime/live-tv-grid.tsx:700`, `runtime/live-tv-home-override.tsx:198`, `runtime/tv/tv-ui.tsx:236`
- Test: `runtime/live-tv-ui.test.tsx` eller närmaste befintliga testfil per yta (`view-helpers.test.tsx`, `tv/tv-channel.test.tsx`)

**Gränssnitt:**
- Konsumerar: `getLiveTvLogoSrc` (oförändrad), `LiveTvLogoImage.fallbackSrc` (Task P2)

- [ ] **Steg 1: Skriv de fallerande testerna**

```tsx
it('kanalkortet skickar med reserven', () => {
  render(<ChannelLogo channel={{ name: 'K', url: 'u', group: '', tvgId: null, logo: 'http://p/a.png', logoFallback: 'http://p/b.png' }} />)
  const img = screen.getByAltText('K')
  fireEvent.error(img)
  expect(screen.getByAltText('K').getAttribute('src')).toContain(encodeURIComponent('http://p/b.png'))
})

it('kanal utan leverantörslogotyp går direkt på reserven', () => {
  render(<ChannelLogo channel={{ name: 'K', url: 'u', group: '', tvgId: null, logo: null, logoFallback: 'http://p/b.png' }} />)
  expect(screen.getByAltText('K').getAttribute('src')).toContain(encodeURIComponent('http://p/b.png'))
})

it('kanal utan både och visar initialerna', () => {
  render(<ChannelLogo channel={{ name: 'Kanal Ett', url: 'u', group: '', tvgId: null, logo: null, logoFallback: null }} />)
  expect(screen.getByText('KE')).toBeInTheDocument()
})
```

Byt `ChannelLogo` mot den komponent respektive fil faktiskt exporterar (i `live-tv-ui.tsx` ligger renderingen runt rad 181). Skriv ett motsvarande test per yta — fyra ytor, fyra tester; upprepa koden i stället för att dela en hjälpare mellan filerna.

- [ ] **Steg 2: Kör testerna och se dem falla**

Kör: `npx vitest run runtime`
Förväntat: de nya testerna faller, resten är grönt.

- [ ] **Steg 3: Implementera**

På varje yta: `const fallbackSrc = getLiveTvLogoSrc(channel.logoFallback)` och skicka in den. Där koden i dag gör `const src = getLiveTvLogoSrc(channel.logo)` och hoppar över bilden när `src` är null: låt `src ?? fallbackSrc` vara den primära källan, och skicka `fallbackSrc` bara när en riktig primärkälla finns — annars provar komponenten samma URL två gånger.

I `live-tv-grid.tsx:700` bygger koden en förladdningslista; lägg till reservens URL där bara när kanalen saknar leverantörslogotyp, så förladdningen inte dubblas för varje kanal.

- [ ] **Steg 4: Kör testerna och se dem passera**

Kör: `npx vitest run runtime`
Förväntat: hela sviten grön (488 tester + de nya).

- [ ] **Steg 5: Commit**

```bash
git add plugins/live-tv/runtime
git commit -m "live-tv: reservlogotypen används på kort, rutnät, startsida och TV"
```

---

### Task P4: Klienten mot /api/live-tv/logo-fallback

**Filer:**
- Ändra: `runtime/index-client.ts`
- Test: `runtime/index-client.test.ts` (eller närmaste befintliga testfil för klienten)

**Gränssnitt:**
- Producerar: `export async function completeLogos(source: string): Promise<{ matched: number; total: number }>`

- [ ] **Steg 1: Skriv de fallerande testerna**

```ts
it('postar källan och lämnar tillbaka kvittot', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ matched: 12, total: 40 }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)

  const out = await completeLogos('http://lista')

  expect(fetchMock.mock.calls[0][0]).toContain('/api/live-tv/logo-fallback')
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ source: 'http://lista' })
  expect(out).toEqual({ matched: 12, total: 40 })
})

it('kastar med appens feltext när svaret inte är ok', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('registret kunde inte hämtas', { status: 502 })))
  await expect(completeLogos('http://lista')).rejects.toThrow(/registret/)
})
```

- [ ] **Steg 2: Kör testerna och se dem falla**

Kör: `npx vitest run runtime/index-client.test.ts`
Förväntat: `completeLogos is not a function`.

- [ ] **Steg 3: Implementera**

Skriv `completeLogos` efter exakt samma mönster som `resetSource` (`index-client.ts:223`) — samma bas-URL-hjälpare, samma felhantering, samma `emitIndexChanged()` efter ett lyckat svar, eftersom kanalerna i indexet ändrades.

- [ ] **Steg 4: Kör testerna och se dem passera**

Kör: `npx vitest run runtime/index-client.test.ts`
Förväntat: grönt.

- [ ] **Steg 5: Commit**

```bash
git add plugins/live-tv/runtime/index-client.ts plugins/live-tv/runtime/index-client.test.ts
git commit -m "live-tv: klient för komplettering av logotyper"
```

---

### Task P5: Switchen och Komplettera på skrivbordet

**Filer:**
- Ändra: `runtime/live-tv-settings-section.tsx:296-357` (listans `Card`), strängtabellen där `listRefetch` bor
- Test: `runtime/live-tv-settings-section.test.tsx`

**Gränssnitt:**
- Konsumerar: `isLogoFallbackEnabled`, `setLogoFallbackEnabled` (P1), `completeLogos` (P4)

- [ ] **Steg 1: Skriv de fallerande testerna**

```tsx
it('visar switchen påslagen för en lista utan fältet', () => {
  writeLists([{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u' }])
  render(<LiveTvSettingsSection />)
  expect(screen.getByTestId('logo-fallback-toggle-a')).toBeChecked()
})

it('sparar när switchen slås av', () => {
  writeLists([{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u' }])
  render(<LiveTvSettingsSection />)
  fireEvent.click(screen.getByTestId('logo-fallback-toggle-a'))
  expect(isLogoFallbackEnabled(readLists()[0])).toBe(false)
})

it('kompletterar och visar kvittot', async () => {
  writeLists([{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u' }])
  vi.mocked(completeLogos).mockResolvedValue({ matched: 12, total: 40 })
  render(<LiveTvSettingsSection />)
  fireEvent.click(screen.getByTestId('logo-complete-a'))
  expect(await screen.findByText(/12 av 40/)).toBeInTheDocument()
})

it('knappen är avstängd när switchen är av', () => {
  writeLists([{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u', logoFallbackEnabled: false }])
  render(<LiveTvSettingsSection />)
  expect(screen.getByTestId('logo-complete-a')).toBeDisabled()
})
```

- [ ] **Steg 2: Kör testerna och se dem falla**

Kör: `npx vitest run runtime/live-tv-settings-section.test.tsx`
Förväntat: `logo-fallback-toggle-a` finns inte.

- [ ] **Steg 3: Implementera**

I listans `Card`, under `EpgSourcesSection`: en rad med `Checkbox` (samma primitiv som filen redan importerar från `@/lib/plugin-sdk`) med `data-testid={`logo-fallback-toggle-${list.id}`}` och texten "Fyll i saknade logotyper från iptv-org", plus en `PillBtn size="sm"` med `data-testid={`logo-complete-${list.id}`}` och texten "Komplettera". Knappen är avstängd när switchen är av, medan en komplettering pågår, och för `kind === 'custom'`.

Under körning visar raden "Kompletterar…", efteråt "{matched} av {total} kompletterade", och vid fel appens feltext i samma röda stil som `listImportFailed` redan använder. Håll läget i en `useState` med listans id som nyckel, precis som `listProgress` i samma fil gör — inga globala variabler.

Strängarna läggs i samma tabell som `listRefetch`, svenska och engelska.

- [ ] **Steg 4: Kör testerna och se dem passera**

Kör: `npx vitest run runtime`
Förväntat: grönt.

- [ ] **Steg 5: Commit**

```bash
git add plugins/live-tv/runtime
git commit -m "live-tv: logotypinställning och Komplettera i skrivbordets inställningar"
```

---

### Task P6: Samma två i TV-inställningarna, version och dist

**Filer:**
- Ändra: `runtime/tv/tv-settings.tsx:224-290` (`ListRow`), `runtime/tv/tv-strings.ts`, `plugins/live-tv/plugin.json`, `plugins/live-tv/dist/runtime.js` (byggs)
- Test: `runtime/tv/tv-settings.test.tsx` (eller den testfil som redan täcker `ListRow`)

- [ ] **Steg 1: Skriv de fallerande testerna**

```tsx
it('raden har en logotypswitch som går att nå med fjärren', () => {
  render(<ListRow list={{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u' }} {...baseProps} />)
  expect(screen.getByTestId('list-logo-fallback-a')).toBeInTheDocument()
})

it('kompletterar från TV och visar kvittot', async () => {
  vi.mocked(completeLogos).mockResolvedValue({ matched: 3, total: 9 })
  render(<ListRow list={{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u' }} {...baseProps} />)
  fireEvent.click(screen.getByTestId('list-logo-complete-a'))
  expect(await screen.findByText(/3 av 9/)).toBeInTheDocument()
})
```

`baseProps` byggs som de befintliga `ListRow`-testerna i filen gör.

- [ ] **Steg 2: Kör testerna och se dem falla**

Kör: `npx vitest run runtime/tv`
Förväntat: `list-logo-fallback-a` finns inte.

- [ ] **Steg 3: Implementera**

Lägg de två åtgärderna i `ListRow`:s knappgrupp med `Action`-komponenten som redan finns i filen (`tv-settings.tsx:190`) — switchen som en `Action` vars etikett växlar mellan "Logotyper: på" och "Logotyper: av", kompletteringen som en `Action` med etiketten "Komplettera". Ordningen i raden: Hämta om, Logotyper, Komplettera, Ta bort — "Ta bort" ska förbli sist så fjärrkontrollen inte råkar landa på den.

Alla mått går genom `dp()`. Strängarna läggs i `tv-strings.ts` bredvid `refetch`/`remove`.

- [ ] **Steg 4: Kör hela sviten**

Kör: `npm test` i `plugins/live-tv`
Förväntat: allt grönt.

- [ ] **Steg 5: Bumpa versionen och bygg om dist**

`plugins/live-tv/plugin.json`: `"version": "0.7.0"`, `"minAppVersion": "0.1.598"`.

Bygg om `dist/runtime.js` med repots vanliga byggskript, mot app-checkouten på `test/2026-09-14-live-tv-allt` (`@/`-importerna löses mot appens träd). Dist MÅSTE byggas om före versionsbumpen i katalogen — annars cachas gammal kod under nya versionen.

Kontrollera att bygget inte rörde `plugins/twitch/dist/runtime.js`; den ändringen tillhör en annan session och ska stå kvar orörd utanför commiten.

- [ ] **Steg 6: Commit**

```bash
git add plugins/live-tv/runtime plugins/live-tv/plugin.json plugins/live-tv/dist/runtime.js
git commit -m "live-tv 0.7.0: logotypreserv ur iptv-org"
```
