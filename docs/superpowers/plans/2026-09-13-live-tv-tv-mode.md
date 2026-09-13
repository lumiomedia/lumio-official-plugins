# Live TV TV-läge – implementationsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygg om Live TV-pluginets TV-läge till en helt fjärrstyrd upplevelse enligt designhandoffen: ikonrad, hubb, kanalguide (tre lägen), favoriter, kanaldetalj, sök, multivy, inställningar och ny spelarkrom.

**Architecture:** Ett eget TV-träd under `runtime/tv/` grenas in från `runtime/index.ts` när `useTvMode()` är sant. Modell, datalager, EPG, favoriter, påminnelser, lås, historik och spelarmotorn delas oförändrade. Videoytor (förhandsvisning, multivy) går genom `runtime/tv/video-surface.ts`, som i dag använder appens enda nativa yta och senare appens fler-yte-API.

**Tech Stack:** React 19, TypeScript, inline-stilar (pluginets Tailwind byggs inte), vitest + happy-dom + @testing-library/react, esbuild via `Moviefinder/scripts/build-plugin-runtime.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-13-live-tv-tv-mode-design.md` (detta repo). Designkälla: `/Users/jerry/Local Sites/Moviefinder/design_handoff_live_tv_tv_mode/README.md` och `screenshots/`.

## Global Constraints

- Skrivbord och mobil rörs inte: inga ändringar i `live-tv-hub.tsx`, `live-tv-epg-page.tsx`, `live-tv-channel-page.tsx`, `live-tv-guide.tsx` utöver import-justeringar som inte ändrar beteende.
- Runtime-kod får bara importera `@/lib/plugin-sdk` från appen (`scripts/check-runtime-boundaries.mjs` fäller allt annat).
- Nya SDK-funktioner läses defensivt: `(sdk as unknown as { getTvClock?: () => ... }).getTvClock?.()`. `plugin.json` `minAppVersion` förblir `0.1.58`.
- Alla mått i handoffen är designpx för 1920×1080. I kod: `dp(n)` = `Math.round(n / 1.54)`. Exempel: 22 → 14, 52 → 34, 104 → 68.
- Färger: bakgrund `#000`, text `#f3f4f8`, accent `rgb(var(--accent-500))`, accentText `#ffd9c9`, text på accentfylld yta `#fff`, live `#fb7185`.
- Varje klickbar yta är EN station: `data-f`, `tabIndex 0`, `role="button"`. Inga inre knappar på kort. OK = huvudhandling, håll OK = glasmeny.
- Exakt en `data-init` per monterad vy.
- Inga "Spela in"-poster, ingen röstsök, inget "Ljud & undertext".
- Strängar: alla nya texter i `runtime/tv/tv-strings.ts` med EN och SV.
- Commit-meddelanden på svenska, utan AI-attribution, utan Co-Authored-By-trailer.
- Ingen release, ingen versionsbump av `dist/runtime.js` till marketplace, ingen push utan Jerrys klartecken. Lokala commits på branchen `feature/live-tv-tv-mode` i detta repo.

## Kontext för utföraren

- Pluginrot: `/Users/jerry/Local Sites/lumio-official-plugins/plugins/live-tv`. Tester: `cd plugins/live-tv && npx vitest run` (beroenden är installerade). Typkontroll: `npx tsc --noEmit -p tsconfig.json` (från pluginroten).
- `@/lib/plugin-sdk` i tester löses mot `src/__test-stubs__/plugin-sdk.ts` (se `vitest.config.ts`).
- Bygg bunten (kräver appträdet): `cd "/Users/jerry/Local Sites/Moviefinder" && node scripts/build-plugin-runtime.mjs ../lumio-official-plugins/plugins/live-tv`. Skriptet typkontrollerar och fäller TS2304.
- Ladda om alla bundlade plugins i appen: `cd "/Users/jerry/Local Sites/Moviefinder" && node scripts/generate-bundled-plugin-runtimes.mjs`. Dev-servern på `http://localhost:5173` plockar upp `lib/generated/bundled-plugin-runtimes/*.js`. Återställ INTE andra plugins `dist/` i git om skriptet byggt om dem: kör `git -C ../lumio-official-plugins checkout -- plugins/twitch/dist plugins/plex/dist plugins/youtube/dist plugins/jellyfin/dist` efteråt (bara `dist/`, aldrig `runtime/`).
- Visuell verifiering: `http://localhost:5173/tv-sim.html`, välj formatet 1920×1080 och "TV-läget". Öppna Live TV via appens meny. Styr med piltangenter, Enter (OK), håll Enter (håll OK), Backspace (Back).
- Befintliga mönster att härma: `runtime/hub-strings.ts` (strängar), `runtime/live-tv-hub.tsx` rad 90–145 och 262–280 (TV-stationer, hållmeny), `runtime/live-tv-hub.test.tsx` (rendering-test med seedade listor).
- Filen `plugins/twitch/runtime/twitch-browser.tsx` har okommittade ändringar från en annan session. Rör den inte och lägg den aldrig i `git add`.

## Filstruktur

| Fil | Ansvar |
|---|---|
| `runtime/index.ts` | grenar TV → `LiveTvTvShell` |
| `runtime/tv/tv-strings.ts` | EN/SV-texter, `useTvText()` |
| `runtime/tv/tv-ui.tsx` | `dp`, token `TV`, fokus-CSS, `station()`, `Tag`, `LiveTag`, `Progress`, `ChannelArt`, `Chip`, `Segment`, `RoundBtn`, ikoner |
| `runtime/tv/tv-settings-store.ts` | `live_tv_tv_settings_v1`, `live_tv_guide_mode_v1`, `live_tv_active_playlist_v1` |
| `runtime/tv/tv-multiview-store.ts` | `live_tv_multiview_v1` + rena övergångar |
| `runtime/tv/tv-zap.ts` | nummerbuffert, kanalnummer → kanal |
| `runtime/tv/tv-schedule-window.ts` | tablåfönster och blockgeometri |
| `runtime/tv/tv-search-logic.ts` | filtrering och förslag |
| `runtime/tv/video-surface.ts` | `useVideoSurface`, `videoSurfaceCapabilities` |
| `runtime/tv/tv-shell.tsx` | ikonrad, router, Back-stack, zapp, glasmeny, spelare, PIN |
| `runtime/tv/tv-hub.tsx` … `tv-settings.tsx` | en fil per vy |
| `runtime/tv/tv-keyboard.tsx`, `tv-channel-picker.tsx`, `tv-player-chrome.tsx` | delkomponenter |
| `runtime/live-tv-model.ts` | + `playlists`, `activePlaylistId`, `setActivePlaylist`, `channelNumber` |
| `runtime/live-tv-data.ts` | + `movePinnedLiveTvChannel` |
| `runtime/live-tv-player.tsx` | + prop `tv?: LiveTvPlayerTvProps`, renderar `TvPlayerChrome` |
| `src/__test-stubs__/plugin-sdk.ts` | + TV-stubbar |

---

### Task 0: Branch och test-stubbar för TV

**Files:**
- Modify: `src/__test-stubs__/plugin-sdk.ts`
- Test: `src/__test-stubs__/plugin-sdk.test.ts` (ny)

**Interfaces:**
- Produces: `__setTvModeForTests(on: boolean)`, `useTvMode()`, `getTvGlassMenu()`, `getTvKeyboardPanel()`, `tvHoldHandlers(onShort, onHold)`, `requestBrowseBack()`, `BROWSE_BACK_EVENT`, `onTvFocusEdge()`, `isDesktopTauriEnv`, `isAndroidTauriEnv`, `openMpvPlayer`, `closeMpvPlayer`, `mpvSetBounds`, `mpvSetPropertyStrings`, `openNativePlayer`, `closeNativePlayer`, `nativeSetBounds`, `capturePlayerFrame`, `getHls`, `useLang`.

- [ ] **Step 1: Skapa branch**

```bash
cd "/Users/jerry/Local Sites/lumio-official-plugins" && git checkout -b feature/live-tv-tv-mode
```

- [ ] **Step 2: Skriv testet**

`src/__test-stubs__/plugin-sdk.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { __setTvModeForTests, useTvMode, tvHoldHandlers, getTvGlassMenu, requestBrowseBack, BROWSE_BACK_EVENT } from '@/lib/plugin-sdk'

describe('plugin-sdk stub, TV', () => {
  it('växlar TV-läge för tester', () => {
    __setTvModeForTests(true)
    expect(useTvMode()).toBe(true)
    __setTvModeForTests(false)
    expect(useTvMode()).toBe(false)
  })
  it('ger en glasmeny-komponent', () => {
    expect(typeof getTvGlassMenu()).toBe('function')
  })
  it('håll OK fyrar onHold efter 650 ms och onShort vid snabbt släpp', () => {
    let short = 0
    let hold = 0
    const el = document.createElement('button')
    const h = tvHoldHandlers(() => short++, () => hold++)
    const ev = (key: string) => ({ key, repeat: false, currentTarget: el, preventDefault() {} })
    h.onKeyDown(ev('Enter'))
    h.onKeyUp(ev('Enter'))
    expect(short).toBe(1)
    expect(hold).toBe(0)
  })
  it('requestBrowseBack skickar händelsen', () => {
    let fired = 0
    window.addEventListener(BROWSE_BACK_EVENT, () => fired++)
    requestBrowseBack()
    expect(fired).toBe(1)
  })
})
```

- [ ] **Step 3: Kör testet, se att det faller**

Run: `cd plugins/live-tv && npx vitest run src/__test-stubs__/plugin-sdk.test.ts`
Expected: FAIL, `__setTvModeForTests is not a function` (eller motsvarande saknad export).

- [ ] **Step 4: Utöka stubben**

Lägg till sist i `src/__test-stubs__/plugin-sdk.ts` (ersätt den befintliga `export function useTvMode(): boolean { return false }`):

```ts
// ---- TV-läge ----
let tvModeForTests = false
export function __setTvModeForTests(on: boolean): void {
  tvModeForTests = on
}
export function useTvMode(): boolean {
  return tvModeForTests
}
export function detectTvMode(): boolean {
  return tvModeForTests
}
export const BROWSE_BACK_EVENT = 'lumio-browse-back'
export function requestBrowseBack(): void {
  window.dispatchEvent(new CustomEvent(BROWSE_BACK_EVENT))
}
export function onTvFocusEdge(_handler: (dir: string, meta?: { claimed: boolean; claim(): void }) => void): () => void {
  return () => {}
}

export const TV_HOLD_MS = 650
const holds = new WeakMap<EventTarget, { timer: number; fired: boolean }>()
export function tvHoldHandlers(
  onShort: () => void,
  onHold: (element: HTMLElement) => void,
): { onKeyDown: (event: { key: string; repeat: boolean; currentTarget: EventTarget | null; preventDefault(): void }) => void; onKeyUp: (event: { key: string; currentTarget: EventTarget | null }) => void } {
  return {
    onKeyDown: (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      if (event.repeat || !event.currentTarget) return
      const hold = { timer: 0, fired: false }
      const element = event.currentTarget as HTMLElement
      hold.timer = window.setTimeout(() => {
        hold.fired = true
        onHold(element)
      }, TV_HOLD_MS)
      holds.set(event.currentTarget, hold)
    },
    onKeyUp: (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      if (!event.currentTarget) return
      const hold = holds.get(event.currentTarget)
      if (!hold) return
      window.clearTimeout(hold.timer)
      holds.delete(event.currentTarget)
      if (!hold.fired) onShort()
    },
  }
}

export interface TvGlassMenuAction { key: string; label: string; run: () => void }
export interface TvGlassMenuTarget { title: string; element: HTMLElement; actions: TvGlassMenuAction[] }
function TvGlassMenuStub({ target, onClose }: { target: TvGlassMenuTarget; onClose: () => void }) {
  return createElement(
    'div',
    { role: 'menu', 'data-panel-root': '', 'data-testid': 'tv-glass-menu' },
    createElement('div', null, target.title),
    ...target.actions.map((action, index) =>
      createElement('button', {
        key: action.key,
        type: 'button',
        'data-f': '',
        ...(index === 0 ? { 'data-init': '' } : {}),
        onClick: () => { action.run(); onClose() },
      }, action.label),
    ),
  )
}
export function getTvGlassMenu(): typeof TvGlassMenuStub | null {
  return TvGlassMenuStub
}
function TvKeyboardPanelStub({ title, initial, onDone, onClose }: { title: string; initial: string; onDone: (value: string) => void; onClose: () => void; hint?: string; placeholder?: string }) {
  return createElement(
    'div',
    { role: 'dialog', 'data-panel-root': '', 'data-testid': 'tv-keyboard-panel' },
    createElement('div', null, title),
    createElement('button', { type: 'button', 'data-f': '', 'data-init': '', onClick: () => onDone(initial) }, 'Done'),
    createElement('button', { type: 'button', 'data-f': '', onClick: onClose }, 'Close'),
  )
}
export function getTvKeyboardPanel(): typeof TvKeyboardPanelStub | null {
  return TvKeyboardPanelStub
}

// ---- Motorer (ingen riktig uppspelning i test) ----
export const isTauriEnv = false
export const isDesktopTauriEnv = false
export const isAndroidTauriEnv = false
export const surfaceCalls: string[] = []
export async function openMpvPlayer(args: { url: string }): Promise<void> { surfaceCalls.push(`mpv:open:${args.url}`) }
export async function closeMpvPlayer(): Promise<void> { surfaceCalls.push('mpv:close') }
export function mpvSetBounds(_rect: { left: number; top: number; width: number; height: number }): void { surfaceCalls.push('mpv:bounds') }
export async function mpvSetPropertyStrings(props: Array<{ name: string; value: string }>): Promise<void> { surfaceCalls.push(`mpv:prop:${props.map((p) => `${p.name}=${p.value}`).join(',')}`) }
export async function setMpvPause(paused: boolean): Promise<void> { surfaceCalls.push(`mpv:pause:${paused}`) }
export async function openNativePlayer(opts: { url: string; mimeType?: string }): Promise<void> { surfaceCalls.push(`droid:open:${opts.url}`) }
export async function closeNativePlayer(): Promise<void> { surfaceCalls.push('droid:close') }
export function nativeSetBounds(_rect: { left: number; top: number; width: number; height: number }): void { surfaceCalls.push('droid:bounds') }
export async function capturePlayerFrame(_key: string, _video?: HTMLVideoElement | null): Promise<boolean> { return false }
export function getHls(): null { return null }
export function getControlsHideAfterSeconds(): number { return 3 }
export function lockBodyScroll(): void {}
export function unlockBodyScroll(): void {}
```

Kontrollera att `createElement` redan importeras högst upp i stubben (det gör den). Om `useLang` saknar `setLang` eller `t`, lämna den som den är.

- [ ] **Step 5: Kör testet igen**

Run: `npx vitest run src/__test-stubs__/plugin-sdk.test.ts`
Expected: PASS (4 tester).

- [ ] **Step 6: Kör hela sviten för att se att ingenting gick sönder**

Run: `npx vitest run`
Expected: PASS för alla befintliga tester.

- [ ] **Step 7: Commit**

```bash
git add plugins/live-tv/src/__test-stubs__/plugin-sdk.ts plugins/live-tv/src/__test-stubs__/plugin-sdk.test.ts
git commit -m "live-tv: test-stubbar för TV-läge (glasmeny, håll OK, motorer)"
```

---

### Task 1: TV-strängar

**Files:**
- Create: `runtime/tv/tv-strings.ts`
- Test: `runtime/tv/tv-strings.test.ts`

**Interfaces:**
- Produces: `type TvStringKey`, `tvText(lang, key, vars?)`, `useTvText(): { lang, locale, tt(key, vars?) }`.

- [ ] **Step 1: Skriv testet**

```ts
import { describe, expect, it } from 'vitest'
import { tvText } from './tv-strings'

describe('tv-strings', () => {
  it('ersätter variabler', () => {
    expect(tvText('en', 'minutesLeft', { min: 12 })).toBe('12 min left')
    expect(tvText('sv', 'minutesLeft', { min: 12 })).toBe('12 min kvar')
  })
  it('faller tillbaka på engelska för okänt språk', () => {
    expect(tvText('de', 'railHome')).toBe('Home')
  })
})
```

- [ ] **Step 2: Kör, se att det faller**

Run: `npx vitest run runtime/tv/tv-strings.test.ts` → FAIL (modul saknas).

- [ ] **Step 3: Skriv modulen**

```ts
'use client'

import { useLang } from '@/lib/plugin-sdk'

/**
 * TV-vyernas texter. Egen tabell (inte appens i18n): pluginet uppdateras
 * oberoende av appen, och nya nycklar i appen hade gett råa nyckelnamn på
 * äldre värdar. `{namn}` ersätts med vars.
 */
const EN = {
  // Ikonrad
  railSearch: 'Search',
  railHome: 'Home',
  railGuide: 'Channel guide',
  railMultiview: 'Multiview',
  railFavourites: 'Favourites',
  railSettings: 'Settings',
  // Gemensamt
  liveTv: 'Live TV',
  live: 'LIVE',
  replay: 'Replay',
  remind: 'Remind',
  watchNow: 'Watch now',
  back: 'Back',
  showMore: 'Show more',
  minutesLeft: '{min} min left',
  channelsCount: '{count} channels',
  allPlaylists: 'All playlists',
  addPlaylist: '+ Add playlist…',
  allGroups: 'All',
  favourites: 'Favourites',
  noProgramme: 'No programme information',
  loadingGuide: 'Fetching guide…',
  okWatch: 'OK = watch',
  okRemind: 'OK = remind me',
  reminderSet: 'Reminder set',
  helpHub: 'OK = watch · hold OK = menu',
  helpGuide: 'OK watch · hold OK menu · ◂▸ category',
  helpPlaylists: '◂ ▸ switch column · Back closes',
  helpFavourites: 'OK = watch · hold OK = move up/down, remove, channel details · favourites come first in the guide and zap with 1–N on the remote',
  // Menyer
  menuAddFavourite: 'Add to favourites',
  menuRemoveFavourite: 'Remove from favourites',
  menuChannelDetails: 'Channel details',
  menuAddMultiview: 'Add to multiview',
  menuLock: 'Lock with PIN',
  menuUnlock: 'Unlock',
  menuMoveUp: 'Move up',
  menuMoveDown: 'Move down',
  menuGuide: 'Guide (now / next)',
  menuMultiview: 'Multiview',
  menuPause: 'Pause',
  menuResume: 'Resume',
  menuAudioHere: 'Audio here',
  menuSwitchChannel: 'Switch channel',
  menuEnlarge: 'Enlarge',
  menuFullscreen: 'Fullscreen',
  menuRemoveTile: 'Remove tile',
  addedToMultiview: 'Added to multiview',
  // Hubb
  spotlightFavouriteLive: 'Favourite · live',
  spotlightFavourite: 'Favourite',
  spotlightRecent: 'Last watched',
  spotlightOnNow: 'On now',
  continueWatching: 'Continue watching',
  continueSub: 'Replays & last watched',
  allChannels: 'All channels',
  allChannelsSub: '{playlist} · {count} channels · OK = watch · hold OK = menu',
  emptyTitle: 'No channels yet',
  emptyBody: 'Add an M3U playlist or an Xtream login under Settings.',
  openSettings: 'Open settings',
  searchPlaceholder: 'Search channels and programmes',
  // Guide
  colChannel: 'CHANNEL',
  colNow: 'NOW',
  colNext: 'NEXT',
  colLater: 'LATER',
  modeNow: 'Now / Next',
  modeTimeline: 'Timeline',
  modePlaylists: 'Playlists',
  next: 'Next',
  later: 'Later',
  previewLabel: 'live stream, muted · OK = fullscreen',
  previewFrame: 'saved frame · OK = fullscreen',
  // Favoriter
  favouritesSub: '{count} channels · order sets channel numbers 1–{count}',
  addFromGuide: '+ Add from the guide',
  favouritesEmpty: 'No favourites yet. Hold OK on a channel and choose Add to favourites.',
  // Kanaldetalj
  yesterday: 'Yesterday',
  today: 'Today',
  tomorrow: 'Tomorrow',
  playReplay: 'Play replay',
  remindMe: 'Remind me',
  removeReminder: 'Remove reminder',
  airedAt: 'Aired {time} · {channel}',
  startsAt: 'starts {time}',
  onNow: 'on now',
  replayAvailable: 'replay · available {days} days',
  channelInfo: 'CHANNEL INFORMATION',
  quality: 'Quality',
  source: 'Source',
  replayDays: 'Replay',
  daysCount: '{days} days',
  lockWithPin: 'Lock with profile PIN',
  noArchive: 'None',
  // Sök
  searchChannels: 'Channels',
  searchProgrammes: 'Programmes today',
  hits: '{count} hits',
  keyDone: 'Done',
  keySymbols: '123?',
  keyLetters: 'ABC',
  noResults: 'No results',
  // Multivy
  multiview: 'Multiview',
  layout2: '2 tiles',
  layout3: '1 + 2',
  layout4: '4 tiles',
  audioLabel: 'Audio',
  multiviewHelp: 'OK on a tile = audio here · hold OK = switch channel / remove',
  pickChannel: 'Pick channel',
  pickChannelFor: 'Pick channel for tile {n}',
  frameLabel: 'frame',
  tileFailed: 'Could not play',
  // Inställningar
  tabAppearance: 'Appearance',
  tabPlaylists: 'Playlists',
  tabEpg: 'EPG sources',
  tabParental: 'Parental control',
  accentColour: 'Accent colour',
  guideDefault: 'Channel guide default view',
  guideDefaultHint: 'Can also be switched inside the guide',
  behaviour: 'Behaviour',
  settingPreview: 'Preview in the channel guide (plays the stream muted)',
  settingStartLast: 'Start on the last channel',
  settingNumericZap: 'Number keys zap directly',
  settingBannerHide: 'Hide the info banner after',
  never: 'Never',
  seconds: '{s} s',
  addM3u: 'Add M3U URL',
  addXtream: 'Add Xtream login',
  refetch: 'Refetch',
  remove: 'Remove',
  fetchedAt: 'fetched {time}',
  addEpgUrl: 'Add EPG URL',
  lockedChannels: 'Locked channels',
  noLocked: 'No locked channels',
  unlock: 'Unlock',
  enterPin: 'Enter PIN',
  pinWrong: 'Wrong PIN',
  cancel: 'Cancel',
  // Spelare
  playerHelp: '▾ guide · hold OK = menu',
  moreActions: 'More',
  nextLabel: 'Next',
  zapMiss: 'No channel {n}',
  // Tomma
  guideEmpty: 'No channels in this category',
} as const

const SV: Record<keyof typeof EN, string> = {
  railSearch: 'Sök',
  railHome: 'Hem',
  railGuide: 'Kanalguide',
  railMultiview: 'Multivy',
  railFavourites: 'Favoriter',
  railSettings: 'Inställningar',
  liveTv: 'Live TV',
  live: 'LIVE',
  replay: 'Repris',
  remind: 'Påminn',
  watchNow: 'Titta nu',
  back: 'Tillbaka',
  showMore: 'Visa fler',
  minutesLeft: '{min} min kvar',
  channelsCount: '{count} kanaler',
  allPlaylists: 'Alla spellistor',
  addPlaylist: '+ Lägg till spellista …',
  allGroups: 'Alla',
  favourites: 'Favoriter',
  noProgramme: 'Ingen programinformation',
  loadingGuide: 'Hämtar tablå…',
  okWatch: 'OK = titta',
  okRemind: 'OK = påminn mig',
  reminderSet: 'Påminnelse satt',
  helpHub: 'OK = titta · håll OK = meny',
  helpGuide: 'OK titta · håll OK meny · ◂▸ kategori',
  helpPlaylists: '◂ ▸ byter kolumn · Back stänger',
  helpFavourites: 'OK = titta · håll OK = flytta upp/ner, ta bort, kanaldetaljer · favoriter ligger först i guiden och zappas med 1–N på fjärren',
  menuAddFavourite: 'Lägg till i favoriter',
  menuRemoveFavourite: 'Ta bort från favoriter',
  menuChannelDetails: 'Kanaldetaljer',
  menuAddMultiview: 'Lägg till i multivy',
  menuLock: 'Lås med PIN',
  menuUnlock: 'Lås upp',
  menuMoveUp: 'Flytta upp',
  menuMoveDown: 'Flytta ner',
  menuGuide: 'Guide (nu / sen)',
  menuMultiview: 'Multivy',
  menuPause: 'Pausa',
  menuResume: 'Fortsätt',
  menuAudioHere: 'Ljud hit',
  menuSwitchChannel: 'Byt kanal',
  menuEnlarge: 'Förstora',
  menuFullscreen: 'Helskärm',
  menuRemoveTile: 'Ta bort ruta',
  addedToMultiview: 'Tillagd i multivyn',
  spotlightFavouriteLive: 'Favorit · live',
  spotlightFavourite: 'Favorit',
  spotlightRecent: 'Senast sedd',
  spotlightOnNow: 'Sänds nu',
  continueWatching: 'Fortsätt titta',
  continueSub: 'Repriser & senast sedda',
  allChannels: 'Alla kanaler',
  allChannelsSub: '{playlist} · {count} kanaler · OK = titta · håll OK = meny',
  emptyTitle: 'Inga kanaler än',
  emptyBody: 'Lägg till en M3U-spellista eller en Xtream-inloggning under Inställningar.',
  openSettings: 'Öppna inställningar',
  searchPlaceholder: 'Sök kanaler och program',
  colChannel: 'KANAL',
  colNow: 'NU',
  colNext: 'SEN',
  colLater: 'SENARE',
  modeNow: 'Nu / Sen',
  modeTimeline: 'Tablå',
  modePlaylists: 'Spellistor',
  next: 'Sen',
  later: 'Senare',
  previewLabel: 'liveström, tyst · OK = helskärm',
  previewFrame: 'sparad bildruta · OK = helskärm',
  favouritesSub: '{count} kanaler · ordningen styr kanalnummer 1–{count}',
  addFromGuide: '+ Lägg till från guiden',
  favouritesEmpty: 'Inga favoriter än. Håll OK på en kanal och välj Lägg till i favoriter.',
  yesterday: 'Igår',
  today: 'Idag',
  tomorrow: 'Imorgon',
  playReplay: 'Spela repris',
  remindMe: 'Påminn mig',
  removeReminder: 'Ta bort påminnelse',
  airedAt: 'Sändes {time} · {channel}',
  startsAt: 'börjar {time}',
  onNow: 'pågår nu',
  replayAvailable: 'repris · tillgänglig {days} dagar',
  channelInfo: 'KANALINFORMATION',
  quality: 'Kvalitet',
  source: 'Källa',
  replayDays: 'Repris',
  daysCount: '{days} dagar',
  lockWithPin: 'Lås med profilens PIN',
  noArchive: 'Ingen',
  searchChannels: 'Kanaler',
  searchProgrammes: 'Program idag',
  hits: '{count} träffar',
  keyDone: 'Klar',
  keySymbols: '123?',
  keyLetters: 'ABC',
  noResults: 'Inga träffar',
  multiview: 'Multivy',
  layout2: '2 rutor',
  layout3: '1 + 2',
  layout4: '4 rutor',
  audioLabel: 'Ljud',
  multiviewHelp: 'OK på ruta = ljud hit · håll OK = byt kanal / ta bort',
  pickChannel: 'Välj kanal',
  pickChannelFor: 'Välj kanal för ruta {n}',
  frameLabel: 'bildruta',
  tileFailed: 'Kunde inte spela',
  tabAppearance: 'Utseende',
  tabPlaylists: 'Spellistor',
  tabEpg: 'EPG-källor',
  tabParental: 'Föräldrakontroll',
  accentColour: 'Accentfärg',
  guideDefault: 'Kanalguidens standardvy',
  guideDefaultHint: 'Går även att växla direkt i guiden',
  behaviour: 'Beteende',
  settingPreview: 'Förhandsvisning i kanalguiden (spelar strömmen tyst)',
  settingStartLast: 'Starta på senaste kanalen',
  settingNumericZap: 'Nummertangenter zappar direkt',
  settingBannerHide: 'Dölj infobannern efter',
  never: 'Aldrig',
  seconds: '{s} s',
  addM3u: 'Lägg till M3U-URL',
  addXtream: 'Lägg till Xtream-inloggning',
  refetch: 'Hämta om',
  remove: 'Ta bort',
  fetchedAt: 'hämtad {time}',
  addEpgUrl: 'Lägg till EPG-URL',
  lockedChannels: 'Låsta kanaler',
  noLocked: 'Inga låsta kanaler',
  unlock: 'Lås upp',
  enterPin: 'Ange PIN',
  pinWrong: 'Fel PIN',
  cancel: 'Avbryt',
  playerHelp: '▾ guide · håll OK = meny',
  moreActions: 'Mer',
  nextLabel: 'Sen',
  zapMiss: 'Ingen kanal {n}',
  guideEmpty: 'Inga kanaler i kategorin',
}

export type TvStringKey = keyof typeof EN

export function tvText(lang: string | undefined, key: TvStringKey, vars?: Record<string, string | number>): string {
  const table = lang === 'sv' ? SV : EN
  let out: string = table[key] ?? EN[key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) out = out.split(`{${name}}`).join(String(value))
  }
  return out
}

export function useTvText() {
  const lang: string = useLang().lang
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB'
  return {
    lang,
    locale,
    tt: (key: TvStringKey, vars?: Record<string, string | number>) => tvText(lang, key, vars),
  }
}
```

- [ ] **Step 4: Kör testet** → PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-strings.ts plugins/live-tv/runtime/tv/tv-strings.test.ts
git commit -m "live-tv: strängtabell för TV-vyerna"
```

---

### Task 2: Inställnings- och multivy-lager

**Files:**
- Create: `runtime/tv/tv-settings-store.ts`, `runtime/tv/tv-multiview-store.ts`
- Test: `runtime/tv/tv-settings-store.test.ts`, `runtime/tv/tv-multiview-store.test.ts`

**Interfaces:**
- Produces:
  - `interface TvSettings { previewEnabled: boolean; startOnLastChannel: boolean; numericZap: boolean; bannerHideMs: 0 | 2000 | 4000 | 6000 }`, `getTvSettings()`, `setTvSettings(patch)`, `useTvSettings(): TvSettings`
  - `type GuideMode = 'now' | 'tl' | 'playlists'`, `getGuideMode()`, `setGuideMode(mode)`, `useGuideMode()`
  - `getActivePlaylistId(): string | null`, `setActivePlaylistId(id)`, `onActivePlaylistChanged(cb)`
  - `type MultiviewLayout = 2 | 3 | 4`, `interface MultiviewState { layout: MultiviewLayout; tiles: (string | null)[]; audioIndex: number }`, `getMultiviewState()`, `setMultiviewState(next)`, `useMultiviewState()`, rena funktioner `tileCount(layout)`, `assignTile(state, index, key)`, `removeTile(state, index)`, `enlargeTile(state, index)`, `setLayout(state, layout)`, `addToFirstFree(state, key)`.

- [ ] **Step 1: Skriv testen**

`tv-settings-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests } from '@/lib/plugin-sdk'
import { getTvSettings, setTvSettings, getGuideMode, setGuideMode, getActivePlaylistId, setActivePlaylistId } from './tv-settings-store'

