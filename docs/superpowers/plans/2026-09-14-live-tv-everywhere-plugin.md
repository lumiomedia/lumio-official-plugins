# Live TV överallt – pluginplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TV-trädet (`runtime/tv/*`) är Live TV:s ENDA yta — TV, skrivbord och telefon renderar samma komponenter, och bara inmatning och skala skiljer. Skrivbordets ersatta vyer raderas, guiden får läget **Rutnät**, pluginets inställningar blir snabbknappar som når allt appens sektioner når, och pekaren får hovring, "…", Bakåt och kantsvep.

**Architecture:** `runtime/index.ts` slutar gren­a på `useTvMode()`. `tv-shell.tsx` lindar sig i värdens scenlåda (`getTvSceneBox()`), håller den delegerade "…"-lyssnaren och Bakåt-posten. `tv-ui.tsx` är den enda platsen som ändras för OK/håll/hovring. Ett nytt guideläge bor i `tv/tv-guide-grid.tsx` med geometrin i en ren modul `tv/epg-grid-geometry.ts`. En gemensam textinmatning (`tv/tv-text-entry.tsx`) byter mellan värdens TV-tangentbord och ett riktigt `<input>`. Inställningarnas fyra funktioner delas mellan ytorna via `hooks/useEpgStatus.ts` och `tv/tv-list-picker.tsx`.

**Tech Stack:** React 19, TS, vitest/happy-dom (`npx vitest run` **från `plugins/live-tv`**), `@/lib/plugin-sdk` (nytt i 0.1.597: `getTvSceneBox`, `tvSceneBoxPortalTarget`, `tvPointerHoldHandlers`, `TV_SCENE_NARROW_PX`).

**Spec:** `docs/superpowers/specs/2026-09-14-live-tv-desktop-mobile-design.md` (avsnitt 4–7). Appsidan: `Moviefinder/docs/superpowers/plans/2026-09-14-live-tv-everywhere-app.md` (A1–A7) — exakta SDK-former där. **P1 kan inte börja förrän A5 är grön i app-trädet.**

## Global Constraints

- Ny gren `feature/live-tv-everywhere` från `feature/live-tv-storage-v2` (**f8082e2** — specens `9911c5d` är en commit äldre; f8082e2 ÄR specen). Aldrig `git stash`. **Rör aldrig `plugins/twitch/**`.**
- Runtime importerar bara `@/lib/plugin-sdk` från appen — aldrig `@/lib/tv-scene`, `@/lib/tv-focus` eller `@/components/*` direkt.
- Tester körs från `plugins/live-tv` (`npx vitest run`), aldrig från repo-roten. Stubben `src/__test-stubs__/plugin-sdk.ts` måste utökas med varje ny SDK-symbol innan den används i en komponent, annars faller hela sviten på en `undefined`-import.
- **TV-designen är godkänd och ska inte ändras.** Varje task som rör `tv/*` ska kunna svara "vad ser annorlunda ut på TV?" med "ingenting". Referens: `Moviefinder/design_handoff_live_tv_tv_mode/README.md` och `screenshots/01-hubb.png` … `10-multivy.png`. Nya affordanser (hovring, "…", Bakåt-post, riktiga textfält) ritas **aldrig** när `useTvMode()` är sant.
- Fas 1 levererar mobil som "fungerar, litet" — ingen bottenrad, ingen portträttomdesign. Mått som fas 2 ska ändra ligger i `tv-ui.tsx` eller i vyernas toppkonstanter, aldrig utspridda.
- Commit-meddelanden på svenska, utan AI-attribution, utan Co-Authored-By-trailer. **Ingen release, ingen push utan Jerrys klartecken.**
- `npx tsc --noEmit` från `plugins/live-tv` utan nya fel efter varje task. Pluginbunten typkontrolleras dessutom inifrån app-trädet (se P11).

### Filägande (så tasks kan köras parallellt)

| Task | Äger (skriver i) |
|---|---|
| P1 | `runtime/index.ts`, `runtime/tv/tv-shell.tsx`, `runtime/tv/tv-scene-box.tsx` (ny), `runtime/hooks/useIsMobileLayout.ts`, `runtime/hooks/useNarrowSurface.ts` (ny) |
| P2 | `runtime/tv/tv-ui.tsx` |
| P3 | `runtime/tv/tv-shell.tsx`, `runtime/tv/tv-hold-affordance.tsx` (ny), `runtime/hooks/useSwipeBack.ts` |
| P4 | `runtime/tv/tv-text-entry.tsx` (ny), `runtime/tv/tv-search.tsx`, `runtime/tv/tv-keyboard.tsx` |
| P5 | `runtime/tv/epg-grid-geometry.ts` (ny) |
| P6 | `runtime/tv/tv-guide-grid.tsx` (ny), `runtime/tv/tv-guide.tsx`, `runtime/tv/tv-settings-store.ts`, `runtime/tv/tv-strings.ts` |
| P7 | `runtime/tv/tv-settings.tsx`, `runtime/tv/tv-list-picker.tsx` (ny), `runtime/hooks/useEpgStatus.ts` (ny) |
| P8 | `runtime/epg-sources-section.tsx`, `runtime/xtream-login-section.tsx`, `runtime/live-tv-settings-section.tsx`, `runtime/hub-strings.ts` |
| P9 | `runtime/live-tv-player.tsx`, `runtime/tv/tv-player-props.ts` (ny), `runtime/live-tv-grid.tsx`, raderingarna |
| P10 | `runtime/tv/tv-multiview.tsx` |
| P11 | `plugin.json`, `package.json`, `marketplace.json`, `CHANGELOG.md`, `dist/runtime.js` |

`tv-shell.tsx` ägs av P1 och sedan P3 — de får aldrig köra samtidigt. `live-tv-grid.tsx` ägs av P8 (Uppdatera) och sedan P9 (guideoverlayen + spelarprops). Allt annat är disjunkt.

## Kontext

