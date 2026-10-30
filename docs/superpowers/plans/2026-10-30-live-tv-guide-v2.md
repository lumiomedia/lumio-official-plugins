# Live TV – Kanalguide v2 + Kanaler (Klassisk/Upplevelse) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ny guide (Nu/Sen · Tablå · Kanallista) och Kanaler-vy med två valbara layouter enligt handoffen, med programbilder där de går att få fram — TV + skrivbord.

**Architecture:** Allt i Live TV-pluginets TV-träd (`plugins/live-tv/runtime/tv/`), som redan ritar TV och skrivbord. `TvGuideShell` behåller ägarskapet över läge/kategori/fönster men ritar ny hero + tre nya vyer; `TvHub` väljer `HubClassic` eller `HubExperience` på `settings.hubLayout`. Delade primitiver (v2-token, logoplatta, ton, programbild, programstatusmeny) i egna små moduler. En separat app-uppgift lär XMLTV-parsern `<icon>`.

**Tech Stack:** React 19 + TS, vitest + happy-dom + @testing-library/react, stub-SDK `src/__test-stubs__/plugin-sdk.ts`; appen: Rust (quick-xml) i `Moviefinder/src-tauri`.

**Spec:** `docs/superpowers/specs/2026-10-30-live-tv-guide-v2-design.md`. Visuell sanning: `/Users/jerry/Local Sites/Moviefinder/design_handoff_live_tv 2/` (README + `prototypes/*.dc.html` + `screenshots/`). Läs README:ns tabeller för mått/färger — planen upprepar dem inte.

## Global Constraints

- Arbetsträd: `/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/live-tv-guide-v2`, gren `feature/live-tv-guide-v2`. Kommandon nedan körs från `plugins/live-tv` om inget annat sägs.
- Telefonen (`runtime/tv/mobile/**`, `props.phone`) och LAN-guidegrenen (`TvGuideStandard`, `TvGuideGridDesktop`, `TvGuidePlaylistsDesktop`) får inte ändra beteende.
- Rälsen, VOD-hemmet, startvyn, spelaren, multivyn, sporten, kanalsidan ändras inte. `TV.bg` ändras inte.
- Mått = 1920×1080-designpixlar skrivna som `dp(n)` (identitet, `tv/tv-ui.tsx:31`), som dagens guide/hubb. Inställningsrader följer sina befintliga primitiver (`Row`, `LtChoiceRow`).
- Accent = `TV.acc` / `TV.accMix(n)` (appens valda accent); `#f4845f` bara som v2-tokens reservvärde.
- Fokus: varje ny fokuserbar yta är en `station(onOk, onHold?, extra)`; exakt en `[data-init]` per vy.
- Strängar: varje ny nyckel i `tv/tv-strings.ts` i EN, SV, DE, FR och ES (typen kräver det).
- Commits på engelska, utan AI-/Claude-attribution. Ingen release, ingen push, ingen versionsbump utan Jerrys klartecken.
- Uppslag: TMDb högst 2 samtidigt, högst 30/min, cache 7 dygn inkl. missar; aldrig för tablåblock.

## Review Focus

1. **Synkad lagring mellan enheter:** telefonen läser `live_tv_guide_mode_v1 = 'list'` eller `'tl'` → telefonens guide måste fortfarande visa ett giltigt läge (Task 4 testar).
2. **Kanal utan EPG / tom kategori / tom favoritlista:** varje vy och rad ritas utan krasch, tomma rader döljs i Upplevelse, guiden visar kanalen med "Ingen tablå"-cell (Task 6–8, 11 testar).
3. **Tusentals kanaler (Xtream 4 000+):** Kanallista/Nu/Sen virtualiserar eller kapar som dagens vyer (återanvänd `useGridRows`/befintlig radkapning) — inget `.map` över alla kanaler med schemauppslag (Task 6–8 testar att högst N rader monteras).
4. **Bild-URL som inte går att läsa (CORS/404):** ton faller till neutral, kortet till logoplatta, inget kast (Task 2–3 testar).
5. **Lång-tryck + Bakåt i menyer och lager:** Bakåt stänger menyn först, sedan guidens steg (nu → kategorier → lämna) — aldrig två steg på ett tryck (Task 5 testar).

---

### Task 0: Arbetsmiljö

