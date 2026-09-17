# Live TV kanalguiden städad på skrivbord och TV — pluginet

> **För agenter:** OBLIGATORISK UNDERSKILL: `superpowers:subagent-driven-development` (rekommenderas) eller `superpowers:executing-plans`. Stegen använder kryssrutor (`- [ ]`).

**Mål:** Guiden på skrivbordsappen och TV får EN kontrollrad, tre lägen (Grid · Now / Next · Timeline), permanent detaljpanel, kollapsade tomma rader och ett tidsfönster som alltid visar nu-linjen — enligt `Moviefinder/design_handoff_live_tv_desktop_epg/`.

**Arkitektur:** `TvGuide` får en tredje gren `newGuide = isTv || (isDesktopTauriEnv && !phone)` → `TvGuideShell` som äger kontrollraden och allt filter-/markeringsstate och renderar en av tre vyer. Telefonen (fas 3) och LAN/fjärr-grenen (dagens `TvGuideStandard`/`TvGuideGrid`/`TvGuidePlaylists`) rörs inte. Handoffens px är designpixlar i scenen (`dp()` = identitet). Delade datamoduler utan importcykler (mönster: `grid-rows.ts`).

**Teknik:** React 19, TypeScript strict, vitest + happy-dom. Inline-stilar.

**Spec:** `docs/superpowers/specs/2026-09-17-live-tv-desktop-epg-design.md` (bindande) + handoffen `README.md`/`IMPLEMENTATION.md` (normativa mått; läs din vys sektion före kodning).

## Globala villkor

- Gren `feature/live-tv-desktop-epg`, arbetsträd `/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/desktop-epg`, kommandon från `plugins/live-tv/`. Baslinje 749 gröna, tsc 38 pre-existerande fel (noll nya).
- Version `0.10.0` bumpas i SISTA tasken efter att `dist/runtime.js` byggts om mot `/Users/jerry/Local Sites/Moviefinder/.worktrees/mobile-phase3-app` (`node scripts/build-plugin-runtime.mjs <plugin>`). `minAppVersion` 0.1.600 kvar. Ingen appändring.
- **Ytan:** ny guide bara när `isTv || (isDesktopTauriEnv && !phone)`. Telefon-tester (`mountPhone`) och LAN-tester (`__setTvModeForTests(false)` + `__setDesktopTauriEnvForTests(false)`) måste förbli gröna orörda — fas 3-filer under `runtime/tv/mobile/` rörs inte.
- Lägen: lagrade nycklar `now|tl|grid|playlists|nownext|timeline`; skrivbord/TV normaliserar `now`/`tl` → `nownext`, `playlists` → `grid` och skriver bara `grid|nownext|timeline`. Ingen migrering.
- Handoffens review-checklista gäller: max EN kontrollrad; kategorier/spellistor är filter; inga banners över innehållet utom Now/Next-bannern; tomma kolumner kollapsar till en cell; kanalcell `flex: 0 0 <w>` + `minWidth: 0` + `boxSizing: border-box` i header och rader; fönster från föregående halvtimme; block klippta vid vänsterkant; inga TV-rester på skrivbord (glöd, `OK = …`, förhandsvisning); textblock `flex:1; minWidth:0` + ellips.
- TV behåller glöd, håll-OK och glasmeny. Alla klickbara ytor är `station()`-stationer (fjärren). Dropdowns = `TvChoicePanel`.
- Svenska kommentarer, strängar i EN + SV, ingen AI-attribution, aldrig `plugins/twitch/dist` i en commit. Commit-mönster `live-tv: <vad>`.

---

### Task 0: Grund — ytgate, lägesnormalisering, lagringsnycklar, modellgate, fokusstil

**Filer:**
- Skapa: `runtime/tv/guide-surface.ts`, `runtime/tv/guide-surface.test.ts`
- Ändra: `runtime/tv/tv-settings-store.ts` (+test), `runtime/live-tv-model.ts`, `runtime/tv/tv-guide.tsx`, `runtime/tv/tv-shell.tsx`, `runtime/tv/tv-ui.tsx`, `src/__test-stubs__/plugin-sdk.ts`