- **Grenen som tas bort:** `runtime/index.ts:60-68` — `LiveTvBrowsePage` gren­ar på `useTvMode()`; importerna av `LiveTvHub` (7), `LiveTvEpgPage` (9), `LiveTvChannelPage` (10) försvinner med grenen.
- **Skalet:** `runtime/tv/tv-shell.tsx` — `BACK_KEYS` (111), `back()` (258-270), capture-lyssnaren (295+), zappen (343-361, hoppar över `INPUT`/`TEXTAREA` och `[data-live-tv-keyboard]`), `nav` (375-378), `rail` (384-390), `railItem` (391-403), roten `data-live-tv-tv-root` (433), ikonraden `<nav>` `width: dp(104)`, `padding: 36px 0 32px` (444), toasts `position: fixed` (485, 488), `TvGlassMenu`-monteringen (483).
- **Primitiverna:** `runtime/tv/tv-ui.tsx` — `dp()` identitet (28-30), `TV`-paletten (32), `TvFocusStyle()` (81-99, fokusringen scopad till `[data-live-tv-tv-root]`), `station()` (104-123), `Chip` (185), `Segment` (196), `RoundBtn` (221), `Toggle` (229). Inga `:hover`-regler finns.
- **Vyerna:** `runtime/tv/tv-views.tsx:13-21` (`hub`, `guide`, `favs`, `channel`, `search`, `multi`, `settings`). Guidens lägen: `tv-settings-store.ts:48-49` `GuideMode = 'now' | 'tl' | 'playlists'`, `GUIDE_MODE_KEY = 'live_tv_guide_mode_v1'` (8); segmentväxeln byggs på tre ställen: `tv-guide.tsx:142`, `tv-guide-playlists.tsx:87`, `tv-settings.tsx:90`.
- **Skrivbordets EPG-tablå (källan till Rutnät):** `runtime/live-tv-epg-page.tsx` — `HOUR_PX = 240`, `PX_PER_MIN`, `CHANNEL_COL = 160`, `CHANNEL_COL_MOBILE = 108`, `ROW_MIN_H = 56`, `MAX_ROWS/EPG_ROWS_STEP = 80`, `CANDIDATE_FACTOR = 3` (rad 22-49); fönstret `alignToHour(now-1h) … +12h` / imorgon 06-24 (rad 89-91); timlinjen och Nu-linjen (231-240); raden och blocken (243-311) med **buggen**: `width = Math.max(4, …)` (258) mot `padding: '6px 8px'` + `boxSizing: 'border-box'` (283-299); dubbelklick = påminnelse / spela om pågående (270-283). Raderna väljs av `runtime/epg-rows.ts` (`selectEpgRows`) som **behålls** och redan har egna tester.
- **Textinmatning:** `tv-settings.tsx:133` `useKeyboardPrompt()` (värdens `getTvKeyboardPanel()`, `data-live-tv-host-ui`, `id`-nyckeln mot återanvänd `useState`, `onDone`+`onClose`-fällan) och `tv/tv-keyboard.tsx` (plugineget QWERTY-rutnät, en `station()` per tangent, används av `tv-search.tsx`).
- **Väljarmönstret:** `runtime/tv/tv-channel-picker.tsx` — högerpanel `position: fixed; right: 0; width: dp(640)`, `data-panel-root`, `data-testid="channel-picker"`, kategorichips i `data-row`, rader i `data-scroll`, öppnaren fångas EN gång i en effekt med tom beroendelista, `nav.pushLayer(close)`.
- **Inställningarna på skrivbordet:** `epg-sources-section.tsx` — `EpgStatusCard` (rad 56-141, global butik `LIVE_TV_GLOBAL_EPG_ID`, `epgStatus()`/`refreshEpg()`/`waitForJob()` ur `index-client.ts`); `xtream-login-section.tsx` — `fetchXtreamAccount` (169), kategorival (297-370, `login.categoryIds`); `live-tv-settings-section.tsx` — listkorten + `EpgStatusCard`; `live-tv-grid.tsx` — egna listor (`customLists` 531, "Skapa lista" 1045-1052, listbockarna 1208/1301) och Uppdatera-knappen som kör `importList` (421-467, 1088).
- **Multivy:** `tv-multiview.tsx` — `GRID` (12-16), `Segment` för layout 2/3/4 (54-58), `liveBudget`/`liveLeft`-invarianten (26-44); `tv-multiview-store.ts` — `MultiviewLayout = 2|3|4`, `setLayout` (63-68), `enlargeTile` (70-75).
- **Svepet:** `runtime/hooks/useSwipeBack.ts` — `isSwipeBackGesture` (28-37), kantzon 32 px, no-op i TV-läge (rad 52 `if (!enabled || tvMode) return`). Idag kopplad till `go('hub')` i `live-tv-epg-page.tsx:67` m.fl. — alltså ett hopp till hubben, inte ett steg i Back-kedjan.
- **Spelaren:** `runtime/live-tv-player.tsx:108` `const tvChrome = isTv && tv ? tv : null`; TV-kromet renderas vid 1063-1064, skrivbordskromet i `else`-grenen med `player-extras.tsx` (1097, 1141, 1358).
- **Tester:** miljön är happy-dom (`vitest.config.ts:16`); TV-läget slås på med `__setTvModeForTests(true)` (`src/__test-stubs__/plugin-sdk.ts:234-244`); klickvägar testas redan med `fireEvent.click` i `tv/tv-guide.test.tsx`. Testfiler som följer med raderingarna: `runtime/live-tv-hub.test.tsx`, `runtime/live-tv-guide.test.tsx`.

---

### Task P1: Skalet överallt, i värdens scenlåda

**Files:** Modify `runtime/index.ts`, `runtime/tv/tv-shell.tsx`, `runtime/hooks/useIsMobileLayout.ts`, `src/__test-stubs__/plugin-sdk.ts`; create `runtime/tv/tv-scene-box.tsx`, `runtime/hooks/useNarrowSurface.ts`, `runtime/tv/tv-shell-scene.test.tsx`, `runtime/hooks/useNarrowSurface.test.ts`.

**Interfaces (consumes):** app A5 — `getTvSceneBox()`, `TV_SCENE_NARROW_PX`.
**Interfaces (produces):**
```ts
// runtime/tv/tv-scene-box.tsx
/** Värdens scenlåda när den finns, annars ett genomskinligt hölje. */
export function TvScene({ children }: { children: ReactNode }): JSX.Element
/** Finns värdens scenlåda? Styr minAppVersion-varningen och inget annat. */
export function hasHostScene(): boolean

// runtime/hooks/useNarrowSurface.ts
/**
 * Smal YTA — mätt i FYSISKA px, inte designpixlar.
 * tvScene() kan aldrig ge en designbredd under 1280 (breddgrenen håller
 * golvet och gör scenen högre i stället), så "smalare än 1024 designpixlar"
 * är ett tillstånd som inte finns. Värden skriver därför
 * data-tv-scene-narrow="1" på lådan när den MÄTTA bredden är < 1024 css-px,
 * och det är den flaggan som gäller här.
 */
export function useNarrowSurface(): boolean
```
- `runtime/index.ts`: `if (isTv) return createElement(LiveTvTvShell, props)` och de tre grenarna under den ersätts av `return createElement(LiveTvTvShell, props)`. `useTvMode()` behövs inte längre i `LiveTvBrowsePage`. Importerna av `LiveTvHub`/`LiveTvEpgPage`/`LiveTvChannelPage` tas bort (filerna raderas i P9 — tills dess kompilerar de vidare oanvända). Kommentarblocket 45-59 skrivs om till att beskriva den nya sanningen: en yta, tre inmatningsvägar.
- `tv-shell.tsx`: roten (`data-live-tv-tv-root`, 433) lindas i `<TvScene>`. `TvScene` returnerar `Host ? <Host>{children}</Host> : <>{children}</>` — och **alltid** genomskinligt när `useTvMode()`, eftersom värdens body-scen redan gäller där (två scener = dubbel skalning).
- Ikonraden (444): `paddingLeft` sänks utanför TV-läget — `padding: ${dp(36)}px 0 ${dp(32)}px` blir oförändrat på TV, och raden får `width: isTv ? dp(104) : dp(84)` med samma 60×60-poster centrerade. Måttet står som en namngiven konstant (`RAIL_W_TV`/`RAIL_W_DESKTOP`) överst i filen så fas 2 har ett ställe att ändra på. Skärmdump före/efter mot appens sidomeny (verifieras i P11).
- Raden **döljs inte** på en smal yta i fas 1 (koordinatorbeslut 2026-09-14: en telefon utan rad har ingen navigering alls). När `useNarrowSurface()` är sant komprimeras raden i stället: bredd `dp(64)`, 48×48-poster, klockan och etiketterna bort, Bakåt-posten kvar överst. **Ingen bottenrad i fas 1** — fas 2 ersätter den komprimerade raden med en bottenrad. Villkor och mått ligger på EN plats:
  ```tsx
  // FAS 2: här ersätts den komprimerade ikonraden av en bottenrad (spec §2).
  // Villkoret (useNarrowSurface) och måtten (RAIL_W_NARROW) samlas här så fas 2
  // har ett ställe att ändra på.
  const RAIL_W_NARROW = 64
  ```
