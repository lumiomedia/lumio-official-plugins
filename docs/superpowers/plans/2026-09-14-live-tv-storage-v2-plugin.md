# Live TV Lagring v2 – pluginplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pluginet lagrar bara listmetadata, laddar kanaler från appens index till minnet, importerar via Rust-jobb utan kanaltak och läser EPG från Rust; vyerna behåller sin kod.

**Architecture:** Ny indexklient (`runtime/index-client.ts`), datalager v2 (`LiveTvList` utan kanaler + migrering), modell v2 (`useLiveTvModel` läser cache + snapshot), hooks `useSchedules`/`useProgrammeSearch` ersätter `scheduleFor`, inställningar kör importjobb. Alla vyer (TV + desktop) konsumerar samma modell.

**Tech Stack:** React 19, TS, vitest/happy-dom, `@/lib/plugin-sdk` (`readPluginJson`, `writePluginJson`, `setPluginMemoryCache`, `getPluginMemoryCache`).

**Spec:** `docs/superpowers/specs/2026-09-14-live-tv-storage-v2-design.md` (avsnitt 4). App-endpoints enligt appplanen `Moviefinder/docs/superpowers/plans/2026-09-14-live-tv-storage-v2-app.md` (A1–A5) — exakta former där.

## Global Constraints

- Gren `feature/live-tv-storage-v2` från `feature/live-tv-tv-mode`. Aldrig `git stash`. Rör inte `plugins/twitch/`.
- Kanaler skrivs ALDRIG till pluginlagringen. `channels:`-nycklar och inbäddade `channels` i `lists` raderas av migreringen.
- Runtime importerar bara `@/lib/plugin-sdk` från appen. Nätverk går via `fetch('/api/live-tv/…')` (samma ursprung som idag).
- Plugin 0.5.0, `minAppVersion 0.1.596`. Inga fallbacks till gammal lagringsväg.
- Desktop/mobil-vyer ändras bara där `scheduleFor` byts mot hooken; beteendet ska vara detsamma.
- Commit-meddelanden svenska, ingen AI-attribution, ingen trailer. Ingen release/push utan Jerrys klartecken.

## Kontext

- Datalager: `runtime/live-tv-data.ts` (`LiveTvList` rad 58, `writeLists/readLists` 115–135, `upsertLiveTvListFromFetch` 366, Xtream 491–715 inkl. `fetchXtreamChannels` 682 och `xtreamPseudoUrl` 565, index-funktioner 229–290). `xtream-login-section.tsx` `MAX_CHANNELS = 2000` rad 24. `live-tv-settings-section.tsx` `fetchParsedM3u` rad 43, hämtflödet 120–180, `m3u-fetch-progress.ts`.
- Modell: `runtime/live-tv-model.ts` (`useLiveTvModel`, `scheduleFor`, `nowFor`, `nameIndex`, `tvgIdFor`). EPG: `runtime/epg/cache.ts` (pluginlagring, TTL), `fetcher.ts`, `lookup.ts`, `name-match.ts`, `hooks/useLiveTvEpgCache.ts`, `useChannelSchedule.ts`, `useEpgNowNextLater.ts`, `useEpgLoadStatus.ts`.
- Konsumenter av `scheduleFor`: `runtime/tv/tv-guide.tsx` (tablå), `tv-guide-playlists.tsx`, `tv-channel.tsx`, `tv-search.tsx` (via `searchProgrammes`), desktop `live-tv-epg-page.tsx`, `live-tv-channel-page.tsx`, `live-tv-guide.tsx`, `catch-up.ts` (`getChannelSchedule` på cache). Konsumenter av `nameIndex`: `catch-up.ts`, `tv-hub.tsx`.
- Tester: `npx vitest run` från pluginroten; stub `src/__test-stubs__/plugin-sdk.ts` (fetch mockas per test med `vi.stubGlobal('fetch', …)`).

---

### Task P1: Indexklient

**Files:** Create `runtime/index-client.ts`, `runtime/index-client.test.ts`.