**Gränssnitt (producerar):**
```ts
// guide-surface.ts
export function isDesktopTauri(): boolean   // (sdk as { isDesktopTauriEnv?: boolean }).isDesktopTauriEnv === true
export function useNewGuideSurface(phone: boolean): boolean   // useTvMode() || (isDesktopTauri() && !phone)
export type DesktopGuideMode = 'grid' | 'nownext' | 'timeline'
export function desktopGuideMode(stored: GuideMode): DesktopGuideMode   // now|tl→nownext, playlists→grid, grid→grid, nownext/timeline→samma
// tv-settings-store.ts
export type GuideMode = 'now' | 'tl' | 'playlists' | 'grid' | 'nownext' | 'timeline'
export type TimelineZoom = '2h' | '6h' | 'day'
export interface TvSettings { …; guideCategory: string | null; timelineZoom: TimelineZoom; nowNextDetails: boolean }   // defaults null / 'day' / true, sanitize som övriga
// plugin-sdk-stubben
export let isDesktopTauriEnv = false; export function __setDesktopTauriEnvForTests(on: boolean): void
```
- `live-tv-model.ts`: `activeList` gate `tvMode` → `tvMode || isDesktopTauri()` (importera från `./tv/guide-surface` — kontrollera att det inte skapar en cykel: `guide-surface.ts` importerar bara `@/lib/plugin-sdk` och typen `GuideMode`).
- `tv-guide.tsx`: `TvGuide` → `if (phone) …fas 3…; if (newGuide) return <TvGuideShell …/>` där `TvGuideShell` (i denna task en platshållare i ny fil `runtime/tv/guide-shell.tsx`) tills vidare renderar dagens `TvGuideStandard`/`TvGuideGrid` med det normaliserade läget — ingen visuell ändring ännu. Telefonens `phoneGuideMode` utökas: `nownext` → `now`, `timeline` → `grid`.
- `tv-shell.tsx`: roten får `data-live-tv-desktop="1"` när `isDesktopTauri() && !isTv && !phone`. `tv-ui.tsx` `TvFocusStyle`: `[data-live-tv-tv-root][data-live-tv-desktop="1"] [data-f]:focus, …[data-fcur="1"] { outline: 1px solid rgb(var(--accent-500)) !important; outline-offset: -1px; box-shadow: none !important; }`.

- [ ] Steg 1: tester — `desktopGuideMode` för alla sex värden; `phoneGuideMode('nownext')==='now'`, `('timeline')==='grid'`; settings-store defaults + sanitize för de tre nya fälten; modell: `__setDesktopTauriEnvForTests(true)` + `__setTvModeForTests(false)` → `activePlaylistName` följer `setActivePlaylist` (kopiera mönstret från befintligt TV-läges-test i `live-tv-model.test.ts`); LAN-fall (båda false) → `activeList` null som förut; skalet: `data-live-tv-desktop` finns bara i skrivbordsläge.
- [ ] Steg 2: kör → fallera. Steg 3: implementera. Steg 4: `npx vitest run` grönt, tsc noll nya. Steg 5: commit `live-tv: ytgate, lägesnormalisering och lagringsnycklar för den städade guiden`.

---

### Task 1: Geometri och rader — halvtimmesfönster, procentblock, tomma rader sist, delad kanalcell

**Filer:**
- Ändra: `runtime/tv/epg-grid-geometry.ts` (+test), `runtime/tv/grid-rows.ts` (+ny test `grid-rows.test.ts`), `runtime/tv/tv-guide-shared.tsx` (+test `tv-guide-shared.test.tsx` ny)