- `hooks/useIsMobileLayout.ts`: koden är oförändrad, kommentaren skrivs om. Invarianten "en TV är aldrig mobil" står kvar, men meningen "mobilomgången 2026-09-03 får bara ändra mobilen" ersätts av: hooken styr numera **bara fas 2:s portträttgren i TV-trädet**, inte om TV-trädet renderas — TV-trädet renderas överallt sedan 0.6.0. Regeln ska inte längre kunna läsas som "TV-trädet = skrivbord".
- `src/__test-stubs__/plugin-sdk.ts`: `getTvSceneBox()` (returnerar null som förval, med en `__setTvSceneBoxForTests`), `tvSceneBoxPortalTarget()`, `tvPointerHoldHandlers` (en riktig kopia av appens — testerna ska testa BETEENDET, inte en stub), `TV_SCENE_NARROW_PX = 1024`.

- [ ] RED:
  - `runtime/tv/tv-shell-scene.test.tsx`: `skalet renderas utanför TV-läge` (ingen `useTvMode`-gren kvar — `render(<LiveTvBrowsePage/>)` med `__setTvModeForTests(false)` ger `[data-live-tv-tv-root]`); `värdens scenlåda används utanför TV-läget`; `ingen scenlåda i TV-läge` (värdens body-scen äger skalan); `saknad scenlåda ritar ändå skalet` (äldre värd → oskalat men inte krasch).
  - `ikonraden är smalare utanför TV-läget` och `ikonraden komprimeras på en smal yta` (bredd 64, inga etiketter, Bakåt kvar).
  - `runtime/hooks/useNarrowSurface.test.ts`: `läser data-tv-scene-narrow på lådan`, `är falskt utan låda`, `reagerar på att attributet ändras` (MutationObserver).
- [ ] GREEN — implementera; hela sviten grön; `npx tsc --noEmit`.
- [ ] Commit: `live-tv: TV-trädet renderas på alla ytor och skalas av värdens scenlåda`

---

### Task P2: Pekaren i primitiverna

**Files:** Modify `runtime/tv/tv-ui.tsx`, `runtime/tv/tv-ui.test.tsx`.

**Interfaces (consumes):** app A4/A5 — `tvPointerHoldHandlers`, `TvPointerEvent`.
**Interfaces (produces):** `station()` oförändrad signatur, nytt beteende:
```ts
export function station(
  onOk: () => void,
  onHold?: (element: HTMLElement) => void,
  extra?: Record<string, string>,
): StationProps
// Nytt när onHold finns: data-hold="" på elementet, plus pekarhållets
// handlers (onPointerDown/Up/Cancel/Leave, onContextMenu, onClickCapture)
// SIDA VID SIDA med dagens tangenthåll. En station kan hållas med fjärr,
// mus (högerklick eller 650 ms) och finger — en implementation per handling.
```
- `data-hold=""` är den enda kroken "…"-knappen (P3) behöver. Den sätts oavsett läge (attributet är inert på TV) så inget anropsställe behöver ändras — spec 4.1.
- Hovringslägen på `station()`, `Chip`, `RoundBtn`, `Toggle`: en gemensam CSS-regel i `TvFocusStyle()` i stället för inline-stilar (inline kan inte uttrycka `:hover`), scopad till `[data-live-tv-tv-root]` som resten:
  ```css
  @media (hover: hover) and (pointer: fine) {
    [data-live-tv-tv-root] [data-f]:hover { background-color: rgba(252,252,255,0.06); }
    [data-live-tv-tv-root] [data-live-tv-chip][data-f]:hover { border-color: rgba(255,255,255,0.22); }
  }
  ```
  `@media (hover: hover)` gör att regeln aldrig gäller en TV med fjärr eller en pekskärm (där `:hover` annars fastnar efter ett tryck).
- Fokusringen (81-99) villkoras på värdens `data-focus-source`: ringen ritas inte när roten bär `[data-focus-source="pointer"]`. Skrivs som `:root:not([data-focus-source="pointer"]) [data-live-tv-tv-root] [data-f]:focus, …` så TV-läget (som alltid står på `key`) ser exakt dagens ring.
- `user-select: none` på stationer — **men inte på beskrivningstext**: regeln skrivs `[data-live-tv-tv-root] [data-f] { user-select: none }` plus en undantagsregel `[data-live-tv-tv-root] [data-selectable-text] { user-select: text }`, och program- och kanalbeskrivningar (i `tv-channel.tsx`, `tv-guide-shared.tsx`, rutnätets detaljremsa) får attributet. Attributet sätts i P6/P9 där texterna bor; P2 levererar regeln och dokumenterar kravet.
- `title`-verktygstips på trunkerade titlar: `station()` vidarebefordrar redan `extra`; `Tag`/`Chip` får ett valfritt `title`-genomsläpp så anropsställena kan sätta det.

- [ ] RED — `runtime/tv/tv-ui.test.tsx`:
  - `station utan onHold har inget data-hold`; `station med onHold har data-hold`.
  - `pointerdown i 650 ms kör onHold` (falska timers) och `det efterföljande klicket kör INTE onOk`.
  - `pointerup före 650 ms ger onOk via klicket, inte onHold`.
  - `pointerleave avbryter hållet`.
  - `contextmenu på en station med håll kör onHold och preventDefault`.
  - `klick på en station utan håll kör onOk som förut` (regression).
  - `TvFocusStyle innehåller hovringsregeln bakom @media (hover: hover)` och `ringen är villkorad på data-focus-source`.
- [ ] GREEN — implementera; hela sviten grön (`tv-guide.test.tsx`, `tv-hub.test.tsx`, `tv-player-chrome.test.tsx` är regressionsnätet för att tangenthållet är orört); `npx tsc --noEmit`.
- [ ] Commit: `live-tv: stationerna svarar på mus och finger – håll, högerklick, hovring`

---

### Task P3: "…"-knappen, Bakåt med pekare och kantsvepet