- [ ] **Step 1:** `npm install` i `plugins/live-tv` (worktree saknar node_modules).
- [ ] **Step 2:** `npx vitest run` → allt grönt; `npx tsc --noEmit -p .` → 0 fel. Notera eventuella redan röda tester i ledgern innan något ändras.

### Task 1: Inställningar – fält, strängar, rader i båda träden

**Files:**
- Create: `runtime/tv/v2-settings.ts`
- Modify: `runtime/tv/tv-settings-store.ts` (TvSettings, DEFAULTS, sanitize), `runtime/tv/tv-settings.tsx` (`AppearanceTab`), `runtime/live-tv-settings-section.tsx` (`DesktopPage`), `runtime/tv/tv-strings.ts`
- Test: `runtime/tv/tv-settings-store.test.ts`, `runtime/tv/tv-settings.test.tsx`, `runtime/live-tv-settings-section.test.tsx`

**Interfaces – Produces:**
```ts
export type HubLayout = 'classic' | 'experience'            // standard 'classic'
export type GuideCategoryLayout = 'column' | 'chips'         // standard 'column'
export type LiveBackground = 'slate' | 'graphite' | 'night'  // standard 'slate'
export const HUB_LAYOUTS, GUIDE_CATEGORY_LAYOUTS, LIVE_BACKGROUNDS: readonly [...]
export function nextHubLayout(v: HubLayout): HubLayout   // + nextGuideCategoryLayout, nextLiveBackground
export function hubLayoutLabelKey(v): TvStringKey        // + guideCategoryLayoutLabelKey, liveBackgroundLabelKey
// TvSettings += hubLayout, guideCategoryLayout, heroTint: boolean (true), liveBackground
```
Strängar (sv): `settingHubLayout` "Kanaler-layout", `hubLayoutClassic` "Klassisk", `hubLayoutExperience` "Upplevelse", `settingGuideCategories` "Kategorier i guiden", `guideCategoriesColumn` "Kolumn", `guideCategoriesChips` "Chips", `settingHeroTint` "Färgton från bild", `settingLiveBackground` "Bakgrund", `bgSlate` "Skiffer", `bgGraphite` "Grafit", `bgNight` "Natt", `appearanceGuideHeading` "Kanalguide". EN/DE/FR/ES översätts.

- [ ] **Step 1: Failing tests**
  - store: `sanitize({})` ger `hubLayout:'classic', guideCategoryLayout:'column', heroTint:true, liveBackground:'slate'`; `sanitize({hubLayout:'x'})` → `'classic'`; `setTvSettings({hubLayout:'experience'})` överlever läsning.
  - TV: rad `setting-hubLayout` visar "Klassisk"; OK → "Upplevelse"; raderna `setting-guideCategoryLayout`, `setting-heroTint`, `setting-liveBackground` finns och har `data-f`.
  - Desktop: `lt-hub-layout`, `lt-guide-categories`, `lt-hero-tint`, `lt-live-background` finns; val skriver lagringen.
- [ ] **Step 2:** `npx vitest run runtime/tv/tv-settings-store.test.ts runtime/tv/tv-settings.test.tsx runtime/live-tv-settings-section.test.tsx` → FAIL.
- [ ] **Step 3:** Implementera enligt `start-view.ts`-mönstret. TV-raderna i `AppearanceTab` under rubriken `appearanceGuideHeading` (hubLayout först); desktop som `LtChoiceRow`/`LtToggleRow` i behaviour-sektionen efter startView.
- [ ] **Step 4:** Samma kommando → PASS; `npx tsc --noEmit -p .` → 0.
- [ ] **Step 5:** Commit `live-tv: settings for hub layout, guide categories, hero tint and background`.

### Task 2: v2-token, logoplatta och ton

**Files:**
- Create: `runtime/tv/v2-tokens.ts`, `runtime/tv/v2-ui.tsx`, `runtime/tv/tint.ts`
- Test: `runtime/tv/v2-tokens.test.ts`, `runtime/tv/tint.test.ts`, `runtime/tv/v2-ui.test.tsx`