**Gränssnitt (producerar):**
```ts
// epg-grid-geometry.ts
export function guideWindowStart(nowMs: number): number        // floor(now / 30 min) * 30 min
export const GRID_WINDOW_MS = 3 * 3_600_000
export const PCT_PER_MIN_GRID = 100 / 180                      // block i % av spårbredden
export function timelineWindow(nowMs: number, zoom: TimelineZoom): { start: number; end: number; pctPerMin: number }
//   '2h' → start = guideWindowStart(now) - 30 min, 2 h; '6h' → start - 1 h, 6 h; 'day' → startOfLocalDay(now)+06:00 → +18 h
export function mergeShortBlocks<P extends EpgSpan & { title: string }>(entries: EpgRowEntry<P>[], minWidthPct: number): Array<EpgRowEntry<P> & { mergedTitle?: string }>
//   angränsande block smalare än minWidthPct slås ihop till ett med `Titel · Titel`
// grid-rows.ts
export interface GridRows { rows: EpgRow[]; withoutEpg: M3uChannel[]; hasMore: boolean; schedulesLoading: boolean }
//   rows = kanaler MED tablå i fönstret (som idag), withoutEpg = kandidater UTAN tablå (sorteras sist); visibleRows räknar båda (rows först, sedan withoutEpg upp till limit)
// tv-guide-shared.tsx
export type GuideCellVariant = 'grid' | 'nownext' | 'timeline'
export const GUIDE_CELL_WIDTH: Record<GuideCellVariant, number> = { grid: 240, nownext: 340, timeline: 240 }
export function guideCellStyle(variant: GuideCellVariant): CSSProperties   // { flex: `0 0 ${w}px`, width: w, minWidth: 0, boxSizing: 'border-box' }
export function GuideChannelCell({ channel, number, pinned, locked, variant }: { channel: M3uChannel; number: number | null; pinned: boolean; locked: boolean; variant: GuideCellVariant }): JSX.Element
//   nr 26 px tabular högerställt · logotyp (ChannelArt 44×28 grid / 48×30 nownext / ingen i timeline) · namn 14/600 ellips + `grupp · kvalitet` 12 px 45 % (inte i timeline) · hjärta 13 px accent (pinned) · lås 13 px (locked)
```
`ChannelCell`/`channelColumnStyle`/`CHANNEL_CELL_WIDTH_DP` behålls tills LAN-grenen bytts (Task 6 avgör om de kan tas bort).

- [ ] Steg 1: tester — `guideWindowStart(08:44) = 08:30`, `(00:05) = 00:00`, `(23:50) = 23:30`; `epgBlockBox(30/60/90-min-block, start, start+3h, PCT_PER_MIN_GRID).width ≈ 16.67/33.33/50`; block 07:30–09:00 i fönster 08:30–11:30 → `left 0`, `width ≈ 16.67`, `clippedStart true`; `timelineWindow('day')` = 06:00→24:00 med `pctPerMin = 100/1080`; `mergeShortBlocks` slår ihop två 10-min-block till ett med `mergedTitle 'A · B'`; `useGridRows` (renderHook med en modellfixtur — se `tv-guide-grid.test.tsx` för hur modellen seedas) ger `withoutEpg` sist och `hasMore` korrekt; `guideCellStyle('grid')` = exakt objektet ovan; två `GuideChannelCell` med kort/långt namn har samma `style.flex`.
- [ ] Steg 2–5: fallera, implementera, `npx vitest run runtime/tv/epg-grid-geometry.test.ts runtime/tv/grid-rows.test.ts runtime/tv/tv-guide-shared.test.tsx runtime/tv/tv-guide-grid.test.tsx runtime/tv/mobile` + full svit + tsc, commit `live-tv: halvtimmesfönster, procentblock, tomma rader sist och delad kanalcell`.

---

### Task 2: Kontrollraden, `TvChoicePanel` och guidens skal

**Filer:**
- Skapa: `runtime/tv/guide-control-row.tsx` (+test), `runtime/tv/guide-shell.tsx` (ersätter platshållaren; +test `guide-shell.test.tsx`)
- Ändra: `runtime/tv/tv-list-picker.tsx` (+`TvChoicePanel`, test i `tv-list-picker.test.tsx` eller ny), `runtime/tv/tv-strings.ts`