**Files:** Create `runtime/tv/tv-hold-affordance.tsx`, `runtime/tv/tv-shell-pointer.test.tsx`; modify `runtime/tv/tv-shell.tsx`, `runtime/hooks/useSwipeBack.ts`, `runtime/tv/tv-strings.ts`.

**Depends on:** P1 (äger `tv-shell.tsx` före det), P2 (`data-hold`).
**Interfaces (produces):**
```ts
/**
 * EN "…"-knapp för hela skalet, inte en per kort.
 * Delegerad pointerover-lyssnare på rotnoden: den hovrade [data-hold]-stationen
 * mäts med getBoundingClientRect() och knappen läggs i stationens övre högra
 * hörn. Ritas ALDRIG i TV-läge och aldrig när pekaren är grov
 * (matchMedia('(pointer: coarse)')). Klick = stationens onHold.
 */
export function TvHoldAffordance({ rootRef, enabled }: {
  rootRef: RefObject<HTMLElement | null>
  enabled: boolean
}): JSX.Element | null
```
- Knappen har ikon **och** tooltip `title={tt('moreOptions')}` = "Fler val" / "More options" (Jerrys följdkrav: tydlig, inte diskret). Nya strängar i `tv-strings.ts`: `moreOptions`, `railBack`.
- Döljs vid `pointerleave` ut ur stationen, vid scroll i någon förfader (`scroll`-lyssnare i capture-fas på roten) och när fönstret ändrar storlek. Mäts i lådans designpixlar: `getBoundingClientRect()` ger skalade px, och knappen ligger inne i samma transform — så positionen räknas relativt rotnodens egen rect, inte mot viewporten.
- Klicket når stationens `onHold` genom att knappen skickar en syntetisk `contextmenu` (med `preventDefault` redan anropad) på stationen — då finns ingen andra väg in i handlingen att hålla synkad, och P2:s enda kontrakt (`onContextMenu` → `onHold`) återanvänds.
- **Bakåt i ikonraden:** `rail`-listan (384) får en Bakåt-post FÖRST när `!isTv`, med `Icons.ArrowLeft` (eller närmaste befintliga) och `onOk: back`. Den anropar **samma `back()`** (258-270) som tangenten — alla fyra nivåerna (lager → PIN → spelare → vy → `requestBrowseBack()`) nås alltså med pekaren. `back` ligger redan i `nav`, så ingen ny väg skapas.
- **Svepet:** `useSwipeBack(back, !menu && pending === null)` monteras i skalet. Hooken själv ändras bara i sin kommentar och i `enabled`-semantiken: den navigerar inte längre till hubben utan **tar ett steg i kedjan** (det är anroparen som bestämmer, och skalet skickar `back`). Hookens TV-no-op (rad 52) står kvar.
- Zappen (343-361) får `[contenteditable]` i sitt undantag vid sidan av `INPUT`/`TEXTAREA` (spec 5).

- [ ] RED — `runtime/tv/tv-shell-pointer.test.tsx`:
  - `pointerover på en [data-hold]-station visar "…"`, `klick på "…" kör stationens onHold`, `pointerleave döljer knappen`.
  - `ingen "…"-knapp i TV-läge` (`__setTvModeForTests(true)`).
  - `ingen "…"-knapp när pekaren är grov` (stubba `window.matchMedia('(pointer: coarse)')`).
  - `Bakåt-posten finns i raden utanför TV-läget och saknas i TV-läge`.
  - `Bakåt-kedjan är identisk från tangent och från klick`: samma utgångsläge (öppet lager → spelare → vy → `requestBrowseBack`) körs två gånger, en gång med `fireEvent.keyDown(window, { key: 'Escape' })` och en gång med `fireEvent.click(skärmens Bakåt-post)`, och de två sekvenserna jämförs.
  - `svepet tar ett steg i kedjan i stället för att hoppa till hubben`.
  - `zappen äter inte siffror i ett contenteditable`.
- [ ] GREEN — implementera; hela sviten grön (`tv-shell-back.test.tsx` är regressionsnätet); `npx tsc --noEmit`.
- [ ] Commit: `live-tv: en "…"-knapp på hovring, Bakåt i raden och kantsvep genom samma kedja`

---

### Task P4: Gemensam textinmatning

**Files:** Create `runtime/tv/tv-text-entry.tsx`, `runtime/tv/tv-text-entry.test.tsx`; modify `runtime/tv/tv-search.tsx`.

**Interfaces (produces):**
```ts
/**
 * EN textinmatning, tre inmatningsvägar.
 * TV-läge: värdens TvKeyboardPanel (som useKeyboardPrompt gör idag, inklusive
 *   id-nyckeln mot återanvänd useState och onDone/onClose-fällan).
 * Utanför TV: en rad med ett riktigt <input> i en liten dialog — inget
 *   skärmtangentbord på skrivbord.
 */
export function useTextPrompt(): {
  available: boolean
  ask: (title: string, initial: string, onDone: (value: string) => void) => void
  node: ReactNode
}
/** Sökfältet: TV-tangentbordet eller ett fokuserat <input>. */
export function TvTextField(props: {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
  autoFocus?: boolean
}): JSX.Element
```
- `useTextPrompt` är `useKeyboardPrompt` (`tv-settings.tsx:133-196`) **flyttad ordagrant** till den nya filen plus en icke-TV-gren. Alla fem kommentarer om fällorna (`id`-nyckeln, öppnaren fångad en gång, `data-live-tv-host-ui`, `onDone`+`onClose`, ingen `pushLayer`) följer med — de beskriver buggar som redan kostat en runda.
- Icke-TV-grenen: en `fixed`-dialog inne i scenlådan med `data-panel-root=""` (så motorns pilar stannar i den), ett `<input autoFocus>`, Avbryt/Klar, `Enter` = Klar, `Escape` = Avbryt. Registreras som `nav.pushLayer` — till skillnad från värdens panel äger den inte Back själv.
- `TvTextField` i `tv-search.tsx`: i TV-läge exakt dagens `TvKeyboard` (`tv-keyboard.tsx` rörs inte); utanför TV ett `<input>` som får fokus vid montering, med `data-f` så motorns pilar kan lämna det (appens A3 undantar textfält från pilarna, alltså lämnar man fältet med Tab eller musen — det är avsiktligt: pilar ska flytta markören i texten).
- `tv-settings.tsx` importerar `useTextPrompt` i **P7**, inte här — P4 lämnar `tv-settings.tsx` orört och behåller dess lokala `useKeyboardPrompt` tills P7 byter den. Det gör att P4 och P7 inte krockar om filen.

- [ ] RED — `runtime/tv/tv-text-entry.test.tsx`:
  - `i TV-läge renderas värdens panel och inget <input>`.
  - `utanför TV-läget renderas ett <input> och ingen TvKeyboardPanel`.
  - `Enter i fältet kör onDone med värdet`, `Escape stänger utan onDone`.
  - `två prompts i rad börjar med rätt begynnelsevärde` (regressionen mot "http://panel:8080jerry").
  - `sökvyn utanför TV har ett fokuserat fält och inget skärmtangentbord`; `sökvyn i TV har TV-tangentbordet som förut`.