**Interfaces – Produces:**
```ts
// v2-tokens.ts — handoffens färgtabell som konstanter (V2.surface1..5, V2.logoPlate, V2.live*, V2.menuBg, V2.noArt, V2.text*)
export const V2: {...}
export function v2Bg(bg: LiveBackground): string        // slate #161a23, graphite #1b1b1f, night #0f1219
export function mixHex(a: string, b: string, aPct: number): string   // 'rgb(r,g,b)'
export const FOCUS_CARD: string; export const FOCUS_INSET: string; export const FOCUS_BTN: string // box-shadow-strängar med TV.acc
// v2-ui.tsx
export function LogoPlate(p: { channel: Pick<M3uChannel,'name'|'logo'|'logoFallback'>; width: number; height: number; number?: number | null; radius?: number }): JSX.Element
export function LivePill(p: { solid?: boolean }): JSX.Element
export function KeyCap(p: { children: ReactNode }): JSX.Element
export function NoArt(p: { children?: ReactNode; style?: CSSProperties }): JSX.Element
export function ProgrammeArtBox(p: { url: string | null; channel; plate: [number, number]; height: number; radius: number; children?: ReactNode }): JSX.Element // bild eller NoArt+LogoPlate
// tint.ts
export function useTint(imageUrl: string | null, enabled: boolean): string   // '#2b3142' vid av/miss
export function __resetTintCacheForTests(): void
```
- [ ] **Step 1: Failing tests:** `mixHex('#ffffff','#000000',75)` = `'rgb(191,191,191)'`; `v2Bg('night')` = `'#0f1219'`; `useTint(null,true)` = `'#2b3142'`; `useTint(url,false)` = `'#2b3142'`; en bild vars canvas-läsning kastar (mocka `getImageData` att kasta) → `'#2b3142'` och ingen ny läsning av samma URL (cache); `LogoPlate` med `number={7}` ritar brickan "7" och `LiveTvLogoImage`/initialer inuti; `ProgrammeArtBox url={null}` ritar platta, med url ritar `<img>`.
- [ ] **Step 2:** Kör testerna → FAIL.
- [ ] **Step 3:** Implementera. `useTint` laddar bilden med `crossOrigin='anonymous'`, ritar 24×24, `averageRgb` (`sport/backdrop.ts`), cache `Map<url, string|null>`.
- [ ] **Step 4:** PASS + tsc.
- [ ] **Step 5:** Commit `live-tv: v2 tokens, logo plate and image tint`.

### Task 3: Programbilder

**Files:**
- Create: `runtime/tv/programme-art.ts`
- Modify: `runtime/epg/types.ts` (`icon?: string` på `EpgProgramme`)
- Test: `runtime/tv/programme-art.test.ts`

**Interfaces – Produces:**
```ts
export function normaliseTitle(title: string): string                 // gemener, utan diakritik/skiljetecken, enkla blanksteg
export function looksLikeBroadcast(title: string, channel: M3uChannel): boolean
export async function lookUpArt(title: string): Promise<string | null> // cache → kö → GET /api/media?titleQuery=<t>
export function useProgrammeArt(channel: M3uChannel, programme: EpgProgramme | null, opts: { lookup: boolean }): { url: string | null }
export function __resetProgrammeArtForTests(): void
```
Cache: `writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_programme_art_v1', Record<normTitle, { url: string|null; at: number }>)`, TTL 7 × 86 400 000 ms, högst 2 000 poster (äldst ut). Träff = första `items[i]` vars `normaliseTitle(title)` eller någon `searchTitles` är exakt lika; bild = `backdropUrl ?? null`.

- [ ] **Step 1: Failing tests:**
  - `programme.icon` finns → `url === icon`, ingen fetch.
  - `lookup:false` → ingen fetch, `url === null`.
  - `looksLikeBroadcast`: true för "Ryder Cup Day 2 Fourballs", "BBC News at Five", "Live: College GameDay", "Arsenal vs Chelsea", titel = kanalnamnet, kanal i grupp som matchar /sport|news|nyheter/i; false för "Silo", "Vertigo".
  - Fetch-mock `{items:[{title:'Silo', backdropUrl:'b.jpg'}]}` → `'b.jpg'`; `{items:[{title:'Silo 2'}]}` → `null`; andra anropet för samma titel (träff och miss) gör ingen fetch.
  - 5 samtidiga olika titlar → högst 2 fetch pågår samtidigt; den 31:a inom 60 s väntar (fake timers).
  - Fetch kastar → `null`, cachas inte som miss (nytt försök senare).
- [ ] **Step 2:** FAIL. **Step 3:** Implementera. **Step 4:** PASS + tsc.
- [ ] **Step 5:** Commit `live-tv: programme art from XMLTV icon or TMDb title match, cached with a rate cap`.