beforeEach(() => __resetForTests())

describe('tv-settings-store', () => {
  it('har standardvärden', () => {
    expect(getTvSettings()).toEqual({ previewEnabled: true, startOnLastChannel: false, numericZap: true, bannerHideMs: 4000 })
    expect(getGuideMode()).toBe('now')
    expect(getActivePlaylistId()).toBeNull()
  })
  it('sparar delvisa ändringar', () => {
    setTvSettings({ previewEnabled: false })
    expect(getTvSettings().previewEnabled).toBe(false)
    expect(getTvSettings().numericZap).toBe(true)
  })
  it('sanerar ogiltiga värden', () => {
    setTvSettings({ bannerHideMs: 999 as unknown as 4000 })
    expect(getTvSettings().bannerHideMs).toBe(4000)
    setGuideMode('tl')
    expect(getGuideMode()).toBe('tl')
    setActivePlaylistId('list-1')
    expect(getActivePlaylistId()).toBe('list-1')
  })
})
```

`tv-multiview-store.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { addToFirstFree, assignTile, enlargeTile, removeTile, setLayout, tileCount, type MultiviewState } from './tv-multiview-store'

const empty: MultiviewState = { layout: 4, tiles: [null, null, null, null], audioIndex: 0 }

describe('tv-multiview-store', () => {
  it('tileCount följer layouten', () => {
    expect(tileCount(2)).toBe(2)
    expect(tileCount(3)).toBe(3)
    expect(tileCount(4)).toBe(4)
  })
  it('assignTile sätter nyckel och ger ljud till första tilldelade rutan', () => {
    const s = assignTile(empty, 2, 'a')
    expect(s.tiles[2]).toBe('a')
    expect(s.audioIndex).toBe(2)
  })
  it('removeTile flyttar ljudet till nästa tilldelade ruta', () => {
    const s = removeTile(assignTile(assignTile(empty, 0, 'a'), 1, 'b'), 0)
    expect(s.tiles[0]).toBeNull()
    expect(s.audioIndex).toBe(1)
  })
  it('enlargeTile byter till 1+2 med rutan först', () => {
    const s = enlargeTile(assignTile(assignTile(empty, 0, 'a'), 3, 'b'), 3)
    expect(s.layout).toBe(3)
    expect(s.tiles[0]).toBe('b')
    expect(s.tiles).toContain('a')
    expect(s.tiles).toHaveLength(3)
  })
  it('setLayout behåller så många rutor som ryms', () => {
    const s = setLayout(assignTile(assignTile(assignTile(empty, 0, 'a'), 1, 'b'), 2, 'c'), 2)
    expect(s.tiles).toEqual(['a', 'b'])
    expect(s.audioIndex).toBe(0)
  })
  it('addToFirstFree tar första lediga, annars sista', () => {
    const full = { layout: 2 as const, tiles: ['a', 'b'], audioIndex: 0 }
    expect(addToFirstFree({ layout: 2, tiles: ['a', null], audioIndex: 0 }, 'c').tiles).toEqual(['a', 'c'])
    expect(addToFirstFree(full, 'c').tiles).toEqual(['a', 'c'])
  })
})
```

- [ ] **Step 2: Kör, se att de faller** → FAIL (moduler saknas).

- [ ] **Step 3: Skriv `tv-settings-store.ts`**

```ts
'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'

export const TV_SETTINGS_KEY = 'live_tv_tv_settings_v1'
export const GUIDE_MODE_KEY = 'live_tv_guide_mode_v1'
export const ACTIVE_PLAYLIST_KEY = 'live_tv_active_playlist_v1'

export const BANNER_HIDE_OPTIONS = [2000, 4000, 6000, 0] as const
export type BannerHideMs = (typeof BANNER_HIDE_OPTIONS)[number]

export interface TvSettings {
  previewEnabled: boolean
  startOnLastChannel: boolean
  numericZap: boolean
  bannerHideMs: BannerHideMs
}

const DEFAULTS: TvSettings = { previewEnabled: true, startOnLastChannel: false, numericZap: true, bannerHideMs: 4000 }

function sanitize(raw: unknown): TvSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof TvSettings, unknown>>
  const banner = (BANNER_HIDE_OPTIONS as readonly number[]).includes(r.bannerHideMs as number) ? (r.bannerHideMs as BannerHideMs) : DEFAULTS.bannerHideMs
  return {
    previewEnabled: typeof r.previewEnabled === 'boolean' ? r.previewEnabled : DEFAULTS.previewEnabled,
    startOnLastChannel: typeof r.startOnLastChannel === 'boolean' ? r.startOnLastChannel : DEFAULTS.startOnLastChannel,
    numericZap: typeof r.numericZap === 'boolean' ? r.numericZap : DEFAULTS.numericZap,
    bannerHideMs: banner,
  }
}

export function getTvSettings(): TvSettings {
  return sanitize(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, DEFAULTS))
}
export function setTvSettings(patch: Partial<TvSettings>): TvSettings {
  const next = sanitize({ ...getTvSettings(), ...patch })
  writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, next)
  return next
}
export function useTvSettings(): TvSettings {
  const [value, setValue] = useState(getTvSettings)
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, () => setValue(getTvSettings())), [])
  return value
}

export type GuideMode = 'now' | 'tl' | 'playlists'
const GUIDE_MODES: GuideMode[] = ['now', 'tl', 'playlists']
export function getGuideMode(): GuideMode {
  const raw = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, 'now')
  return GUIDE_MODES.includes(raw as GuideMode) ? (raw as GuideMode) : 'now'
}
export function setGuideMode(mode: GuideMode): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, mode)
}
export function useGuideMode(): GuideMode {
  const [value, setValue] = useState(getGuideMode)
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, () => setValue(getGuideMode())), [])
  return value
}

export function getActivePlaylistId(): string | null {
  const raw = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, null)
  return typeof raw === 'string' && raw ? raw : null
}
export function setActivePlaylistId(id: string | null): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, id)
}
export function onActivePlaylistChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, listener)
}
```

Kontrollera att `writePluginJson` i den riktiga SDK:n utlöser `onPluginStorageChanged`-lyssnare (det gör den i appen; stubben gör det inte, så komponenttester som behöver reaktivitet anropar `emitPluginStorageChanged`).

- [ ] **Step 4: Skriv `tv-multiview-store.ts`**

```ts
'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'

export const MULTIVIEW_KEY = 'live_tv_multiview_v1'
export type MultiviewLayout = 2 | 3 | 4
export interface MultiviewState {
  layout: MultiviewLayout
  /** channelKey per ruta, null = tom. Längd = tileCount(layout). */
  tiles: (string | null)[]
  audioIndex: number
}

export function tileCount(layout: MultiviewLayout): number {
  return layout
}

const DEFAULT_STATE: MultiviewState = { layout: 4, tiles: [null, null, null, null], audioIndex: 0 }

function normalize(state: MultiviewState): MultiviewState {
  const count = tileCount(state.layout)
  const tiles = Array.from({ length: count }, (_, i) => state.tiles[i] ?? null)
  let audioIndex = state.audioIndex
  if (audioIndex < 0 || audioIndex >= count || tiles[audioIndex] === null) {
    const first = tiles.findIndex((t) => t !== null)
    audioIndex = first === -1 ? 0 : first
  }
  return { layout: state.layout, tiles, audioIndex }
}

function sanitize(raw: unknown): MultiviewState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<MultiviewState>
  const layout: MultiviewLayout = r.layout === 2 || r.layout === 3 || r.layout === 4 ? r.layout : 4
  const tiles = Array.isArray(r.tiles) ? r.tiles.map((t) => (typeof t === 'string' && t ? t : null)) : []
  return normalize({ layout, tiles, audioIndex: typeof r.audioIndex === 'number' ? r.audioIndex : 0 })
}

export function getMultiviewState(): MultiviewState {
  return sanitize(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, DEFAULT_STATE))
}
export function setMultiviewState(next: MultiviewState): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, normalize(next))
}
export function useMultiviewState(): MultiviewState {
  const [value, setValue] = useState(getMultiviewState)
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, () => setValue(getMultiviewState())), [])
  return value
}

export function assignTile(state: MultiviewState, index: number, key: string): MultiviewState {
  const tiles = [...state.tiles]
  tiles[index] = key
  const hadAny = state.tiles.some((t) => t !== null)
  return normalize({ ...state, tiles, audioIndex: hadAny ? state.audioIndex : index })
}
export function removeTile(state: MultiviewState, index: number): MultiviewState {
  const tiles = [...state.tiles]
  tiles[index] = null
  return normalize({ ...state, tiles })
}
export function setLayout(state: MultiviewState, layout: MultiviewLayout): MultiviewState {
  const filled = state.tiles.filter((t): t is string => t !== null)
  const audioKey = state.tiles[state.audioIndex]
  const tiles = filled.slice(0, tileCount(layout))
  const audioIndex = audioKey ? Math.max(0, tiles.indexOf(audioKey)) : 0
  return normalize({ layout, tiles, audioIndex })
}
/** Förstora: layout 1+2 med rutan först; övriga tilldelade följer i ordning. */
export function enlargeTile(state: MultiviewState, index: number): MultiviewState {
  const key = state.tiles[index]
  const rest = state.tiles.filter((t, i): t is string => t !== null && i !== index)
  const tiles = key ? [key, ...rest] : rest
  return normalize({ layout: 3, tiles, audioIndex: key ? 0 : state.audioIndex })
}
export function addToFirstFree(state: MultiviewState, key: string): MultiviewState {
  const free = state.tiles.findIndex((t) => t === null)
  return assignTile(state, free === -1 ? state.tiles.length - 1 : free, key)
}
```

- [ ] **Step 5: Kör testen** → PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-settings-store.ts plugins/live-tv/runtime/tv/tv-settings-store.test.ts plugins/live-tv/runtime/tv/tv-multiview-store.ts plugins/live-tv/runtime/tv/tv-multiview-store.test.ts
git commit -m "live-tv: lagring för TV-inställningar, guideläge, aktiv spellista och multivy"
```

---

### Task 3: Modellutökning – aktiv spellista, kanalnummer, favoritordning

**Files:**
- Modify: `runtime/live-tv-data.ts` (efter `togglePinnedLiveTvChannel`, rad ~460)
- Modify: `runtime/live-tv-model.ts`
- Test: `runtime/live-tv-model.test.ts` (ny), `runtime/live-tv-pins.test.ts` (ny)

**Interfaces:**
- Produces i `live-tv-data.ts`: `movePinnedLiveTvChannel(key: string, delta: -1 | 1): string[]`.
- Produces i `LiveTvModel`: `playlists: { id: string; name: string; count: number }[]`, `activePlaylistId: string | null`, `setActivePlaylist(id: string | null): void`, `activePlaylistName: string | null`, `channelNumber(channel: M3uChannel): number | null`, `allChannels: M3uChannel[]` (ofiltrerad), `favouriteChannels: M3uChannel[]` (i pinnad ordning, ur `allChannels`).

- [ ] **Step 1: Skriv testen**

`runtime/live-tv-pins.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, getPinnedLiveTvKeys, movePinnedLiveTvChannel } from './live-tv-data'

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', ['a', 'b', 'c'])
})

describe('movePinnedLiveTvChannel', () => {
  it('flyttar upp', () => {
    expect(movePinnedLiveTvChannel('b', -1)).toEqual(['b', 'a', 'c'])
    expect(getPinnedLiveTvKeys()).toEqual(['b', 'a', 'c'])
  })
  it('flyttar ner och stannar vid kanten', () => {
    expect(movePinnedLiveTvChannel('c', 1)).toEqual(['a', 'b', 'c'])
    expect(movePinnedLiveTvChannel('a', -1)).toEqual(['a', 'b', 'c'])
  })
  it('ignorerar okänd nyckel', () => {
    expect(movePinnedLiveTvChannel('x', 1)).toEqual(['a', 'b', 'c'])
  })
})
```

`runtime/live-tv-model.test.ts`:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import { useLiveTvModel } from './live-tv-model'

vi.mock('./hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const lists: LiveTvList[] = [
  { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
  { id: 'l2', name: 'Nordic', channels: [ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
]

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', lists)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', ['C|http://x/C', 'A|http://x/A'])
})

describe('useLiveTvModel spellistor', () => {
  it('slår ihop alla listor som standard och numrerar', () => {
    const { result } = renderHook(() => useLiveTvModel())
    expect(result.current.playlists.map((p) => p.count)).toEqual([2, 1])
    expect(result.current.channels.map((c) => c.name)).toEqual(['A', 'B', 'C'])
    expect(result.current.channelNumber(result.current.channels[2])).toBe(3)
  })
  it('filtrerar på aktiv spellista men behåller favoriter', () => {
    const { result } = renderHook(() => useLiveTvModel())
    act(() => result.current.setActivePlaylist('l2'))
    expect(result.current.channels.map((c) => c.name)).toEqual(['C'])
    expect(result.current.activePlaylistName).toBe('Nordic')
    expect(result.current.favouriteChannels.map((c) => c.name)).toEqual(['C', 'A'])
  })
})
```

Kontrollera hur `channelKey` bygger nyckeln (`runtime/live-tv-data.ts` rad 111) och anpassa strängarna `'C|http://x/C'` i testet till det verkliga formatet.

- [ ] **Step 2: Kör, se att de faller** → FAIL.

- [ ] **Step 3: Lägg till `movePinnedLiveTvChannel` i `live-tv-data.ts`** direkt efter `togglePinnedLiveTvChannel`:

```ts
/** Favoritordning styr snabbzapp-numren på TV: flytta en post ett steg. */
export function movePinnedLiveTvChannel(key: string, delta: -1 | 1): string[] {
  const current = getPinnedLiveTvKeys()
  const index = current.indexOf(key)
  if (index === -1) return current
  const target = index + delta
  if (target < 0 || target >= current.length) return current
  const next = [...current]
  next.splice(index, 1)
  next.splice(target, 0, key)
  setPinnedLiveTvKeys(next)
  return next
}
```

- [ ] **Step 4: Utöka `live-tv-model.ts`**

I `LiveTvModel`-gränssnittet lägg till:

```ts
  /** Alla kanaler oavsett aktiv spellista. */
  allChannels: M3uChannel[]
  playlists: { id: string; name: string; count: number }[]
  activePlaylistId: string | null
  activePlaylistName: string | null
  setActivePlaylist: (id: string | null) => void
  /** 1-baserat nummer i den filtrerade listan, null om kanalen inte ingår. */
  channelNumber: (channel: M3uChannel) => number | null
  /** Favoriter i sparad ordning, ur allChannels. */
  favouriteChannels: M3uChannel[]
```

I `useLiveTvModel`, efter `const [lists, setLists] = ...`:

```ts
  const [activePlaylistId, setActivePlaylistIdState] = useState<string | null>(() => getActivePlaylistId())
  useEffect(() => onActivePlaylistChanged(() => setActivePlaylistIdState(getActivePlaylistId())), [])
```

Ersätt `const channels = useMemo(() => flattenChannels(lists), [lists])` med:

```ts
  const allChannels = useMemo(() => flattenChannels(lists), [lists])
  const activeList = useMemo(() => lists.find((list) => list.id === activePlaylistId) ?? null, [lists, activePlaylistId])
  // Vald spellista som inte längre finns → tillbaka till alla.
  const channels = useMemo(() => (activeList ? flattenChannels([activeList]) : allChannels), [activeList, allChannels])
  const playlists = useMemo(() => lists.map((list) => ({ id: list.id, name: list.name, count: flattenChannels([list]).length })), [lists])
  const numberByKey = useMemo(() => new Map(channels.map((channel, index) => [channelKey(channel), index + 1])), [channels])
  const allByKey = useMemo(() => new Map(allChannels.map((channel) => [channelKey(channel), channel])), [allChannels])
```

Lägg i returobjektet:

```ts
    allChannels,
    playlists,
    activePlaylistId: activeList ? activeList.id : null,
    activePlaylistName: activeList ? activeList.name : null,
    setActivePlaylist: (id) => { setActivePlaylistId(id); setActivePlaylistIdState(id) },
    channelNumber: (channel) => numberByKey.get(channelKey(channel)) ?? null,
    favouriteChannels: useMemo(() => pinnedKeys.map((key) => allByKey.get(key)).filter((c): c is M3uChannel => Boolean(c)), [pinnedKeys, allByKey]),
```

Importera `getActivePlaylistId, onActivePlaylistChanged, setActivePlaylistId` från `./tv/tv-settings-store`. Flytta `useMemo`-anropet för `favouriteChannels` ut till en egen `const` ovanför `return` (hooks får inte ligga i objektliteralen villkorligt, men ordningen är stabil; för läsbarhet lägg den som egen const). Låt `byKey`, `byUrl`, `groups`, `listByUrl` fortsatt bygga på `channels` (filtrerade) utom `listByUrl` som ska bygga på `lists` som idag. `byUrl` används av påminnelser: byt den till `allChannels` så påminnelser hittar kanaler utanför aktiv lista.

- [ ] **Step 5: Kör testen** → PASS. Kör hela sviten: `npx vitest run` → PASS (hubbtestet använder fortfarande alla listor eftersom aktiv lista är null).

- [ ] **Step 6: Typkontroll**

Run: `npx tsc --noEmit -p tsconfig.json` → inga fel.

- [ ] **Step 7: Commit**

```bash
git add plugins/live-tv/runtime/live-tv-data.ts plugins/live-tv/runtime/live-tv-model.ts plugins/live-tv/runtime/live-tv-model.test.ts plugins/live-tv/runtime/live-tv-pins.test.ts
git commit -m "live-tv: aktiv spellista, kanalnummer och favoritordning i modellen"
```

---

### Task 4: Ren logik – zapp, tablåfönster, sök

**Files:**
- Create: `runtime/tv/tv-zap.ts`, `runtime/tv/tv-schedule-window.ts`, `runtime/tv/tv-search-logic.ts`
- Test: motsvarande `.test.ts`

**Interfaces:**
- Produces:
  - `resolveZap(digits: string, favourites: M3uChannel[], channels: M3uChannel[]): M3uChannel | null`
  - `createZapBuffer(opts: { timeoutMs: number; onCommit(digits: string): void; onChange(digits: string): void }): { push(digit: string): void; commit(): void; clear(): void; dispose(): void }`
  - `scheduleWindow(nowMs: number): { start: number; end: number }` (föregående hela halvtimme − 30 min, 2 h), `blockGeometry(p: {start,stop}, win): { leftPct: number; widthPct: number } | null`, `nowLinePct(nowMs, win): number`, `timeTicks(win): number[]` (4 etiketter vid 0/25/50/75 %).
  - `searchChannels(query, channels, limit=30): M3uChannel[]`, `searchProgrammes(query, channels, nowFor, scheduleFor, dayStart, dayEnd, limit=30): { channel: M3uChannel; programme: EpgProgramme }[]`, `suggestions(query, channels, programmeTitles, limit=6): string[]`.

- [ ] **Step 1: Skriv testen**

`tv-zap.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createZapBuffer, resolveZap } from './tv-zap'

const ch = (name: string) => ({ name, group: '', url: `http://x/${name}`, tvgId: null })

describe('resolveZap', () => {
  const favs = [ch('F1'), ch('F2')]
  const all = [ch('A'), ch('B'), ch('C')]
  it('favoriter först', () => {
    expect(resolveZap('1', favs, all)?.name).toBe('F1')
    expect(resolveZap('2', favs, all)?.name).toBe('F2')
  })
  it('listnummer när favoriterna tar slut', () => {
    expect(resolveZap('3', favs, all)?.name).toBe('C')
  })
  it('utan favoriter räknas listan från 1', () => {
    expect(resolveZap('1', [], all)?.name).toBe('A')
  })
  it('miss ger null', () => {
    expect(resolveZap('9', favs, all)).toBeNull()
    expect(resolveZap('0', favs, all)).toBeNull()
  })
})

describe('createZapBuffer', () => {
  it('samlar siffror och committar efter timeout', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    const onChange = vi.fn()
    const buffer = createZapBuffer({ timeoutMs: 1500, onCommit, onChange })
    buffer.push('1')
    buffer.push('2')
    expect(onChange).toHaveBeenLastCalledWith('12')
    vi.advanceTimersByTime(1499)
    expect(onCommit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onCommit).toHaveBeenCalledWith('12')
    expect(onChange).toHaveBeenLastCalledWith('')
    vi.useRealTimers()
  })
  it('commit direkt vid OK och max fyra siffror', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    const buffer = createZapBuffer({ timeoutMs: 1500, onCommit, onChange: () => {} })
    '12345'.split('').forEach((d) => buffer.push(d))
    buffer.commit()
    expect(onCommit).toHaveBeenCalledWith('1234')
    vi.useRealTimers()
  })
})
```

`tv-schedule-window.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { blockGeometry, nowLinePct, scheduleWindow, timeTicks } from './tv-schedule-window'

const H = 3_600_000
const M = 60_000
// 2026-09-12 15:05 lokal tid
const now = new Date(2026, 8, 12, 15, 5).getTime()

describe('scheduleWindow', () => {
  it('börjar på föregående hela halvtimme minus 30 min och är 2 h', () => {
    const win = scheduleWindow(now)
    expect(new Date(win.start).getHours()).toBe(14)
    expect(new Date(win.start).getMinutes()).toBe(30)
    expect(win.end - win.start).toBe(2 * H)
  })
  it('ger fyra tidsetiketter', () => {
    const win = scheduleWindow(now)
    expect(timeTicks(win)).toEqual([win.start, win.start + 30 * M, win.start + 60 * M, win.start + 90 * M])
  })
})

describe('blockGeometry', () => {
  const win = scheduleWindow(now)
  it('placerar ett block i procent och klipper mot kanterna', () => {
    const g = blockGeometry({ start: win.start - 30 * M, stop: win.start + 30 * M }, win)
    expect(g).toEqual({ leftPct: 0, widthPct: 25 })
  })
  it('utanför fönstret ger null', () => {
    expect(blockGeometry({ start: win.end, stop: win.end + H }, win)).toBeNull()
  })
  it('nu-linjen ligger mellan 0 och 100', () => {
    const pct = nowLinePct(now, win)
    expect(pct).toBeGreaterThan(25)
    expect(pct).toBeLessThan(30)
  })
})
```

`tv-search-logic.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { searchChannels, searchProgrammes, suggestions } from './tv-search-logic'

const ch = (name: string, group = 'Sport') => ({ name, group, url: `http://x/${name}`, tvgId: null })
const channels = [ch('SKY SPORTS MAIN'), ch('ESPN UHD'), ch('Sportsnet 360')]

describe('searchChannels', () => {
  it('matchar delsträng oavsett skiftläge, prefixträff först', () => {
    expect(searchChannels('sport', channels).map((c) => c.name)).toEqual(['Sportsnet 360', 'SKY SPORTS MAIN'])
  })
  it('tom sökning ger tom lista', () => {
    expect(searchChannels('  ', channels)).toEqual([])
  })
})

describe('searchProgrammes', () => {
  it('hittar dagens program på titel', () => {
    const day = { start: 0, end: 86_400_000 }
    const scheduleFor = (c: { name: string }) => (c.name === 'ESPN UHD' ? [{ title: 'College GameDay', start: 1000, stop: 2000 }] : [])
    const hits = searchProgrammes('game', channels, scheduleFor, day)
    expect(hits).toHaveLength(1)
    expect(hits[0].channel.name).toBe('ESPN UHD')
  })
})

describe('suggestions', () => {
  it('ger unika förslag som börjar på strängen', () => {
    expect(suggestions('s', channels, ['Sports Tonight', 'sports tonight', 'News'])).toEqual(['SKY SPORTS MAIN', 'Sportsnet 360', 'Sports Tonight'])
  })
})
```

- [ ] **Step 2: Kör, se att de faller** → FAIL.

- [ ] **Step 3: Skriv `tv-zap.ts`**

```ts
import type { M3uChannel } from '../live-tv-data'

/** Nummertangent → kanal: favoriter 1–N först, därefter listnummer. */
export function resolveZap(digits: string, favourites: M3uChannel[], channels: M3uChannel[]): M3uChannel | null {
  const n = Number.parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  if (n <= favourites.length) return favourites[n - 1] ?? null
  return channels[n - 1] ?? null
}

export const ZAP_MAX_DIGITS = 4

export function createZapBuffer(opts: { timeoutMs: number; onCommit: (digits: string) => void; onChange: (digits: string) => void }) {
  let digits = ''
  let timer: number | null = null
  const clearTimer = () => {
    if (timer !== null) window.clearTimeout(timer)
    timer = null
  }
  const commit = () => {
    clearTimer()
    if (!digits) return
    const value = digits
    digits = ''
    opts.onChange('')
    opts.onCommit(value)
  }
  return {
    push(digit: string) {
      if (!/^[0-9]$/.test(digit)) return
      if (digits.length >= ZAP_MAX_DIGITS) return
      digits += digit
      opts.onChange(digits)
      clearTimer()
      timer = window.setTimeout(commit, opts.timeoutMs)
    },
    commit,
    clear() {
      clearTimer()
      digits = ''
      opts.onChange('')
    },
    dispose() {
      clearTimer()
    },
  }
}
```

- [ ] **Step 4: Skriv `tv-schedule-window.ts`**

```ts
const MINUTE = 60_000
export const WINDOW_MS = 2 * 60 * MINUTE

export interface ScheduleWindow { start: number; end: number }

/** Föregående hela halvtimme minus 30 min; 2 h brett. */
export function scheduleWindow(nowMs: number): ScheduleWindow {
  const d = new Date(nowMs)
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30)
  const start = d.getTime() - 30 * MINUTE
  return { start, end: start + WINDOW_MS }
}

export function timeTicks(win: ScheduleWindow): number[] {
  return [0, 1, 2, 3].map((i) => win.start + i * 30 * MINUTE)
}

export function blockGeometry(p: { start: number; stop: number }, win: ScheduleWindow): { leftPct: number; widthPct: number } | null {
  const start = Math.max(p.start, win.start)
  const stop = Math.min(p.stop, win.end)
  if (stop <= start) return null
  const leftPct = ((start - win.start) / WINDOW_MS) * 100
  const widthPct = ((stop - start) / WINDOW_MS) * 100
  return { leftPct, widthPct }
}