- [ ] GREEN — implementera; sviten grön (`tv-search.test.tsx`, `tv-keyboard.test.tsx` oförändrade); `npx tsc --noEmit`.
- [ ] Commit: `live-tv: en textinmatning som byter mellan TV-tangentbord och riktigt fält`

---

### Task P5: Rutnätets geometri

**Files:** Create `runtime/tv/epg-grid-geometry.ts`, `runtime/tv/epg-grid-geometry.test.ts`.

**Interfaces (produces):**
```ts
export const HOUR_PX = 240
export const PX_PER_MIN = HOUR_PX / 60
export const CHANNEL_COL_PX = 160
export const ROW_MIN_H_PX = 56
/** Under så här brett kan ett block inte bära text — det ritas som en markör. */
export const MIN_BLOCK_PX = 18
/** Under så här brett ritas bara titeln, ingen tid. */
export const TITLE_ONLY_PX = 72

export type EpgBlockShape = 'marker' | 'title' | 'full'
export interface EpgBlockBox {
  left: number
  width: number
  shape: EpgBlockShape
  /** min(8, width/3) — padding som aldrig kan vara bredare än blocket. */
  paddingX: number
  clippedStart: boolean
  clippedEnd: boolean
}
export function epgBlockBox(
  programme: { start: number; stop: number },
  windowStart: number,
  windowEnd: number,
): EpgBlockBox | null   // null = helt utanför fönstret
export function epgRowBoxes(
  programmes: readonly { start: number; stop: number }[],
  windowStart: number,
  windowEnd: number,
): EpgBlockBox[]
export function nowLinePx(nowMs: number, windowStart: number): number
export function hourMarks(windowStart: number, windowEnd: number): number[]
```
- **Buggen som fixas** (Jerrys skärmdump, "Live NFL Football Night" över "NFL Cowboys @ Giants", "Matc…"): `live-tv-epg-page.tsx:258` sätter `width = Math.max(4, …)` medan blocket har `padding: '6px 8px'` och `boxSizing: 'border-box'` (283-299). Ett block kan inte bli smalare än sin egen vågräta padding — 4 px renderas som ≥16 px och lägger sig över grannen, som är absolut positionerad och inte reflowar. Här försvinner golvet ur bredden: `width` är den SANNA bredden (kan bli 1,2 px), `shape` säger vad som får plats, och `paddingX` är `Math.min(8, width / 3)`.
- `epgRowBoxes` garanterar att intervallen aldrig överlappar: nästa blocks `left` är alltid `≥ föregående.left + föregående.width` (blocken klipps mot fönstret, och programlistan är sorterad — funktionen sorterar defensivt).
- Klippning vid fönsterkanterna sätter `clippedStart`/`clippedEnd` så vyn kan rita en kantmarkering i stället för en falsk start/sluttid.

- [ ] RED — `runtime/tv/epg-grid-geometry.test.ts`:
  - `ett program på 30 minuter blir 120 px och shape 'full'`.
  - `ett program under MIN_BLOCK_PX blir shape 'marker' och paddingX 0`.
  - `ett program mellan MIN_BLOCK_PX och TITLE_ONLY_PX blir shape 'title'`.
  - `paddingX är aldrig bredare än en tredjedel av blocket` (egenskapstest över 1–240 px).
  - `blocken i en rad överlappar aldrig` (regressionen mot skärmdumpen: två program där det första är 1 minut långt).
  - `ett program som börjar före fönstret klipps och markeras clippedStart`; `… slutar efter fönstret → clippedEnd`.
  - `ett program helt utanför fönstret ger null`.
  - `nowLinePx och hourMarks matchar 240 px per timme`.
- [ ] GREEN — implementera; sviten grön; `npx tsc --noEmit`.
- [ ] Commit: `live-tv: tablårutnätets geometri i en ren modul – smala block blir markörer`

---

### Task P6: Guideläget Rutnät

**Files:** Create `runtime/tv/tv-guide-grid.tsx`, `runtime/tv/tv-guide-grid.test.tsx`; modify `runtime/tv/tv-guide.tsx`, `runtime/tv/tv-settings-store.ts`, `runtime/tv/tv-strings.ts`, `runtime/tv/tv-guide-playlists.tsx` (bara `modeOptions`), `runtime/tv/tv-settings.tsx` är **inte** med här (P7 äger den — segmentlistan där uppdateras av P7).

**Depends on:** P5 (geometrin), P2 (`data-hold`, hovring).
**Interfaces (produces):**
```ts
// tv-settings-store.ts
export type GuideMode = 'now' | 'tl' | 'playlists' | 'grid'
const GUIDE_MODES: GuideMode[] = ['now', 'tl', 'playlists', 'grid']

// tv-guide-grid.tsx
export function TvGuideGrid(props: TvViewProps & {
  mode: GuideMode
  onModeChange: (mode: GuideMode) => void
}): JSX.Element
```
- Porteringen av `live-tv-epg-page.tsx` till TV-trädet, med SAMMA delar: Idag/Imorgon-växeln, Nu-knappen, kategorichips, 240 px per timme, 160 px kanalkolumn (`position: sticky` utanför smal yta), Nu-linjen, detaljremsan för valt program, "Visa fler"-knappen med `selectEpgRows`:s `hasMore`-skillnad. Data via `hooks/useSchedules.ts` och `epg-rows.ts` **oförändrade**. Alla mått skrivs som `dp()` ur P5:s konstanter — de är designpixlar inne i scenen.
- Segmentväxeln i `tv-guide.tsx:142` och `tv-guide-playlists.tsx:87` får en fjärde post: Nu/Sen · Tablå · **Rutnät** · Spellistor (ny sträng `modeGrid` i `tv-strings.ts`). `tv-guide.tsx` routar `mode === 'grid'` till `TvGuideGrid` vid sidan av `TvGuideStandard`/`TvGuidePlaylists`; `modeStack`-logiken (43-56) gäller det nya läget likadant.
- **Fjärrnavigering:** varje programblock är en `station()`, kanalkolumnen en `station()` per rad. ◂▸ flyttar i tid inom raden och ▴▾ byter kanal — motorns geometri räcker, eftersom blocken är absolut positionerade i rad. Tidsspåret bär `data-row=""` och listan `data-scroll=""` så fokus hålls i sikte. `data-init` sätts på det pågående programmet i första raden (annars på första kanalen).
- **OK/håll:** OK = spela om programmet pågår (`programme.start <= nowMs < programme.stop`), annars öppna kanaldetalj med programmet förvalt (`nav.openChannel(channel, programme.start)`). Håll OK = glasmeny med **Påminnelse på/av** och **Lås/Lås upp** ovanpå `nav.channelMenu(channel, element, extra)`. Dubbelklicket från skrivbordet behålls för mus: pågående program → spela, annars påminnelse av/på (`live-tv-epg-page.tsx:270-283`).
- Blocken: `overflow: hidden`, enradig ellips på både titel och tid, `title`-attribut alltid (även på markörer — det är där verktygstipset är enda vägen till titeln). Detaljremsans beskrivningstext får `data-selectable-text` (P2:s undantag).
- Tomt läge: samma text som idag när `selectEpgRows` ger noll rader.