**Interfaces (produces):**
```ts
export interface IndexChannel extends M3uChannel { key: string; number: number; tvgIdResolved: string | null }
export async function queryChannels(opts: { source?: string; group?: string; q?: string; offset: number; limit: number }): Promise<{ items: IndexChannel[]; total: number; known: boolean }>
export async function loadAllChannels(source: string | null, onPage?: (loaded: number, total: number) => void): Promise<IndexChannel[]>   // 5 000-sidor
export async function lookupChannels(keys: string[]): Promise<IndexChannel[]>
export async function searchChannels(q: string, limit?: number): Promise<IndexChannel[]>
export async function listGroups(source: string | null): Promise<{ name: string; count: number }[]>
export async function startImport(body: { source: string; m3u?: { url: string }; xtream?: { base; username; password; format; categoryIds? } }): Promise<string>  // job id
export async function importStatus(job: string): Promise<ImportStatus>
export async function waitForJob(job: string, onProgress?: (s: ImportStatus) => void, pollMs = 500): Promise<ImportStatus>  // slutar vid done/error
export async function refreshEpg(listId: string, urls: string[], sources: string[], force?: boolean): Promise<string>
export async function epgNow(opts: { source?: string; listId: string; at?: number }): Promise<{ at: number; fetchedAt: number | null; items: Record<string, NowNextLater> }>
export async function epgSchedule(listId: string, keys: string[], from: number, to: number): Promise<Record<string, EpgProgramme[]>>   // chunkar 200 nycklar
export async function epgSearch(listId: string, q: string, from: number, to: number, limit?: number): Promise<{ key: string; programme: EpgProgramme }[]>
export const INDEX_CHANGED_EVENT = 'lumio-live-tv-index-changed'; export function emitIndexChanged(): void; export function onIndexChanged(cb): () => void
```
- [ ] Tester med mockad `fetch`: sidhämtning stoppar vid `items.length < limit`, lookup-chunkning, `waitForJob` pollar tills `done`, `epgSchedule` chunkar 200 nycklar, felstatus kastar `Error` med status.
- [ ] Implementera; gröna; commit `live-tv: indexklient mot appens kanal- och EPG-endpoints`.

### Task P2: Datalager v2 + migrering + Xtream/M3U via jobb

**Files:** Modify `runtime/live-tv-data.ts`; create `runtime/storage-v2-migration.ts` (+test); modify `runtime/xtream-login-section.tsx`, `runtime/live-tv-settings-section.tsx`, `runtime/m3u-fetch-progress.ts`; tests.

**Interfaces (produces):**
- `LiveTvList` v2: `{ id, name, source, kind: 'm3u' | 'xtream', url?: string, xtreamLoginId?: string, createdAt, urlTvg, epgUrls, autoEpgDisabled, fetchedAt, channelCount, groups: {name;count}[] }`; `channels?: M3uChannel[]` behålls som valfritt läsfält (aldrig skrivet).
- `getLiveTvLists()` returnerar v2-listor; `readLists` sanerar båda formerna.
- `export async function importList(list: LiveTvList, onProgress?): Promise<ImportStatus>` — bygger body ur `kind` (M3U: `url`; Xtream: login ur `getXtreamLogins()` via `xtreamLoginId`), kör `startImport` + `waitForJob`, uppdaterar `channelCount/groups/urlTvg/fetchedAt`, `emitIndexChanged()`. Ersätter `upsertLiveTvListFromFetch` + `fetchXtreamChannels`-vägen. `m3u-fetch-progress.ts` rapporterar jobbens `state/received/total`.
- `export async function migrateStorageV2(): Promise<{ migrated: number }>` — för varje lista med `channels.length > 0`: `POST /api/live-tv/batch` (chunk 1000, replace första) med key/number, skriv om listan utan kanaler; radera `channels:*`-nycklar (`removePluginStorageByPrefix`); markera `live_tv_storage_v2_migrated = true`. Idempotent.
- Ta bort: `MAX_CHANNELS`, `fetchXtreamChannels`, `fetchParsedM3u`, `storeLiveTvChannels`, `readStoredLiveTvChannels`, `getLiveTvMemoryCache/setLiveTvMemoryCache` (ersätts av modellens cache), `pushLiveTvChannelsToIndex` (bara migreringen använder batch direkt), `readLiveTvChannelsFromIndex` (ersätts av `loadAllChannels`). Uppdatera `live-tv-grid.tsx` till klienten.
- Mottagarsidan (enhetsöverföring): `export async function importMissingSources(): Promise<void>` — listor vars `source` saknas i `/api/live-tv/status` importeras i tur och ordning; anropas av modellen vid start (P3).