export function nowLinePct(nowMs: number, win: ScheduleWindow): number {
  return Math.min(100, Math.max(0, ((nowMs - win.start) / WINDOW_MS) * 100))
}
```

- [ ] **Step 5: Skriv `tv-search-logic.ts`**

```ts
import type { M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

export function searchChannels(query: string, channels: M3uChannel[], limit = 30): M3uChannel[] {
  const q = norm(query)
  if (!q) return []
  const prefix: M3uChannel[] = []
  const contains: M3uChannel[] = []
  for (const channel of channels) {
    const name = norm(channel.name)
    if (name.startsWith(q)) prefix.push(channel)
    else if (name.includes(q)) contains.push(channel)
    if (prefix.length >= limit) break
  }
  return [...prefix, ...contains].slice(0, limit)
}

export interface ProgrammeHit { channel: M3uChannel; programme: EpgProgramme }

export function searchProgrammes(
  query: string,
  channels: M3uChannel[],
  scheduleFor: (channel: M3uChannel, fromMs: number, toMs: number) => EpgProgramme[],
  day: { start: number; end: number },
  limit = 30,
): ProgrammeHit[] {
  const q = norm(query)
  if (!q) return []
  const out: ProgrammeHit[] = []
  for (const channel of channels) {
    for (const programme of scheduleFor(channel, day.start, day.end)) {
      if (norm(programme.title).includes(q)) out.push({ channel, programme })
      if (out.length >= limit) return out.sort((a, b) => a.programme.start - b.programme.start)
    }
  }
  return out.sort((a, b) => a.programme.start - b.programme.start)
}

export function suggestions(query: string, channels: M3uChannel[], programmeTitles: string[], limit = 6): string[] {
  const q = norm(query)
  if (!q) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const text of [...channels.map((c) => c.name), ...programmeTitles]) {
    const key = norm(text)
    if (!key.startsWith(q) || seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}
```

- [ ] **Step 6: Kör testen** → PASS. Justera `searchChannels`-testet om ordningen mellan `SKY SPORTS MAIN` (innehåller) och `Sportsnet 360` (prefix) blir fel: prefix ska komma först.

- [ ] **Step 7: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-zap.ts plugins/live-tv/runtime/tv/tv-zap.test.ts plugins/live-tv/runtime/tv/tv-schedule-window.ts plugins/live-tv/runtime/tv/tv-schedule-window.test.ts plugins/live-tv/runtime/tv/tv-search-logic.ts plugins/live-tv/runtime/tv/tv-search-logic.test.ts
git commit -m "live-tv: ren logik för zapp, tablåfönster och sök"
```

---

### Task 5: TV-byggstenar (`tv-ui.tsx`)

**Files:**
- Create: `runtime/tv/tv-ui.tsx`
- Test: `runtime/tv/tv-ui.test.tsx`

**Interfaces:**
- Produces:
  - `dp(n: number): number`
  - `TV` token-objekt: `bg '#000'`, `text '#f3f4f8'`, `muted 'rgba(243,244,248,.7)'`, `dim '.55'`, `faint '.4'`, `s05 … s16` ytor (`rgba(252,252,255,.05)` … `.16`), `line 'rgba(255,255,255,.08)'`, `lineCard 'rgba(255,255,255,.10)'`, `acc 'rgb(var(--accent-500))'`, `accText '#ffd9c9'`, `live '#fb7185'`, `liveSoft 'rgba(251,113,133,.22)'`, `liveText '#fecdd3'`, `glass 'rgba(58,59,66,.96)'`, `panel 'rgba(20,22,30,.98)'`, `scrim 'rgba(0,0,0,.6)'`, `font "'Avenir Next', 'Trebuchet MS', sans-serif"`.
  - `TvFocusStyle()` – `<style>` med fokusring och `lumio-livetv-fade`-keyframe, scopad till `[data-live-tv-tv-root]`.
  - `station(onOk: () => void, onHold?: (el: HTMLElement) => void, extra?: Record<string, string>): StationProps` – `{ 'data-f': '', tabIndex: 0, role: 'button', onClick, onKeyDown, onKeyUp, ...extra }`.
  - `Tag({ variant: 'live' | 'neutral' | 'replay' | 'reason' | 'audio', children })`
  - `Progress({ value: 0..1, height?: number, track?: string })`
  - `ChannelArt({ channel, frameVersion?, height?, rounded?, children? })` – bildruta → logotyp → initialer, med overlay-barn.
  - `Chip({ active, children, ...station })`, `Segment({ options: {key,label}[], value, onChange })`, `RoundBtn({ size, children, ...station })`, `Toggle({ on })`
  - `Icons` – `Search, Home, Tv, SquaresFour, Heart(filled), Gear, ChevronLeft, ChevronDown, Play, Bell(filled), Lock, Plus, Dots, Pause`.
  - `useTvClockNode(): ReactNode` – värdens `getTvClock()` om finns, annars lokal klocka `HH:MM | DD MMM | DAY`.
  - `useAccent(): { acc: string }` (alltid `TV.acc`).

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChannelArt, Progress, Tag, dp, station } from './tv-ui'

afterEach(cleanup)

describe('tv-ui', () => {
  it('dp delar med 1,54 och rundar', () => {
    expect(dp(22)).toBe(14)
    expect(dp(52)).toBe(34)
    expect(dp(104)).toBe(68)
  })
  it('station ger en fokusstation som kör onOk på klick', () => {
    const ok = vi.fn()
    render(<div {...station(ok)}>x</div>)
    const el = screen.getByRole('button')
    expect(el).toHaveAttribute('data-f')
    expect(el).toHaveAttribute('tabindex', '0')
    fireEvent.click(el)
    expect(ok).toHaveBeenCalledTimes(1)
  })
  it('Tag live har punkt och versaler', () => {
    render(<Tag variant="live">LIVE</Tag>)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })
  it('Progress klipper värdet till 0..1', () => {
    const { container } = render(<Progress value={1.5} />)
    const fill = container.querelectorAll ? null : container.querySelector('[data-fill]') as HTMLElement
    expect((container.querySelector('[data-fill]') as HTMLElement).style.width).toBe('100%')
  })
  it('ChannelArt visar initialer utan logotyp och bildruta', () => {
    render(<ChannelArt channel={{ name: 'Sky Sports', logo: null }} />)
    expect(screen.getByText('SS')).toBeInTheDocument()
  })
})
```

(Ta bort den felaktiga raden `const fill = …` när du skriver testet; behåll bara `expect`-raden.)

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-ui.tsx`**

```tsx
'use client'

import { createElement, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import { tvHoldHandlers } from '@/lib/plugin-sdk'
import { getLiveTvLogoSrc, type M3uChannel } from '../live-tv-data'
import { LiveTvLogoImage } from '../live-tv-logo-image'
import { initialsOf } from '../live-tv-ui'

/** Designpx (1920-scen) → pluginpx. Pluginet skalas redan med --tv-base-scale 1.54. */
export function dp(n: number): number {
  return Math.round(n / 1.54)
}

export const TV = {
  bg: '#000',
  text: '#f3f4f8',
  muted: 'rgba(243,244,248,0.7)',
  dim: 'rgba(243,244,248,0.55)',
  faint: 'rgba(243,244,248,0.4)',
  s05: 'rgba(252,252,255,0.05)',
  s06: 'rgba(252,252,255,0.06)',
  s07: 'rgba(252,252,255,0.07)',
  s08: 'rgba(252,252,255,0.08)',
  s10: 'rgba(252,252,255,0.10)',
  s12: 'rgba(252,252,255,0.12)',
  s14: 'rgba(252,252,255,0.14)',
  s16: 'rgba(252,252,255,0.16)',
  s18: 'rgba(252,252,255,0.18)',
  line: 'rgba(255,255,255,0.08)',
  lineCard: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.22)',
  acc: 'rgb(var(--accent-500))',
  accMix: (pct: number) => `color-mix(in srgb, rgb(var(--accent-500)) ${pct}%, transparent)`,
  accText: '#ffd9c9',
  onAcc: '#fff',
  live: '#fb7185',
  liveSoft: 'rgba(251,113,133,0.22)',
  liveText: '#fecdd3',
  glass: 'rgba(58,59,66,0.96)',
  panel: 'rgba(20,22,30,0.98)',
  scrim: 'rgba(0,0,0,0.6)',
  font: "'Avenir Next', 'Trebuchet MS', sans-serif",
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const

export const cardStyle: CSSProperties = {
  background: TV.s07,
  border: `1px solid ${TV.lineCard}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
  borderRadius: dp(14),
  overflow: 'hidden',
}

/**
 * Fokusring 2 px accent + glöd inom Live TV (handoffen), ovanpå värdens
 * 1 px-regel för pluginsidor. Scopad till pluginroten så inget annat påverkas.
 * Egen keyframe: pluginets buntar får inga klasser ur appens Tailwind.
 */
export function TvFocusStyle() {
  return (
    <style>{`
[data-live-tv-tv-root] [data-f]:focus,
[data-live-tv-tv-root] [data-f][data-fcur="1"] {
  outline: 2px solid rgb(var(--accent-500)) !important;
  outline-offset: 3px;
  box-shadow: 0 0 28px color-mix(in srgb, rgb(var(--accent-500)) 45%, transparent) !important;
}
[data-live-tv-tv-root] [data-f] { outline: none; }
[data-live-tv-tv-root] [data-live-tv-menu-item][data-f]:focus,
[data-live-tv-tv-root] [data-live-tv-menu-item][data-f][data-fcur="1"] { outline-offset: -4px; border-radius: ${dp(12)}px; }
[data-live-tv-tv-root] [data-scroll]::-webkit-scrollbar, [data-live-tv-tv-root] [data-row]::-webkit-scrollbar { display: none; }
@keyframes lumio-livetv-fade { from { opacity: 0; transform: translateY(${dp(6)}px); } to { opacity: 1; transform: none; } }
[data-live-tv-tv-root] [data-live-tv-layer] { animation: lumio-livetv-fade 160ms ease-out; }
`}</style>
  )
}

export type StationProps = Record<string, unknown>

/** EN station: OK = onOk, håll OK = onHold (glasmeny). Klick med mus = onOk. */
export function station(onOk: () => void, onHold?: (element: HTMLElement) => void, extra?: Record<string, string>): StationProps {
  const hold = onHold ? tvHoldHandlers(onOk, onHold) : null
  return {
    'data-f': '',
    tabIndex: 0,
    role: 'button',
    onClick: onOk,
    ...(hold
      ? { onKeyDown: hold.onKeyDown, onKeyUp: hold.onKeyUp }
      : {
          onKeyDown: (event: { key: string; preventDefault(): void }) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOk()
            }
          },
        }),
    ...(extra ?? {}),
  }
}

export function Tag({ variant, children, style }: { variant: 'live' | 'neutral' | 'replay' | 'reason' | 'audio' | 'quality'; children: ReactNode; style?: CSSProperties }) {
  const base: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: dp(8), whiteSpace: 'nowrap', lineHeight: 1.2 }
  const look: Record<typeof variant, CSSProperties> = {
    live: { fontSize: dp(13), fontWeight: 600, letterSpacing: '0.14em', padding: `${dp(5)}px ${dp(12)}px`, borderRadius: dp(8), background: TV.liveSoft, color: TV.liveText, textTransform: 'uppercase' },
    neutral: { fontSize: dp(15), padding: `${dp(3)}px ${dp(12)}px`, borderRadius: dp(8), background: TV.s12, color: TV.text },
    quality: { fontSize: dp(15), padding: `${dp(3)}px ${dp(12)}px`, borderRadius: dp(8), background: 'rgba(0,0,0,0.45)', color: TV.text },
    replay: { fontSize: dp(13), letterSpacing: '0.08em', padding: `${dp(4)}px ${dp(10)}px`, borderRadius: dp(6), background: TV.accMix(22), color: TV.accText },
    reason: { fontSize: dp(13), letterSpacing: '0.08em', padding: `${dp(4)}px ${dp(10)}px`, borderRadius: dp(6), background: 'rgba(0,0,0,0.45)', color: TV.text },
    audio: { fontSize: dp(13), fontWeight: 600, letterSpacing: '0.12em', padding: `${dp(4)}px ${dp(10)}px`, borderRadius: dp(6), background: TV.acc, color: TV.onAcc, textTransform: 'uppercase' },
  }
  return (
    <span style={{ ...base, ...look[variant], ...style }}>
      {variant === 'live' ? <span style={{ width: dp(8), height: dp(8), borderRadius: 999, background: TV.live }} /> : null}
      {children}
    </span>
  )
}

export function Progress({ value, height = dp(5), track = TV.s14, style }: { value: number; height?: number; track?: string; style?: CSSProperties }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div style={{ height, borderRadius: height, background: track, overflow: 'hidden', ...style }}>
      <div data-fill="" style={{ width: `${pct}%`, height: '100%', background: TV.acc }} />
    </div>
  )
}

/**
 * Kanalbild: sparad bildruta (playerFrameUrl) → logotyp → initialer. Barnen
 * ritas ovanpå (taggar, text, gradient).
 */