- [ ] RED — `runtime/tv/tv-guide-grid.test.tsx`:
  - `Rutnät finns i segmentväxeln och sparas i live_tv_guide_mode_v1`.
  - `ett pågående program spelas med OK`; `ett kommande program öppnar kanaldetaljen med programmet förvalt`.
  - `håll OK på ett block öppnar menyn med Påminnelse`.
  - `dubbelklick på ett kommande program sätter påminnelse`; `dubbelklick på ett pågående spelar kanalen`.
  - `smala block ritas utan text men behåller title` (mot P5:s `shape`).
  - `tidsspåret bär data-row och listan data-scroll`.
  - `utan tablå visas tomtexten`.
- [ ] GREEN — implementera; hela sviten grön (`tv-guide.test.tsx` regressionsnät för de tre gamla lägena); `npx tsc --noEmit`.
- [ ] Commit: `live-tv: guideläget Rutnät – skrivbordets tablå i TV-trädet`

---

### Task P7: Inställningarnas snabbknappar (TV-ytan)

**Files:** Create `runtime/hooks/useEpgStatus.ts`, `runtime/hooks/useEpgStatus.test.ts`, `runtime/tv/tv-list-picker.tsx`; modify `runtime/tv/tv-settings.tsx`, `runtime/tv/tv-settings.test.tsx`, `runtime/tv/tv-strings.ts`.

**Depends on:** P4 (`useTextPrompt`), P6 (`GuideMode` med `'grid'` i segmentlistan på rad 90).
**Interfaces (produces):**
```ts
/** EPG-diagnostiken, delad mellan skrivbordssektionen och TV-fliken. */
export function useEpgStatus(): {
  status: EpgStatus | null
  urls: string[]
  refreshing: boolean
  refresh: () => Promise<void>
  reload: () => Promise<void>
}
/** Kanalväljare med bockar, i tv-channel-picker-mönstret. Flervalsvarianten. */
export function TvListPicker(props: {
  model: LiveTvModel
  nav: TvNav
  title: string
  selected: ReadonlySet<string>   // channelKey
  onToggle: (channel: M3uChannel) => void
  onClose: () => void
}): JSX.Element
```
- `useEpgStatus` är datadelen av `EpgStatusCard` (`epg-sources-section.tsx:56-141`) utbruten ordagrant: `epgStatus(LIVE_TV_GLOBAL_EPG_ID)`, `onLiveTvListsChanged`-prenumerationen, `refreshEpg(...)` + `waitForJob`, och `catch`-grenen som låter resten av inställningarna fungera utan siffror på en äldre app. **Butiken är GLOBAL** (ett lager för alla list-id) — hooken tar därför inga argument, och kommentaren om varför blocket ligger över listkorten och inte i varje kort följer med.
- `TvListPicker` är `tv-channel-picker.tsx` med flerval: bock i stället för "välj och stäng", `data-panel-root`, kategorichips i `data-row`, rader i `data-scroll`, öppnaren fångad EN gång, `nav.pushLayer(close)`. De fyra kommentarerna om `navRef`/`onCloseRef` följer med — de beskriver "markören hoppar hem varje minut".
- `tv-settings.tsx` — fyra tillägg, alla i väljarmönstret och alla nåbara utan att lämna Live TV:
  1. **Egna listor med kanalväljare** i fliken Spellistor: "Skapa lista" (namn via `useTextPrompt`) + `TvListPicker` mot listans medlemmar. Samma lagring som skrivbordet (`live-tv-grid.tsx:531,1208,1301` — `kind: 'custom'`, `isChannelInLiveTvList`).
  2. **EPG-status per adress** i EPG-fliken: en radlista ur `useEpgStatus().status.urls` med hämtad tid, antal kanaler/program och fel per adress, plus en Hämta om-knapp. (Liggarens beslut att TV:s EPG-flik avsiktligt saknar diagnostik **upphävs** här av Jerrys krav — skriv det i kommentaren så nästa läsare inte "rättar tillbaka".)
  3. **Fullständigt Xtream-konto**: ett kontokort (status, utgångsdatum, max anslutningar) via `fetchXtreamAccount`, och kategorival vid import via `fetchXtreamCategories` i `TvListPicker`-mönstret, skrivet till `login.categoryIds`. Trestegsguiden (`tv-settings.tsx:381-405`) behålls som väg in.
  4. **Uppdatera**: en knapp per lista **och** en som kör alla, båda via `importList` med förloppet ur `ImportStatus` — samma anrop som skrivbordets batch-knapp (`live-tv-grid.tsx:421-467`).
- Den lokala `useKeyboardPrompt` (133-196) ersätts av importen från P4; koden flyttas inte tillbaka.
- Segmentlistan på rad 90 får `{ key: 'grid', label: tt('modeGrid') }` (P6:s sträng).

- [ ] RED:
  - `runtime/hooks/useEpgStatus.test.ts`: `läser global status en gång`, `refresh kör refreshEpg + waitForJob och läser om`, `ett fel lämnar hooken i null utan att kasta`, `prenumererar på liständringar`.
  - `runtime/tv/tv-settings.test.tsx`: `Spellistor kan skapa en egen lista och bocka i kanaler`; `EPG-fliken visar hämtad tid och fel per adress`; `Xtream-fliken visar kontokortet`; `kategorival skrivs till login.categoryIds`; `Uppdatera per lista kör importList för just den listan`; `Uppdatera alla kör importList för varje lista`; `utanför TV-läget används ett riktigt fält i stället för panelen` (P4-integration).
- [ ] GREEN — implementera; hela sviten grön; `npx tsc --noEmit`.
- [ ] Commit: `live-tv: snabbknappar i TV-inställningarna – egna listor, EPG-status, Xtream-konto, Uppdatera`

---

### Task P8: Skrivbordssektionerna kompletteras

**Files:** Modify `runtime/epg-sources-section.tsx`, `runtime/xtream-login-section.tsx`, `runtime/live-tv-settings-section.tsx`, `runtime/live-tv-grid.tsx` (bara Uppdatera-delen), `runtime/hub-strings.ts`; tester i respektive `.test.tsx`.

**Depends on:** P7 (`useEpgStatus`).
- Sektionerna **behålls oförändrade i uppbyggnad** — de är primärytan för administration (spec 4.4). Bara två saker händer:
  1. `EpgStatusCard` byggs om till att läsa `useEpgStatus()` i stället för sin egen `useState`/`useEffect`-kod. Renderingen är oförändrad — det här är en ren utbrytning, och testet i `epg-sources-section.test.tsx` ska passera utan ändring.
  2. Där en av spec 4.4:s fyra funktioner **saknas** på skrivbordet läggs den till, inget annat: en **Uppdatera-knapp per lista** vid sidan av dagens batch-knapp (`live-tv-grid.tsx:1088` kör redan alla), så båda ytorna har både "per lista" och "alla".