**Gränssnitt (producerar):**
```ts
// tv-list-picker.tsx
export interface ChoiceOption { key: string | null; label: string; count?: number }
export function TvChoicePanel({ nav, title, options, value, onPick, onClose }: { nav: TvNav; title: string; options: ChoiceOption[]; value: string | null; onPick: (key: string | null) => void; onClose: () => void }): JSX.Element
//   PickerPanel-baserad: rader 56 px, `data-init` på valt alternativ (annars första), Check-markering, `onPick` + `onClose` på val, `nav.pushLayer(close)`, fokus tillbaka till öppnaren (mönstret finns i PickerPanel)
// guide-control-row.tsx
export interface GuideControls {
  mode: DesktopGuideMode; onMode(next: DesktopGuideMode): void
  sourceLabel: string; sourceCount: number; onOpenSource(): void
  categoryLabel: string; categoryCount: number; onOpenCategory(): void
  dayOffset: 0 | 1; onDay(next: 0 | 1): void
  onNow?: () => void                           // Grid/Timeline
  zoom?: TimelineZoom; onZoom?(z: TimelineZoom): void   // Timeline
  details?: boolean; onDetails?(): void        // Now/Next
  clock: ReactNode
}
export function GuideControlRow(props: GuideControls): JSX.Element   // 56 px, en rad, ordning + stil enligt handoffen §Ram och kontrollrad; dropdown-knappar `data-testid="guide-source"`/`"guide-category"`, segment `guide-mode`, dag `guide-day`, Nu `guide-now`, zoom `guide-zoom`, Detaljer `guide-details`
// guide-shell.tsx
export function TvGuideShell(props: TvViewProps): JSX.Element
//   state: mode (desktopGuideMode(useGuideMode())), category (settings.guideCategory via setTvSettings), dayOffset, windowStart (guideWindowStart(model.nowMs) vid mount + Nu), selection: { channel: M3uChannel; programme: EpgProgramme | null } | null, source-/category-panel open, zoom (settings.timelineZoom), details (settings.nowNextDetails)
//   renderar <GuideControlRow/> + vyn: mode==='grid' → <GuideGridView/> (Task 3), 'nownext' → <GuideNowNextView/> (Task 4), 'timeline' → <GuideTimelineView/> (Task 5) — i denna task platshållare som renderar dagens vyer med props
//   modeStack + pushLayer som i dagens TvGuide (Bakåt poppar läge)
```
Nya strängar EN/SV: `modeNowNext` ('Now / Next'/'Nu / Sen'), `modeTimelineDay` ('Timeline'/'Tablå'), `zoom2h` ('2 h'), `zoom6h` ('6 h'), `zoomDay` ('Whole day'/'Hela dagen'), `details` ('Details'/'Detaljer'), `sourceAll` ('All playlists'/'Alla spellistor'), `categoryAll` ('All categories'/'Alla kategorier'), `pickSource` ('Playlist'/'Spellista'), `pickCategory` ('Category'/'Kategori').

- [ ] Steg 1: tester — `TvChoicePanel`: öppnas med `data-init` på valt, klick ropar `onPick(key)` + `onClose`, Bakåt via `pushLayer` stänger; kontrollraden: rätt ordning (testids i DOM-ordning), Nu bara i grid/timeline, zoom bara i timeline, Detaljer bara i nownext, klocka sist; skalet (mount via `LiveTvTvShell` med `__setTvModeForTests(true)`, `params: { view: 'guide' }`): lagrat `playlists` visar Grid aktivt, lagrat `tl` visar Now/Next aktivt, lägesbyte skriver `getGuideMode() === 'timeline'`, källknappen öppnar panel och val skriver `getActivePlaylistId`, kategori skriver `getTvSettings().guideCategory`, `TvPreview` finns inte i DOM, bara EN rad över innehållet (kontrollradens `data-testid="guide-control-row"` är enda syskonet före innehållet).
- [ ] Steg 2–5: fallera, implementera, riktade tester + full svit + tsc, commit `live-tv: en kontrollrad med val-paneler och guidens nya skal`.

---

### Task 3: Grid med permanent detaljpanel

**Filer:**
- Skapa: `runtime/tv/guide-grid-view.tsx` (+test), `runtime/tv/guide-detail-panel.tsx` (+test)
- Ändra: `runtime/tv/guide-shell.tsx` (koppla in), `runtime/tv/tv-strings.ts`