export function ChannelArt({ channel, frameVersion, height, aspect, radius, children, style }: {
  channel: Pick<M3uChannel, 'name' | 'logo' | 'url'> | Pick<M3uChannel, 'name' | 'logo'>
  frameVersion?: number | string | null
  height?: number
  aspect?: string
  radius?: number
  children?: ReactNode
  style?: CSSProperties
}) {
  const [frameFailed, setFrameFailed] = useState(false)
  const key = 'url' in channel ? `${channel.name}|${channel.url}` : channel.name
  const frameSrc = frameFailed ? null : sdk.playerFrameUrl(key, frameVersion ?? null)
  const logo = getLiveTvLogoSrc(channel.logo)
  return (
    <div style={{ position: 'relative', height, aspectRatio: aspect, background: 'rgba(252,252,255,0.06)', borderRadius: radius, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {frameSrc ? (
        <img src={frameSrc} alt="" onError={() => setFrameFailed(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : logo ? (
        <LiveTvLogoImage src={logo} alt="" style={{ maxWidth: '60%', maxHeight: '60%', objectFit: 'contain' }} />
      ) : (
        <span style={{ fontSize: dp(22), fontWeight: 600, color: TV.dim, letterSpacing: '0.04em' }}>{initialsOf(channel.name)}</span>
      )}
      {children}
    </div>
  )
}

export function Chip({ active, children, ...rest }: { active: boolean; children: ReactNode } & StationProps) {
  return (
    <div
      {...rest}
      style={{ height: dp(46), padding: `0 ${dp(22)}px`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', fontSize: dp(19), whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, background: active ? TV.s16 : TV.s05, color: active ? TV.text : TV.muted, fontWeight: active ? 600 : 400, border: `1px solid ${active ? TV.lineStrong : 'transparent'}` }}
    >
      {children}
    </div>
  )
}

export function Segment<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (key: K) => void }) {
  return (
    <div style={{ display: 'inline-flex', padding: dp(4), borderRadius: 999, background: TV.s08, gap: dp(2) }}>
      {options.map((option) => (
        <div
          key={option.key}
          {...station(() => onChange(option.key))}
          style={{ height: dp(38), padding: `0 ${dp(18)}px`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', fontSize: dp(16), cursor: 'pointer', background: option.key === value ? TV.s16 : 'transparent', color: option.key === value ? TV.text : TV.muted }}
        >
          {option.label}
        </div>
      ))}
    </div>
  )
}

export function RoundBtn({ size = dp(52), children, background = TV.s12, ...rest }: { size?: number; children: ReactNode; background?: string } & StationProps) {
  return (
    <div {...rest} style={{ width: size, height: size, borderRadius: 999, background, border: `1px solid ${TV.lineCard}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: TV.text, cursor: 'pointer', flexShrink: 0 }}>
      {children}
    </div>
  )
}

export function Toggle({ on }: { on: boolean }) {
  return (
    <span style={{ width: dp(52), height: dp(30), borderRadius: 999, background: on ? TV.acc : TV.s18, position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: dp(3), left: on ? dp(25) : dp(3), width: dp(24), height: dp(24), borderRadius: 999, background: '#fff', transition: 'left 120ms' }} />
    </span>
  )
}

/* Phosphor-liknande ikoner, 24-rutnät, stroke 1.8 */
type IconProps = { size?: number; filled?: boolean }
const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const svg = (size: number, children: ReactNode, fill?: boolean) => createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', ...sw, fill: fill ? 'currentColor' : 'none' }, children)
export const Icons = {
  Search: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  Home: ({ size = dp(26) }: IconProps) => svg(size, <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></>),
  Tv: ({ size = dp(26) }: IconProps) => svg(size, <><rect x="3" y="5" width="18" height="13" rx="2" /><path d="M8 21h8" /></>),
  SquaresFour: ({ size = dp(26) }: IconProps) => svg(size, <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>),
  Heart: ({ size = dp(26), filled = false }: IconProps) => svg(size, <path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" />, filled),
  Gear: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  ChevronLeft: ({ size = dp(24) }: IconProps) => svg(size, <path d="M15 18l-6-6 6-6" />),
  ChevronDown: ({ size = dp(20) }: IconProps) => svg(size, <path d="m6 9 6 6 6-6" />),
  Play: ({ size = dp(24) }: IconProps) => svg(size, <path d="M8 5v14l11-7z" />, true),
  Pause: ({ size = dp(24) }: IconProps) => svg(size, <path d="M7 5h4v14H7zM13 5h4v14h-4z" />, true),
  Bell: ({ size = dp(20), filled = false }: IconProps) => svg(size, <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>, filled),
  Lock: ({ size = dp(18) }: IconProps) => svg(size, <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  Plus: ({ size = dp(40) }: IconProps) => svg(size, <path d="M12 5v14M5 12h14" />),
  Dots: ({ size = dp(24) }: IconProps) => svg(size, <><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>, true),
  Calendar: ({ size = dp(20) }: IconProps) => svg(size, <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>),
}

/** Värdens klocka när SDK:t har den, annars enkel lokal klocka. */
export function useTvClockNode(locale: string): ReactNode {
  const HostClock = (sdk as unknown as { getTvClock?: () => React.ComponentType<{ variant?: 'tv' | 'desktop' }> | null }).getTvClock?.() ?? null
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (HostClock) return
    let timer = 0
    const tick = () => {
      const next = new Date()
      setNow(next)
      timer = window.setTimeout(tick, 60_000 - (next.getSeconds() * 1000 + next.getMilliseconds()))
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [HostClock])
  if (HostClock) return <HostClock variant="desktop" />
  const time = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase()
  const day = now.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').toUpperCase()
  return <span style={{ fontSize: dp(17), letterSpacing: '0.1em', color: 'rgba(243,244,248,0.65)', whiteSpace: 'nowrap' }}>{`${time} | ${date} | ${day}`}</span>
}
```

Kontrollera `LiveTvLogoImage`-propsen i `runtime/live-tv-logo-image.tsx` (`src`, `alt`, `style`/`className`) och anpassa anropet. `channelKey` i `ChannelArt`: importera `channelKey` från `../live-tv-data` och använd den när `url` finns, i stället för den hopklistrade strängen.

- [ ] **Step 4: Kör testet** → PASS. Typkontroll `npx tsc --noEmit -p tsconfig.json` → inga fel (lägg `import type React from 'react'` om `React.ComponentType` inte hittas, eller använd `ComponentType` från react).

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-ui.tsx plugins/live-tv/runtime/tv/tv-ui.test.tsx
git commit -m "live-tv: TV-byggstenar – token, stationer, taggar, kort, ikoner, klocka"
```

---

### Task 6: Ytgränssnitt (`video-surface.ts`)

**Files:**
- Create: `runtime/tv/video-surface.ts`
- Test: `runtime/tv/video-surface.test.tsx`

**Interfaces:**
- Produces:

```ts
export interface SurfaceSource { channel: M3uChannel; url: string }
export interface VideoSurfaceOptions { muted: boolean; audio?: boolean; enabled?: boolean }
export interface VideoSurfaceHandle { ready: boolean; failed: boolean; live: boolean; frameUrl: string | null }
export function useVideoSurface(rectRef: RefObject<HTMLElement | null>, source: SurfaceSource | null, options: VideoSurfaceOptions): VideoSurfaceHandle
export function videoSurfaceCapabilities(): { maxLive: number; engine: 'mpv' | 'droid' | 'html' | 'host' }
export function releaseAllSurfaces(): Promise<void>   // spelaren anropar före öppning
```

Beteende v1 (utan appens fler-yte-API):
- Om `sdk.createVideoSurface` finns (`typeof === 'function'`): engine `host`, `maxLive` = `sdk.getVideoSurfaceCapabilities().maxSurfaces - 1` (yta 0 är appens spelare). Varje hook-instans skapar en yta via `createVideoSurface()`, öppnar `source.url`, sätter bounds från `rectRef` (ResizeObserver + scroll/resize-lyssnare, `getBoundingClientRect`), `setMuted(options.muted)`, stänger vid unmount/source-byte.
- Annars: `maxLive = 1`. En modul-global `nativeOwner: symbol | null`. Första hook-instansen med `enabled !== false` och `source` tar ägarskapet; den öppnar via `openMpvPlayer` (`isDesktopTauriEnv`), `openNativePlayer` (`isAndroidTauriEnv`) eller ett `<video muted playsInline>` i en fixed portal (`document.body`, `pointerEvents: none`, `zIndex 5`) med hls.js via `getHls()` och `hostProxyUrl(location.origin, url)`. Tystning: mpv `mpvSetPropertyStrings([{ name: 'mute', value: muted ? 'yes' : 'no' }])`; droid: ingen mute-funktion i SDK → låt ljudet vara på bara när `options.audio` är sant, annars öppna inte (visa bildruta). HTML: `video.muted`.
- Bounds: `mpvSetBounds(rect)` / `nativeSetBounds(rect)` / `video.style.left/top/width/height`.
- Icke-ägare: `live: false`, `frameUrl: playerFrameUrl(channelKey(channel))`.
- `ready` blir sant 800 ms efter open utan fel (v1 saknar händelser från motorn utanför spelaren) för mpv/droid; för HTML vid `canplay`. `failed` vid `error`-event (HTML) eller kastat open-fel.
- `releaseAllSurfaces()` stänger ägarens ström och nollställer ägarskapet. Spelaren (Task 16) anropar den innan sin egen open.

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { surfaceCalls } from '@/lib/plugin-sdk'
import { useVideoSurface, videoSurfaceCapabilities, type VideoSurfaceHandle } from './video-surface'

const ch = { name: 'A', group: '', url: 'http://x/a.m3u8', tvgId: null, logo: null }

function Probe({ audio, onHandle }: { audio: boolean; onHandle: (h: VideoSurfaceHandle) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const handle = useVideoSurface(ref, { channel: ch, url: ch.url }, { muted: !audio, audio })
  onHandle(handle)
  return <div ref={ref} style={{ width: 100, height: 56 }} />
}

afterEach(cleanup)
beforeEach(() => { surfaceCalls.length = 0 })

describe('useVideoSurface v1 (HTML-motor i test)', () => {
  it('rapporterar en levande yta', () => {
    expect(videoSurfaceCapabilities()).toEqual({ maxLive: 1, engine: 'html' })
  })
  it('första instansen blir levande, andra får bildruta', async () => {
    let first: VideoSurfaceHandle | null = null
    let second: VideoSurfaceHandle | null = null
    render(<><Probe audio onHandle={(h) => { first = h }} /><Probe audio={false} onHandle={(h) => { second = h }} /></>)
    await waitFor(() => expect(first?.live).toBe(true))
    expect(second?.live).toBe(false)
    expect(second?.frameUrl).toContain('/api/player-frame')
    expect(document.querySelector('video')).not.toBeNull()
  })
  it('städar videon vid unmount', async () => {
    const view = render(<Probe audio onHandle={() => {}} />)
    await waitFor(() => expect(document.querySelector('video')).not.toBeNull())
    view.unmount()
    expect(document.querySelector('video')).toBeNull()
  })
})
```

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `video-surface.ts`**

```ts
'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import {
  closeMpvPlayer,
  closeNativePlayer,
  getHls,
  isAndroidTauriEnv,
  isDesktopTauriEnv,
  mpvSetBounds,
  mpvSetPropertyStrings,
  nativeSetBounds,
  openMpvPlayer,
  openNativePlayer,
  playerFrameUrl,
} from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { HOST_PROXY_MIME, hostProxyUrl } from '../live-tv-playback-fallback'

export interface SurfaceSource { channel: M3uChannel; url: string }
export interface VideoSurfaceOptions { muted: boolean; audio?: boolean; enabled?: boolean }
export interface VideoSurfaceHandle { ready: boolean; failed: boolean; live: boolean; frameUrl: string | null }

type Rect = { left: number; top: number; width: number; height: number }

interface HostSurface {
  open(opts: { url: string; muted: boolean; mimeType?: string }): Promise<void>
  close(): Promise<void>
  setBounds(rect: Rect): void
  setMuted(muted: boolean): Promise<void>
  onState(listener: (s: { firstFrameRendered: boolean; loadFailed: boolean }) => void): () => void
  destroy(): Promise<void>
}
type HostApi = {
  createVideoSurface?: () => HostSurface | null
  getVideoSurfaceCapabilities?: () => { maxSurfaces: number }
}
const host = sdk as unknown as HostApi

export function videoSurfaceCapabilities(): { maxLive: number; engine: 'mpv' | 'droid' | 'html' | 'host' } {
  if (typeof host.createVideoSurface === 'function' && typeof host.getVideoSurfaceCapabilities === 'function') {
    return { maxLive: Math.max(0, host.getVideoSurfaceCapabilities().maxSurfaces - 1), engine: 'host' }
  }
  return { maxLive: 1, engine: isDesktopTauriEnv ? 'mpv' : isAndroidTauriEnv ? 'droid' : 'html' }
}

/* ---------- v1: en enda nativ yta ---------- */

let owner: symbol | null = null
let ownerClose: (() => Promise<void>) | null = null
const waiters = new Set<() => void>()

function notifyWaiters() {
  for (const w of waiters) w()
}

export async function releaseAllSurfaces(): Promise<void> {
  const close = ownerClose
  owner = null
  ownerClose = null
  if (close) await close().catch(() => {})
  notifyWaiters()
}

function measure(el: HTMLElement | null): Rect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return null
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

function isHls(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || !/\.[a-z0-9]{2,4}(\?|$)/i.test(url)
}

/** HTML-motor: ett <video> i en fixed portal, positionerat efter rektangeln. */
function createHtmlSession(url: string, muted: boolean, onReady: () => void, onFail: () => void) {
  const video = document.createElement('video')
  video.muted = muted
  video.autoplay = true
  video.playsInline = true
  video.style.cssText = 'position:fixed;object-fit:cover;background:#000;pointer-events:none;z-index:5;border-radius:inherit'
  video.dataset.liveTvSurface = ''
  video.addEventListener('canplay', onReady, { once: true })
  video.addEventListener('error', onFail, { once: true })
  document.body.appendChild(video)
  const src = hostProxyUrl(window.location.origin, url)
  const Hls = getHls()
  let hls: { destroy(): void } | null = null
  if (isHls(url) && Hls && (Hls as unknown as { isSupported(): boolean }).isSupported()) {
    const instance = new (Hls as unknown as new () => { loadSource(u: string): void; attachMedia(v: HTMLVideoElement): void; destroy(): void })()
    instance.loadSource(src)
    instance.attachMedia(video)
    hls = instance
  } else {
    video.src = src
  }
  void video.play().catch(() => {})
  return {
    setBounds(rect: Rect) {
      video.style.left = `${rect.left}px`
      video.style.top = `${rect.top}px`
      video.style.width = `${rect.width}px`
      video.style.height = `${rect.height}px`
    },
    setMuted(m: boolean) { video.muted = m },
    async close() {
      hls?.destroy()
      video.pause()
      video.removeAttribute('src')
      video.remove()
    },
  }
}

export function useVideoSurface(rectRef: RefObject<HTMLElement | null>, source: SurfaceSource | null, options: VideoSurfaceOptions): VideoSurfaceHandle {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [live, setLive] = useState(false)
  const idRef = useRef<symbol>(Symbol('surface'))
  const enabled = options.enabled !== false && source !== null
  const url = source?.url ?? null
  const muted = options.muted
  const audio = options.audio === true
  const frameUrl = source ? playerFrameUrl(channelKey(source.channel)) : null

  useEffect(() => {
    if (!enabled || !url) {
      setLive(false)
      setReady(false)
      return
    }
    const caps = videoSurfaceCapabilities()
    let cancelled = false
    let setBounds: ((rect: Rect) => void) | null = null
    let closeSession: (() => Promise<void>) | null = null
    let readyTimer = 0
    const markReady = () => { if (!cancelled) setReady(true) }
    const markFailed = () => { if (!cancelled) { setFailed(true); setReady(false) } }

    const start = async () => {
      setFailed(false)
      setReady(false)
      if (caps.engine === 'host' && host.createVideoSurface) {
        const surface = host.createVideoSurface()
        if (!surface) { setLive(false); return }
        const off = surface.onState((s) => { if (s.firstFrameRendered) markReady(); if (s.loadFailed) markFailed() })
        setBounds = (rect) => surface.setBounds(rect)
        closeSession = async () => { off(); await surface.destroy() }
        setLive(true)
        await surface.open({ url, muted }).catch(markFailed)
        return
      }
      // v1: en yta. Bara ägaren spelar; ljudrutan har företräde.
      if (owner !== null && owner !== idRef.current) {
        if (!audio) { setLive(false); return }
        await releaseAllSurfaces()
      }
      if (cancelled) return
      owner = idRef.current
      setLive(true)
      if (caps.engine === 'mpv') {
        await openMpvPlayer({ url }).catch(markFailed)
        await mpvSetPropertyStrings([{ name: 'mute', value: muted ? 'yes' : 'no' }]).catch(() => {})
        setBounds = (rect) => mpvSetBounds(rect)
        closeSession = () => closeMpvPlayer()
        readyTimer = window.setTimeout(markReady, 800)
      } else if (caps.engine === 'droid') {
        if (muted) { setLive(false); owner = null; return }
        await openNativePlayer({ url, mimeType: isHls(url) ? HOST_PROXY_MIME : undefined }).catch(markFailed)
        setBounds = (rect) => nativeSetBounds(rect)
        closeSession = () => closeNativePlayer()
        readyTimer = window.setTimeout(markReady, 800)
      } else {
        const session = createHtmlSession(url, muted, markReady, markFailed)
        setBounds = (rect) => session.setBounds(rect)
        closeSession = () => session.close()
      }
      ownerClose = async () => { await closeSession?.() }
      const rect = measure(rectRef.current)
      if (rect) setBounds(rect)
    }
    void start()

    const sync = () => {
      const rect = measure(rectRef.current)
      if (rect && setBounds) setBounds(rect)
    }
    const observer = typeof ResizeObserver !== 'undefined' && rectRef.current ? new ResizeObserver(sync) : null
    if (observer && rectRef.current) observer.observe(rectRef.current)
    window.addEventListener('resize', sync)
    document.addEventListener('scroll', sync, true)
    const onReleased = () => { if (owner !== idRef.current) setLive(false) }
    waiters.add(onReleased)

    return () => {
      cancelled = true
      window.clearTimeout(readyTimer)
      observer?.disconnect()
      window.removeEventListener('resize', sync)
      document.removeEventListener('scroll', sync, true)
      waiters.delete(onReleased)
      if (owner === idRef.current) {
        owner = null
        ownerClose = null
        void closeSession?.().catch(() => {})
        notifyWaiters()
      } else {
        void closeSession?.().catch(() => {})
      }
    }
  }, [enabled, url, muted, audio, rectRef])

  return { ready, failed, live, frameUrl }
}
```

Om `HOST_PROXY_MIME`/`hostProxyUrl` inte exporteras som förväntat, kontrollera `runtime/live-tv-playback-fallback.ts` rad 24–29.

- [ ] **Step 4: Kör testet** → PASS. Om happy-dom saknar `ResizeObserver` är koden redan skyddad. Om `video.play()` kastar i happy-dom: fångas.

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/runtime/tv/video-surface.ts plugins/live-tv/runtime/tv/video-surface.test.tsx
git commit -m "live-tv: ytgränssnitt för förhandsvisning och multivy med fallback på en yta"
```

---

### Task 7: Skalet – ikonrad, router, Back-stack, zapp, glasmeny, spelare

**Files:**
- Create: `runtime/tv/tv-shell.tsx`, `runtime/tv/tv-views.ts`, `runtime/tv/tv-player-types.ts`
- Modify: `runtime/index.ts` (funktionen `LiveTvBrowsePage`)
- Test: `runtime/tv/tv-shell.test.tsx`

**Interfaces:**
- Produces (`tv-shell.tsx`):

```ts
export type TvView = 'hub' | 'guide' | 'favs' | 'channel' | 'search' | 'multi' | 'settings'
export interface TvNav {
  view: TvView
  params: Record<string, string>
  go(view: TvView, params?: Record<string, string>): void
  back(): void
  play(request: PlayRequest): void                       // PIN-grind ingår
  openChannel(channel: M3uChannel, programmeStart?: number): void
  openMenu(target: TvGlassMenuTarget): void
  channelMenu(channel: M3uChannel, element: HTMLElement, extra?: TvGlassMenuAction[]): void  // standardposterna
  addToMultiview(channel: M3uChannel): void
  pushLayer(close: () => void): () => void               // lager som Back ska stänga; returnerar avregistrering
  toast(text: string): void
  playerOpen: boolean
}
export interface TvViewProps { model: LiveTvModel; nav: TvNav; params: Record<string, string>; settings: TvSettings }
export function LiveTvTvShell({ params, onNavigate }: BrowsePageProps): JSX.Element
```

- Produces (`tv-views.ts`): `export const TV_VIEWS: Record<TvView, ComponentType<TvViewProps>>` – i denna task pekar alla på `TvViewStub`; Task 8–15 byter en post var.
- Produces (`tv-player-types.ts`):

```ts
export interface LiveTvPlayerTvProps {
  channelNumber: number | null
  quality: string | null
  favourite: boolean
  bannerHideMs: number                 // 0 = aldrig
  neighbours: M3uChannel[]             // guidens ordning (för mini-guide och ChannelUp/Down)
  nowFor: (channel: M3uChannel) => NowNextLater
  nowMs: number
  locale: string
  onToggleFavourite(): void
  onOpenChannelDetails(): void
  onOpenMultiview(): void
  onOpenGuide(): void
  onAddToMultiview(channel: M3uChannel): void
  onSwitchChannel(channel: M3uChannel): void
}
```

- Consumes: `useLiveTvModel` (Task 3), `useTvSettings`, `getMultiviewState/setMultiviewState/addToFirstFree` (Task 2), `createZapBuffer/resolveZap` (Task 4), `TvFocusStyle, station, Icons, TV, dp` (Task 5), `releaseAllSurfaces` (Task 6), `PlayRequest`, `encodeChannelParams`, `LIVE_TV_BROWSE_PAGE_ID` från `../live-tv-shell`, `PinGate` från `../live-tv-ui`, lås-hjälpare från `../channel-locks`, `toggleChannelLock`, `channelSupportsCatchUp`.

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, BROWSE_BACK_EVENT, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel, onClose }: { channel: { name: string }; onClose: () => void }) => <div data-testid="player" data-panel-root="">{channel.name}<button type="button" onClick={onClose}>close</button></div> }))

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
})

function mount(params: Record<string, string> = {}) {
  const onNavigate = vi.fn()
  const view = render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  return { onNavigate, view }
}

describe('LiveTvTvShell', () => {
  it('ritar ikonraden med sex stationer och exakt en data-init', () => {
    mount()
    expect(screen.getAllByTestId(/rail-/)).toHaveLength(6)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('Back på hubben lämnar Live TV', () => {
    mount()
    const fired = vi.fn()
    window.addEventListener(BROWSE_BACK_EVENT, fired)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(fired).toHaveBeenCalledTimes(1)
  })
  it('Back på guiden navigerar till hubben', () => {
    const { onNavigate } = mount({ view: 'guide' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'hub' } })
  })
  it('ikonradens Kanalguide navigerar', () => {
    const { onNavigate } = mount()
    fireEvent.click(screen.getByTestId('rail-guide'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide' } })
  })
  it('nummertangent zappar till listnummer och Back stänger spelaren', async () => {
    vi.useFakeTimers()
    mount()
    fireEvent.keyDown(window, { key: '2' })
    act(() => { vi.advanceTimersByTime(1500) })
    vi.useRealTimers()
    await waitFor(() => expect(screen.getByTestId('player')).toHaveTextContent('B'))
    fireEvent.keyDown(window, { key: 'Backspace' })
    await waitFor(() => expect(screen.queryByTestId('player')).toBeNull())
  })
})
```

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-player-types.ts`**

```ts
import type { M3uChannel } from '../live-tv-data'
import type { NowNextLater } from '../epg/types'

/** Det TV-skalet ger spelaren utöver kanalen: numrering, grannar, menyval. */
export interface LiveTvPlayerTvProps {
  channelNumber: number | null
  quality: string | null
  favourite: boolean
  /** 0 = dölj aldrig. */
  bannerHideMs: number
  neighbours: M3uChannel[]
  nowFor: (channel: M3uChannel) => NowNextLater
  nowMs: number
  locale: string
  onToggleFavourite(): void
  onOpenChannelDetails(): void
  onOpenMultiview(): void
  onOpenGuide(): void
  onAddToMultiview(channel: M3uChannel): void
  onSwitchChannel(channel: M3uChannel): void
}
```

- [ ] **Step 4: Skriv `tv-views.ts`**

```tsx
'use client'

import type { ComponentType } from 'react'
import type { TvView, TvViewProps } from './tv-shell'
import { dp, station, TV } from './tv-ui'
import { useTvText } from './tv-strings'

/** Tillfällig vy tills den riktiga landar (Task 8–15 byter ut en post var). */
export function TvViewStub({ nav }: TvViewProps) {
  const { tt } = useTvText()
  return (
    <div style={{ padding: dp(48), color: TV.text, display: 'flex', flexDirection: 'column', gap: dp(20) }}>
      <div style={{ fontSize: dp(34), fontWeight: 600 }}>{nav.view}</div>
      <div {...station(() => nav.go('hub'), undefined, { 'data-init': '' })} style={{ alignSelf: 'flex-start', padding: `0 ${dp(22)}px`, height: dp(52), borderRadius: 999, background: TV.s12, display: 'inline-flex', alignItems: 'center', fontSize: dp(20) }}>
        {tt('railHome')}
      </div>
    </div>
  )
}

export const TV_VIEWS: Record<TvView, ComponentType<TvViewProps>> = {
  hub: TvViewStub,
  guide: TvViewStub,
  favs: TvViewStub,
  channel: TvViewStub,
  search: TvViewStub,
  multi: TvViewStub,
  settings: TvViewStub,
}
```

- [ ] **Step 5: Skriv `tv-shell.tsx`**

```tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { getTvGlassMenu, requestBrowseBack, type BrowsePageProps, type TvGlassMenuAction, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { qualityFromName, useLiveTvModel, type LiveTvModel } from '../live-tv-model'
import { LIVE_TV_BROWSE_PAGE_ID, encodeChannelParams, type PlayRequest } from '../live-tv-shell'
import { PinGate } from '../live-tv-ui'
import { activeProfileHasPin, isUnlockedThisSession, markUnlockedThisSession, pinSupportAvailable, toggleChannelLock, verifyActiveProfilePin } from '../channel-locks'
import { useTvText } from './tv-strings'
import { TV, TvFocusStyle, dp, station, Icons } from './tv-ui'
import { useTvSettings, type TvSettings } from './tv-settings-store'
import { addToFirstFree, getMultiviewState, setMultiviewState } from './tv-multiview-store'
import { createZapBuffer, resolveZap } from './tv-zap'
import { releaseAllSurfaces } from './video-surface'
import type { LiveTvPlayerTvProps } from './tv-player-types'
import { TV_VIEWS } from './tv-views'

export type TvView = 'hub' | 'guide' | 'favs' | 'channel' | 'search' | 'multi' | 'settings'
const VIEWS: TvView[] = ['hub', 'guide', 'favs', 'channel', 'search', 'multi', 'settings']

export interface TvNav {
  view: TvView
  params: Record<string, string>
  go(view: TvView, params?: Record<string, string>): void
  back(): void
  play(request: PlayRequest): void
  openChannel(channel: M3uChannel, programmeStart?: number): void
  openMenu(target: TvGlassMenuTarget): void
  channelMenu(channel: M3uChannel, element: HTMLElement, extra?: TvGlassMenuAction[]): void
  addToMultiview(channel: M3uChannel): void
  pushLayer(close: () => void): () => void
  toast(text: string): void
  playerOpen: boolean
}

export interface TvViewProps { model: LiveTvModel; nav: TvNav; params: Record<string, string>; settings: TvSettings }

type PlayerComponent = ComponentType<{
  channel: M3uChannel
  onClose: () => void
  listId?: string | null
  epgUrls?: string[]
  onSwitchChannel?: (channel: M3uChannel) => void
  tv?: LiveTvPlayerTvProps
}>

const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])
const ZAP_TIMEOUT_MS = 1500

function viewFromParams(params?: Record<string, string>): TvView {
  const raw = params?.view
  if (raw && (VIEWS as string[]).includes(raw)) return raw as TvView
  if (!raw && params?.url) return 'channel'
  return 'hub'
}

export function LiveTvTvShell({ params, onNavigate }: BrowsePageProps) {
  const { tt, locale } = useTvText()
  const model = useLiveTvModel()
  const settings = useTvSettings()
  const view = viewFromParams(params)
  const viewParams = params ?? {}

  const [Player, setPlayer] = useState<PlayerComponent | null>(null)
  const [active, setActive] = useState<PlayRequest | null>(null)
  const [pending, setPending] = useState<PlayRequest | null>(null)
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const [zapDigits, setZapDigits] = useState('')
  const [toastText, setToastText] = useState<string | null>(null)
  const layersRef = useRef<Array<() => void>>([])
  const TvGlassMenu = getTvGlassMenu()

  useEffect(() => {
    if (!active || Player) return
    let cancelled = false
    void import('../live-tv-player').then((mod) => { if (!cancelled) setPlayer(() => mod.LiveTvPlayer) }).catch(() => { if (!cancelled) setActive(null) })
    return () => { cancelled = true }
  }, [active, Player])

  const go = useCallback((next: TvView, extra: Record<string, string> = {}) => {
    onNavigate({ pageId: LIVE_TV_BROWSE_PAGE_ID, params: { view: next, ...extra } })
  }, [onNavigate])

  const toast = useCallback((text: string) => {
    setToastText(text)
    window.setTimeout(() => setToastText((current) => (current === text ? null : current)), 1800)
  }, [])

  const play = useCallback((request: PlayRequest) => {
    const locked = model.locked.has(channelKey(request.channel))
    if (locked && !isUnlockedThisSession() && pinSupportAvailable() && activeProfileHasPin()) {
      setPending(request)
      return
    }
    void releaseAllSurfaces().finally(() => setActive(request))
  }, [model.locked])

  const openChannel = useCallback((channel: M3uChannel, programmeStart?: number) => {
    go('channel', { ...encodeChannelParams(channel), ...(programmeStart ? { programme: String(programmeStart) } : {}) })
  }, [go])

  const addToMultiview = useCallback((channel: M3uChannel) => {
    setMultiviewState(addToFirstFree(getMultiviewState(), channelKey(channel)))
    toast(tt('addedToMultiview'))
  }, [toast, tt])

  const channelMenu = useCallback((channel: M3uChannel, element: HTMLElement, extra: TvGlassMenuAction[] = []) => {
    const key = channelKey(channel)
    const pinned = model.pinnedSet.has(key)
    const locked = model.locked.has(key)
    setMenu({
      title: channel.name,
      element,
      actions: [
        { key: 'play', label: tt('watchNow'), run: () => play({ channel }) },
        { key: 'pin', label: pinned ? tt('menuRemoveFavourite') : tt('menuAddFavourite'), run: () => model.togglePin(channel) },
        { key: 'info', label: tt('menuChannelDetails'), run: () => openChannel(channel) },
        { key: 'multi', label: tt('menuAddMultiview'), run: () => addToMultiview(channel) },
        ...extra,
        ...(pinSupportAvailable() && activeProfileHasPin()
          ? [{ key: 'lock', label: locked ? tt('menuUnlock') : tt('menuLock'), run: () => { toggleChannelLock(channel) } }]
          : []),
      ],
    })
  }, [model, tt, play, openChannel, addToMultiview])

  const pushLayer = useCallback((close: () => void) => {
    layersRef.current.push(close)
    return () => { layersRef.current = layersRef.current.filter((c) => c !== close) }
  }, [])

  const back = useCallback(() => {
    const top = layersRef.current[layersRef.current.length - 1]
    if (top) { top(); return }
    if (pending) { setPending(null); return }
    if (active) { setActive(null); return }
    if (view === 'channel') { go('guide'); return }
    if (view !== 'hub') { go('hub'); return }
    requestBrowseBack()
  }, [pending, active, view, go])

  // Back i capture-fas. Glasmenyn sköter sin egen Back, därför avstår skalet
  // medan den är öppen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!BACK_KEYS.has(event.key)) return
      if (menu) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      // Värdens egna paneler (TV-tangentbordet) stänger sig själva.
      if (target?.closest?.('[data-live-tv-host-ui]')) return
      event.preventDefault()
      event.stopPropagation()
      back()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [back, menu])

  // Nummertangenter: favoriter 1–N först, sedan listnummer.
  const favourites = model.favouriteChannels
  const channels = model.channels
  const zapRef = useRef<ReturnType<typeof createZapBuffer> | null>(null)
  useEffect(() => {
    const buffer = createZapBuffer({
      timeoutMs: ZAP_TIMEOUT_MS,
      onChange: setZapDigits,
      onCommit: (digits) => {
        const hit = resolveZap(digits, favourites, channels)
        if (hit) play({ channel: hit })
        else toast(tt('zapMiss', { n: digits }))
      },
    })
    zapRef.current = buffer
    return () => { buffer.dispose(); zapRef.current = null }
  }, [favourites, channels, play, toast, tt])
  useEffect(() => {
    if (!settings.numericZap) return
    const onKey = (event: KeyboardEvent) => {
      if (menu || layersRef.current.length > 0) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (target?.closest?.('[data-live-tv-keyboard]')) return
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        zapRef.current?.push(event.key)
      } else if (event.key === 'Enter' && zapDigits) {
        event.preventDefault()
        event.stopPropagation()
        zapRef.current?.commit()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [settings.numericZap, menu, zapDigits])

  // Starta på senaste kanalen: bara när hubben öppnas utan parametrar.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current || !settings.startOnLastChannel || view !== 'hub' || params?.url) return
    const last = model.history[0]
    const channel = last ? model.byUrl.get(last.url) : null
    if (!channel) return
    startedRef.current = true
    play({ channel })
  }, [settings.startOnLastChannel, view, params, model.history, model.byUrl, play])

  const nav: TvNav = useMemo(() => ({
    view, params: viewParams, go, back, play, openChannel, openMenu: setMenu, channelMenu, addToMultiview, pushLayer, toast, playerOpen: active !== null,
  }), [view, viewParams, go, back, play, openChannel, channelMenu, addToMultiview, pushLayer, toast, active])

  const View = TV_VIEWS[view]
  const activeChannel: M3uChannel | null = active
    ? active.url ? { ...active.channel, url: active.url, name: active.label ?? active.channel.name } : active.channel
    : null

  const rail: { key: TvView; label: string; icon: React.ReactNode }[] = [
    { key: 'search', label: tt('railSearch'), icon: <Icons.Search /> },
    { key: 'hub', label: tt('railHome'), icon: <Icons.Home /> },
    { key: 'guide', label: tt('railGuide'), icon: <Icons.Tv /> },
    { key: 'multi', label: tt('railMultiview'), icon: <Icons.SquaresFour /> },
    { key: 'favs', label: tt('railFavourites'), icon: <Icons.Heart /> },
  ]
  const railItem = (item: { key: TvView; label: string; icon: React.ReactNode }, extraStyle?: React.CSSProperties) => {
    const activeItem = item.key === view || (item.key === 'guide' && view === 'channel')
    return (
      <div
        key={item.key}
        {...station(() => go(item.key), undefined, { 'data-testid': `rail-${item.key}`, 'aria-label': item.label, title: item.label })}
        style={{ width: dp(60), height: dp(60), borderRadius: dp(16), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: activeItem ? TV.s14 : 'transparent', color: activeItem ? TV.text : 'rgba(243,244,248,0.55)', ...extraStyle }}
      >
        {item.icon}
      </div>
    )
  }

  const tvPlayerProps: LiveTvPlayerTvProps | undefined = activeChannel
    ? {
        channelNumber: model.channelNumber(activeChannel),
        quality: qualityFromName(activeChannel.name),
        favourite: model.pinnedSet.has(channelKey(activeChannel)),
        bannerHideMs: settings.bannerHideMs,
        neighbours: model.channels,
        nowFor: model.nowFor,
        nowMs: model.nowMs,
        locale,
        onToggleFavourite: () => model.togglePin(activeChannel),
        onOpenChannelDetails: () => { setActive(null); openChannel(activeChannel) },
        onOpenMultiview: () => { setActive(null); go('multi') },
        onOpenGuide: () => { setActive(null); go('guide') },
        onAddToMultiview: addToMultiview,
        onSwitchChannel: (channel) => setActive({ channel }),
      }
    : undefined

  return (
    <div data-live-tv-tv-root="" style={{ display: 'flex', height: '100%', minHeight: 0, background: TV.bg, color: TV.text, fontFamily: TV.font, fontSize: dp(22), lineHeight: 1.3 }}>
      <TvFocusStyle />
      {/* Ikonrad: pluginets egen navigation inne i Live TV. Inte data-col="side" —
          värdens Back-regel hade då flyttat fokus hit i stället för att gå bakåt. */}
      <nav aria-label={tt('liveTv')} style={{ width: dp(104), flexShrink: 0, borderRight: `1px solid ${TV.line}`, background: 'linear-gradient(180deg, rgba(252,252,255,0.05), rgba(252,252,255,0.02))', padding: `${dp(36)}px 0 ${dp(32)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(14) }}>
        <div aria-hidden="true" style={{ width: dp(44), height: dp(44), borderRadius: dp(12), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: dp(22), marginBottom: dp(24) }}>L</div>
        {rail.map((item) => railItem(item))}
        {railItem({ key: 'settings', label: tt('railSettings'), icon: <Icons.Gear /> }, { marginTop: 'auto' })}
      </nav>
      <main style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <View key={view} model={model} nav={nav} params={viewParams} settings={settings} />
      </main>

      {activeChannel && Player ? (
        <Player channel={activeChannel} onClose={() => setActive(null)} listId={model.epgListId} epgUrls={model.epgUrls} onSwitchChannel={(channel) => setActive({ channel })} tv={tvPlayerProps} />
      ) : null}
      <PinGate
        open={pending !== null}
        title={tt('enterPin')}
        wrongText={tt('pinWrong')}
        unlockLabel={tt('unlock')}
        cancelLabel={tt('cancel')}
        onVerify={verifyActiveProfilePin}
        onClose={() => setPending(null)}
        onUnlocked={() => { markUnlockedThisSession(); const request = pending; setPending(null); if (request) void releaseAllSurfaces().finally(() => setActive(request)) }}
      />
      {TvGlassMenu && menu ? <TvGlassMenu target={menu} onClose={() => setMenu(null)} /> : null}
      {zapDigits ? (
        <div style={{ position: 'fixed', top: dp(36), right: dp(48), zIndex: 80, padding: `${dp(10)}px ${dp(22)}px`, borderRadius: dp(12), background: TV.glass, fontSize: dp(34), fontWeight: 600, letterSpacing: '0.1em' }}>{zapDigits}</div>
      ) : null}
      {toastText ? (
        <div role="status" data-live-tv-layer="" style={{ position: 'fixed', bottom: dp(40), left: '50%', transform: 'translateX(-50%)', zIndex: 80, padding: `${dp(12)}px ${dp(24)}px`, borderRadius: 999, background: TV.glass, fontSize: dp(19) }}>{toastText}</div>
      ) : null}
    </div>
  )
}
```

Importera `type React` eller byt `React.ReactNode`/`React.CSSProperties` mot `ReactNode`/`CSSProperties` från `react`. Se till att `channel-locks.ts` exporterar `toggleChannelLock` (rad 62) och att `PinGate` finns i `live-tv-ui.tsx` (rad 455).

- [ ] **Step 6: Grena i `runtime/index.ts`**

Ersätt `LiveTvBrowsePage`:

```ts
import { useTvMode } from '@/lib/plugin-sdk'
import { LiveTvTvShell } from './tv/tv-shell'

function LiveTvBrowsePage(props: BrowsePageProps) {
  // TV: eget träd med ikonrad och fjärrstyrda vyer (spec 2026-09-13).
  // Hooken anropas alltid, före grenen.
  const isTv = useTvMode()
  if (isTv) return createElement(LiveTvTvShell, props)
  const { params, onNavigate } = props
  const view = params?.view
  if (view === 'epg') return createElement(LiveTvEpgPage, { onNavigate })
  if (view === 'channel' || (!view && params?.url)) return createElement(LiveTvChannelPage, { params, onNavigate })
  return createElement(LiveTvHub, { onNavigate })
}
```

Behåll kommentaren ovanför funktionen och lägg till en rad om TV-grenen.

- [ ] **Step 7: Kör testet** → PASS. Om `getAllByTestId(/rail-/)` fallerar för att `data-testid` inte passerar genom `station(...)`: `station` sprider `extra` som attribut, så det ska fungera. Om zapp-testet fallerar på fake timers och `import()` av spelaren: mocken är synkron; lägg `await waitFor` innan `advanceTimersByTime` om nödvändigt.

- [ ] **Step 8: Kör hela sviten + typkontroll** → PASS / inga fel. `live-tv-hub.test.tsx` ska fortfarande gå (TV-läge är av som standard i stubben).

- [ ] **Step 9: Commit**

```bash
git add plugins/live-tv/runtime/index.ts plugins/live-tv/runtime/tv/tv-shell.tsx plugins/live-tv/runtime/tv/tv-views.ts plugins/live-tv/runtime/tv/tv-player-types.ts plugins/live-tv/runtime/tv/tv-shell.test.tsx
git commit -m "live-tv: TV-skal med ikonrad, vy-router, Back-stack, zapp och glasmeny"
```

---

### Task 8: Hubben

**Files:**
- Create: `runtime/tv/tv-hub.tsx`, `runtime/tv/tv-spotlight.ts`
- Modify: `runtime/tv/tv-views.ts` (`hub: TvHub`)
- Test: `runtime/tv/tv-spotlight.test.ts`, `runtime/tv/tv-hub.test.tsx`

**Interfaces:**
- Produces (`tv-spotlight.ts`): `pickSpotlight(input: { favourites: M3uChannel[]; recent: M3uChannel[]; channels: M3uChannel[]; nowFor: (c) => NowNextLater; count: number }): { channel: M3uChannel; reason: 'favouriteLive' | 'favourite' | 'recent' | 'onNow' }[]`
- Consumes: Task 3 modell, Task 5 UI, Task 7 `TvViewProps`, `catchUpAcross` (`../catch-up`), `expiresLabel`, `formatClock`/`progressOf` från `../live-tv-ui`, `useEpgLoadStatus` från `../hooks/useEpgLoadStatus` (kontrollera signaturen i filen och använd den som `live-tv-hub.tsx` gör).

Handoffens README, avsnitt "1. Hubb", är normativt för mått. Designpx → `dp()`.

- [ ] **Step 1: Skriv spotlight-testet**

```ts
import { describe, expect, it } from 'vitest'
import { pickSpotlight } from './tv-spotlight'

const ch = (name: string) => ({ name, group: '', url: `http://x/${name}`, tvgId: null })
const now = { title: 'X', start: 0, stop: 1 }
const empty = { now: null, next: null, later: null }

describe('pickSpotlight', () => {
  it('favorit som sänder live först, sedan favoriter, senast sedda, sändande kanaler', () => {
    const favs = [ch('F1'), ch('F2')]
    const recent = [ch('R1')]
    const all = [ch('A'), ch('B')]
    const nowFor = (c: { name: string }) => (c.name === 'F2' || c.name === 'B' ? { now, next: null, later: null } : empty)
    const picks = pickSpotlight({ favourites: favs, recent, channels: all, nowFor, count: 3 })
    expect(picks.map((p) => [p.channel.name, p.reason])).toEqual([['F2', 'favouriteLive'], ['F1', 'favourite'], ['R1', 'recent']])
  })
  it('dubbletter tas bort och antalet begränsas', () => {
    const a = ch('A')
    const picks = pickSpotlight({ favourites: [a], recent: [a], channels: [a, ch('B')], nowFor: () => ({ now, next: null, later: null }), count: 2 })
    expect(picks.map((p) => p.channel.name)).toEqual(['A', 'B'])
  })
})
```

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-spotlight.ts`**

```ts
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { NowNextLater } from '../epg/types'

export type SpotlightReason = 'favouriteLive' | 'favourite' | 'recent' | 'onNow'
export interface SpotlightPick { channel: M3uChannel; reason: SpotlightReason }

/** Samma urvalsregel som dagens hubb: favorit live → favoriter → senast sedda → sänder nu. */
export function pickSpotlight(input: { favourites: M3uChannel[]; recent: M3uChannel[]; channels: M3uChannel[]; nowFor: (c: M3uChannel) => NowNextLater; count: number }): SpotlightPick[] {
  const seen = new Set<string>()
  const out: SpotlightPick[] = []
  const add = (channel: M3uChannel, reason: SpotlightReason) => {
    const key = channelKey(channel)
    if (seen.has(key) || out.length >= input.count) return
    seen.add(key)
    out.push({ channel, reason })
  }
  for (const c of input.favourites) if (input.nowFor(c).now) add(c, 'favouriteLive')
  for (const c of input.favourites) add(c, 'favourite')
  for (const c of input.recent) add(c, 'recent')
  for (const c of input.channels) if (input.nowFor(c).now) add(c, 'onNow')
  return out
}
```

- [ ] **Step 4: Skriv hubb-testet**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', ['A|http://x/A'])
})

describe('TvHub', () => {
  it('visar spellistpill, kategorichips och alla kanaler', () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    expect(screen.getByTestId('playlist-pill')).toHaveTextContent('All playlists')
    expect(screen.getByTestId('all-channels').querySelectorAll('[data-f]').length).toBe(3)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('OK på ett kanalkort spelar kanalen', async () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    fireEvent.click(screen.getByTestId('all-channels').querySelectorAll('[data-f]')[2])
    expect(await screen.findByTestId('player')).toHaveTextContent('C')
  })
  it('kategorichip filtrerar rutnätet', () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    fireEvent.click(screen.getByTestId('chip-News'))
    expect(screen.getByTestId('all-channels').querySelectorAll('[data-f]').length).toBe(1)
  })
  it('spellistmenyn byter källa', () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    fireEvent.click(screen.getByTestId('playlist-pill'))
    fireEvent.click(screen.getByTestId('playlist-l1'))
    expect(screen.getByTestId('playlist-pill')).toHaveTextContent('Xtream')
  })
})
```

Anpassa pin-nyckeln `'A|http://x/A'` till `channelKey`-formatet.

- [ ] **Step 5: Skriv `tv-hub.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { catchUpAcross, type CatchUpItem } from '../catch-up'
import { formatClock, progressOf } from '../live-tv-ui'
import { qualityFromName } from '../live-tv-model'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Chip, Icons, Progress, Tag, TV, cardStyle, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import { pickSpotlight, type SpotlightReason } from './tv-spotlight'

const SPOTLIGHT_COUNT = 3
const ALL_STEP = 36
const MAX_CHIPS = 12

export function TvHub({ model, nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const clock = useTvClockNode(locale)
  const [group, setGroup] = useState<string | null>(null)
  const [visible, setVisible] = useState(ALL_STEP)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const favourites = model.favouriteChannels
  const recent = useMemo(() => model.history.map((h) => model.byUrl.get(h.url)).filter((c): c is M3uChannel => Boolean(c)), [model.history, model.byUrl])
  const spotlight = useMemo(() => pickSpotlight({ favourites, recent, channels: model.channels, nowFor: model.nowFor, count: SPOTLIGHT_COUNT }), [favourites, recent, model.channels, model.nowFor])
  const replays = useMemo(() => catchUpAcross(model.channels, model.cache, model.nameIndex, model.nowMs, 8), [model.channels, model.cache, model.nameIndex, model.nowMs])
  const chips = useMemo(() => model.groups.slice(0, MAX_CHIPS), [model.groups])
  const filtered = useMemo(() => {
    if (group === '__favs') return favourites
    if (group) return model.channels.filter((c) => c.group === group)
    return model.channels
  }, [group, favourites, model.channels])
  const shown = filtered.slice(0, visible)

  // Spellistmenyn är ett lager: Back stänger, fokus tillbaka till pillen.
  useEffect(() => {
    if (!playlistOpen) return
    const close = () => { setPlaylistOpen(false); window.setTimeout(() => pillRef.current?.focus({ preventScroll: true }), 0) }
    const off = nav.pushLayer(close)
    window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
    return off
  }, [playlistOpen, nav])

  const reasonLabel = (reason: SpotlightReason) =>
    reason === 'favouriteLive' ? tt('spotlightFavouriteLive') : reason === 'favourite' ? tt('spotlightFavourite') : reason === 'recent' ? tt('spotlightRecent') : tt('spotlightOnNow')
  const minutesLeft = (stop: number) => tt('minutesLeft', { min: Math.max(0, Math.round((stop - model.nowMs) / 60_000)) })
  const cardStation = (channel: M3uChannel, extra?: Record<string, string>) => station(() => nav.play({ channel }), (el) => nav.channelMenu(channel, el), extra)

  if (model.allChannels.length === 0) {
    return (
      <div style={{ padding: dp(48), display: 'flex', flexDirection: 'column', gap: dp(16) }}>
        <div style={{ fontSize: dp(34), fontWeight: 600 }}>{tt('emptyTitle')}</div>
        <div style={{ fontSize: dp(20), color: TV.muted }}>{tt('emptyBody')}</div>
        <div {...station(() => nav.go('settings'), undefined, { 'data-init': '' })} style={{ alignSelf: 'flex-start', height: dp(52), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', fontSize: dp(19), fontWeight: 600 }}>{tt('openSettings')}</div>
      </div>
    )
  }

  return (
    <div data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `${dp(30)}px ${dp(48)}px ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(22), scrollPaddingTop: dp(120) }}>
      {/* Topprad */}
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(20) }}>
        <div style={{ fontSize: dp(34), fontWeight: 600 }}>{tt('liveTv')}</div>
        <div style={{ position: 'relative' }}>
          <div ref={pillRef} data-testid="playlist-pill" {...station(() => setPlaylistOpen(true))} style={{ height: dp(52), padding: `0 ${dp(22)}px`, borderRadius: 999, background: TV.s12, display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(20), fontWeight: 600, cursor: 'pointer' }}>
            {model.activePlaylistName ?? tt('allPlaylists')} <Icons.ChevronDown />
          </div>
          {playlistOpen ? (
            <div ref={menuRef} role="menu" data-panel-root="" data-scroll="" data-live-tv-layer="" style={{ position: 'absolute', top: `calc(100% + ${dp(8)}px)`, left: 0, zIndex: 60, width: dp(380), padding: dp(8), borderRadius: dp(16), background: 'rgba(58,59,66,0.98)', boxShadow: '0 24px 64px rgba(0,0,0,0.55)', maxHeight: dp(560), overflowY: 'auto' }}>
              {[{ id: null as string | null, name: tt('allPlaylists'), count: model.allChannels.length }, ...model.playlists].map((p) => {
                const active = (model.activePlaylistId ?? null) === p.id
                return (
                  <div key={p.id ?? '__all'} data-testid={`playlist-${p.id ?? 'all'}`} data-live-tv-menu-item="" {...station(() => { model.setActivePlaylist(p.id); setPlaylistOpen(false); setGroup(null); setVisible(ALL_STEP); window.setTimeout(() => pillRef.current?.focus({ preventScroll: true }), 0) }, undefined, active ? { 'data-init': '' } : {})} style={{ height: dp(56), padding: `0 ${dp(16)}px`, borderRadius: dp(12), display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? TV.s12 : 'transparent', cursor: 'pointer' }}>
                    <span style={{ fontSize: dp(19), fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)' }}>{tt('channelsCount', { count: p.count })}</span>
                  </div>
                )
              })}
              <div data-live-tv-menu-item="" {...station(() => { setPlaylistOpen(false); nav.go('settings', { tab: 'playlists' }) })} style={{ height: dp(56), padding: `0 ${dp(16)}px`, display: 'flex', alignItems: 'center', fontSize: dp(17), color: 'rgba(243,244,248,0.65)', borderTop: `1px solid ${TV.line}`, marginTop: dp(4), cursor: 'pointer' }}>{tt('addPlaylist')}</div>
            </div>
          ) : null}
        </div>
        <div {...station(() => nav.go('search'))} style={{ height: dp(52), minWidth: dp(420), padding: `0 ${dp(22)}px`, borderRadius: 999, background: TV.s10, display: 'inline-flex', alignItems: 'center', gap: dp(12), color: 'rgba(243,244,248,0.7)', fontSize: dp(20), cursor: 'pointer' }}>
          <Icons.Search size={dp(20)} /> {tt('searchPlaceholder')}
        </div>
        <div {...station(() => nav.go('guide'))} style={{ height: dp(52), padding: `0 ${dp(22)}px`, borderRadius: 999, border: `1px solid ${TV.lineStrong}`, background: TV.s06, display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(20), cursor: 'pointer' }}>
          <Icons.Calendar /> {tt('railGuide')}
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>{clock}</div>
      </div>

      {/* Spotlight */}
      {spotlight.length > 0 ? (
        <div data-row="" style={{ display: 'grid', gridTemplateColumns: `repeat(${SPOTLIGHT_COUNT}, minmax(0, 1fr))`, gap: dp(20) }}>
          {spotlight.map((pick, index) => {
            const info = model.nowFor(pick.channel)
            const number = model.channelNumber(pick.channel)
            return (
              <div key={channelKey(pick.channel)} {...cardStation(pick.channel, index === 0 ? { 'data-init': '' } : undefined)} style={{ ...cardStyle, borderRadius: dp(18), cursor: 'pointer' }}>
                <ChannelArt channel={pick.channel} height={dp(150)}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75))' }} />
                  <div style={{ position: 'absolute', top: dp(12), right: dp(12) }}><Tag variant="reason">{reasonLabel(pick.reason)}</Tag></div>
                  <div style={{ position: 'absolute', left: dp(16), bottom: dp(12), display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(16), color: 'rgba(243,244,248,0.75)' }}>
                    {info.now ? <Tag variant="live">{tt('live')}</Tag> : null}
                    <span>{number ? `${number} · ` : ''}{pick.channel.name}</span>
                  </div>
                </ChannelArt>
                <div style={{ padding: `${dp(16)}px ${dp(18)}px`, display: 'flex', flexDirection: 'column', gap: dp(8) }}>
                  <div style={{ fontSize: dp(24), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now ? info.now.title : tt('noProgramme')}</div>
                  {info.now ? (
                    <>
                      <div style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.6)' }}>{`${formatClock(info.now.start, locale)}–${formatClock(info.now.stop, locale)} · ${minutesLeft(info.now.stop)}`}</div>
                      <Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} />
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Favoriter */}
      {favourites.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}><span style={{ fontSize: dp(26), fontWeight: 600 }}>{tt('favourites')}</span><span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.5)' }}>{tt('channelsCount', { count: favourites.length })}</span></div>
          <div data-row="" style={{ display: 'flex', gap: dp(14), overflowX: 'auto', paddingBottom: dp(4) }}>
            {favourites.map((channel) => {
              const info = model.nowFor(channel)
              return (
                <div key={channelKey(channel)} {...station(() => nav.openChannel(channel), (el) => nav.channelMenu(channel, el))} style={{ ...cardStyle, background: TV.s08, width: dp(300), height: dp(88), flexShrink: 0, display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(14)}px`, cursor: 'pointer' }}>
                  <ChannelArt channel={channel} style={{ width: dp(76), height: dp(50), flexShrink: 0 }} radius={dp(8)} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                    <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? tt('noProgramme')}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Fortsätt titta */}
      {replays.length > 0 || recent.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}><span style={{ fontSize: dp(26), fontWeight: 600 }}>{tt('continueWatching')}</span><span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.5)' }}>{tt('continueSub')}</span></div>
          <div data-row="" style={{ display: 'flex', gap: dp(14), overflowX: 'auto', paddingBottom: dp(4) }}>
            {replays.map((item: CatchUpItem) => (
              <div key={`${channelKey(item.channel)}:${item.programme.start}`} {...station(() => nav.play({ channel: item.channel, url: item.url, label: item.programme.title }), (el) => nav.channelMenu(item.channel, el))} style={{ ...cardStyle, width: dp(300), flexShrink: 0, cursor: 'pointer' }}>
                <ChannelArt channel={item.channel} height={dp(120)}>
                  <div style={{ position: 'absolute', top: dp(10), right: dp(10) }}><Tag variant="replay">{tt('replay')}</Tag></div>
                  <div style={{ position: 'absolute', left: dp(12), bottom: dp(10), color: TV.text }}><Icons.Play size={dp(28)} /></div>
                </ChannelArt>
                <div style={{ padding: `${dp(12)}px ${dp(14)}px` }}>
                  <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.programme.title}</div>
                  <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)' }}>{`${item.channel.name} · ${formatClock(item.programme.start, locale)} · ${Math.round((item.programme.stop - item.programme.start) / 60_000)} min`}</div>
                </div>
              </div>
            ))}
            {recent.filter((c) => !replays.some((r) => channelKey(r.channel) === channelKey(c))).slice(0, 8).map((channel) => {
              const info = model.nowFor(channel)
              return (
                <div key={`recent:${channelKey(channel)}`} {...cardStation(channel)} style={{ ...cardStyle, width: dp(300), flexShrink: 0, cursor: 'pointer' }}>
                  <ChannelArt channel={channel} height={dp(120)}>
                    <div style={{ position: 'absolute', top: dp(10), right: dp(10) }}><Tag variant="reason">{tt('spotlightRecent')}</Tag></div>
                    <div style={{ position: 'absolute', left: dp(12), bottom: dp(10), color: TV.text }}><Icons.Play size={dp(28)} /></div>
                  </ChannelArt>
                  <div style={{ padding: `${dp(12)}px ${dp(14)}px` }}>
                    <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? channel.name}</div>
                    <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)' }}>{channel.name}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Alla kanaler */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(14) }}>
          <span style={{ fontSize: dp(26), fontWeight: 600 }}>{tt('allChannels')}</span>
          <span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.5)' }}>{tt('allChannelsSub', { playlist: model.activePlaylistName ?? tt('allPlaylists'), count: filtered.length })}</span>
          <div data-row="" style={{ marginLeft: 'auto', display: 'flex', gap: dp(10), overflowX: 'auto', maxWidth: '55%' }}>
            {[{ key: null as string | null, label: tt('allGroups'), id: 'all' }, ...(favourites.length ? [{ key: '__favs', label: tt('favourites'), id: 'favs' }] : []), ...chips.map((g) => ({ key: g, label: g, id: g }))].map((chip) => (
              <Chip key={chip.id} active={group === chip.key} {...station(() => { setGroup(chip.key); setVisible(ALL_STEP) }, undefined, { 'data-testid': `chip-${chip.id}` })} style={{ height: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>
            ))}
          </div>
        </div>
        <div data-testid="all-channels" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: dp(14) }}>
          {shown.map((channel) => {
            const info = model.nowFor(channel)
            const number = model.channelNumber(channel)
            const pinned = model.pinnedSet.has(channelKey(channel))
            return (
              <div key={channelKey(channel)} {...cardStation(channel)} style={{ ...cardStyle, cursor: 'pointer' }}>
                <ChannelArt channel={channel} aspect="16 / 10">
                  <span style={{ position: 'absolute', top: dp(8), left: dp(10), fontSize: dp(13), color: 'rgba(243,244,248,0.55)' }}>{number ?? ''}</span>
                  {pinned ? <span style={{ position: 'absolute', top: dp(8), right: dp(10), color: TV.acc }}><Icons.Heart size={dp(16)} filled /></span> : null}
                  {model.locked.has(channelKey(channel)) ? <span style={{ position: 'absolute', bottom: dp(10), right: dp(10), color: 'rgba(243,244,248,0.55)' }}><Icons.Lock size={dp(16)} /></span> : null}
                  {info.now ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={dp(3)} track="rgba(0,0,0,0.4)" style={{ borderRadius: 0 }} /></div> : null}
                </ChannelArt>
                <div style={{ padding: `${dp(10)}px ${dp(12)}px` }}>
                  <div style={{ fontSize: dp(17), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                  <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? (qualityFromName(channel.name) ?? channel.group)}</div>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length > visible ? (
          <div {...station(() => setVisible((v) => v + ALL_STEP))} style={{ alignSelf: 'center', height: dp(48), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.s10, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer' }}>{tt('showMore')}</div>
        ) : null}
        <div style={{ fontSize: dp(16), color: TV.faint }}>{tt('helpHub')}</div>
      </section>
    </div>
  )
}
```

`Chip` tar `style` – lägg till `style?: CSSProperties` i `Chip`-propsen i `tv-ui.tsx` och sprid den sist. Om `spotlight` är tom (inga kanaler med EPG, inga favoriter, ingen historik) ska första kortet i Alla kanaler få `data-init`: lägg `...(spotlight.length === 0 && index === 0 ? { 'data-init': '' } : {})` på rutnätets kort (kräver `index` i `shown.map`).

- [ ] **Step 6: Registrera vyn** i `tv-views.ts`: `import { TvHub } from './tv-hub'` och `hub: TvHub`.

- [ ] **Step 7: Kör testen** → PASS. Hela sviten + typkontroll → PASS.

- [ ] **Step 8: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-hub.tsx plugins/live-tv/runtime/tv/tv-spotlight.ts plugins/live-tv/runtime/tv/tv-spotlight.test.ts plugins/live-tv/runtime/tv/tv-hub.test.tsx plugins/live-tv/runtime/tv/tv-views.ts plugins/live-tv/runtime/tv/tv-ui.tsx
git commit -m "live-tv: TV-hubb med spellistval, spotlight, favoriter, repriser och kanalrutnät"
```

---

### Task 9: Kanalguiden (Nu/Sen + Tablå) med förhandsvisning

**Files:**
- Create: `runtime/tv/tv-guide.tsx`, `runtime/tv/tv-preview.tsx`, `runtime/tv/tv-guide-shared.tsx`
- Modify: `runtime/tv/tv-views.ts` (`guide: TvGuide`)
- Test: `runtime/tv/tv-guide.test.tsx`

**Interfaces:**
- Produces (`tv-preview.tsx`): `TvPreview({ channel, enabled, width, height, label, onOk, station?: Record<string,string> })` – ruta med `useVideoSurface` (muted, `audio: false`), etikett uppe vänster (12 designpx mono 55 %), LIVE-tagg nere vänster när kanalen har `now`, fallback `ChannelArt`. Rektangeln mäts på rutans egen `div`.
- Produces (`tv-guide-shared.tsx`):
  - `useDebouncedChannel(channel: M3uChannel | null, ms = 300): M3uChannel | null`
  - `useGuideGroups(model, tt): { key: string | null; label: string; id: string }[]` (Alla, Favoriter, spellistans grupper max 12)
  - `filterByGroup(model, group: string | null): M3uChannel[]` (`'__favs'` = favoriter)
  - `ChannelCell({ channel, number, info, pinned, locked, focused, quality })` – kanalstationens inre (nr · logotyp 88×56 · namn + grupp · kvalitet · hjärta · lås).
- Consumes: `scheduleWindow`, `blockGeometry`, `nowLinePct`, `timeTicks` (Task 4), `useGuideMode/setGuideMode`, `useTvSettings` (Task 2), `useVideoSurface` (Task 6), `TvViewProps`.

Handoffens README "2. Kanalguide (standard)" är normativt. Toppband 340 designpx (230 utan förhandsvisning), förhandsvisning 480×270, kanalstation 520×72, rad 86.

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { useLiveTvEpgCache } from '../hooks/useLiveTvEpgCache'
import { LiveTvTvShell } from './tv-shell'

const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = {
  index: { 'a.tv': [
    { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 },
    { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
    { title: 'Later A', start: now + 50 * 60_000, stop: now + 80 * 60_000 },
  ] },
  fetchedAt: now, sources: ['http://x/epg'],
}

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  vi.mocked(useLiveTvEpgCache).mockReturnValue(cache)
})

const mount = () => render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvGuide', () => {
  it('visar Nu/Sen/Senare för kanalen med tablå och tomtext för de utan', () => {
    mount()
    expect(screen.getByText('Now A')).toBeInTheDocument()
    expect(screen.getByText('Next A')).toBeInTheDocument()
    expect(screen.getByText('Later A')).toBeInTheDocument()
    expect(screen.getAllByText('No programme information').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('fokus på en rad uppdaterar toppbandet', () => {
    mount()
    const rows = screen.getAllByTestId('guide-row')
    fireEvent.focus(rows[2])
    expect(screen.getByTestId('guide-headline')).toHaveTextContent('C')
  })
  it('segmentväxeln byter till tablåläge med nu-linje', () => {
    mount()
    fireEvent.click(screen.getByText('Timeline'))
    expect(screen.getByTestId('now-line')).toBeInTheDocument()
    expect(screen.getByText('Now A')).toBeInTheDocument()
  })
  it('OK på raden spelar kanalen', async () => {
    mount()
    fireEvent.click(screen.getAllByTestId('guide-row')[1])
    expect(await screen.findByTestId('player')).toHaveTextContent('B')
  })
})
```

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-guide-shared.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { NowNextLater } from '../epg/types'
import { ChannelArt, Icons, TV, dp } from './tv-ui'
import type { TvStringKey } from './tv-strings'

export function useDebouncedChannel(channel: M3uChannel | null, ms = 300): M3uChannel | null {
  const [value, setValue] = useState(channel)
  useEffect(() => {
    const timer = window.setTimeout(() => setValue(channel), ms)
    return () => window.clearTimeout(timer)
  }, [channel, ms])
  return value
}

export const FAVS_GROUP = '__favs'
const MAX_GROUPS = 12

export function useGuideGroups(model: LiveTvModel, tt: (key: TvStringKey) => string) {
  return useMemo(() => [
    { key: null as string | null, label: tt('allGroups'), id: 'all' },
    ...(model.favouriteChannels.length ? [{ key: FAVS_GROUP, label: tt('favourites'), id: 'favs' }] : []),
    ...model.groups.slice(0, MAX_GROUPS).map((g) => ({ key: g, label: g, id: g })),
  ], [model.favouriteChannels.length, model.groups, tt])
}

export function filterByGroup(model: LiveTvModel, group: string | null): M3uChannel[] {
  if (group === FAVS_GROUP) return model.favouriteChannels
  if (group) return model.channels.filter((c) => c.group === group)
  return model.channels
}

export function ChannelCell({ channel, number, pinned, locked, quality, focused, width = dp(520) }: {
  channel: M3uChannel; number: number | null; pinned: boolean; locked: boolean; quality: string | null; focused: boolean; width?: number
}) {
  return (
    <div style={{ width, height: dp(72), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, background: focused ? TV.s10 : 'transparent', flexShrink: 0 }}>
      <span style={{ width: dp(44), fontSize: dp(18), color: 'rgba(243,244,248,0.5)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{number ?? ''}</span>
      <ChannelArt channel={channel} style={{ width: dp(88), height: dp(56), flexShrink: 0 }} radius={dp(8)} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: dp(21), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
        <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[channel.group, quality].filter(Boolean).join(' · ')}</div>
      </div>
      {pinned ? <span style={{ color: TV.acc }}><Icons.Heart size={dp(18)} filled /></span> : null}
      {locked ? <span style={{ color: 'rgba(243,244,248,0.5)' }}><Icons.Lock size={dp(18)} /></span> : null}
    </div>
  )
}

export function nowNextLabel(info: NowNextLater): ReactNode {
  return info.now ? info.now.title : null
}

export function keyOf(channel: M3uChannel): string {
  return channelKey(channel)
}
```

- [ ] **Step 4: Skriv `tv-preview.tsx`**

```tsx
'use client'

import { useRef } from 'react'
import type { M3uChannel } from '../live-tv-data'
import { ChannelArt, Tag, TV, dp, station } from './tv-ui'
import { useVideoSurface } from './video-surface'

export function TvPreview({ channel, enabled, live, width, height, label, onOk, extra }: {
  channel: M3uChannel | null
  /** Inställningen "förhandsvisning" – av = sparad bildruta. */
  enabled: boolean
  /** Kanalen sänder just nu (LIVE-tagg). */
  live: boolean
  width: number | string
  height: number
  label: string
  onOk: () => void
  extra?: Record<string, string>
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const surface = useVideoSurface(ref, channel && enabled ? { channel, url: channel.url } : null, { muted: true, audio: false, enabled })
  const showsVideo = enabled && surface.live && !surface.failed
  return (
    <div ref={ref} {...station(onOk, undefined, extra)} style={{ width, height, borderRadius: dp(14), border: `1px solid ${TV.lineCard}`, position: 'relative', overflow: 'hidden', background: '#05070d', flexShrink: 0, cursor: 'pointer' }}>
      {channel && !showsVideo ? <ChannelArt channel={channel} style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /> : null}
      <span style={{ position: 'absolute', top: dp(12), left: dp(14), fontFamily: TV.mono, fontSize: dp(12), letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,244,248,0.55)' }}>{label}</span>
      {live ? <span style={{ position: 'absolute', left: dp(14), bottom: dp(12) }}><Tag variant="live">LIVE</Tag></span> : null}
    </div>
  )
}
```

`useVideoSurface` sätter bounds på `ref`-elementet. Videon ligger i en fixed portal ovanpå sidan men under lager (`zIndex 5`); menyer och paneler i skalet har `zIndex ≥ 60`.

- [ ] **Step 5: Skriv `tv-guide.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { qualityFromName } from '../live-tv-model'
import { formatClock, progressOf } from '../live-tv-ui'
import type { TvViewProps } from './tv-shell'
import { Chip, Progress, Segment, Tag, TV, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import { setGuideMode, useGuideMode, type GuideMode } from './tv-settings-store'
import { blockGeometry, nowLinePct, scheduleWindow, timeTicks } from './tv-schedule-window'
import { ChannelCell, filterByGroup, useDebouncedChannel, useGuideGroups } from './tv-guide-shared'
import { TvPreview } from './tv-preview'
import { TvGuidePlaylists } from './tv-guide-playlists'

const ROW_STEP = 40

export function TvGuide(props: TvViewProps) {
  const mode = useGuideMode()
  if (mode === 'playlists') return <TvGuidePlaylists {...props} />
  return <TvGuideStandard {...props} mode={mode} />
}

function TvGuideStandard({ model, nav, params, settings, mode }: TvViewProps & { mode: 'now' | 'tl' }) {
  const { tt, locale } = useTvText()
  const clock = useTvClockNode(locale)
  const groups = useGuideGroups(model, tt)
  const [group, setGroup] = useState<string | null>(params.group === 'all' ? null : params.group ?? null)
  const rows = useMemo(() => filterByGroup(model, group), [model, group])
  const [visible, setVisible] = useState(ROW_STEP)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = useMemo(() => (selectedKey ? model.byKey.get(selectedKey) ?? null : null) ?? rows[0] ?? null, [selectedKey, model.byKey, rows])
  const previewChannel = useDebouncedChannel(selected, 300)
  const listRef = useRef<HTMLDivElement | null>(null)
  const win = useMemo(() => scheduleWindow(model.nowMs), [model.nowMs])

  useEffect(() => { setVisible(ROW_STEP) }, [group, mode])

  const info = selected ? model.nowFor(selected) : { now: null, next: null, later: null }
  const previewOn = settings.previewEnabled
  const headlineSize = previewOn ? dp(40) : dp(34)
  const minutesLeft = (stop: number) => tt('minutesLeft', { min: Math.max(0, Math.round((stop - model.nowMs) / 60_000)) })
  const modeOptions: { key: GuideMode; label: string }[] = [{ key: 'now', label: tt('modeNow') }, { key: 'tl', label: tt('modeTimeline') }, { key: 'playlists', label: tt('modePlaylists') }]

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Toppband */}
      <div style={{ height: previewOn ? dp(340) : dp(230), padding: `${dp(34)}px ${dp(48)}px 0`, display: 'flex', gap: dp(32), flexShrink: 0 }}>
        <TvPreview channel={previewChannel} enabled={previewOn} live={Boolean(info.now)} width={dp(480)} height={dp(270)} label={previewOn ? tt('previewLabel') : tt('previewFrame')} onOk={() => selected && nav.play({ channel: selected })} />
        <div data-testid="guide-headline" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(12), fontSize: dp(18), color: 'rgba(243,244,248,0.65)' }}>
            {selected ? <><span style={{ color: TV.accText, fontWeight: 600 }}>{model.channelNumber(selected) ?? ''}</span><span>{selected.name}</span>{selected.group ? <Tag variant="neutral">{selected.group}</Tag> : null}</> : null}
            <span style={{ marginLeft: 'auto' }}>{clock}</span>
          </div>
          <div style={{ fontSize: headlineSize, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now ? info.now.title : model.cache ? tt('noProgramme') : tt('loadingGuide')}</div>
          {info.now ? (
            <>
              <div style={{ fontSize: dp(19), color: 'rgba(243,244,248,0.65)' }}>{`${formatClock(info.now.start, locale)}–${formatClock(info.now.stop, locale)} · ${minutesLeft(info.now.stop)}`}</div>
              <Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={dp(6)} style={{ maxWidth: dp(720) }} />
              {previewOn && info.now.description ? <div style={{ fontSize: dp(19), color: 'rgba(243,244,248,0.75)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{info.now.description}</div> : null}
            </>
          ) : null}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: dp(12), fontSize: dp(18), color: 'rgba(243,244,248,0.55)' }}>
            {info.next ? <><span style={{ color: TV.accText, fontWeight: 600 }}>{tt('next')}</span><span>{info.next.title} · {formatClock(info.next.start, locale)}</span></> : null}
            <span style={{ marginLeft: 'auto', fontSize: dp(16), color: TV.faint }}>{tt('helpGuide')}</span>
          </div>
        </div>
      </div>

      {/* Kategorirad + segment */}
      <div style={{ padding: `0 ${dp(48)}px ${dp(18)}px`, display: 'flex', alignItems: 'center', gap: dp(16), flexShrink: 0 }}>
        <div data-row="" style={{ display: 'flex', gap: dp(10), overflowX: 'auto', flex: 1, minWidth: 0 }}>
          {groups.map((chip) => (
            <Chip key={chip.id} active={group === chip.key} {...station(() => { setGroup(chip.key); setSelectedKey(null) }, undefined, { 'data-live-tv-chip': chip.id, 'data-testid': `chip-${chip.id}` })}>{chip.label}</Chip>
          ))}
        </div>
        <Segment options={modeOptions} value={mode} onChange={(next) => setGuideMode(next)} />
      </div>

      {/* Kolumnrubriker */}
      <div style={{ padding: `0 ${dp(48)}px`, display: 'flex', gap: dp(16), fontSize: dp(15), letterSpacing: '0.1em', textTransform: 'uppercase', color: TV.faint, flexShrink: 0 }}>
        <div style={{ width: dp(520), flexShrink: 0, padding: `0 ${dp(12)}px` }}>{tt('colChannel')}</div>
        {mode === 'now' ? (
          <><div style={{ flex: 1.2 }}>{tt('colNow')}</div><div style={{ flex: 1 }}>{tt('colNext')}</div><div style={{ flex: 1 }}>{tt('colLater')}</div></>
        ) : (
          <div style={{ flex: 1, position: 'relative', height: dp(20) }}>
            {timeTicks(win).map((tick, i) => <span key={tick} style={{ position: 'absolute', left: `${i * 25}%` }}>{formatClock(tick, locale)}</span>)}
          </div>
        )}
      </div>

      {/* Rader */}
      <div ref={listRef} data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `0 ${dp(48)}px ${dp(24)}px`, position: 'relative' }}>
        {rows.length === 0 ? <div style={{ padding: dp(24), color: TV.dim, fontSize: dp(19) }}>{tt('guideEmpty')}</div> : null}
        {mode === 'tl' && rows.length > 0 ? (
          <div data-testid="now-line" style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${dp(48)}px + ${dp(520)}px + ${dp(16)}px + (100% - ${dp(48) * 2 + dp(520) + dp(16)}px) * ${nowLinePct(model.nowMs, win) / 100})`, width: 2, background: TV.acc, boxShadow: `0 0 12px ${TV.accMix(60)}`, pointerEvents: 'none', zIndex: 2 }} />
        ) : null}
        {rows.slice(0, visible).map((channel, index) => {
          const rowInfo = model.nowFor(channel)
          const key = channelKey(channel)
          const focused = selected ? channelKey(selected) === key : false
          const isInit = selected ? focused : index === 0
          return (
            <div key={key} style={{ height: dp(86), borderBottom: `1px solid rgba(255,255,255,0.07)`, display: 'flex', alignItems: 'center', gap: dp(16) }}>
              <div
                data-testid="guide-row"
                {...station(() => nav.play({ channel }), (el) => nav.channelMenu(channel, el), {
                  ...(isInit ? { 'data-init': '' } : {}),
                  'data-f-left': '[data-live-tv-chip]',
                  'data-f-right': '[data-live-tv-chip]',
                })}
                onFocus={() => setSelectedKey(key)}
                style={{ cursor: 'pointer', borderRadius: dp(12) }}
              >
                <ChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} quality={qualityFromName(channel.name)} focused={focused} />
              </div>
              {mode === 'now' ? (
                <>
                  <div style={{ flex: 1.2, minWidth: 0 }}>
                    <div style={{ fontSize: dp(20), fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: rowInfo.now ? TV.text : TV.dim }}>{rowInfo.now?.title ?? tt('noProgramme')}</div>
                    {rowInfo.now ? <div style={{ display: 'flex', alignItems: 'center', gap: dp(12), marginTop: dp(8) }}><Progress value={progressOf(rowInfo.now.start, rowInfo.now.stop, model.nowMs)} height={dp(4)} style={{ flex: 1 }} /><span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)', whiteSpace: 'nowrap' }}>{Math.max(0, Math.round((rowInfo.now.stop - model.nowMs) / 60_000))} min</span></div> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {rowInfo.next ? <><div style={{ fontSize: dp(19), color: 'rgba(243,244,248,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rowInfo.next.title}</div><div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)' }}>{formatClock(rowInfo.next.start, locale)}</div></> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {rowInfo.later ? <><div style={{ fontSize: dp(19), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rowInfo.later.title}</div><div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.4)' }}>{formatClock(rowInfo.later.start, locale)}</div></> : null}
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, position: 'relative', height: dp(72), minWidth: 0 }}>
                  {model.scheduleFor(channel, win.start, win.end).map((p) => {
                    const g = blockGeometry(p, win)
                    if (!g) return null
                    const onNow = p.start <= model.nowMs && p.stop > model.nowMs
                    return (
                      <div key={p.start} style={{ position: 'absolute', top: 0, bottom: 0, left: `${g.leftPct}%`, width: `calc(${g.widthPct}% - ${dp(6)}px)`, borderRadius: dp(10), padding: `${dp(14)}px ${dp(16)}px`, background: onNow ? TV.accMix(16) : TV.s05, color: onNow ? TV.text : 'rgba(243,244,248,0.7)', overflow: 'hidden' }}>
                        <div style={{ fontSize: dp(18), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                        <div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.45)' }}>{formatClock(p.start, locale)}–{formatClock(p.stop, locale)}</div>
                      </div>
                    )
                  })}
                  {model.scheduleFor(channel, win.start, win.end).length === 0 ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: dp(16), color: TV.dim, fontSize: dp(18) }}>{tt('noProgramme')}</div> : null}
                </div>
              )}
            </div>
          )
        })}
        {rows.length > visible ? (
          <div {...station(() => setVisible((v) => v + ROW_STEP))} style={{ margin: `${dp(20)}px auto 0`, width: 'fit-content', height: dp(48), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.s10, display: 'flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer' }}>{tt('showMore')}</div>
        ) : null}
      </div>
    </div>
  )
}
```

Tablåns nu-linje: den beräknade `left`-strängen är kompakt men riktig; om `calc` med procent av procent inte fungerar i happy-dom saknar det betydelse för testet (testet letar bara efter `data-testid`). I webbläsaren: kontrollera visuellt i Task 17 och justera till att rita linjen inne i varje rads spår i stället om den hamnar snett (samma `nowLinePct`, `position: absolute` per rad).

◂▸ på kanalraden pekar på `[data-live-tv-chip]`: värdens motor tar första synliga träffen, vilket blir det första chippet. Byt kategori direkt vid ◂▸ i stället genom att lägga en `onKeyDown` på raden som fångar `ArrowLeft`/`ArrowRight`, stegar `group` bland `groups` och kallar `event.preventDefault()`; ta då bort `data-f-left/right`. Välj den senare varianten: det är vad handoffen beskriver ("◂ ▸ på en kanalrad byter kategori"). Håll-hanteraren måste ligga kvar: slå ihop `onKeyDown` så att både hållet (Enter/Space) och pilarna hanteras.

- [ ] **Step 6: Skapa en tillfällig `tv-guide-playlists.tsx`** så importen går: exportera `TvGuidePlaylists = TvViewStub`-varianten (kopiera stubben från `tv-views.ts`, döp om). Task 10 ersätter den.

- [ ] **Step 7: Registrera** `guide: TvGuide` i `tv-views.ts`.

- [ ] **Step 8: Kör testen** → PASS. Hela sviten + typkontroll → PASS.

- [ ] **Step 9: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-guide.tsx plugins/live-tv/runtime/tv/tv-guide-shared.tsx plugins/live-tv/runtime/tv/tv-preview.tsx plugins/live-tv/runtime/tv/tv-guide-playlists.tsx plugins/live-tv/runtime/tv/tv-guide.test.tsx plugins/live-tv/runtime/tv/tv-views.ts
git commit -m "live-tv: kanalguide på TV med förhandsvisning, Nu/Sen och tablå"
```