- Punkt 1 (egna listor) och 3 (Xtream-konto/kategorier) finns redan på skrivbordet (`live-tv-grid.tsx:531,1045-1052`, `xtream-login-section.tsx:169,297-370`) och rörs **inte**.
- Nya strängar i `hub-strings.ts` bara om Uppdatera-per-lista behöver en.

- [ ] RED:
  - `epg-sources-section.test.tsx`: befintliga tester ska passera oförändrade efter utbrytningen (det ÄR testet), plus `EpgStatusCard hämtar via den delade hooken` (mocka `useEpgStatus`).
  - `live-tv-grid-lists.test.tsx`: `Uppdatera per lista kör importList bara för den listan`; `Uppdatera alla kör importList för varje lista` (regression).
- [ ] GREEN — implementera; hela sviten grön; `npx tsc --noEmit`.
- [ ] Commit: `live-tv: skrivbordssektionerna delar EPG-diagnostiken och får Uppdatera per lista`

---

### Task P9: Spelarlagret överallt och raderingen av de ersatta vyerna

**Files:** Create `runtime/tv/tv-player-props.ts`; modify `runtime/live-tv-player.tsx`, `runtime/live-tv-grid.tsx`, `runtime/tv/tv-shell.tsx` (bara anropet till den nya byggaren); **delete** `runtime/live-tv-hub.tsx`, `runtime/live-tv-hub.test.tsx`, `runtime/live-tv-epg-page.tsx`, `runtime/live-tv-channel-page.tsx`, `runtime/live-tv-guide.tsx`, `runtime/live-tv-guide.test.tsx`, `runtime/player-extras.tsx`.

**Depends on:** P8 (äger `live-tv-grid.tsx` före det), P1 (`runtime/index.ts` importerar de raderade filerna tills dess).
**Interfaces (produces):**
```ts
/** TV-kromets props, byggda ur modellen — delas av skalet och startsideöverstyrningen. */
export function buildTvPlayerProps(args: {
  model: LiveTvModel
  settings: TvSettings
  channel: M3uChannel
  locale: string
  gateOpen: boolean
  onOpenGuide: () => void
  onOpenMultiview: () => void
  onOpenChannelDetails: () => void
  onAddToMultiview: (channel: M3uChannel) => void
  onSwitchChannel: (channel: M3uChannel) => void
}): LiveTvPlayerTvProps
```
- **`live-tv-player.tsx:108`** `const tvChrome = isTv && tv ? tv : null` blir `const tvChrome = tv ?? null`. Därmed tas `else`-grenen (1066-1400) och `player-extras.tsx` bort — men först när **varje** anropsställe skickar `tv`:
  - `tv-shell.tsx` bygger redan propsen inline (405-430); de flyttas ordagrant till `buildTvPlayerProps` och skalet anropar den.
  - `live-tv-grid.tsx` (startsideöverstyrningen) öppnar spelaren **utan** `tv` idag. Den får `buildTvPlayerProps` med sin egen modell, och navigeringskallbackarna mappas till `onNavigate` in i bläddringssidan (`view: 'guide' | 'multi' | 'channel'`). Utan det steget hade raderingen av `player-extras.tsx` tagit bort startsidans spelarkrom — det är den enda platsen i repot där den gamla grenen fortfarande nås.
- **`live-tv-grid.tsx` guideoverlayen:** filen laddar `./live-tv-guide` lat (rad 206 och 754) för sin egen guide. Den överlagringen tas bort; guideknappen navigerar i stället in i bläddringssidans guidevy (`onNavigate('live-tv-browse', { view: 'guide' })`). `guideOpen`/`LiveTvGuideComponent`-tillståndet försvinner med den. `live-tv-grid.tsx` behålls i övrigt orört — den är startsideöverstyrningens yta (`runtime/index.ts:49-56`, `live-tv-home-override.tsx`).
- Raderingarna: `live-tv-hub.tsx` (895 rader), `live-tv-epg-page.tsx`, `live-tv-channel-page.tsx`, `live-tv-guide.tsx`, `player-extras.tsx` och de två testfilerna. `epg-rows.ts` + `epg-rows.test.ts` **behålls** (P6 använder dem). Kontrollera med `grep -rn "live-tv-hub\|live-tv-epg-page\|live-tv-channel-page\|live-tv-guide\|player-extras" runtime src` att bara kommentarer blir kvar — `tv/tv-channel.tsx:21,143` och `tv/tv-settings.tsx:502` refererar till dem i text; de skrivs om till att peka på den nya platsen i stället för en fil som inte finns.
- De döda `isTv`-grenarna inne i de raderade filerna (inventering §4) försvinner av sig själva.

- [ ] RED:
  - `runtime/tv/tv-player-props.test.ts`: `byggaren ger samma props som skalet byggde inline` (snapshot mot en riggad modell); `favourite speglar pinnedSet`; `gateOpen går rakt igenom`.
  - `runtime/live-tv-playback-fallback.test.ts`/`tv-shell-player.test.tsx`: `TV-kromet renderas även utanför TV-läget` (regressionen för `tvChrome`-villkoret).
  - `live-tv-home-override.test.tsx`: `startsidans spelare får TV-kromet`; `guideknappen navigerar till bläddringssidans guidevy i stället för att öppna en egen overlay`.
- [ ] GREEN — implementera, radera, kör hela sviten; `npx tsc --noEmit`; `grep` ovan ger bara kommentarer.
- [ ] Commit: `live-tv: ett spelarkrom på alla ytor – de ersatta skrivbordsvyerna raderas`

---

### Task P10: Multivy på smal yta

**Files:** Modify `runtime/tv/tv-multiview.tsx`, `runtime/tv/tv-multiview.test.tsx`.

**Depends on:** P1 (`useNarrowSurface`).
- När `useNarrowSurface()` är sant: **två rutor staplade lodrätt** (en över, en under) — `GRID` får en smal variant `{ columns: '1fr', rows: '1fr 1fr' }` — och kapacitetsväxeln 2/3/4 (`Segment`, rad 54-58) döljs. Layouten tvingas till `2` medan ytan är smal, via `setLayout(state, 2)`; det **sparade** valet rörs inte, så en telefon som läggs i landskap eller ett fönster som breddas får tillbaka användarens 3 eller 4.
- `liveBudget`/`liveLeft`-invarianten (26-44) är oförändrad — den räknar rutor, inte kolumner. Läs kommentaren innan du rör loopen.
- Kanalväljaren (`TvChannelPicker`, `width: dp(640)`) får `width: min(dp(640), 100%)` så den inte går utanför en smal yta.

- [ ] RED — `runtime/tv/tv-multiview.test.tsx`:
  - `smal yta ger två rutor staplade lodrätt`; `kapacitetsväxeln döljs på smal yta`; `det sparade layoutvalet ändras inte av den smala grenen`; `bred yta är oförändrad` (regression).
