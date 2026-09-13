# Live TV – Lagring v2 (kanaler och EPG på disk i Rust)

Datum: 2026-09-14
Repon: Moviefinder (app, gren från `tv-shell`) + lumio-official-plugins `plugins/live-tv` (gren från `feature/live-tv-tv-mode`)
Bakgrund: betafeedback 2026-09-11 (`Moviefinder/feedback/TV-FEEDBACK.md` punkt 15, 17) och jämförelsen med TiviMate/Sipario (11 000–17 000 kanaler hämtas på sekunder).

## 1. Mål

- Kanallistor lagras bara i appens index på disk (`live-tv-index.json`, Rust). Pluginlagringen bär enbart listmetadata.
- Hämtning av M3U och Xtream sker i Rust och skriver direkt till indexet. Taket 2 000 kanaler försvinner. En Xtream-panel med 17 000 kanaler ska importeras på under 10 s på en TV-box.
- Det parsade EPG:t lagras på disk i Rust och serveras på begäran; pluginet håller bara ett kompakt nu/näst/senare-snapshot i minnet.
- Modellen laddar aktiv spellista (eller alla) från indexet till minnet i sidor; vyerna behåller sin kod och sin sidindelning.
- Kvotproblemen i webbläsarlagringen och i enhetsöverföringen försvinner (listmetadata är kilobyte, inte megabyte).

Beslut (Jerry 2026-09-14): kanaler i minnet per spellista (inte frågebaserade vyer); EPG-cachen följer med; `minAppVersion` höjs, ingen fallback till inbäddade kanaler.

## 2. Omfång

Ingår: Rust-import av M3U och Xtream, utökat kanalindex (nyckeluppslag, flera källor, namnprefix), EPG-lager i Rust (disk, TTL, nu/näst/senare-bulk, tablå per kanal, namnmatchning vid import), migrering av befintliga listor, modell v2 i pluginet, borttagning av `MAX_CHANNELS`, uppdaterad enhetsöverföring (metadata speglas, kanaler återimporteras).

Ingår inte: frågebaserade vyer, SQLite, förändringar i skrivbordets/mobilens vyer utöver det modellen tvingar, TiviMate-liknande kategorihantering (egen omgång).

## 3. App (Rust)

### 3.1 Kanalindex (`live_tv_index.rs`, utökas)

Befintligt: JSON-fil, `sources: BTreeMap<id, { id, updatedAt, channels[] }>`, handlers `status/batch/query/groups/reset`, sidor ≤ 5 000, substringsök.

Nytt:
- `LiveTvChannel` får `key: String` (= pluginets `channelKey`, `name::url`), `number: u32` (1-baserad position i källan) och `tvgIdResolved: Option<String>` (se 3.3).
- `GET /api/live-tv/query` accepterar `source` utelämnad = alla källor i källordning (för "Alla spellistor"); svaret får `groups` bortfiltrerat, oförändrat annars.
- `POST /api/live-tv/lookup` `{ keys: string[] }` → `{ items: LiveTvChannel[] }` (favoriter, historik, påminnelser).
- `GET /api/live-tv/groups` utan `source` = alla källor.
- `GET /api/live-tv/search?q=&limit=` → prefixträffar först, sedan substring, alla källor (sök-vyn).
- Prestanda: sök och sidor är linjära skanningar i minnet; 17 000 kanaler ≈ 1 ms. Ingen SQLite.

### 3.2 Import (`live_tv_import.rs`, nytt)

- `POST /api/live-tv/import` body `{ source: string, m3u?: { url }, xtream?: { base, username, password, format, categoryIds? } }` → `{ job }`.
- `GET /api/live-tv/import/status?job=` → `{ state: 'fetching' | 'parsing' | 'writing' | 'done' | 'error', received, total?, error?, result?: { total, groups: [{name,count}], urlTvg, truncated } }`. Pollas var 500 ms av pluginet.
- M3U: återanvänder `m3u.rs` (`fetch_playlist_text`, `parse_m3u`, Xtream-URL-omskrivning, 64 MiB-tak). Xtream: ny klient `xtream.rs`: `player_api.php?action=get_live_categories` och `action=get_live_streams` (utan `category_id` = alla strömmar i ett svar), bygger ström-URL enligt `format` (`ts`/`m3u8`), `archive` ur `tv_archive`/`tv_archive_duration`, kategori-namn ur kategorilistan. Timeout 60 s, `reqwest` med samma UA som `m3u.rs`.
- Skrivningen ersätter källan atomärt (`replace`), räknar `number`, kör namnmatchning (3.3) och sparar. Jobben körs på tokio och överlever inte omstart.
- Ta bort inget i `m3u.rs`; `/api/m3u` finns kvar för strömproxyn.

### 3.3 EPG i Rust (`live_tv_epg.rs`, nytt; `xmltv.rs` återanvänds)