**Gränssnitt:**
```ts
export interface GuideViewProps { model: LiveTvModel; nav: TvNav; category: string | null; dayOffset: 0 | 1; windowStart: number; selection: GuideSelection | null; onSelect(sel: GuideSelection | null): void; isTv: boolean }
export type GuideSelection = { channel: M3uChannel; programme: EpgProgramme | null }
export function GuideGridView(props: GuideViewProps): JSX.Element
export function GuideDetailPanel({ selection, nowMs, locale, onWatch, onRemind, onToggleFavourite, favourite, reminded }: …): JSX.Element   // 320 px, innehåll enligt handoffen §1 Detaljpanel; `data-testid="guide-detail-panel"`
```
Layout: `display:flex` → vänster kolumn (`flex:1; minWidth:0`): tidsaxel 30 px (6 etiketter 11 px 40 %, spaltlinjer) → rutnät `data-scroll` (rader 60 px: `GuideChannelCell variant="grid"` + spår `flex:1; position:relative` med block i `%` via `epgRowBoxes(programmes, windowStart, windowStart + GRID_WINDOW_MS, PCT_PER_MIN_GRID)`; pågående block accent 18 %/kant 50 %, titel 13 ellips + tid 11) → tomma rader (`withoutEpg`) som EN cell över databredden (`data-testid="grid-empty-row"`, `Ingen tablå … · sänder live`, bakgrund .04) → pagineringsrad 52 px (`{shown} av {total} …` + `Visa 80 fler` + hjälptext höger); nu-linje över hela rutnätshöjden (`data-testid="grid-now-line"`, `left` = `nowLinePx(nowMs, windowStart, PCT_PER_MIN_GRID)%`). Höger: `<GuideDetailPanel/>`. Interaktion: block = `station(onOk, onHold)`; OK på pågående → `nav.play`, på framtida → `onSelect`; håll → `nav.channelMenu` (TV: glasmeny; skrivbord: också glasmeny via håll/högerklick — `onContextMenu` finns i `station`). Hover (skrivbord, `!isTv`): `onPointerEnter` → 120 ms debounce → `onSelect`; TV: `onFocus` → `onSelect`. `dayOffset === 1` → `windowStart = startOfLocalDay(now, 1) + 06:00`.
Strängar: `noEpgRow`, `paginationRow` ('{shown} of {total} channels have a guide in this category'), `showMoreN` ('Show {n} more'), `noEpgLast`, `watchNowShort` ('Watch now'), `favouriteShort` ('Favourite'/'Favorit').

- [ ] Steg 1: tester (mount via skalet i TV-läge med seedad EPG — se `tv-guide-grid.test.tsx` fixtur): 6 tidsetiketter från halvtimmesstart; nu-linjen `left` mellan 0 och 25 % vid mount; ett block som började före fönstret har `left 0%`; en kanal utan tablå renderar `grid-empty-row` EFTER raderna med tablå och exakt en cell; detaljpanelen finns alltid och visar markerat program efter `focus` på ett block (TV) resp. `pointerEnter` + 120 ms (skrivbord); inget element med `position: absolute` ligger över sista raden (den gamla `grid-detail`-bannern saknas); `Visa … fler` ligger efter listan i DOM.
- [ ] Steg 2–5: fallera, implementera, riktade tester + full svit + tsc, commit `live-tv: Grid med halvtimmesfönster, kollapsade tomma rader och permanent detaljpanel`.

---

### Task 4: Now / Next med infobanner och Detaljer-toggle

**Filer:**
- Skapa: `runtime/tv/guide-nownext-view.tsx` (+test)
- Ändra: `runtime/tv/guide-shell.tsx`, `runtime/tv/tv-strings.ts`

