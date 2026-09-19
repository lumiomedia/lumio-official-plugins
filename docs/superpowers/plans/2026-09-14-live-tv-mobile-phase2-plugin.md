# Live TV fas 2 — pluginet (telefonen)

> **För agenter:** OBLIGATORISK UNDERSKILL: `superpowers:subagent-driven-development`.

**Mål:** Telefonen blir läsbar och gåbar med tummen: menyn flyttar in i en låda, rutnäten blir två kolumner, och träffytor och texter får ett golv.

**Arkitektur:** Inget nytt lager. Appen märker telefonen med `data-tv-scene-phone`; pluginet läser flaggan med en hook som speglar den befintliga `useNarrowSurface`, och varje vy väljer telefonmått ur sina redan samlade toppkonstanter.

**Spec:** `docs/superpowers/specs/2026-09-14-live-tv-mobile-phase2-design.md`

## Globala villkor

- Gren `feature/live-tv-mobile-phase2` (arbetsträd `.worktrees/mobile-phase2`), utgår från `feature/live-tv-logos-v2`.
- `plugin.json`: version `0.8.0`, `minAppVersion` `0.1.599` (bumpas i sista tasken, EFTER dist byggts om). `plugins/live-tv/package.json` bumpas i lockstep.
- Telefon = `data-tv-scene-phone="1"` på scenlådan. Saknas attributet (äldre app) ska pluginet bete sig exakt som i fas 1.
- Telefon är ALLTID också smal — allt fas 1 gör vid smal yta gäller vidare.
- Skala på telefon är 0,5. Träffytegolv: **88 designpixlar** (= 44 riktiga). Teckengolv: **28 designpixlar** (= 14 riktiga).
- Alla mått genom `dp()`. Inga okända propar till `@/lib/plugin-sdk`-primitiver. Teststubbens `useLang()` står på `'en'`.
- `plugins/twitch/dist/runtime.js` får aldrig med i en commit. Svenska kommentarer, ingen AI-attribution.

---

### Task M-P1: Hooken som känner igen en telefon

**Filer:**
- Skapa: `runtime/hooks/usePhoneSurface.ts`
- Test: `runtime/hooks/usePhoneSurface.test.ts`

**Gränssnitt:** `export function usePhoneSurface(ref?: RefObject<HTMLElement | null>): boolean`

- [ ] **Steg 1: Skriv de fallerande testerna**

```ts
it('är falsk utan låda', () => {
  const { result } = renderHook(() => usePhoneSurface())
  expect(result.current).toBe(false)
})

it('är sann när lådan är märkt som telefon', () => {
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
  document.body.appendChild(box)
  const { result } = renderHook(() => usePhoneSurface())
  expect(result.current).toBe(true)
})

it('följer med när attributet försvinner', async () => {
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
  document.body.appendChild(box)
  const { result } = renderHook(() => usePhoneSurface())
  act(() => { box.removeAttribute(TV_SCENE_PHONE_ATTR) })
  await waitFor(() => expect(result.current).toBe(false))
})
```

- [ ] **Steg 2: Kör och se dem falla.** `npx vitest run runtime/hooks/usePhoneSurface.test.ts`
- [ ] **Steg 3: Implementera** — kopiera strukturen i `runtime/hooks/useNarrowSurface.ts` rakt av (samma `MutationObserver` på `document.documentElement`, samma `closest`-uppslag, samma tre lägen som ger `false`). Läs `TV_SCENE_PHONE_ATTR` från `@/lib/plugin-sdk`; saknas exporten i den app-version som byggträdet har, avbryt och säg till — appens task M-A1 ska vara klar först.
- [ ] **Steg 4: Kör och se dem passera.**
- [ ] **Steg 5: Commit** — `live-tv: hook som känner igen en telefonyta`

---

### Task M-P2: Ikonraden blir en låda

**Filer:**
- Ändra: `runtime/tv/tv-shell.tsx` (raden, den nya knappen, lagerregistreringen)
- Test: `runtime/tv/tv-shell-phone.test.tsx` (ny)