### Task 4: Guidelägen now / tl / list

**Files:**
- Modify: `runtime/tv/tv-settings-store.ts` (`GuideMode` += `'list'`), `runtime/tv/guide-surface.ts` (`DesktopGuideMode`, `desktopGuideMode`), `runtime/tv/mobile/guide-phone.tsx` (`phoneGuideMode`), `runtime/tv/tv-settings.tsx` (guidelägeskorten → tre nya), `runtime/tv/tv-strings.ts` (`modeNowSen` "Nu / Sen", `modeTabla` "Tablå", `modeChannelList` "Kanallista")
- Test: `runtime/tv/guide-surface.test.ts` (create om saknas), `runtime/tv/mobile/guide-phone.test.tsx` (befintlig), `runtime/tv/tv-settings.test.tsx`

**Interfaces – Produces:** `export type DesktopGuideMode = 'now' | 'tl' | 'list'`; `desktopGuideMode`: `nownext→now`, `grid|timeline→tl`, `playlists→list`, övriga oförändrade. `phoneGuideMode('list') === 'playlists'` (övrig mappning oförändrad).

- [ ] **Step 1:** Failing tests för hela mappningstabellen åt båda håll + TV-inställningen visar tre kort `guide-default-now|tl|list`.
- [ ] **Step 2–4:** FAIL → implementera → PASS + tsc. (Guideskalet byggs om i Task 5; tills dess får `TvGuideShell` en tillfällig mappning så att sviten är grön: `now`→`GuideNowNextView`, `tl|list`→`GuideGridView`.)
- [ ] **Step 5:** Commit `live-tv: guide modes are now / timeline / channel list on TV and desktop`.

### Task 5: Guideskalet v2 (hero, segment, kategorier, tangenter)