- [ ] Tester: sanering av gammal lista, migrering (två listor → två batch-anrop, listor utan kanaler, cache-nycklar borta, andra körningen no-op), `importList` för M3U och Xtream (body-form), `importMissingSources` importerar bara saknade källor.
- [ ] Implementera; hela sviten grön; typkontroll utan nya fel; commit `live-tv: listmetadata i lagringen, kanaler i indexet – import via Rust-jobb, migrering, inget kanaltak`.

### Task P3: Modell v2 + EPG-hooks

**Files:** Modify `runtime/live-tv-model.ts`, `runtime/epg/cache.ts` (avvecklas), `runtime/hooks/useLiveTvEpgCache.ts` (avvecklas), `useChannelSchedule.ts`, `useEpgNowNextLater.ts`, `useEpgLoadStatus.ts`; create `runtime/hooks/useSchedules.ts`, `runtime/hooks/useProgrammeSearch.ts`; `runtime/catch-up.ts` (signaturbyte); tests.

**Interfaces (produces):**
- `LiveTvModel` v2: behåller `lists, allChannels, channels, byKey, byUrl, groups, pinnedKeys, pinnedSet, togglePin, playlists, activePlaylistId/Name, setActivePlaylist, channelNumber, favouriteChannels, history, nowMs, epgListId, epgUrls, hasEpg, nowFor, reminders, locked, listFor`. Nytt: `channelsLoading: boolean`, `epgLoading: boolean`, `epgFetchedAt: number | null`, `resolveKeys(keys): Promise<M3uChannel[]>`, `refreshChannels(): void`. Bort: `cache`, `nameIndex`, `tvgIdFor`, `scheduleFor`.
- Kanaler: `loadAllChannels(activeSource)` → `setPluginMemoryCache(LIVE_TV_PLUGIN_ID, 'channels:' + (source ?? 'all'), items)`; laddas vid mount, vid `INDEX_CHANGED_EVENT`, vid spellistbyte. `channelNumber` = `number` från indexet (aktiv källa) eller position i "alla".
- EPG: `epgNow({ source, listId })` vid mount och var 60 s → minnessnapshot `Record<key, NowNextLater>`; `nowFor(channel)` läser snapshot. `refreshEpg(listId, urls, sources)` körs när snapshotens `fetchedAt` saknas eller är > 6 h (Rust avgör själv om den hämtar).
- `useSchedules(channels: M3uChannel[], from, to): { schedules: Record<key, EpgProgramme[]>; loading }` — bulk via `epgSchedule`, cachar per `(key, from, to)` i modul-minne 5 min, avbryter vid unmount. `useProgrammeSearch(q, dayStart, dayEnd): { hits: {channel, programme}[]; loading }` — debounce 150 ms, `epgSearch` + `resolveKeys`.
- `catch-up.ts`: `catchUpForChannel(channel, schedules: EpgProgramme[], nowMs)` och `catchUpAcross(channels, schedulesByKey, nowMs)` tar färdiga scheman; hubben hämtar dem med `useSchedules(favourites + recent, now−3d, now)`.
- Reminders-schemaläggaren (`live-tv-reminders-mount.tsx`) oförändrad (den håller egna tider).

- [x] Tester: modellen med mockad klient — laddar sidor till cache, `channelsLoading` växlar, `nowFor` läser snapshot, spellistbyte laddar om, `favouriteChannels` löser nycklar utanför aktiv källa via `lookup`, `useSchedules` chunkar och cachar, `useProgrammeSearch` debouncar. Befintliga tester som mockar `useLiveTvEpgCache` skrivs om till att mocka `index-client`.
- [x] Implementera; hela sviten grön; commit `live-tv: modellen läser kanaler ur indexet och EPG ur Rust`.