**Gränssnitt:** `export function GuideNowNextView(props: GuideViewProps & { details: boolean }): JSX.Element`
Layout: (banner om `details`: `data-testid="nownext-banner"`, `ChannelArt` 200×112 sparad bildruta — INGEN `TvPreview`, inget `<video>` — textblock `flex:1; minWidth:0` med `nr` + namn + `grupp · kvalitet`-tagg, titel 22/600, `tid · N min kvar`, förlopp `maxWidth 520`, `Sen  Titel · HH:MM`; knappar `flex: 0 0 auto`: Titta nu 38 + Påminn mig 34) → kolumnhuvud 30 px (`GuideChannelCell`-bredd 340 + tre kolumner `flex 2 / 1.2 / 1` med `border-right .06`) → rader 56 px `data-scroll` (`station(play, channelMenu)`, `GuideChannelCell variant="nownext"`; NU-cell: titel 14 `flex:1; minWidth:0` + 90 px block med 4 px förlopp + `N m` 11 px; SEN: titel 13 75 % + tid 12 45 % högerställd; SENARE: 13 55 % + 12 35 %; markerad rad bakgrund .05) → tomma rader (kanaler utan `nowFor().now`) sist som en cell + `Titta nu` 26 px pill → pagineringsrad. Markering: fokus (TV) / hover 120 ms (skrivbord) → `onSelect({ channel, programme: now })` — bannern visar markeringen, annars första raden. Data: `filterByGroup(model, category)` + `model.nowFor` (ingen `useSchedules`).

- [ ] Steg 1: tester: `nowNextDetails=false` → ingen banner; `true` → banner utan `video`/`TvPreview` och utan text som matchar `/OK =/`; kolumnhuvudets kanalcell och radernas kanalcell har samma `style.flex`; kanal utan tablå renderar en cell (`nownext-empty-row`) sist med `Titta nu`; ingen rad har `style.height` > 56; Detaljer-knappen i kontrollraden togglar `getTvSettings().nowNextDetails`.
- [ ] Steg 2–5: fallera, implementera, riktade tester + full svit + tsc, commit `live-tv: Now / Next med kolumnvikter, kollapsade rader och infobanner bakom Detaljer`.

---

### Task 5: Timeline — dagsöversikt med zoom

**Filer:**
- Skapa: `runtime/tv/guide-timeline-view.tsx` (+test)
- Ändra: `runtime/tv/guide-shell.tsx`, `runtime/tv/tv-strings.ts`

**Gränssnitt:** `export function GuideTimelineView(props: GuideViewProps & { zoom: TimelineZoom; onOpenGrid(atMs: number): void }): JSX.Element`
Layout: tidsaxel (2-timmarsspalter vid `day`, 1 h vid `6h`, 30 min vid `2h`; etiketter 11 px 40 %) → rader 40 px (`GuideChannelCell variant="timeline"` + spår med block via `epgRowBoxes(…, win.pctPerMin)`; block `radius 6; padding 0 8px`, titel 12 px 65 % vertikalt centrerad, pågående accent 22 %/kant 50 % + 600; block med `width` under bredden för 20 min i vald zoom = stapel utan text; vid `day`: `mergeShortBlocks(entries, 20 * pctPerMin)`) → tomma rader sist → fotrad 48 px (`timelineHint` + `Visa fler`). Nu-linje som Grid. Rad = `station(() => onOpenGrid(tidpunkt))` — på skrivbord räknas tidpunkten ur klickets x (`(clientX - spårets left) / spårbredd * fönster`), på TV (OK) = fönstrets start eller nu om nu ligger i fönstret. `onOpenGrid` i skalet: `setMode('grid')` + `windowStart = floor(atMs / 30 min) * 30 min` + `setGuideMode('grid')`.
Strängar: `timelineHint` ('Click anywhere in a row to open Grid at that time'/'Klicka var som helst i en rad för att öppna Grid vid den tiden'), `modeTimelineDay` finns från Task 2.

- [ ] Steg 1: tester: `day` ger 9 axel-etiketter (06…22); rader har `style.height` 40 (rader utan text får ha fast höjd — spec); ett 10-min-block renderas utan text; två angränsande 10-min-block vid `day` blir ett block med `A · B`; klick på rad (skrivbord, `clientX` mitt i spåret) ropar `onOpenGrid` med tid inom fönstret och skalet byter till Grid med `windowStart` på halvtimme; zoomsegmentet skriver `getTvSettings().timelineZoom`.
- [ ] Steg 2–5: fallera, implementera, riktade tester + full svit + tsc, commit `live-tv: Timeline som dagsöversikt med zoom och hopp till Grid`.

---

### Task 6: Städning, gamla tester, TV-rester, dist och version