---

### Task 10: Kanalguide · spellistor (trekolumn)

**Files:**
- Modify: `runtime/tv/tv-guide-playlists.tsx` (ersätt stubben)
- Test: `runtime/tv/tv-guide-playlists.test.tsx`

**Interfaces:**
- Consumes: `TvViewProps`, `useGuideGroups`-mönstret (men här per spellista), `TvPreview`, `ChannelCell`, `toggleReminder`/`isReminded` från `../reminders`, `setGuideMode`.

Handoffens README "3. Kanalguide B · spellistor" är normativt: vänster 330, mitten flex, höger 560.

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { useLiveTvEpgCache } from '../hooks/useLiveTvEpgCache'
import { LiveTvTvShell } from './tv-shell'
import { getReminders } from '../reminders'

const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const lists: LiveTvList[] = [
  { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
  { id: 'l2', name: 'Nordic', channels: [ch('C', 'Kids')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
]
const cache: EpgCacheEntry = { index: { 'a.tv': [{ title: 'Now A', start: now - 60_000, stop: now + 60_000 }, { title: 'Next A', start: now + 60_000, stop: now + 120_000 }] }, fetchedAt: now, sources: [] }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', lists)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'playlists')
  vi.mocked(useLiveTvEpgCache).mockReturnValue(cache)
})

const mount = () => render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvGuidePlaylists', () => {
  it('listar spellistor med grupper och Favoriter sist', () => {
    mount()
    const left = screen.getByTestId('playlists-column')
    expect(left).toHaveTextContent('Xtream')
    expect(left).toHaveTextContent('Sport')
    expect(left).toHaveTextContent('Nordic')
    expect(left).toHaveTextContent('Favourites')
  })
  it('val av grupp filtrerar mitten och fokus uppdaterar högerkolumnen', () => {
    mount()
    fireEvent.click(screen.getByTestId('pl-group-l1-News'))
    const rows = screen.getAllByTestId('pl-row')
    expect(rows).toHaveLength(1)
    fireEvent.focus(rows[0])
    expect(screen.getByTestId('pl-detail')).toHaveTextContent('B')
  })
  it('OK på Sen-kortet sätter påminnelse', () => {
    mount()
    fireEvent.focus(screen.getAllByTestId('pl-row')[0])
    fireEvent.click(screen.getByTestId('pl-next-card'))
    expect(getReminders(now).length).toBe(1)
  })
})
```

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-guide-playlists.tsx`**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { channelKey, flattenChannels as _unused, type M3uChannel } from '../live-tv-data'
import { flattenChannels, qualityFromName, topGroups } from '../live-tv-model'
import { formatClock, progressOf } from '../live-tv-ui'
import { isReminded, toggleReminder } from '../reminders'
import type { EpgProgramme } from '../epg/types'
import type { TvViewProps } from './tv-shell'
import { Progress, Tag, TV, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import { ChannelCell, FAVS_GROUP, useDebouncedChannel } from './tv-guide-shared'
import { TvPreview } from './tv-preview'

type Selection = { listId: string | null; group: string | null }

export function TvGuidePlaylists({ model, nav, settings }: TvViewProps) {
  const { tt, locale } = useTvText()
  const clock = useTvClockNode(locale)
  const [sel, setSel] = useState<Selection>({ listId: model.lists[0]?.id ?? null, group: null })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [, bump] = useState(0)

  const tree = useMemo(() => model.lists.map((list) => {
    const channels = flattenChannels([list])
    return { id: list.id, name: list.name, count: channels.length, channels, groups: topGroups(channels, 12).map((g) => ({ name: g, count: channels.filter((c) => c.group === g).length })) }
  }), [model.lists])

  const rows: M3uChannel[] = useMemo(() => {
    if (sel.listId === FAVS_GROUP) return model.favouriteChannels
    const list = tree.find((l) => l.id === sel.listId)
    if (!list) return []
    return sel.group ? list.channels.filter((c) => c.group === sel.group) : list.channels
  }, [sel, tree, model.favouriteChannels])

  const selected = useMemo(() => (selectedKey ? rows.find((c) => channelKey(c) === selectedKey) ?? null : null) ?? rows[0] ?? null, [selectedKey, rows])
  const previewChannel = useDebouncedChannel(selected, 300)
  const info = selected ? model.nowFor(selected) : { now: null, next: null, later: null }
  const title = sel.listId === FAVS_GROUP ? tt('favourites') : sel.group ?? tree.find((l) => l.id === sel.listId)?.name ?? ''

  const remind = (programme: EpgProgramme) => {
    if (!selected) return
    toggleReminder(selected, programme, model.nowMs)
    bump((n) => n + 1)
  }

  const card = (label: string, programme: EpgProgramme | null, kind: 'now' | 'next' | 'later') => {
    if (!programme) return null
    const isNow = kind === 'now'
    const reminded = !isNow && selected ? isReminded(selected, programme) : false
    return (
      <div
        data-testid={`pl-${kind}-card`}
        {...station(() => (isNow ? selected && nav.play({ channel: selected }) : remind(programme)))}
        style={{ padding: `${dp(14)}px ${dp(18)}px`, borderRadius: dp(14), background: isNow ? TV.accMix(14) : TV.s06, border: `1px solid ${isNow ? TV.accMix(45) : TV.line}`, display: 'flex', flexDirection: 'column', gap: dp(6), cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: dp(14), letterSpacing: '0.1em', textTransform: 'uppercase', color: isNow ? TV.accText : 'rgba(243,244,248,0.5)' }}>
          <span>{label}</span><span style={{ fontSize: dp(15), letterSpacing: 0, textTransform: 'none' }}>{isNow ? `${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}` : formatClock(programme.start, locale)}</span>
        </div>
        <div style={{ fontSize: isNow ? dp(24) : dp(20), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{programme.title}</div>
        {isNow ? <Progress value={progressOf(programme.start, programme.stop, model.nowMs)} height={dp(4)} /> : null}
        <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)' }}>{isNow ? tt('okWatch') : reminded ? tt('reminderSet') : tt('okRemind')}</div>
      </div>
    )
  }

  const colItem = (key: string, active: boolean, label: string, count: number, indent: boolean, onOk: () => void, testId: string, extra?: Record<string, string>) => (
    <div key={key} data-testid={testId} {...station(onOk, undefined, { 'data-live-tv-col': 'left', ...(extra ?? {}) })} style={{ height: indent ? dp(48) : dp(56), marginLeft: indent ? dp(28) : 0, padding: `0 ${dp(16)}px`, borderRadius: dp(12), display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? (indent ? TV.accMix(18) : TV.s12) : 'transparent', color: active ? TV.text : indent ? 'rgba(243,244,248,0.6)' : TV.text, fontSize: indent ? dp(18) : dp(19), fontWeight: indent ? 400 : 600, cursor: 'pointer' }}>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.45)' }}>{count}</span>
    </div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      {/* Vänster: spellistor + grupper */}
      <div data-testid="playlists-column" data-scroll="" style={{ width: dp(330), flexShrink: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(30)}px ${dp(16)}px 0 ${dp(20)}px`, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: dp(2) }}>
        {tree.map((list) => [
          colItem(list.id, sel.listId === list.id && !sel.group, list.name, list.count, false, () => { setSel({ listId: list.id, group: null }); setSelectedKey(null) }, `pl-list-${list.id}`),
          ...list.groups.map((g) => colItem(`${list.id}:${g.name}`, sel.listId === list.id && sel.group === g.name, g.name, g.count, true, () => { setSel({ listId: list.id, group: g.name }); setSelectedKey(null) }, `pl-group-${list.id}-${g.name}`)),
        ])}
        {colItem('__favs', sel.listId === FAVS_GROUP, tt('favourites'), model.favouriteChannels.length, false, () => { setSel({ listId: FAVS_GROUP, group: null }); setSelectedKey(null) }, 'pl-list-favs')}
        <div style={{ marginTop: 'auto', padding: `${dp(20)}px 0`, fontSize: dp(15), color: TV.faint }}>{tt('helpPlaylists')}</div>
      </div>

      {/* Mitten: kanaler */}
      <div data-scroll="" style={{ flex: 1, minWidth: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(30)}px 0 0 ${dp(24)}px`, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12), marginBottom: dp(16) }}>
          <span style={{ fontSize: dp(26), fontWeight: 600 }}>{title}</span>
          <span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{tt('channelsCount', { count: rows.length })} · {clock}</span>
        </div>
        {rows.map((channel, index) => {
          const key = channelKey(channel)
          const rowInfo = model.nowFor(channel)
          const focused = selected ? channelKey(selected) === key : false
          return (
            <div
              key={key}
              data-testid="pl-row"
              {...station(() => nav.play({ channel }), (el) => nav.channelMenu(channel, el), { ...(index === 0 ? { 'data-init': '' } : {}), 'data-f-left': '[data-live-tv-col="left"]', 'data-f-right': '[data-testid="pl-now-card"], [data-testid="pl-preview"]' })}
              onFocus={() => setSelectedKey(key)}
              style={{ height: dp(82), marginRight: dp(24), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(14)}px`, background: focused ? TV.s10 : 'transparent', cursor: 'pointer' }}
            >
              <ChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} quality={null} focused={false} width={dp(560)} />
              <div style={{ minWidth: 0, flex: 1, fontSize: dp(17), color: 'rgba(243,244,248,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rowInfo.now?.title ?? tt('noProgramme')}</div>
              <div style={{ width: dp(110), flexShrink: 0 }}>
                {rowInfo.now ? <><div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)', textAlign: 'right' }}>{tt('minutesLeft', { min: Math.max(0, Math.round((rowInfo.now.stop - model.nowMs) / 60_000)) })}</div><Progress value={progressOf(rowInfo.now.start, rowInfo.now.stop, model.nowMs)} height={dp(4)} /></> : null}
              </div>
            </div>
          )
        })}
        {rows.length === 0 ? <div style={{ padding: dp(24), color: TV.dim, fontSize: dp(19) }}>{tt('guideEmpty')}</div> : null}
      </div>

      {/* Höger: förhandsvisning + Nu/Sen/Senare */}
      <div data-testid="pl-detail" style={{ width: dp(560), flexShrink: 0, padding: `${dp(30)}px ${dp(48)}px 0 ${dp(28)}px`, display: 'flex', flexDirection: 'column', gap: dp(14) }}>
        <TvPreview channel={previewChannel} enabled={settings.previewEnabled} live={Boolean(info.now)} width="100%" height={dp(272)} label={settings.previewEnabled ? tt('previewLabel') : tt('previewFrame')} onOk={() => selected && nav.play({ channel: selected })} extra={{ 'data-testid': 'pl-preview' }} />
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(16), color: 'rgba(243,244,248,0.55)' }}>
            <span style={{ color: TV.accText, fontWeight: 600 }}>{model.channelNumber(selected) ?? ''}</span><span>{selected.name}</span>{qualityFromName(selected.name) ? <Tag variant="quality">{qualityFromName(selected.name)}</Tag> : null}
          </div>
        ) : null}
        {card(tt('colNow'), info.now, 'now')}
        {card(tt('colNext'), info.next, 'next')}
        {card(tt('colLater'), info.later, 'later')}
      </div>
    </div>
  )
}
```

Ta bort den felaktiga importen `flattenChannels as _unused` från `../live-tv-data` (den finns i `../live-tv-model`). Kontrollera att `flattenChannels` och `topGroups` exporteras från `live-tv-model.ts` (rad 40 och 56: ja).

- [ ] **Step 4: Kör testen** → PASS. Hela sviten + typkontroll → PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-guide-playlists.tsx plugins/live-tv/runtime/tv/tv-guide-playlists.test.tsx
git commit -m "live-tv: spellisteguide i tre kolumner med påminnelser på Sen/Senare"
```

---

### Task 11: Favoriter

**Files:**
- Create: `runtime/tv/tv-favourites.tsx`
- Modify: `runtime/tv/tv-views.ts` (`favs: TvFavourites`)
- Test: `runtime/tv/tv-favourites.test.tsx`

**Interfaces:**
- Consumes: `movePinnedLiveTvChannel` (Task 3), `nav.channelMenu(channel, el, extra)`, `TvViewProps`.

README "4. Favoriter" normativt: rutnät 3 kolumner, kort radius 16, bildyta 130.

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, getPinnedLiveTvKeys, type LiveTvList } from '../live-tv-data'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A'), ch('B'), ch('C')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [channelKey(ch('A')), channelKey(ch('B'))])
})

const mount = (onNavigate = vi.fn()) => { render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'favs' }} onNavigate={onNavigate} onOpenDetails={() => {}} />); return onNavigate }

describe('TvFavourites', () => {
  it('visar favoriterna numrerade i sparad ordning', () => {
    mount()
    const cards = screen.getAllByTestId('fav-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('1 · A')
    expect(cards[1]).toHaveTextContent('2 · B')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('håll OK ger Flytta ner som flyttar ordningen', async () => {
    vi.useFakeTimers()
    mount()
    const first = screen.getAllByTestId('fav-card')[0]
    fireEvent.keyDown(first, { key: 'Enter' })
    vi.advanceTimersByTime(700)
    fireEvent.keyUp(first, { key: 'Enter' })
    vi.useRealTimers()
    fireEvent.click(await screen.findByText('Move down'))
    expect(getPinnedLiveTvKeys()).toEqual([channelKey(ch('B')), channelKey(ch('A'))])
  })
  it('Lägg till från guiden navigerar till guiden', () => {
    const onNavigate = mount()
    fireEvent.click(screen.getByText('+ Add from the guide'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide', group: 'all' } })
  })
})
```

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-favourites.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { channelKey, movePinnedLiveTvChannel } from '../live-tv-data'
import { qualityFromName } from '../live-tv-model'
import { formatClock, progressOf } from '../live-tv-ui'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Progress, Tag, TV, cardStyle, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'

export function TvFavourites({ model, nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const favourites = model.favouriteChannels
  const gridRef = useRef<HTMLDivElement | null>(null)
  const refocusKey = useRef<string | null>(null)

  // Efter Flytta upp/ner: fokus följer kortet till dess nya plats.
  useEffect(() => {
    const key = refocusKey.current
    if (!key) return
    refocusKey.current = null
    gridRef.current?.querySelector<HTMLElement>(`[data-fav-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true })
  }, [favourites])

  const move = (key: string, delta: -1 | 1) => {
    movePinnedLiveTvChannel(key, delta)
    refocusKey.current = key
  }

  return (
    <div data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `${dp(34)}px ${dp(48)}px 0`, display: 'flex', flexDirection: 'column', gap: dp(22) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(16) }}>
        <span style={{ fontSize: dp(34), fontWeight: 600 }}>{tt('favourites')}</span>
        <span style={{ fontSize: dp(18), color: 'rgba(243,244,248,0.5)' }}>{tt('favouritesSub', { count: favourites.length })}</span>
        <div {...station(() => nav.go('guide', { group: 'all' }), undefined, favourites.length === 0 ? { 'data-init': '' } : {})} style={{ marginLeft: 'auto', height: dp(48), padding: `0 ${dp(22)}px`, borderRadius: 999, border: `1px solid ${TV.lineStrong}`, background: TV.s06, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer' }}>{tt('addFromGuide')}</div>
      </div>
      {favourites.length === 0 ? <div style={{ fontSize: dp(20), color: TV.muted }}>{tt('favouritesEmpty')}</div> : null}
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: dp(16) }}>
        {favourites.map((channel, index) => {
          const key = channelKey(channel)
          const info = model.nowFor(channel)
          const quality = qualityFromName(channel.name)
          return (
            <div
              key={key}
              data-testid="fav-card"
              data-fav-key={key}
              {...station(
                () => nav.play({ channel }),
                (el) => nav.channelMenu(channel, el, [
                  ...(index > 0 ? [{ key: 'up', label: tt('menuMoveUp'), run: () => move(key, -1) }] : []),
                  ...(index < favourites.length - 1 ? [{ key: 'down', label: tt('menuMoveDown'), run: () => move(key, 1) }] : []),
                ]),
                index === 0 ? { 'data-init': '' } : undefined,
              )}
              style={{ ...cardStyle, borderRadius: dp(16), cursor: 'pointer' }}
            >
              <ChannelArt channel={channel} height={dp(130)}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75))' }} />
                {quality ? <span style={{ position: 'absolute', top: dp(10), right: dp(12) }}><Tag variant="quality">{quality}</Tag></span> : null}
                <span style={{ position: 'absolute', left: dp(14), bottom: dp(10), fontSize: dp(15), color: 'rgba(243,244,248,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{`${index + 1} · ${channel.name}`}</span>
              </ChannelArt>
              <div style={{ padding: `${dp(14)}px ${dp(16)}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: dp(8) }}>
                <div style={{ fontSize: dp(21), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? tt('noProgramme')}</div>
                {info.now ? <div style={{ display: 'flex', alignItems: 'center', gap: dp(10) }}><Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={dp(4)} style={{ flex: 1 }} /><span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)' }}>{Math.max(0, Math.round((info.now.stop - model.nowMs) / 60_000))} min</span></div> : null}
                {info.next ? <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tt('next')} {info.next.title} · {formatClock(info.next.start, locale)}</div> : null}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: dp(16), color: TV.faint, paddingBottom: dp(32) }}>{tt('helpFavourites')}</div>
    </div>
  )
}
```

`CSS.escape` saknas i happy-dom: skydda med `typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"')`.

- [ ] **Step 4: Registrera** `favs: TvFavourites`. Kör testen → PASS. Svit + typkontroll → PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-favourites.tsx plugins/live-tv/runtime/tv/tv-favourites.test.tsx plugins/live-tv/runtime/tv/tv-views.ts
git commit -m "live-tv: favoritsida på TV med ordning som styr snabbzapp"
```

---

### Task 12: Kanaldetalj

**Files:**
- Create: `runtime/tv/tv-channel.tsx`
- Modify: `runtime/tv/tv-views.ts` (`channel: TvChannel`)
- Test: `runtime/tv/tv-channel.test.tsx`

**Interfaces:**
- Consumes: `channelFromParams`-logiken (kopiera från `runtime/live-tv-channel-page.tsx` rad 41–52: bygger `M3uChannel` ur `params.url/name/logo/group/tvgId` och slår upp i `model.byUrl` först), `startOfLocalDay` (`../live-tv-model`), `model.scheduleFor`, `catchUpForChannel`, `buildTimeshiftUrl`, `channelSupportsCatchUp`, `expiresLabel` (`../catch-up`), `toggleReminder`, `isReminded` (`../reminders`), `toggleChannelLock` (`../channel-locks`), `TvPreview`, `PinGate`-flödet via `nav.play`.

README "5. Kanaldetalj" normativt: tablå flex · dagväljare 150 · detalj 560.

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string; url: string } }) => <div data-testid="player">{channel.name}|{channel.url}</div> }))
import { useLiveTvEpgCache } from '../hooks/useLiveTvEpgCache'
import { getReminders } from '../reminders'
import { LiveTvTvShell } from './tv-shell'

const now = Date.now()
const H = 3_600_000
const channel = { name: 'ESPN', logo: null, group: 'Sport', url: 'http://x/espn', tvgId: 'espn.tv', archive: { days: 3, streamId: 7, base: 'http://panel', username: 'u', password: 'p' } }
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [channel], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = { index: { 'espn.tv': [
  { title: 'Morning', start: now - 5 * H, stop: now - 4 * H, description: 'Old' },
  { title: 'GameDay', start: now - H, stop: now + H, description: 'Live now' },
  { title: 'Football', start: now + H, stop: now + 2 * H },
] }, fetchedAt: now, sources: [] }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  vi.mocked(useLiveTvEpgCache).mockReturnValue(cache)
})

const params = { view: 'channel', url: channel.url, name: channel.name, logo: '', group: channel.group, tvgId: channel.tvgId }
const mount = (extra: Record<string, string> = {}) => render(<LiveTvTvShell pageId="live-tv-browse" params={{ ...params, ...extra }} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvChannel', () => {
  it('pågående program är förvalt och primärknappen är Titta nu', () => {
    mount()
    expect(document.querySelector('[data-init]')).toHaveTextContent('GameDay')
    expect(screen.getByTestId('primary-action')).toHaveTextContent('Watch now')
    expect(screen.getByTestId('detail')).toHaveTextContent('Live now')
  })
  it('fokus på passerat program ger Spela repris som spelar timeshift-URL', async () => {
    mount()
    fireEvent.focus(screen.getByText('Morning').closest('[data-f]')!)
    expect(screen.getByTestId('primary-action')).toHaveTextContent('Play replay')
    fireEvent.click(screen.getByTestId('primary-action'))
    expect(await screen.findByTestId('player')).toHaveTextContent('/timeshift/')
  })
  it('fokus på framtida program ger Påminn mig som togglar påminnelse', () => {
    mount()
    fireEvent.focus(screen.getByText('Football').closest('[data-f]')!)
    fireEvent.click(screen.getByTestId('primary-action'))
    expect(getReminders(now)).toHaveLength(1)
    expect(screen.getByTestId('primary-action')).toHaveTextContent('Remove reminder')
  })
  it('programme-param förväljer raden', () => {
    mount({ programme: String(now + H) })
    expect(document.querySelector('[data-init]')).toHaveTextContent('Football')
  })
  it('dagväljaren har fem dagar och Idag är vald', () => {
    mount()
    expect(screen.getAllByTestId('day-btn')).toHaveLength(5)
    expect(screen.getByTestId('day-btn-0')).toHaveTextContent(/Today|Idag|\w{3}/)
  })
})
```

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-channel.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { qualityFromName, startOfLocalDay } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import { buildTimeshiftUrl, channelSupportsCatchUp } from '../catch-up'
import { isReminded, toggleReminder } from '../reminders'
import { activeProfileHasPin, pinSupportAvailable, toggleChannelLock } from '../channel-locks'
import type { EpgProgramme } from '../epg/types'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Icons, RoundBtn, Tag, TV, Toggle, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvPreview } from './tv-preview'

const DAY_OFFSETS = [-2, -1, 0, 1, 2] as const
const DAY_MS = 86_400_000

function channelFromParams(params: Record<string, string>, byUrl: Map<string, M3uChannel>): M3uChannel | null {
  const url = params.url
  if (!url) return null
  return byUrl.get(url) ?? { url, name: params.name ?? url, logo: params.logo || null, group: params.group ?? '', tvgId: params.tvgId || null }
}

type Kind = 'past' | 'now' | 'future'
function kindOf(p: EpgProgramme, nowMs: number): Kind {
  if (p.stop <= nowMs) return 'past'
  if (p.start > nowMs) return 'future'
  return 'now'
}

export function TvChannel({ model, nav, params, settings }: TvViewProps) {
  const { tt, locale } = useTvText()
  const channel = useMemo(() => channelFromParams(params, model.byUrl), [params, model.byUrl])
  const [dayOffset, setDayOffset] = useState(0)
  const [selectedStart, setSelectedStart] = useState<number | null>(params.programme ? Number(params.programme) : null)
  const [, bump] = useState(0)
  const listRef = useRef<HTMLDivElement | null>(null)

  const dayStart = startOfLocalDay(model.nowMs, dayOffset)
  const programmes = useMemo(() => (channel ? model.scheduleFor(channel, dayStart, dayStart + DAY_MS) : []), [channel, model, dayStart])
  const yesterday = useMemo(() => (channel && dayOffset === 0 ? model.scheduleFor(channel, dayStart - DAY_MS, dayStart).slice(-2) : []), [channel, model, dayStart, dayOffset])
  const rows = useMemo(() => [...yesterday.map((p) => ({ p, day: 'yesterday' as const })), ...programmes.map((p) => ({ p, day: 'today' as const }))], [yesterday, programmes])

  const selected = useMemo(() => rows.find((r) => r.p.start === selectedStart)?.p ?? rows.find((r) => kindOf(r.p, model.nowMs) === 'now')?.p ?? rows[0]?.p ?? null, [rows, selectedStart, model.nowMs])
  const kind = selected ? kindOf(selected, model.nowMs) : null
  const canReplay = channel ? channelSupportsCatchUp(channel) : false
  const reminded = channel && selected && kind === 'future' ? isReminded(channel, selected) : false
  const key = channel ? channelKey(channel) : ''
  const pinned = model.pinnedSet.has(key)
  const locked = model.locked.has(key)

  useEffect(() => { setSelectedStart(null) }, [dayOffset])

  if (!channel) return <div style={{ padding: dp(48), color: TV.dim }}>{tt('noProgramme')}</div>

  const primary = () => {
    if (!selected) { nav.play({ channel }); return }
    if (kind === 'now') { nav.play({ channel }); return }
    if (kind === 'past') {
      const url = buildTimeshiftUrl(channel, selected.start, selected.stop - selected.start)
      if (url) nav.play({ channel, url, label: selected.title })
      else nav.play({ channel })
      return
    }
    toggleReminder(channel, selected, model.nowMs)
    bump((n) => n + 1)
  }
  const primaryLabel = kind === 'past' ? (canReplay ? tt('playReplay') : tt('watchNow')) : kind === 'future' ? (reminded ? tt('removeReminder') : tt('remindMe')) : tt('watchNow')
  const previewLabel = kind === 'past' ? tt('replayAvailable', { days: channel.archive?.days ?? 0 }) : kind === 'future' && selected ? tt('startsAt', { time: formatClock(selected.start, locale) }) : tt('onNow')

  const dayLabel = (offset: number) => {
    const d = new Date(model.nowMs + offset * DAY_MS)
    return { top: offset === 0 ? tt('today') : offset === -1 ? tt('yesterday') : offset === 1 ? tt('tomorrow') : d.toLocaleDateString(locale, { weekday: 'short' }), bottom: d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      {/* Tablå */}
      <div style={{ flex: 1, minWidth: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(40)}px 0 ${dp(48)}px`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(16), marginBottom: dp(16) }}>
          <RoundBtn {...station(() => nav.back())}><Icons.ChevronLeft /></RoundBtn>
          <ChannelArt channel={channel} style={{ width: dp(88), height: dp(56) }} radius={dp(8)} />
          <span style={{ fontSize: dp(30), fontWeight: 600 }}>{channel.name}</span>
          {channel.group ? <Tag variant="neutral">{channel.group}</Tag> : null}
          <RoundBtn {...station(() => model.togglePin(channel))} background={pinned ? TV.accMix(22) : TV.s12}><span style={{ color: pinned ? TV.acc : TV.text }}><Icons.Heart size={dp(24)} filled={pinned} /></span></RoundBtn>
        </div>
        <div ref={listRef} data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {rows.length === 0 ? <div style={{ padding: dp(24), color: TV.dim, fontSize: dp(19) }}>{model.cache ? tt('noProgramme') : tt('loadingGuide')}</div> : null}
          {rows.map((row, index) => {
            const k = kindOf(row.p, model.nowMs)
            const isSelected = selected?.start === row.p.start
            const showHeader = index === 0 || rows[index - 1].day !== row.day
            const tag = k === 'now' ? <Tag variant="live">{tt('live')}</Tag> : k === 'past' ? (canReplay ? <span style={{ fontSize: dp(15), letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(243,244,248,0.45)' }}>{tt('replay')}</span> : null) : <span style={{ fontSize: dp(15), letterSpacing: '0.08em', textTransform: 'uppercase', color: isReminded(channel, row.p) ? TV.accText : 'rgba(243,244,248,0.45)' }}>{tt('remind')}</span>
            return (
              <div key={row.p.start}>
                {showHeader ? <div style={{ height: dp(44), display: 'flex', alignItems: 'center', paddingLeft: dp(116), fontSize: dp(15), fontWeight: 600, color: TV.accText }}>{row.day === 'yesterday' ? tt('yesterday') : dayLabel(dayOffset).top}</div> : null}
                <div
                  {...station(primary, undefined, isSelected ? { 'data-init': '' } : undefined)}
                  onFocus={() => setSelectedStart(row.p.start)}
                  style={{ height: dp(66), borderRadius: dp(12), padding: `0 ${dp(16)}px`, display: 'flex', alignItems: 'center', gap: dp(16), background: isSelected ? TV.s10 : 'transparent', color: k === 'past' ? 'rgba(243,244,248,0.55)' : TV.text, cursor: 'pointer' }}
                >
                  <span style={{ width: dp(80), fontSize: dp(21), fontVariantNumeric: 'tabular-nums' }}>{formatClock(row.p.start, locale)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: dp(21), fontWeight: k === 'now' ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.p.title}</span>
                  {tag}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dagväljare */}
      <div style={{ width: dp(150), flexShrink: 0, padding: `${dp(120)}px ${dp(14)}px 0`, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
        {DAY_OFFSETS.map((offset) => {
          const active = offset === dayOffset
          const label = dayLabel(offset)
          return (
            <div key={offset} data-testid={`day-btn${offset === 0 ? '-0' : ''}`} {...station(() => setDayOffset(offset), undefined, { 'data-testid': 'day-btn' })} style={{ height: dp(74), borderRadius: dp(12), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: active ? '#f3f4f8' : 'transparent', color: active ? '#111' : offset > 0 ? TV.accText : 'rgba(243,244,248,0.6)', cursor: 'pointer' }}>
              <span style={{ fontSize: dp(17), fontWeight: 600 }}>{label.top}</span>
              <span style={{ fontSize: dp(15), opacity: 0.75 }}>{label.bottom}</span>
            </div>
          )
        })}
      </div>

      {/* Detalj */}
      <div data-testid="detail" style={{ width: dp(560), flexShrink: 0, padding: `${dp(34)}px ${dp(48)}px ${dp(32)}px ${dp(36)}px`, display: 'flex', flexDirection: 'column', gap: dp(16) }}>
        <TvPreview channel={channel} enabled={settings.previewEnabled && kind === 'now'} live={kind === 'now'} width="100%" height={dp(268)} label={previewLabel} onOk={primary} />
        <div style={{ fontSize: dp(28), fontWeight: 600 }}>{selected?.title ?? channel.name}</div>
        {selected ? <div style={{ fontSize: dp(18), color: 'rgba(243,244,248,0.6)' }}>{tt('airedAt', { time: formatClock(selected.start, locale), channel: channel.name })}</div> : null}
        {selected?.description ? <div style={{ fontSize: dp(18), color: 'rgba(243,244,248,0.75)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>{selected.description}</div> : null}
        <div style={{ display: 'flex', gap: dp(12) }}>
          <div data-testid="primary-action" {...station(primary)} style={{ height: dp(52), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(19), fontWeight: 600, cursor: 'pointer' }}>
            {kind === 'future' ? <Icons.Bell filled={reminded} /> : <Icons.Play size={dp(20)} />}{primaryLabel}
          </div>
        </div>
        <div style={{ marginTop: 'auto', padding: `${dp(18)}px ${dp(20)}px`, borderRadius: dp(14), background: TV.s07, border: `1px solid ${TV.lineCard}`, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          <div style={{ fontFamily: TV.mono, fontSize: dp(12), letterSpacing: '0.14em', color: TV.accText }}>{tt('channelInfo')}</div>
          {[
            [tt('quality'), qualityFromName(channel.name) ?? '–'],
            [tt('source'), model.listFor(channel)?.name ?? '–'],
            [tt('replayDays'), channel.archive ? tt('daysCount', { days: channel.archive.days }) : tt('noArchive')],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: dp(17) }}><span style={{ color: TV.muted }}>{label}</span><span>{value}</span></div>
          ))}
          {pinSupportAvailable() && activeProfileHasPin() ? (
            <div {...station(() => { toggleChannelLock(channel) })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: dp(17), paddingTop: dp(10), borderTop: `1px solid ${TV.line}`, cursor: 'pointer' }}>
              <span>{tt('lockWithPin')}</span><Toggle on={locked} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
```

Låset kräver PIN som idag: `toggleChannelLock` skriver direkt (låsning behöver ingen PIN, upplåsning görs via PIN-grinden vid uppspelning). Kontrollera hur `live-tv-channel-page.tsx` gör (rad ~189–230) och följ den om den kräver PIN även för att låsa upp; återanvänd i så fall `PinGate` lokalt i den här vyn.

- [ ] **Step 4: Registrera** `channel: TvChannel`. Kör testen → PASS. Svit + typkontroll → PASS. Om `Tag`-innehållet `LIVE` kolliderar med texttestet, matcha på rader via `closest('[data-f]')` som i testet.

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-channel.tsx plugins/live-tv/runtime/tv/tv-channel.test.tsx plugins/live-tv/runtime/tv/tv-views.ts
git commit -m "live-tv: kanaldetalj på TV med dagväljare, repriser och påminnelser"
```

---

### Task 13: Sök med TV-tangentbord

**Files:**
- Create: `runtime/tv/tv-keyboard.tsx`, `runtime/tv/tv-search.tsx`
- Modify: `runtime/tv/tv-views.ts` (`search: TvSearch`)
- Test: `runtime/tv/tv-keyboard.test.tsx`, `runtime/tv/tv-search.test.tsx`

**Interfaces:**
- Produces (`tv-keyboard.tsx`): `TvKeyboard({ value, onChange, onDone, initFocus }: { value: string; onChange(v: string): void; onDone(): void; initFocus: boolean })`. Rader (bokstäver): `1234567890`, `qwertyuiopå`, `asdfghjklöä`, `zxcvbnm,.-`; tecken-läge: `1234567890`, `!?@#%&/()=`, `+-*_:;"'<>`, `[]{}~^|\€£`. Nedersta rad: mellanslag (flex 1) · ⌫ (120) · `123?`/`ABC` (120) · Klar (140, accent). Rot bär `data-live-tv-keyboard`.
- Consumes: `searchChannels`, `searchProgrammes`, `suggestions` (Task 4), `startOfLocalDay`.

README "6. Sök" normativt: tangentbord vänster 760, sökfält 64, tangenter 58 höga i grid 10 kolumner gap 8.

- [ ] **Step 1: Skriv testen**

`tv-keyboard.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TvKeyboard } from './tv-keyboard'

afterEach(cleanup)

describe('TvKeyboard', () => {
  it('skriver, raderar, växlar teckenläge och signalerar Klar', () => {
    const onChange = vi.fn()
    const onDone = vi.fn()
    render(<TvKeyboard value="ab" onChange={onChange} onDone={onDone} initFocus />)
    fireEvent.click(screen.getByText('q'))
    expect(onChange).toHaveBeenCalledWith('abq')
    fireEvent.click(screen.getByLabelText('Backspace'))
    expect(onChange).toHaveBeenCalledWith('a')
    fireEvent.click(screen.getByText('123?'))
    expect(screen.getByText('@')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Done'))
    expect(onDone).toHaveBeenCalled()
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
})
```

`tv-search.test.tsx`:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { useLiveTvEpgCache } from '../hooks/useLiveTvEpgCache'
import { LiveTvTvShell } from './tv-shell'

const now = Date.now()
const ch = (name: string, tvgId: string | null = null) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId })
const list: LiveTvList = { id: 'l1', name: 'X', channels: [ch('Sky Sports', 'sky.tv'), ch('ESPN')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = { index: { 'sky.tv': [{ title: 'Golf Tonight', start: now + 60_000, stop: now + 120_000 }] }, fetchedAt: now, sources: [] }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  vi.mocked(useLiveTvEpgCache).mockReturnValue(cache)
})

describe('TvSearch', () => {
  it('tangenttryck filtrerar kanaler och program; OK på kanal öppnar kanaldetalj', () => {
    const onNavigate = vi.fn()
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'search' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
    fireEvent.click(screen.getByText('g'))
    expect(screen.getByTestId('search-programmes')).toHaveTextContent('Golf Tonight')
    fireEvent.click(screen.getByText('o'))
    fireEvent.click(screen.getByText('l'))
    fireEvent.click(screen.getByText('f'))
    expect(screen.getByTestId('search-channels')).toHaveTextContent('No results')
    fireEvent.click(screen.getByText('Golf Tonight').closest('[data-f]')!)
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ view: 'channel', name: 'Sky Sports', programme: String(now + 60_000) }) }))
  })
})
```

- [ ] **Step 2: Kör, se att de faller** → FAIL.

- [ ] **Step 3: Skriv `tv-keyboard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'

const LETTERS = ['1234567890', 'qwertyuiopå', 'asdfghjklöä', 'zxcvbnm,.-']
const SYMBOLS = ['1234567890', '!?@#%&/()=', '+-*_:;"\'<>', '[]{}~^|\\€£']

export function TvKeyboard({ value, onChange, onDone, initFocus }: { value: string; onChange: (v: string) => void; onDone: () => void; initFocus: boolean }) {
  const { tt } = useTvText()
  const [symbols, setSymbols] = useState(false)
  const rows = symbols ? SYMBOLS : LETTERS
  const key = (label: string, onOk: () => void, opts?: { span?: number; width?: number; accent?: boolean; init?: boolean; aria?: string; flex?: boolean }) => (
    <div
      key={label}
      {...station(onOk, undefined, { ...(opts?.init ? { 'data-init': '' } : {}), ...(opts?.aria ? { 'aria-label': opts.aria } : {}) })}
      style={{ height: dp(58), borderRadius: dp(10), background: opts?.accent ? TV.acc : TV.s10, color: opts?.accent ? TV.onAcc : TV.text, fontWeight: opts?.accent ? 600 : 400, fontSize: dp(24), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gridColumn: opts?.span ? `span ${opts.span}` : undefined, width: opts?.width, flex: opts?.flex ? 1 : undefined }}
    >
      {label}
    </div>
  )
  return (
    <div data-live-tv-keyboard="" style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
      {rows.map((row, rowIndex) => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: dp(8) }}>
          {row.split('').map((c, i) => key(c, () => onChange(value + c), { init: initFocus && rowIndex === 0 && i === 0 }))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: dp(8) }}>
        {key('␣', () => onChange(value + ' '), { flex: true, aria: 'Space' })}
        {key('⌫', () => onChange(value.slice(0, -1)), { width: dp(120), aria: 'Backspace' })}
        {key(symbols ? tt('keyLetters') : tt('keySymbols'), () => setSymbols((s) => !s), { width: dp(120) })}
        {key(tt('keyDone'), onDone, { width: dp(140), accent: true })}
      </div>
    </div>
  )
}
```

Rader med 11 tecken (`qwertyuiopå`) i ett 10-kolumnsgrid: låt gridet vara `repeat(11, …)` för rader med 11 tecken: `gridTemplateColumns: \`repeat(${row.length}, minmax(0, 1fr))\``. Nyckeln `key={label}` kolliderar mellan `1` i olika lägen aldrig samtidigt; men `␣`/`⌫` är unika.