**Gränssnitt:** Konsumerar `usePhoneSurface` (M-P1) och skalets befintliga `pushLayer(close)` (`tv-shell.tsx:299`).

- [ ] **Steg 1: Skriv de fallerande testerna**

```tsx
it('visar ingen fast ikonrad på telefon', () => {
  renderShellOnPhone()
  expect(screen.queryByTestId('tv-rail')).toBeNull()
  expect(screen.getByTestId('tv-rail-open')).toBeInTheDocument()
})

it('öppnar lådan och stänger den när en post väljs', async () => {
  renderShellOnPhone()
  fireEvent.click(screen.getByTestId('tv-rail-open'))
  expect(await screen.findByTestId('tv-rail')).toBeInTheDocument()
  fireEvent.click(within(screen.getByTestId('tv-rail')).getAllByRole('button')[1])
  await waitFor(() => expect(screen.queryByTestId('tv-rail')).toBeNull())
})

it('Bakåt stänger lådan före vyn', async () => {
  const back = vi.fn()
  renderShellOnPhone({ onBrowseBack: back })
  fireEvent.click(screen.getByTestId('tv-rail-open'))
  await screen.findByTestId('tv-rail')
  fireEvent.keyDown(window, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByTestId('tv-rail')).toBeNull())
  expect(back).not.toHaveBeenCalled()
})

it('tryck utanför stänger lådan', async () => {
  renderShellOnPhone()
  fireEvent.click(screen.getByTestId('tv-rail-open'))
  await screen.findByTestId('tv-rail')
  fireEvent.pointerDown(document.body)
  await waitFor(() => expect(screen.queryByTestId('tv-rail')).toBeNull())
})

it('behåller den fasta raden på skrivbordet', () => {
  renderShellOnDesktop()
  expect(screen.getByTestId('tv-rail')).toBeInTheDocument()
  expect(screen.queryByTestId('tv-rail-open')).toBeNull()
})
```

`renderShellOnPhone`/`renderShellOnDesktop` sätter `data-tv-scene-box`/`data-tv-scene-phone` på ett omslutande element före render, som testerna för smal yta redan gör. Testid:n läggs på vanliga element, aldrig på sdk-primitiver.

- [ ] **Steg 2: Kör och se dem falla.** `npx vitest run runtime/tv`
- [ ] **Steg 3: Implementera** — på telefon renderas raden bara när lådan är öppen, som ett panelelement som glider in från vänster (samma rörelse och stil som `tv-channel-picker.tsx` redan använder för sin högerpanel — återanvänd mönstret, hitta inte på ett nytt). Öppningsknappen ligger överst till vänster i vyn och är en station som alla andra, så fjärrnavigering fungerar. Registrera lådan med `pushLayer` när den öppnas så Bakåt-kedjan stänger den först. Etiketterna visas i lådan (till skillnad från fas 1:s komprimerade rad) eftersom bredden räcker. Knappens och posternas höjd följer träffytegolvet 88 dp.
- [ ] **Steg 4: Kör hela sviten.** `npm test` i `plugins/live-tv`.
- [ ] **Steg 5: Commit** — `live-tv: telefonens meny ligger i en låda`

---

### Task M-P3: Portträttmått i hubben och guiden

**Filer:**
- Ändra: `runtime/tv/tv-hub.tsx` (`SPOTLIGHT_COUNT`, rad 16 och rutnätet rad 139), `runtime/tv/tv-guide.tsx` (kanalkolumnen rad 229), `runtime/tv/tv-guide-shared.tsx` (`ChannelCell` standardbredd `dp(520)`, rad 35)
- Test: `runtime/tv/tv-hub.test.tsx`, `runtime/tv/tv-guide.test.tsx`

**Gränssnitt:** Konsumerar `usePhoneSurface` (M-P1).

- [ ] **Steg 1: Skriv de fallerande testerna**

```tsx
it('hubben lägger spotlight i två kolumner på telefon', () => {
  renderHubOnPhone()
  const grid = screen.getByTestId('hub-spotlight')
  expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' })
})

it('hubben behåller tre kolumner på skrivbordet', () => {
  renderHubOnDesktop()
  expect(screen.getByTestId('hub-spotlight')).toHaveStyle({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' })
})

it('guidens kanalkolumn tar full bredd på telefon', () => {
  renderGuideOnPhone()
  const cell = screen.getByTestId('guide-channel-cell')
  expect(cell.style.width).not.toBe(`${dp(520)}px`)
})
```