**Filer:**
- Ändra: `runtime/tv/tv-guide.tsx`, `runtime/tv/tv-guide-grid.tsx`, `runtime/tv/tv-guide-playlists.tsx`, `runtime/tv/tv-guide-shared.tsx`, `runtime/tv/tv-strings.ts`, `runtime/tv/tv-guide*.test.tsx`, `runtime/tv/tv-guide-grid.test.tsx`, `runtime/tv/tv-guide-playlists.test.tsx`, `runtime/tv/tv-settings.tsx` (lägesväljaren i Appearance: alternativen `nownext|grid|timeline` för skrivbord/TV), `plugin.json`, `package.json`, `CHANGELOG.md`, `runtime/index.ts`, `dist/runtime.js`

- [ ] Steg 1: **Testomskrivning.** De gamla TV-lägestesterna (`tv-guide.test.tsx`, `tv-guide-grid.test.tsx`, `tv-guide-playlists.test.tsx` med `__setTvModeForTests(true)`) beskriver den gamla layouten. Flytta det som fortfarande gäller (Bakåt poppar läge, kanalmenyn, reminders, låsta kanaler, `params.group`) till `guide-shell.test.tsx`/vy-testerna; skriv om resten mot den nya guiden. Behåll en **LAN-svit** per fil (`__setTvModeForTests(false)` + `__setDesktopTauriEnvForTests(false)`) som låser att `TvGuideStandard`/`TvGuideGrid`/`TvGuidePlaylists` fortfarande renderas där (segment med fyra lägen, `guide-headline`, `TvPreview`). `deleted-desktop-views.test.ts` kontrolleras.
- [ ] Steg 2: **TV-rester på skrivbord.** `tt('okWatch')`, `okRemind`, `previewLabel`-strängar och alla `OK = …` renderas bara när `isTv` — grep `OK =` i `tv-strings.ts` och gate varje anropare i den nya guiden (den gamla LAN-grenen får stå). Test: skalet monterat med `__setDesktopTauriEnvForTests(true)`, `__setTvModeForTests(false)` → `expect(root.textContent).not.toMatch(/OK =|hold OK|håll OK/)` i alla tre lägen; i TV-läge får de finnas.
- [ ] Steg 3: **Död kod.** `ChannelCell`/`channelColumnStyle`/`CHANNEL_CELL_WIDTH_DP`/`useDebouncedChannel` behålls bara om LAN-grenen använder dem (grep); `Segment` med fyra lägen bara i LAN-grenen. `tv-settings.tsx` Appearance: lägesalternativen visas som `nownext|grid|timeline` när `useNewGuideSurface(false)` annars som idag. Inga importcykler: `node -e` eller grep — `guide-*-view.tsx` importerar aldrig `guide-shell.tsx`.
- [ ] Steg 4: `npx vitest run` grönt, tsc noll nya, boundary check (`node ../../scripts/check-runtime-boundaries.mjs`). Commit `live-tv: gamla guidetester omskrivna, TV-rester gatade på skrivbord, död kod bort`.
- [ ] Steg 5: **Bygg + version.** `runtime/index.ts` version → 0.10.0 FÖRE bygget (versionen bakas in i dist). Från `/Users/jerry/Local Sites/Moviefinder/.worktrees/mobile-phase3-app`: `node scripts/build-plugin-runtime.mjs "/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/desktop-epg/plugins/live-tv"` (typgrinden måste passera). `plugin.json` 0.10.0 (minAppVersion 0.1.600 kvar), `package.json` 0.10.0, `CHANGELOG.md` topp `## 0.10.0 — Cleaner channel guide on desktop and TV` (engelska, filens språk) med punkter: one control row, three modes (Grid/Now-Next/Timeline), playlist + category as pickers, permanent detail panel, half-hour window with the now-line always visible, empty rows collapse and sort last, no silent preview in the guide, no TV remnants on desktop. `git status`: bara `plugins/live-tv/`. Commit `live-tv 0.10.0: kanalguiden städad på skrivbord och TV — bygg om dist/runtime.js`.
- [ ] Steg 6: Rapport till Jerry: byggt, ej verifierat (riktig TV-fjärr, skrivbord 1280/1440/1920, LAN oförändrad visuellt), test-DMG på hans ord.