- [ ] **Step 4: Skriv `tv-search.tsx`**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { channelKey } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvKeyboard } from './tv-keyboard'
import { searchChannels, searchProgrammes, suggestions } from './tv-search-logic'

export function TvSearch({ model, nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const [query, setQuery] = useState('')
  const day = useMemo(() => { const start = startOfLocalDay(model.nowMs); return { start, end: start + 86_400_000 } }, [model.nowMs])
  const channels = useMemo(() => searchChannels(query, model.channels), [query, model.channels])
  const programmes = useMemo(() => searchProgrammes(query, model.channels, model.scheduleFor, day), [query, model.channels, model.scheduleFor, day])
  const hints = useMemo(() => suggestions(query, model.channels, programmes.map((p) => p.programme.title)), [query, model.channels, programmes])
  const focusFirstResult = () => {
    const first = document.querySelector<HTMLElement>('[data-live-tv-search-results] [data-f]')
    first?.focus({ preventScroll: true })
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <div style={{ width: dp(760), flexShrink: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(40)}px 0 ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(18) }}>
        <div style={{ height: dp(64), borderRadius: dp(14), background: TV.s10, display: 'flex', alignItems: 'center', padding: `0 ${dp(20)}px`, fontSize: dp(28), color: query ? TV.text : 'rgba(243,244,248,0.5)' }}>
          {query || <span style={{ fontSize: dp(18) }}>{tt('searchPlaceholder')}</span>}
          <span aria-hidden="true" style={{ width: 2, height: dp(32), background: TV.acc, marginLeft: dp(4) }} />
        </div>
        <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto', minHeight: dp(44) }}>
          {hints.map((hint) => (
            <div key={hint} {...station(() => setQuery(hint))} style={{ height: dp(44), padding: `0 ${dp(18)}px`, borderRadius: 999, background: TV.s08, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), whiteSpace: 'nowrap', cursor: 'pointer' }}>{hint}</div>
          ))}
        </div>
        <TvKeyboard value={query} onChange={setQuery} onDone={focusFirstResult} initFocus />
      </div>
      <div data-live-tv-search-results="" data-scroll="" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: `${dp(34)}px ${dp(48)}px 0 ${dp(40)}px`, display: 'flex', flexDirection: 'column', gap: dp(28) }}>
        <section data-testid="search-channels" style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}><span style={{ fontSize: dp(24), fontWeight: 600 }}>{tt('searchChannels')}</span><span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{tt('hits', { count: channels.length })}</span></div>
          {query && channels.length === 0 ? <div style={{ color: TV.dim, fontSize: dp(18) }}>{tt('noResults')}</div> : null}
          {channels.map((channel) => {
            const info = model.nowFor(channel)
            return (
              <div key={channelKey(channel)} {...station(() => nav.openChannel(channel), (el) => nav.channelMenu(channel, el))} style={{ height: dp(80), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
                <span style={{ width: dp(44), fontSize: dp(16), color: 'rgba(243,244,248,0.5)', textAlign: 'right' }}>{model.channelNumber(channel) ?? ''}</span>
                <ChannelArt channel={channel} style={{ width: dp(76), height: dp(50), flexShrink: 0 }} radius={dp(8)} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: dp(20), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                  <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now ? `${tt('colNow')}: ${info.now.title}` : tt('noProgramme')}</div>
                </div>
                <span style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.5)' }}>{channel.group}</span>
              </div>
            )
          })}
        </section>
        <section data-testid="search-programmes" style={{ display: 'flex', flexDirection: 'column', gap: dp(6) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}><span style={{ fontSize: dp(24), fontWeight: 600 }}>{tt('searchProgrammes')}</span><span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{tt('hits', { count: programmes.length })}</span></div>
          {programmes.map((hit) => (
            <div key={`${channelKey(hit.channel)}:${hit.programme.start}`} {...station(() => nav.openChannel(hit.channel, hit.programme.start))} style={{ height: dp(64), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(16), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
              <span style={{ width: dp(80), fontSize: dp(18), color: 'rgba(243,244,248,0.6)', fontVariantNumeric: 'tabular-nums' }}>{formatClock(hit.programme.start, locale)}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: dp(20), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hit.programme.title}</span>
              <span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{hit.channel.name}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Registrera** `search: TvSearch`. Kör testen → PASS. Svit + typkontroll → PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-keyboard.tsx plugins/live-tv/runtime/tv/tv-keyboard.test.tsx plugins/live-tv/runtime/tv/tv-search.tsx plugins/live-tv/runtime/tv/tv-search.test.tsx plugins/live-tv/runtime/tv/tv-views.ts
git commit -m "live-tv: sökvy med TV-tangentbord, förslag och träffar på kanaler och program"
```

---

### Task 14: Multivy med kanalväljare

**Files:**
- Create: `runtime/tv/tv-multiview.tsx`, `runtime/tv/tv-channel-picker.tsx`
- Modify: `runtime/tv/tv-views.ts` (`multi: TvMultiview`)
- Test: `runtime/tv/tv-multiview.test.tsx`

**Interfaces:**
- Produces (`tv-channel-picker.tsx`): `TvChannelPicker({ model, title, onPick(channel), onClose, nav })` – högerpanel 640 designpx, `data-panel-root`, `data-live-tv-layer`, kategorichips + kanalrader 74; registrerar sig som lager via `nav.pushLayer(onClose)`; första raden `data-init` och får fokus vid montering; vid stängning återgår fokus till elementet som var fokuserat före.
- Consumes: `useMultiviewState`, `setMultiviewState`, `assignTile`, `removeTile`, `enlargeTile`, `setLayout`, `tileCount` (Task 2), `useVideoSurface`, `videoSurfaceCapabilities` (Task 6), `Segment`, `Tag`, `ChannelArt`.

README "7. Multivy" normativt: grid `1fr 1fr` / `2fr 1fr` × `1fr 1fr` med första rutan över två rader / 2×2, gap 16, ruta radius 14.

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import { getMultiviewState } from './tv-multiview-store'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'X', channels: [ch('A'), ch('B'), ch('C')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 4, tiles: [channelKey(ch('A')), null, null, null], audioIndex: 0 })
})

const mount = () => render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'multi' }} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvMultiview', () => {
  it('ritar fyra rutor, ljudtaggen på rutan med ljud och data-init där', () => {
    mount()
    const tiles = screen.getAllByTestId('mv-tile')
    expect(tiles).toHaveLength(4)
    expect(tiles[0]).toHaveTextContent('LJUD|AUDIO')
    expect(tiles[0]).toHaveAttribute('data-init')
  })
  it('tom ruta öppnar kanalväljaren och val tilldelar rutan', () => {
    mount()
    fireEvent.click(screen.getAllByTestId('mv-tile')[1])
    expect(screen.getByTestId('channel-picker')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('picker-row-B'))
    expect(getMultiviewState().tiles[1]).toBe(channelKey(ch('B')))
    expect(screen.queryByTestId('channel-picker')).toBeNull()
  })
  it('segmentväxeln byter layout', () => {
    mount()
    fireEvent.click(screen.getByText('2 tiles'))
    expect(screen.getAllByTestId('mv-tile')).toHaveLength(2)
    expect(getMultiviewState().layout).toBe(2)
  })
  it('OK på en tilldelad ruta flyttar ljudet dit', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 2, tiles: [channelKey(ch('A')), channelKey(ch('B'))], audioIndex: 0 })
    mount()
    fireEvent.click(screen.getAllByTestId('mv-tile')[1])
    expect(getMultiviewState().audioIndex).toBe(1)
  })
})
```

Ljudtaggens text: matcha med regex `/LJUD|AUDIO/`. Byt `toHaveTextContent('LJUD|AUDIO')` mot `toHaveTextContent(/LJUD|AUDIO/)`.

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-channel-picker.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'
import { ChannelArt, Chip, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { filterByGroup, useGuideGroups } from './tv-guide-shared'

export function TvChannelPicker({ model, nav, title, onPick, onClose }: { model: LiveTvModel; nav: TvNav; title: string; onPick: (channel: M3uChannel) => void; onClose: () => void }) {
  const { tt } = useTvText()
  const groups = useGuideGroups(model, tt)
  const [group, setGroup] = useState<string | null>(null)
  const rows = useMemo(() => filterByGroup(model, group).slice(0, 200), [model, group])
  const rootRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    const close = () => { onClose(); window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0) }
    const off = nav.pushLayer(close)
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
    return off
  }, [nav, onClose])

  return (
    <div ref={rootRef} data-testid="channel-picker" data-panel-root="" data-live-tv-layer="" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: dp(640), zIndex: 60, background: TV.panel, borderLeft: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(32)}px`, display: 'flex', flexDirection: 'column', gap: dp(18) }}>
      <div style={{ fontSize: dp(28), fontWeight: 600 }}>{title}</div>
      <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto' }}>
        {groups.map((chip) => <Chip key={chip.id} active={group === chip.key} {...station(() => setGroup(chip.key))} style={{ height: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>)}
      </div>
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {rows.map((channel, index) => {
          const info = model.nowFor(channel)
          return (
            <div key={channelKey(channel)} data-testid={`picker-row-${channel.name}`} {...station(() => { onPick(channel); onClose(); window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0) }, undefined, index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(74), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
              <span style={{ width: dp(40), fontSize: dp(16), color: 'rgba(243,244,248,0.5)', textAlign: 'right' }}>{model.channelNumber(channel) ?? ''}</span>
              <ChannelArt channel={channel} style={{ width: dp(70), height: dp(46), flexShrink: 0 }} radius={dp(8)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? channel.group}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Skriv `tv-multiview.tsx`**

```tsx
'use client'

import { useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Icons, Segment, Tag, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { assignTile, enlargeTile, removeTile, setLayout, setMultiviewState, useMultiviewState, type MultiviewLayout, type MultiviewState } from './tv-multiview-store'
import { useVideoSurface, videoSurfaceCapabilities } from './video-surface'
import { TvChannelPicker } from './tv-channel-picker'

const GRID: Record<MultiviewLayout, { columns: string; rows: string }> = {
  2: { columns: '1fr 1fr', rows: '1fr' },
  3: { columns: '2fr 1fr', rows: '1fr 1fr' },
  4: { columns: '1fr 1fr', rows: '1fr 1fr' },
}

export function TvMultiview({ model, nav }: TvViewProps) {
  const { tt } = useTvText()
  const state = useMultiviewState()
  const [pickerTile, setPickerTile] = useState<number | null>(null)
  const caps = videoSurfaceCapabilities()
  const update = (next: MultiviewState) => setMultiviewState(next)
  const audioChannel = state.tiles[state.audioIndex] ? model.byKey.get(state.tiles[state.audioIndex]!) ?? model.allChannels.find((c) => channelKey(c) === state.tiles[state.audioIndex]) ?? null : null

  // Rutor efter ljudrutan får levande ytor i tur och ordning upp till kapaciteten.
  const liveBudget = Math.max(0, caps.maxLive - 1)
  let liveLeft = liveBudget

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `${dp(34)}px ${dp(48)}px ${dp(32)}px`, gap: dp(18) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(20) }}>
        <span style={{ fontSize: dp(34), fontWeight: 600 }}>{tt('multiview')}</span>
        <Segment options={[{ key: 2 as MultiviewLayout, label: tt('layout2') }, { key: 3 as MultiviewLayout, label: tt('layout3') }, { key: 4 as MultiviewLayout, label: tt('layout4') }]} value={state.layout} onChange={(layout) => update(setLayout(state, layout))} />
        <span style={{ marginLeft: 'auto', fontSize: dp(18), color: 'rgba(243,244,248,0.6)', textAlign: 'right' }}>
          {audioChannel ? <><span>{tt('audioLabel')}: </span><strong style={{ color: TV.text }}>{audioChannel.name}</strong> · </> : null}{tt('multiviewHelp')}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: GRID[state.layout].columns, gridTemplateRows: GRID[state.layout].rows, gap: dp(16) }}>
        {state.tiles.map((key, index) => {
          const channel = key ? model.byKey.get(key) ?? model.allChannels.find((c) => channelKey(c) === key) ?? null : null
          const hasAudio = index === state.audioIndex && channel !== null
          const live = hasAudio || (channel !== null && liveLeft-- > 0)
          return (
            <Tile
              key={`${index}:${key ?? 'empty'}`}
              index={index}
              channel={channel}
              hasAudio={hasAudio}
              live={live}
              isInit={index === state.audioIndex}
              span={state.layout === 3 && index === 0}
              nowTitle={channel ? model.nowFor(channel).now?.title ?? null : null}
              number={channel ? model.channelNumber(channel) : null}
              onOk={() => {
                if (!channel) { setPickerTile(index); return }
                update({ ...state, audioIndex: index })
              }}
              onHold={(el) => {
                if (!channel) { setPickerTile(index); return }
                nav.openMenu({
                  title: channel.name,
                  element: el,
                  actions: [
                    { key: 'audio', label: tt('menuAudioHere'), run: () => update({ ...state, audioIndex: index }) },
                    { key: 'switch', label: tt('menuSwitchChannel'), run: () => setPickerTile(index) },
                    { key: 'enlarge', label: tt('menuEnlarge'), run: () => update(enlargeTile(state, index)) },
                    { key: 'full', label: tt('menuFullscreen'), run: () => nav.play({ channel }) },
                    { key: 'remove', label: tt('menuRemoveTile'), run: () => update(removeTile(state, index)) },
                  ],
                })
              }}
            />
          )
        })}
      </div>
      {pickerTile !== null ? (
        <TvChannelPicker model={model} nav={nav} title={tt('pickChannelFor', { n: pickerTile + 1 })} onPick={(channel: M3uChannel) => update(assignTile(state, pickerTile, channelKey(channel)))} onClose={() => setPickerTile(null)} />
      ) : null}
    </div>
  )
}