- Disklagring `live-tv-epg.json` (eller en fil per lista under `live-tv-epg/<listId>.json`): `{ listId, urls, fetchedAt, channels: [{id, displayNames}], programmes: { [tvgId]: [{title, description?, start, stop}] } }`, fönster −6 h … +48 h. TTL 6 h, misslyckad hämtning 10 min. Hämtning via befintliga `xmltv.rs`-funktioner.
- `POST /api/live-tv/epg/refresh` `{ listId, urls }` → `{ job }` (samma jobbmodell som importen).
- `GET /api/live-tv/epg/now?source=&at=` → `{ at, items: { [channelKey]: { now?, next?, later? } } }` för alla kanaler i källan (bara tre program per kanal; 17 000 kanaler ≈ 3 MB).
- `GET /api/live-tv/epg/schedule?keys=k1,k2,…&from=&to=` → `{ items: { [channelKey]: Programme[] } }` (tablårader, kanaldetalj, sök i program).
- `GET /api/live-tv/epg/search?q=&from=&to=&limit=` → programträffar `{ key, programme }`.
- Namnmatchning: `name-match.ts`-logiken portas till Rust (`normalize_channel_name`, `normalize_tvg_id`, index displayName → tvgId). Vid import och vid EPG-refresh sätts `tvgIdResolved` på kanalen (tvg-id direkt om känd, annars namnmatch). Pluginets `nameIndex`/`tvgIdFor` försvinner.
- Påminnelser: pluginet behåller listan i pluginlagringen (liten); schemaläggaren frågar `/epg/schedule` för sina nycklar.

### 3.4 Enhetsöverföring

`MIRROR_KEYS` för live-tv fortsätter spegla `lists`, `pins`, `m3u_urls*`, nu utan kanaler. Mottagaren ser listor vars `source` saknas i sitt index och kör import per lista (3.2) automatiskt vid nästa start av Live TV. `channels:`-nycklarna utgår.

## 4. Plugin

### 4.1 Datalager

- `LiveTvList` blir `{ id, name, source, kind: 'm3u' | 'xtream', url?: string, xtreamLoginId?: string, createdAt, urlTvg, epgUrls, autoEpgDisabled, fetchedAt, channelCount, groups: [{name,count}] }`. Fältet `channels` finns kvar i typen som `never[]`/utfasat en version för läsning av gammal data, skrivs aldrig.
- Migrering vid första modell-laddning på ny app: för varje lista med inbäddade `channels` → `POST /api/live-tv/batch` (replace) + skriv om listan utan kanaler; `channels:`-cache-nycklar och `xtream_logins`-drivna cachar raderas. Körs en gång, markeras `live_tv_storage_v2_migrated`.
- `MAX_CHANNELS` och `fetchXtreamChannels`/`fetchParsedM3u` i klienten tas bort; inställningarna (desktop-sektion och TV-vy) anropar `/api/live-tv/import` och visar jobbstatus med befintliga `m3u-fetch-progress`-mönstret.

### 4.2 Modell v2 (`useLiveTvModel`)

- `channels` = aktiv spellista (eller alla) laddad från `/api/live-tv/query` i 5 000-sidor till en modul-global minnescache (`setPluginMemoryCache`), aldrig till pluginlagringen. Laddas vid start och när indexet ändras (import klar) — händelse `lumio-live-tv-index-changed` skickas av importflödet.
- `allChannels`, `byKey`, `byUrl`, `groups`, `channelNumber` byggs ur cachen som idag. `favouriteChannels`/historik/påminnelser löser nycklar utanför aktiv lista via `/api/live-tv/lookup` (cachat).
- EPG: `nowFor(channel)` läser ett minnessnapshot från `/epg/now` som hämtas vid start och var 60 s (tickern finns); `scheduleFor` ersätts av `useSchedules(channels, from, to)` (bulk, cachad per fönster) och `useProgrammeSearch(q)`. Berörda vyer: guide (tablåläge), spellisteguide, kanaldetalj, sök, spelarens mini-guide (använder `nowFor`, oförändrad).
- `loading`-tillstånd i modellen: `channelsLoading`, `epgLoading`; vyerna visar "Hämtar…" som idag.
- Desktop/mobil: `live-tv-hub.tsx`, `live-tv-epg-page.tsx`, `live-tv-channel-page.tsx` använder modellen och fungerar oförändrat; `live-tv-grid.tsx` går redan via indexet. `scheduleFor`-anropen i desktopvyerna byts till hooken (tre ställen).

### 4.3 Version

Plugin 0.5.0, `minAppVersion` = appversionen som skeppar 3.1–3.4 (nästa efter 0.1.595). Inga fallbacks till gammal lagringsväg.

## 5. Fel och gränser

- Import: nätverksfel → jobb `error` med text; listan behålls med gammalt innehåll. Parsefel → `total: 0` + felnotis, ingen tom lista skrivs.
- Indexfilen korrupt → startar tomt, listorna markeras "behöver hämtas om".
- EPG saknas → `now`-snapshot tomt, vyerna visar "Ingen programinformation" som idag.
- Minnesbudget: 17 000 kanaler ≈ 15 MB JS + 3 MB snapshot; mäts på TV-box (steg i verifieringen).

## 6. Tester

Rust: enhetstester för `lookup`, `search` (prefix före substring), `query` utan `source`, importjobbens tillståndsmaskin med mockade svar (M3U-text, Xtream-JSON), namnmatchningen (portade fall från `name-match.test.ts`), EPG-fönster och `now`-uträkning. Plugin: modellen mot en mockad indexklient (sidor, lookup, snapshot), migreringen (lista med kanaler → batch + avskalad lista), vyer som byter till `useSchedules`. Manuellt: 17 000-kanals Xtream på TV-box: importtid, minne, guide/hubb-svarstid, EPG-uppslag.

## 7. Verifiering och release

Appen byggs och släpps först (nya endpoints), pluginet direkt efter med höjd `minAppVersion`. Inget släpps utan Jerrys klartecken.