Lägg `data-testid` på rutnätet respektive cellen — på vanliga element.

- [ ] **Steg 2: Kör och se dem falla.**
- [ ] **Steg 3: Implementera** — `SPOTLIGHT_COUNT` blir ett värde som väljs av ytan (3 på skrivbord och TV, 2 på telefon); `ChannelCell`s bredd och guidens rubrikkolumn följer samma val. Leta upp övriga flerkolumnsrutnät i hubben och ge dem samma behandling — gamla specen talade om sex kolumner, men koden har `SPOTLIGHT_COUNT = 3`; rätta dig efter koden och skriv i rapporten vad du hittade.
- [ ] **Steg 4: Kör hela sviten.**
- [ ] **Steg 5: Commit** — `live-tv: hubb och guide i portträtt`

---

### Task M-P4: Golv för träffytor och text

**Filer:**
- Ändra: `runtime/tv/tv-ui.tsx` (konstanterna), och de vyer vars mått understiger golven
- Test: `runtime/tv/tv-ui-floors.test.tsx` (ny)

**Gränssnitt:** Producerar `PHONE_HIT_MIN_DP = 88` och `PHONE_TEXT_MIN_DP = 28` i `tv-ui.tsx`.

- [ ] **Steg 1: Skriv det fallerande testet**

```tsx
it('inget tryckbart element är lägre än golvet på telefon', () => {
  renderShellOnPhone()
  for (const el of screen.getAllByRole('button')) {
    const h = Number.parseFloat(getComputedStyle(el).minHeight || '0')
    expect(h).toBeGreaterThanOrEqual(PHONE_HIT_MIN_DP)
  }
})

it('ingen text är mindre än golvet på telefon', () => {
  renderShellOnPhone()
  for (const el of document.querySelectorAll<HTMLElement>('[style*="font-size"]')) {
    const size = Number.parseFloat(el.style.fontSize)
    if (Number.isFinite(size)) expect(size).toBeGreaterThanOrEqual(PHONE_TEXT_MIN_DP)
  }
})
```

Testerna är avsiktligt breda — de ska fälla varje vy som glömts bort, inte bara den du råkar ändra.

- [ ] **Steg 2: Kör och se dem falla.** Notera vilka element som fäller testet; det är arbetslistan.
- [ ] **Steg 3: Implementera** — höj måtten på telefon i vyernas toppkonstanter, inte i märkningen. Skriv i rapporten vilka vyer som behövde ändras.
- [ ] **Steg 4: Kör hela sviten.**
- [ ] **Steg 5: Commit** — `live-tv: träffytor och text får ett golv på telefon`

---

### Task M-P5: Version och dist

**Filer:** `plugins/live-tv/plugin.json`, `plugins/live-tv/package.json`, `plugins/live-tv/dist/runtime.js`

- [ ] **Steg 1: Kör hela sviten och se den grön.**
- [ ] **Steg 2: Bygg om dist FÖRE versionsbumpen**

```bash
cd "/Users/jerry/Local Sites/Moviefinder" && node scripts/build-plugin-runtime.mjs "/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/mobile-phase2/plugins/live-tv"
```

Bygget är den första riktiga typkontrollen mot appens verkliga primitiver — faller det på en okänd prop, är det den buggen som ska fixas, inte typen.

- [ ] **Steg 3: Sätt `0.8.0` och `minAppVersion` `0.1.599` i `plugin.json`, och `0.8.0` i `package.json`.** Kontrollera att inga hårdkodade versionssträngar i `runtime/index.ts` halkat efter — de finns och har en egen grind i `index-bridge.test.ts`.
- [ ] **Steg 4: Kontrollera att `plugins/twitch/dist/runtime.js` är orörd.**
- [ ] **Steg 5: Commit** — `live-tv 0.8.0: telefonen`