function Tile({ index, channel, hasAudio, live, isInit, span, nowTitle, number, onOk, onHold }: {
  index: number; channel: M3uChannel | null; hasAudio: boolean; live: boolean; isInit: boolean; span: boolean; nowTitle: string | null; number: number | null
  onOk: () => void; onHold: (el: HTMLElement) => void
}) {
  const { tt } = useTvText()
  const ref = useRef<HTMLDivElement | null>(null)
  const surface = useVideoSurface(ref, channel && live ? { channel, url: channel.url } : null, { muted: !hasAudio, audio: hasAudio, enabled: live })
  return (
    <div ref={ref} data-testid="mv-tile" {...station(onOk, onHold, isInit ? { 'data-init': '' } : undefined)} style={{ position: 'relative', borderRadius: dp(14), border: `1px solid ${TV.lineCard}`, overflow: 'hidden', background: '#05070d', gridRow: span ? 'span 2' : undefined, cursor: 'pointer', minHeight: 0 }}>
      {channel && !(live && surface.live && !surface.failed) ? <ChannelArt channel={channel} style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /> : null}
      {channel ? (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `${dp(40)}px ${dp(18)}px ${dp(14)}px`, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.8))', display: 'flex', alignItems: 'baseline', gap: dp(10), whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)' }}>{number ?? ''}</span>
            <span style={{ fontSize: dp(19), fontWeight: 600 }}>{channel.name}</span>
            {nowTitle ? <span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.7)', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {nowTitle}</span> : null}
          </div>
          {hasAudio ? <span style={{ position: 'absolute', top: dp(12), right: dp(14) }}><Tag variant="audio">{tt('audioLabel')}</Tag></span> : null}
          {!live || !surface.live ? <span style={{ position: 'absolute', top: dp(12), left: dp(14), fontFamily: TV.mono, fontSize: dp(12), letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,244,248,0.55)' }}>{surface.failed ? tt('tileFailed') : tt('frameLabel')}</span> : null}
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: dp(8), color: 'rgba(243,244,248,0.7)' }}>
          <Icons.Plus /><span style={{ fontSize: dp(20) }}>{tt('pickChannel')}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Registrera** `multi: TvMultiview`. Kör testen → PASS. Svit + typkontroll → PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-multiview.tsx plugins/live-tv/runtime/tv/tv-channel-picker.tsx plugins/live-tv/runtime/tv/tv-multiview.test.tsx plugins/live-tv/runtime/tv/tv-views.ts
git commit -m "live-tv: multivy med 2/1+2/4 rutor, kanalväljare och rutmeny"
```

---

### Task 15: Inställningar inne i Live TV

**Files:**
- Create: `runtime/tv/tv-settings.tsx`
- Modify: `runtime/tv/tv-views.ts` (`settings: TvSettingsView`)
- Test: `runtime/tv/tv-settings.test.tsx`

**Interfaces:**
- Consumes: `useTvSettings/setTvSettings/BANNER_HIDE_OPTIONS`, `useGuideMode/setGuideMode`, `getTvKeyboardPanel`, datalagret: `getM3uUrls`, `applyM3uUrls`, `deleteLiveTvList`, `updateLiveTvListEpg`, `getXtreamLogins`, `deleteXtreamLogin` (`../live-tv-data`), `getLockedChannelKeys`, `toggleChannelLock` (`../channel-locks`); hämtning av lista: samma väg som `live-tv-settings-section.tsx` använder (sök `upsertLiveTvListFromFetch` och `fetchLiveTvList`/M3U-hämtaren där, och återanvänd den funktionen).
- Accent: `(sdk as unknown as { getAccent?: () => string; setAccent?: (id: string) => void; ACCENT_PRESETS?: Record<string, { label: string; shades: string[] }> })`. Sektionen visas bara om alla tre finns.

README "8. Inställningar" normativt: flikar 340 bred, flik 60 hög, innehåll padding 40/48.

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getTvSettings, getGuideMode } from './tv-settings-store'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'

const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [{ name: 'A', logo: null, group: 'Sport', url: 'http://x/A', tvgId: null }], createdAt: '', urlTvg: null, epgUrls: ['http://x/epg.xml'], autoEpgDisabled: false, fetchedAt: '2026-09-12T10:00:00Z' }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
})

const mount = (tab?: string) => render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'settings', ...(tab ? { tab } : {}) }} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvSettingsView', () => {
  it('Utseende: guidens standardvy och beteende-toggles skriver till lagret', () => {
    mount()
    expect(screen.getByTestId('tab-appearance')).toHaveAttribute('data-init')
    expect(screen.queryByText('Accent colour')).toBeNull()
    fireEvent.click(screen.getByTestId('guide-default-tl'))
    expect(getGuideMode()).toBe('tl')
    fireEvent.click(screen.getByTestId('setting-previewEnabled'))
    expect(getTvSettings().previewEnabled).toBe(false)
    fireEvent.click(screen.getByTestId('setting-bannerHideMs'))
    expect(getTvSettings().bannerHideMs).toBe(6000)
  })
  it('Spellistor: listar listor med kvitto och har Lägg till', () => {
    mount('playlists')
    expect(screen.getByText('Xtream')).toBeInTheDocument()
    expect(screen.getByText(/fetched/)).toBeInTheDocument()
    expect(screen.getByText('Add M3U URL')).toBeInTheDocument()
  })
  it('EPG-källor: listar URL:er', () => {
    mount('epg')
    expect(screen.getByText('http://x/epg.xml')).toBeInTheDocument()
  })
  it('Föräldrakontroll: tom text när inget är låst', () => {
    mount('parental')
    expect(screen.getByText('No locked channels')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-settings.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import { getTvKeyboardPanel } from '@/lib/plugin-sdk'
import { applyM3uUrls, deleteLiveTvList, getM3uUrls, updateLiveTvListEpg, type LiveTvList } from '../live-tv-data'
import { getLockedChannelKeys, onChannelLocksChanged, toggleChannelLock } from '../channel-locks'
import type { TvViewProps } from './tv-shell'
import { TV, Toggle, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { BANNER_HIDE_OPTIONS, setGuideMode, setTvSettings, useGuideMode, type BannerHideMs, type GuideMode, type TvSettings } from './tv-settings-store'

type Tab = 'appearance' | 'playlists' | 'epg' | 'parental'
const TABS: Tab[] = ['appearance', 'playlists', 'epg', 'parental']

type AccentApi = { getAccent?: () => string; setAccent?: (id: string) => void; ACCENT_PRESETS?: Record<string, { label: string; shades: string[] }>; onAppearanceChanged?: (cb: () => void) => () => void }
const accentApi = sdk as unknown as AccentApi
const hasAccent = typeof accentApi.getAccent === 'function' && typeof accentApi.setAccent === 'function' && !!accentApi.ACCENT_PRESETS

function Row({ label, right, onOk, testId, first }: { label: ReactNode; right: ReactNode; onOk: () => void; testId?: string; first?: boolean }) {
  return (
    <div data-testid={testId} {...station(onOk, undefined, first ? { 'data-init': '' } : undefined)} style={{ height: dp(64), borderRadius: dp(12), background: TV.s06, padding: `0 ${dp(18)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(16), fontSize: dp(19), cursor: 'pointer' }}>
      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ flexShrink: 0, color: 'rgba(243,244,248,0.6)', display: 'inline-flex', alignItems: 'center', gap: dp(10) }}>{right}</span>
    </div>
  )
}

function Heading({ children, hint }: { children: ReactNode; hint?: string }) {
  return <div><div style={{ fontSize: dp(26), fontWeight: 600 }}>{children}</div>{hint ? <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{hint}</div> : null}</div>
}