**Files:**
- Create: `runtime/tv/guide-hero.tsx`, `runtime/tv/guide-categories.tsx`, `runtime/tv/guide-keys.ts`
- Modify: `runtime/tv/guide-shell.tsx`, `runtime/tv/guide-types.ts`
- Delete (efter flytt): `runtime/tv/guide-control-row.tsx` + test
- Test: `runtime/tv/guide-shell.test.tsx`, `runtime/tv/guide-hero.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`guideCategoryLayout`, `heroTint`, `liveBackground`), Task 2 (`V2`, `v2Bg`, `mixHex`, `useTint`, `LogoPlate`, `LivePill`), Task 3 (`useProgrammeArt`), Task 4 (`DesktopGuideMode`).
- Produces:
```ts
// guide-types.ts
export interface GuideViewProps { …befintliga…; mode: DesktopGuideMode; onFocusProgramme(sel: GuideSelection): void; onLeftEdge(): void; focusChannelKey?: string | null }
// guide-hero.tsx
export function GuideHero(p: { sel: GuideSelection | null; model: LiveTvModel; nav: TvNav; mode: DesktopGuideMode; onMode(m: DesktopGuideMode): void; clock: ReactNode; tint: boolean; background: LiveBackground }): JSX.Element
export function useDebouncedSelection(sel: GuideSelection | null, ms = 300): GuideSelection | null
// guide-categories.tsx
export function GuideCategoryColumn(p: { groups; counts; value: string | null; onPick(key: string | null): void; focusIn: boolean }): JSX.Element
export function GuideCategoryChips(p: same): JSX.Element
// guide-keys.ts
export function guideKeyAction(key: string): 'now' | 'toggle-tl' | null  // 'n'/'N' → now, 't'/'T' → toggle-tl
```
Beteende: hero 276 px enligt README "Screen 2 / Layout"; segmentet är stationer i heron; förhandsrutan = `LivePreviewArt` 336×189 (OK = `nav.play`), respekterar `previewEnabled`. Källväljaren behålls som pill i heron (`TvChoicePanel`). `params.channel` (från Klassisks favoriter) sätter `focusChannelKey`. Bakåt: (1) om fönster/fokus inte är "nu" → hoppa till nu; (2) annars om fokus inte är i kategorier → kategorier; (3) annars släpp till skalet (lämna guiden). Implementeras med `nav.pushLayer` som bara registreras när steg 1 eller 2 gäller. N/T fångas i `keydown` (capture) på skalets rot, bara när ingen panel/meny är öppen och fokus inte står i ett textfält.

- [ ] **Step 1: Failing tests:** guide-shell renderar `guide-hero`, segment med tre stationer, `data-guide-mode`; `guideCategoryLayout:'chips'` → `guide-category-chips` och ingen kolumn; tangent `t` växlar `now↔tl` (från `list` → `tl`); `n` anropar jumpToNow (fönster = `guideWindowStart(now)`); Bakåt-sekvensen ovan (tre tryck, tredje går till `nav.back`); heron byter titel först efter 300 ms (fake timers); exakt en `[data-init]`.
- [ ] **Step 2–4:** FAIL → implementera (vyerna från Task 4:s tillfälliga mappning ligger kvar tills 6–8) → PASS + tsc.
- [ ] **Step 5:** Commit `live-tv: guide v2 shell — hero band, mode segment, category column or chips, N/T/Back`.

### Task 6: Nu/Sen-vyn

**Files:** Create `runtime/tv/guide-nowsen-view.tsx` + test; Modify `guide-shell.tsx` (läge `now`).
**Interfaces – Consumes:** `GuideViewProps`, `LogoPlate`, `V2`, `FOCUS_INSET`, `programmeActions` (Task 9 – tills dess OK = `nav.play` för live, `toggleReminder` för framtida).
**Produces:** `export function GuideNowSenView(p: GuideViewProps): JSX.Element`; delad `export function GuideChannelCellV2(p: { channel; model; selected: boolean }): JSX.Element` (380 px) i samma fil, återanvänds av Task 7–8.

- [ ] **Step 1: Failing tests:** rad per kanal med tre celler (`nowsen-now|next|later`); kanal utan EPG → en cell "Ingen tablå" (befintlig sträng om den finns) som ändå är station; ◂ från Nu-cellen anropar `onLeftEdge`; fokus på Sen anropar `onFocusProgramme` med Sen-programmet; 4 000 kanaler → högst det antal rader dagens Now/Next-vy monterar (återanvänd dess kapning/virtualisering).
- [ ] **Step 2–4:** FAIL → implementera → PASS + tsc. **Step 5:** Commit `live-tv: guide now/next/later view`.

### Task 7: Tablå-vyn

**Files:** Create `runtime/tv/guide-timeline-view.tsx` + test; Modify `guide-shell.tsx`.
**Interfaces – Consumes:** `epg-grid-geometry.ts` (`nowLinePx`, `guideWindowStart`, blockpositioner), `useGridRows` (`grid-rows.ts`), `GuideChannelCellV2`, `isReminded`.
**Produces:** `export function GuideTimelineView(p: GuideViewProps): JSX.Element`.
Fönster 2 h, tick var 30:e min, nu-linje 2 px accent + glöd, klockbricka i rubriken döljer krockande tick, "◂ tidigare" när fönstret inte börjar vid dagens start, klocka på block med påminnelse. ◂▸ stegar program för program; når fokus fönsterkanten flyttas `windowStart` 30 min; ▲▼ behåller tidpunkten (fokusera blocket som täcker föregående fokus-mitt).

- [ ] **Step 1: Failing tests:** block positionerade (left/width) enligt geometrin för ett program 14:30–15:30 i fönster 14:30–16:30 = 0 % / 50 %; nu-linjen finns bara när nu ∈ fönster; ▸ på sista synliga block flyttar fönstret 30 min; ▲▼ håller tidpunkt; passerat block har opacitet .6.
- [ ] **Step 2–4:** FAIL → implementera → PASS + tsc. **Step 5:** Commit `live-tv: guide timeline view`.

### Task 8: Kanallista-vyn

**Files:** Create `runtime/tv/guide-list-view.tsx` + test; Modify `guide-shell.tsx`.
**Produces:** `export function GuideListView(p: GuideViewProps): JSX.Element`.
Rad = kanalcell + nu-cell (titel, "N min kvar", progress, 150 px). Högerkolumn 560 px: tre programkort Nu/Sen/Senare för fokuserad kanal (README "Kanallista"). ▸ från listan → Nu-kortet; ▲▼ mellan korten (heron följer); ◂ tillbaka till samma rad.

- [ ] **Step 1: Failing tests:** tre kort med `list-card-now|next|later` för fokuserad kanal; ▸ fokuserar `list-card-now`; ◂ från kort återför fokus till raden; Senare-kort med påminnelse visar "Påminnelse satt · OK = ta bort".
- [ ] **Step 2–4:** FAIL → implementera → PASS + tsc. **Step 5:** Commit `live-tv: guide channel list view with programme cards`.

### Task 9: Programstatus – OK och Håll OK

**Files:** Create `runtime/tv/programme-actions.ts` + test; Modify de tre vyerna + `guide-hero.tsx`.
**Interfaces – Produces:**
```ts
export type ProgrammeState = 'past' | 'live' | 'future'
export function programmeState(p: EpgProgramme, nowMs: number): ProgrammeState
export function okAction(ctx: { channel; programme: EpgProgramme | null; model; nav }): () => void
  // live/null → nav.play({channel}); future → toggleReminder(channel, p, now); past → catch-up-URL ? nav.play({channel, url, label}) : nav.play({channel})