- [ ] GREEN — implementera; sviten grön; `npx tsc --noEmit`.
- [ ] Commit: `live-tv: multivy med två staplade rutor på smal yta`

---

### Task P11: Version, changelog, bygge och verifiering

**Files:** Modify `plugins/live-tv/plugin.json`, `plugins/live-tv/package.json`, `marketplace.json`, `plugins/live-tv/CHANGELOG.md`, `plugins/live-tv/runtime/index.ts` (versionssträngarna på rad 32 och 41), `plugins/live-tv/dist/runtime.js`.

- [ ] Version **0.6.0** och `minAppVersion` **0.1.597** på alla fyra ställena (`plugin.json:10-11`, `package.json`, `marketplace.json:57-58`, `runtime/index.ts:32,41`). **Katalogen måste vara ≥ den publicerade versionen** — annars skuggar cachen den bundlade runtimen.
- [ ] CHANGELOG (engelska, kort): same layout everywhere — TV, desktop and phone render one component tree; mouse gets hover, a visible "…" for the hold menu, right-click and a Back button; new **Grid** guide mode with the overlap fix; settings quick controls reach custom lists, EPG diagnostics, the full Xtream account and per-list refresh from inside Live TV; multiview on narrow surfaces; the replaced desktop pages are gone. Phone is "works, small" until phase 2.
- [ ] **Bygg `dist/runtime.js` EFTER bumpen**, från ett app-träd som bär A1–A7: `node scripts/build-plugin-runtime.mjs` körd från `Moviefinder` på `feature/live-tv-everywhere-host` (eller `.worktrees/main-plugin-build` när grenen mergats). `@/` löses mot byggträdet, och `@/lib/plugin-sdk` kompileras in — ett äldre träd ger en bunt utan `getTvSceneBox`. Kontrollera att `dist/runtime.js` innehåller strängen `0.6.0` innan release. Kör inte ett DMG-bygge samtidigt (delad temp-katalog).
- [ ] **Verifiering med mus, Playwright i `http://localhost:5173/tv-sim.html`:** hovring över ett kanalkort visar "…"; klick på den öppnar kanalmenyn; högerklick öppnar samma meny; Bakåt-posten i raden tar ett steg per klick genom hela kedjan; rutnätet scrollar i sidled med hjulet utan att motorns kantscroll slåss emot; fokusringen syns inte när man navigerar med musen men kommer tillbaka på första piltryck.
- [ ] **Verifiering i appens dev-server** (app-worktreet med SDK-tilläggen, `npm run dev -- --port 5174` om 5173 är upptagen): pluginsidan i **1512×982 med sidomeny öppen och stängd** samt **1280×800** — skärmdump mot `Moviefinder/design_handoff_live_tv_tv_mode/screenshots/01-hubb.png` och `03-kanalguide-tabla.png`. Ikonradens nya vänstermått bedöms i det öppna-sidomeny-läget (det var klagomålet). Rutnätet fotograferas mot Jerrys överlappspanel före/efter.
- [ ] **Telefon:** landskap och porträtt — förväntat utfall "fungerar, litet". Kontrollera bara att inget är oåtkomligt eller avklippt, inte att det är vackert.
- [ ] Commit: `live-tv 0.6.0: nya designen på skrivbord och mobil`

**Manuell testlista till Jerry (inget släpps utan klartecken):**
1. Skrivbord 1512×982 med sidomeny öppen, och stängd. Ser ikonraden lagom bred ut nu?
2. Skrivbord 1280×800.
3. Hovra ett kanalkort → "…" syns → klick öppnar menyn. Högerklick gör samma sak.
4. Bakåt: klicka Bakåt-posten fyra gånger från ett öppet lager och kontrollera att man lämnar Live TV sist. Samma sak med Esc.
5. Guiden → **Rutnät**: jämför mot skärmdumpen med "Live NFL Football Night" — inga överlappande block, korta program är streck med verktygstips.
6. Inställningar: skapa en egen lista och bocka i kanaler; läs EPG-status per adress; se Xtream-kontokortet och välj kategorier; kör Uppdatera på en lista och Uppdatera alla. Samma fyra saker i appens egna Live TV-inställningar.
7. Multivy på telefon: två rutor över varandra.
8. Telefon landskap och porträtt: allt nåbart, litet.
9. TV (`?tvmode=1` eller riktig TV): ingenting ska se annorlunda ut än före den här omgången.

## Självgranskning

Spec 4.1 inmatningstabellen → P2 (OK/håll i `station()`), P3 ("…", Bakåt, svep), P4 (text), P3 (zappens `[contenteditable]`); spec 4.2 skal och skalning → P1 (grenen bort, scenlådan, ikonraden, `useIsMobileLayout`-kommentaren); spec 4.3 vyer + Rutnät + överlappsfixen → P5 + P6; spec 4.4 punkterna 1–4 → P7 (TV-ytan) + P8 (skrivbordsytan), textinmatningen → P4; spec 4.5 "ersätts och raderas" → P9, "ska följa med" (hovring, hjulscroll, `user-select`, omritning, `title`) → P2 (regler) + P6 (rutnätet) + P1 (scenlådans ResizeObserver); spec 5 gränserna → P1 (saknad låda, hög scen), P3 (grov pekare), P2/app-A4 (högerklick i textfält), P6 (rutnät utan tablå); spec §8.5 multivy på telefon → P10; spec 6 tester → per task; spec 7 verifiering och release → P11.

**Typkonsistens:** `GuideMode` utökas i P6 (`tv-settings-store.ts`) och konsumeras av P6 (`tv-guide.tsx`, `tv-guide-playlists.tsx`) och P7 (`tv-settings.tsx`) — P7 måste köra efter P6 eller kompileringen faller på en saknad `'grid'`-etikett. `EpgBlockBox`/`EpgBlockShape` (P5) används bara av P6. `LiveTvPlayerTvProps` (befintlig, `tv/tv-player-types.ts`) är returtypen för P9:s `buildTvPlayerProps` och konsumeras av både `tv-shell.tsx` och `live-tv-grid.tsx`. `EpgStatus` (från `index-client.ts`) delas av P7:s hook och P8:s kort. `TvPointerEvent` (app A4) sprids av P2:s `station()` på ett `<div>` — den måste vara strukturell, inte en React-typ. `useNarrowSurface()` (P1) konsumeras av P1 (raden), P10 (multivy) och P6 (kanalkolumnens `sticky`).

**Beroendegraf:**
```
A1 → A2 → {A3, A6};  A4 → A5;  A2 → A5;  {A1..A6} → A7
A5 ─────────────────► P1
P2, P5 startar direkt (rena moduler/primitiver)
P1 ─► P3 ◄─ P2          P5 ─► P6 ◄─ P2          P4 ─► P7 ─► P8 ─► P9
P1 ─► P10
{P1..P10} ─► P11
```
Parallellt i praktiken: P2 och P5 och P4 samtidigt; sedan P1; sedan P3, P6, P7 och P10 samtidigt; sedan P8; sedan P9; sist P11.