export function TvSettingsView({ model, nav, params, settings }: TvViewProps) {
  const { tt, locale } = useTvText()
  const initial = (TABS as string[]).includes(params.tab ?? '') ? (params.tab as Tab) : 'appearance'
  const [tab, setTab] = useState<Tab>(initial)
  const labels: Record<Tab, string> = { appearance: tt('tabAppearance'), playlists: tt('tabPlaylists'), epg: tt('tabEpg'), parental: tt('tabParental') }
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <div style={{ width: dp(340), flexShrink: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(20)}px 0 ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(6) }}>
        <div style={{ fontSize: dp(30), fontWeight: 600, marginBottom: dp(16) }}>{tt('liveTv')}</div>
        {TABS.map((t) => (
          <div key={t} data-testid={`tab-${t}`} {...station(() => setTab(t), undefined, { ...(t === tab ? { 'data-init': '' } : {}), 'data-f-right': '[data-live-tv-settings-content] [data-f]' })} style={{ height: dp(60), borderRadius: dp(12), padding: `0 ${dp(18)}px`, display: 'flex', alignItems: 'center', fontSize: dp(20), background: t === tab ? TV.s12 : 'transparent', color: t === tab ? TV.text : TV.muted, cursor: 'pointer' }}>{labels[t]}</div>
        ))}
      </div>
      <div data-live-tv-settings-content="" data-scroll="" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: `${dp(40)}px ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(36) }}>
        {tab === 'appearance' ? <AppearanceTab settings={settings} tt={tt} /> : null}
        {tab === 'playlists' ? <PlaylistsTab lists={model.lists} tt={tt} locale={locale} /> : null}
        {tab === 'epg' ? <EpgTab lists={model.lists} tt={tt} /> : null}
        {tab === 'parental' ? <ParentalTab model={model} tt={tt} /> : null}
      </div>
    </div>
  )
}

type TT = ReturnType<typeof useTvText>['tt']

function AppearanceTab({ settings, tt }: { settings: TvSettings; tt: TT }) {
  const guideMode = useGuideMode()
  const [accent, setAccentState] = useState(() => (hasAccent ? accentApi.getAccent!() : ''))
  const modes: { key: GuideMode; label: string }[] = [{ key: 'now', label: tt('modeNow') }, { key: 'tl', label: tt('modeTimeline') }, { key: 'playlists', label: tt('modePlaylists') }]
  const nextBanner = (current: BannerHideMs): BannerHideMs => BANNER_HIDE_OPTIONS[(BANNER_HIDE_OPTIONS.indexOf(current) + 1) % BANNER_HIDE_OPTIONS.length]
  return (
    <>
      {hasAccent ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
          <Heading>{tt('accentColour')}</Heading>
          <div style={{ display: 'flex', gap: dp(12), flexWrap: 'wrap' }}>
            {Object.entries(accentApi.ACCENT_PRESETS!).map(([id, preset]) => {
              const color = `rgb(${preset.shades[1]})`
              return (
                <div key={id} {...station(() => { accentApi.setAccent!(id); setAccentState(id) })} style={{ height: dp(60), padding: `0 ${dp(22)}px 0 ${dp(14)}px`, borderRadius: 999, border: `1px solid ${accent === id ? color : TV.lineCard}`, background: TV.s06, display: 'inline-flex', alignItems: 'center', gap: dp(12), fontSize: dp(19), cursor: 'pointer' }}>
                  <span style={{ width: dp(28), height: dp(28), borderRadius: 999, background: color }} />{preset.label}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
      <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
        <Heading hint={tt('guideDefaultHint')}>{tt('guideDefault')}</Heading>
        <div style={{ display: 'flex', gap: dp(16) }}>
          {modes.map((m) => (
            <div key={m.key} data-testid={`guide-default-${m.key}`} {...station(() => setGuideMode(m.key))} style={{ width: dp(300), borderRadius: dp(14), border: `1px solid ${guideMode === m.key ? TV.acc : TV.lineCard}`, background: TV.s06, padding: dp(16), display: 'flex', flexDirection: 'column', gap: dp(12), cursor: 'pointer' }}>
              <div style={{ height: dp(110), borderRadius: dp(10), background: TV.s05, display: 'grid', gridTemplateColumns: m.key === 'playlists' ? '1fr 2fr 1fr' : m.key === 'tl' ? '1fr 3fr' : '1fr 1.2fr 1fr 1fr', gap: dp(6), padding: dp(10) }}>
                {Array.from({ length: m.key === 'playlists' ? 3 : m.key === 'tl' ? 2 : 4 }).map((_, i) => <div key={i} style={{ borderRadius: dp(4), background: i === 1 ? TV.accMix(35) : TV.s12 }} />)}
              </div>
              <div style={{ fontSize: dp(19), fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
        <Heading>{tt('behaviour')}</Heading>
        <Row testId="setting-previewEnabled" label={tt('settingPreview')} right={<Toggle on={settings.previewEnabled} />} onOk={() => setTvSettings({ previewEnabled: !settings.previewEnabled })} />
        <Row testId="setting-startOnLastChannel" label={tt('settingStartLast')} right={<Toggle on={settings.startOnLastChannel} />} onOk={() => setTvSettings({ startOnLastChannel: !settings.startOnLastChannel })} />
        <Row testId="setting-numericZap" label={tt('settingNumericZap')} right={<Toggle on={settings.numericZap} />} onOk={() => setTvSettings({ numericZap: !settings.numericZap })} />
        <Row testId="setting-bannerHideMs" label={tt('settingBannerHide')} right={settings.bannerHideMs === 0 ? tt('never') : tt('seconds', { s: settings.bannerHideMs / 1000 })} onOk={() => setTvSettings({ bannerHideMs: nextBanner(settings.bannerHideMs) })} />
      </section>
    </>
  )
}

function useKeyboardPrompt() {
  const Panel = getTvKeyboardPanel()
  const [prompt, setPrompt] = useState<{ title: string; initial: string; onDone: (value: string) => void } | null>(null)
  const node = Panel && prompt ? (
    <div data-live-tv-host-ui="" style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
      <Panel title={prompt.title} initial={prompt.initial} onDone={(value: string) => { setPrompt(null); prompt.onDone(value) }} onClose={() => setPrompt(null)} />
    </div>
  ) : null
  return { available: Panel !== null, ask: (title: string, initial: string, onDone: (value: string) => void) => setPrompt({ title, initial, onDone }), node }
}

function PlaylistsTab({ lists, tt, locale }: { lists: LiveTvList[]; tt: TT; locale: string }) {
  const keyboard = useKeyboardPrompt()
  const addUrl = () => keyboard.ask(tt('addM3u'), '', (value) => { const url = value.trim(); if (url) applyM3uUrls([...getM3uUrls(), url]) })
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading>{tt('tabPlaylists')}</Heading>
      {lists.map((list) => (
        <Row
          key={list.id}
          label={<><strong>{list.name}</strong> <span style={{ color: 'rgba(243,244,248,0.5)', fontSize: dp(16) }}>· {tt('channelsCount', { count: list.channels.length })}{list.fetchedAt ? ` · ${tt('fetchedAt', { time: new Date(list.fetchedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) })}` : ''}</span></>}
          right={tt('remove')}
          onOk={() => deleteLiveTvList(list.id)}
        />
      ))}
      {keyboard.available ? <Row label={tt('addM3u')} right="+" onOk={addUrl} first={lists.length === 0} /> : null}
      {keyboard.node}
    </section>
  )
}

function EpgTab({ lists, tt }: { lists: LiveTvList[]; tt: TT }) {
  const keyboard = useKeyboardPrompt()
  const urls = useMemo(() => lists.flatMap((list) => list.epgUrls.map((url) => ({ listId: list.id, url }))), [lists])
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading>{tt('tabEpg')}</Heading>
      {urls.map(({ listId, url }) => {
        const list = lists.find((l) => l.id === listId)!
        return <Row key={`${listId}:${url}`} label={url} right={tt('remove')} onOk={() => updateLiveTvListEpg(listId, { epgUrls: list.epgUrls.filter((u) => u !== url) })} />
      })}
      {keyboard.available && lists[0] ? <Row label={tt('addEpgUrl')} right="+" onOk={() => keyboard.ask(tt('addEpgUrl'), '', (value) => { const url = value.trim(); if (url) updateLiveTvListEpg(lists[0].id, { epgUrls: [...lists[0].epgUrls, url] }) })} /> : null}
      {keyboard.node}
    </section>
  )
}

function ParentalTab({ model, tt }: { model: TvViewProps['model']; tt: TT }) {
  const [keys, setKeys] = useState(getLockedChannelKeys)
  useEffect(() => onChannelLocksChanged(() => setKeys(getLockedChannelKeys())), [])
  const channels = keys.map((key) => model.allChannels.find((c) => `${c.name}|${c.url}` === key || model.byKey.get(key) === c)).filter(Boolean)
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading>{tt('lockedChannels')}</Heading>
      {channels.length === 0 ? <div style={{ fontSize: dp(18), color: TV.dim }}>{tt('noLocked')}</div> : null}
      {channels.map((channel) => channel ? <Row key={channel.url} label={channel.name} right={tt('unlock')} onOk={() => toggleChannelLock(channel)} /> : null)}
    </section>
  )
}
```

Anpassningar att göra när du skriver:
- Kontrollera `updateLiveTvListEpg`-signaturen (`live-tv-data.ts` rad 330) och anropa den korrekt.
- I `ParentalTab`: slå upp låsta kanaler med `channelKey`-formatet via `model.allChannels.find((c) => channelKey(c) === key)`; ta bort den hopklistrade jämförelsen.
- `TvKeyboardPanel` är ett absolut positionerat överlägg (`inset: 0`) inne i närmaste positionerade förälder, därför den fixed-omslutande diven med `data-live-tv-host-ui` (så skalet inte tar Back och värdens fokusstil gäller).
- Om M3U-hämtningen i appen sker via en funktion i `live-tv-settings-section.tsx` (sök `fetchAll`/`upsertLiveTvListFromFetch`), kalla samma funktion efter `applyM3uUrls`, annars kommer listan bara läggas till som URL utan att hämtas. Dokumentera med en kommentar vilken funktion som används.

- [ ] **Step 4: Registrera** `settings: TvSettingsView`. Kör testen → PASS. Svit + typkontroll → PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-settings.tsx plugins/live-tv/runtime/tv/tv-settings.test.tsx plugins/live-tv/runtime/tv/tv-views.ts
git commit -m "live-tv: inställningsvy på TV – utseende, spellistor, EPG-källor, föräldrakontroll"
```

---

### Task 16: Spelarens TV-krom (banner, ⋯-meny, mini-guide, ChannelUp/Down)

**Files:**
- Create: `runtime/tv/tv-player-chrome.tsx`
- Modify: `runtime/live-tv-player.tsx` (props + villkorlig rendering)
- Test: `runtime/tv/tv-player-chrome.test.tsx`

**Interfaces:**
- Produces: `TvPlayerChrome(props: { channel: M3uChannel; tv: LiveTvPlayerTvProps; paused: boolean; onTogglePause(): void; onClose(): void })`. Renderas av `LiveTvPlayer` när `isTv && props.tv` i stället för dagens TV-topprad, kontrollrad och `PlayerScheduleOverlay`. Kromet är helt självförsörjande: egen synlighetstimer, egen tangenthantering för ▲/▾/ChannelUp/ChannelDown, egen glasmeny via `getTvGlassMenu()`.
- Consumes: `LiveTvPlayerTvProps` (Task 7), `getTvGlassMenu`, `station`, `RoundBtn`, `Icons`, `Tag`, `Progress`, `ChannelArt`, `useTvClockNode`, `formatClock`, `progressOf`.

README "9. Spelare" normativt: Back 52 + `nr · kanal` 20/75 %, LIVE · kvalitet · klocka 17, banner padding 48, titel 44/600, meta 20/70 %, förlopp 6 max 900, ⋯ 52, mini-guide kort 330×118.

- [ ] **Step 1: Skriv testet**

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TvPlayerChrome } from './tv-player-chrome'
import type { LiveTvPlayerTvProps } from './tv-player-types'

const now = Date.now()
const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const channels = [ch('A'), ch('B'), ch('C')]
const nowFor = (c: { name: string }) => (c.name === 'B' ? { now: { title: 'GameDay', start: now - 60_000, stop: now + 60_000 }, next: { title: 'Football', start: now + 60_000, stop: now + 120_000 }, later: null } : { now: null, next: null, later: null })

function tv(overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return { channelNumber: 2, quality: '4K', favourite: false, bannerHideMs: 4000, neighbours: channels, nowFor, nowMs: now, locale: 'en-GB', onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...overrides }
}

afterEach(cleanup)

describe('TvPlayerChrome', () => {
  it('visar banner med titel, tid och Sen, och ⋯ är data-init', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.getByText('GameDay')).toBeInTheDocument()
    expect(screen.getByText(/Football/)).toBeInTheDocument()
    expect(screen.getByLabelText('More')).toHaveAttribute('data-init')
    expect(screen.getByText('2 · B')).toBeInTheDocument()
  })
  it('bannern döljs efter tiden och ▲ visar den igen', () => {
    vi.useFakeTimers()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    act(() => { vi.advanceTimersByTime(4100) })
    expect(screen.getByTestId('banner').style.opacity).toBe('0')
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByTestId('banner').style.opacity).toBe('1')
    vi.useRealTimers()
  })
  it('▾ öppnar mini-guiden och OK på ett kort byter kanal', () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const cards = screen.getAllByTestId('mini-card')
    expect(cards).toHaveLength(3)
    fireEvent.click(cards[2])
    expect(props.onSwitchChannel).toHaveBeenCalledWith(channels[2])
  })
  it('ChannelUp/Down byter till grannkanal', () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ChannelUp' })
    expect(props.onSwitchChannel).toHaveBeenLastCalledWith(channels[2])
    fireEvent.keyDown(window, { key: 'PageDown' })
    expect(props.onSwitchChannel).toHaveBeenLastCalledWith(channels[0])
  })
  it('⋯ öppnar glasmenyn med rätt poster', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('More'))
    const menu = screen.getByTestId('tv-glass-menu')
    expect(menu).toHaveTextContent('Guide (now / next)')
    expect(menu).toHaveTextContent('Multiview')
    expect(menu).toHaveTextContent('Add to favourites')
    expect(menu).toHaveTextContent('Channel details')
    expect(menu).toHaveTextContent('Pause')
    expect(menu).not.toHaveTextContent(/Record|Spela in/)
  })
})
```

- [ ] **Step 2: Kör, se att det faller** → FAIL.

- [ ] **Step 3: Skriv `tv-player-chrome.tsx`**

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getTvGlassMenu, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { formatClock, progressOf } from '../live-tv-ui'
import type { LiveTvPlayerTvProps } from './tv-player-types'
import { ChannelArt, Icons, Progress, RoundBtn, Tag, TV, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'

const MIN_HIDE_MS = 5000 // fjärren är långsammare än en tumme

export function TvPlayerChrome({ channel, tv, paused, onTogglePause, onClose }: { channel: M3uChannel; tv: LiveTvPlayerTvProps; paused: boolean; onTogglePause: () => void; onClose: () => void }) {
  const { tt } = useTvText()
  const clock = useTvClockNode(tv.locale)
  const [visible, setVisible] = useState(true)
  const [miniOpen, setMiniOpen] = useState(false)
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const timerRef = useRef<number | null>(null)
  const dotsRef = useRef<HTMLDivElement | null>(null)
  const miniRef = useRef<HTMLDivElement | null>(null)
  const TvGlassMenu = getTvGlassMenu()
  const info = tv.nowFor(channel)
  const hideMs = tv.bannerHideMs === 0 ? 0 : Math.max(MIN_HIDE_MS, tv.bannerHideMs)

  const reveal = useCallback(() => {
    setVisible(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    if (hideMs > 0 && !miniOpen && !menu) timerRef.current = window.setTimeout(() => setVisible(false), hideMs)
  }, [hideMs, miniOpen, menu])
  useEffect(() => { reveal(); return () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current) } }, [reveal, channel])

  const index = tv.neighbours.findIndex((c) => channelKey(c) === channelKey(channel))
  const step = useCallback((delta: 1 | -1) => {
    if (tv.neighbours.length === 0) return
    const next = tv.neighbours[(index + delta + tv.neighbours.length) % tv.neighbours.length]
    if (next) tv.onSwitchChannel(next)
  }, [tv, index])

  // Tangenter: ▲ visar bannern, ▾ öppnar mini-guiden, ChannelUp/Down zappar.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (menu) return
      if (event.key === 'ChannelUp' || event.key === 'PageUp') { event.preventDefault(); event.stopPropagation(); step(1); return }
      if (event.key === 'ChannelDown' || event.key === 'PageDown') { event.preventDefault(); event.stopPropagation(); step(-1); return }
      if (event.key === 'ArrowDown' && !miniOpen) { event.preventDefault(); event.stopPropagation(); setMiniOpen(true); reveal(); return }
      if (event.key === 'ArrowUp' && !miniOpen) { event.preventDefault(); event.stopPropagation(); reveal(); return }
      if ((event.key === 'Escape' || event.key === 'Backspace') && miniOpen) { event.preventDefault(); event.stopPropagation(); setMiniOpen(false); window.setTimeout(() => dotsRef.current?.focus({ preventScroll: true }), 0); return }
      if (event.key.startsWith('Arrow') || event.key === 'Enter') reveal()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu, miniOpen, step, reveal])

  useEffect(() => {
    if (!miniOpen) return
    const current = miniRef.current?.querySelector<HTMLElement>('[data-init]')
    current?.focus({ preventScroll: true })
    current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [miniOpen])

  const openMenu = (element: HTMLElement) => {
    setMenu({
      title: `${channel.name}${info.now ? ` · ${info.now.title}` : ''}`,
      element,
      actions: [
        { key: 'guide', label: tt('menuGuide'), run: () => setMiniOpen(true) },
        { key: 'multi', label: tt('menuMultiview'), run: tv.onOpenMultiview },
        { key: 'pause', label: paused ? tt('menuResume') : tt('menuPause'), run: onTogglePause },
        { key: 'fav', label: tv.favourite ? tt('menuRemoveFavourite') : tt('menuAddFavourite'), run: tv.onToggleFavourite },
        { key: 'info', label: tt('menuChannelDetails'), run: tv.onOpenChannelDetails },
      ],
    })
  }

  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: `${dp(36)}px ${dp(48)}px`, display: 'flex', alignItems: 'center', gap: dp(16), opacity: visible ? 1 : 0, transition: 'opacity 200ms', pointerEvents: visible ? 'auto' : 'none', zIndex: 30 }}>
        <RoundBtn {...station(onClose)} background="rgba(252,252,255,0.12)"><Icons.ChevronLeft /></RoundBtn>
        <span style={{ fontSize: dp(20), color: 'rgba(243,244,248,0.75)' }}>{tv.channelNumber ? `${tv.channelNumber} · ` : ''}{channel.name}</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: dp(14), fontSize: dp(17) }}>
          {info.now ? <Tag variant="live">{tt('live')}</Tag> : null}
          {tv.quality ? <span style={{ color: 'rgba(243,244,248,0.75)' }}>{tv.quality}</span> : null}
          {clock}
        </span>
      </div>
      <div data-testid="banner" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: dp(48), paddingTop: dp(120), background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.92) 55%)', display: 'flex', alignItems: 'flex-end', gap: dp(24), opacity: visible ? 1 : 0, transition: 'opacity 200ms', pointerEvents: visible ? 'auto' : 'none', zIndex: 30 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          <div style={{ fontSize: dp(44), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? channel.name}</div>
          {info.now ? (
            <>
              <div style={{ fontSize: dp(20), color: 'rgba(243,244,248,0.7)' }}>
                {`${formatClock(info.now.start, tv.locale)}–${formatClock(info.now.stop, tv.locale)} · ${tt('minutesLeft', { min: Math.max(0, Math.round((info.now.stop - tv.nowMs) / 60_000)) })}`}
                {info.next ? <> · <span style={{ color: TV.accText }}>{tt('nextLabel')}</span> {info.next.title}</> : null}
              </div>
              <Progress value={progressOf(info.now.start, info.now.stop, tv.nowMs)} height={dp(6)} style={{ maxWidth: dp(900) }} />
            </>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(16), flexShrink: 0 }}>
          <span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.45)' }}>{tt('playerHelp')}</span>
          <div ref={dotsRef} {...station(() => dotsRef.current && openMenu(dotsRef.current), (el) => openMenu(el), { 'data-init': '', 'aria-label': tt('moreActions') })} style={{ width: dp(52), height: dp(52), borderRadius: 999, background: 'rgba(252,252,255,0.10)', border: `1px solid ${TV.lineCard}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icons.Dots /></div>
        </div>
      </div>
      {miniOpen ? (
        <div ref={miniRef} data-panel-root="" data-row="" data-live-tv-layer="" style={{ position: 'absolute', left: 0, right: 0, bottom: dp(200), padding: `0 ${dp(48)}px`, display: 'flex', gap: dp(14), overflowX: 'auto', zIndex: 31 }}>
          {tv.neighbours.map((c) => {
            const n = tv.nowFor(c)
            const current = channelKey(c) === channelKey(channel)
            return (
              <div key={channelKey(c)} data-testid="mini-card" {...station(() => { setMiniOpen(false); tv.onSwitchChannel(c) }, (el) => setMenu({ title: c.name, element: el, actions: [{ key: 'multi', label: tt('menuAddMultiview'), run: () => tv.onAddToMultiview(c) }] }), current ? { 'data-init': '' } : undefined)} style={{ width: dp(330), height: dp(118), flexShrink: 0, borderRadius: dp(14), padding: `${dp(14)}px ${dp(16)}px`, background: current ? TV.s16 : 'rgba(20,22,30,0.85)', display: 'flex', flexDirection: 'column', gap: dp(6), cursor: 'pointer', boxSizing: 'border-box' }}>
                <div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.55)' }}>{c.name}</div>
                <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.now?.title ?? tt('noProgramme')}</div>
                {n.next ? <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tt('nextLabel')}: {n.next.title}</div> : null}
                {n.now ? <Progress value={progressOf(n.now.start, n.now.stop, tv.nowMs)} height={dp(4)} /> : null}
              </div>
            )
          })}
        </div>
      ) : null}
      {TvGlassMenu && menu ? <TvGlassMenu target={menu} onClose={() => { setMenu(null); reveal() }} /> : null}
    </>
  )
}
```

`ChannelArt` importeras men används inte här; ta bort importen. Mini-guidens `data-panel-root` gör den till fokusfälla: Back fångas av kromets lyssnare (ovan) och stänger den.

- [ ] **Step 4: Koppla in i `live-tv-player.tsx`**

1. Lägg till i props-gränssnittet `LiveTvPlayerProps` (rad ~49): `tv?: LiveTvPlayerTvProps` med `import type { LiveTvPlayerTvProps } from './tv/tv-player-types'`.
2. Destrukturera `tv` i komponenten och sätt `const tvChrome = isTv && tv ? tv : null`.
3. I den TV-specifika tangenthanteraren (rad ~385–445): när `tvChrome` är satt ska spelaren INTE själv hantera `Backspace`/`Escape` om mini-guiden är öppen. Enklast: kromets lyssnare sitter i capture-fas och anropar `stopPropagation()`, vilket räcker eftersom spelarens lyssnare också ligger i capture men registrerades tidigare. Kontrollera ordningen: React-effekter körs barn före förälder, så kromets lyssnare registreras FÖRE spelarens och får händelsen först. Verifiera i testet nedan att Back med öppen mini-guide inte stänger spelaren.
4. Rendera: där dagens TV-topprad + kontrollrad + `PlayerScheduleOverlay` ritas (rad ~1060–1345), omslut dem med `{tvChrome ? <TvPlayerChrome channel={channel} tv={tvChrome} paused={mpvPaused} onTogglePause={toggleMpvPause} onClose={handleClose} /> : ( …befintlig krom… )}`. Laddnings- och felöverlägg påverkas inte.
5. `revealControls`-timern ska inte döljas/visas för kromet: kromet har egen timer. Sätt `controlsVisible`-styrd opacity bara på den gamla kromen.
6. `LiveTvPlayer` ska anropa `releaseAllSurfaces()` från `./tv/video-surface` innan `engineOpen` första gången (guidens förhandsvisning äger annars den nativa ytan). Lägg det i den befintliga effekten som öppnar strömmen: `await releaseAllSurfaces().catch(() => {})` före `engineOpen(...)`.

- [ ] **Step 5: Lägg till ett integrationstest** i `tv-shell.test.tsx` (ny `it`):

```tsx
  it('spelaren får tv-props och kromet ritas', async () => {
    // Använd den riktiga spelaren men stubba motorn: mocken i toppen av filen
    // ersätter LiveTvPlayer, så testa i stället att `tv` skickas med.
    vi.doMock('../live-tv-player', () => ({ LiveTvPlayer: ({ tv }: { tv?: { channelNumber: number | null } }) => <div data-testid="player">{tv ? `n=${tv.channelNumber}` : 'no-tv'}</div> }))
    const { LiveTvTvShell: Shell } = await import('./tv-shell')
    render(<Shell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    fireEvent.keyDown(window, { key: '1' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByTestId('player')).toHaveTextContent('n=1')
  })
```

Om `vi.doMock` efter `vi.mock` inte tar i vitest: flytta detta test till en egen fil `tv-shell-player.test.tsx` med sin egen `vi.mock`.

- [ ] **Step 6: Kör testen** → PASS. Svit + typkontroll → PASS.

- [ ] **Step 7: Commit**

```bash
git add plugins/live-tv/runtime/tv/tv-player-chrome.tsx plugins/live-tv/runtime/tv/tv-player-chrome.test.tsx plugins/live-tv/runtime/live-tv-player.tsx plugins/live-tv/runtime/tv/tv-shell.test.tsx
git commit -m "live-tv: spelarkrom för TV med infobanner, ⋯-meny, mini-guide och kanalstegning"
```

---

### Task 17: Bygge, visuell verifiering i tv-sim, changelog

**Files:**
- Modify: `plugins/live-tv/CHANGELOG.md`, `plugins/live-tv/plugin.json`, `plugins/live-tv/package.json`, `plugins/live-tv/runtime/index.ts` (versionssträngar), `marketplace.json` (versionsfält för live-tv)
- Eventuella fixar i `runtime/tv/*` efter verifiering.

- [ ] **Step 1: Bygg bunten mot appträdet**

```bash
cd "/Users/jerry/Local Sites/Moviefinder" && node scripts/build-plugin-runtime.mjs ../lumio-official-plugins/plugins/live-tv
```

Expected: bygget lyckas, inga TS2304. Fixa alla fel i pluginkoden (inte i appen).

- [ ] **Step 2: Ladda om bundlade runtimes för dev-servern**

```bash
cd "/Users/jerry/Local Sites/Moviefinder" && node scripts/generate-bundled-plugin-runtimes.mjs && git -C ../lumio-official-plugins status --short
```

Om andra plugins `dist/` ändrats: `git -C ../lumio-official-plugins checkout -- plugins/twitch/dist plugins/plex/dist plugins/youtube/dist plugins/jellyfin/dist` (kontrollera vilka som finns med `ls plugins/*/dist`). Kontrollera att dev-servern körs (`lsof -iTCP:5173 -sTCP:LISTEN`); starta annars `cd "/Users/jerry/Local Sites/Moviefinder" && npm run dev` i bakgrunden.

- [ ] **Step 3: Verifiera varje vy i tv-sim med Playwright**

Öppna `http://localhost:5173/tv-sim.html`, välj 1920×1080 och "TV-läget". Navigera in i Live TV via appens meny (menychipet uppe till vänster → Live TV). Ta skärmdump per vy och jämför mot `design_handoff_live_tv_tv_mode/screenshots/NN-*.png`:

| Vy | Väg | Kontrollera |
|---|---|---|
| Hubb | start | ikonrad, topprad med pill/sök/guide/klocka, spotlight 3 kort, favoriter, fortsätt titta, alla kanaler 6 kolumner |
| Spellistmeny | OK på pillen | lager under pillen, Back stänger, fokus tillbaka |
| Guide Nu/Sen | ikonrad → Kanalguide | toppband med förhandsvisning (video i webbläsaren via proxy), fokusbyte uppdaterar, ◂▸ byter kategori |
| Guide Tablå | segment | block i procent, nu-linje i rätt läge |
| Guide Spellistor | segment | tre kolumner, ◂▸ byter kolumn |
| Favoriter | ikonrad | 3 kolumner, håll OK → Flytta upp/ner |
| Kanaldetalj | håll OK → Kanaldetaljer | tre kolumner, dagväljare, primärknapp per programtyp |
| Sök | ikonrad | tangentbord vänster, träffar höger, Klar flyttar fokus |
| Multivy | ikonrad | rutor, kanalväljare, ljudtagg |
| Inställningar | ikonrad | flikar, toggles |
| Spelare | OK på kanal | banner, ⋯-meny, ▾ mini-guide, Back stänger |

Spara skärmdumparna i scratchpad-katalogen, inte i repot. Rätta avvikelser i storlek och placering mot handoffens mått; commit per rättning med tydligt meddelande.

- [ ] **Step 4: Fjärrnavigering utan mus**

Gå igenom hela flödet med enbart tangentbord: hubb → guide → spelare → Back → guide → Back → hubb → Back (lämnar Live TV). Kontrollera att fokus aldrig hamnar på `body` (`document.activeElement` via Playwright `evaluate`) efter varje vybyte och lagerstängning.

- [ ] **Step 5: Version och changelog**

Bumpa till `0.4.0` i `plugin.json`, `package.json`, `runtime/index.ts` (två ställen: `version` i `__LumioLiveTvEpg` och i `LiveTvPlugin`) och `marketplace.json` (posten för `com.lumio.live-tv`). Lägg överst i `CHANGELOG.md`:

```markdown
## 0.4.0

- TV mode is rebuilt for the remote. A left icon rail (Search, Home, Channel
  guide, Multiview, Favourites, Settings) replaces the header buttons, and
  every card is one focus station: OK plays, hold OK opens the menu.
- The channel guide has three modes — Now/Next, Timeline and Playlists — with
  a muted live preview of the focused channel. Left/right on a row switches
  category.
- Playlists can be picked from the hub; the choice filters the hub and the
  guide. Favourites keep their order and zap with the number keys 1–N.
- New pages inside Live TV: Favourites, Search with an on-screen keyboard,
  Multiview (2, 1+2 or 4 tiles; one live tile until the app can drive more
  surfaces) and Settings (appearance, playlists, EPG sources, parental
  control).
- Channel details show the schedule for five days with replays backwards and
  reminders forwards.
- The player keeps only an info banner and a ⋯ button; the down arrow opens a
  mini guide, ChannelUp/Down step through the guide.
- Desktop and phone are unchanged.
```

- [ ] **Step 6: Bygg om `dist/runtime.js` EFTER versionsbumpen**

```bash
cd "/Users/jerry/Local Sites/Moviefinder" && node scripts/build-plugin-runtime.mjs ../lumio-official-plugins/plugins/live-tv
```

Kontrollera att `dist/runtime.js` innehåller `0.4.0`: `grep -c "0.4.0" ../lumio-official-plugins/plugins/live-tv/dist/runtime.js`.

- [ ] **Step 7: Commit (ingen release, ingen push)**

```bash
cd "/Users/jerry/Local Sites/lumio-official-plugins"
git add plugins/live-tv/CHANGELOG.md plugins/live-tv/plugin.json plugins/live-tv/package.json plugins/live-tv/runtime/index.ts plugins/live-tv/dist/runtime.js marketplace.json
git commit -m "live-tv 0.4.0: TV-läget ombyggt för fjärrkontroll"
```

Rapportera till Jerry: vad som är byggt, vad som verifierats i tv-sim, kända avvikelser, och att release väntar på klartecken.

---

## Självgranskning mot specen

- Spec 3.1–3.8 (arkitektur, filer, vyer, ikonrad, modell, fokus, mått, tangenter): Task 3, 5, 7.
- Spec 4 (lagring): Task 2.
- Spec 5.1 hubb: Task 8. 5.2 guide: Task 9. 5.3 spellistguide: Task 10. 5.4 favoriter: Task 11. 5.5 kanaldetalj: Task 12. 5.6 sök: Task 13. 5.7 multivy: Task 14. 5.8 inställningar: Task 15. 5.9 spelare: Task 16.
- Spec 6 ytgränssnitt: Task 6. Spelaren släpper ytan: Task 16 steg 4.6.
- Spec 7 värdberoenden med fallback: Task 5 (klocka), Task 15 (accent), Task 6 (ytor), Task 7 (glasmeny/hållet krävs).
- Spec 9 tomlägen: Task 8 (hubb tom), Task 9 (guide tom/utan tablå), Task 14 (ruta misslyckas).
- Spec 10 tester: varje task. Visuellt: Task 17.
- Spec 11 bygge/release: Task 17, ingen release.

Typkonsistens: `TvViewProps { model, nav, params, settings }` används i alla vyer; `nav.channelMenu(channel, el, extra?)`, `nav.play({ channel, url?, label? })`, `nav.openChannel(channel, programmeStart?)`, `nav.pushLayer(close) → off`, `useVideoSurface(rectRef, source | null, { muted, audio?, enabled? })`, `LiveTvPlayerTvProps` enligt Task 7.