export function holdMenu(ctx: same & { element: HTMLElement }): void
  // nav.channelMenu(channel, element, extra) där extra per status:
  // future: Påminn mig {tid} / Ta bort påminnelse, Titta på kanalen nu
  // live:   Starta om från början (bara om catch-up finns)
  // past:   Spela repris (bara om catch-up finns)
```
(Favoriter, Kanaldetaljer, Multivy och Lås finns redan i `channelMenu`.)

- [ ] **Step 1: Failing tests:** gränser (start == now → live, stop == now → past); `okAction` för varje status anropar rätt mock; `holdMenu` skickar rätt `extra`-etiketter; utan catch-up saknas "Spela repris"/"Starta om".
- [ ] **Step 2–4:** FAIL → implementera, koppla in i vyerna → PASS + tsc. **Step 5:** Commit `live-tv: OK and hold-OK act on programme state in the guide`.

### Task 10: Kanaler – Klassisk

**Files:** Create `runtime/tv/hub-classic.tsx` + test (flytta `TvHubDesktop` hit och designa om); Modify `runtime/tv/tv-hub.tsx` (blir väljare).
**Interfaces – Consumes:** `useHubData` (oförändrad, delas med telefonen), Task 2, Task 3 (`lookup:true` för spotlight + Fortsätt titta), Task 1 (`liveBackground`, `heroTint`).
**Produces:** `export function HubClassic(p: TvViewProps): JSX.Element`.
Layout enligt README "Screen 1b". Favorit-OK → `nav.go('guide', { channel: channelKey(ch) })`. Initial fokus = första spotlight-kortet (annars spellistepillen, annars första rutnätskortet — som idag).

- [ ] **Step 1: Failing tests:** befintliga `tv-hub.test.tsx`-förväntningar för struktur består (sektioner, "Visa fler", exakt en `[data-init]`); favorit-OK går till guiden med `channel`; kort utan bild ritar `LogoPlate`; telefonens hubb oförändrad (`phone` → `TvHubPhone`).
- [ ] **Step 2–4:** FAIL → implementera → PASS + tsc. **Step 5:** Commit `live-tv: classic channel hub in the v2 design`.

### Task 11: Kanaler – Upplevelse

**Files:** Create `runtime/tv/hub-experience.tsx`, `runtime/tv/hub-experience-data.ts`, `runtime/tv/hub-experience-nav.ts` + tester.
**Interfaces – Produces:**
```ts
// hub-experience-data.ts
export type XpItem = { kind: 'live' | 'continue' | 'replay' | 'upcoming' | 'category'; key: string; channel?: M3uChannel; programme?: EpgProgramme | null; category?: string; count?: number; catchUp?: CatchUpItem }
export function useExperienceRows(model: LiveTvModel, chip: string | null): { featured: XpItem | null; rows: { id: 'continue'|'onNow'|'yours'|'soon'|'explore'; items: XpItem[] }[] }
// Fortsätt titta = catch-up + senast sedda (utom featured); Sänds nu = historik+favoriter först, sedan spellistan, filtrerat på chip; Dina kanaler = favoriter först; Börjar snart = start inom 2 h på favoriter+senast sedda (≤ 20 kanaler, useSchedules); Utforska = grupper med antal. Tomma rader utelämnas.
// hub-experience-nav.ts (ren reducer, testbar utan DOM)
export type XpZone = 'hero' | 'chips' | 'rows'
export interface XpNavState { zone: XpZone; heroBtn: number; chipIdx: number; row: number; cols: number[] }
export function xpNavReduce(s: XpNavState, key: 'up'|'down'|'left'|'right'|'back', dims: { heroBtns: number; chips: number; rowLens: number[] }): XpNavState
```
Komponenten fångar pilar/Bakåt i vyns `onKeyDown` (preventDefault + stopPropagation) och flyttar DOM-fokus till den station reducern pekar på. Sänds nu: 3D-coverflow enligt README. Hero följer fokuserat kort med 300 ms debounce; ambient ton (`useTint` på hero-bilden, annars logon) när `heroTint`. Primär handling per typ enligt README; upcoming → `toggleReminder`; category → `nav.go('guide', { group })`. Håll OK → `holdMenu` (Task 9). Mus: första klick fokuserar, andra aktiverar.

- [ ] **Step 1: Failing tests:** reducer — start `hero`, ▼ → chips, ▼ → rows/0, ▲ från rad 0 → chips, ◂▸ klampas per rad och varje rad minns kolumn, Bakåt från rader → hero; data — featured repeteras inte i Fortsätt titta, chip "Sport" filtrerar Sänds nu och Dina kanaler men inte Börjar snart, tomma rader utelämnas; komponent — initial fokus på hero-knappen (`[data-init]`), legend ersätter knappar när zon = rows, Utforska-OK går till guiden med `group`.
- [ ] **Step 2–4:** FAIL → implementera → PASS + tsc. **Step 5:** Commit `live-tv: experience channel hub (hero, chips, five rows)`.

### Task 12: Layoutväljare + städning

**Files:** Modify `runtime/tv/tv-hub.tsx`; Delete `guide-nownext-view.tsx`, `guide-detail-panel.tsx`, `GuideGridView`s grid-gren (ta bort filen om Task 7 ersatt allt) + deras tester; Modify `runtime/deleted-desktop-views.test.ts`.
- [ ] **Step 1: Failing tests:** `hubLayout:'experience'` → `hub-experience`, `'classic'` → `hub-classic`; byte i lagringen medan vyn visas byter layout och sätter layoutens initiala fokus; `deleted-desktop-views.test.ts` listar de raderade filerna.
- [ ] **Step 2–4:** FAIL → implementera → `npx vitest run` HELA sviten PASS + tsc 0.
- [ ] **Step 5:** Commit `live-tv: pick the channel hub layout from settings; remove the old guide views`.

### Task 13 (app): XMLTV `<icon>` per program

**Repo:** `/Users/jerry/Local Sites/Moviefinder`, nytt worktree `.worktrees/xmltv-icons` från `main`, gren `feature/xmltv-programme-icons`.
**Files:** `src-tauri/src/xmltv.rs` (`Programme.icon: Option<String>`, läs `src` på `<icon>` inuti `<programme>`), `src-tauri/src/live_tv_epg.rs` (lagra + serialisera `icon`, `skip_serializing_if = "Option::is_none"`, interna URL:er via `Arc<str>`-tabell per import).
- [ ] **Step 1:** Failing Rust-test i `xmltv.rs`: `<programme …><title>T</title><icon src="http://x/y.jpg"/></programme>` → `icon == Some("http://x/y.jpg")`; utan `<icon>` → `None`; `<icon>` i `<channel>` påverkar inte programmen. Test i `live_tv_epg.rs` att JSON för fönster-/nu-svaret bär `"icon"` bara när satt.
- [ ] **Step 2:** `cargo test -p <crate> xmltv` → FAIL. (Ett Rust-bygge åt gången — 8 GB-maskinen.)
- [ ] **Step 3–4:** Implementera → PASS.
- [ ] **Step 5:** Commit `epg: keep XMLTV programme icons`.

### Task 14: Visuell verifiering

- [ ] **Step 1:** Starta Vite-dev enligt minnet (`lumio-dev-server-worktree`), öppna `http://localhost:5173/tv-sim.html` med pluginet från detta worktree; jämför Kanaler Klassisk, Upplevelse, guidens tre lägen och kategorier som chips mot `screenshots/`. Skärmdumpa varje till scratchpad.
- [ ] **Step 2:** Skrivbordsappen (`?desktopguide=1` i webbläsare om Tauri saknas): samma vyer, mus: första klick fokuserar.
- [ ] **Step 3:** Rapportera avvikelser till Jerry med skärmdumpar. Ingen versionsbump/release.