### Task P4: Vyer på hooks

**Files:** Modify `runtime/tv/tv-guide.tsx` (tablå: `useSchedules(visibleRows, win.start, win.end)`), `tv-guide-playlists.tsx` (Sen/Senare via `nowFor` – oförändrat; tablåkort ej), `tv-channel.tsx` (`useSchedules([channel], dayStart−1d, dayStart+1d)`), `tv-search.tsx` (`useProgrammeSearch`), `tv-hub.tsx` (repriser via `useSchedules`), desktop `live-tv-epg-page.tsx`, `live-tv-channel-page.tsx`, `live-tv-guide.tsx` (samma byte), `tv-search-logic.ts` (`searchProgrammes` tar färdiga scheman eller tas bort). Tests uppdateras.

- [x] Kör hela sviten efter varje fil; commit `live-tv: vyerna hämtar tablåer per fönster och kanaler ur indexet`.

### Task P5: Inställningar och import-UX

**Files:** Modify `runtime/tv/tv-settings.tsx`, `runtime/live-tv-settings-section.tsx`, `runtime/xtream-login-section.tsx`, `runtime/hub-strings.ts`/`tv/tv-strings.ts`.

- [x] Lägg till/hämta om kör `importList` med progress ("Hämtar 12 000 av 17 000…", jobbets `received/total`), Xtream-cap-notisen tas bort, fel visas som notis. TV-vyn visar `channelCount` per lista. Tester på båda.
- [x] EPG-källsektionen läser appens diagnostik (`epgStatus` → `/api/live-tv/epg/status`) i stället för pluginets egen XMLTV-cache; `epg/cache.ts`, `epg/fetcher.ts` och `hooks/useLiveTvEpgCache.ts` raderade. `needsReimport`/`lastImportError` syns i båda inställningsvyerna, och en överförd Xtream-lista utan speglad inloggning erbjuder ny inloggning med panelen ifylld.
- [x] Commit `live-tv: importen visar Rust-jobbets förlopp, Xtream utan tak, EPG-diagnostik från appen`.

### Task P6: Version, changelog, bygge, verifiering

- [ ] `plugin.json`/`package.json`/`runtime/index.ts`/`marketplace.json` → 0.5.0, `minAppVersion` 0.1.596. CHANGELOG (engelska, kort: channels live in the app's on-disk index, no 2 000 cap, Xtream imported server-side in one pass, EPG served by the app, existing lists migrated automatically, settings transfer no longer carries channel payloads).
- [ ] Bygg bunten mot app-worktreet `Moviefinder/.worktrees/live-tv-storage-v2` (INTE huvudcheckouten: den saknar de nya endpointsen) — `node scripts/build-plugin-runtime.mjs` från det worktreet; starta dess dev-server på en annan port om 5173 är upptagen (`npm run dev -- --port 5174`) och verifiera i `tv-sim.html`: lägg till en M3U på ~2 000+ kanaler och `tools/fake-xtream-panel.mjs` utökad till 17 000 strömmar; mät importtid, hubb/guide-svarstid, minne (`performance.memory` om tillgängligt). Migrering: seeda en gammal lista med inbäddade kanaler och kontrollera att den hamnar i indexet.
- [ ] Bygg om `dist/runtime.js` EFTER bumpen; commit `live-tv 0.5.0: kanaler och EPG i appens index`.

## Självgranskning

Spec 4.1 → P2; 4.2 → P3 + P4; 4.3 → P6; 3.4 mottagarsida → P2 `importMissingSources` + P3 anrop; tester spec 6 → per task; verifiering spec 6/7 → P6. Typkonsistens: `IndexChannel.key/number/tvgIdResolved` (P1) används av P2/P3; `ImportStatus` från appplanen A2 delas av P1/P2/P5; `useSchedules`-signaturen (P3) används i P4.
