# Live TV Sportläge fas 2 (resultat via användarens nyckel): implementationsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Med en nyckel som användaren själv klistrar in (API-Sports eller TheSportsDB premium) får Sport-fliken ställning, minut, status, märken, Resultat med tabeller (även på telefon), matchcenter, "Bara resultat", MÅL!-overlay, målnotis och en bakgrundsbild i Sport. Kvothanteraren äger varje anrop, och utan nyckel görs inga anrop.

**Architecture:** Appen (Rust) får en lokal genomkoppling, `/api/live-tv/sport/fetch`. Den lägger på nyckelheadern, läser kvotheaders, för en delad kvotbok per källa och hink, svarar ur en diskcache i `live-tv-sport/` och spärrar hårt vid slut kvot. Ingenting hostas av oss. Appen får också `/sport/link` (fixtur ↔ EPG-match) och en nyckelöverlämning från telefonen via Soffläges port 3012 (QR). I pluginet ligger providergränssnittet. Adaptrarna är **rena** (de bygger förfrågningar och tolkar svar men har inget nät). Allt nät går genom `Budget` (`budget.ts`), som tillämpar dygnsplanen, reserven, minutgränsen och spärrarna. En livepoller kör bara medan sportvyn, matchcentret eller en sportsändning i spelaren har registrerat "efterfrågan" och fönstret syns. `merge.ts` lägger fixturerna på fas 1:s EPG-matcher. Vyerna läser den sammanslagna `SportMatch`.

**Tech Stack:** Rust (axum, reqwest, serde_json, sha2, wiremock i tester), TypeScript/React 19, Vitest/happy-dom, plugin-SDK (`readPluginJson`/`writePluginJson`, `getPluginHttpAssetUrl`, `QRCodeSVG`, `useTvMode`).

**Spec:** `/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/sportlage/docs/superpowers/specs/2026-10-10-sportlage-design.md` (beslut 5 längst ned gäller: två källor). Underlag: `/Users/jerry/Local Sites/Moviefinder/.worktrees/live-tv-vod-hem/.superpowers/sdd/sport-api-jamforelse.md`, `.../sportlage-research.md`.

**Arbetskataloger:**
- APP = `/Users/jerry/Local Sites/Moviefinder/.worktrees/sportlage` (gren `feature/sportlage`, skapad av fas 1-planen). Rust-tester: `cd "$APP/src-tauri" && cargo test --lib <filter>`. App-vitest: `cd "$APP" && npx vitest run lib/__tests__/<fil>` (bara `lib/**/__tests__/*.test.ts` körs).
- PLG = `/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/sportlage/plugins/live-tv`. Tester: `cd "$PLG" && npx vitest run <fil>`. Typkontroll: `npx tsc --noEmit -p tsconfig.json`. `@/lib/plugin-sdk` pekar på `src/__test-stubs__/plugin-sdk.ts` i test.
- Bygg-grind för pluginet (körs från APP): `cd "$APP" && node scripts/build-plugin-runtime.mjs "$PLG"`.

## Global Constraints

- **Ingen hosting.** Ingen egen server, worker eller proxy. Alla externa anrop går från användarens app med **användarens egen nyckel**. `/api/live-tv/sport/fetch` körs i användarens egen app och är ingen hosting.
- **Rate limits går först.** Kvothanteraren (`budget.ts`) äger **varje** anrop mot källan. Ingen annan kod får anropa `sportFetch` eller en adapter med nät. Adaptrarna har inget nät alls.
- **Inga anrop utan nyckel.** Det gäller både pluginet (`Budget.run` → `no-key`) och Rust (400 utan uppströmsanrop).
- Kvoten för API-Sports räknas **per sport-API** med en hink per sport (gratis = 100 per sport och dygn). Kvotdygnet återställs 00:00 UTC. Svarets kvotheaders är sanningen. Reserven är 10 % och minst 5. Golvet för livepollning är 15 s för API-Sports och 120 s för TheSportsDB (källan uppdaterar ~var 2:a min).
- Pollning sker bara medan sportvyn, matchcentret eller en sportsändning i spelaren är öppen **och** en match i en täckt sport är live eller börjar inom 10 min. Den pausas i bakgrunden.
- Cachen ligger på disk i appen (`live-tv-sport/`), **aldrig** i localStorage. TTL: dagsprogram 15 min för idag och 6 h för andra dagar (igår blir slutgiltig när den hämtats efter dygnets slut + 3 h), tabell 24 h, avslutad fixtur för alltid, pågående fixtur 60 s, live 10 s (avdubblering mellan klienter). Märken går genom `/api/m3u-logo`.
- 429 eller slut på kvot stoppar alla anrop till kvotdygnets slut eller minutgränsens slut. Det EPG-baserade fortsätter som vanligt, och inga fel visas i korten. 401 eller fel nyckel ger nyckelkortet i felläge, och pollningen stannar. Nätfel ger **ett** omförsök inom budget, sedan cachen.
- Tennis, motorsport och varje sport som vald källa saknar har `coverage: 'epg'`. Det betyder inga anrop, inget ställningsfält, ingen "Bara resultat" och ingen rad i Resultat. Nyckelkortet nämner bara sporter som får resultat.
- Nyckeln sparas i `sport_settings_v1` (plugin-lagring, synkas med WebDAV). Den visas maskerad (`••••3f9a`) och sparas **bara** efter godkänd validering.
- Copy (sv) ordagrant ur specen: "Visa resultat och tabeller – gratis, tar 1 minut", "Klistra in nyckel", "Inte nu", "Nyckeln fungerar · {used} av {limit} anrop i dag · Gratisnivå", "Nyckeln godtogs inte", "Nyckeln fungerar inte längre", "Uppdateras var 3:e min · 41 anrop kvar i dag", "Snabbare med betald nyckel", "Resultat pausade till 02:00 – dagens anrop är slut", "Bara resultat", "Välj annan kanal…", "Ta bort nyckel". Inga emoji.
- Notiser fungerar bara medan appen körs, och det står vid växlarna.
- Git: ingen AI-attribution i commits. I APP stageas aldrig `lib/generated/*` eller `docs/superpowers/*`. Pluginets dist byggs från APP-worktreet, och bara `git add -f plugins/live-tv/dist/runtime.js` (i sista tasken). Ingen push och inget släpp utan Jerry.
- Testerna mockar båda källorna med JSON-fixturer under `runtime/sport/__fixtures__/`, skrivna efter källornas dokumenterade svarsformer. Varje fil bär `"_shape": "from docs — verify with real key"`. Jerry gör senare **en** inspelning med egen nyckel och ersätter filerna (utan nyckel).

## Review Focus

1. **Två klienter samtidigt** (TV:n plus telefonen via LAN mot samma värd) ska inte dubbla förbrukningen. Kvotboken är delad i Rust, och live-TTL:n på 10 s avdubblar. Test: Task 2 `two_clients_inside_live_ttl_hit_upstream_once`.
2. **API-Sports skickar fel i en 200-kropp** (`errors.token`, `errors.requests`, `errors.rateLimit`). Det får aldrig cachas som data eller visas som "0 matcher". Rätt utfall är felkod, spärr och senaste cachen. Test: Task 1 `classify_*` och Task 2 `exhausted_body_is_not_cached_and_blocks_until_utc_midnight`.
3. **Appen står öppen över 00:00 UTC medan resultaten är pausade.** Spärren ska släppa av sig själv vid dygnsskiftet, utan omstart. Test: Task 2 `ledger_rolls_at_utc_midnight_and_releases_exhausted` och Task 8 `paused_until_passes_then_allows`.
4. **En nyckel med mellanslag eller radbrytning** (inklistrad från telefonen eller mejlet) ska trimmas. En nyckel som inte går igenom valideringen sparas aldrig och skriver inte över en fungerande nyckel. Test: Task 13 `rejected_key_never_overwrites_saved_key` och `whitespace_is_stripped`.
5. **Första inläsningen med en befintlig ställning, eller en ställning som går ned (VAR)**, ska aldrig ge MÅL! eller en notis. Test: Task 12 `first_observation_is_not_a_goal` och `score_decrease_is_not_a_goal`.

## Gränssnitt från fas 1 (avstämda)

Avstämt mot `docs/superpowers/plans/2026-10-10-sportlage-fas1.md` (Task 8–20). Planen använder fas 1:s faktiska namn och former. Det som fas 1 saknar läggs till additivt av den task som behöver det, och står i listan nedan.

**Konflikter som inte gick att lösa med namnbyte** (löst med en liten, uttrycklig ändring i fas 1-kod):
1. Fas 1:s `statusAt(m, now)` räknar status ur EPG-klockan och kan inte uttrycka paus, uppskjuten eller en källa som säger live efter EPG-slut. Task 11 lägger `phase` på `SportMatch` och en regel i `statusAt` (en match med `fixture` och `status !== 'upcoming'` litar på `m.status`), med två nya fall i fas 1:s `sport-day-model.test.ts`.
2. Fas 1:s `SportSettings` har bara `view` och `alert`, och `sanitizeSettings` släpper allt annat. Fas 1:s test `toEqual({ view: 'matchday', alert: '15' })` bryts. Task 13 lägger `apiKey`, `goalAlerts` (standard `true`), `provider`, `keyPlan`, `keyCardDismissed` och `goalAlertMatches`, och byter testet till `toMatchObject`.
3. Fas 1:s `SportFollow` saknar `providerIds`, och `sanitizeFollows` släpper det. Task 13 gör fältet valfritt och bevarar det.
4. Fas 1 har ingen `day_matches` eller `normalize_team`. `day_handler` samlar och grupperar inline, och `parse_day`, `now_ms` och `collect_entries` är privata. Task 3 gör dem `pub(crate)` och bygger `day_matches` ovanpå. Lagnyckeln heter `team_key`.
5. Fas 1:s `keys_match` kopplar `city` till `manchester city`. Kopplingen får inte göra det. `team_keys_match` (Task 3) lägger alias och minst fem tecken ovanpå `keys_match`.
6. **Löst av Task 21** (Jerrys beslut 2026-10-11): fas 1:s telefonträd (`sport/mobile/sport-phone.tsx`) får inte importera ur `sport/tv/*` (importcykelregeln). Ställning och status på telefonens rader görs med de rena hjälparna i `sport/score-model.ts` (Task 15). Telefonen får fullt Resultat och sökningen i källan i Task 21, med Task 18:s rena delar flyttade till `sport/results-model.ts` och samma `useSportResults`/`searchProviderTeams` som TV:n.
7. Fas 1:s följväljare har ingen fritext ("ingen fritext i fas 1"). Task 15 lägger ett sökfält i `FollowPicker`.

Fas 1 har ingen statisk täckningstabell (`epgOnlySport` finns inte). `coverageFor(provider, sport)` är nytt i fas 2 (Task 7), och `SportMatch.coverage` är ett nytt valfritt fält där `undefined` betyder `'epg'`. Specens `sport_overrides_v1 {matchKey → channelKey}` blev i fas 1 `{ [matchId]: OverrideChannel }` (hela kanalen). Fas 2 följer fas 1.

**PLG (`plugins/live-tv/runtime/`):**
- `sport/sport-model.ts` (Task 9):
  ```ts
  export type SportKind = 'football' | 'hockey' | 'basketball' | 'handball' | 'motorsport' | 'tennis' | 'other'
  export type MatchStatus = 'live' | 'upcoming' | 'finished'
  export interface MatchSource { channelKey: string; name: string; url: string; logo: string | null; group: string; tvgId: string | null; sourceId: string; quality: Quality | null; programmeStart: number; programmeStop: number; liveFlag: boolean }
  export interface SportMatch {
    id: string; kind: SportKind; league: string; leagueKey: string
    home: string | null; away: string | null; homeKey: string | null; awayKey: string | null; event: string | null
    start: number; stop: number; status: MatchStatus; rerun: boolean; round: number | null; venue: string | null
    sources: MatchSource[]
  }
  export interface SportDay { day: string; from: number; to: number; at: number; fetchedAt: number | null; matches: SportMatch[]; counts: Partial<Record<SportKind, number>> }
  export function matchTitle(m): string; export function crestText(name: string): string
  export function sourceChannel(s: MatchSource): M3uChannel
  ```
  Tid är `start`/`stop` (ms), lag är `home`/`away` (strängar) med nycklarna `homeKey`/`awayKey`, och källan heter `MatchSource` (inte `Match`, `Source`, `kickoff`, `end` eller `sourceToChannel`). Task 11 lägger de valfria fälten `coverage`, `phase`, `minute`, `score`, `homeCrest`, `awayCrest`, `homeIds`, `awayIds`, `fixture`, `resultOnly` och `lastGoal` på `SportMatch`.
- `sport/sport-epg.ts` (Task 9): `fetchSportDay(day: string, now?: number): Promise<SportDay>` (frågar `GET /api/live-tv/sport/day?listId=global&day=YYYY-MM-DD&tzOffset=<min>`), `useSportDay(day: string | null, nowMs: number): { data: SportDay | null; state: 'loading' | 'ready' | 'missing' | 'error' }`, `localDayKey`, `shiftDay`, `tzOffsetFor(day)`, `dayStartMs`. `LIVE_TV_GLOBAL_EPG_ID` (`'global'`) kommer ur `live-tv-data.ts`.
- `sport/sport-store.ts` (Task 10): `SPORT_SETTINGS_KEY`, `SPORT_FOLLOWS_KEY`, `SPORT_OVERRIDES_KEY`, `interface SportSettings { view: 'matchday' | 'feed'; alert: 'off' | '15' | 'kickoff' }` (fas 2 lägger resten), `getSportSettings()`, `setSportSettings(patch): SportSettings`, `useSportSettings()`, `interface SportFollow { sport: SportKind; kind: 'team' | 'league'; key: string; name: string }`, `getFollows()`, `isFollowing(follows, f)`, `toggleFollow(f)`, `useFollows()`, `interface OverrideChannel { key; name; url; logo: string | null; group; tvgId: string | null }`, `type SportOverrides = Record<string, OverrideChannel>` (match-id → hela kanalen), `getOverrides()`, `setOverride(matchId, channel | null)`, `useOverrides(): SportOverrides`, `teamKeysMatch`, `sportsCompatible`.
- `sport/sport-day-model.ts` (Task 11): `statusAt(m, now)`, `followState(m, follows): { home; away; league; any }` (ersätter `isMatchFollowed`), `rankedSources(m, overrides): MatchSource[]` (åsidosättningen först, även en kanal utanför matchens källor), `visibleMatches`, `splitSections`.
- `sport/sport-ctx.ts` (Task 13): `SportCtx { model; nav: TvNav; now; locale; tt; follows; overrides; settings; reminders; kindLabel; playlistName; openMatch; openFollowPicker; watch(m, source?); toggleRemind(m); isReminded(m) }`, `useSportCtx`, `timeLine(m, ctx)`, `sourceLine`, `sourceChip`.
- Vyer (alla under `sport/`, inte `tv/`): `sport/tv/sport-shell.tsx` (`TvSport`; flikarna är `'foryou' | 'follows'`, Resultat finns inte i fas 1), `sport/tv/sport-parts.tsx` (`Crest`, `StatusTag`, `MatchCard`, `CardRow`), `sport/tv/sport-matchday.tsx` (`SportMatchday`, hero = `SportHero`, tidslinjen), `sport/tv/sport-feed.tsx`, `sport/tv/sport-follows.tsx` (`SportFollows`, `FollowPicker`), `sport/tv/sport-match-center.tsx` (`SportMatchCenter({ ctx, match, onClose })`, "Välj annan kanal…" skriver `setOverride(match.id, kanal)`), `sport/tv/player-sport.tsx` (`usePlayerSport`, `PlayerSportTicker`, `PlayerMatchesDrawer`, `matchesForPlayer`), `sport/mobile/sport-phone.tsx` (`SportPhone`). Testhjälp: `sport/__sport-fixture.tsx` (`fxMatch`, `fxSource`, `fxDay`, `fakeCtx`, `mountSport`, `stubSportDays`).
- Strängar som fas 1 redan äger och som fas 2 återanvänder: `sportEnded` (SLUT), `sportRound`, `sportWatch`, `live`.

**APP:** `src-tauri/src/live_tv_sport.rs` har `pub fn fold`, `pub fn team_key(name: &str) -> String`, `pub fn keys_match(a: &str, b: &str) -> bool`, `pub enum SportKind` (serde `lowercase`), `pub struct SportMatch { id, kind, league, league_key, home: Option<String>, away: Option<String>, home_key: Option<String>, away_key: Option<String>, event, start: i64, stop: i64, status, rerun, round, venue, sources }`, `pub fn group_entries(entries: Vec<SportEntry>, at: i64) -> Vec<SportMatch>` och `pub async fn day_handler(State<Arc<AxumState>>, Query<SportDayQuery>)` för `GET /api/live-tv/sport/day?listId=&day=YYYY-MM-DD&tzOffset=<min>[&at=ms]`. Tider är `i64` (ms). EPG-butiken nås med `live_tv_epg::sport_ready_store(&state, list_id)` och kanalindexet med `live_tv_index::shared(&state)`.

## File Structure

**APP (Rust och app-test)**

| Fil | Ansvar |
|---|---|
| `src-tauri/src/live_tv_sport_fetch.rs` (ny) | Genomkopplingen: vitlista per källa och sport, uppströms-URL och nyckelheader, kvotheaders, klassning av svarskroppar, kvotbok per hink (dygn UTC och minut), diskcache med TTL och `finalAfter`, handlarna `fetch` och `quota` |
| `src-tauri/src/live_tv_sport_link.rs` (ny) | `/sport/link`: lagjämförelse (alias ovanpå fas 1:s `keys_match`), tidsfönster, girig koppling fixtur → EPG-match med `swapped` |
| `src-tauri/src/live_tv_sport.rs` (fas 1, ändras) | `parse_day`, `now_ms` och `collect_entries` blir `pub(crate)` |
| `src-tauri/src/live_tv_sport_image.rs` (ny, Task 22) | Bildcachen `/sport/image` för bakgrunden: källornas värdar, en hämtning per URL, för alltid på disk i `live-tv-sport/img/` |
| `lib/plugin-sdk.ts` (Task 22) | Läs-seam för appens egna bakgrund (`getHomeBackgroundUrls`, `onHomeBackgroundChanged`) |
| `src-tauri/src/live_tv_sport_key.rs` (ny) | Nyckelöverlämning: väntande koder (10 min, engångs), värdrutter på 3011 (bara lokalt), telefonsida och POST på 3012 |
| `src-tauri/src/lib.rs`, `axum_server.rs`, `couch/phone_routes.rs`, `couch/host_routes.rs`, `haptics/server.rs` | Registrering av moduler och rutter, `ensure_listener` görs `pub(crate)`, och 3012 hålls uppe medan ett överlämningsfönster är öppet |
| `lib/__tests__/sync-key-selection.test.ts` | Bevisar att `sport_settings_v1` synkas |

**PLG (`plugins/live-tv/runtime/`)**

| Fil | Ansvar |
|---|---|
| `sport/provider.ts` (ny) | Typer: `ProviderId`, `Fixture`, `FixtureDetail`, `StandingRow`, `TeamHit`, `KeyCheck`, `ProviderRequest`, `ProviderCall`, `SportsProvider` |
| `sport/sport-fetch.ts` (ny) | Den enda klienten mot `/api/live-tv/sport/fetch` och `/quota`. Får bara importeras av `budget.ts` |
| `sport/api-sports.ts` + `__fixtures__/api-sports/*.json` (nya) | API-Sports-adaptern: värdar, sökvägar, TTL, statusmappning och tolkning |
| `sport/thesportsdb.ts` + `__fixtures__/thesportsdb/*.json` (nya) | TheSportsDB-adaptern (v1 eventsday/lookuptable/searchteams, v2 livescore/lookup) |
| `sport/providers.ts` (ny) | `providerFor(id)`, `coverageFor(id, sport)` |
| `sport/budget.ts` (ny) | Kvothanteraren: `Budget`-klassen och `currentBudget()` |
| `sport/day-plan.ts` (ny) | Dygnsplanen i prioritetsordning, planerade anrop per hink |
| `sport/live-poller.ts` (ny) | Efterfrågan (`usePollDemand`), synlighet, intervallformeln och tick |
| `sport/sport-link.ts`, `sport/merge.ts` (nya) | `/sport/link`-klient, sammanslagning, "Bara resultat" och override för fixturmatcher |
| `sport/goal-events.ts` (ny) | Ställningsdiff → `GoalEvent`, och målbussen |
| `sport/results-controller.ts`, `sport/rate-line.ts` (nya) | Resultatlagret per (källa, nyckel), `useSportResults`, takt-raden |
| `sport/key-flow.ts`, `sport/key-handoff.ts` (nya) | Rensa, maskera, validera och spara nyckeln, samt telefonöverlämningen |
| `sport/sport-store.ts`, `sport/sport-model.ts`, `sport/sport-day-model.ts` (fas 1, ändras) | `SportSettings` får `apiKey`, `goalAlerts`, `provider`, `keyPlan`, `keyCardDismissed`, `goalAlertMatches`, `SportFollow` får `providerIds?`, `SportMatch` får fälten för resultat, och `statusAt` litar på källan |
| `sport/key-card.tsx`, `sport/sport-key-settings.tsx` (nya) | Nyckelkortet och nyckelraderna i inställningarna |
| `sport/goal-alerts.ts`, `sport/sport-goal-mount.tsx` (nya) | Målnotis (native och banner) medan appen körs |
| `sport/score-model.ts` (ny) | Rena hjälpare för ställning och status (`showsScore`, `matchStatusLabel`, `heroStatusLine`, `scoreText`), delade med telefonträdet |
| `sport/tv/sport-score.tsx` (ny) | `MatchScore`, `ResultOnlyTag`, `useGoalBlink`, `RateLineView` (märket är fas 1:s `Crest` med ny `src`) |
| `sport/tv/sport-results.tsx` (ny) | Resultat-fliken: ligagrupper, Omgång N, filter, HOPPA TILL och Tabell med form |
| `sport/tv/sport-match-center-data.tsx` (ny) | Händelser, Statistik och Laguppställningar (döljs när de är tomma), takt-raden, Notis vid mål |
| `sport/tv/player-goal-overlay.tsx` (ny) | MÅL!-overlay och Hoppa dit |
| `sport/results-model.ts` (ny, Task 21) | Resultatens rena delar (`groupResults`, `formLetters`, `FORM_COLOR`), delade av TV och telefon |
| `sport/mobile/sport-results-phone.tsx`, `sport/mobile/sport-follow-search-phone.tsx` (nya, Task 21) | Telefonens Resultat (ligagrupper, filter, HOPPA TILL, tabellark) och sökningen i källan i följarket |
| `sport/backdrop.ts`, `sport/sport-backdrop.tsx`, `sport/sport-backdrop-settings.tsx` (nya, Task 22) | Bakgrund i Sport: ren val-logik och krokar, lagret bakom vyn, och inställningen på tre ytor |
| `tv/tv-strings.ts`, `src/__test-stubs__/plugin-sdk.ts`, `index.ts`, `live-tv-player.tsx`, `live-tv-settings-section.tsx`, `tv/tv-settings.tsx`, `tv/mobile/settings-phone.tsx` + fas 1-vyerna under `sport/tv/` och `sport/mobile/` | Strängar, QR-stubben, registrering och inkoppling |

---

### Task 1: Genomkopplingens rena delar (vitlista, uppströms-URL, kvotheaders, svarsklassning)

**Files:**
- Create: `$APP/src-tauri/src/live_tv_sport_fetch.rs`
- Modify: `$APP/src-tauri/src/lib.rs` (lägg `pub mod live_tv_sport_fetch;` i bokstavsordning efter `pub mod live_tv_index;`)

**Interfaces:**
- Consumes: inget.
- Produces (`crate::live_tv_sport_fetch`):
  - `pub enum Provider { ApiSports, TheSportsDb }`, `Provider::parse(&str) -> Option<Provider>`, `Provider::id(self) -> &'static str` (`"api-sports"` / `"thesportsdb"`)
  - `pub struct Bases { pub api_sports: Option<String>, pub thesportsdb: String }`, `Bases::real()`
  - `pub struct Upstream { pub url: String, pub headers: Vec<(&'static str, String)>, pub bucket: String, pub counts: bool }`
  - `pub fn upstream(p: Provider, sport: &str, path: &str, key: &str, bases: &Bases) -> Option<Upstream>`
  - `pub struct HeaderQuota { day_limit, day_remaining, minute_limit, minute_remaining: Option<u32> }`, `pub fn quota_from(get: impl Fn(&str) -> Option<String>) -> HeaderQuota`
  - `pub enum Verdict { Ok, Unauthorized, Exhausted, RateLimited, Upstream }`, `pub fn classify(p: Provider, http_status: u16, body: &Value) -> Verdict`
  - `pub fn status_quota(body: &Value) -> Option<(u32, u32, String)>` (använda, gräns, plan)
  - `pub const DAY_MS: u64`, `pub fn next_utc_midnight_ms(now_ms: u64) -> u64`

- [ ] **Step 1: Skriv de fallerande testerna** (längst ned i den nya filen)

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn bases() -> Bases { Bases::real() }

    #[test]
    fn api_sports_football_fixtures_goes_to_v3_host_with_key_header() {
        let up = upstream(Provider::ApiSports, "football", "/fixtures?date=2026-10-10&timezone=Europe/Stockholm", "abc123", &bases()).unwrap();
        assert_eq!(up.url, "https://v3.football.api-sports.io/fixtures?date=2026-10-10&timezone=Europe/Stockholm");
        assert_eq!(up.headers, vec![("x-apisports-key", "abc123".to_string())]);
        assert_eq!(up.bucket, "football");
        assert!(up.counts);
    }

    #[test]
    fn api_sports_hockey_uses_its_own_bucket_and_status_does_not_count() {
        let up = upstream(Provider::ApiSports, "hockey", "/status", "abc123", &bases()).unwrap();
        assert_eq!(up.url, "https://v1.hockey.api-sports.io/status");
        assert_eq!(up.bucket, "hockey");
        assert!(!up.counts);
    }

    #[test]
    fn api_sports_rejects_unknown_paths_sports_and_traversal() {
        assert!(upstream(Provider::ApiSports, "football", "/players?id=1", "k123", &bases()).is_none());
        assert!(upstream(Provider::ApiSports, "tennis", "/games", "k123", &bases()).is_none());
        assert!(upstream(Provider::ApiSports, "football", "/../fixtures", "k123", &bases()).is_none());
        assert!(upstream(Provider::ApiSports, "football", "/fixtures?x=<script>", "k123", &bases()).is_none());
        assert!(upstream(Provider::ApiSports, "hockey", "/fixtures", "k123", &bases()).is_none(), "hockey har /games, inte /fixtures");
    }

    #[test]
    fn rejects_empty_or_odd_keys() {
        assert!(upstream(Provider::ApiSports, "football", "/status", "", &bases()).is_none());
        assert!(upstream(Provider::ApiSports, "football", "/status", "ab cd", &bases()).is_none());
    }

    #[test]
    fn thesportsdb_v1_puts_key_in_path_and_v2_in_header() {
        let v1 = upstream(Provider::TheSportsDb, "football", "/v1/eventsday.php?d=2026-10-10&s=Soccer", "9999", &bases()).unwrap();
        assert_eq!(v1.url, "https://www.thesportsdb.com/api/v1/json/9999/eventsday.php?d=2026-10-10&s=Soccer");
        assert!(v1.headers.is_empty());
        assert_eq!(v1.bucket, "all");
        let v2 = upstream(Provider::TheSportsDb, "hockey", "/v2/livescore/icehockey", "9999", &bases()).unwrap();
        assert_eq!(v2.url, "https://www.thesportsdb.com/api/v2/json/livescore/icehockey");
        assert_eq!(v2.headers, vec![("x-api-key", "9999".to_string())]);
        assert!(upstream(Provider::TheSportsDb, "football", "/v2/lookup/player/1", "9999", &bases()).is_none());
        assert!(upstream(Provider::TheSportsDb, "football", "/v1/all_leagues.php", "9999", &bases()).is_none());
    }

    #[test]
    fn quota_headers_are_read_case_insensitively_by_name() {
        let h: std::collections::HashMap<&str, &str> = [
            ("x-ratelimit-requests-limit", "100"), ("x-ratelimit-requests-remaining", "41"),
            ("x-ratelimit-limit", "10"), ("x-ratelimit-remaining", "9"),
        ].into_iter().collect();
        let q = quota_from(|name| h.get(name).map(|v| v.to_string()));
        assert_eq!(q, HeaderQuota { day_limit: Some(100), day_remaining: Some(41), minute_limit: Some(10), minute_remaining: Some(9) });
    }

    #[test]
    fn classify_api_sports_errors_in_a_200_body() {
        assert_eq!(classify(Provider::ApiSports, 200, &json!({"errors": {"token": "Error/Missing application key."}, "response": []})), Verdict::Unauthorized);
        assert_eq!(classify(Provider::ApiSports, 200, &json!({"errors": {"requests": "You have reached the request limit for the day"}})), Verdict::Exhausted);
        assert_eq!(classify(Provider::ApiSports, 200, &json!({"errors": {"rateLimit": "Too many requests"}})), Verdict::RateLimited);
        assert_eq!(classify(Provider::ApiSports, 200, &json!({"errors": [], "response": []})), Verdict::Ok);
        assert_eq!(classify(Provider::ApiSports, 200, &json!({"errors": {"date": "bad format"}})), Verdict::Upstream);
    }

    #[test]
    fn classify_http_statuses() {
        assert_eq!(classify(Provider::TheSportsDb, 401, &Value::Null), Verdict::Unauthorized);
        assert_eq!(classify(Provider::TheSportsDb, 429, &Value::Null), Verdict::RateLimited);
        assert_eq!(classify(Provider::TheSportsDb, 502, &Value::Null), Verdict::Upstream);
        assert_eq!(classify(Provider::TheSportsDb, 200, &json!({"events": null})), Verdict::Ok);
    }

    #[test]
    fn status_quota_reads_used_limit_and_plan() {
        let body = json!({"response": {"subscription": {"plan": "Free", "active": true}, "requests": {"current": 12, "limit_day": 100}}});
        assert_eq!(status_quota(&body), Some((12, 100, "Free".to_string())));
        assert_eq!(status_quota(&json!({"response": []})), None);
    }

    #[test]
    fn next_utc_midnight() {
        // 2026-10-10T21:30:00Z → 2026-10-11T00:00:00Z
        assert_eq!(next_utc_midnight_ms(1_791_667_800_000), 1_791_676_800_000);
    }
}
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_fetch`
Expected: FAIL. Kompileringsfel: `upstream`, `Provider` med flera finns inte.

- [ ] **Step 3: Skriv den minsta implementationen** (överst i filen, ovanför testmodulen)

```rust
//! Sportlägets lokala genomkoppling (fas 2): `GET /api/live-tv/sport/fetch`.
//!
//! INGEN HOSTING. Koden körs i användarens egen app med användarens egen
//! nyckel. Den löser CORS, lägger på nyckelheadern, läser kvotheaders, för
//! en kvotbok som delas av alla klienter mot den här värden (TV, telefon via
//! LAN) och svarar ur en diskcache i `live-tv-sport/`. Pluginets kvothanterare
//! (`budget.ts`) bestämmer VILKA anrop som görs. Den här filen ser till att
//! inget slinker igenom när kvoten är slut, och att inget görs utan nyckel.

use serde_json::Value;

pub const DAY_MS: u64 = 86_400_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Provider { ApiSports, TheSportsDb }

impl Provider {
    pub fn parse(s: &str) -> Option<Provider> {
        match s {
            "api-sports" => Some(Provider::ApiSports),
            "thesportsdb" => Some(Provider::TheSportsDb),
            _ => None,
        }
    }
    pub fn id(self) -> &'static str {
        match self { Provider::ApiSports => "api-sports", Provider::TheSportsDb => "thesportsdb" }
    }
}

/// Bas-URL:er. Produktion = källornas riktiga värdar; tester pekar på wiremock.
/// `api_sports: Some(x)` ersätter `https://{värd}` för ALLA sporter.
#[derive(Clone, Debug)]
pub struct Bases { pub api_sports: Option<String>, pub thesportsdb: String }

impl Bases {
    pub fn real() -> Bases { Bases { api_sports: None, thesportsdb: "https://www.thesportsdb.com".into() } }
}

/// En värd per sport-API. Motorsport (formula-1) saknas med flit: en
/// race-modell utan hemma/borta ryms inte i fas 2 (se specgap i planen).
pub fn api_sports_host(sport: &str) -> Option<&'static str> {
    match sport {
        "football" => Some("v3.football.api-sports.io"),
        "hockey" => Some("v1.hockey.api-sports.io"),
        "basketball" => Some("v1.basketball.api-sports.io"),
        "handball" => Some("v1.handball.api-sports.io"),
        _ => None,
    }
}

fn tsdb_sport_ok(sport: &str) -> bool { matches!(sport, "football" | "hockey" | "basketball" | "handball") }

#[derive(Debug, PartialEq)]
pub struct Upstream {
    pub url: String,
    pub headers: Vec<(&'static str, String)>,
    /// Kvothinken. API-Sports: en per sport-API. TheSportsDB: en gemensam.
    pub bucket: String,
    /// `false` för API-Sports `status`, som inte räknas mot kvoten.
    pub counts: bool,
}

pub fn key_ok(key: &str) -> bool {
    (3..=128).contains(&key.len()) && key.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

fn query_ok(q: &str) -> bool {
    q.len() <= 300 && q.bytes().all(|b| b.is_ascii_alphanumeric() || b"=&_-:./%+".contains(&b))
}

fn seg_ok(s: &str) -> bool {
    !s.is_empty() && s.len() <= 80 && s != "." && s != ".." && s.bytes().all(|b| b.is_ascii_alphanumeric() || b"_-%.".contains(&b))
}

/// Exakt de anrop adaptrarna gör, och inget annat.
pub fn upstream(provider: Provider, sport: &str, path: &str, key: &str, bases: &Bases) -> Option<Upstream> {
    if !key_ok(key) || !path.starts_with('/') || path.contains("..") {
        return None;
    }
    let (route, query) = path.split_once('?').unwrap_or((path, ""));
    if !query_ok(query) {
        return None;
    }
    match provider {
        Provider::ApiSports => {
            let host = api_sports_host(sport)?;
            let allowed: &[&str] = if sport == "football" {
                &["/status", "/fixtures", "/standings", "/teams"]
            } else {
                &["/status", "/games", "/games/events", "/standings", "/teams"]
            };
            if !allowed.contains(&route) {
                return None;
            }
            let base = bases.api_sports.clone().unwrap_or_else(|| format!("https://{host}"));
            Some(Upstream {
                url: format!("{base}{path}"),
                headers: vec![("x-apisports-key", key.to_string())],
                bucket: sport.to_string(),
                counts: route != "/status",
            })
        }
        Provider::TheSportsDb => {
            if !tsdb_sport_ok(sport) {
                return None;
            }
            let segs: Vec<&str> = route.trim_start_matches('/').split('/').collect();
            let ok = match segs.as_slice() {
                ["v1", file] => matches!(*file, "eventsday.php" | "lookuptable.php" | "searchteams.php"),
                ["v2", "livescore", s] => seg_ok(s),
                ["v2", "lookup", kind, id] => {
                    matches!(*kind, "event" | "event_timeline" | "event_stats" | "event_lineup") && seg_ok(id)
                }
                ["v2", "all", "sports"] => true,
                _ => false,
            };
            if !ok {
                return None;
            }
            let qs = if query.is_empty() { String::new() } else { format!("?{query}") };
            let base = bases.thesportsdb.trim_end_matches('/');
            let (url, headers) = if segs[0] == "v1" {
                (format!("{base}/api/v1/json/{key}/{}{qs}", segs[1]), Vec::new())
            } else {
                (format!("{base}/api/v2/json/{}{qs}", segs[1..].join("/")), vec![("x-api-key", key.to_string())])
            };
            Some(Upstream { url, headers, bucket: "all".into(), counts: true })
        }
    }
}

#[derive(Debug, Default, PartialEq, Clone, Copy)]
pub struct HeaderQuota {
    pub day_limit: Option<u32>,
    pub day_remaining: Option<u32>,
    pub minute_limit: Option<u32>,
    pub minute_remaining: Option<u32>,
}

/// `get` får ett gement headernamn. Funktionen tar en closure och inte en
/// HeaderMap, så att reqwests och axums http-versioner aldrig behöver mötas.
pub fn quota_from(get: impl Fn(&str) -> Option<String>) -> HeaderQuota {
    let num = |name: &str| get(name).and_then(|v| v.trim().parse::<u32>().ok());
    HeaderQuota {
        day_limit: num("x-ratelimit-requests-limit"),
        day_remaining: num("x-ratelimit-requests-remaining"),
        minute_limit: num("x-ratelimit-limit"),
        minute_remaining: num("x-ratelimit-remaining"),
    }
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum Verdict { Ok, Unauthorized, Exhausted, RateLimited, Upstream }

/// API-Sports svarar 200 även vid fel nyckel eller slut kvot. Felet står i
/// `errors` (ett objekt). När allt gick bra är `errors` en tom lista.
pub fn classify(provider: Provider, http_status: u16, body: &Value) -> Verdict {
    match http_status {
        401 | 403 => return Verdict::Unauthorized,
        429 => return Verdict::RateLimited,
        s if s >= 400 => return Verdict::Upstream,
        _ => {}
    }
    if provider == Provider::ApiSports {
        if let Some(errors) = body.get("errors").and_then(Value::as_object) {
            if errors.contains_key("token") { return Verdict::Unauthorized; }
            if errors.contains_key("requests") { return Verdict::Exhausted; }
            if errors.contains_key("rateLimit") { return Verdict::RateLimited; }
            if !errors.is_empty() { return Verdict::Upstream; }
        }
    }
    Verdict::Ok
}

/// API-Sports `status`: `response.requests.{current,limit_day}` och `subscription.plan`.
pub fn status_quota(body: &Value) -> Option<(u32, u32, String)> {
    let r = body.get("response")?;
    let used = r.pointer("/requests/current")?.as_u64()? as u32;
    let limit = r.pointer("/requests/limit_day")?.as_u64()? as u32;
    let plan = r.pointer("/subscription/plan").and_then(Value::as_str).unwrap_or("").to_string();
    Some((used, limit, plan))
}

pub fn next_utc_midnight_ms(now_ms: u64) -> u64 { (now_ms / DAY_MS + 1) * DAY_MS }
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_fetch`
Expected: PASS (10 tester).

- [ ] **Step 5: Commit**

```bash
cd "$APP" && git add src-tauri/src/live_tv_sport_fetch.rs src-tauri/src/lib.rs
git commit -m "live-tv sport: passthrough allowlist, quota headers and body classification"
```

---

### Task 2: Kvotbok, diskcache och endpoints `/api/live-tv/sport/fetch` + `/quota`

**Files:**
- Modify: `$APP/src-tauri/src/live_tv_sport_fetch.rs`
- Modify: `$APP/src-tauri/src/axum_server.rs` (efter raden `.route("/api/live-tv/epg/search", ...)`, rad ~653)

**Interfaces:**
- Consumes: Task 1 (`upstream`, `quota_from`, `classify`, `status_quota`, `next_utc_midnight_ms`, `Bases`).
- Produces:
  - HTTP `GET /api/live-tv/sport/fetch?provider=&sport=&path=&ttl=&finalAfter=&mode=cache-first|cache-only`, med nyckeln i headern `x-lumio-sport-key`. Svaret är alltid 200 utom vid felaktig begäran (400 saknad nyckel eller okänd källa, 403 ej vitlistad sökväg, 503 ingen lagring):
    `{ "data": <json|null>, "cached": bool, "fresh": bool, "fetchedAt": ms|null, "quota": QuotaOut, "error": null|"unauthorized"|"exhausted"|"rate-limited"|"network"|"upstream" }`
  - `QuotaOut` (camelCase): `{ bucket, limit, remaining, minuteLimit, minuteRemaining, blockedUntil, reason, plan }`
  - HTTP `GET /api/live-tv/sport/quota?provider=` → `{ "buckets": QuotaOut[] }`
  - Rust: `pub struct Ledger`, `Ledger::admit/record/record_status/snapshot`, `pub fn is_fresh(fetched_at, now_ms, ttl_s: i64, final_after: Option<u64>) -> bool`, `pub async fn fetch_inner(ctx: &FetchCtx<'_>, q: &FetchQuery, key: Option<&str>, now_ms: u64) -> (StatusCode, Value)`

- [ ] **Step 1: Skriv de fallerande testerna** (lägg till i `mod tests`)

```rust
    use std::path::PathBuf;
    use wiremock::matchers::{method, path as wpath};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    const NOW: u64 = 1_791_667_800_000; // 2026-10-10T21:30:00Z

    fn q(path: &str, ttl: i64) -> FetchQuery {
        FetchQuery { provider: "api-sports".into(), sport: "football".into(), path: path.into(), ttl, final_after: None, mode: None }
    }

    async fn ctx_for(mock: &MockServer, dir: &std::path::Path) -> (Bases, tokio::sync::Mutex<Ledger>, PathBuf) {
        (Bases { api_sports: Some(mock.uri()), thesportsdb: mock.uri() }, tokio::sync::Mutex::new(Ledger::default()), dir.to_path_buf())
    }

    fn ok_body() -> serde_json::Value { json!({"errors": [], "results": 1, "response": [{"fixture": {"id": 1}}]}) }

    #[tokio::test]
    async fn two_clients_inside_live_ttl_hit_upstream_once() {
        let mock = MockServer::start().await;
        Mock::given(method("GET")).and(wpath("/fixtures"))
            .respond_with(ResponseTemplate::new(200).set_body_json(ok_body())
                .insert_header("x-ratelimit-requests-limit", "100").insert_header("x-ratelimit-requests-remaining", "41"))
            .expect(1).mount(&mock).await;
        let tmp = tempfile::tempdir().unwrap();
        let (bases, ledger, dir) = ctx_for(&mock, tmp.path()).await;
        let ctx = FetchCtx { dir: &dir, bases: &bases, ledger: &ledger, ledger_file: None };
        let (s1, a) = fetch_inner(&ctx, &q("/fixtures?live=all", 10), Some("k123"), NOW).await;
        let (s2, b) = fetch_inner(&ctx, &q("/fixtures?live=all", 10), Some("k123"), NOW + 4_000).await;
        assert_eq!((s1.as_u16(), s2.as_u16()), (200, 200));
        assert_eq!(a["cached"], false);
        assert_eq!(b["cached"], true);
        assert_eq!(b["fresh"], true);
        assert_eq!(b["quota"]["remaining"], 41);
    }

    #[tokio::test]
    async fn missing_key_never_calls_upstream() {
        let mock = MockServer::start().await;
        Mock::given(method("GET")).respond_with(ResponseTemplate::new(200).set_body_json(ok_body())).expect(0).mount(&mock).await;
        let tmp = tempfile::tempdir().unwrap();
        let (bases, ledger, dir) = ctx_for(&mock, tmp.path()).await;
        let ctx = FetchCtx { dir: &dir, bases: &bases, ledger: &ledger, ledger_file: None };
        let (status, _) = fetch_inner(&ctx, &q("/fixtures?date=2026-10-10", 900), None, NOW).await;
        assert_eq!(status.as_u16(), 400);
        let (status, _) = fetch_inner(&ctx, &q("/fixtures?date=2026-10-10", 900), Some("   "), NOW).await;
        assert_eq!(status.as_u16(), 400);
    }

    #[tokio::test]
    async fn exhausted_body_is_not_cached_and_blocks_until_utc_midnight() {
        let mock = MockServer::start().await;
        Mock::given(method("GET")).and(wpath("/fixtures"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({"errors": {"requests": "You have reached the request limit for the day"}, "response": []})))
            .expect(1).mount(&mock).await;
        let tmp = tempfile::tempdir().unwrap();
        let (bases, ledger, dir) = ctx_for(&mock, tmp.path()).await;
        let ctx = FetchCtx { dir: &dir, bases: &bases, ledger: &ledger, ledger_file: None };
        let (_, first) = fetch_inner(&ctx, &q("/fixtures?date=2026-10-10", 900), Some("k123"), NOW).await;
        assert_eq!(first["error"], "exhausted");
        assert_eq!(first["data"], serde_json::Value::Null);
        assert_eq!(first["quota"]["blockedUntil"], 1_791_676_800_000u64);
        // Andra anropet når aldrig uppströms (expect(1) ovan).
        let (_, second) = fetch_inner(&ctx, &q("/fixtures?date=2026-10-11", 900), Some("k123"), NOW + 1_000).await;
        assert_eq!(second["error"], "exhausted");
        assert!(read_cache(&cache_path(&dir, Provider::ApiSports, "football", "/fixtures?date=2026-10-10")).is_none());
    }

    #[tokio::test]
    async fn network_error_serves_stale_cache_with_error() {
        let tmp = tempfile::tempdir().unwrap();
        let dir = tmp.path().to_path_buf();
        write_cache(&cache_path(&dir, Provider::ApiSports, "football", "/fixtures?date=2026-10-10"), NOW - 3_600_000, &ok_body()).unwrap();
        let bases = Bases { api_sports: Some("http://127.0.0.1:9".into()), thesportsdb: "http://127.0.0.1:9".into() };
        let ledger = tokio::sync::Mutex::new(Ledger::default());
        let ctx = FetchCtx { dir: &dir, bases: &bases, ledger: &ledger, ledger_file: None };
        let (_, out) = fetch_inner(&ctx, &q("/fixtures?date=2026-10-10", 900), Some("k123"), NOW).await;
        assert_eq!(out["error"], "network");
        assert_eq!(out["cached"], true);
        assert_eq!(out["fresh"], false);
        assert_eq!(out["data"]["results"], 1);
    }

    #[tokio::test]
    async fn cache_only_miss_returns_null_without_upstream() {
        let mock = MockServer::start().await;
        Mock::given(method("GET")).respond_with(ResponseTemplate::new(200).set_body_json(ok_body())).expect(0).mount(&mock).await;
        let tmp = tempfile::tempdir().unwrap();
        let (bases, ledger, dir) = ctx_for(&mock, tmp.path()).await;
        let ctx = FetchCtx { dir: &dir, bases: &bases, ledger: &ledger, ledger_file: None };
        let mut query = q("/fixtures?date=2026-10-10", 900);
        query.mode = Some("cache-only".into());
        let (_, out) = fetch_inner(&ctx, &query, Some("k123"), NOW).await;
        assert_eq!(out["data"], serde_json::Value::Null);
        assert_eq!(out["error"], serde_json::Value::Null);
    }

    #[tokio::test]
    async fn status_call_sets_quota_without_spending() {
        let mock = MockServer::start().await;
        Mock::given(method("GET")).and(wpath("/status"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({"errors": [], "response": {"subscription": {"plan": "Free"}, "requests": {"current": 12, "limit_day": 100}}})))
            .mount(&mock).await;
        let tmp = tempfile::tempdir().unwrap();
        let (bases, ledger, dir) = ctx_for(&mock, tmp.path()).await;
        let ctx = FetchCtx { dir: &dir, bases: &bases, ledger: &ledger, ledger_file: None };
        let (_, out) = fetch_inner(&ctx, &q("/status", 0), Some("k123"), NOW).await;
        assert_eq!(out["quota"]["remaining"], 88);
        assert_eq!(out["quota"]["limit"], 100);
        assert_eq!(out["quota"]["plan"], "Free");
    }

    #[test]
    fn is_fresh_honours_ttl_forever_and_final_after() {
        assert!(is_fresh(NOW - 5_000, NOW, 10, None));
        assert!(!is_fresh(NOW - 15_000, NOW, 10, None));
        assert!(is_fresh(NOW - 99_999_999, NOW, -1, None));
        assert!(!is_fresh(NOW - 30_000, NOW, 0, None));
        // Igår, hämtat efter dygnets slut + 3 h: slutgiltigt.
        assert!(is_fresh(NOW - 50_000_000, NOW, 21_600, Some(NOW - 60_000_000)));
        assert!(!is_fresh(NOW - 50_000_000, NOW, 21_600, Some(NOW - 10_000_000)));
    }

    #[test]
    fn ledger_rolls_at_utc_midnight_and_releases_exhausted() {
        let mut l = Ledger::default();
        l.record("api-sports:football", HeaderQuota { day_limit: Some(100), day_remaining: Some(0), ..Default::default() }, Verdict::Ok, NOW);
        assert!(l.admit(Provider::ApiSports, "api-sports:football", true, NOW + 1_000).is_err());
        let after_midnight = next_utc_midnight_ms(NOW) + 1;
        assert!(l.admit(Provider::ApiSports, "api-sports:football", true, after_midnight).is_ok());
    }

    #[test]
    fn hockey_bucket_is_separate_from_football() {
        let mut l = Ledger::default();
        l.record("api-sports:football", HeaderQuota { day_limit: Some(100), day_remaining: Some(0), ..Default::default() }, Verdict::Ok, NOW);
        assert!(l.admit(Provider::ApiSports, "api-sports:hockey", true, NOW).is_ok());
    }

    #[test]
    fn minute_remaining_zero_blocks_for_sixty_seconds() {
        let mut l = Ledger::default();
        l.record("api-sports:football", HeaderQuota { minute_limit: Some(10), minute_remaining: Some(0), ..Default::default() }, Verdict::Ok, NOW);
        let err = l.admit(Provider::ApiSports, "api-sports:football", true, NOW + 1_000).unwrap_err();
        assert_eq!(err.reason, "rate-limited");
        assert!(l.admit(Provider::ApiSports, "api-sports:football", true, NOW + 61_000).is_ok());
    }

    #[test]
    fn thesportsdb_local_minute_cap() {
        let mut l = Ledger::default();
        for i in 0..TSDB_PER_MINUTE { assert!(l.admit(Provider::TheSportsDb, "thesportsdb:all", true, NOW + i as u64).is_ok()); }
        assert!(l.admit(Provider::TheSportsDb, "thesportsdb:all", true, NOW + 500).is_err());
        assert!(l.admit(Provider::TheSportsDb, "thesportsdb:all", true, NOW + 60_001).is_ok());
    }
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_fetch`
Expected: FAIL. Kompileringsfel: `FetchQuery`, `FetchCtx`, `Ledger`, `fetch_inner` med flera finns inte.

- [ ] **Step 3: Implementera** (lägg till i filen, ovanför testmodulen; utöka `use`-raderna)

```rust
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::axum_server::AxumState;

const DIR_NAME: &str = "live-tv-sport";
pub const TSDB_PER_MINUTE: u32 = 90; // källan tillåter 100/min; tio i marginal
static TMP_NONCE: AtomicU64 = AtomicU64::new(0);
static CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder().timeout(Duration::from_secs(15)).build().expect("reqwest-klient")
});

// ---- kvotbok ---------------------------------------------------------------

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BucketLedger {
    pub day: u64,
    pub limit: Option<u32>,
    pub remaining: Option<u32>,
    pub minute_limit: Option<u32>,
    pub minute_remaining: Option<u32>,
    pub minute_start: u64,
    pub minute_count: u32,
    pub blocked_until: Option<u64>,
    pub reason: Option<String>,
    pub plan: Option<String>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Ledger { pub buckets: HashMap<String, BucketLedger> }

#[derive(Debug)]
pub struct Blocked { pub reason: String, pub until: u64 }

impl Ledger {
    fn entry(&mut self, key: &str, now_ms: u64) -> &mut BucketLedger {
        let day = now_ms / DAY_MS;
        let b = self.buckets.entry(key.to_string()).or_default();
        if b.day != day {
            // Kvotdygnet slog om 00:00 UTC. Gränsen gäller fortfarande, och
            // "slut i dag" släpps utan att appen behöver startas om.
            b.day = day;
            b.remaining = b.limit;
            if b.reason.as_deref() == Some("exhausted") {
                b.blocked_until = None;
                b.reason = None;
            }
        }
        if b.blocked_until.is_some_and(|t| t <= now_ms) {
            b.blocked_until = None;
            b.reason = None;
        }
        if now_ms.saturating_sub(b.minute_start) >= 60_000 {
            b.minute_start = now_ms;
            b.minute_count = 0;
            b.minute_remaining = b.minute_limit;
        }
        b
    }

    /// Ok = anropet får gå uppströms (och är då bokfört lokalt). Err = spärrat.
    pub fn admit(&mut self, provider: Provider, key: &str, counts: bool, now_ms: u64) -> Result<(), Blocked> {
        let b = self.entry(key, now_ms);
        if let Some(until) = b.blocked_until {
            return Err(Blocked { reason: b.reason.clone().unwrap_or_else(|| "blocked".into()), until });
        }
        if !counts {
            return Ok(());
        }
        if b.remaining == Some(0) {
            let until = next_utc_midnight_ms(now_ms);
            b.blocked_until = Some(until);
            b.reason = Some("exhausted".into());
            return Err(Blocked { reason: "exhausted".into(), until });
        }
        if provider == Provider::TheSportsDb && b.minute_count >= TSDB_PER_MINUTE {
            return Err(Blocked { reason: "rate-limited".into(), until: b.minute_start + 60_000 });
        }
        b.minute_count += 1;
        // Lokal räkning mellan svaren; nästa svars header skriver över.
        if let Some(r) = b.remaining.as_mut() { *r = r.saturating_sub(1); }
        Ok(())
    }

    pub fn record(&mut self, key: &str, hq: HeaderQuota, verdict: Verdict, now_ms: u64) {
        let b = self.entry(key, now_ms);
        if hq.day_limit.is_some() { b.limit = hq.day_limit; }
        if hq.day_remaining.is_some() { b.remaining = hq.day_remaining; }
        if hq.minute_limit.is_some() { b.minute_limit = hq.minute_limit; }
        if hq.minute_remaining.is_some() { b.minute_remaining = hq.minute_remaining; }
        let exhausted = verdict == Verdict::Exhausted || hq.day_remaining == Some(0);
        let minute = verdict == Verdict::RateLimited || hq.minute_remaining == Some(0);
        if exhausted {
            b.remaining = Some(0);
            b.blocked_until = Some(next_utc_midnight_ms(now_ms));
            b.reason = Some("exhausted".into());
        } else if minute {
            b.blocked_until = Some(now_ms + 60_000);
            b.reason = Some("rate-limited".into());
        }
    }

    pub fn record_status(&mut self, key: &str, used: u32, limit: u32, plan: String, now_ms: u64) {
        let b = self.entry(key, now_ms);
        b.limit = Some(limit);
        b.remaining = Some(limit.saturating_sub(used));
        b.plan = Some(plan);
    }

    pub fn snapshot(&mut self, key: &str, now_ms: u64) -> Value {
        let bucket = key.split_once(':').map(|(_, b)| b).unwrap_or(key).to_string();
        let b = self.entry(key, now_ms).clone();
        json!({
            "bucket": bucket, "limit": b.limit, "remaining": b.remaining,
            "minuteLimit": b.minute_limit, "minuteRemaining": b.minute_remaining,
            "blockedUntil": b.blocked_until, "reason": b.reason, "plan": b.plan,
        })
    }
}

// ---- diskcache -------------------------------------------------------------

pub fn sport_dir(state: &AxumState) -> Option<PathBuf> {
    state.storage_path.as_ref().and_then(|p| p.parent().map(Path::to_path_buf)).map(|d| d.join(DIR_NAME))
}

/// Nyckeln ingår INTE i cachenyckeln: datan är offentlig, och ett nyckelbyte
/// ska inte kosta en ny hämtning.
pub fn cache_path(dir: &Path, provider: Provider, sport: &str, path: &str) -> PathBuf {
    let hash = Sha256::digest(format!("{}|{}|{}", provider.id(), sport, path).as_bytes());
    dir.join(format!("{:x}.json", hash))
}

#[derive(Serialize, Deserialize)]
struct CacheEntry { #[serde(rename = "fetchedAt")] fetched_at: u64, body: Value }

pub fn read_cache(path: &Path) -> Option<(u64, Value)> {
    let bytes = std::fs::read(path).ok()?;
    let e: CacheEntry = serde_json::from_slice(&bytes).ok()?;
    Some((e.fetched_at, e.body))
}

pub fn write_cache(path: &Path, fetched_at: u64, body: &Value) -> Result<(), String> {
    let dir = path.parent().ok_or("no parent")?;
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let tmp = path.with_extension(format!("json.tmp-{}-{}", std::process::id(), TMP_NONCE.fetch_add(1, Ordering::Relaxed)));
    let bytes = serde_json::to_vec(&CacheEntry { fetched_at, body: body.clone() }).map_err(|e| e.to_string())?;
    if let Err(e) = std::fs::write(&tmp, bytes) { let _ = std::fs::remove_file(&tmp); return Err(e.to_string()); }
    std::fs::rename(&tmp, path).map_err(|e| { let _ = std::fs::remove_file(&tmp); e.to_string() })
}

/// `ttl_s < 0` = för alltid (avslutad fixtur). `final_after` = en post som
/// hämtats efter den tidpunkten är slutgiltig (Igår efter dygnets slut + 3 h).
pub fn is_fresh(fetched_at: u64, now_ms: u64, ttl_s: i64, final_after: Option<u64>) -> bool {
    if final_after.is_some_and(|f| fetched_at >= f) { return true; }
    if ttl_s < 0 { return true; }
    now_ms.saturating_sub(fetched_at) < (ttl_s as u64).saturating_mul(1000)
}

// ---- handlare --------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct FetchQuery {
    pub provider: String,
    pub sport: String,
    pub path: String,
    #[serde(default)]
    pub ttl: i64,
    #[serde(default, rename = "finalAfter")]
    pub final_after: Option<u64>,
    #[serde(default)]
    pub mode: Option<String>,
}

pub struct FetchCtx<'a> {
    pub dir: &'a Path,
    pub bases: &'a Bases,
    pub ledger: &'a tokio::sync::Mutex<Ledger>,
    pub ledger_file: Option<PathBuf>,
}

fn out(data: Option<(u64, Value)>, fresh: bool, cached: bool, quota: Value, error: Option<&str>) -> (StatusCode, Value) {
    let (fetched_at, body) = match data { Some((at, b)) => (Some(at), b), None => (None, Value::Null) };
    (StatusCode::OK, json!({ "data": body, "cached": cached, "fresh": fresh, "fetchedAt": fetched_at, "quota": quota, "error": error }))
}

fn save_ledger(ledger: &Ledger, file: &Option<PathBuf>) {
    if let Some(file) = file {
        if let Ok(bytes) = serde_json::to_vec(ledger) {
            if let Some(dir) = file.parent() { let _ = std::fs::create_dir_all(dir); }
            let _ = std::fs::write(file, bytes);
        }
    }
}

fn verdict_code(v: Verdict) -> &'static str {
    match v {
        Verdict::Unauthorized => "unauthorized",
        Verdict::Exhausted => "exhausted",
        Verdict::RateLimited => "rate-limited",
        Verdict::Upstream => "upstream",
        Verdict::Ok => "ok",
    }
}

pub async fn fetch_inner(ctx: &FetchCtx<'_>, q: &FetchQuery, key: Option<&str>, now_ms: u64) -> (StatusCode, Value) {
    let Some(provider) = Provider::parse(&q.provider) else {
        return (StatusCode::BAD_REQUEST, json!({ "error": "unknown-provider" }));
    };
    // Ingen nyckel → inget anrop. Aldrig.
    let Some(key) = key.map(str::trim).filter(|k| !k.is_empty()) else {
        return (StatusCode::BAD_REQUEST, json!({ "error": "key-required" }));
    };
    let Some(up) = upstream(provider, &q.sport, &q.path, key, ctx.bases) else {
        return (StatusCode::FORBIDDEN, json!({ "error": "not-allowed" }));
    };
    let ledger_key = format!("{}:{}", provider.id(), up.bucket);
    let cpath = cache_path(ctx.dir, provider, &q.sport, &q.path);
    let cached = read_cache(&cpath);
    let fresh = cached.as_ref().is_some_and(|(at, _)| is_fresh(*at, now_ms, q.ttl, q.final_after));
    if fresh || q.mode.as_deref() == Some("cache-only") {
        let quota = ctx.ledger.lock().await.snapshot(&ledger_key, now_ms);
        let has = cached.is_some();
        return out(cached, fresh, has, quota, None);
    }
    {
        let mut l = ctx.ledger.lock().await;
        let admitted = l.admit(provider, &ledger_key, up.counts, now_ms);
        save_ledger(&l, &ctx.ledger_file);
        if let Err(blocked) = admitted {
            let quota = l.snapshot(&ledger_key, now_ms);
            let has = cached.is_some();
            let reason = if blocked.reason == "exhausted" { "exhausted" } else { "rate-limited" };
            return out(cached, false, has, quota, Some(reason));
        }
    }
    let mut req = CLIENT.get(&up.url);
    for (name, value) in &up.headers { req = req.header(*name, value); }
    let response = match req.send().await {
        Ok(r) => r,
        Err(_) => {
            let quota = ctx.ledger.lock().await.snapshot(&ledger_key, now_ms);
            let has = cached.is_some();
            return out(cached, false, has, quota, Some("network"));
        }
    };
    let status = response.status().as_u16();
    let hq = quota_from(|name| response.headers().get(name).and_then(|v| v.to_str().ok()).map(str::to_string));
    let body: Value = response.json().await.unwrap_or(Value::Null);
    let verdict = classify(provider, status, &body);
    let quota = {
        let mut l = ctx.ledger.lock().await;
        l.record(&ledger_key, hq, verdict, now_ms);
        if provider == Provider::ApiSports && q.path.starts_with("/status") && verdict == Verdict::Ok {
            if let Some((used, limit, plan)) = status_quota(&body) { l.record_status(&ledger_key, used, limit, plan, now_ms); }
        }
        save_ledger(&l, &ctx.ledger_file);
        l.snapshot(&ledger_key, now_ms)
    };
    if verdict == Verdict::Ok {
        let _ = write_cache(&cpath, now_ms, &body);
        return out(Some((now_ms, body)), true, false, quota, None);
    }
    // Felkroppar cachas aldrig. Senaste goda posten följer med.
    let has = cached.is_some();
    out(cached, false, has, quota, Some(verdict_code(verdict)))
}

static LEDGER: Lazy<tokio::sync::Mutex<Ledger>> = Lazy::new(|| tokio::sync::Mutex::new(Ledger::default()));
static LEDGER_LOADED: AtomicBool = AtomicBool::new(false);

async fn global_ledger(dir: &Path) -> PathBuf {
    let file = dir.join("quota.json");
    if !LEDGER_LOADED.swap(true, Ordering::SeqCst) {
        if let Ok(bytes) = std::fs::read(&file) {
            if let Ok(saved) = serde_json::from_slice::<Ledger>(&bytes) { *LEDGER.lock().await = saved; }
        }
    }
    file
}

fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

pub async fn fetch_handler(State(state): State<Arc<AxumState>>, headers: HeaderMap, Query(q): Query<FetchQuery>) -> Response {
    let Some(dir) = sport_dir(&state) else {
        return (StatusCode::SERVICE_UNAVAILABLE, Json(json!({ "error": "no-storage" }))).into_response();
    };
    let file = global_ledger(&dir).await;
    let key = headers.get("x-lumio-sport-key").and_then(|v| v.to_str().ok()).map(str::to_string);
    let bases = Bases::real();
    let ctx = FetchCtx { dir: &dir, bases: &bases, ledger: &LEDGER, ledger_file: Some(file) };
    let (status, body) = fetch_inner(&ctx, &q, key.as_deref(), now_ms()).await;
    (status, Json(body)).into_response()
}

#[derive(Debug, Deserialize)]
pub struct QuotaQuery { pub provider: String }

pub async fn quota_handler(State(state): State<Arc<AxumState>>, Query(q): Query<QuotaQuery>) -> Response {
    let Some(dir) = sport_dir(&state) else {
        return (StatusCode::SERVICE_UNAVAILABLE, Json(json!({ "error": "no-storage" }))).into_response();
    };
    let Some(provider) = Provider::parse(&q.provider) else {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "unknown-provider" }))).into_response();
    };
    global_ledger(&dir).await;
    let prefix = format!("{}:", provider.id());
    let mut l = LEDGER.lock().await;
    let keys: Vec<String> = l.buckets.keys().filter(|k| k.starts_with(&prefix)).cloned().collect();
    let now = now_ms();
    let buckets: Vec<Value> = keys.iter().map(|k| l.snapshot(k, now)).collect();
    Json(json!({ "buckets": buckets })).into_response()
}
```

I `axum_server.rs`, efter `.route("/api/live-tv/epg/search", ...)`:

```rust
        .route("/api/live-tv/sport/fetch", get(crate::live_tv_sport_fetch::fetch_handler))
        .route("/api/live-tv/sport/quota", get(crate::live_tv_sport_fetch::quota_handler))
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_fetch`
Expected: PASS (21 tester). Kör också `cargo build` för att se att routerkopplingen kompilerar (`State<Arc<AxumState>>` är samma form som `live_tv_epg::now_handler`).

- [ ] **Step 5: Commit**

```bash
cd "$APP" && git add src-tauri/src/live_tv_sport_fetch.rs src-tauri/src/axum_server.rs
git commit -m "live-tv sport: local passthrough with shared quota ledger and disk cache"
```

---

### Task 3: `POST /api/live-tv/sport/link`: fixtur ↔ EPG-match

**Files:**
- Create: `$APP/src-tauri/src/live_tv_sport_link.rs`
- Modify: `$APP/src-tauri/src/lib.rs` (`pub mod live_tv_sport_link;`), `$APP/src-tauri/src/axum_server.rs` (rutt efter `/sport/quota`)
- Modify: `$APP/src-tauri/src/live_tv_sport.rs` (fas 1: `parse_day`, `now_ms` och `collect_entries` blir `pub(crate)`)

**Interfaces:**
- Consumes: fas 1 `crate::live_tv_sport::{team_key, keys_match, parse_day, now_ms, collect_entries, group_entries, SportKind}` (de tre mellersta görs `pub(crate)` i Step 3), `live_tv_epg::sport_ready_store`, `live_tv_index::shared` (se "Gränssnitt från fas 1 (avstämda)").
- Produces:
  - HTTP `POST /api/live-tv/sport/link`, body `{ listId: string /* pluginets globala EPG-id, som /sport/day */, day: "YYYY-MM-DD", tzOffset: number /* minuter öster om UTC den dagen, som /sport/day */, fixtures: [{ id, sport, home, away, league, kickoff /*ms*/ }] }` → `{ links: { [fixtureId]: { matchId: string, swapped: bool } | null } }`
  - Rust: `pub fn team_keys_match(a: &str, b: &str) -> bool` (båda redan normaliserade), `pub fn link(fixtures: &[LinkFixture], epg: &[Candidate]) -> HashMap<String, Option<(String, bool)>>`

Obs (efter fas 1-fixar): `collect_entries` tar nu `&[(String, LiveTvChannel)]` från `sport_candidates(&index, store, from, to)` (under läslåset), och `day_handler` kör `collect_entries` + `group_entries` i `tokio::task::spawn_blocking`. `candidates()` nedan ska göra likadant, och `sport_candidates` blir också `pub(crate)`.

Fönstret är "förstudio −15/+60 min": EPG-programmet får börja upp till 60 min före avspark (förstudio) och högst 15 min efter. Live går före repris. Varje EPG-match kopplas till högst en fixtur, och den närmaste i tid vinner.

- [ ] **Step 1: Skriv de fallerande testerna**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    const KO: i64 = 1_791_660_600_000; // 2026-10-10T19:30:00Z

    fn fx(id: &str, sport: &str, home: &str, away: &str) -> LinkFixture {
        LinkFixture { id: id.into(), sport: sport.into(), home: home.into(), away: away.into(), league: String::new(), kickoff: KO }
    }
    fn cand(id: &str, sport: &str, home: &str, away: &str, start: i64, rerun: bool) -> Candidate {
        Candidate { id: id.into(), sport: sport.into(), home_key: home.into(), away_key: away.into(), start, rerun }
    }

    #[test]
    fn team_keys_match_rules() {
        assert!(team_keys_match("djurgarden", "djurgardens"));      // genitiv-s
        assert!(team_keys_match("ifk goteborg", "goteborg"));        // ord-suffix
        assert!(team_keys_match("man utd", "manchester united"));    // alias
        assert!(team_keys_match("frolunda", "frolunda"));
        assert!(!team_keys_match("ais", "aik"));
        assert!(!team_keys_match("", "aik"));
        assert!(!team_keys_match("city", "manchester city"), "för kort för suffixregeln");
    }

    #[test]
    fn links_same_order_and_swapped_order() {
        let epg = vec![
            cand("m1", "football", "malmo", "djurgarden", KO - 15 * 60_000, false),
            cand("m2", "hockey", "lulea", "frolunda", KO, false),
        ];
        let fixtures = vec![fx("1001", "football", "malmo", "djurgardens"), fx("2002", "hockey", "frolunda", "lulea")];
        let out = link(&fixtures, &epg);
        assert_eq!(out["1001"], Some(("m1".to_string(), false)));
        assert_eq!(out["2002"], Some(("m2".to_string(), true)));
    }

    #[test]
    fn window_is_minus_60_plus_15_minutes() {
        let fixtures = vec![fx("1", "football", "malmo", "aik")];
        assert!(link(&fixtures, &[cand("early", "football", "malmo", "aik", KO - 60 * 60_000, false)])["1"].is_some());
        assert!(link(&fixtures, &[cand("tooearly", "football", "malmo", "aik", KO - 61 * 60_000, false)])["1"].is_none());
        assert!(link(&fixtures, &[cand("late", "football", "malmo", "aik", KO + 15 * 60_000, false)])["1"].is_some());
        assert!(link(&fixtures, &[cand("toolate", "football", "malmo", "aik", KO + 16 * 60_000, false)])["1"].is_none());
    }

    #[test]
    fn live_beats_rerun_and_each_epg_match_is_used_once() {
        let epg = vec![
            cand("rerun", "football", "malmo", "aik", KO, true),
            cand("live", "football", "malmo", "aik", KO - 10 * 60_000, false),
        ];
        let fixtures = vec![fx("1", "football", "malmo", "aik"), fx("2", "football", "malmo", "aik")];
        let out = link(&fixtures, &epg);
        assert_eq!(out["1"], Some(("live".to_string(), false)));
        assert_eq!(out["2"], Some(("rerun".to_string(), false)));
    }

    #[test]
    fn other_sport_in_epg_is_accepted_but_a_different_known_sport_is_not() {
        let fixtures = vec![fx("1", "hockey", "lulea", "frolunda")];
        assert!(link(&fixtures, &[cand("x", "other", "lulea", "frolunda", KO, false)])["1"].is_some());
        assert!(link(&fixtures, &[cand("x", "football", "lulea", "frolunda", KO, false)])["1"].is_none());
    }
}
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_link`
Expected: FAIL. Kompileringsfel: modulens funktioner saknas.

- [ ] **Step 3: Implementera**

```rust
//! Koppling mellan källans fixturer och fas 1:s EPG-matcher (`/sport/day`).
//! Normaliseringen finns på ETT ställe: här och i `live_tv_sport`.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Map, Value};

use crate::axum_server::AxumState;
use crate::live_tv_epg;
use crate::live_tv_index;
use crate::live_tv_sport::{self, keys_match, team_key};

const BEFORE_MS: i64 = 60 * 60_000; // förstudio
const AFTER_MS: i64 = 15 * 60_000;

/// Källans korta namn → EPG:ns (båda sidor redan normaliserade). Utökas efter
/// verkliga missar; varje rad ska ha ett testfall.
const ALIASES: &[(&str, &str)] = &[
    ("man utd", "manchester united"),
    ("man united", "manchester united"),
    ("man city", "manchester city"),
    ("spurs", "tottenham hotspur"),
    ("tottenham", "tottenham hotspur"),
    ("wolves", "wolverhampton wanderers"),
    ("psg", "paris saint germain"),
    ("inter", "internazionale"),
    ("bayern munchen", "bayern munich"),
    ("lulea hockey", "lulea"),
    ("hv 71", "hv71"),
];

fn canonical(s: &str) -> &str {
    ALIASES.iter().find(|(from, _)| *from == s).map(|(_, to)| *to).unwrap_or(s)
}

/// Fas 1:s `keys_match` (lika, genitiv-s, kortform = början/slut av den långa) med alias före
/// och ett golv: den korta formen måste vara minst fem tecken, så att "city" inte räcker till
/// "manchester city". Kopplingen är strängare än grupperingen eftersom den bara har lagen att gå på.
pub fn team_keys_match(a: &str, b: &str) -> bool {
    let (a, b) = (canonical(a), canonical(b));
    if a.is_empty() || b.is_empty() { return false; }
    if a == b { return true; }
    a.len().min(b.len()) >= 5 && keys_match(a, b)
}

#[derive(Debug, Deserialize, Clone)]
pub struct LinkFixture { pub id: String, pub sport: String, pub home: String, pub away: String, #[serde(default)] pub league: String, pub kickoff: i64 }

#[derive(Debug, Clone)]
pub struct Candidate { pub id: String, pub sport: String, pub home_key: String, pub away_key: String, pub start: i64, pub rerun: bool }

fn sport_ok(fixture: &str, epg: &str) -> bool { epg == fixture || epg == "other" || epg.is_empty() }

fn in_window(kickoff: i64, start: i64) -> bool {
    start + BEFORE_MS >= kickoff && start <= kickoff + AFTER_MS
}

/// Fixturernas lagnamn normaliseras här med fas 1:s `team_key`, samma funktion som EPG:n.
pub fn link(fixtures: &[LinkFixture], epg: &[Candidate]) -> HashMap<String, Option<(String, bool)>> {
    let mut used: HashSet<&str> = HashSet::new();
    let mut out = HashMap::new();
    for f in fixtures {
        let (h, a) = (team_key(&f.home), team_key(&f.away));
        let best = epg.iter()
            .filter(|c| !used.contains(c.id.as_str()) && sport_ok(&f.sport, &c.sport) && in_window(f.kickoff, c.start))
            .filter_map(|c| {
                if team_keys_match(&h, &c.home_key) && team_keys_match(&a, &c.away_key) { Some((c, false)) }
                else if team_keys_match(&h, &c.away_key) && team_keys_match(&a, &c.home_key) { Some((c, true)) }
                else { None }
            })
            .min_by_key(|(c, _)| (c.rerun, c.start.abs_diff(f.kickoff)));
        match best {
            Some((c, swapped)) => { used.insert(c.id.as_str()); out.insert(f.id.clone(), Some((c.id.clone(), swapped))); }
            None => { out.insert(f.id.clone(), None); }
        }
    }
    out
}

#[derive(Debug, Deserialize)]
pub struct LinkBody { #[serde(rename = "listId")] pub list_id: String, pub day: String, #[serde(rename = "tzOffset")] pub tz_offset: i32, pub fixtures: Vec<LinkFixture> }

fn kind_name(kind: live_tv_sport::SportKind) -> String {
    serde_json::to_value(kind).ok().and_then(|v| v.as_str().map(str::to_string)).unwrap_or_default()
}

/// Dagens grupperade EPG-matcher som kopplingskandidater: fas 1:s `collect_entries` och
/// `group_entries`, samma fönster som `/sport/day`. Matcher utan båda lagnycklarna (event) kan inte kopplas.
async fn candidates(state: &AxumState, list_id: &str, day: &str, tz_offset: i32) -> Vec<Candidate> {
    let Some(day_num) = live_tv_sport::parse_day(day) else { return Vec::new() };
    let tz = tz_offset.clamp(-14 * 60, 14 * 60);
    let at = live_tv_sport::now_ms();
    let from = day_num * 86_400_000 - tz as i64 * 60_000;
    let to = from + 86_400_000;
    let store = live_tv_epg::sport_ready_store(state, list_id).await;
    let index = live_tv_index::shared(state);
    let entries = {
        let guard = index.read().await;
        live_tv_sport::collect_entries(&guard, store.as_deref(), from, to, at, tz)
    };
    live_tv_sport::group_entries(entries, at)
        .into_iter()
        .filter_map(|m| Some(Candidate { id: m.id, sport: kind_name(m.kind), home_key: m.home_key?, away_key: m.away_key?, start: m.start, rerun: m.rerun }))
        .collect()
}

pub async fn link_handler(State(state): State<Arc<AxumState>>, Json(body): Json<LinkBody>) -> Response {
    if body.fixtures.len() > 2_000 {
        return (StatusCode::PAYLOAD_TOO_LARGE, Json(json!({ "error": "too-many-fixtures" }))).into_response();
    }
    let candidates = candidates(&state, body.list_id.trim(), &body.day, body.tz_offset).await;
    let links = link(&body.fixtures, &candidates);
    let mut map = Map::new();
    for (id, l) in links {
        map.insert(id, match l { Some((m, swapped)) => json!({ "matchId": m, "swapped": swapped }), None => Value::Null });
    }
    Json(json!({ "links": map })).into_response()
}
```

I `live_tv_sport.rs` (fas 1): gör `fn parse_day`, `fn now_ms` och `fn collect_entries` till `pub(crate) fn`. Inget annat i filen ändras.

Rutt i `axum_server.rs`:

```rust
        .route("/api/live-tv/sport/link", axum::routing::post(crate::live_tv_sport_link::link_handler))
```

Testerna i Step 1 ger redan normaliserade nycklar. Kolla att fas 1:s `team_key("djurgardens")` ger `"djurgardens"`, det vill säga är idempotent på normaliserad text. Om den inte är det ska testet anropa `team_key` på båda sidor, så att testet följer produktionsvägen. Kopplingen frågar `/sport/day`-samlingen direkt (`collect_entries` och `group_entries`), så en match utan båda lagnycklarna, till exempel en eventkanal, kan aldrig kopplas.

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_link`
Expected: PASS (5 tester).

- [ ] **Step 5: Commit**

```bash
cd "$APP" && git add src-tauri/src/live_tv_sport_link.rs src-tauri/src/live_tv_sport.rs src-tauri/src/lib.rs src-tauri/src/axum_server.rs
git commit -m "live-tv sport: link provider fixtures to EPG matches"
```

---

### Task 4: Nyckelöverlämning från telefonen (QR via Soffläges port 3012) + synkbevis

**Files:**
- Create: `$APP/src-tauri/src/live_tv_sport_key.rs`
- Modify: `$APP/src-tauri/src/lib.rs` (`pub mod live_tv_sport_key;`)
- Modify: `$APP/src-tauri/src/axum_server.rs` (två värdrutter)
- Modify: `$APP/src-tauri/src/couch/phone_routes.rs` (`router()`: `.merge(crate::live_tv_sport_key::phone_router())`)
- Modify: `$APP/src-tauri/src/couch/host_routes.rs` (`async fn ensure_listener` → `pub(crate) async fn ensure_listener`)
- Modify: `$APP/src-tauri/src/haptics/server.rs` (`needed()`)
- Modify: `$APP/lib/__tests__/sync-key-selection.test.ts`

**Interfaces:**
- Consumes: `crate::device_transfer::{is_local_peer, forbidden}`, `crate::axum_server::{detect_lan_ipv4, local_mdns_host}`, `crate::haptics::server::HAPTIC_PORT`, `crate::couch::host_routes::ensure_listener`.
- Produces:
  - 3011 (bara lokal peer): `POST /api/live-tv/sport/key-handoff` → `{ code: string, url: string | null, expiresAt: ms }`. `GET /api/live-tv/sport/key-handoff?code=` → `{ state: "waiting"|"received"|"expired", key?: string }` (engångs: `received` tömmer posten). `DELETE /api/live-tv/sport/key-handoff?code=` → `{ ok: true }`
  - 3012 (telefonen): `GET /sport-key?c=<code>` → HTML-sida. `POST /sport-key` med `{ c, key }` → `{ ok: true }` eller `{ error }`
  - Rust: `pub fn window_open() -> bool` (för `needed()`)

- [ ] **Step 1: Skriv de fallerande testerna**

Rust (i den nya filen):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};

    #[test]
    fn handoff_round_trip_is_one_shot() {
        let mut s = Store::default();
        let t0 = Instant::now();
        let code = s.create(t0);
        assert_eq!(code.len(), 16);
        assert!(matches!(s.take(&code, t0), Take::Waiting));
        s.submit(&code, "  abcdef0123456789\n", t0).unwrap();
        assert!(matches!(s.take(&code, t0), Take::Received(ref k) if k == "abcdef0123456789"));
        assert!(matches!(s.take(&code, t0), Take::Expired), "engångs");
    }

    #[test]
    fn expires_after_ten_minutes_and_rejects_bad_input() {
        let mut s = Store::default();
        let t0 = Instant::now();
        let code = s.create(t0);
        assert_eq!(s.submit(&code, "bad key!", t0), Err(SubmitError::Invalid));
        assert_eq!(s.submit("0000000000000000", "abc123", t0), Err(SubmitError::Unknown));
        let later = t0 + Duration::from_secs(601);
        assert_eq!(s.submit(&code, "abc123", later), Err(SubmitError::Unknown));
        assert!(matches!(s.take(&code, later), Take::Expired));
        assert!(!s.open(later));
    }

    #[test]
    fn page_contains_form_and_no_external_resources() {
        assert!(PAGE.contains("<form"));
        assert!(!PAGE.contains("http://") && !PAGE.contains("https://"));
    }
}
```

App-vitest (`$APP/lib/__tests__/sync-key-selection.test.ts`, nytt `it` i filens befintliga `describe`, eller i ett eget `describe` om filen saknar ett som passar):

```ts
import { describe, expect, it } from 'vitest'
import { isSyncableKey } from '@/lib/sync/keys'

describe('sportlägets nyckel', () => {
  it('sport_settings_v1 synkas, även profilskopad', () => {
    expect(isSyncableKey('plugin:com.lumio.live-tv:sport_settings_v1')).toBe(true)
    expect(isSyncableKey('profile:p1:plugin:com.lumio.live-tv:sport_settings_v1')).toBe(true)
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_key`
Expected: FAIL. Modulen finns inte.
Run: `cd "$APP" && npx vitest run lib/__tests__/sync-key-selection.test.ts`
Expected: PASS direkt. Testet är ett **bevis**: det låser beteendet och ska inte drivas av ny kod. Om det faller (för att nyckeln utesluts) ska utkastet stanna och Jerry tillfrågas. Undantagslistan ska inte ändras utan klartecken.

- [ ] **Step 3: Implementera**

```rust
//! Sportnyckeln från telefonen till TV:n. TV:n visar en QR med en kod.
//! Telefonen (samma LAN, Soffläges port 3012) öppnar sidan, klistrar in och
//! skickar. TV:n pollar lokalt på 3011 medan kortet är öppet. Koden gäller i
//! 10 min, en gång. Nyckeln skrivs aldrig till disk eller logg här.
//! Pluginet validerar och sparar den.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use axum::extract::{ConnectInfo, Query};
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use once_cell::sync::Lazy;
use rand::RngCore;
use serde::Deserialize;
use serde_json::json;

use crate::device_transfer::{forbidden, is_local_peer};

const TTL: Duration = Duration::from_secs(600);

#[derive(Default)]
pub struct Store { pending: HashMap<String, (Instant, Option<String>)> }

#[derive(Debug, PartialEq)]
pub enum SubmitError { Unknown, Invalid }

pub enum Take { Waiting, Received(String), Expired }

impl Store {
    fn prune(&mut self, now: Instant) { self.pending.retain(|_, (t, _)| now.duration_since(*t) < TTL); }
    pub fn create(&mut self, now: Instant) -> String {
        self.prune(now);
        let mut bytes = [0u8; 8];
        rand::thread_rng().fill_bytes(&mut bytes);
        let code = hex::encode(bytes);
        self.pending.insert(code.clone(), (now, None));
        code
    }
    pub fn submit(&mut self, code: &str, raw: &str, now: Instant) -> Result<(), SubmitError> {
        self.prune(now);
        let key: String = raw.chars().filter(|c| !c.is_whitespace()).collect();
        let entry = self.pending.get_mut(code).ok_or(SubmitError::Unknown)?;
        if !crate::live_tv_sport_fetch::key_ok(&key) { return Err(SubmitError::Invalid); }
        entry.1 = Some(key);
        Ok(())
    }
    pub fn take(&mut self, code: &str, now: Instant) -> Take {
        self.prune(now);
        match self.pending.get(code) {
            None => Take::Expired,
            Some((_, None)) => Take::Waiting,
            Some((_, Some(_))) => {
                let (_, key) = self.pending.remove(code).expect("finns");
                Take::Received(key.expect("satt"))
            }
        }
    }
    pub fn cancel(&mut self, code: &str) { self.pending.remove(code); }
    pub fn open(&mut self, now: Instant) -> bool { self.prune(now); !self.pending.is_empty() }
}

static STORE: Lazy<Mutex<Store>> = Lazy::new(|| Mutex::new(Store::default()));
static SUBMITS: Lazy<Mutex<HashMap<std::net::IpAddr, Vec<Instant>>>> = Lazy::new(|| Mutex::new(HashMap::new()));

pub fn window_open() -> bool { STORE.lock().map(|mut s| s.open(Instant::now())).unwrap_or(false) }

fn submit_allowed(ip: std::net::IpAddr, now: Instant) -> bool {
    let Ok(mut map) = SUBMITS.lock() else { return true };
    let tries = map.entry(ip).or_default();
    tries.retain(|t| now.duration_since(*t) < TTL);
    if tries.len() >= 10 { return false; }
    tries.push(now);
    true
}

#[derive(Deserialize)]
pub struct CodeQuery { #[serde(default)] pub code: String }

pub async fn host_create(ConnectInfo(peer): ConnectInfo<SocketAddr>, headers: HeaderMap) -> Response {
    if !is_local_peer(&peer, &headers) { return forbidden(); }
    let code = STORE.lock().map(|mut s| s.create(Instant::now())).unwrap_or_default();
    let _ = crate::couch::host_routes::ensure_listener().await;
    let host = crate::axum_server::detect_lan_ipv4().or_else(crate::axum_server::local_mdns_host);
    let url = host.map(|h| format!("http://{h}:{}/sport-key?c={code}", crate::haptics::server::HAPTIC_PORT));
    let expires = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64 + TTL.as_millis() as u64).unwrap_or(0);
    Json(json!({ "code": code, "url": url, "expiresAt": expires })).into_response()
}

pub async fn host_poll(ConnectInfo(peer): ConnectInfo<SocketAddr>, headers: HeaderMap, Query(q): Query<CodeQuery>) -> Response {
    if !is_local_peer(&peer, &headers) { return forbidden(); }
    let take = STORE.lock().map(|mut s| s.take(&q.code, Instant::now())).unwrap_or(Take::Expired);
    let body = match take {
        Take::Waiting => json!({ "state": "waiting" }),
        Take::Received(key) => json!({ "state": "received", "key": key }),
        Take::Expired => json!({ "state": "expired" }),
    };
    let mut res = Json(body).into_response();
    res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    res
}

pub async fn host_cancel(ConnectInfo(peer): ConnectInfo<SocketAddr>, headers: HeaderMap, Query(q): Query<CodeQuery>) -> Response {
    if !is_local_peer(&peer, &headers) { return forbidden(); }
    if let Ok(mut s) = STORE.lock() { s.cancel(&q.code); }
    crate::haptics::server::stop_if_unneeded();
    Json(json!({ "ok": true })).into_response()
}

pub const PAGE: &str = r#"<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lumio · Sportnyckel</title>
<style>body{margin:0;font:16px system-ui,sans-serif;background:#0e0f13;color:#e8e8ec;display:flex;min-height:100vh;align-items:center;justify-content:center}main{width:min(420px,100% - 32px)}h1{font-size:20px;margin:0 0 8px}p{color:#8b8e99;margin:0 0 16px}textarea{width:100%;box-sizing:border-box;min-height:88px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:inherit;font:14px ui-monospace,monospace;padding:12px}button{margin-top:12px;width:100%;min-height:48px;border:0;border-radius:10px;background:#e8e8ec;color:#0e0f13;font-weight:600;font-size:16px}#s{margin-top:12px;min-height:20px}</style></head>
<body><main><h1>Klistra in nyckel</h1><p>Nyckeln skickas till Lumio på TV:n. TV:n kontrollerar den direkt.</p>
<form id="f"><textarea id="k" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Din nyckel"></textarea><button type="submit">Skicka till TV:n</button></form><div id="s"></div></main>
<script>
const c=new URLSearchParams(location.search).get('c')||'';
document.getElementById('f').addEventListener('submit',async e=>{e.preventDefault();const s=document.getElementById('s');s.textContent='Skickar…';
try{const r=await fetch('/sport-key',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({c,key:document.getElementById('k').value})});const j=await r.json();
s.textContent=j.ok?'Klart – titta på TV:n.':(j.error==='invalid'?'Det där ser inte ut som en nyckel.':'Koden har gått ut. Öppna kortet på TV:n igen.');}catch{s.textContent='Kunde inte nå TV:n.'}});
</script></body></html>"#;

async fn phone_page() -> Response {
    let mut res = PAGE.into_response();
    res.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"));
    res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    res
}

#[derive(Deserialize)]
struct SubmitBody { #[serde(default)] c: String, #[serde(default)] key: String }

async fn phone_submit(ConnectInfo(peer): ConnectInfo<SocketAddr>, Json(b): Json<SubmitBody>) -> Response {
    if !submit_allowed(peer.ip(), Instant::now()) {
        return (StatusCode::TOO_MANY_REQUESTS, Json(json!({ "error": "slow-down" }))).into_response();
    }
    let result = STORE.lock().map(|mut s| s.submit(&b.c, &b.key, Instant::now())).unwrap_or(Err(SubmitError::Unknown));
    match result {
        Ok(()) => Json(json!({ "ok": true })).into_response(),
        Err(SubmitError::Invalid) => (StatusCode::BAD_REQUEST, Json(json!({ "error": "invalid" }))).into_response(),
        Err(SubmitError::Unknown) => (StatusCode::NOT_FOUND, Json(json!({ "error": "expired" }))).into_response(),
    }
}

pub fn phone_router() -> Router {
    Router::new().route("/sport-key", get(phone_page).post(phone_submit))
}
```

Kopplingar:
- `axum_server.rs`, efter `/sport/link`:
  ```rust
          .route("/api/live-tv/sport/key-handoff", axum::routing::post(crate::live_tv_sport_key::host_create).get(crate::live_tv_sport_key::host_poll).delete(crate::live_tv_sport_key::host_cancel))
  ```
- `couch/phone_routes.rs` `router()`: lägg till `.merge(crate::live_tv_sport_key::phone_router())` före `.merge(super::matchroom::routes::player_router())`. Lägg den före `"/:icon"`-rutten om axum klagar på överlapp. `/sport-key` är en statisk väg och vinner över `/:icon` i axums matchning, så ingen ändring behövs normalt.
- `couch/host_routes.rs`: `async fn ensure_listener()` → `pub(crate) async fn ensure_listener()`.
- `haptics/server.rs` `needed()`:
  ```rust
  pub fn needed() -> bool {
      global_haptics_on()
          || crate::live_tv_sport_key::window_open()
          || crate::couch::with_phones(|s| s.any_haptics_enabled() || !s.phones().is_empty() || s.window_open(Instant::now()))
  }
  ```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_key && cargo build`
Expected: PASS (3 tester), och bygget går igenom.
Run: `cd "$APP" && npx vitest run lib/__tests__/sync-key-selection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "$APP" && git add src-tauri/src/live_tv_sport_key.rs src-tauri/src/lib.rs src-tauri/src/axum_server.rs src-tauri/src/couch/phone_routes.rs src-tauri/src/couch/host_routes.rs src-tauri/src/haptics/server.rs lib/__tests__/sync-key-selection.test.ts
git commit -m "live-tv sport: hand the API key over from the phone via QR"
```

---

### Task 5: Providergränssnittet och fetch-klienten (den enda vägen ut)

**Files:**
- Create: `$PLG/runtime/sport/provider.ts`
- Create: `$PLG/runtime/sport/sport-fetch.ts`
- Test: `$PLG/runtime/sport/sport-fetch.test.ts`

**Interfaces:**
- Consumes: fas 1 `SportKind` från `./sport-model`. Fas 1:s `MatchStatus` (`live | upcoming | finished`) räcker inte för källans paus och uppskjutna matcher, så källans status är en egen typ, `FixtureStatus`. `merge.ts` (Task 11) översätter den.
- Produces (`./provider`):
  ```ts
  export type ProviderId = 'api-sports' | 'thesportsdb'
  export type FixtureStatus = 'scheduled' | 'live' | 'ht' | 'finished' | 'postponed'
  export interface FixtureTeam { id: string; name: string; crest: string | null }
  export interface Fixture {
    provider: ProviderId; id: string; sport: SportKind
    league: { id: string; name: string; season: string; round: number | null; country: string | null }
    kickoff: number; status: FixtureStatus; statusShort: string; minute: number | null
    home: FixtureTeam; away: FixtureTeam; score: { home: number; away: number } | null; venue: string | null
    lastGoal: { side: 'home' | 'away' | null; player: string | null; minute: number | null } | null
  }
  export type EventType = 'goal' | 'card' | 'sub' | 'var' | 'penalty' | 'other'
  export interface FixtureEvent { minute: number | null; extra: number | null; side: 'home' | 'away' | null; type: EventType; detail: string; player: string | null; assist: string | null }
  export interface FixtureStat { label: string; home: string; away: string }
  export interface LineupEntry { number: number | null; name: string; pos: string | null }
  export interface FixtureLineup { side: 'home' | 'away'; formation: string | null; startXI: LineupEntry[]; subs: LineupEntry[] }
  export interface FixtureDetail { fixture: Fixture; events: FixtureEvent[]; stats: FixtureStat[]; lineups: FixtureLineup[] }
  export interface StandingRow { rank: number; team: FixtureTeam; played: number; points: number; goalDiff: number | null; form: string | null; group: string | null }
  export interface TeamHit { id: string; name: string; crest: string | null; country: string | null }
  export interface KeyCheck { ok: boolean; plan: string | null; used: number | null; limit: number | null }
  export interface ProviderRequest { sport: SportKind; path: string; ttlS: number; finalAfter?: number }
  export interface ProviderCall<T> { requests: ProviderRequest[]; parse(bodies: unknown[]): T }
  export interface DayOpts { today: string; tz: string; dayEndMs: number }
  export interface LiveOpts { today: string; tz: string }
  export interface SportsProvider {
    id: ProviderId
    liveFloorMs: number
    coverage(sport: SportKind): 'full' | 'epg'
    bucket(sport: SportKind): string
    day(sport: SportKind, date: string, opts: DayOpts): ProviderCall<Fixture[]>
    live(sport: SportKind, opts: LiveOpts): ProviderCall<Fixture[]>
    fixture(sport: SportKind, id: string, opts: { finished: boolean }): ProviderCall<FixtureDetail | null>
    standings(sport: SportKind, leagueId: string, season: string): ProviderCall<StandingRow[]>
    searchTeams(sport: SportKind, q: string): ProviderCall<TeamHit[]>
    validateKey(): ProviderCall<KeyCheck>
    quotaProbe(sport: SportKind): ProviderCall<KeyCheck> | null
    crestUrl(team: FixtureTeam): string | null
  }
  ```
- Produces (`./sport-fetch`): `FetchMode`, `FetchError`, `SportQuota { bucket; limit; remaining; minuteLimit; minuteRemaining; blockedUntil; reason: 'exhausted' | 'rate-limited' | null; plan: string | null }`, `SportFetchResponse { data; cached; fresh; fetchedAt; quota: SportQuota | null; error: FetchError | null }`, `SPORT_KEY_HEADER`, `sportFetchUrl(provider, req, mode)`, `sportFetch({ provider, key, req, mode })`, `sportQuota(provider): Promise<SportQuota[]>`.

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/sport/sport-fetch.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SPORT_KEY_HEADER, sportFetch, sportFetchUrl } from './sport-fetch'

const req = { sport: 'football' as const, path: '/fixtures?date=2026-10-10', ttlS: 900 }

afterEach(() => { vi.unstubAllGlobals() })

describe('sport-fetch', () => {
  it('bygger URL:en med källa, sport, sökväg, ttl och läge', () => {
    const url = new URL(sportFetchUrl('api-sports', { ...req, finalAfter: 123 }, 'cache-first'), 'http://x')
    expect(url.pathname).toBe('/api/live-tv/sport/fetch')
    expect(Object.fromEntries(url.searchParams)).toEqual({ provider: 'api-sports', sport: 'football', path: '/fixtures?date=2026-10-10', ttl: '900', mode: 'cache-first', finalAfter: '123' })
  })

  it('skickar nyckeln i headern, aldrig i URL:en', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { ok: 1 }, cached: false, fresh: true, fetchedAt: 5, quota: null, error: null })))
    vi.stubGlobal('fetch', fetchMock)
    const res = await sportFetch({ provider: 'api-sports', key: 'secret123', req, mode: 'cache-first' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).not.toContain('secret123')
    expect((init.headers as Record<string, string>)[SPORT_KEY_HEADER]).toBe('secret123')
    expect(res).toEqual({ data: { ok: 1 }, cached: false, fresh: true, fetchedAt: 5, quota: null, error: null })
  })

  it('nätfel och 4xx blir felkoder, inte undantag', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    expect((await sportFetch({ provider: 'api-sports', key: 'k123', req, mode: 'cache-first' })).error).toBe('network')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"not-allowed"}', { status: 403 })))
    expect((await sportFetch({ provider: 'api-sports', key: 'k123', req, mode: 'cache-first' })).error).toBe('not-allowed')
  })
})

describe('kvothanteraren äger varje anrop', () => {
  const sources = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  it('bara budget.ts importerar sport-fetch med värde', () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !path.endsWith('/sport/budget.ts') && !path.endsWith('/sport/sport-fetch.ts'))
      .filter(([, src]) => /^import (?!type)[^\n]*sport-fetch'/m.test(src))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
  it('bara sport-fetch.ts känner genomkopplingens adress', () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !path.endsWith('/sport/sport-fetch.ts'))
      .filter(([, src]) => src.includes('/api/live-tv/sport/fetch'))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/sport-fetch.test.ts`
Expected: FAIL med "Failed to resolve import './sport-fetch'".

- [ ] **Step 3: Implementera**

`runtime/sport/provider.ts`: exakt typerna under **Produces** ovan, med följande överst:

```ts
/**
 * Sportkällornas gemensamma gränssnitt (fas 2).
 *
 * ADAPTRARNA HAR INGET NÄT. En metod returnerar ett `ProviderCall`: de
 * förfrågningar som behövs och en tolk för svaren. Bara kvothanteraren
 * (`budget.ts`) utför förfrågningar, så "budgeten äger varje anrop" gäller
 * per konstruktion och inte som en konvention.
 */
import type { SportKind } from './sport-model'
```

`runtime/sport/sport-fetch.ts`:

```ts
'use client'

import type { ProviderId, ProviderRequest } from './provider'

/**
 * Den enda klienten mot appens lokala genomkoppling. FÅR BARA IMPORTERAS AV
 * `budget.ts` (testet "kvothanteraren äger varje anrop" fäller allt annat).
 * Nyckeln går i en header till den egna värden och hamnar aldrig i en URL.
 */
export type FetchMode = 'cache-first' | 'cache-only'
export type FetchError = 'unauthorized' | 'exhausted' | 'rate-limited' | 'network' | 'upstream' | 'not-allowed'

export interface SportQuota {
  bucket: string
  limit: number | null
  remaining: number | null
  minuteLimit: number | null
  minuteRemaining: number | null
  blockedUntil: number | null
  reason: 'exhausted' | 'rate-limited' | null
  plan: string | null
}

export interface SportFetchResponse {
  data: unknown
  cached: boolean
  fresh: boolean
  fetchedAt: number | null
  quota: SportQuota | null
  error: FetchError | null
}

export const SPORT_KEY_HEADER = 'x-lumio-sport-key'

const FAILED = (error: FetchError): SportFetchResponse => ({ data: null, cached: false, fresh: false, fetchedAt: null, quota: null, error })

export function sportFetchUrl(provider: ProviderId, req: ProviderRequest, mode: FetchMode): string {
  const params = new URLSearchParams({ provider, sport: req.sport, path: req.path, ttl: String(req.ttlS), mode })
  if (req.finalAfter != null) params.set('finalAfter', String(req.finalAfter))
  return `/api/live-tv/sport/fetch?${params.toString()}`
}

export async function sportFetch(args: { provider: ProviderId; key: string; req: ProviderRequest; mode: FetchMode }): Promise<SportFetchResponse> {
  let res: Response
  try {
    res = await fetch(sportFetchUrl(args.provider, args.req, args.mode), { headers: { [SPORT_KEY_HEADER]: args.key }, cache: 'no-store' })
  } catch {
    return FAILED('network')
  }
  if (res.status === 400 || res.status === 403) return FAILED('not-allowed')
  if (!res.ok) return FAILED('network')
  let body: Partial<SportFetchResponse>
  try {
    body = (await res.json()) as Partial<SportFetchResponse>
  } catch {
    return FAILED('network')
  }
  return {
    data: body.data ?? null,
    cached: body.cached === true,
    fresh: body.fresh === true,
    fetchedAt: typeof body.fetchedAt === 'number' ? body.fetchedAt : null,
    quota: body.quota ?? null,
    error: (body.error as FetchError | null | undefined) ?? null,
  }
}

export async function sportQuota(provider: ProviderId): Promise<SportQuota[]> {
  try {
    const res = await fetch(`/api/live-tv/sport/quota?provider=${provider}`, { cache: 'no-store' })
    if (!res.ok) return []
    const body = (await res.json()) as { buckets?: SportQuota[] }
    return Array.isArray(body.buckets) ? body.buckets : []
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/sport-fetch.test.ts`
Expected: PASS (5 tester).

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/provider.ts runtime/sport/sport-fetch.ts runtime/sport/sport-fetch.test.ts
git commit -m "live-tv sport: provider interface and the single passthrough client"
```

---

### Task 6: API-Sports-adaptern med fixturer

**Files:**
- Create: `$PLG/runtime/sport/api-sports.ts`
- Create: `$PLG/runtime/sport/__fixtures__/api-sports/{football-fixtures-date,football-fixtures-live,football-fixture-id,football-standings,football-teams-search,hockey-games-date,hockey-games-events,hockey-standings,status}.json`
- Test: `$PLG/runtime/sport/api-sports.test.ts`

**Interfaces:**
- Consumes: Task 5 (`SportsProvider`, `FixtureStatus` med flera). Fas 1 `SportKind`.
- Produces: `export const apiSports: SportsProvider`, `export const API_SPORTS_REGISTER_URL = 'https://dashboard.api-football.com/register'`, `export function roundNumber(r: unknown): number | null`.

Täckning: fotboll, ishockey, basket och handboll. Övriga sporter (motorsport, tennis, other) har `epg`. Gratisnivån har också en minutgräns (10/min enligt headern `x-ratelimit-limit`), och Rust spärrar då i 60 s.

- [ ] **Step 1: Skriv fixturerna** (dokumenterade former; verifieras med riktig nyckel)

`football-fixtures-date.json`:
```json
{
  "_shape": "from docs — verify with real key",
  "get": "fixtures", "parameters": { "date": "2026-10-10", "timezone": "Europe/Stockholm" }, "errors": [], "results": 2, "paging": { "current": 1, "total": 1 },
  "response": [
    {
      "fixture": { "id": 1180001, "referee": null, "timezone": "Europe/Stockholm", "date": "2026-10-10T19:00:00+02:00", "timestamp": 1791651600,
        "venue": { "id": 1460, "name": "Eleda Stadion", "city": "Malmö" }, "status": { "long": "Second Half", "short": "2H", "elapsed": 67, "extra": null } },
      "league": { "id": 113, "name": "Allsvenskan", "country": "Sweden", "logo": "https://media.api-sports.io/football/leagues/113.png", "season": 2026, "round": "Regular Season - 27" },
      "teams": { "home": { "id": 375, "name": "Malmo FF", "logo": "https://media.api-sports.io/football/teams/375.png", "winner": true },
                 "away": { "id": 377, "name": "Djurgardens IF", "logo": "https://media.api-sports.io/football/teams/377.png", "winner": false } },
      "goals": { "home": 2, "away": 1 },
      "score": { "halftime": { "home": 1, "away": 1 }, "fulltime": { "home": null, "away": null }, "extratime": { "home": null, "away": null }, "penalty": { "home": null, "away": null } }
    },
    {
      "fixture": { "id": 1180002, "referee": null, "timezone": "Europe/Stockholm", "date": "2026-10-10T21:00:00+02:00", "timestamp": 1791658800,
        "venue": { "id": 1454, "name": "Strawberry Arena", "city": "Solna" }, "status": { "long": "Not Started", "short": "NS", "elapsed": null, "extra": null } },
      "league": { "id": 113, "name": "Allsvenskan", "country": "Sweden", "logo": "https://media.api-sports.io/football/leagues/113.png", "season": 2026, "round": "Regular Season - 27" },
      "teams": { "home": { "id": 363, "name": "AIK Stockholm", "logo": "https://media.api-sports.io/football/teams/363.png", "winner": null },
                 "away": { "id": 368, "name": "IFK Goteborg", "logo": "https://media.api-sports.io/football/teams/368.png", "winner": null } },
      "goals": { "home": null, "away": null },
      "score": { "halftime": { "home": null, "away": null }, "fulltime": { "home": null, "away": null }, "extratime": { "home": null, "away": null }, "penalty": { "home": null, "away": null } }
    }
  ]
}
```

`football-fixtures-live.json`: samma kuvert med `"parameters": { "live": "all" }`, `"results": 1` och `response` = det första objektet ovan plus fältet:
```json
      "events": [
        { "time": { "elapsed": 12, "extra": null }, "team": { "id": 375, "name": "Malmo FF" }, "player": { "id": 1001, "name": "I. Kiese Thelin" }, "assist": { "id": 1002, "name": "A. Christiansen" }, "type": "Goal", "detail": "Normal Goal", "comments": null },
        { "time": { "elapsed": 34, "extra": null }, "team": { "id": 377, "name": "Djurgardens IF" }, "player": { "id": 2001, "name": "T. Asoro" }, "assist": { "id": null, "name": null }, "type": "Goal", "detail": "Normal Goal", "comments": null },
        { "time": { "elapsed": 67, "extra": null }, "team": { "id": 375, "name": "Malmo FF" }, "player": { "id": 1003, "name": "S. Larsson" }, "assist": { "id": null, "name": null }, "type": "Goal", "detail": "Penalty", "comments": null }
      ]
```

`football-fixture-id.json`: kuvertet med `"parameters": { "id": "1180001" }` och `response` = första objektet med `events` (som ovan, plus kortet nedan), `lineups` och `statistics`:
```json
      "events": [
        { "time": { "elapsed": 12, "extra": null }, "team": { "id": 375 }, "player": { "name": "I. Kiese Thelin" }, "assist": { "name": "A. Christiansen" }, "type": "Goal", "detail": "Normal Goal" },
        { "time": { "elapsed": 29, "extra": null }, "team": { "id": 377 }, "player": { "name": "M. Danielson" }, "assist": { "name": null }, "type": "Card", "detail": "Yellow Card" },
        { "time": { "elapsed": 34, "extra": null }, "team": { "id": 377 }, "player": { "name": "T. Asoro" }, "assist": { "name": null }, "type": "Goal", "detail": "Normal Goal" },
        { "time": { "elapsed": 67, "extra": null }, "team": { "id": 375 }, "player": { "name": "S. Larsson" }, "assist": { "name": null }, "type": "Goal", "detail": "Penalty" }
      ],
      "lineups": [
        { "team": { "id": 375, "name": "Malmo FF" }, "formation": "4-3-3",
          "startXI": [ { "player": { "id": 1, "name": "J. Dahlin", "number": 1, "pos": "G" } }, { "player": { "id": 1001, "name": "I. Kiese Thelin", "number": 9, "pos": "F" } } ],
          "substitutes": [ { "player": { "id": 5, "name": "O. Berg", "number": 20, "pos": "M" } } ] },
        { "team": { "id": 377, "name": "Djurgardens IF" }, "formation": "4-4-2",
          "startXI": [ { "player": { "id": 2, "name": "J. Widell Zetterström", "number": 35, "pos": "G" } } ],
          "substitutes": [] }
      ],
      "statistics": [
        { "team": { "id": 375 }, "statistics": [ { "type": "Ball Possession", "value": "58%" }, { "type": "Total Shots", "value": 14 }, { "type": "Shots on Goal", "value": 6 } ] },
        { "team": { "id": 377 }, "statistics": [ { "type": "Ball Possession", "value": "42%" }, { "type": "Total Shots", "value": 7 }, { "type": "Shots on Goal", "value": null } ] }
      ]
```

`football-standings.json`:
```json
{
  "_shape": "from docs — verify with real key",
  "get": "standings", "parameters": { "league": "113", "season": "2026" }, "errors": [], "results": 1,
  "response": [ { "league": { "id": 113, "name": "Allsvenskan", "country": "Sweden", "season": 2026, "standings": [ [
    { "rank": 1, "team": { "id": 363, "name": "AIK Stockholm", "logo": "https://media.api-sports.io/football/teams/363.png" }, "points": 58, "goalsDiff": 25, "group": "Allsvenskan", "form": "WWDWW", "status": "same", "description": "Promotion", "all": { "played": 26, "win": 18, "draw": 4, "lose": 4, "goals": { "for": 50, "against": 25 } } },
    { "rank": 2, "team": { "id": 375, "name": "Malmo FF", "logo": "https://media.api-sports.io/football/teams/375.png" }, "points": 55, "goalsDiff": 30, "group": "Allsvenskan", "form": "WLWWD", "status": "same", "description": null, "all": { "played": 26, "win": 17, "draw": 4, "lose": 5, "goals": { "for": 55, "against": 25 } } }
  ] ] } } ]
}
```

`football-teams-search.json`:
```json
{ "_shape": "from docs — verify with real key", "get": "teams", "parameters": { "search": "malmo" }, "errors": [], "results": 1,
  "response": [ { "team": { "id": 375, "name": "Malmo FF", "code": "MAL", "country": "Sweden", "founded": 1910, "national": false, "logo": "https://media.api-sports.io/football/teams/375.png" }, "venue": { "id": 1460, "name": "Eleda Stadion" } } ] }
```

`hockey-games-date.json`:
```json
{
  "_shape": "from docs — verify with real key",
  "get": "games", "parameters": { "date": "2026-10-10", "timezone": "Europe/Stockholm" }, "errors": [], "results": 2,
  "response": [
    { "id": 51001, "date": "2026-10-10T19:00:00+02:00", "time": "19:00", "timestamp": 1791651600, "timezone": "Europe/Stockholm", "week": null, "timer": "14",
      "status": { "long": "Second Period", "short": "P2" }, "country": { "id": 23, "name": "Sweden" },
      "league": { "id": 47, "name": "SHL", "type": "League", "season": 2026, "logo": "https://media.api-sports.io/hockey/leagues/47.png" },
      "teams": { "home": { "id": 653, "name": "Lulea", "logo": "https://media.api-sports.io/hockey/teams/653.png" }, "away": { "id": 650, "name": "Frolunda", "logo": "https://media.api-sports.io/hockey/teams/650.png" } },
      "scores": { "home": 1, "away": 2 }, "periods": { "first": "1-1", "second": "0-1", "third": null, "overtime": null, "penalties": null }, "events": true },
    { "id": 51002, "date": "2026-10-10T19:00:00+02:00", "time": "19:00", "timestamp": 1791651600, "timezone": "Europe/Stockholm", "week": null, "timer": null,
      "status": { "long": "Not Started", "short": "NS" }, "country": { "id": 23, "name": "Sweden" },
      "league": { "id": 47, "name": "SHL", "type": "League", "season": 2026, "logo": "https://media.api-sports.io/hockey/leagues/47.png" },
      "teams": { "home": { "id": 655, "name": "Skelleftea", "logo": "https://media.api-sports.io/hockey/teams/655.png" }, "away": { "id": 657, "name": "Farjestad", "logo": "https://media.api-sports.io/hockey/teams/657.png" } },
      "scores": { "home": null, "away": null }, "periods": { "first": null, "second": null, "third": null, "overtime": null, "penalties": null }, "events": false }
  ]
}
```

`hockey-games-events.json`:
```json
{ "_shape": "from docs — verify with real key", "get": "games/events", "parameters": { "game": "51001" }, "errors": [], "results": 4,
  "response": [
    { "game_id": 51001, "period": "P1", "minute": "05", "team": { "id": 653, "name": "Lulea" }, "players": ["J. Omark"], "assists": ["K. Fransson"], "comment": null, "type": "goal" },
    { "game_id": 51001, "period": "P1", "minute": "17", "team": { "id": 650, "name": "Frolunda" }, "players": ["R. Lindholm"], "assists": [], "comment": null, "type": "goal" },
    { "game_id": 51001, "period": "P2", "minute": "08", "team": { "id": 650, "name": "Frolunda" }, "players": ["M. Elfström"], "assists": [], "comment": "Hooking (2 min)", "type": "penalty" },
    { "game_id": 51001, "period": "P2", "minute": "12", "team": { "id": 650, "name": "Frolunda" }, "players": ["L. Lindgren"], "assists": ["J. Persson"], "comment": null, "type": "goal" }
  ] }
```

`hockey-standings.json`:
```json
{ "_shape": "from docs — verify with real key", "get": "standings", "parameters": { "league": "47", "season": "2026" }, "errors": [], "results": 1,
  "response": [ [
    { "position": 1, "stage": "SHL", "group": { "name": "SHL" }, "team": { "id": 650, "name": "Frolunda", "logo": "https://media.api-sports.io/hockey/teams/650.png" }, "league": { "id": 47, "name": "SHL", "season": 2026 },
      "games": { "played": 10, "win": { "total": 8 }, "lose": { "total": 2 } }, "goals": { "for": 35, "against": 18 }, "points": 24, "form": "WWLWW", "description": null },
    { "position": 2, "stage": "SHL", "group": { "name": "SHL" }, "team": { "id": 653, "name": "Lulea", "logo": "https://media.api-sports.io/hockey/teams/653.png" }, "league": { "id": 47, "name": "SHL", "season": 2026 },
      "games": { "played": 10, "win": { "total": 7 }, "lose": { "total": 3 } }, "goals": { "for": 30, "against": 22 }, "points": 20, "form": "WLWWW", "description": null }
  ] ] }
```

`status.json`:
```json
{ "_shape": "from docs — verify with real key", "get": "status", "parameters": [], "errors": [], "results": 1, "paging": { "current": 1, "total": 1 },
  "response": { "account": { "firstname": "-", "lastname": "-", "email": "-" }, "subscription": { "plan": "Free", "end": "2027-10-10T00:00:00+00:00", "active": true }, "requests": { "current": 12, "limit_day": 100 } } }
```

- [ ] **Step 2: Skriv de fallerande testerna**

```ts
// runtime/sport/api-sports.test.ts
import { describe, expect, it } from 'vitest'
import { apiSports, roundNumber } from './api-sports'
import footballDate from './__fixtures__/api-sports/football-fixtures-date.json'
import footballLive from './__fixtures__/api-sports/football-fixtures-live.json'
import footballId from './__fixtures__/api-sports/football-fixture-id.json'
import footballStandings from './__fixtures__/api-sports/football-standings.json'
import footballSearch from './__fixtures__/api-sports/football-teams-search.json'
import hockeyDate from './__fixtures__/api-sports/hockey-games-date.json'
import hockeyEvents from './__fixtures__/api-sports/hockey-games-events.json'
import hockeyStandings from './__fixtures__/api-sports/hockey-standings.json'
import status from './__fixtures__/api-sports/status.json'

const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 10, 22) }

describe('api-sports: täckning och hinkar', () => {
  it('fotboll, hockey, basket och handboll täcks; tennis och motorsport är bara EPG', () => {
    expect(['football', 'hockey', 'basketball', 'handball'].map((s) => apiSports.coverage(s as never))).toEqual(['full', 'full', 'full', 'full'])
    expect(apiSports.coverage('tennis')).toBe('epg')
    expect(apiSports.coverage('motorsport')).toBe('epg')
  })
  it('en hink per sport-API', () => {
    expect(apiSports.bucket('football')).toBe('football')
    expect(apiSports.bucket('hockey')).toBe('hockey')
  })
})

describe('api-sports: förfrågningar', () => {
  it('dagsprogram: idag 15 min, igår slutgiltigt efter dygnets slut + 3 h, imorgon 6 h', () => {
    expect(apiSports.day('football', '2026-10-10', DAY).requests).toEqual([{ sport: 'football', path: '/fixtures?date=2026-10-10&timezone=Europe%2FStockholm', ttlS: 900 }])
    const y = apiSports.day('hockey', '2026-10-09', { ...DAY, dayEndMs: Date.UTC(2026, 9, 9, 22) }).requests[0]
    expect(y).toEqual({ sport: 'hockey', path: '/games?date=2026-10-09&timezone=Europe%2FStockholm', ttlS: 21600, finalAfter: Date.UTC(2026, 9, 10, 1) })
    expect(apiSports.day('football', '2026-10-11', DAY).requests[0].finalAfter).toBeUndefined()
  })
  it('live: fotboll ett allt-live-anrop, hockey dagens matcher; TTL 10 s', () => {
    expect(apiSports.live('football', DAY).requests).toEqual([{ sport: 'football', path: '/fixtures?live=all&timezone=Europe%2FStockholm', ttlS: 10 }])
    expect(apiSports.live('hockey', DAY).requests).toEqual([{ sport: 'hockey', path: '/games?date=2026-10-10&timezone=Europe%2FStockholm', ttlS: 10 }])
  })
  it('matchcenter: fotboll ETT anrop, hockey två; avslutad cachas för alltid', () => {
    expect(apiSports.fixture('football', '1180001', { finished: false }).requests).toEqual([{ sport: 'football', path: '/fixtures?id=1180001', ttlS: 60 }])
    expect(apiSports.fixture('hockey', '51001', { finished: true }).requests).toEqual([
      { sport: 'hockey', path: '/games?id=51001', ttlS: -1 },
      { sport: 'hockey', path: '/games/events?game=51001', ttlS: -1 },
    ])
  })
  it('tabell 24 h, sök kräver tre tecken, status kostar inget', () => {
    expect(apiSports.standings('football', '113', '2026').requests).toEqual([{ sport: 'football', path: '/standings?league=113&season=2026', ttlS: 86400 }])
    expect(apiSports.searchTeams('football', 'ma').requests).toEqual([])
    expect(apiSports.validateKey().requests).toEqual([{ sport: 'football', path: '/status', ttlS: 0 }])
    expect(apiSports.quotaProbe('hockey')?.requests).toEqual([{ sport: 'hockey', path: '/status', ttlS: 0 }])
  })
})

describe('api-sports: tolkning', () => {
  it('fotbollens dagsprogram', () => {
    const [live, later] = apiSports.day('football', '2026-10-10', DAY).parse([footballDate])
    expect(live).toMatchObject({
      provider: 'api-sports', id: '1180001', sport: 'football', kickoff: 1791651600000, status: 'live', statusShort: '2H', minute: 67,
      league: { id: '113', name: 'Allsvenskan', season: '2026', round: 27, country: 'Sweden' },
      home: { id: '375', name: 'Malmo FF', crest: 'https://media.api-sports.io/football/teams/375.png' },
      away: { id: '377', name: 'Djurgardens IF' }, score: { home: 2, away: 1 }, venue: 'Eleda Stadion',
    })
    expect(later).toMatchObject({ id: '1180002', status: 'scheduled', minute: null, score: null })
  })
  it('live-svaret bär senaste målet', () => {
    const [f] = apiSports.live('football', DAY).parse([footballLive])
    expect(f.lastGoal).toEqual({ side: 'home', player: 'S. Larsson', minute: 67 })
  })
  it('matchcentret i fotboll: händelser, statistik, uppställningar', () => {
    const d = apiSports.fixture('football', '1180001', { finished: false }).parse([footballId])!
    expect(d.events.map((e) => [e.minute, e.type, e.side, e.player])).toEqual([
      [12, 'goal', 'home', 'I. Kiese Thelin'], [29, 'card', 'away', 'M. Danielson'], [34, 'goal', 'away', 'T. Asoro'], [67, 'goal', 'home', 'S. Larsson'],
    ])
    expect(d.stats).toEqual([
      { label: 'Ball Possession', home: '58%', away: '42%' },
      { label: 'Total Shots', home: '14', away: '7' },
      { label: 'Shots on Goal', home: '6', away: '0' },
    ])
    expect(d.lineups[0]).toEqual({ side: 'home', formation: '4-3-3', startXI: [{ number: 1, name: 'J. Dahlin', pos: 'G' }, { number: 9, name: 'I. Kiese Thelin', pos: 'F' }], subs: [{ number: 20, name: 'O. Berg', pos: 'M' }] })
  })
  it('hockeyns dagsprogram och händelser (minut räknas över perioderna)', () => {
    const [g, ns] = apiSports.day('hockey', '2026-10-10', DAY).parse([hockeyDate])
    expect(g).toMatchObject({ id: '51001', sport: 'hockey', status: 'live', statusShort: 'P2', minute: 14, score: { home: 1, away: 2 }, league: { id: '47', name: 'SHL', season: '2026' } })
    expect(ns).toMatchObject({ status: 'scheduled', score: null })
    const d = apiSports.fixture('hockey', '51001', { finished: false }).parse([{ response: [hockeyDate.response[0]] }, hockeyEvents])!
    expect(d.events.map((e) => [e.minute, e.type, e.side, e.player, e.assist])).toEqual([
      [5, 'goal', 'home', 'J. Omark', 'K. Fransson'], [17, 'goal', 'away', 'R. Lindholm', null],
      [28, 'penalty', 'away', 'M. Elfström', null], [32, 'goal', 'away', 'L. Lindgren', 'J. Persson'],
    ])
    expect(d.stats).toEqual([])
    expect(d.lineups).toEqual([])
  })
  it('tabeller med form', () => {
    expect(apiSports.standings('football', '113', '2026').parse([footballStandings])[1]).toEqual({ rank: 2, team: { id: '375', name: 'Malmo FF', crest: 'https://media.api-sports.io/football/teams/375.png' }, played: 26, points: 55, goalDiff: 30, form: 'WLWWD', group: 'Allsvenskan' })
    expect(apiSports.standings('hockey', '47', '2026').parse([hockeyStandings])[0]).toMatchObject({ rank: 1, played: 10, points: 24, goalDiff: 17, form: 'WWLWW', group: 'SHL' })
  })
  it('lagsök och nyckelkontroll', () => {
    expect(apiSports.searchTeams('football', 'malmo').parse([footballSearch])).toEqual([{ id: '375', name: 'Malmo FF', crest: 'https://media.api-sports.io/football/teams/375.png', country: 'Sweden' }])
    expect(apiSports.validateKey().parse([status])).toEqual({ ok: true, plan: 'Free', used: 12, limit: 100 })
    expect(apiSports.validateKey().parse([null])).toEqual({ ok: false, plan: null, used: null, limit: null })
  })
  it('tomma eller trasiga kroppar ger tomma listor, aldrig undantag', () => {
    expect(apiSports.day('football', '2026-10-10', DAY).parse([null])).toEqual([])
    expect(apiSports.fixture('football', '1', { finished: false }).parse([{ response: [] }])).toBeNull()
    expect(roundNumber('Regular Season - 27')).toBe(27)
    expect(roundNumber('Quarter-finals')).toBeNull()
  })
})
```

- [ ] **Step 3: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/api-sports.test.ts`
Expected: FAIL med "Failed to resolve import './api-sports'".

- [ ] **Step 4: Implementera**

```ts
// runtime/sport/api-sports.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- tolkar extern JSON fält för fält */
import type { SportKind } from './sport-model'
import type {
  DayOpts, Fixture, FixtureDetail, FixtureEvent, FixtureLineup, FixtureStat, FixtureTeam, KeyCheck,
  FixtureStatus, LineupEntry, LiveOpts, ProviderCall, SportsProvider, StandingRow, TeamHit,
} from './provider'

/**
 * API-Sports (api-sports.io). Ett API per sport med samma nyckel och en egen
 * dygnskvot per sport-API. Fotboll är v3 och har fixturer med händelser,
 * uppställningar och statistik i ETT anrop. Hockey, basket och handboll är v1
 * och har "games". Hockey har dessutom games/events.
 */
export const API_SPORTS_REGISTER_URL = 'https://dashboard.api-football.com/register'

const COVERED = new Set<SportKind>(['football', 'hockey', 'basketball', 'handball'])

const FOOTBALL_STATUS: Record<string, FixtureStatus> = {
  TBD: 'scheduled', NS: 'scheduled', '1H': 'live', HT: 'ht', '2H': 'live', ET: 'live', BT: 'ht', P: 'live',
  SUSP: 'live', INT: 'live', LIVE: 'live', FT: 'finished', AET: 'finished', PEN: 'finished',
  PST: 'postponed', CANC: 'postponed', ABD: 'postponed', AWD: 'finished', WO: 'finished',
}
const GAMES_STATUS: Record<string, FixtureStatus> = {
  NS: 'scheduled', P1: 'live', P2: 'live', P3: 'live', OT: 'live', PT: 'live', BT: 'ht',
  Q1: 'live', Q2: 'live', Q3: 'live', Q4: 'live', HT: 'ht', '1H': 'live', '2H': 'live', ET: 'live', INTR: 'live',
  FT: 'finished', AOT: 'finished', AP: 'finished', AW: 'finished', AET: 'finished', AWO: 'finished',
  POST: 'postponed', CANC: 'postponed', ABD: 'postponed',
}
const PERIOD_OFFSET: Record<string, number> = { P1: 0, P2: 20, P3: 40, OT: 60 }

const arr = (v: any): any[] => (Array.isArray(v) ? v : [])
const resp = (body: unknown): any[] => arr((body as any)?.response)
const num = (v: any): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null
const str = (v: any): string | null => (typeof v === 'string' && v.trim() ? v : null)
const enc = encodeURIComponent

export function roundNumber(r: unknown): number | null {
  const m = /(\d+)\s*$/.exec(String(r ?? ''))
  return m ? Number(m[1]) : null
}

function team(raw: any): FixtureTeam {
  return { id: String(raw?.id ?? ''), name: String(raw?.name ?? ''), crest: str(raw?.logo) }
}

function sideOf(homeId: unknown, awayId: unknown, teamId: unknown): 'home' | 'away' | null {
  if (teamId == null) return null
  if (String(teamId) === String(homeId)) return 'home'
  if (String(teamId) === String(awayId)) return 'away'
  return null
}

function footballLastGoal(raw: any): Fixture['lastGoal'] {
  const goals = arr(raw?.events).filter((e) => e?.type === 'Goal' && e?.detail !== 'Missed Penalty')
  const g = goals[goals.length - 1]
  if (!g) return null
  return { side: sideOf(raw?.teams?.home?.id, raw?.teams?.away?.id, g?.team?.id), player: str(g?.player?.name), minute: num(g?.time?.elapsed) }
}

function footballFixture(raw: any): Fixture | null {
  if (raw?.fixture?.id == null) return null
  const short = String(raw.fixture.status?.short ?? 'NS')
  const gh = num(raw.goals?.home)
  const ga = num(raw.goals?.away)
  return {
    provider: 'api-sports', id: String(raw.fixture.id), sport: 'football',
    league: { id: String(raw.league?.id ?? ''), name: String(raw.league?.name ?? ''), season: String(raw.league?.season ?? ''), round: roundNumber(raw.league?.round), country: str(raw.league?.country) },
    kickoff: (num(raw.fixture.timestamp) ?? 0) * 1000,
    status: FOOTBALL_STATUS[short] ?? 'scheduled', statusShort: short, minute: num(raw.fixture.status?.elapsed),
    home: team(raw.teams?.home), away: team(raw.teams?.away),
    score: gh != null && ga != null ? { home: gh, away: ga } : null,
    venue: str(raw.fixture.venue?.name),
    lastGoal: footballLastGoal(raw),
  }
}

function gameFixture(sport: SportKind, raw: any): Fixture | null {
  if (raw?.id == null) return null
  const short = String(raw.status?.short ?? 'NS')
  // Basket har {total}, hockey och handboll har en siffra.
  const total = (v: any) => (v && typeof v === 'object' ? num(v.total) : num(v))
  const h = total(raw.scores?.home)
  const a = total(raw.scores?.away)
  return {
    provider: 'api-sports', id: String(raw.id), sport,
    league: { id: String(raw.league?.id ?? ''), name: String(raw.league?.name ?? ''), season: String(raw.league?.season ?? ''), round: roundNumber(raw.week), country: str(raw.country?.name) },
    kickoff: (num(raw.timestamp) ?? 0) * 1000,
    status: GAMES_STATUS[short] ?? 'scheduled', statusShort: short, minute: num(raw.timer),
    home: team(raw.teams?.home), away: team(raw.teams?.away),
    score: h != null && a != null ? { home: h, away: a } : null,
    venue: str(raw.venue?.name),
    lastGoal: null,
  }
}

const parseFixture = (sport: SportKind, raw: any) => (sport === 'football' ? footballFixture(raw) : gameFixture(sport, raw))
const fixtures = (sport: SportKind) => (bodies: unknown[]): Fixture[] =>
  resp(bodies[0]).map((r) => parseFixture(sport, r)).filter((f): f is Fixture => f !== null)

function footballEvent(raw: any, e: any): FixtureEvent {
  const type = e?.type === 'Goal' ? (e?.detail === 'Missed Penalty' ? 'other' : 'goal')
    : e?.type === 'Card' ? 'card' : e?.type === 'subst' ? 'sub' : e?.type === 'Var' ? 'var' : 'other'
  return { minute: num(e?.time?.elapsed), extra: num(e?.time?.extra), side: sideOf(raw?.teams?.home?.id, raw?.teams?.away?.id, e?.team?.id), type, detail: String(e?.detail ?? ''), player: str(e?.player?.name), assist: str(e?.assist?.name) }
}

function footballStats(raw: any): FixtureStat[] {
  const [h, a] = arr(raw?.statistics)
  if (!h || !a) return []
  const away = new Map(arr(a.statistics).map((s: any) => [s?.type, s?.value]))
  const fmt = (v: any) => (v == null ? '0' : String(v))
  return arr(h.statistics).map((s: any) => ({ label: String(s?.type ?? ''), home: fmt(s?.value), away: fmt(away.get(s?.type)) }))
}

const lineupEntry = (x: any): LineupEntry => ({ number: num(x?.player?.number), name: String(x?.player?.name ?? ''), pos: str(x?.player?.pos) })

function footballLineups(raw: any): FixtureLineup[] {
  return arr(raw?.lineups).map((l: any) => ({
    side: sideOf(raw?.teams?.home?.id, raw?.teams?.away?.id, l?.team?.id) ?? 'home',
    formation: str(l?.formation), startXI: arr(l?.startXI).map(lineupEntry), subs: arr(l?.substitutes).map(lineupEntry),
  }))
}

function hockeyEvent(game: any, e: any): FixtureEvent {
  const m = num(e?.minute)
  const base = PERIOD_OFFSET[String(e?.period)] ?? 0
  const type = e?.type === 'goal' ? 'goal' : e?.type === 'penalty' ? 'penalty' : 'other'
  return { minute: m == null ? null : base + m, extra: null, side: sideOf(game?.teams?.home?.id, game?.teams?.away?.id, e?.team?.id), type, detail: String(e?.comment ?? ''), player: str(arr(e?.players)[0]), assist: str(arr(e?.assists)[0]) }
}

function footballStandingRow(row: any): StandingRow {
  return { rank: num(row?.rank) ?? 0, team: team(row?.team), played: num(row?.all?.played) ?? 0, points: num(row?.points) ?? 0, goalDiff: num(row?.goalsDiff), form: str(row?.form), group: str(row?.group) }
}

function gameStandingRow(row: any): StandingRow {
  const f = num(row?.goals?.for)
  const a = num(row?.goals?.against)
  return { rank: num(row?.position) ?? 0, team: team(row?.team), played: num(row?.games?.played) ?? 0, points: num(row?.points) ?? 0, goalDiff: f != null && a != null ? f - a : null, form: str(row?.form), group: str(row?.group?.name) }
}

function keyCheck(body: unknown): KeyCheck {
  const r = (body as any)?.response
  const used = num(r?.requests?.current)
  const limit = num(r?.requests?.limit_day)
  if (used == null || limit == null) return { ok: false, plan: null, used: null, limit: null }
  return { ok: true, plan: str(r?.subscription?.plan), used, limit }
}

export const apiSports: SportsProvider = {
  id: 'api-sports',
  liveFloorMs: 15_000,
  coverage: (sport) => (COVERED.has(sport) ? 'full' : 'epg'),
  bucket: (sport) => sport,
  day(sport, date, opts: DayOpts): ProviderCall<Fixture[]> {
    const route = sport === 'football' ? '/fixtures' : '/games'
    const past = date < opts.today
    return {
      requests: [{ sport, path: `${route}?date=${date}&timezone=${enc(opts.tz)}`, ttlS: date === opts.today ? 900 : 21_600, ...(past ? { finalAfter: opts.dayEndMs + 3 * 3_600_000 } : {}) }],
      parse: fixtures(sport),
    }
  },
  live(sport, opts: LiveOpts): ProviderCall<Fixture[]> {
    // Hockey, basket och handboll: dagens matcher (verifiera med nyckel om `live=all` finns där också).
    const path = sport === 'football' ? `/fixtures?live=all&timezone=${enc(opts.tz)}` : `/games?date=${opts.today}&timezone=${enc(opts.tz)}`
    return { requests: [{ sport, path, ttlS: 10 }], parse: fixtures(sport) }
  },
  fixture(sport, id, opts): ProviderCall<FixtureDetail | null> {
    const ttlS = opts.finished ? -1 : 60
    if (sport === 'football') {
      return {
        requests: [{ sport, path: `/fixtures?id=${enc(id)}`, ttlS }],
        parse: (bodies) => {
          const raw = resp(bodies[0])[0]
          const fixture = raw ? footballFixture(raw) : null
          if (!fixture) return null
          return { fixture, events: arr(raw.events).map((e) => footballEvent(raw, e)), stats: footballStats(raw), lineups: footballLineups(raw) }
        },
      }
    }
    const requests = [{ sport, path: `/games?id=${enc(id)}`, ttlS }]
    if (sport === 'hockey') requests.push({ sport, path: `/games/events?game=${enc(id)}`, ttlS })
    return {
      requests,
      parse: (bodies) => {
        const raw = resp(bodies[0])[0]
        const fixture = raw ? gameFixture(sport, raw) : null
        if (!fixture) return null
        const events = sport === 'hockey' ? resp(bodies[1]).map((e) => hockeyEvent(raw, e)) : []
        return { fixture, events, stats: [], lineups: [] }
      },
    }
  },
  standings(sport, leagueId, season): ProviderCall<StandingRow[]> {
    return {
      requests: [{ sport, path: `/standings?league=${enc(leagueId)}&season=${enc(season)}`, ttlS: 86_400 }],
      parse: (bodies) => sport === 'football'
        ? resp(bodies[0]).flatMap((r) => arr(r?.league?.standings)).flat().map(footballStandingRow)
        : resp(bodies[0]).flat().map(gameStandingRow),
    }
  },
  searchTeams(sport, q): ProviderCall<TeamHit[]> {
    const query = q.trim()
    if (query.length < 3) return { requests: [], parse: () => [] }
    return {
      requests: [{ sport, path: `/teams?search=${enc(query)}`, ttlS: 604_800 }],
      parse: (bodies) => resp(bodies[0]).map((x) => {
        const t = sport === 'football' ? x?.team : x
        return { id: String(t?.id ?? ''), name: String(t?.name ?? ''), crest: str(t?.logo), country: str(typeof t?.country === 'string' ? t.country : t?.country?.name) }
      }),
    }
  },
  validateKey: () => ({ requests: [{ sport: 'football', path: '/status', ttlS: 0 }], parse: (bodies) => keyCheck(bodies[0]) }),
  quotaProbe: (sport) => (COVERED.has(sport) ? { requests: [{ sport, path: '/status', ttlS: 0 }], parse: (bodies) => keyCheck(bodies[0]) } : null),
  crestUrl: (t) => t.crest,
}
```

- [ ] **Step 5: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/api-sports.test.ts`
Expected: PASS (13 tester).

- [ ] **Step 6: Commit**

```bash
cd "$PLG" && git add runtime/sport/api-sports.ts runtime/sport/api-sports.test.ts runtime/sport/__fixtures__/api-sports
git commit -m "live-tv sport: API-Sports adapter with documented-shape fixtures"
```

---

### Task 7: TheSportsDB-adaptern och källregistret

**Files:**
- Create: `$PLG/runtime/sport/thesportsdb.ts`
- Create: `$PLG/runtime/sport/providers.ts`
- Create: `$PLG/runtime/sport/__fixtures__/thesportsdb/{eventsday-soccer,livescore-soccer,lookup-event,event-timeline,event-stats,event-lineup,lookuptable,searchteams,all-sports}.json`
- Test: `$PLG/runtime/sport/thesportsdb.test.ts`

**Interfaces:**
- Consumes: Task 5, Task 6 (`apiSports`).
- Produces: `export const theSportsDb: SportsProvider`, `export const THESPORTSDB_PRICING_URL = 'https://www.thesportsdb.com/pricing'`. `providers.ts`: `export function providerFor(id: ProviderId): SportsProvider`, `export function coverageFor(id: ProviderId | null, sport: SportKind): 'full' | 'epg'` (`null` = ingen nyckel → `'epg'` för allt), `export const PROVIDER_IDS: ProviderId[]`.

TheSportsDB har ingen dygnskvot, bara en minutgräns. Den gemensamma hinken heter `all`. Golvet för pollning är 120 s, eftersom livescore uppdateras ungefär varannan minut. Tider anges i UTC.

- [ ] **Step 1: Skriv fixturerna**

`eventsday-soccer.json`:
```json
{ "_shape": "from docs — verify with real key",
  "events": [
    { "idEvent": "2100001", "strEvent": "Malmo FF vs Djurgardens IF", "strSport": "Soccer", "idLeague": "4347", "strLeague": "Swedish Allsvenskan", "strSeason": "2026",
      "strHomeTeam": "Malmo FF", "strAwayTeam": "Djurgardens IF", "idHomeTeam": "134001", "idAwayTeam": "134002", "intHomeScore": "2", "intAwayScore": "1", "intRound": "27",
      "strTimestamp": "2026-10-10T17:00:00", "dateEvent": "2026-10-10", "strTime": "17:00:00", "strVenue": "Eleda Stadion", "strStatus": "2H", "strProgress": "67", "strPostponed": "no",
      "strHomeTeamBadge": "https://r2.thesportsdb.com/images/media/team/badge/malmo.png", "strAwayTeamBadge": "https://r2.thesportsdb.com/images/media/team/badge/djurgarden.png" },
    { "idEvent": "2100002", "strEvent": "AIK vs IFK Goteborg", "strSport": "Soccer", "idLeague": "4347", "strLeague": "Swedish Allsvenskan", "strSeason": "2026",
      "strHomeTeam": "AIK", "strAwayTeam": "IFK Goteborg", "idHomeTeam": "134003", "idAwayTeam": "134004", "intHomeScore": null, "intAwayScore": null, "intRound": "27",
      "strTimestamp": "2026-10-10T19:00:00", "dateEvent": "2026-10-10", "strTime": "19:00:00", "strVenue": "Strawberry Arena", "strStatus": "Not Started", "strProgress": null, "strPostponed": "no",
      "strHomeTeamBadge": null, "strAwayTeamBadge": null }
  ] }
```

`livescore-soccer.json`:
```json
{ "_shape": "from docs — verify with real key",
  "livescore": [
    { "idLiveScore": "900001", "idEvent": "2100001", "strSport": "Soccer", "idLeague": "4347", "strLeague": "Swedish Allsvenskan", "idHomeTeam": "134001", "idAwayTeam": "134002",
      "strHomeTeam": "Malmo FF", "strAwayTeam": "Djurgardens IF", "strHomeTeamBadge": "https://r2.thesportsdb.com/images/media/team/badge/malmo.png", "strAwayTeamBadge": "https://r2.thesportsdb.com/images/media/team/badge/djurgarden.png",
      "intHomeScore": "3", "intAwayScore": "1", "strProgress": "71", "strStatus": "2H", "strEventTime": "17:00", "dateEvent": "2026-10-10", "updated": "2026-10-10 18:12:00" }
  ] }
```

`lookup-event.json`: `{ "_shape": "...", "lookup": [ <första objektet i eventsday-soccer.json> ] }` (kopiera objektet ordagrant).

`event-timeline.json`:
```json
{ "_shape": "from docs — verify with real key",
  "lookup": [
    { "idTimeline": "1", "idEvent": "2100001", "strTimeline": "Goal", "strTimelineDetail": "Normal Goal", "strHome": "Yes", "intTime": "12", "strPlayer": "Isaac Kiese Thelin", "strAssist": "Anders Christiansen", "idTeam": "134001", "strTeam": "Malmo FF" },
    { "idTimeline": "2", "idEvent": "2100001", "strTimeline": "Card", "strTimelineDetail": "Yellow Card", "strHome": "No", "intTime": "29", "strPlayer": "Marcus Danielson", "strAssist": "", "idTeam": "134002", "strTeam": "Djurgardens IF" },
    { "idTimeline": "3", "idEvent": "2100001", "strTimeline": "subst", "strTimelineDetail": "Substitution", "strHome": "Yes", "intTime": "60", "strPlayer": "Oscar Berg", "strAssist": "Sebastian Nanasi", "idTeam": "134001", "strTeam": "Malmo FF" }
  ] }
```

`event-stats.json`:
```json
{ "_shape": "from docs — verify with real key",
  "lookup": [
    { "idStatistic": "1", "idEvent": "2100001", "strStat": "Ball Possession", "intHome": "58", "intAway": "42" },
    { "idStatistic": "2", "idEvent": "2100001", "strStat": "Total Shots", "intHome": "14", "intAway": "7" }
  ] }
```

`event-lineup.json`:
```json
{ "_shape": "from docs — verify with real key",
  "lookup": [
    { "idLineup": "1", "idEvent": "2100001", "strPosition": "Goalkeeper", "strHome": "Yes", "strSubstitute": "No", "intSquadNumber": "1", "strPlayer": "Johan Dahlin", "idTeam": "134001", "strFormation": "4-3-3" },
    { "idLineup": "2", "idEvent": "2100001", "strPosition": "Forward", "strHome": "Yes", "strSubstitute": "No", "intSquadNumber": "9", "strPlayer": "Isaac Kiese Thelin", "idTeam": "134001", "strFormation": "4-3-3" },
    { "idLineup": "3", "idEvent": "2100001", "strPosition": "Midfielder", "strHome": "Yes", "strSubstitute": "Yes", "intSquadNumber": "20", "strPlayer": "Oscar Berg", "idTeam": "134001", "strFormation": "4-3-3" },
    { "idLineup": "4", "idEvent": "2100001", "strPosition": "Goalkeeper", "strHome": "No", "strSubstitute": "No", "intSquadNumber": "35", "strPlayer": "Jacob Widell Zetterström", "idTeam": "134002", "strFormation": "4-4-2" }
  ] }
```

`lookuptable.json`:
```json
{ "_shape": "from docs — verify with real key",
  "table": [
    { "idStanding": "1", "intRank": "1", "idTeam": "134003", "strTeam": "AIK", "strBadge": "https://r2.thesportsdb.com/images/media/team/badge/aik.png", "idLeague": "4347", "strLeague": "Swedish Allsvenskan", "strSeason": "2026", "strForm": "WWDWW", "strGroup": "", "intPlayed": "26", "intWin": "18", "intLoss": "4", "intDraw": "4", "intGoalsFor": "50", "intGoalsAgainst": "25", "intGoalDifference": "25", "intPoints": "58" },
    { "idStanding": "2", "intRank": "2", "idTeam": "134001", "strTeam": "Malmo FF", "strBadge": "https://r2.thesportsdb.com/images/media/team/badge/malmo.png", "idLeague": "4347", "strLeague": "Swedish Allsvenskan", "strSeason": "2026", "strForm": "WLWWD", "strGroup": "", "intPlayed": "26", "intWin": "17", "intLoss": "5", "intDraw": "4", "intGoalsFor": "55", "intGoalsAgainst": "25", "intGoalDifference": "30", "intPoints": "55" }
  ] }
```

`searchteams.json`:
```json
{ "_shape": "from docs — verify with real key",
  "teams": [
    { "idTeam": "134001", "strTeam": "Malmo FF", "strSport": "Soccer", "strCountry": "Sweden", "strBadge": "https://r2.thesportsdb.com/images/media/team/badge/malmo.png" },
    { "idTeam": "134900", "strTeam": "Malmo Redhawks", "strSport": "Ice Hockey", "strCountry": "Sweden", "strBadge": null }
  ] }
```

`all-sports.json`: `{ "_shape": "from docs — verify with real key", "all": [ { "idSport": "102", "strSport": "Soccer" }, { "idSport": "103", "strSport": "Ice Hockey" } ] }`

- [ ] **Step 2: Skriv de fallerande testerna**

```ts
// runtime/sport/thesportsdb.test.ts
import { describe, expect, it } from 'vitest'
import { theSportsDb } from './thesportsdb'
import { coverageFor, providerFor } from './providers'
import day from './__fixtures__/thesportsdb/eventsday-soccer.json'
import live from './__fixtures__/thesportsdb/livescore-soccer.json'
import lookup from './__fixtures__/thesportsdb/lookup-event.json'
import timeline from './__fixtures__/thesportsdb/event-timeline.json'
import stats from './__fixtures__/thesportsdb/event-stats.json'
import lineup from './__fixtures__/thesportsdb/event-lineup.json'
import table from './__fixtures__/thesportsdb/lookuptable.json'
import search from './__fixtures__/thesportsdb/searchteams.json'
import allSports from './__fixtures__/thesportsdb/all-sports.json'

const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 10, 22) }

describe('thesportsdb: förfrågningar', () => {
  it('en gemensam hink, 120 s golv, tennis bara EPG', () => {
    expect(theSportsDb.bucket('football')).toBe('all')
    expect(theSportsDb.bucket('hockey')).toBe('all')
    expect(theSportsDb.liveFloorMs).toBe(120_000)
    expect(theSportsDb.coverage('tennis')).toBe('epg')
    expect(theSportsDb.coverage('hockey')).toBe('full')
    expect(theSportsDb.quotaProbe('football')).toBeNull()
  })
  it('dag, live, matchcenter (fyra delar), tabell, sök, nyckelkontroll', () => {
    expect(theSportsDb.day('hockey', '2026-10-10', DAY).requests).toEqual([{ sport: 'hockey', path: '/v1/eventsday.php?d=2026-10-10&s=Ice%20Hockey', ttlS: 900 }])
    expect(theSportsDb.live('football', DAY).requests).toEqual([{ sport: 'football', path: '/v2/livescore/soccer', ttlS: 10 }])
    expect(theSportsDb.fixture('football', '2100001', { finished: true }).requests.map((r) => r.path)).toEqual([
      '/v2/lookup/event/2100001', '/v2/lookup/event_timeline/2100001', '/v2/lookup/event_stats/2100001', '/v2/lookup/event_lineup/2100001',
    ])
    expect(theSportsDb.standings('football', '4347', '2026').requests).toEqual([{ sport: 'football', path: '/v1/lookuptable.php?l=4347&s=2026', ttlS: 86400 }])
    expect(theSportsDb.searchTeams('football', 'malmo').requests).toEqual([{ sport: 'football', path: '/v1/searchteams.php?t=malmo', ttlS: 604800 }])
    expect(theSportsDb.validateKey().requests).toEqual([{ sport: 'football', path: '/v2/all/sports', ttlS: 0 }])
  })
})

describe('thesportsdb: tolkning', () => {
  it('dagsprogram med UTC-tider, ställning som tal och märken', () => {
    const [a, b] = theSportsDb.day('football', '2026-10-10', DAY).parse([day])
    expect(a).toMatchObject({ provider: 'thesportsdb', id: '2100001', kickoff: Date.UTC(2026, 9, 10, 17), status: 'live', minute: 67, score: { home: 2, away: 1 },
      league: { id: '4347', name: 'Swedish Allsvenskan', season: '2026', round: 27 }, home: { id: '134001', name: 'Malmo FF', crest: 'https://r2.thesportsdb.com/images/media/team/badge/malmo.png' }, venue: 'Eleda Stadion' })
    expect(b).toMatchObject({ status: 'scheduled', score: null, home: { crest: null } })
    expect(theSportsDb.day('football', '2026-10-10', DAY).parse([{ events: null }])).toEqual([])
  })
  it('livescore', () => {
    const [f] = theSportsDb.live('football', DAY).parse([live])
    expect(f).toMatchObject({ id: '2100001', status: 'live', minute: 71, score: { home: 3, away: 1 }, kickoff: Date.UTC(2026, 9, 10, 17) })
  })
  it('matchcenter av fyra delar; en saknad del ger tom rad, inte fel', () => {
    const d = theSportsDb.fixture('football', '2100001', { finished: false }).parse([lookup, timeline, stats, lineup])!
    expect(d.events.map((e) => [e.minute, e.type, e.side, e.player])).toEqual([[12, 'goal', 'home', 'Isaac Kiese Thelin'], [29, 'card', 'away', 'Marcus Danielson'], [60, 'sub', 'home', 'Oscar Berg']])
    expect(d.stats).toEqual([{ label: 'Ball Possession', home: '58', away: '42' }, { label: 'Total Shots', home: '14', away: '7' }])
    expect(d.lineups).toEqual([
      { side: 'home', formation: '4-3-3', startXI: [{ number: 1, name: 'Johan Dahlin', pos: 'Goalkeeper' }, { number: 9, name: 'Isaac Kiese Thelin', pos: 'Forward' }], subs: [{ number: 20, name: 'Oscar Berg', pos: 'Midfielder' }] },
      { side: 'away', formation: '4-4-2', startXI: [{ number: 35, name: 'Jacob Widell Zetterström', pos: 'Goalkeeper' }], subs: [] },
    ])
    const partial = theSportsDb.fixture('football', '2100001', { finished: false }).parse([lookup, null, null, null])!
    expect(partial.events).toEqual([])
    expect(theSportsDb.fixture('football', '1', { finished: false }).parse([null, null, null, null])).toBeNull()
  })
  it('tabell, sök filtrerat på sport, nyckelkontroll', () => {
    expect(theSportsDb.standings('football', '4347', '2026').parse([table])[1]).toEqual({ rank: 2, team: { id: '134001', name: 'Malmo FF', crest: 'https://r2.thesportsdb.com/images/media/team/badge/malmo.png' }, played: 26, points: 55, goalDiff: 30, form: 'WLWWD', group: null })
    expect(theSportsDb.searchTeams('football', 'malmo').parse([search]).map((t) => t.name)).toEqual(['Malmo FF'])
    expect(theSportsDb.validateKey().parse([allSports])).toEqual({ ok: true, plan: 'Premium', used: null, limit: null })
    expect(theSportsDb.validateKey().parse([null]).ok).toBe(false)
  })
})

describe('providers', () => {
  it('registret och täckningen utan nyckel', () => {
    expect(providerFor('thesportsdb')).toBe(theSportsDb)
    expect(providerFor('api-sports').id).toBe('api-sports')
    expect(coverageFor(null, 'football')).toBe('epg')
    expect(coverageFor('api-sports', 'tennis')).toBe('epg')
    expect(coverageFor('api-sports', 'hockey')).toBe('full')
  })
})
```

- [ ] **Step 3: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/thesportsdb.test.ts`
Expected: FAIL med "Failed to resolve import './thesportsdb'".

- [ ] **Step 4: Implementera**

```ts
// runtime/sport/thesportsdb.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- tolkar extern JSON fält för fält */
import type { SportKind } from './sport-model'
import type { DayOpts, Fixture, FixtureDetail, FixtureEvent, FixtureLineup, FixtureStatus, KeyCheck, LineupEntry, ProviderCall, SportsProvider, StandingRow, TeamHit } from './provider'

/**
 * TheSportsDB premium (9 USD/mån, alla sporter, 100 anrop/min, ingen
 * dygnskvot). v1 har nyckeln i sökvägen (appen sätter in den), v2 i headern
 * X-API-KEY. Livescore uppdateras ~var 2:a min, därav 120 s golv. Om SHL
 * uppdateras UNDER match i livescore är overifierat (spec, beslut 5).
 */
export const THESPORTSDB_PRICING_URL = 'https://www.thesportsdb.com/pricing'

const SPORTS: Partial<Record<SportKind, { day: string; live: string }>> = {
  football: { day: 'Soccer', live: 'soccer' },
  hockey: { day: 'Ice Hockey', live: 'icehockey' }, // live-namnet: verifiera med nyckel
  basketball: { day: 'Basketball', live: 'basketball' },
  handball: { day: 'Handball', live: 'handball' },
}

const arr = (v: any): any[] => (Array.isArray(v) ? v : [])
const num = (v: any): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null
const str = (v: any): string | null => (typeof v === 'string' && v.trim() ? v : null)
const enc = encodeURIComponent

function utc(ts: unknown, date: unknown, time: unknown): number {
  const raw = str(ts)
  if (raw) return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`)
  const d = str(date)
  const t = str(time) ?? '00:00:00'
  return d ? Date.parse(`${d}T${t.length === 5 ? `${t}:00` : t}Z`) : 0
}

export function tsdbStatus(status: unknown, postponed: unknown): FixtureStatus {
  const v = String(status ?? '').trim().toLowerCase()
  if (String(postponed ?? '').toLowerCase() === 'yes' || v.includes('postponed') || v.includes('cancel') || v === 'abd') return 'postponed'
  if (['ft', 'aet', 'pen', 'aot', 'ap', 'match finished', 'finished', 'after over time', 'after penalties'].includes(v)) return 'finished'
  if (['ht', 'half time', 'break', 'bt'].includes(v)) return 'ht'
  if (['', 'ns', 'not started', 'tbd', 'time to be defined'].includes(v)) return 'scheduled'
  return 'live'
}

function event(sport: SportKind, e: any): Fixture | null {
  if (!e?.idEvent) return null
  const h = num(e.intHomeScore)
  const a = num(e.intAwayScore)
  const status = tsdbStatus(e.strStatus, e.strPostponed)
  return {
    provider: 'thesportsdb', id: String(e.idEvent), sport,
    league: { id: String(e.idLeague ?? ''), name: String(e.strLeague ?? ''), season: String(e.strSeason ?? ''), round: num(e.intRound), country: str(e.strCountry) },
    kickoff: utc(e.strTimestamp, e.dateEvent, e.strTime ?? e.strEventTime),
    status, statusShort: String(e.strStatus ?? ''), minute: status === 'live' ? num(e.strProgress) : null,
    home: { id: String(e.idHomeTeam ?? ''), name: String(e.strHomeTeam ?? ''), crest: str(e.strHomeTeamBadge) },
    away: { id: String(e.idAwayTeam ?? ''), name: String(e.strAwayTeam ?? ''), crest: str(e.strAwayTeamBadge) },
    score: h != null && a != null ? { home: h, away: a } : null,
    venue: str(e.strVenue),
    lastGoal: null,
  }
}

const side = (x: any): 'home' | 'away' | null => (x?.strHome === 'Yes' ? 'home' : x?.strHome === 'No' ? 'away' : null)

function timelineEvent(x: any): FixtureEvent {
  const kind = String(x?.strTimeline ?? '').toLowerCase()
  const type = kind === 'goal' ? 'goal' : kind === 'card' ? 'card' : kind === 'subst' ? 'sub' : kind === 'var' ? 'var' : 'other'
  return { minute: num(x?.intTime), extra: null, side: side(x), type, detail: String(x?.strTimelineDetail ?? ''), player: str(x?.strPlayer), assist: str(x?.strAssist) }
}

function lineups(rows: any[]): FixtureLineup[] {
  const out: FixtureLineup[] = []
  for (const s of ['home', 'away'] as const) {
    const mine = rows.filter((r) => side(r) === s)
    if (mine.length === 0) continue
    const entry = (r: any): LineupEntry => ({ number: num(r?.intSquadNumber), name: String(r?.strPlayer ?? ''), pos: str(r?.strPosition) })
    out.push({ side: s, formation: str(mine[0]?.strFormation), startXI: mine.filter((r) => r?.strSubstitute !== 'Yes').map(entry), subs: mine.filter((r) => r?.strSubstitute === 'Yes').map(entry) })
  }
  return out
}

export const theSportsDb: SportsProvider = {
  id: 'thesportsdb',
  liveFloorMs: 120_000,
  coverage: (sport) => (SPORTS[sport] ? 'full' : 'epg'),
  bucket: () => 'all',
  day(sport, date, opts: DayOpts): ProviderCall<Fixture[]> {
    const s = SPORTS[sport]?.day ?? ''
    const past = date < opts.today
    return {
      requests: [{ sport, path: `/v1/eventsday.php?d=${date}&s=${enc(s)}`, ttlS: date === opts.today ? 900 : 21_600, ...(past ? { finalAfter: opts.dayEndMs + 3 * 3_600_000 } : {}) }],
      parse: (bodies) => arr((bodies[0] as any)?.events).map((e) => event(sport, e)).filter((f): f is Fixture => f !== null),
    }
  },
  live(sport): ProviderCall<Fixture[]> {
    return {
      requests: [{ sport, path: `/v2/livescore/${SPORTS[sport]?.live ?? ''}`, ttlS: 10 }],
      parse: (bodies) => arr((bodies[0] as any)?.livescore).map((e) => event(sport, e)).filter((f): f is Fixture => f !== null),
    }
  },
  fixture(sport, id, opts): ProviderCall<FixtureDetail | null> {
    const ttlS = opts.finished ? -1 : 60
    const parts = ['event', 'event_timeline', 'event_stats', 'event_lineup']
    return {
      requests: parts.map((p) => ({ sport, path: `/v2/lookup/${p}/${enc(id)}`, ttlS })),
      parse: (bodies) => {
        const raw = arr((bodies[0] as any)?.lookup)[0]
        const fixture = raw ? event(sport, raw) : null
        if (!fixture) return null
        return {
          fixture,
          events: arr((bodies[1] as any)?.lookup).map(timelineEvent),
          stats: arr((bodies[2] as any)?.lookup).map((s) => ({ label: String(s?.strStat ?? ''), home: String(s?.intHome ?? '0'), away: String(s?.intAway ?? '0') })),
          lineups: lineups(arr((bodies[3] as any)?.lookup)),
        }
      },
    }
  },
  standings(sport, leagueId, season): ProviderCall<StandingRow[]> {
    return {
      requests: [{ sport, path: `/v1/lookuptable.php?l=${enc(leagueId)}&s=${enc(season)}`, ttlS: 86_400 }],
      parse: (bodies) => arr((bodies[0] as any)?.table).map((r) => ({
        rank: num(r?.intRank) ?? 0,
        team: { id: String(r?.idTeam ?? ''), name: String(r?.strTeam ?? ''), crest: str(r?.strBadge) },
        played: num(r?.intPlayed) ?? 0, points: num(r?.intPoints) ?? 0, goalDiff: num(r?.intGoalDifference), form: str(r?.strForm), group: str(r?.strGroup),
      })),
    }
  },
  searchTeams(sport, q): ProviderCall<TeamHit[]> {
    const query = q.trim()
    if (query.length < 3) return { requests: [], parse: () => [] }
    const want = SPORTS[sport]?.day
    return {
      requests: [{ sport, path: `/v1/searchteams.php?t=${enc(query)}`, ttlS: 604_800 }],
      parse: (bodies) => arr((bodies[0] as any)?.teams)
        .filter((t) => !want || t?.strSport === want)
        .map((t) => ({ id: String(t?.idTeam ?? ''), name: String(t?.strTeam ?? ''), crest: str(t?.strBadge), country: str(t?.strCountry) })),
    }
  },
  validateKey: (): ProviderCall<KeyCheck> => ({
    requests: [{ sport: 'football', path: '/v2/all/sports', ttlS: 0 }],
    parse: (bodies) => (Array.isArray((bodies[0] as any)?.all) ? { ok: true, plan: 'Premium', used: null, limit: null } : { ok: false, plan: null, used: null, limit: null }),
  }),
  quotaProbe: () => null,
  crestUrl: (t) => t.crest,
}
```

```ts
// runtime/sport/providers.ts
import { apiSports } from './api-sports'
import { theSportsDb } from './thesportsdb'
import type { ProviderId, SportsProvider } from './provider'
import type { SportKind } from './sport-model'

export const PROVIDER_IDS: ProviderId[] = ['api-sports', 'thesportsdb']

export function providerFor(id: ProviderId): SportsProvider {
  return id === 'thesportsdb' ? theSportsDb : apiSports
}

/** Utan nyckel (`null`) är allt bara EPG. Gränssnittet lovar aldrig resultat där. */
export function coverageFor(id: ProviderId | null, sport: SportKind): 'full' | 'epg' {
  return id ? providerFor(id).coverage(sport) : 'epg'
}
```

- [ ] **Step 5: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/thesportsdb.test.ts`
Expected: PASS (7 tester).

- [ ] **Step 6: Commit**

```bash
cd "$PLG" && git add runtime/sport/thesportsdb.ts runtime/sport/providers.ts runtime/sport/thesportsdb.test.ts runtime/sport/__fixtures__/thesportsdb
git commit -m "live-tv sport: TheSportsDB premium adapter and provider registry"
```

---

### Task 8: Kvothanteraren (`budget.ts`)

**Files:**
- Create: `$PLG/runtime/sport/budget.ts`
- Test: `$PLG/runtime/sport/budget.test.ts`

**Interfaces:**
- Consumes: Task 5 (`sportFetch`, `SportQuota`, `FetchMode`), Task 7 (`providerFor`). Fas 1 `getSportSettings`, `SPORT_SETTINGS_KEY`, `onPluginStorageChanged`. Fas 1:s `SportSettings` har bara `view` och `alert`. Task 13 lägger `apiKey` och `provider`. Tills dess läser `currentBudget()` dem med en cast (se koden). Byt till direkt fältåtkomst i Task 13.
- Produces:
  ```ts
  export type CallKind = 'validate' | 'fixture' | 'day' | 'standings' | 'search' | 'live'
  export type BudgetFailure = 'no-key' | 'no-coverage' | 'over-budget' | 'paused' | 'invalid-key' | 'network'
  export type BudgetResult<T> =
    | { ok: true; data: T; cached: boolean; fetchedAt: number | null }
    | { ok: false; reason: BudgetFailure; data: T | null; fetchedAt: number | null; until: number | null }
  export interface BudgetDeps { fetch?: typeof sportFetch; now?: () => number; sleep?: (ms: number) => Promise<void> }
  export function reserveFor(limit: number | null): number
  export class Budget {
    constructor(provider: SportsProvider, key: string | null, deps?: BudgetDeps)
    readonly provider: SportsProvider; readonly key: string | null
    hasKey(): boolean; isInvalid(): boolean
    quota(bucket: string): SportQuota
    noteQuota(q: SportQuota): void
    setPlanned(bucket: string, n: number): void; plannedFor(bucket: string): number
    allows(kind: CallKind, bucket: string, n: number): boolean
    liveIntervalMs(bucket: string, windowEndsAt: number): number | null
    run<T>(kind: CallKind, sport: SportKind, call: ProviderCall<T>): Promise<BudgetResult<T>>
    day(sport, date, opts: DayOpts); live(sport, opts: LiveOpts); fixture(sport, id, opts: { finished: boolean })
    standings(sport, leagueId, season); searchTeams(sport, q); validate(): Promise<BudgetResult<KeyCheck>>
    peek<T>(sport: SportKind, call: ProviderCall<T>): Promise<T | null>   // bara diskcachen, aldrig nät
    subscribe(cb: () => void): () => void
  }
  export function currentBudget(): Budget | null   // singleton per (källa, nyckel); null utan nyckel
  ```

Regler (spec, "Kvothanteraren"):
- `validate` släpps alltid igenom, om inte hinken är spärrad. `status` kostar inget.
- `fixture` (matchcentret) får använda reserven: `remaining ≥ n`.
- `day`, `standings` och `search` kräver `remaining − n ≥ reserv`.
- `live` kräver `remaining − n ≥ reserv + planerade`.
- `remaining === null`: TheSportsDB (ingen dygnskvot) släpps igenom, och Rust sköter minutgränsen. För API-Sports körs först `quotaProbe` (gratis) en gång per hink, så att kvoten är känd före första riktiga anropet.
- Ej tillåtet → läget `cache-only`. Rust går då aldrig uppströms och svaret är den senaste cachen.
- `unauthorized` → `invalid-key`, och alla senare anrop utom `validate` stoppas utan nät.
- Nätfel → **ett** omförsök efter 2 s, om det fortfarande är tillåtet. Sedan svaret med cachen.

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/sport/budget.test.ts
import { describe, expect, it, vi } from 'vitest'
import { Budget, reserveFor } from './budget'
import type { ProviderCall, SportsProvider } from './provider'
import type { FetchMode, SportFetchResponse, SportQuota } from './sport-fetch'

const NOW = Date.UTC(2026, 9, 10, 18, 0)

const q = (over: Partial<SportQuota> = {}): SportQuota => ({ bucket: 'football', limit: 100, remaining: 80, minuteLimit: 10, minuteRemaining: 9, blockedUntil: null, reason: null, plan: 'Free', ...over })

const call = (sport: 'football' | 'tennis' = 'football'): ProviderCall<number[]> => ({
  requests: [{ sport, path: '/fixtures?date=2026-10-10', ttlS: 900 }],
  parse: (b) => ((b[0] as { response?: number[] } | null)?.response ?? []),
})

const fake: SportsProvider = {
  id: 'api-sports', liveFloorMs: 15_000,
  coverage: (s) => (s === 'tennis' ? 'epg' : 'full'), bucket: (s) => s,
  day: () => call(), live: () => call(), fixture: () => ({ requests: [], parse: () => null }),
  standings: () => ({ requests: [], parse: () => [] }), searchTeams: () => ({ requests: [], parse: () => [] }),
  validateKey: () => ({ requests: [{ sport: 'football', path: '/status', ttlS: 0 }], parse: (b) => ({ ok: b[0] != null, plan: 'Free', used: 12, limit: 100 }) }),
  quotaProbe: (sport) => ({ requests: [{ sport, path: '/status', ttlS: 0 }], parse: () => ({ ok: true, plan: 'Free', used: 0, limit: 100 }) }),
  crestUrl: () => null,
}

function harness(responses: Array<Partial<SportFetchResponse>>, quota: SportQuota | null = q()) {
  const calls: Array<{ path: string; mode: FetchMode }> = []
  let i = 0
  const fetch = vi.fn(async ({ req, mode }: { req: { path: string }; mode: FetchMode }) => {
    calls.push({ path: req.path, mode })
    const r = responses[Math.min(i++, responses.length - 1)]
    return { data: null, cached: false, fresh: true, fetchedAt: NOW, quota, error: null, ...r } as SportFetchResponse
  })
  let now = NOW
  const budget = new Budget(fake, 'k123', { fetch: fetch as never, now: () => now, sleep: async () => {} })
  if (quota) budget.noteQuota(quota)
  return { budget, calls, fetch, advance: (ms: number) => { now += ms } }
}

describe('reserven', () => {
  it('10 %, minst 5', () => {
    expect(reserveFor(100)).toBe(10)
    expect(reserveFor(30)).toBe(5)
    expect(reserveFor(7500)).toBe(750)
    expect(reserveFor(null)).toBe(0)
  })
})

describe('Budget.run', () => {
  it('utan nyckel görs inget anrop', async () => {
    const fetch = vi.fn()
    const b = new Budget(fake, null, { fetch: fetch as never })
    expect(await b.run('day', 'football', call())).toMatchObject({ ok: false, reason: 'no-key' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sport utan täckning (tennis) ger inga anrop', async () => {
    const { budget, fetch } = harness([{}])
    expect(await budget.run('day', 'tennis', call('tennis'))).toMatchObject({ ok: false, reason: 'no-coverage' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('dagsprogram inom budget går cache-first och tolkas', async () => {
    const { budget, calls } = harness([{ data: { response: [1, 2] } }])
    expect(await budget.run('day', 'football', call())).toEqual({ ok: true, data: [1, 2], cached: false, fetchedAt: NOW })
    expect(calls).toEqual([{ path: '/fixtures?date=2026-10-10', mode: 'cache-first' }])
  })

  it('i reserven: dagsprogram bara ur cachen, matchcenter släpps igenom', async () => {
    const { budget, calls } = harness([{ data: { response: [9] }, cached: true, fresh: false }], q({ remaining: 10 }))
    const day = await budget.run('day', 'football', call())
    expect(day).toMatchObject({ ok: false, reason: 'over-budget', data: [9] })
    await budget.run('fixture', 'football', call())
    expect(calls.map((c) => c.mode)).toEqual(['cache-only', 'cache-first'])
  })

  it('live respekterar planerade anrop', () => {
    const { budget } = harness([{}], q({ remaining: 20 }))
    budget.setPlanned('football', 5)
    expect(budget.allows('live', 'football', 1)).toBe(true)  // 19 ≥ 10 + 5
    budget.noteQuota(q({ remaining: 15 }))
    expect(budget.allows('live', 'football', 1)).toBe(false) // 14 < 15
    expect(budget.allows('day', 'football', 1)).toBe(true)   // 14 ≥ 10
  })

  it('slut kvot: pausar, och nästa anrop går bara ur cachen tills spärren släpper', async () => {
    const until = Date.UTC(2026, 9, 11)
    const { budget, calls, advance } = harness([{ error: 'exhausted', quota: q({ remaining: 0, blockedUntil: until, reason: 'exhausted' }) }, { data: { response: [] } }])
    expect(await budget.run('day', 'football', call())).toMatchObject({ ok: false, reason: 'paused', until })
    await budget.run('day', 'football', call())
    expect(calls[1].mode).toBe('cache-only')
  })

  it('paused_until_passes_then_allows', async () => {
    const until = NOW + 60_000
    const { budget, advance } = harness([{}], q({ blockedUntil: until, reason: 'rate-limited' }))
    expect(budget.allows('day', 'football', 1)).toBe(false)
    advance(60_001)
    expect(budget.allows('day', 'football', 1)).toBe(true)
  })

  it('fel nyckel stoppar allt utom validering, utan nät', async () => {
    const { budget, fetch } = harness([{ error: 'unauthorized' }])
    expect(await budget.run('day', 'football', call())).toMatchObject({ ok: false, reason: 'invalid-key' })
    expect(budget.isInvalid()).toBe(true)
    await budget.run('live', 'football', call())
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('nätfel: exakt ett omförsök, sedan cachen', async () => {
    const { budget, calls } = harness([{ error: 'network', data: { response: [7] }, cached: true, fresh: false }])
    const r = await budget.run('day', 'football', call())
    expect(calls).toHaveLength(2)
    expect(r).toMatchObject({ ok: false, reason: 'network', data: [7] })
  })

  it('peek läser bara diskcachen och spenderar inget', async () => {
    const { budget, calls } = harness([{ data: { response: [4] }, cached: true, fresh: false }], q({ remaining: 0, blockedUntil: NOW + 1_000, reason: 'exhausted' }))
    expect(await budget.peek('football', call())).toEqual([4])
    expect(calls.map((c) => c.mode)).toEqual(['cache-only'])
    expect(await new Budget(fake, null).peek('football', call())).toBeNull()
  })

  it('okänd kvot hos API-Sports: gratis status-prov först', async () => {
    const { budget, calls } = harness([{ data: {} }, { data: { response: [] } }], null)
    await budget.run('day', 'hockey', { requests: [{ sport: 'hockey', path: '/games?date=2026-10-10', ttlS: 900 }], parse: () => [] })
    expect(calls.map((c) => c.path)).toEqual(['/status', '/games?date=2026-10-10'])
  })
})

describe('liveIntervalMs', () => {
  it('gratis en matchkväll: ~3,6 min', () => {
    const { budget } = harness([{}], q({ remaining: 80 }))
    budget.setPlanned('football', 4)
    expect(budget.liveIntervalMs('football', NOW + 4 * 3_600_000)).toBe(Math.ceil(14_400_000 / 66))
  })
  it('betald: golvet 15 s', () => {
    const { budget } = harness([{}], q({ limit: 7500, remaining: 7000 }))
    expect(budget.liveIntervalMs('football', NOW + 4 * 3_600_000)).toBe(15_000)
  })
  it('inget kvar ovanför reserven: ingen pollning', () => {
    const { budget } = harness([{}], q({ remaining: 10 }))
    expect(budget.liveIntervalMs('football', NOW + 3_600_000)).toBeNull()
  })
  it('spärrad: ingen pollning', () => {
    const { budget } = harness([{}], q({ blockedUntil: NOW + 1000, reason: 'rate-limited' }))
    expect(budget.liveIntervalMs('football', NOW + 3_600_000)).toBeNull()
  })
  it('ingen dygnskvot (TheSportsDB): golvet', () => {
    const { budget } = harness([{}], q({ remaining: null, limit: null }))
    expect(budget.liveIntervalMs('football', NOW + 3_600_000)).toBe(15_000)
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/budget.test.ts`
Expected: FAIL med "Failed to resolve import './budget'".

- [ ] **Step 3: Implementera**

```ts
// runtime/sport/budget.ts
'use client'

import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { sportFetch, type FetchMode, type SportFetchResponse, type SportQuota } from './sport-fetch'
import { providerFor } from './providers'
import { SPORT_SETTINGS_KEY, getSportSettings } from './sport-store'
import type { DayOpts, Fixture, FixtureDetail, KeyCheck, LiveOpts, ProviderCall, ProviderId, SportsProvider, StandingRow, TeamHit } from './provider'
import type { SportKind } from './sport-model'

/**
 * KVOTHANTERAREN. Äger VARJE anrop mot källan (spec: "Kvothanteraren").
 * Ingen annan modul får importera `sport-fetch` med värde. Det fäller ett
 * test i sport-fetch.test.ts.
 *
 * Sanningen om kvoten är svarets `quota` (Rust läser källans headers och
 * för en bok som delas av alla klienter mot värden). Mellan svaren räknar vi
 * ned lokalt, så att två samtidiga anrop inte båda tror att samma sista
 * anrop är ledigt.
 */
export type CallKind = 'validate' | 'fixture' | 'day' | 'standings' | 'search' | 'live'
export type BudgetFailure = 'no-key' | 'no-coverage' | 'over-budget' | 'paused' | 'invalid-key' | 'network'
export type BudgetResult<T> =
  | { ok: true; data: T; cached: boolean; fetchedAt: number | null }
  | { ok: false; reason: BudgetFailure; data: T | null; fetchedAt: number | null; until: number | null }

export interface BudgetDeps {
  fetch?: typeof sportFetch
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

const RETRY_MS = 2_000

export function reserveFor(limit: number | null): number {
  return limit == null ? 0 : Math.max(5, Math.ceil(limit * 0.1))
}

const unknownQuota = (bucket: string): SportQuota => ({ bucket, limit: null, remaining: null, minuteLimit: null, minuteRemaining: null, blockedUntil: null, reason: null, plan: null })

export class Budget {
  private quotas = new Map<string, SportQuota>()
  private planned = new Map<string, number>()
  private primed = new Set<string>()
  private invalid = false
  private listeners = new Set<() => void>()
  private readonly fetchImpl: typeof sportFetch
  private readonly now: () => number
  private readonly sleep: (ms: number) => Promise<void>

  constructor(readonly provider: SportsProvider, readonly key: string | null, deps: BudgetDeps = {}) {
    this.fetchImpl = deps.fetch ?? sportFetch
    this.now = deps.now ?? Date.now
    this.sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  }

  hasKey(): boolean { return !!this.key }
  isInvalid(): boolean { return this.invalid }

  quota(bucket: string): SportQuota { return this.quotas.get(bucket) ?? unknownQuota(bucket) }

  noteQuota(q: SportQuota): void {
    this.quotas.set(q.bucket, q)
    this.emit()
  }

  setPlanned(bucket: string, n: number): void {
    if ((this.planned.get(bucket) ?? 0) === n) return
    this.planned.set(bucket, Math.max(0, n))
    this.emit()
  }
  plannedFor(bucket: string): number { return this.planned.get(bucket) ?? 0 }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }
  private emit(): void { for (const cb of [...this.listeners]) cb() }

  private blocked(bucket: string): boolean {
    const until = this.quota(bucket).blockedUntil
    return until != null && until > this.now()
  }

  allows(kind: CallKind, bucket: string, n: number): boolean {
    if (this.blocked(bucket)) return false
    if (kind === 'validate') return true
    const q = this.quota(bucket)
    if (q.remaining == null) return true
    const reserve = reserveFor(q.limit)
    switch (kind) {
      case 'fixture': return q.remaining >= n
      case 'day':
      case 'standings':
      case 'search': return q.remaining - n >= reserve
      case 'live': return q.remaining - n >= reserve + this.plannedFor(bucket)
    }
  }

  /** `max(golv, återstående livefönster / (kvar − reserv − planerat))`. `null` = polla inte. */
  liveIntervalMs(bucket: string, windowEndsAt: number): number | null {
    if (this.blocked(bucket)) return null
    const floor = this.provider.liveFloorMs
    const q = this.quota(bucket)
    if (q.remaining == null) return floor
    const spendable = q.remaining - reserveFor(q.limit) - this.plannedFor(bucket)
    if (spendable <= 0) return null
    return Math.max(floor, Math.ceil(Math.max(0, windowEndsAt - this.now()) / spendable))
  }

  private spendLocal(bucket: string, n: number): void {
    const q = this.quotas.get(bucket)
    if (q && q.remaining != null && n > 0) this.quotas.set(bucket, { ...q, remaining: Math.max(0, q.remaining - n) })
  }

  private async prime(sport: SportKind, bucket: string): Promise<void> {
    if (this.primed.has(bucket) || this.quota(bucket).remaining != null) return
    const probe = this.provider.quotaProbe(sport)
    this.primed.add(bucket)
    if (!probe) return
    for (const req of probe.requests) {
      const res = await this.fetchImpl({ provider: this.provider.id, key: this.key ?? '', req, mode: 'cache-first' })
      if (res.quota) this.noteQuota(res.quota)
      if (res.error === 'unauthorized') { this.invalid = true; this.emit() }
    }
  }

  async run<T>(kind: CallKind, sport: SportKind, call: ProviderCall<T>): Promise<BudgetResult<T>> {
    const none = (reason: BudgetFailure): BudgetResult<T> => ({ ok: false, reason, data: null, fetchedAt: null, until: null })
    if (!this.key) return none('no-key')
    if (this.provider.coverage(sport) !== 'full') return none('no-coverage')
    if (this.invalid && kind !== 'validate') return none('invalid-key')
    if (call.requests.length === 0) return { ok: true, data: call.parse([]), cached: true, fetchedAt: null }
    const bucket = this.provider.bucket(sport)
    if (kind !== 'validate') {
      await this.prime(sport, bucket)
      if (this.invalid) return none('invalid-key')
    }
    const n = call.requests.length
    const affordable = this.allows(kind, bucket, n)
    const mode: FetchMode = affordable ? 'cache-first' : 'cache-only'
    if (affordable && kind !== 'validate') this.spendLocal(bucket, n)
    let failure: BudgetFailure | null = affordable ? null : this.blocked(bucket) ? 'paused' : 'over-budget'
    let cached = true
    let fetchedAt: number | null = null
    const bodies: unknown[] = []
    for (const req of call.requests) {
      let res: SportFetchResponse = await this.fetchImpl({ provider: this.provider.id, key: this.key, req, mode })
      if (res.error === 'network' && mode === 'cache-first') {
        await this.sleep(RETRY_MS)
        if (this.allows(kind, bucket, 1)) res = await this.fetchImpl({ provider: this.provider.id, key: this.key, req, mode })
      }
      if (res.quota) this.noteQuota(res.quota)
      if (res.error === 'unauthorized') {
        this.invalid = true
        this.emit()
        return none('invalid-key')
      }
      if (res.error && !failure) failure = res.error === 'network' || res.error === 'upstream' || res.error === 'not-allowed' ? 'network' : 'paused'
      if (!res.cached) cached = false
      if (res.fetchedAt != null) fetchedAt = fetchedAt == null ? res.fetchedAt : Math.min(fetchedAt, res.fetchedAt)
      bodies.push(res.data)
    }
    let data: T | null = null
    if (bodies.some((b) => b != null)) {
      try { data = call.parse(bodies) } catch { data = null }
    }
    if (failure || data == null) {
      return { ok: false, reason: failure ?? 'network', data, fetchedAt, until: this.quota(bucket).blockedUntil }
    }
    return { ok: true, data, cached, fetchedAt }
  }

  day(sport: SportKind, date: string, opts: DayOpts) { return this.run<Fixture[]>('day', sport, this.provider.day(sport, date, opts)) }
  live(sport: SportKind, opts: LiveOpts) { return this.run<Fixture[]>('live', sport, this.provider.live(sport, opts)) }
  fixture(sport: SportKind, id: string, opts: { finished: boolean }) { return this.run<FixtureDetail | null>('fixture', sport, this.provider.fixture(sport, id, opts)) }
  standings(sport: SportKind, leagueId: string, season: string) { return this.run<StandingRow[]>('standings', sport, this.provider.standings(sport, leagueId, season)) }
  searchTeams(sport: SportKind, q: string) { return this.run<TeamHit[]>('search', sport, this.provider.searchTeams(sport, q)) }
  validate() { return this.run<KeyCheck>('validate', 'football', this.provider.validateKey()) }

  /** Startvärdet ur diskcachen innan något anrop görs. Alltid `cache-only`, så det kostar aldrig kvot. */
  async peek<T>(sport: SportKind, call: ProviderCall<T>): Promise<T | null> {
    if (!this.key || this.provider.coverage(sport) !== 'full' || call.requests.length === 0) return null
    const bodies: unknown[] = []
    for (const req of call.requests) bodies.push((await this.fetchImpl({ provider: this.provider.id, key: this.key, req, mode: 'cache-only' })).data)
    if (bodies.every((b) => b == null)) return null
    try { return call.parse(bodies) } catch { return null }
  }
}

let current: { id: string; budget: Budget | null } | null = null

/** EN kvothanterare per (källa, nyckel). `null` utan nyckel: då görs inga anrop. */
export function currentBudget(): Budget | null {
  // Fas 1:s SportSettings saknar apiKey och provider tills Task 13 lägger dem. Castas bort i Task 13.
  const s = getSportSettings() as { apiKey?: string | null; provider?: ProviderId }
  const provider: ProviderId = s.provider ?? 'api-sports'
  const apiKey = s.apiKey ?? null
  const id = `${provider}|${apiKey ?? ''}`
  if (current?.id === id) return current.budget
  current = { id, budget: apiKey ? new Budget(providerFor(provider), apiKey) : null }
  return current.budget
}

onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, () => { current = null })

export function __resetBudgetForTests(): void { current = null }
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/budget.test.ts runtime/sport/sport-fetch.test.ts`
Expected: PASS (budget: 16 tester; sport-fetch: importregeln är fortfarande grön).

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/budget.ts runtime/sport/budget.test.ts
git commit -m "live-tv sport: quota manager owns every provider call"
```

---

### Task 9: Dygnsplanen

**Files:**
- Create: `$PLG/runtime/sport/day-plan.ts`
- Test: `$PLG/runtime/sport/day-plan.test.ts`

**Interfaces:**
- Consumes: Task 5 (`SportsProvider`), fas 1 `SportKind`.
- Produces:
  ```ts
  export interface LeagueRef { sport: SportKind; leagueId: string; season: string }
  export interface DayPlanInput { today: string; yesterday: string; tomorrow: string; sports: SportKind[]; leagues: LeagueRef[]; done: Set<string> }
  export type PlannedCall = { kind: 'day'; sport: SportKind; date: string } | { kind: 'standings'; sport: SportKind; leagueId: string; season: string }
  export function planKey(c: PlannedCall): string   // 'day|football|2026-10-10' / 'standings|football|113|2026'
  export function planDay(input: DayPlanInput, provider: SportsProvider): PlannedCall[]
  export function plannedPerBucket(calls: PlannedCall[], provider: SportsProvider): Map<string, number>
  export function localDates(now: number, tz: string): { today: string; yesterday: string; tomorrow: string; dayEndMs: (date: string) => number }
  ```

Ordningen följer specen: 1) idag per sport, 2) igår och imorgon en gång per dygn, 3) tabeller för följda och visade ligor. Matchcentret och reserven planeras inte. De tas på begäran och skyddas av `allows`. `done` innehåller `planKey` för det som redan hämtats under kvotdygnet. Idag planeras alltid, eftersom TTL:n i Rust avgör om det kostar.

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/sport/day-plan.test.ts
import { describe, expect, it } from 'vitest'
import { localDates, planDay, plannedPerBucket, planKey } from './day-plan'
import { apiSports } from './api-sports'
import { theSportsDb } from './thesportsdb'

const base = { today: '2026-10-10', yesterday: '2026-10-09', tomorrow: '2026-10-11' }

describe('planDay', () => {
  it('idag först, sedan igår/imorgon, sedan tabeller; tennis aldrig', () => {
    const plan = planDay({ ...base, sports: ['football', 'tennis', 'hockey'], leagues: [{ sport: 'football', leagueId: '113', season: '2026' }], done: new Set() }, apiSports)
    expect(plan.map(planKey)).toEqual([
      'day|football|2026-10-10', 'day|hockey|2026-10-10',
      'day|football|2026-10-09', 'day|football|2026-10-11', 'day|hockey|2026-10-09', 'day|hockey|2026-10-11',
      'standings|football|113|2026',
    ])
  })
  it('det som hämtats i dag planeras inte igen (utom idag)', () => {
    const done = new Set(['day|football|2026-10-09', 'day|football|2026-10-11', 'standings|football|113|2026', 'day|football|2026-10-10'])
    const plan = planDay({ ...base, sports: ['football'], leagues: [{ sport: 'football', leagueId: '113', season: '2026' }], done }, apiSports)
    expect(plan.map(planKey)).toEqual(['day|football|2026-10-10'])
  })
  it('dubbletter av ligor slås ihop', () => {
    const l = { sport: 'hockey' as const, leagueId: '47', season: '2026' }
    expect(planDay({ ...base, sports: [], leagues: [l, l], done: new Set() }, apiSports).map(planKey)).toEqual(['standings|hockey|47|2026'])
  })
})

describe('plannedPerBucket', () => {
  it('API-Sports räknar per sport, TheSportsDB i en hink', () => {
    const plan = planDay({ ...base, sports: ['football', 'hockey'], leagues: [], done: new Set() }, apiSports)
    expect(Object.fromEntries(plannedPerBucket(plan, apiSports))).toEqual({ football: 3, hockey: 3 })
    expect(Object.fromEntries(plannedPerBucket(plan, theSportsDb))).toEqual({ all: 6 })
  })
})

describe('localDates', () => {
  it('Stockholm kl 01:30 lokal tid är fortfarande 2026-10-10', () => {
    const d = localDates(Date.UTC(2026, 9, 9, 23, 30), 'Europe/Stockholm')
    expect([d.yesterday, d.today, d.tomorrow]).toEqual(['2026-10-09', '2026-10-10', '2026-10-11'])
    expect(d.dayEndMs('2026-10-10')).toBe(Date.UTC(2026, 9, 10, 22))
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/day-plan.test.ts`
Expected: FAIL med "Failed to resolve import './day-plan'".

- [ ] **Step 3: Implementera**

```ts
// runtime/sport/day-plan.ts
import type { SportsProvider } from './provider'
import type { SportKind } from './sport-model'

export interface LeagueRef { sport: SportKind; leagueId: string; season: string }
export interface DayPlanInput { today: string; yesterday: string; tomorrow: string; sports: SportKind[]; leagues: LeagueRef[]; done: Set<string> }
export type PlannedCall =
  | { kind: 'day'; sport: SportKind; date: string }
  | { kind: 'standings'; sport: SportKind; leagueId: string; season: string }

export function planKey(c: PlannedCall): string {
  return c.kind === 'day' ? `day|${c.sport}|${c.date}` : `standings|${c.sport}|${c.leagueId}|${c.season}`
}

export function planDay(input: DayPlanInput, provider: SportsProvider): PlannedCall[] {
  const sports = [...new Set(input.sports)].filter((s) => provider.coverage(s) === 'full')
  const out: PlannedCall[] = sports.map((sport) => ({ kind: 'day', sport, date: input.today }))
  for (const sport of sports) {
    for (const date of [input.yesterday, input.tomorrow]) {
      const c: PlannedCall = { kind: 'day', sport, date }
      if (!input.done.has(planKey(c))) out.push(c)
    }
  }
  const seen = new Set<string>()
  for (const l of input.leagues) {
    if (provider.coverage(l.sport) !== 'full') continue
    const c: PlannedCall = { kind: 'standings', sport: l.sport, leagueId: l.leagueId, season: l.season }
    const k = planKey(c)
    if (seen.has(k) || input.done.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

export function plannedPerBucket(calls: PlannedCall[], provider: SportsProvider): Map<string, number> {
  const out = new Map<string, number>()
  for (const c of calls) out.set(provider.bucket(c.sport), (out.get(provider.bucket(c.sport)) ?? 0) + 1)
  return out
}

function ymd(ms: number, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Tidszonens förskjutning (ms) vid en tidpunkt, utan bibliotek. */
function offsetMs(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ms))
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second')) - Math.floor(ms / 1000) * 1000
}

export function localDates(now: number, tz: string) {
  const today = ymd(now, tz)
  const [y, m, d] = today.split('-').map(Number)
  const shift = (days: number) => ymd(Date.UTC(y, m - 1, d + days, 12), 'UTC')
  const dayEndMs = (date: string) => {
    const [yy, mm, dd] = date.split('-').map(Number)
    const utcMidnight = Date.UTC(yy, mm - 1, dd + 1)
    return utcMidnight - offsetMs(utcMidnight, tz)
  }
  return { today, yesterday: shift(-1), tomorrow: shift(1), dayEndMs }
}
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/day-plan.test.ts`
Expected: PASS (5 tester).

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/day-plan.ts runtime/sport/day-plan.test.ts
git commit -m "live-tv sport: daily call plan in priority order"
```

---

### Task 10: Livepollning (efterfrågan, synlighet, intervall)

**Files:**
- Create: `$PLG/runtime/sport/live-poller.ts`
- Test: `$PLG/runtime/sport/live-poller.test.ts`

**Interfaces:**
- Consumes: Task 8 (`Budget`: `live`, `liveIntervalMs`), Task 5 (`Fixture`, `LiveOpts`).
- Produces:
  ```ts
  export type DemandReason = 'sport-view' | 'match-center' | 'player'
  export function acquirePollDemand(reason: DemandReason): () => void
  export function hasPollDemand(): boolean
  export function onPollDemandChanged(cb: () => void): () => void
  export function usePollDemand(reason: DemandReason, active: boolean): void
  export interface LiveTarget { sport: SportKind; hot: boolean; windowEndsAt: number }
  export interface LivePollerDeps {
    budget: Budget; targets(): LiveTarget[]; onFixtures(sport: SportKind, fixtures: Fixture[]): void; liveOpts(): LiveOpts
    now?: () => number; setTimer?: (fn: () => void, ms: number) => unknown; clearTimer?: (h: unknown) => void
    isVisible?: () => boolean; onVisibility?: (cb: () => void) => () => void
  }
  export interface LivePoller { start(): void; stop(): void; reschedule(): void; nextDelayMs(): number | null }
  export function createLivePoller(deps: LivePollerDeps): LivePoller
  export function __resetPollDemandForTests(): void
  ```

En sport är "het" när en täckt match är live eller paus, eller börjar inom 10 min. `windowEndsAt` är sista avspark + 2 h. Poller-instansen ägs av resultatkontrollern (Task 14).

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/sport/live-poller.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetPollDemandForTests, acquirePollDemand, createLivePoller, hasPollDemand, type LiveTarget } from './live-poller'

const NOW = Date.UTC(2026, 9, 10, 18)

function setup(opts: { interval?: number | null; targets?: LiveTarget[]; visible?: boolean } = {}) {
  let visible = opts.visible ?? true
  let visCb: (() => void) | null = null
  const live = vi.fn(async () => ({ ok: true as const, data: [], cached: false, fetchedAt: NOW }))
  const budget = { live, liveIntervalMs: vi.fn(() => (opts.interval === undefined ? 60_000 : opts.interval)), provider: { bucket: (s: string) => s } }
  const onFixtures = vi.fn()
  const poller = createLivePoller({
    budget: budget as never,
    targets: () => opts.targets ?? [{ sport: 'football', hot: true, windowEndsAt: NOW + 3_600_000 }],
    onFixtures, liveOpts: () => ({ today: '2026-10-10', tz: 'Europe/Stockholm' }),
    now: () => Date.now(),
    isVisible: () => visible,
    onVisibility: (cb) => { visCb = cb; return () => { visCb = null } },
  })
  return { poller, live, onFixtures, hide: () => { visible = false; visCb?.() }, show: () => { visible = true; visCb?.() } }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); __resetPollDemandForTests() })
afterEach(() => { vi.useRealTimers() })

describe('efterfrågan', () => {
  it('räknas per anledning och släpps idempotent', () => {
    const a = acquirePollDemand('sport-view')
    const b = acquirePollDemand('player')
    a(); a()
    expect(hasPollDemand()).toBe(true)
    b()
    expect(hasPollDemand()).toBe(false)
  })
})

describe('livepollern', () => {
  it('ingen efterfrågan → inga anrop', async () => {
    const { poller, live } = setup()
    poller.start()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(live).not.toHaveBeenCalled()
  })

  it('med efterfrågan och het sport: ett anrop per intervall', async () => {
    const { poller, live, onFixtures } = setup({ interval: 60_000 })
    poller.start()
    const release = acquirePollDemand('sport-view')
    await vi.advanceTimersByTimeAsync(59_000)
    expect(live).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(live).toHaveBeenCalledTimes(1)
    expect(onFixtures).toHaveBeenCalledWith('football', [])
    await vi.advanceTimersByTimeAsync(60_000)
    expect(live).toHaveBeenCalledTimes(2)
    release()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(live).toHaveBeenCalledTimes(2)
  })

  it('pausas när appen går i bakgrunden och fortsätter när den syns', async () => {
    const { poller, live, hide, show } = setup({ interval: 60_000 })
    poller.start()
    acquirePollDemand('match-center')
    hide()
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(live).not.toHaveBeenCalled()
    show()
    await vi.advanceTimersByTimeAsync(61_000)
    expect(live).toHaveBeenCalledTimes(1)
  })

  it('ingen het sport eller intervallet null → inga anrop', async () => {
    const cold = setup({ targets: [{ sport: 'football', hot: false, windowEndsAt: NOW }] })
    cold.poller.start()
    acquirePollDemand('sport-view')
    await vi.advanceTimersByTimeAsync(30 * 60_000)
    expect(cold.live).not.toHaveBeenCalled()
    __resetPollDemandForTests()
    const broke = setup({ interval: null })
    broke.poller.start()
    acquirePollDemand('sport-view')
    await vi.advanceTimersByTimeAsync(30 * 60_000)
    expect(broke.live).not.toHaveBeenCalled()
  })

  it('stop() släpper timern', async () => {
    const { poller, live } = setup({ interval: 60_000 })
    poller.start()
    acquirePollDemand('player')
    poller.stop()
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(live).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/live-poller.test.ts`
Expected: FAIL med "Failed to resolve import './live-poller'".

- [ ] **Step 3: Implementera**

```ts
// runtime/sport/live-poller.ts
'use client'

import { useEffect } from 'react'
import type { Budget } from './budget'
import type { Fixture, LiveOpts } from './provider'
import type { SportKind } from './sport-model'

/**
 * Livepollning går BARA medan sportvyn, matchcentret eller en sportsändning
 * i spelaren har efterfrågan, appen syns och någon täckt match är het. Ett
 * "allt live"-anrop per sport. Intervallet räknas av kvothanteraren.
 */
export type DemandReason = 'sport-view' | 'match-center' | 'player'

const demand = new Map<DemandReason, number>()
const demandListeners = new Set<() => void>()

function emitDemand(): void { for (const cb of [...demandListeners]) cb() }

export function acquirePollDemand(reason: DemandReason): () => void {
  demand.set(reason, (demand.get(reason) ?? 0) + 1)
  emitDemand()
  let released = false
  return () => {
    if (released) return
    released = true
    const n = (demand.get(reason) ?? 1) - 1
    if (n <= 0) demand.delete(reason)
    else demand.set(reason, n)
    emitDemand()
  }
}

export function hasPollDemand(): boolean { return demand.size > 0 }

export function onPollDemandChanged(cb: () => void): () => void {
  demandListeners.add(cb)
  return () => { demandListeners.delete(cb) }
}

export function usePollDemand(reason: DemandReason, active: boolean): void {
  useEffect(() => (active ? acquirePollDemand(reason) : undefined), [reason, active])
}

export function __resetPollDemandForTests(): void {
  demand.clear()
  emitDemand()
}

export interface LiveTarget { sport: SportKind; hot: boolean; windowEndsAt: number }

export interface LivePollerDeps {
  budget: Budget
  targets(): LiveTarget[]
  onFixtures(sport: SportKind, fixtures: Fixture[]): void
  liveOpts(): LiveOpts
  now?: () => number
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (h: unknown) => void
  isVisible?: () => boolean
  onVisibility?: (cb: () => void) => () => void
}

export interface LivePoller { start(): void; stop(): void; reschedule(): void; nextDelayMs(): number | null }

const defaultVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
const defaultOnVisibility = (cb: () => void) => {
  if (typeof document === 'undefined') return () => {}
  document.addEventListener('visibilitychange', cb)
  return () => document.removeEventListener('visibilitychange', cb)
}

export function createLivePoller(deps: LivePollerDeps): LivePoller {
  const now = deps.now ?? Date.now
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms))
  const clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  const isVisible = deps.isVisible ?? defaultVisible
  const due = new Map<SportKind, number>()
  let timer: unknown = null
  let running = false
  let unsubs: Array<() => void> = []

  const active = () => running && hasPollDemand() && isVisible()

  function plan(): Array<{ sport: SportKind; at: number }> {
    const out: Array<{ sport: SportKind; at: number }> = []
    for (const t of deps.targets()) {
      if (!t.hot) { due.delete(t.sport); continue }
      const interval = deps.budget.liveIntervalMs(deps.budget.provider.bucket(t.sport), t.windowEndsAt)
      if (interval == null) { due.delete(t.sport); continue }
      if (!due.has(t.sport)) due.set(t.sport, now() + interval)
      out.push({ sport: t.sport, at: due.get(t.sport)! })
    }
    return out
  }

  function nextDelayMs(): number | null {
    if (!active()) return null
    const items = plan()
    if (items.length === 0) return null
    return Math.max(0, Math.min(...items.map((i) => i.at)) - now())
  }

  function reschedule(): void {
    if (timer != null) { clearTimer(timer); timer = null }
    if (!active()) { due.clear(); return }
    const delay = nextDelayMs()
    if (delay == null) return
    timer = setTimer(() => { timer = null; void tick() }, delay)
  }

  async function tick(): Promise<void> {
    if (!active()) return
    const t = now()
    for (const item of plan()) {
      if (item.at > t) continue
      due.delete(item.sport)
      const res = await deps.budget.live(item.sport, deps.liveOpts())
      if (res.data) deps.onFixtures(item.sport, res.data)
    }
    reschedule()
  }

  return {
    start() {
      if (running) return
      running = true
      unsubs = [onPollDemandChanged(reschedule), (deps.onVisibility ?? defaultOnVisibility)(reschedule)]
      reschedule()
    },
    stop() {
      running = false
      for (const u of unsubs) u()
      unsubs = []
      if (timer != null) { clearTimer(timer); timer = null }
      due.clear()
    },
    reschedule,
    nextDelayMs,
  }
}
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/live-poller.test.ts`
Expected: PASS (6 tester).

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/live-poller.ts runtime/sport/live-poller.test.ts
git commit -m "live-tv sport: live polling only on demand, visible and hot"
```

---

### Task 11: Sammanslagning EPG + fixturer, "Bara resultat" och override för fixturmatcher

**Files:**
- Create: `$PLG/runtime/sport/sport-link.ts`
- Create: `$PLG/runtime/sport/merge.ts`
- Modify: `$PLG/runtime/sport/sport-model.ts` (fas 1): utöka `SportMatch` med valfria fält
- Modify: `$PLG/runtime/sport/sport-day-model.ts` (fas 1): `statusAt` litar på källan
- Test: `$PLG/runtime/sport/merge.test.ts`, `$PLG/runtime/sport/sport-day-model.test.ts` (fas 1, två nya fall)

**Interfaces:**
- Consumes: Task 3 (`POST /api/live-tv/sport/link`), Task 5 (`Fixture`, `FixtureStatus`). Fas 1: `SportMatch`, `MatchSource`, `SportKind` (`sport-model.ts`), `SportOverrides` (`sport_overrides_v1`: match-id → hela kanalen, `OverrideChannel`), `rankedSources` (`sport-day-model.ts`), `LIVE_TV_GLOBAL_EPG_ID` (`live-tv-data.ts`), `tzOffsetFor` (`sport-epg.ts`), testhjälparna `fxMatch` och `fxSource` (`__sport-fixture.tsx`).
- Produces:
  - `sport-model.ts`: valfria fält på `SportMatch`: `coverage?: 'full' | 'epg'` (`undefined` = `'epg'`), `phase?: 'ht' | 'postponed'`, `minute?: number | null`, `score?: { home: number; away: number }`, `homeCrest?: string | null`, `awayCrest?: string | null`, `homeIds?: Record<string, string>`, `awayIds?: Record<string, string>`, `fixture?: { provider: string; id: string; leagueId?: string; season?: string }`, `resultOnly?: boolean`, `lastGoal?: Fixture['lastGoal']`
  - `sport-day-model.ts`: `statusAt` returnerar `'upcoming'` för `phase === 'postponed'`, och `m.status` för en match med `fixture` vars `status !== 'upcoming'`. Annars som i fas 1.
  - `sport-link.ts`: `export type LinkMap = Record<string, { matchId: string; swapped: boolean } | null>`, `export async function linkFixtures(args: { day: string; fixtures: Fixture[] }): Promise<LinkMap>` (lokalt anrop till värden, ingen kvot)
  - `merge.ts`: `export function fixtureMatchKey(f: Pick<Fixture, 'provider' | 'id'>): string` (`fx:<provider>:<id>`), `export function foldTeamKey(name: string): string`, `export interface MergeArgs { epg: SportMatch[]; fixtures: Fixture[]; links: LinkMap; overrides: SportOverrides; coverage(sport: SportKind): 'full' | 'epg' }`, `export function mergeLinked(a: MergeArgs): SportMatch[]`

En match som bara finns som fixtur har `id = fixtureMatchKey(f)`. Fas 1:s "Välj annan kanal…" skriver `sport_overrides_v1[match.id]` (hela kanalen), så samma väljare fungerar utan ändringar för "Bara resultat". När en kanal har valts får matchen den kanalen som enda källa (via fas 1:s `rankedSources`) och slutar vara "Bara resultat". Källans status översätts: `scheduled` och `postponed` blir `upcoming` (uppskjuten bär `phase`), `live` och `ht` blir `live` (paus bär `phase`), `finished` är `finished`.

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/sport/merge.test.ts
import { describe, expect, it } from 'vitest'
import { fixtureMatchKey, mergeLinked } from './merge'
import type { Fixture } from './provider'
import type { SportMatch } from './sport-model'
import type { OverrideChannel } from './sport-store'
import { fxMatch, fxSource } from './__sport-fixture'

const KO = Date.UTC(2026, 9, 10, 17)
const src = (key: string) => fxSource(key)
const tv4: OverrideChannel = { key: 'tv4', name: 'TV4', url: 'http://x/tv4', logo: null, group: 'Sport', tvgId: null }

const epgMatch = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: 'm1', home: 'Malmö FF', away: 'Djurgården', homeKey: 'malmo', awayKey: 'djurgarden',
  start: KO, stop: KO + 7_200_000, status: 'live', sources: [src('cmore1')], ...over,
})

const fixture = (over: Partial<Fixture> = {}): Fixture => ({
  provider: 'api-sports', id: '1180001', sport: 'football',
  league: { id: '113', name: 'Allsvenskan', season: '2026', round: 27, country: 'Sweden' },
  kickoff: KO, status: 'live', statusShort: '2H', minute: 67,
  home: { id: '375', name: 'Malmo FF', crest: 'https://m/375.png' }, away: { id: '377', name: 'Djurgardens IF', crest: 'https://m/377.png' },
  score: { home: 2, away: 1 }, venue: 'Eleda Stadion', lastGoal: null, ...over,
})

const coverage = (s: string) => (s === 'tennis' ? 'epg' : 'full') as 'full' | 'epg'
const base = { overrides: {}, coverage }

describe('mergeLinked', () => {
  it('kopplad fixtur ger ställning, minut, märken och källans id:n; EPG:ns källor behålls', () => {
    const [m] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture()], links: { '1180001': { matchId: 'm1', swapped: false } } })
    expect(m).toMatchObject({
      id: 'm1', status: 'live', minute: 67, score: { home: 2, away: 1 }, round: 27, venue: 'Eleda Stadion',
      fixture: { provider: 'api-sports', id: '1180001', leagueId: '113', season: '2026' }, coverage: 'full',
      home: 'Malmo FF', homeKey: 'malmo', homeCrest: 'https://m/375.png', homeIds: { 'api-sports': '375' },
      away: 'Djurgardens IF', awayKey: 'djurgarden', awayCrest: 'https://m/377.png', awayIds: { 'api-sports': '377' },
      sources: [src('cmore1')],
    })
    expect(m.resultOnly).toBeFalsy()
  })

  it('omvänd ordning i EPG: källans ordning gäller, EPG-nycklarna följer rätt lag', () => {
    const [m] = mergeLinked({ ...base, epg: [epgMatch({ home: 'Djurgården', homeKey: 'djurgarden', away: 'Malmö FF', awayKey: 'malmo' })], fixtures: [fixture()], links: { '1180001': { matchId: 'm1', swapped: true } } })
    expect([m.home, m.homeKey, m.away, m.awayKey]).toEqual(['Malmo FF', 'malmo', 'Djurgardens IF', 'djurgarden'])
  })

  it('källans status översätts: paus är live med phase, uppskjuten är upcoming med phase', () => {
    const link = { '1180001': { matchId: 'm1', swapped: false } }
    const [ht] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture({ status: 'ht', minute: 45 })], links: link })
    expect(ht).toMatchObject({ status: 'live', phase: 'ht' })
    const [pst] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture({ status: 'postponed', minute: null, score: null })], links: link })
    expect(pst).toMatchObject({ status: 'upcoming', phase: 'postponed' })
    expect(pst.score).toBeUndefined()
    const [done] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture({ status: 'finished' })], links: link })
    expect(done).toMatchObject({ status: 'finished' })
    expect(done.phase).toBeUndefined()
  })

  it('fixtur utan koppling blir "Bara resultat"; override till en kanal gör den tittbar', () => {
    const f = fixture({ id: '9', home: { id: '1', name: 'Hammarby', crest: null }, away: { id: '2', name: 'AIK', crest: null } })
    const [, only] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [f], links: { '9': null } })
    expect(only).toMatchObject({ id: fixtureMatchKey(f), kind: 'football', resultOnly: true, sources: [], coverage: 'full', score: { home: 2, away: 1 }, start: KO, home: 'Hammarby', homeKey: 'hammarby' })
    const [, picked] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [f], links: { '9': null }, overrides: { [fixtureMatchKey(f)]: tv4 } })
    expect(picked).toMatchObject({ resultOnly: false, sources: [expect.objectContaining({ channelKey: 'tv4', url: 'http://x/tv4' })] })
  })

  it('EPG-match utan fixtur: ingen gissad ställning', () => {
    const [m] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [], links: {} })
    expect(m.score).toBeUndefined()
    expect(m.fixture).toBeUndefined()
  })

  it('tennis: alltid bara EPG, även om något skulle länkas', () => {
    const t = epgMatch({ id: 't1', kind: 'tennis' })
    const [m] = mergeLinked({ ...base, epg: [t], fixtures: [fixture({ sport: 'tennis', id: 'x' })], links: { x: { matchId: 't1', swapped: false } } })
    expect(m).toMatchObject({ coverage: 'epg' })
    expect(m.score).toBeUndefined()
  })

  it('två fixturer mot samma EPG-match: den andra blir "Bara resultat"', () => {
    const out = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture(), fixture({ id: '2' })], links: { '1180001': { matchId: 'm1', swapped: false }, '2': { matchId: 'm1', swapped: false } } })
    expect(out.map((m) => [m.id, !!m.resultOnly])).toEqual([['m1', false], ['fx:api-sports:2', true]])
  })
})
```

Lägg också två fall sist i fas 1:s `runtime/sport/sport-day-model.test.ts` (`fxMatch` och `statusAt` finns redan där):

```ts
describe('statusAt med källfixtur (fas 2)', () => {
  it('källans status gäller även när EPG-klockan säger något annat', () => {
    const start = Date.now() - 3 * HOUR
    const m = fxMatch({ start, stop: start + 2 * HOUR, status: 'live', fixture: { provider: 'api-sports', id: '1' } })
    expect(statusAt(m, Date.now())).toBe('live')
    expect(statusAt({ ...m, status: 'finished' }, start)).toBe('finished')
  })
  it('uppskjuten är upcoming även efter EPG-slut; okänd källstatus faller tillbaka på klockan', () => {
    const start = Date.now() - 3 * HOUR
    const m = fxMatch({ start, stop: start + 2 * HOUR, status: 'upcoming', phase: 'postponed', fixture: { provider: 'api-sports', id: '1' } })
    expect(statusAt(m, Date.now())).toBe('upcoming')
    expect(statusAt({ ...m, phase: undefined }, Date.now())).toBe('finished')
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/merge.test.ts runtime/sport/sport-day-model.test.ts`
Expected: FAIL med "Failed to resolve import './merge'" och typfel på `phase`.

- [ ] **Step 3: Implementera**

I `sport-model.ts` (fas 1), i `interface SportMatch`, efter `sources`:

```ts
  /** Fas 2: allt nedan sätts bara av `merge.ts` ur en källfixtur. Utan `coverage: 'full'` är matchen bara EPG. */
  coverage?: 'full' | 'epg'
  /** Paus (live) eller uppskjuten (upcoming); `status` har bara fas 1:s tre värden. */
  phase?: 'ht' | 'postponed'
  minute?: number | null
  score?: { home: number; away: number }
  homeCrest?: string | null
  awayCrest?: string | null
  /** Källans lag-id per källa, för följda lag och tabeller. */
  homeIds?: Record<string, string>
  awayIds?: Record<string, string>
  /** Källans fixtur. `leagueId`/`season` behövs för tabellen. */
  fixture?: { provider: string; id: string; leagueId?: string; season?: string }
  /** Fixtur utan kopplad kanal ("Bara resultat"). Visas bara med nyckel. */
  resultOnly?: boolean
  /** Senaste målet om källan skickar händelser (målskytt i MÅL!). */
  lastGoal?: { side: 'home' | 'away' | null; player: string | null; minute: number | null } | null
```

I `sport-day-model.ts` (fas 1), överst i `statusAt`:

```ts
export function statusAt(m: SportMatch, now: number): MatchStatus {
  // Fas 2: en match med källfixtur litar på källans status (live efter EPG-slut, avslutad före).
  if (m.phase === 'postponed') return 'upcoming'
  if (m.fixture && m.status !== 'upcoming') return m.status
  if (m.status === 'finished' || now >= m.stop) return 'finished'
  if (now >= m.start) return 'live'
  return 'upcoming'
}
```

```ts
// runtime/sport/sport-link.ts
'use client'

import { LIVE_TV_GLOBAL_EPG_ID } from '../live-tv-data'
import type { Fixture } from './provider'
import { tzOffsetFor } from './sport-epg'

/** fixtureId → EPG-matchens id (fas 1:s gruppering) och om hemma/borta är omvända. */
export type LinkMap = Record<string, { matchId: string; swapped: boolean } | null>

/** Lokalt anrop till den egna värden (`/sport/link`, samma dag och tidszon som `/sport/day`). Kostar ingen kvot. */
export async function linkFixtures(args: { day: string; fixtures: Fixture[] }): Promise<LinkMap> {
  if (args.fixtures.length === 0) return {}
  try {
    const res = await fetch('/api/live-tv/sport/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        listId: LIVE_TV_GLOBAL_EPG_ID, day: args.day, tzOffset: tzOffsetFor(args.day),
        fixtures: args.fixtures.map((f) => ({ id: f.id, sport: f.sport, home: f.home.name, away: f.away.name, league: f.league.name, kickoff: f.kickoff })),
      }),
    })
    if (!res.ok) return {}
    const body = (await res.json()) as { links?: LinkMap }
    return body.links ?? {}
  } catch {
    return {}
  }
}
```

```ts
// runtime/sport/merge.ts
import { rankedSources } from './sport-day-model'
import type { Fixture, FixtureStatus } from './provider'
import type { LinkMap } from './sport-link'
import type { MatchStatus, SportKind, SportMatch } from './sport-model'
import type { SportOverrides } from './sport-store'

export function fixtureMatchKey(f: Pick<Fixture, 'provider' | 'id'>): string {
  return `fx:${f.provider}:${f.id}`
}

/** Som Rusts `team_key`, men bara det ett källnamn behöver: gemener, diakritik bort, skiljetecken till mellanslag. */
export function foldTeamKey(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export interface MergeArgs {
  epg: SportMatch[]
  fixtures: Fixture[]
  links: LinkMap
  overrides: SportOverrides
  coverage(sport: SportKind): 'full' | 'epg'
}

const TWO_HOURS = 2 * 3_600_000
const STATUS: Record<FixtureStatus, MatchStatus> = { scheduled: 'upcoming', postponed: 'upcoming', live: 'live', ht: 'live', finished: 'finished' }
const phaseOf = (s: FixtureStatus): SportMatch['phase'] => (s === 'ht' || s === 'postponed' ? s : undefined)

function fromFixture(f: Fixture): Partial<SportMatch> {
  return {
    home: f.home.name,
    away: f.away.name,
    homeCrest: f.home.crest,
    awayCrest: f.away.crest,
    homeIds: { [f.provider]: f.home.id },
    awayIds: { [f.provider]: f.away.id },
    status: STATUS[f.status],
    phase: phaseOf(f.status),
    minute: f.minute,
    score: f.score ?? undefined,
    fixture: { provider: f.provider, id: f.id, leagueId: f.league.id, season: f.league.season },
    lastGoal: f.lastGoal,
    coverage: 'full',
  }
}

function applyFixture(m: SportMatch, f: Fixture, swapped: boolean): SportMatch {
  // Källans lag ligger i källans ordning. EPG-nycklarna följer det lag de hör till.
  const homeKey = swapped ? m.awayKey : m.homeKey
  const awayKey = swapped ? m.homeKey : m.awayKey
  return {
    ...m,
    ...fromFixture(f),
    league: f.league.name || m.league,
    homeKey: homeKey ?? foldTeamKey(f.home.name),
    awayKey: awayKey ?? foldTeamKey(f.away.name),
    round: f.league.round ?? m.round,
    venue: f.venue ?? m.venue,
    resultOnly: false,
  }
}

function fixtureOnly(f: Fixture, overrides: SportOverrides): SportMatch {
  const match: SportMatch = {
    id: fixtureMatchKey(f),
    kind: f.sport,
    league: f.league.name,
    leagueKey: `fx:${f.provider}:${f.league.id}`,
    home: f.home.name,
    away: f.away.name,
    homeKey: foldTeamKey(f.home.name),
    awayKey: foldTeamKey(f.away.name),
    event: null,
    start: f.kickoff,
    stop: f.kickoff + TWO_HOURS,
    status: 'upcoming',
    rerun: false,
    round: f.league.round,
    venue: f.venue,
    sources: [],
    ...fromFixture(f),
    resultOnly: true,
  }
  // Fas 1:s "Välj annan kanal…" skriver sport_overrides_v1[match.id]: en vald kanal gör matchen tittbar.
  return overrides[match.id] ? { ...match, sources: rankedSources(match, overrides), resultOnly: false } : match
}

/**
 * EPG-matcherna ligger kvar i sin ordning. En kopplad fixtur lägger på
 * ställning, status, märken och kanoniska namn. Okopplade fixturer i täckta
 * sporter läggs sist som "Bara resultat". En override (fas 1:s "Välj annan
 * kanal…") vinner alltid.
 */
export function mergeLinked(a: MergeArgs): SportMatch[] {
  const out = a.epg.map((m) => ({ ...m, coverage: a.coverage(m.kind) }))
  const index = new Map(out.map((m, i) => [m.id, i]))
  const used = new Set<string>()
  for (const f of a.fixtures) {
    if (a.coverage(f.sport) !== 'full') continue
    const link = a.links[f.id]
    const i = link ? index.get(link.matchId) : undefined
    if (link && i !== undefined && !used.has(link.matchId) && out[i].coverage === 'full') {
      used.add(link.matchId)
      out[i] = applyFixture(out[i], f, link.swapped)
      continue
    }
    out.push(fixtureOnly(f, a.overrides))
  }
  return out
}
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/merge.test.ts runtime/sport/sport-day-model.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (merge 7 tester, day-model två nya fall och alla fas 1-fall). tsc visar inga nya fel (fas 1-vyer som bygger `SportMatch` utan de valfria fälten påverkas inte).

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/sport-link.ts runtime/sport/merge.ts runtime/sport/merge.test.ts runtime/sport/sport-model.ts runtime/sport/sport-day-model.ts runtime/sport/sport-day-model.test.ts
git commit -m "live-tv sport: merge provider fixtures onto EPG matches"
```

---

### Task 12: Målhändelser (ställningsdiff) och målbussen

**Files:**
- Create: `$PLG/runtime/sport/goal-events.ts`
- Test: `$PLG/runtime/sport/goal-events.test.ts`

**Interfaces:**
- Consumes: Task 5 (`Fixture`, `ProviderId`).
- Produces:
  ```ts
  export interface Score { home: number; away: number }
  export interface GoalEvent { fixtureId: string; provider: ProviderId; sport: SportKind; side: 'home' | 'away'; score: Score; scorer: string | null; minute: number | null; at: number; home: string; away: string }
  export function diffGoals(prev: ReadonlyMap<string, Score>, next: Fixture[], now: number): GoalEvent[]
  export function emitGoals(events: GoalEvent[]): void
  export function onGoal(cb: (e: GoalEvent) => void): () => void
  ```

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/sport/goal-events.test.ts
import { describe, expect, it, vi } from 'vitest'
import { diffGoals, emitGoals, onGoal } from './goal-events'
import type { Fixture } from './provider'

const fx = (score: { home: number; away: number } | null, lastGoal: Fixture['lastGoal'] = null): Fixture => ({
  provider: 'api-sports', id: '1', sport: 'football', league: { id: '113', name: 'Allsvenskan', season: '2026', round: 27, country: null },
  kickoff: 0, status: 'live', statusShort: '2H', minute: 67, home: { id: 'h', name: 'Malmo FF', crest: null }, away: { id: 'a', name: 'AIK', crest: null },
  score, venue: null, lastGoal,
})

describe('diffGoals', () => {
  it('first_observation_is_not_a_goal', () => {
    expect(diffGoals(new Map(), [fx({ home: 2, away: 1 })], 5)).toEqual([])
  })
  it('score_decrease_is_not_a_goal (VAR)', () => {
    expect(diffGoals(new Map([['1', { home: 2, away: 1 }]]), [fx({ home: 1, away: 1 })], 5)).toEqual([])
  })
  it('ett mål per sida som ökat, med målskytt om källan skickar den', () => {
    const events = diffGoals(new Map([['1', { home: 1, away: 1 }]]), [fx({ home: 2, away: 1 }, { side: 'home', player: 'S. Larsson', minute: 67 })], 5)
    expect(events).toEqual([{ fixtureId: '1', provider: 'api-sports', sport: 'football', side: 'home', score: { home: 2, away: 1 }, scorer: 'S. Larsson', minute: 67, at: 5, home: 'Malmo FF', away: 'AIK' }])
  })
  it('målskytten följer inte med till fel sida', () => {
    const [e] = diffGoals(new Map([['1', { home: 1, away: 1 }]]), [fx({ home: 1, away: 2 }, { side: 'home', player: 'X', minute: 50 })], 5)
    expect([e.side, e.scorer, e.minute]).toEqual(['away', null, 67])
  })
  it('ingen ställning → inget', () => {
    expect(diffGoals(new Map([['1', { home: 0, away: 0 }]]), [fx(null)], 5)).toEqual([])
  })
})

describe('målbussen', () => {
  it('levererar till prenumeranter och släpper dem', () => {
    const cb = vi.fn()
    const off = onGoal(cb)
    const [e] = diffGoals(new Map([['1', { home: 0, away: 0 }]]), [fx({ home: 1, away: 0 })], 5)
    emitGoals([e])
    off()
    emitGoals([e])
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/goal-events.test.ts`
Expected: FAIL med "Failed to resolve import './goal-events'".

- [ ] **Step 3: Implementera**

```ts
// runtime/sport/goal-events.ts
import type { Fixture, ProviderId } from './provider'
import type { SportKind } from './sport-model'

export interface Score { home: number; away: number }
export interface GoalEvent {
  fixtureId: string; provider: ProviderId; sport: SportKind; side: 'home' | 'away'; score: Score
  scorer: string | null; minute: number | null; at: number; home: string; away: string
}

/**
 * Mål = en sidas ställning har ÖKAT sedan förra observationen av samma
 * fixtur. Första observationen ger aldrig mål (appen öppnas mitt i en
 * match). En ställning som går ned (VAR) ger inget.
 */
export function diffGoals(prev: ReadonlyMap<string, Score>, next: Fixture[], now: number): GoalEvent[] {
  const out: GoalEvent[] = []
  for (const f of next) {
    if (!f.score) continue
    const before = prev.get(f.id)
    if (!before) continue
    for (const side of ['home', 'away'] as const) {
      if (f.score[side] <= before[side]) continue
      const own = f.lastGoal?.side === side ? f.lastGoal : null
      out.push({
        fixtureId: f.id, provider: f.provider, sport: f.sport, side, score: { ...f.score },
        scorer: own?.player ?? null, minute: own?.minute ?? f.minute, at: now, home: f.home.name, away: f.away.name,
      })
    }
  }
  return out
}

const listeners = new Set<(e: GoalEvent) => void>()

export function emitGoals(events: GoalEvent[]): void {
  for (const e of events) for (const cb of [...listeners]) cb(e)
}

export function onGoal(cb: (e: GoalEvent) => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/goal-events.test.ts`
Expected: PASS (6 tester).

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/goal-events.ts runtime/sport/goal-events.test.ts
git commit -m "live-tv sport: goal detection from score diffs"
```

---

### Task 13: Nyckeln i lagringen, validera och spara, och överlämning från telefonen

**Files:**
- Modify: `$PLG/runtime/sport/sport-store.ts` (fas 1) och `$PLG/runtime/sport/sport-store.test.ts` (fas 1: `toEqual` på hela `SportSettings` blir `toMatchObject`, och ett nytt fall)
- Create: `$PLG/runtime/sport/key-flow.ts`
- Create: `$PLG/runtime/sport/key-handoff.ts`
- Modify: `$PLG/runtime/sport/budget.ts` (`currentBudget` läser `s.provider` direkt)
- Test: `$PLG/runtime/sport/key-flow.test.ts`, `$PLG/runtime/sport/key-handoff.test.ts`

**Interfaces:**
- Consumes: Task 8 (`Budget`), Task 7 (`providerFor`), Task 4 (värdrutterna för överlämningen). Fas 1 `getSportSettings`, `setSportSettings`.
- Produces:
  - `SportSettings` (fas 1: `view`, `alert`) får `apiKey: string | null` (standard `null`), `goalAlerts: boolean` (standard `true`), `provider: ProviderId` (standard `'api-sports'`), `keyPlan: string | null`, `keyCardDismissed: boolean` och `goalAlertMatches: Record<string, number>` (match-id → utgår, ms). `SportFollow` får valfria `providerIds?: Record<string, string>`.
  - `key-flow.ts`: `cleanKey(raw: string): string | null`, `maskKey(key: string): string`, `type KeyFlowResult = { ok: true; key: string; check: KeyCheck } | { ok: false; reason: 'empty' | 'rejected' | 'network' }`, `validateKey(provider, raw, deps?: { fetch?: BudgetDeps['fetch'] }): Promise<KeyFlowResult>`, `saveValidatedKey(provider, raw, deps?): Promise<KeyFlowResult>`, `removeKey(): void`, `isPaidPlan(plan: string | null, provider: ProviderId): boolean`
  - `key-handoff.ts`: `startKeyHandoff(): Promise<{ code: string; url: string | null } | null>`, `pollKeyHandoff(code): Promise<{ state: 'waiting' | 'received' | 'expired'; key?: string }>`, `cancelKeyHandoff(code): Promise<void>`, `useKeyHandoff(active: boolean, onKey: (key: string) => void): { url: string | null; expired: boolean; restart(): void }`

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/sport/key-flow.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetPluginStorageForTests } from '@/lib/plugin-sdk'
import { cleanKey, isPaidPlan, maskKey, removeKey, saveValidatedKey } from './key-flow'
import { getSportSettings, setSportSettings } from './sport-store'
import status from './__fixtures__/api-sports/status.json'

const okFetch = vi.fn(async () => ({ data: status, cached: false, fresh: true, fetchedAt: 1, quota: null, error: null }))
const badFetch = vi.fn(async () => ({ data: null, cached: false, fresh: false, fetchedAt: null, quota: null, error: 'unauthorized' as const }))
const offlineFetch = vi.fn(async () => ({ data: null, cached: false, fresh: false, fetchedAt: null, quota: null, error: 'network' as const }))

beforeEach(() => { __resetPluginStorageForTests(); vi.clearAllMocks() })

describe('nyckeln', () => {
  it('whitespace_is_stripped', () => {
    expect(cleanKey('  ab12\ncd34 \t')).toBe('ab12cd34')
    expect(cleanKey('   ')).toBeNull()
    expect(cleanKey('bad key!')).toBeNull()
  })
  it('maskeras med de fyra sista tecknen', () => {
    expect(maskKey('0123456789abcdef3f9a')).toBe('••••3f9a')
  })
  it('godkänd nyckel sparas med källa och plan', async () => {
    const r = await saveValidatedKey('api-sports', ' 0123456789abcdef ', { fetch: okFetch as never })
    expect(r).toMatchObject({ ok: true, key: '0123456789abcdef', check: { ok: true, plan: 'Free', used: 12, limit: 100 } })
    expect(getSportSettings()).toMatchObject({ apiKey: '0123456789abcdef', provider: 'api-sports', keyPlan: 'Free' })
  })
  it('rejected_key_never_overwrites_saved_key', async () => {
    setSportSettings({ apiKey: 'good12345', provider: 'api-sports', keyPlan: 'Free' })
    expect(await saveValidatedKey('thesportsdb', 'wrong999', { fetch: badFetch as never })).toEqual({ ok: false, reason: 'rejected' })
    expect(getSportSettings()).toMatchObject({ apiKey: 'good12345', provider: 'api-sports' })
  })
  it('nätfel sparar inget', async () => {
    expect(await saveValidatedKey('api-sports', 'abc12345', { fetch: offlineFetch as never })).toEqual({ ok: false, reason: 'network' })
    expect(getSportSettings().apiKey).toBeNull()
  })
  it('tom nyckel anropar ingenting', async () => {
    expect(await saveValidatedKey('api-sports', '  ', { fetch: okFetch as never })).toEqual({ ok: false, reason: 'empty' })
    expect(okFetch).not.toHaveBeenCalled()
  })
  it('Ta bort nyckel', () => {
    setSportSettings({ apiKey: 'good12345', keyPlan: 'Free' })
    removeKey()
    expect(getSportSettings()).toMatchObject({ apiKey: null, keyPlan: null })
  })
  it('betald plan', () => {
    expect(isPaidPlan('Free', 'api-sports')).toBe(false)
    expect(isPaidPlan('Pro', 'api-sports')).toBe(true)
    expect(isPaidPlan(null, 'thesportsdb')).toBe(true)
  })
  it('lagringen tål äldre poster utan fas 2-fälten', () => {
    setSportSettings({ apiKey: 'abc12345' })
    expect(getSportSettings()).toMatchObject({ provider: 'api-sports', keyPlan: null, keyCardDismissed: false, goalAlertMatches: {} })
  })
})
```

```ts
// runtime/sport/key-handoff.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useKeyHandoff } from './key-handoff'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('useKeyHandoff', () => {
  it('visar adressen, pollar var 2:a s, levererar nyckeln en gång och avbryter vid stängning', async () => {
    const polls = [{ state: 'waiting' }, { state: 'received', key: 'abc12345' }]
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`)
      if (init?.method === 'POST') return new Response(JSON.stringify({ code: 'c0ffee', url: 'http://192.168.1.5:3012/sport-key?c=c0ffee' }))
      if (init?.method === 'DELETE') return new Response('{"ok":true}')
      return new Response(JSON.stringify(polls.shift() ?? { state: 'expired' }))
    }))
    const onKey = vi.fn()
    const { result, unmount } = renderHook(() => useKeyHandoff(true, onKey))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.url).toBe('http://192.168.1.5:3012/sport-key?c=c0ffee')
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(onKey).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(onKey).toHaveBeenCalledWith('abc12345')
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(onKey).toHaveBeenCalledTimes(1)
    unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(calls.filter((c) => c.startsWith('GET')).length).toBe(2)
    expect(calls.some((c) => c.startsWith('DELETE'))).toBe(true)
  })

  it('inaktiv → inga anrop', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => useKeyHandoff(false, vi.fn()))
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/key-flow.test.ts runtime/sport/key-handoff.test.ts`
Expected: FAIL med "Failed to resolve import './key-flow'" och "./key-handoff".

- [ ] **Step 3: Implementera**

I `sport-store.ts` (fas 1) utökas `SportSettings`, `DEFAULT_SETTINGS`, `sanitizeSettings`, `SportFollow` och `sanitizeFollows`. Fas 1:s `sanitizeSettings` bygger ett nytt objekt av `view` och `alert` och släpper allt annat, så fälten måste in där, annars sparas de aldrig.

```ts
import type { ProviderId } from './provider'

export interface SportSettings {
  view: SportViewMode // fas 1
  alert: KickoffAlert // fas 1
  /** Fas 2: användarens egen nyckel. `null` = inga anrop. */
  apiKey: string | null
  /** Fas 2: målnotis. På som standard, och gäller bara följda matcher eller matcher med "Notis vid mål". */
  goalAlerts: boolean
  /** Fas 2: vilken källa nyckeln hör till. */
  provider: ProviderId
  /** Fas 2: källans plan vid senaste validering ("Free", "Pro", "Premium"). */
  keyPlan: string | null
  /** Fas 2: "Inte nu" på nyckelkortet. Efter det visas bara en diskret rad i Resultat. */
  keyCardDismissed: boolean
  /** Fas 2: "Notis vid mål" per match (matchens id → utgår ms, avspark + 4 h). */
  goalAlertMatches: Record<string, number>
}

const DEFAULT_SETTINGS: SportSettings = {
  view: 'matchday', alert: '15', apiKey: null, goalAlerts: true, provider: 'api-sports', keyPlan: null, keyCardDismissed: false, goalAlertMatches: {},
}

export interface SportFollow {
  // … fas 1-fälten (sport, kind, key, name) oförändrade …
  /** Fas 2: källans id per källa, känt när laget följdes ur en sökning i källan. */
  providerIds?: Record<string, string>
}
```

och i fas 1:s `sanitizeSettings(raw)` (där `r` är råobjektet) läggs fälten till i det returnerade objektet, efter `alert`:

```ts
    apiKey: typeof r.apiKey === 'string' && r.apiKey ? r.apiKey : null,
    goalAlerts: r.goalAlerts !== false,
    provider: r.provider === 'thesportsdb' ? 'thesportsdb' : 'api-sports',
    keyPlan: typeof r.keyPlan === 'string' ? r.keyPlan : null,
    keyCardDismissed: r.keyCardDismissed === true,
    goalAlertMatches: Object.fromEntries(
      Object.entries(r.goalAlertMatches && typeof r.goalAlertMatches === 'object' ? (r.goalAlertMatches as Record<string, unknown>) : {})
        .filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > Date.now()),
    ),
```

och i fas 1:s `sanitizeFollows` bevaras `providerIds` (strängvärden), efter `name` i `out.push({ … })`:

```ts
    const ids = f.providerIds && typeof f.providerIds === 'object'
      ? Object.fromEntries(Object.entries(f.providerIds).filter((e): e is [string, string] => typeof e[1] === 'string'))
      : null
    out.push({ sport: f.sport as SportKind, kind: f.kind, key: f.key, name: typeof f.name === 'string' && f.name ? f.name : f.key, ...(ids && Object.keys(ids).length > 0 ? { providerIds: ids } : {}) })
```

I fas 1:s `sport-store.test.ts` byts de fyra `toEqual` som jämför en hel `SportSettings` (`getSportSettings()` och returvärdena från `setSportSettings(...)`) mot `toMatchObject`, och ett fall läggs till:

```ts
describe('fas 2-fälten', () => {
  it('standardvärden, och providerIds bevaras på följda lag', () => {
    expect(getSportSettings()).toMatchObject({ apiKey: null, goalAlerts: true, provider: 'api-sports', keyPlan: null, keyCardDismissed: false, goalAlertMatches: {} })
    const f = { sport: 'football' as const, kind: 'team' as const, key: 'malmo', name: 'Malmö FF', providerIds: { 'api-sports': '375' } }
    toggleFollow(f)
    expect(getFollows()).toEqual([f])
  })
})
```

I `budget.ts` `currentBudget()`: ta bort casten från Task 8 och läs `s.provider` och `s.apiKey` direkt.

```ts
// runtime/sport/key-flow.ts
'use client'

import { Budget, type BudgetDeps } from './budget'
import { providerFor } from './providers'
import { setSportSettings } from './sport-store'
import type { KeyCheck, ProviderId } from './provider'

export type KeyFlowResult = { ok: true; key: string; check: KeyCheck } | { ok: false; reason: 'empty' | 'rejected' | 'network' }

/** Mellanslag och radbrytningar bort (inklistrat från mejl eller telefon). Samma teckenregel som appen. */
export function cleanKey(raw: string): string | null {
  const key = raw.replace(/\s+/g, '')
  return /^[A-Za-z0-9_-]{3,128}$/.test(key) ? key : null
}

export function maskKey(key: string): string {
  return `••••${key.slice(-4)}`
}

export function isPaidPlan(plan: string | null, provider: ProviderId): boolean {
  if (provider === 'thesportsdb') return true
  return !!plan && plan.toLowerCase() !== 'free'
}

/** Kontrollerar nyckeln GENOM kvothanteraren (API-Sports `status` kostar inget). Sparar ingenting. */
export async function validateKey(provider: ProviderId, raw: string, deps: { fetch?: BudgetDeps['fetch'] } = {}): Promise<KeyFlowResult> {
  const key = cleanKey(raw)
  if (!key) return { ok: false, reason: 'empty' }
  const result = await new Budget(providerFor(provider), key, { fetch: deps.fetch }).validate()
  if (result.ok && result.data.ok) return { ok: true, key, check: result.data }
  if (!result.ok && result.reason === 'network') return { ok: false, reason: 'network' }
  return { ok: false, reason: 'rejected' }
}

/** Sparar BARA efter godkänd validering. En underkänd nyckel rör aldrig en fungerande. */
export async function saveValidatedKey(provider: ProviderId, raw: string, deps: { fetch?: BudgetDeps['fetch'] } = {}): Promise<KeyFlowResult> {
  const result = await validateKey(provider, raw, deps)
  if (result.ok) setSportSettings({ apiKey: result.key, provider, keyPlan: result.check.plan, keyCardDismissed: false })
  return result
}

export function removeKey(): void {
  setSportSettings({ apiKey: null, keyPlan: null })
}
```

```ts
// runtime/sport/key-handoff.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const BASE = '/api/live-tv/sport/key-handoff'
const POLL_MS = 2_000

export async function startKeyHandoff(): Promise<{ code: string; url: string | null } | null> {
  try {
    const res = await fetch(BASE, { method: 'POST' })
    if (!res.ok) return null
    const body = (await res.json()) as { code?: string; url?: string | null }
    return body.code ? { code: body.code, url: body.url ?? null } : null
  } catch {
    return null
  }
}

export async function pollKeyHandoff(code: string): Promise<{ state: 'waiting' | 'received' | 'expired'; key?: string }> {
  try {
    const res = await fetch(`${BASE}?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
    if (!res.ok) return { state: 'expired' }
    return (await res.json()) as { state: 'waiting' | 'received' | 'expired'; key?: string }
  } catch {
    return { state: 'waiting' }
  }
}

export async function cancelKeyHandoff(code: string): Promise<void> {
  try { await fetch(`${BASE}?code=${encodeURIComponent(code)}`, { method: 'DELETE' }) } catch { /* värden borta: koden går ut av sig själv */ }
}

/**
 * TV:ns sida av överlämningen. Medan `active` gäller finns en kod. Den lokala
 * värden pollas var 2:a sekund (ingen kvot). Nyckeln levereras EN gång, och
 * koden avbryts när kortet stängs.
 */
export function useKeyHandoff(active: boolean, onKey: (key: string) => void): { url: string | null; expired: boolean; restart(): void } {
  const [url, setUrl] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [round, setRound] = useState(0)
  const onKeyRef = useRef(onKey)
  onKeyRef.current = onKey

  useEffect(() => {
    if (!active) return
    let stopped = false
    let code: string | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    setExpired(false)
    const loop = async () => {
      if (stopped || !code) return
      const r = await pollKeyHandoff(code)
      if (stopped) return
      if (r.state === 'received' && r.key) { code = null; onKeyRef.current(r.key); return }
      if (r.state === 'expired') { code = null; setExpired(true); return }
      timer = setTimeout(() => void loop(), POLL_MS)
    }
    void startKeyHandoff().then((h) => {
      if (stopped || !h) return
      code = h.code
      setUrl(h.url)
      timer = setTimeout(() => void loop(), POLL_MS)
    })
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      if (code) void cancelKeyHandoff(code)
    }
  }, [active, round])

  const restart = useCallback(() => setRound((n) => n + 1), [])
  return { url, expired, restart }
}
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/key-flow.test.ts runtime/sport/key-handoff.test.ts runtime/sport/budget.test.ts`
Expected: PASS (9 + 2 tester, budget fortfarande grön).

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/sport-store.ts runtime/sport/sport-store.test.ts runtime/sport/key-flow.ts runtime/sport/key-handoff.ts runtime/sport/budget.ts runtime/sport/key-flow.test.ts runtime/sport/key-handoff.test.ts
git commit -m "live-tv sport: validate-then-save key flow and phone hand-over"
```

---

### Task 14: Resultatlagret, `useSportResults` och takt-raden

**Files:**
- Create: `$PLG/runtime/sport/results-controller.ts`
- Create: `$PLG/runtime/sport/rate-line.ts`
- Modify: `$PLG/runtime/tv/tv-strings.ts` (EN + SV)
- Test: `$PLG/runtime/sport/results-controller.test.ts`, `$PLG/runtime/sport/rate-line.test.ts`

**Interfaces:**
- Consumes: Task 8 (`Budget`, `currentBudget`), Task 9 (`planDay`, `plannedPerBucket`, `planKey`, `localDates`, `LeagueRef`), Task 10 (`createLivePoller`, `LiveTarget`), Task 11 (`linkFixtures`, `mergeLinked`, `LinkMap`), Task 12 (`diffGoals`, `emitGoals`, `Score`), Task 7 (`coverageFor`). Fas 1 `SportMatch`, `useOverrides`, `getFollows`, `followState`, `useSportSettings`.
- Produces:
  ```ts
  export interface RateStatus { provider: ProviderId | null; state: 'no-key' | 'invalid-key' | 'ok' | 'paused' | 'rate-limited'; intervalMs: number | null; remainingToday: number | null; pausedUntil: number | null; paid: boolean }
  export class ResultsController {
    constructor(budget: Budget, deps?: { tz?: string; now?: () => number; startPoller?: boolean })
    readonly budget: Budget
    fixtures(sport: SportKind, date: string): Fixture[]
    allFixtures(date: string): Fixture[]
    runPlan(input: { sports: SportKind[]; leagues: LeagueRef[] }): Promise<void>
    applyFixtures(sport: SportKind, date: string, list: Fixture[], source: 'cache' | 'day' | 'live'): void
    loadFixture(sport: SportKind, id: string, finished: boolean): Promise<FixtureDetail | null>
    loadStandings(sport: SportKind, leagueId: string, season: string): Promise<StandingRow[] | null>
    liveTargets(): LiveTarget[]
    status(): RateStatus
    setMerged(m: SportMatch[]): void; merged(): SportMatch[]
    subscribe(cb: () => void): () => void
    dispose(): void
  }
  export function currentResults(): ResultsController | null
  export function useResultsController(): ResultsController | null
  export function useSportResults(opts: { day: string | null; epg: SportMatch[] }): { matches: SportMatch[]; status: RateStatus; controller: ResultsController | null } // day null = planera och länka inget
  export function useChannelSportLive(channelKey: string | null): SportMatch | null
  // rate-line.ts
  export function everyText(ms: number, lang: string): string
  export function rateLine(s: RateStatus, tt: (k: TvStringKey, v?: Record<string, string | number>) => string, opts: { lang: string; locale: string; tz?: string }): { text: string; showPaidLink: boolean } | null
  ```

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/sport/rate-line.test.ts
import { describe, expect, it } from 'vitest'
import { everyText, rateLine } from './rate-line'
import { tvText } from '../tv/tv-strings'

const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const base = { provider: 'api-sports' as const, state: 'ok' as const, intervalMs: 180_000, remainingToday: 41, pausedUntil: null, paid: false }
const opts = { lang: 'sv', locale: 'sv-SE', tz: 'Europe/Stockholm' }

describe('rate-line', () => {
  it('svenska ordningstal', () => {
    expect(everyText(180_000, 'sv')).toBe('var 3:e min')
    expect(everyText(120_000, 'sv')).toBe('var 2:a min')
    expect(everyText(60_000, 'sv')).toBe('varje minut')
    expect(everyText(15_000, 'sv')).toBe('var 15:e s')
    expect(everyText(21 * 60_000, 'sv')).toBe('var 21:a min')
    expect(everyText(11 * 60_000, 'sv')).toBe('var 11:e min')
    expect(everyText(180_000, 'en')).toBe('every 3 min')
  })
  it('"Uppdateras var 3:e min · 41 anrop kvar i dag" och länken till betald nyckel', () => {
    expect(rateLine(base, tt, opts)).toEqual({ text: 'Uppdateras var 3:e min · 41 anrop kvar i dag', showPaidLink: true })
  })
  it('betald nyckel eller TheSportsDB: ingen länk, ingen dagskvot', () => {
    expect(rateLine({ ...base, paid: true }, tt, opts)?.showPaidLink).toBe(false)
    expect(rateLine({ ...base, provider: 'thesportsdb', remainingToday: null, intervalMs: 120_000, paid: true }, tt, opts)).toEqual({ text: 'Uppdateras var 2:a min', showPaidLink: false })
  })
  it('ingen match pågår', () => {
    expect(rateLine({ ...base, intervalMs: null }, tt, opts)?.text).toBe('Inga matcher pågår · 41 anrop kvar i dag')
  })
  it('pausat till 02:00 (00:00 UTC i Stockholm, sommartid)', () => {
    expect(rateLine({ ...base, state: 'paused', pausedUntil: Date.UTC(2026, 9, 11) }, tt, opts)).toEqual({ text: 'Resultat pausade till 02:00 – dagens anrop är slut', showPaidLink: false })
  })
  it('fel nyckel och ingen nyckel', () => {
    expect(rateLine({ ...base, state: 'invalid-key' }, tt, opts)?.text).toBe('Nyckeln fungerar inte längre')
    expect(rateLine({ ...base, state: 'no-key' }, tt, opts)).toBeNull()
  })
})
```

```ts
// runtime/sport/results-controller.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Budget } from './budget'
import { ResultsController } from './results-controller'
import { onGoal } from './goal-events'
import { apiSports } from './api-sports'
import footballDate from './__fixtures__/api-sports/football-fixtures-date.json'
import type { SportFetchResponse, SportQuota } from './sport-fetch'

const NOW = Date.UTC(2026, 9, 10, 18) // 20:00 i Stockholm
const quota: SportQuota = { bucket: 'football', limit: 100, remaining: 80, minuteLimit: 10, minuteRemaining: 9, blockedUntil: null, reason: null, plan: 'Free' }

function controller(respond: (path: string) => Partial<SportFetchResponse>) {
  const paths: string[] = [] // bara anrop som FÅR gå uppströms (peek är cache-only)
  const fetch = vi.fn(async ({ req, mode }: { req: { path: string }; mode: string }) => {
    if (mode !== 'cache-only') paths.push(req.path)
    return { data: null, cached: false, fresh: true, fetchedAt: NOW, quota, error: null, ...respond(req.path) } as SportFetchResponse
  })
  const budget = new Budget(apiSports, 'k123', { fetch: fetch as never, now: () => NOW, sleep: async () => {} })
  budget.noteQuota(quota)
  budget.noteQuota({ ...quota, bucket: 'hockey' })
  return { c: new ResultsController(budget, { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false }), paths }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => { vi.useRealTimers() })

describe('ResultsController', () => {
  it('dygnsplanen: idag först, igår/imorgon en gång, och planerat räknas ned per hink', async () => {
    const { c, paths } = controller(() => ({ data: { response: [] } }))
    await c.runPlan({ sports: ['football', 'tennis'], leagues: [] })
    expect(paths).toEqual([
      '/fixtures?date=2026-10-10&timezone=Europe%2FStockholm',
      '/fixtures?date=2026-10-09&timezone=Europe%2FStockholm',
      '/fixtures?date=2026-10-11&timezone=Europe%2FStockholm',
    ])
    expect(c.budget.plannedFor('football')).toBe(0)
    await c.runPlan({ sports: ['football'], leagues: [] })
    expect(paths.length).toBe(4) // bara idag igen
  })

  it('dagens fixturer lagras, och ett mål i nästa svar ger en målhändelse', async () => {
    const { c } = controller(() => ({ data: footballDate }))
    await c.runPlan({ sports: ['football'], leagues: [] })
    expect(c.fixtures('football', '2026-10-10').map((f) => f.id)).toEqual(['1180001', '1180002'])
    const goals = vi.fn()
    const off = onGoal(goals)
    const [live] = c.fixtures('football', '2026-10-10')
    c.applyFixtures('football', '2026-10-10', [{ ...live, score: { home: 3, away: 1 } }], 'day')
    expect(goals).not.toHaveBeenCalled() // dagsprogram ger aldrig MÅL!
    c.applyFixtures('football', '2026-10-10', [{ ...live, score: { home: 4, away: 1 } }], 'live')
    off()
    expect(goals).toHaveBeenCalledTimes(1)
    expect(goals).toHaveBeenCalledWith(expect.objectContaining({ fixtureId: '1180001', side: 'home', score: { home: 4, away: 1 } }))
    expect(c.fixtures('football', '2026-10-10')).toHaveLength(2) // live-svaret ersätter, tappar inte de andra
  })

  it('liveTargets: het när en match pågår, fönstret = sista avspark + 2 h', async () => {
    const { c } = controller(() => ({ data: footballDate }))
    await c.runPlan({ sports: ['football'], leagues: [] })
    expect(c.liveTargets()).toEqual([{ sport: 'football', hot: true, windowEndsAt: 1791658800000 + 7_200_000 }])
  })

  it('status: takt och kvar i dag, paus vid spärr', async () => {
    const { c } = controller(() => ({ data: footballDate }))
    await c.runPlan({ sports: ['football'], leagues: [] })
    expect(c.status()).toMatchObject({ provider: 'api-sports', state: 'ok', remainingToday: 80, paid: false })
    expect(c.status().intervalMs).toBeGreaterThanOrEqual(15_000)
    c.budget.noteQuota({ ...quota, remaining: 0, blockedUntil: Date.UTC(2026, 9, 11), reason: 'exhausted' })
    expect(c.status()).toMatchObject({ state: 'paused', pausedUntil: Date.UTC(2026, 9, 11), intervalMs: null })
  })

  it('matchcentret cachas i minnet; avslutad hämtas inte om', async () => {
    const { c, paths } = controller(() => ({ data: { response: [footballDate.response[0]] } }))
    const d = await c.loadFixture('football', '1180001', true)
    expect(d?.fixture.id).toBe('1180001')
    await c.loadFixture('football', '1180001', true)
    expect(paths.filter((p) => p.startsWith('/fixtures?id=')).length).toBe(1)
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/rate-line.test.ts runtime/sport/results-controller.test.ts`
Expected: FAIL med "Failed to resolve import './rate-line'" och "./results-controller".

- [ ] **Step 3: Implementera**

Strängar i `tv/tv-strings.ts`. Lägg i `EN` och `SV` under kommentaren `// Sport fas 2: takt`:

| Nyckel | EN | SV |
|---|---|---|
| `sportRateEvery` | `Updates {every}` | `Uppdateras {every}` |
| `sportRateLeft` | `{n} calls left today` | `{n} anrop kvar i dag` |
| `sportRateIdle` | `No matches in progress` | `Inga matcher pågår` |
| `sportRatePaused` | `Results paused until {time} – today's calls are used up` | `Resultat pausade till {time} – dagens anrop är slut` |
| `sportRateMinute` | `Results paused for a moment – too many calls per minute` | `Resultat pausade en stund – för många anrop per minut` |
| `sportRateFaster` | `Faster with a paid key` | `Snabbare med betald nyckel` |
| `sportKeyBroken` | `The key no longer works` | `Nyckeln fungerar inte längre` |

```ts
// runtime/sport/rate-line.ts
import type { TvStringKey } from '../tv/tv-strings'
import type { RateStatus } from './results-controller'

function svOrdinal(n: number): string {
  const last = n % 10
  const lastTwo = n % 100
  return (last === 1 || last === 2) && lastTwo !== 11 && lastTwo !== 12 ? 'a' : 'e'
}

export function everyText(ms: number, lang: string): string {
  const minutes = ms >= 60_000
  const n = Math.max(1, Math.round(ms / (minutes ? 60_000 : 1_000)))
  if (lang === 'sv') {
    if (n === 1) return minutes ? 'varje minut' : 'varje sekund'
    return `var ${n}:${svOrdinal(n)} ${minutes ? 'min' : 's'}`
  }
  if (n === 1) return minutes ? 'every minute' : 'every second'
  return `every ${n} ${minutes ? 'min' : 's'}`
}

/** Den tysta raden i Sport-huvudet och matchcentret. `null` = ingen rad (ingen nyckel: kortet syns i stället). */
export function rateLine(
  s: RateStatus,
  tt: (k: TvStringKey, v?: Record<string, string | number>) => string,
  opts: { lang: string; locale: string; tz?: string },
): { text: string; showPaidLink: boolean } | null {
  if (s.state === 'no-key') return null
  if (s.state === 'invalid-key') return { text: tt('sportKeyBroken'), showPaidLink: false }
  if (s.state === 'paused' && s.pausedUntil != null) {
    const time = new Intl.DateTimeFormat(opts.locale, { hour: '2-digit', minute: '2-digit', timeZone: opts.tz }).format(s.pausedUntil)
    return { text: tt('sportRatePaused', { time }), showPaidLink: false }
  }
  if (s.state === 'rate-limited') return { text: tt('sportRateMinute'), showPaidLink: false }
  const left = s.remainingToday != null ? ` · ${tt('sportRateLeft', { n: s.remainingToday })}` : ''
  const head = s.intervalMs != null ? tt('sportRateEvery', { every: everyText(s.intervalMs, opts.lang) }) : tt('sportRateIdle')
  return { text: `${head}${left}`, showPaidLink: s.provider === 'api-sports' && !s.paid }
}
```

```ts
// runtime/sport/results-controller.ts
'use client'

import { useEffect, useMemo, useReducer, useState } from 'react'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { currentBudget, type Budget } from './budget'
import { localDates, planDay, planKey, plannedPerBucket, type LeagueRef, type PlannedCall } from './day-plan'
import { createLivePoller, type LivePoller, type LiveTarget } from './live-poller'
import { diffGoals, emitGoals, type Score } from './goal-events'
import { isPaidPlan } from './key-flow'
import { linkFixtures, type LinkMap } from './sport-link'
import { mergeLinked } from './merge'
import { coverageFor } from './providers'
import { followState } from './sport-day-model'
import { SPORT_SETTINGS_KEY, getFollows, getSportSettings, useOverrides } from './sport-store'
import type { Fixture, FixtureDetail, ProviderId, StandingRow } from './provider'
import type { SportKind, SportMatch } from './sport-model'

export interface RateStatus {
  provider: ProviderId | null
  state: 'no-key' | 'invalid-key' | 'ok' | 'paused' | 'rate-limited'
  intervalMs: number | null
  remainingToday: number | null
  pausedUntil: number | null
  paid: boolean
}

const TEN_MIN = 10 * 60_000
const TWO_HOURS = 2 * 3_600_000
const LIVE_DETAIL_MS = 60_000

/**
 * Resultatlagret för EN (källa, nyckel). Håller fixturer per sport och dag i
 * minnet (diskcachen är sanningen i appen), kör dygnsplanen, äger
 * livepollern och skickar målhändelser. Varje nätanrop går via `budget`.
 */
export class ResultsController {
  private days = new Map<string, Fixture[]>()
  private scores = new Map<string, Score>()
  private done = new Set<string>()
  private doneDay = ''
  private details = new Map<string, { at: number; detail: FixtureDetail }>()
  private tables = new Map<string, StandingRow[]>()
  private mergedById = new Map<string, SportMatch>()
  private listeners = new Set<() => void>()
  private poller: LivePoller | null = null
  private unsubBudget: () => void
  private readonly tz: string
  private readonly now: () => number

  constructor(readonly budget: Budget, deps: { tz?: string; now?: () => number; startPoller?: boolean } = {}) {
    this.tz = deps.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    this.now = deps.now ?? Date.now
    this.unsubBudget = budget.subscribe(() => { this.poller?.reschedule(); this.emit() })
    if (deps.startPoller !== false) {
      this.poller = createLivePoller({
        budget,
        targets: () => this.liveTargets(),
        onFixtures: (sport, list) => this.applyFixtures(sport, this.dates().today, list, 'live'),
        liveOpts: () => ({ today: this.dates().today, tz: this.tz }),
        now: this.now,
      })
      this.poller.start()
    }
  }

  private dates() { return localDates(this.now(), this.tz) }
  private dayKey(sport: SportKind, date: string) { return `${sport}|${date}` }

  /** Räknas upp vid varje dataändring (fixturer, tabeller, matchcenter, kvot). Hookarna memoiserar på den. */
  version = 0
  private mergedListeners = new Set<() => void>()

  subscribe(cb: () => void): () => void { this.listeners.add(cb); return () => { this.listeners.delete(cb) } }
  private emit(): void { this.version += 1; for (const cb of [...this.listeners]) cb() }

  fixtures(sport: SportKind, date: string): Fixture[] { return this.days.get(this.dayKey(sport, date)) ?? [] }
  allFixtures(date: string): Fixture[] {
    const out: Fixture[] = []
    for (const [k, list] of this.days) if (k.endsWith(`|${date}`)) out.push(...list)
    return out
  }

  /**
   * Målhändelser BARA från livepollningen. En äldre cachepost följd av ett
   * färskt dagsprogram är ingen "händelse" som användaren ska få MÅL! för.
   */
  applyFixtures(sport: SportKind, date: string, list: Fixture[], source: 'cache' | 'day' | 'live'): void {
    const goals = source === 'live' ? diffGoals(this.scores, list, this.now()) : []
    for (const f of list) if (f.score) this.scores.set(f.id, f.score)
    const byId = new Map(this.fixtures(sport, date).map((f) => [f.id, f]))
    for (const f of list) byId.set(f.id, f)
    this.days.set(this.dayKey(sport, date), [...byId.values()].sort((a, b) => a.kickoff - b.kickoff))
    if (goals.length) emitGoals(goals)
    this.poller?.reschedule()
    this.emit()
  }

  private rollDone(): void {
    const utcDay = new Date(this.now()).toISOString().slice(0, 10)
    if (utcDay !== this.doneDay) { this.doneDay = utcDay; this.done.clear() }
  }

  async runPlan(input: { sports: SportKind[]; leagues: LeagueRef[] }): Promise<void> {
    this.rollDone()
    const d = this.dates()
    const provider = this.budget.provider
    const calls = planDay({ today: d.today, yesterday: d.yesterday, tomorrow: d.tomorrow, sports: input.sports, leagues: input.leagues, done: this.done }, provider)
    // Startvärdet ur diskcachen först (kostar ingenting), så att vyn har ställning innan nätet svarar.
    for (const call of calls) {
      if (call.kind !== 'day' || call.date !== d.today || this.fixtures(call.sport, d.today).length > 0) continue
      const cached = await this.budget.peek(call.sport, provider.day(call.sport, d.today, { today: d.today, tz: this.tz, dayEndMs: d.dayEndMs(d.today) }))
      if (cached) this.applyFixtures(call.sport, d.today, cached, 'cache')
    }
    const remaining = [...calls]
    const syncPlanned = () => {
      const per = plannedPerBucket(remaining, provider)
      for (const bucket of new Set([...per.keys(), ...calls.map((c) => provider.bucket(c.sport))])) this.budget.setPlanned(bucket, per.get(bucket) ?? 0)
    }
    syncPlanned()
    for (const call of calls) {
      await this.runPlanned(call, d.today, d.dayEndMs)
      remaining.shift()
      syncPlanned()
    }
  }

  private async runPlanned(call: PlannedCall, today: string, dayEndMs: (date: string) => number): Promise<void> {
    if (call.kind === 'day') {
      const res = await this.budget.day(call.sport, call.date, { today, tz: this.tz, dayEndMs: dayEndMs(call.date) })
      if (res.data) this.applyFixtures(call.sport, call.date, res.data, 'day')
      if (res.ok && call.date !== today) this.done.add(planKey(call))
      return
    }
    const res = await this.budget.standings(call.sport, call.leagueId, call.season)
    if (res.data) { this.tables.set(planKey(call), res.data); this.emit() }
    if (res.ok) this.done.add(planKey(call))
  }

  async loadFixture(sport: SportKind, id: string, finished: boolean): Promise<FixtureDetail | null> {
    const key = `${sport}|${id}`
    const hit = this.details.get(key)
    // Avslutad: minnet räcker för alltid. Pågående: högst 60 s gammal (diskcachen har samma TTL).
    if (hit && (finished || this.now() - hit.at < LIVE_DETAIL_MS)) return hit.detail
    const res = await this.budget.fixture(sport, id, { finished })
    if (res.data) {
      this.details.set(key, { at: this.now(), detail: res.data })
      this.emit()
      return res.data
    }
    return hit?.detail ?? null
  }

  standings(sport: SportKind, leagueId: string, season: string): StandingRow[] | null {
    return this.tables.get(planKey({ kind: 'standings', sport, leagueId, season })) ?? null
  }

  async loadStandings(sport: SportKind, leagueId: string, season: string): Promise<StandingRow[] | null> {
    const call: PlannedCall = { kind: 'standings', sport, leagueId, season }
    const cached = this.tables.get(planKey(call))
    if (cached && this.done.has(planKey(call))) return cached
    await this.runPlanned(call, this.dates().today, this.dates().dayEndMs)
    return this.tables.get(planKey(call)) ?? null
  }

  liveTargets(): LiveTarget[] {
    const today = this.dates().today
    const now = this.now()
    const bySport = new Map<SportKind, Fixture[]>()
    for (const [k, list] of this.days) {
      const [sport, date] = k.split('|') as [SportKind, string]
      if (date === today) bySport.set(sport, list)
    }
    const out: LiveTarget[] = []
    for (const [sport, list] of bySport) {
      const open = list.filter((f) => f.status !== 'finished' && f.status !== 'postponed')
      if (open.length === 0) continue
      const hot = open.some((f) => f.status === 'live' || f.status === 'ht' || (f.kickoff - now <= TEN_MIN && f.kickoff + TWO_HOURS > now))
      out.push({ sport, hot, windowEndsAt: Math.max(...open.map((f) => f.kickoff)) + TWO_HOURS })
    }
    return out
  }

  status(): RateStatus {
    const provider = this.budget.provider
    const base = { provider: provider.id, intervalMs: null, remainingToday: null, pausedUntil: null, paid: false }
    if (this.budget.isInvalid()) return { ...base, state: 'invalid-key' }
    const targets = this.liveTargets()
    const hot = targets.find((t) => t.hot)
    const bucket = provider.bucket(hot?.sport ?? targets[0]?.sport ?? 'football')
    const q = this.budget.quota(bucket)
    const paid = isPaidPlan(q.plan ?? getSportSettings().keyPlan, provider.id)
    if (q.blockedUntil != null && q.blockedUntil > this.now()) {
      return { ...base, state: q.reason === 'rate-limited' ? 'rate-limited' : 'paused', pausedUntil: q.blockedUntil, remainingToday: q.remaining, paid }
    }
    return { ...base, state: 'ok', intervalMs: hot ? this.budget.liveIntervalMs(bucket, hot.windowEndsAt) : null, remainingToday: q.remaining, paid }
  }

  /**
   * Den sammanslagna listan, som spelaren läser (MÅL!, efterfrågan). Den
   * meddelar BARA `onMerged`-lyssnare och aldrig datalyssnarna. Annars hade
   * useSportResults → setMerged → emit → omritning → setMerged blivit en loop.
   */
  setMerged(m: SportMatch[]): void {
    // Lägg till/uppdatera per id: spelarens ticker och Sport-vyn skriver var sin delmängd.
    const cutoff = this.now() - 36 * 3_600_000
    for (const x of m) this.mergedById.set(x.id, x)
    for (const [id, x] of this.mergedById) if (x.stop < cutoff) this.mergedById.delete(id)
    for (const cb of [...this.mergedListeners]) cb()
  }
  merged(): SportMatch[] { return [...this.mergedById.values()] }
  onMerged(cb: () => void): () => void { this.mergedListeners.add(cb); return () => { this.mergedListeners.delete(cb) } }

  dispose(): void {
    this.poller?.stop()
    this.unsubBudget()
    this.listeners.clear()
    this.mergedListeners.clear()
  }
}

let current: { budget: Budget; controller: ResultsController } | null = null

export function currentResults(): ResultsController | null {
  const budget = currentBudget()
  if (!budget) {
    current?.controller.dispose()
    current = null
    return null
  }
  if (current?.budget !== budget) {
    current?.controller.dispose()
    current = { budget, controller: new ResultsController(budget) }
  }
  return current.controller
}

/** Byter instans när nyckeln eller källan ändras, och ritar om vid varje uppdatering. */
export function useResultsController(): ResultsController | null {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const [controller, setController] = useState(() => currentResults())
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, () => setController(currentResults())), [])
  useEffect(() => (controller ? controller.subscribe(bump) : undefined), [controller])
  return controller
}

const NO_KEY: RateStatus = { provider: null, state: 'no-key', intervalMs: null, remainingToday: null, pausedUntil: null, paid: false }

/**
 * EPG-dagen (fas 1:s `useSportDay`) plus källans fixturer. `day: null` = ingen plan, ingen länkning och ingen
 * skrivning till den sammanslagna listan (spelarens ticker är avstängd när spelaren är stängd).
 */
export function useSportResults(opts: { day: string | null; epg: SportMatch[] }): { matches: SportMatch[]; status: RateStatus; controller: ResultsController | null } {
  const controller = useResultsController()
  const overrides = useOverrides()
  const [links, setLinks] = useState<LinkMap>({})
  const providerId = controller?.budget.provider.id ?? null

  const sports = useMemo(() => {
    const follows = getFollows()
    return [...new Set([...opts.epg.map((m) => m.kind), ...follows.map((f) => f.sport)])].sort()
  }, [opts.epg])

  useEffect(() => {
    if (!controller || !opts.day) return
    // Tabeller i dygnsplanen: ligor för följda lag och ligor bland redan kopplade matcher.
    const follows = getFollows()
    const leagues = controller.merged()
      .filter((m) => m.fixture?.leagueId && m.fixture.season && followState(m, follows).any)
      .map((m) => ({ sport: m.kind, leagueId: m.fixture!.leagueId!, season: m.fixture!.season! }))
    void controller.runPlan({ sports, leagues })
  }, [controller, opts.day, sports.join(',')])

  const version = controller?.version ?? 0
  const fixtures = useMemo(() => (controller && opts.day ? controller.allFixtures(opts.day) : []), [controller, opts.day, version])
  const fixtureIds = fixtures.map((f) => f.id).sort().join(',')

  useEffect(() => {
    if (!controller || !opts.day || fixtures.length === 0) { setLinks({}); return }
    let cancelled = false
    void linkFixtures({ day: opts.day, fixtures }).then((l) => { if (!cancelled) setLinks(l) })
    return () => { cancelled = true }
    // Länka om bara när mängden fixturer ändras, inte vid varje ställningsuppdatering.
  }, [controller, opts.day, fixtureIds])

  const matches = useMemo(() => {
    if (!controller) return opts.epg.map((m) => ({ ...m, coverage: coverageFor(null, m.kind) }))
    return mergeLinked({ epg: opts.epg, fixtures, links, overrides, coverage: (s) => coverageFor(providerId, s) })
  }, [controller, opts.epg, fixtures, links, overrides, providerId])

  useEffect(() => { if (opts.day) controller?.setMerged(matches) }, [controller, opts.day, matches])

  return { matches, status: controller ? controller.status() : NO_KEY, controller }
}

/** Matchen som går på kanalen just nu, om den är live i en täckt sport. Driver spelarens efterfrågan och MÅL!. */
export function useChannelSportLive(channelKey: string | null): SportMatch | null {
  const controller = useResultsController()
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => (controller ? controller.onMerged(bump) : undefined), [controller])
  if (!controller || !channelKey) return null
  return controller.merged().find((m) => m.coverage === 'full' && !!m.fixture && m.status === 'live' && m.sources.some((s) => s.channelKey === channelKey)) ?? null
}
```

Testet "liveTargets" förväntar `windowEndsAt` = sista avspark (1180002, 21:00 lokal tid) + 2 h. Testet "status" använder kvoten för hinken `football`.

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/rate-line.test.ts runtime/sport/results-controller.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (rate-line 6, controller 5). Inga nya tsc-fel.

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/results-controller.ts runtime/sport/rate-line.ts runtime/sport/results-controller.test.ts runtime/sport/rate-line.test.ts runtime/tv/tv-strings.ts
git commit -m "live-tv sport: results layer, merged matches and visible update rate"

---

> **Strängar i Task 15–20.** Varje task lägger sina nycklar i `tv/tv-strings.ts`, i både `EN` och `SV` (`SV` är typat `Record<keyof typeof EN, string>`, så tsc fäller en saknad översättning). Om fas 1 redan har en nyckel med samma betydelse (till exempel för "LIVE" eller "Bara resultat") används den, och dubbletten stryks ur tabellen.

### Task 15: Ställning, minut, status och märken på alla matchytor

**Files:**
- Create: `$PLG/runtime/sport/score-model.ts` (rena hjälpare, delas med telefonträdet)
- Create: `$PLG/runtime/sport/tv/sport-score.tsx`
- Create: `$PLG/runtime/sport/follow-search.ts` (Följer: sök i källan)
- Modify (fas 1): `$PLG/runtime/sport/tv/sport-shell.tsx`, `sport/tv/sport-parts.tsx` (`Crest`, `StatusTag`, `MatchCard`), `sport/tv/sport-matchday.tsx` (`SportHero` och tidslinjen), `sport/tv/sport-feed.tsx`, `sport/tv/sport-follows.tsx` (`FollowPicker`), `sport/tv/sport-match-center.tsx` (rubriken), `sport/tv/player-sport.tsx` (`usePlayerSport`, ticker, låda), `sport/mobile/sport-phone.tsx` (raderna)
- Modify: `$PLG/runtime/tv/tv-strings.ts`
- Test: `$PLG/runtime/sport/tv/sport-score.test.tsx`

**Interfaces:**
- Consumes: Task 14 (`useSportResults`, `RateStatus`, `rateLine`), Task 10 (`usePollDemand`), Task 12 (`onGoal`), Task 7 (`API_SPORTS_REGISTER_URL`), Task 11 (fälten på `SportMatch`). Fas 1: `Crest`, `StatusTag`, `MatchCard` (`sport-parts.tsx`), `SportCtx` (`tt`, `overrides`, `watch`), `timeLine`, `sourceLine`, `statusAt`, `rankedSources`, `teamKeysMatch`, `useSportDay`, testfixturen `fxMatch`.
- Produces (`sport/score-model.ts`, inga TV-importer, så att telefonträdet får importera den):
  ```ts
  export function showsScore(m: SportMatch): boolean
  export function scoreText(m: SportMatch): string | null                    // "2–1" när showsScore, annars null
  export function matchStatusLabel(m: SportMatch, tt: TT): string | null      // "67'", "Paus", "SLUT" (fas 1:s sportEnded), "Uppskjuten"; null = fas 1:s egen
  export function heroStatusLine(m: SportMatch, tt: TT): string | null        // "31' · pågår"
  export function crestForFollow(f: { key: string }, matches: SportMatch[]): string | null  // märket för ett följt lag, om en match bär det
  ```
- Produces (`sport/tv/sport-score.tsx`):
  ```ts
  export { showsScore, scoreText, matchStatusLabel, heroStatusLine } from '../score-model'
  export function MatchScore(props: { match: SportMatch; size?: 'hero' | 'card' | 'row' }): JSX.Element | null
  export function ResultOnlyTag(): JSX.Element
  export function useGoalBlink(match: SportMatch): boolean                    // sant i 10 s efter ett mål
  export function RateLineView(props: { status: RateStatus; tv: boolean }): JSX.Element | null
  ```
- Ändrar (`sport/tv/sport-parts.tsx`, fas 1): `Crest({ name, colorKey, size?, src? })`. Med `src` (källans märke) ritas märket via appens bildcache, annars fas 1:s initialcirkel (`crestText`). Det finns därför ingen separat märkeskomponent i fas 2.
- Produces (`sport/follow-search.ts`): `export async function searchProviderTeams(sport: SportKind, q: string): Promise<TeamHit[]>` (tom lista utan nyckel, under tre tecken eller i en otäckt sport, och då görs inget anrop)

Obs (efter fas 1-fixar): `usePlayerSport` väntar nu `PLAYER_SPORT_DELAY_MS` efter kanalstart (`armed`) och behåller förra svaret (`last`) vid kanalbyte. I punkt 7 blir därför dagen `active && armed ? localDayKey(model.nowMs) : null`, och sammanslagningen läggs på `data` (`fresh ?? last.current`). Lådans rader är nu valbara (`onSwitchMatch` byter till bästa källan), och `PlayerSourceSwitcher` finns. Raderna i gruppen "Bara resultat" har ingen källa och får därför ingen `station`.

Den här tasken lägger också `__setLangForTests` i SDK-stubben, eftersom stubbens `useLang()` alltid svarar `en`. UI-testerna i Task 15–20 sätter `sv` i `beforeEach` och `en` i `afterEach`.

Strängar: `sportLiveShort` (LIVE / LIVE), `sportHalfTime` (HT / Paus), `sportPostponed` (Postponed / Uppskjuten), `sportInProgress` (in progress / pågår), `sportResultOnly` (Results only / Bara resultat), `sportFollowSearch` (Search teams / Sök lag). Fas 1 äger redan `sportEnded` (SLUT), som är statusen för en avslutad match, och `live`. Task 14 la redan `sportRateFaster`.

- [ ] **Step 1: Språk i SDK-stubben**

I `src/__test-stubs__/plugin-sdk.ts`, ersätt `useLang` och nollställ språket i `__resetForTests`:

```ts
let langForTests: 'en' | 'sv' = 'en'
/** UI-tester som kontrollerar svensk copy sätter `sv` (och tillbaka till `en` efteråt). */
export function __setLangForTests(lang: 'en' | 'sv'): void { langForTests = lang }

export function useLang() {
  return {
    lang: langForTests,
    setLang: (_lang: 'en' | 'sv') => {},
    t: (key: string) => TEST_STRINGS[key] ?? key,
  }
}
```

och i `__resetForTests()`: `langForTests = 'en'`.

- [ ] **Step 2: Skriv de fallerande testerna**

```tsx
// runtime/sport/tv/sport-score.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { MatchScore, ResultOnlyTag, heroStatusLine, matchStatusLabel, scoreText, useGoalBlink } from './sport-score'
import { Crest } from './sport-parts'
import { searchProviderTeams } from '../follow-search'
import { crestForFollow } from '../score-model'
import { setSportSettings } from '../sport-store'
import { __resetBudgetForTests } from '../budget'
import { tvText } from '../../tv/tv-strings'
import { emitGoals } from '../goal-events'
import { fxMatch } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'

const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const m = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: 'm1', home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', homeCrest: 'https://m/375.png', awayCrest: null,
  status: 'live', minute: 31, score: { home: 2, away: 1 }, coverage: 'full', fixture: { provider: 'api-sports', id: '1180001' }, ...over,
})

beforeEach(() => { __setLangForTests('sv'); __resetPluginStorageForTests(); __resetBudgetForTests() })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('ställning och status', () => {
  it('täckt sport: "2–1" och minut', () => {
    render(<MatchScore match={m()} />)
    expect(screen.getByTestId('match-score').textContent).toBe('2–1')
    expect(scoreText(m())).toBe('2–1')
    expect(matchStatusLabel(m(), tt)).toBe("31'")
    expect(heroStatusLine(m(), tt)).toBe("31' · pågår")
  })
  it('tennis (bara EPG): inget ställningsfält, ingen status från källan, även om data råkar finnas', () => {
    const t = m({ kind: 'tennis', coverage: 'epg' })
    const { container } = render(<MatchScore match={t} />)
    expect(container.innerHTML).toBe('')
    expect(scoreText(t)).toBeNull()
    expect(matchStatusLabel(t, tt)).toBeNull()
  })
  it('inte startad: ingen ställning; avslutad: SLUT; paus: Paus; uppskjuten: Uppskjuten', () => {
    const { container } = render(<MatchScore match={m({ status: 'upcoming', score: undefined })} />)
    expect(container.innerHTML).toBe('')
    expect(matchStatusLabel(m({ status: 'finished' }), tt)).toBe('SLUT')
    expect(matchStatusLabel(m({ phase: 'ht' }), tt)).toBe('Paus')
    expect(matchStatusLabel(m({ status: 'upcoming', phase: 'postponed', score: undefined }), tt)).toBe('Uppskjuten')
  })
  it('EPG-match utan fixtur: fas 1:s egen status gäller (null)', () => {
    expect(matchStatusLabel(m({ fixture: undefined, score: undefined }), tt)).toBeNull()
  })
})

describe('märken', () => {
  it('märket går genom appens bildcache; utan märke fas 1:s initialer', () => {
    const { container } = render(<><Crest name="Malmo FF" colorKey="malmo" src="https://m/375.png" size={40} /><Crest name="AIK" colorKey="aik" size={40} /></>)
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/api/m3u-logo?src=' + encodeURIComponent('https://m/375.png'))
    expect(screen.getByText('AIK')).toBeTruthy()
  })
  it('följt lag får märket ur en match som bär det', () => {
    expect(crestForFollow({ key: 'malmo' }, [m()])).toBe('https://m/375.png')
    expect(crestForFollow({ key: 'aik' }, [m()])).toBeNull()
  })
  it('"Bara resultat"', () => {
    render(<ResultOnlyTag />)
    expect(screen.getByText('Bara resultat')).toBeTruthy()
  })
})

describe('Följer: sök i källan', () => {
  it('utan nyckel, kort fråga eller tennis: inget anrop', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchProviderTeams('football', 'malmo')).toEqual([])
    setSportSettings({ apiKey: 'k123' })
    expect(await searchProviderTeams('football', 'ma')).toEqual([])
    expect(await searchProviderTeams('tennis', 'federer')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('målblink', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })
  it('blinkar 10 s efter ett mål i matchen', () => {
    const { result } = renderHook(() => useGoalBlink(m()))
    expect(result.current).toBe(false)
    act(() => { emitGoals([{ fixtureId: '1180001', provider: 'api-sports', sport: 'football', side: 'home', score: { home: 3, away: 1 }, scorer: null, minute: 70, at: 0, home: 'Malmo FF', away: 'AIK' }]) })
    expect(result.current).toBe(true)
    act(() => { vi.advanceTimersByTime(10_001) })
    expect(result.current).toBe(false)
  })
})
```

- [ ] **Step 3: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/tv/sport-score.test.tsx`
Expected: FAIL med "Failed to resolve import './sport-score'".

- [ ] **Step 4: Implementera hjälparna och komponenterna**

```ts
// runtime/sport/score-model.ts
import type { TvStringKey } from '../tv/tv-strings'
import type { SportMatch } from './sport-model'
import { teamKeysMatch } from './sport-store'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

/** Ställning visas BARA för en täckt sport med en ställning från källan. Ingenting gissas ur EPG:n. */
export function showsScore(m: SportMatch): boolean {
  return m.coverage === 'full' && !!m.fixture && !!m.score && m.status !== 'upcoming'
}

export function scoreText(m: SportMatch): string | null {
  return showsScore(m) && m.score ? `${m.score.home}–${m.score.away}` : null
}

/** Null = fas 1:s egen status (klockslag eller EPG-fönster). */
export function matchStatusLabel(m: SportMatch, tt: TT): string | null {
  if (m.coverage !== 'full' || !m.fixture) return null
  if (m.phase === 'postponed') return tt('sportPostponed')
  if (m.phase === 'ht') return tt('sportHalfTime')
  if (m.status === 'live') return m.minute != null ? `${m.minute}'` : tt('sportLiveShort')
  if (m.status === 'finished') return tt('sportEnded')
  return null
}

export function heroStatusLine(m: SportMatch, tt: TT): string | null {
  if (m.coverage !== 'full' || !m.fixture) return null
  if (m.status === 'live' && !m.phase && m.minute != null) return `${m.minute}' · ${tt('sportInProgress')}`
  return matchStatusLabel(m, tt)
}

export function crestForFollow(f: { key: string }, matches: SportMatch[]): string | null {
  for (const m of matches) {
    if (m.homeCrest && teamKeysMatch(f.key, m.homeKey)) return m.homeCrest
    if (m.awayCrest && teamKeysMatch(f.key, m.awayKey)) return m.awayCrest
  }
  return null
}
```

```tsx
// runtime/sport/tv/sport-score.tsx
'use client'

import { useEffect, useState } from 'react'
import { TV, dp } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { onGoal } from '../goal-events'
import { rateLine } from '../rate-line'
import { API_SPORTS_REGISTER_URL } from '../api-sports'
import { showsScore } from '../score-model'
import type { RateStatus } from '../results-controller'
import type { SportMatch } from '../sport-model'

export { showsScore, scoreText, matchStatusLabel, heroStatusLine } from '../score-model'

const SCORE_SIZE = { hero: dp(64), card: dp(28), row: dp(20) } as const

export function MatchScore({ match, size = 'card' }: { match: SportMatch; size?: 'hero' | 'card' | 'row' }) {
  const blink = useGoalBlink(match)
  if (!showsScore(match) || !match.score) return null
  return (
    <span data-testid="match-score" style={{ fontSize: SCORE_SIZE[size], fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: blink ? TV.live : TV.text, transition: 'color 300ms' }}>
      {match.score.home}–{match.score.away}
    </span>
  )
}

export function ResultOnlyTag() {
  const { tt } = useTvText()
  return <span style={{ fontSize: dp(14), color: TV.dim }}>{tt('sportResultOnly')}</span>
}

const BLINK_MS = 10_000

export function useGoalBlink(match: SportMatch): boolean {
  const [until, setUntil] = useState(0)
  const id = match.fixture?.id ?? null
  useEffect(() => (id ? onGoal((e) => { if (e.fixtureId === id) setUntil(Date.now() + BLINK_MS) }) : undefined), [id])
  useEffect(() => {
    if (!until) return
    const t = setTimeout(() => setUntil(0), Math.max(0, until - Date.now()) + 1)
    return () => clearTimeout(t)
  }, [until])
  return until > Date.now()
}

/** Den tysta takt-raden. "Snabbare med betald nyckel" är en länk utanför TV och text på TV. */
export function RateLineView({ status, tv }: { status: RateStatus; tv: boolean }) {
  const { tt, lang, locale } = useTvText()
  const line = rateLine(status, tt, { lang, locale })
  if (!line) return null
  return (
    <div data-testid="sport-rate-line" style={{ fontSize: dp(14), color: TV.faint, display: 'flex', gap: dp(10), flexWrap: 'wrap' }}>
      <span>{line.text}</span>
      {line.showPaidLink
        ? tv
          ? <span>· {tt('sportRateFaster')}</span>
          : <a href={API_SPORTS_REGISTER_URL} target="_blank" rel="noreferrer" style={{ color: TV.dim }}>{tt('sportRateFaster')}</a>
        : null}
    </div>
  )
}
```

I `sport/tv/sport-parts.tsx` (fas 1) får `Crest` en valfri `src`. `StatusTag` och `MatchCard` byter ut sina fas 1-delar mot de nya, och filen importerar de rena hjälparna och `MatchScore` (sport-score importerar aldrig sport-parts, så det blir ingen cykel):

```tsx
import { useState, type CSSProperties, type ReactNode } from 'react'
import { getPluginHttpAssetUrl } from '@/lib/plugin-sdk'
import { matchStatusLabel, showsScore } from '../score-model'
import { MatchScore, ResultOnlyTag } from './sport-score'

/** Handoffens initialcirkel. Med `src` (källans märke) ritas märket via appens bildcache i stället. */
export function Crest({ name, colorKey, size = dp(56), src }: { name: string; colorKey: string; size?: number; src?: string | null }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken) {
    return <img data-crest="" src={getPluginHttpAssetUrl('/api/m3u-logo', src)} alt="" width={size} height={size} onError={() => setBroken(true)} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
  }
  // … fas 1:s initialcirkel (span med crestText) oförändrad …
}

export function StatusTag({ match, ctx }: { match: SportMatch; ctx: SportCtx }) {
  const st = statusAt(match, ctx.now)
  const label = matchStatusLabel(match, ctx.tt) // null utan fixtur: fas 1:s egen status
  if (st === 'live') return <Tag variant="live">{label ?? ctx.tt('live')}</Tag>
  if (st === 'finished') return <Tag variant="neutral">{label ?? ctx.tt('sportEnded')}</Tag>
  return <Tag variant="neutral">{label ?? formatClock(match.start, ctx.locale)}</Tag>
}
```

`TeamCell` i `MatchCard` får `crest?: string | null` och skickar det som `src` till `Crest`. I `MatchCard`: lagcellerna får `crest={match.homeCrest}` och `crest={match.awayCrest}`, mittenspannet `–` byts mot `{showsScore(match) ? <MatchScore match={match} size="card" /> : <span style={{ fontSize: dp(16), color: TV.dim }}>–</span>}`, och källraden blir `{match.resultOnly ? <ResultOnlyTag /> : sourceLine(match, ctx)}`.

```ts
// runtime/sport/follow-search.ts
'use client'

import { currentBudget } from './budget'
import type { TeamHit } from './provider'
import type { SportKind } from './sport-model'

/**
 * Följer: "Lägg till lag eller turneringar" söker i källan (A) först när
 * användaren SKICKAR frågan, alltså inte per tangenttryck. Det kostar ett
 * anrop av typen `search`, och det skyddas av reserven.
 */
export async function searchProviderTeams(sport: SportKind, q: string): Promise<TeamHit[]> {
  const budget = currentBudget()
  if (!budget || q.trim().length < 3 || budget.provider.coverage(sport) !== 'full') return []
  const res = await budget.searchTeams(sport, q)
  return res.data ?? []
}
```

- [ ] **Step 5: Koppla in i fas 1-ytorna** (en ändring per yta; behåll fas 1:s utseende när fälten saknas)

1. `sport/tv/sport-shell.tsx`: efter `const selected = useSportDay(day, model.nowMs)` (fas 1:s hämtning av dagens EPG-matcher), med `const NO_MATCHES: SportMatch[] = []` överst i filen:
   ```tsx
   const { matches: mergedMatches, status, controller } = useSportResults({ day, epg: selected.data?.matches ?? NO_MATCHES })
   const mergedDay = useMemo(() => (selected.data ? { ...selected.data, matches: mergedMatches } : null), [selected.data, mergedMatches])
   const tvMode = useTvMode()
   usePollDemand('sport-view', true)
   ```
   Byt `selected.data` mot `mergedDay` i `sportCounts(...)`, `visibleMatches(...)` och i `open`-uppslagningen (matchcentret ska hitta "Bara resultat"-matcher). `selected.state` används kvar. `SportFeed` får `days={[mergedDay, tomorrowDay.data]}`. Fas 1:s `headerSummary(matches, ctx.now)` räknar redan "N live" rätt, eftersom `statusAt` litar på källan. Rendera `<RateLineView status={status} tv={tvMode} />` direkt under raden med `sport-summary`. Exportera `controller` vidare till Resultat-fliken (Task 18).
2. `sport/tv/sport-parts.tsx`: se Step 4 (`Crest`, `StatusTag`, `MatchCard`).
3. `sport/tv/sport-matchday.tsx`, `SportHero`: båda `Crest` får `src={match.homeCrest}` och `src={match.awayCrest}`. Mittkolumnens `timeLine(match, ctx)` blir
   ```tsx
   <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(4) }}>
     {showsScore(match) ? <MatchScore match={match} size="hero" /> : null}
     <span style={{ fontSize: dp(22), fontWeight: 600, color: st === 'live' ? TV.liveText : TV.muted, whiteSpace: 'nowrap' }}>{heroStatusLine(match, ctx.tt) ?? timeLine(match, ctx)}</span>
   </span>
   ```
   Progressen: `match.minute != null && match.kind === 'football' ? Math.min(match.minute / 90, 1) : progressOf(match.start, match.stop, ctx.now)`. Raden "N källor" blir `match.resultOnly ? <ResultOnlyTag /> : <fas 1:s källtext>`. Tidslinjen: blocket flyttas ur `lane.map` till en egen komponent `TimelineBlock` (en hook får inte ligga i en `map`) som kör `useGoalBlink(match)` och lägger `outline: 2px solid ${TV.live}` medan den är sann. Etiketten blir `[label, scoreText(match) ?? (st === 'finished' ? matchStatusLabel(match, ctx.tt) : null)].filter(Boolean).join(' ')` för pågående och avslutade block, och klockslag plus etikett för kommande, som i fas 1.
4. `sport/tv/sport-feed.tsx`: "Just nu"-raderna får `src` på båda `Crest`, `<MatchScore match={m} size="row" />` efter titeln, och `LIVE` följs av `matchStatusLabel(m, ctx.tt)` (minuten) när den finns. `TeamAvatar` ("Dina lag") skickar `src={crestForFollow(follow, [...dayMatches])}` till `Crest`, och statustexten för ett pågående lag blir `` `${ctx.tt('live')} ${scoreText(match)}` `` när `scoreText(match)` finns, annars fas 1:s. Raderna i Avslutade visar `scoreText(m) ?? ctx.tt('sportEnded')`.
5. `sport/tv/sport-follows.tsx`, `FollowPicker`: fas 1 har ingen fritext. Lägg ett sökfält överst (`data-testid="follow-search"`): på TV `useTextPrompt({ pushLayer: ctx.nav.pushLayer })` (som i Task 16), på skrivbord ett `<input>`. Sökningen **skickas** med OK eller Enter, inte per tecken, och bara när `ctx.settings.apiKey` finns: `const hits = await searchProviderTeams(selectedSport === 'all' ? 'football' : selectedSport, q)` (`selectedSport` är den valda sport-chippen `follow-chip-<sport>`). Träffarna listas under fas 1:s kandidater, med `Crest src={hit.crest}` och landet, som `follow-hit-<id>`. En följd träff sparas som fas 1:s `SportFollow`: `toggleFollow({ sport, kind: 'team', key: foldTeamKey(hit.name), name: hit.name, providerIds: { [ctx.settings.provider]: hit.id } })` (`foldTeamKey` från `merge.ts`, Task 11). Strängen `sportFollowSearch` är fältets placeholder. Lägg ett fall i fas 1:s `sport-follows.test.tsx` som mockar `../follow-search` och bevisar att en träff sparas med `providerIds`.
6. `sport/tv/sport-match-center.tsx`: rubrikens initialcirklar får `src`, och klockslaget i mitten blir `<MatchScore match={match} size="hero" />` när `showsScore(match)`. Statusraden blir `heroStatusLine(match, ctx.tt) ?? timeLine(match, ctx)`, och arenan är `match.venue` (fas 1 visar den redan).
7. `sport/tv/player-sport.tsx`: `usePlayerSport` kör `useSportResults({ day: active ? localDayKey(model.nowMs) : null, epg: data?.matches ?? NO_MATCHES })` direkt efter `useSportDay`, och `matches` i `PlayerSportProps` blir `visibleMatches({ ...data, matches: mergedMatches }, 'all')`, så att spelaren får sammanslagna matcher även om Sport aldrig öppnats (`day: null` när spelaren är stängd: inga anrop). Tickern lägger `scoreText(m)` efter `shortLabel(m)`, och lådan visar `<MatchScore match={m} size="row" />` i raden samt `matchStatusLabel(m, tt) ?? fas 1:s meta`. `matchesForPlayer` filtrerar bort matcher utan källa och lämnas orörd. Lådan får en fjärde grupp sist, "Bara resultat" (`sport.matches.filter((m) => m.resultOnly)`, rubrik `tt('sportResultOnly')`), som bara visas när listan inte är tom. Raderna i gruppen är inte valbara för Multiview.
8. `sport/mobile/sport-phone.tsx`: raderna visar `scoreText(m)` och `matchStatusLabel(m, tt)` i stället för klockslaget när `showsScore(m)`, importerade från `../score-model` (aldrig ur `sport/tv/*`). `SportPhone` gör samma `useSportResults`/`mergedDay`-steg som skalet i punkt 1 och anropar `usePollDemand('sport-view', true)`. Märken, Resultat-vyn och sökningen i källan på telefon kommer i Task 21.

- [ ] **Step 6: Kör testerna**

Run: `cd "$PLG" && npx vitest run runtime/sport && npx tsc --noEmit -p tsconfig.json`
Expected: sport-score PASS (9 tester). Fas 1:s vytester ska vara gröna. Faller ett av dem för att det väntar sig initialer där det nu finns ett märke, ändras testet så att matchen får `homeCrest: null`. Matchen ska inte ändras.

- [ ] **Step 7: Commit**

```bash
cd "$PLG" && git add src/__test-stubs__/plugin-sdk.ts runtime/sport/score-model.ts runtime/sport/tv/sport-score.tsx runtime/sport/tv/sport-score.test.tsx runtime/sport/follow-search.ts runtime/sport/tv/sport-parts.tsx runtime/sport/tv/sport-follows.tsx runtime/sport/tv/sport-follows.test.tsx runtime/tv/tv-strings.ts runtime/sport/tv/sport-shell.tsx runtime/sport/tv/sport-matchday.tsx runtime/sport/tv/sport-feed.tsx runtime/sport/tv/sport-match-center.tsx runtime/sport/tv/player-sport.tsx runtime/sport/mobile/sport-phone.tsx
git commit -m "live-tv sport: scores, minute, status and crests on every match surface"
```

---

### Task 16: Nyckelkortet

**Files:**
- Create: `$PLG/runtime/sport/key-card.tsx`
- Modify: `$PLG/src/__test-stubs__/plugin-sdk.ts` (`QRCodeSVG`)
- Modify (fas 1): `$PLG/runtime/sport/tv/sport-shell.tsx` (kortet överst när nyckel saknas)
- Modify: `$PLG/runtime/tv/tv-strings.ts`
- Test: `$PLG/runtime/sport/key-card.test.tsx`

**Interfaces:**
- Consumes: Task 13 (`saveValidatedKey`, `useKeyHandoff`), Task 7 (`providerFor`, `API_SPORTS_REGISTER_URL`, `THESPORTSDB_PRICING_URL`), Task 8 (`currentBudget`). `useTextPrompt` från `tv/tv-text-entry.tsx`. SDK:t `QRCodeSVG`, `useTvMode`. Fas 1 `useSportSettings`, `setSportSettings`.
- Produces: `export function KeyCard(props: { variant: 'banner' | 'tab' | 'settings'; onDone?: () => void; pushLayer?: (close: () => void) => () => void }): JSX.Element`, `export function shouldShowKeyBanner(s: SportSettings): boolean`.

Kortets innehåll (spec, "Nyckeln"):
- Titel "Visa resultat och tabeller – gratis, tar 1 minut".
- Val av källa (API-Sports / TheSportsDB) och en mening om valet. Under den sporterna som får resultat med vald källa. Tennis nämns aldrig.
- Länk och QR till källans registrering (API-Sports) eller prissida (TheSportsDB).
- Skrivbord och telefon: ett textfält, knappen "Klistra in nyckel" (läser urklippet) och "Kontrollera och spara". TV: "Skriv in med telefonen", som ger en QR till telefonsidan (Task 4), och "Använd tangentbordet" som reserv.
- Valideringen sker direkt. Godkänd: "Nyckeln fungerar · 12 av 100 anrop i dag · Gratisnivå". Underkänd: "Nyckeln godtogs inte", och ingenting sparas.
- "Inte nu" sätter `keyCardDismissed`. Felläget ("Nyckeln fungerar inte längre") visas när `currentBudget()?.isInvalid()`.

Strängar (EN / SV):

| Nyckel | EN | SV |
|---|---|---|
| `sportKeyTitle` | Show results and tables – free, takes 1 minute | Visa resultat och tabeller – gratis, tar 1 minut |
| `sportKeyChoice` | API-Sports is free (100 calls a day per sport); TheSportsDB costs $9/month but has no daily limit. | API-Sports är gratis (100 anrop per dag och sport); TheSportsDB kostar 9 USD/mån men har ingen dagskvot. |
| `sportKeyCovers` | Results for {sports}. | Resultat för {sports}. |
| `sportKeyGetKey` | Get a key | Skaffa nyckel |
| `sportKeyPaste` | Paste key | Klistra in nyckel |
| `sportKeySave` | Check and save | Kontrollera och spara |
| `sportKeyPhone` | Enter it with your phone | Skriv in med telefonen |
| `sportKeyPhoneHint` | Scan with your phone and paste the key there. | Skanna med telefonen och klistra in nyckeln där. |
| `sportKeyKeyboard` | Use the keyboard | Använd tangentbordet |
| `sportKeyNotNow` | Not now | Inte nu |
| `sportKeyChecking` | Checking… | Kontrollerar… |
| `sportKeyOk` | The key works · {used} of {limit} calls today · {plan} | Nyckeln fungerar · {used} av {limit} anrop i dag · {plan} |
| `sportKeyOkNoQuota` | The key works · {plan} | Nyckeln fungerar · {plan} |
| `sportPlanFree` | Free tier | Gratisnivå |
| `sportKeyRejected` | The key was not accepted | Nyckeln godtogs inte |
| `sportKeyNetwork` | Couldn't reach the source. Try again. | Kunde inte nå källan. Försök igen. |
| `sportKeyExpired` | The code expired. | Koden gick ut. |
| `sportKeyRetry` | New code | Ny kod |
| `sportKeyAddRow` | Show results – add a key | Visa resultat – lägg till nyckel |
| `sportNameFootball` / `sportNameHockey` / `sportNameBasketball` / `sportNameHandball` | football / ice hockey / basketball / handball | fotboll / ishockey / basket / handboll |
| `sportListAnd` | and | och |

- [ ] **Step 1: Lägg till QR-stubben**

I `src/__test-stubs__/plugin-sdk.ts`:

```ts
/** Värden exporterar qrcode.react:s QRCodeSVG. Stubben ritar värdet som attribut så att testerna kan läsa det. */
export function QRCodeSVG({ value, size }: { value: string; size?: number }) {
  return createElement('svg', { 'data-testid': 'qr', 'data-value': value, width: size, height: size })
}
```

- [ ] **Step 2: Skriv de fallerande testerna**

```tsx
// runtime/sport/key-card.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { KeyCard, shouldShowKeyBanner } from './key-card'
import { getSportSettings } from './sport-store'
import { __resetBudgetForTests } from './budget'
import status from './__fixtures__/api-sports/status.json'

function stubFetch(kind: 'ok' | 'bad') {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith('/api/live-tv/sport/key-handoff') && init?.method === 'POST') return new Response(JSON.stringify({ code: 'c0de', url: 'http://192.168.1.5:3012/sport-key?c=c0de' }))
    if (url.startsWith('/api/live-tv/sport/key-handoff')) return new Response('{"state":"waiting"}')
    if (kind === 'bad') return new Response(JSON.stringify({ data: null, cached: false, fresh: false, fetchedAt: null, quota: null, error: 'unauthorized' }))
    return new Response(JSON.stringify({ data: status, cached: false, fresh: true, fetchedAt: 1, quota: null, error: null }))
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => { __resetPluginStorageForTests(); __resetBudgetForTests(); __setTvModeForTests(false); __setLangForTests('sv') })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); __setLangForTests('en') })

describe('KeyCard', () => {
  it('titel, källval och QR till registreringen; bara täckta sporter nämns', () => {
    render(<KeyCard variant="banner" />)
    expect(screen.getByText('Visa resultat och tabeller – gratis, tar 1 minut')).toBeTruthy()
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('https://dashboard.api-football.com/register')
    expect(screen.getByText(/fotboll, ishockey, basket och handboll/)).toBeTruthy()
    expect(screen.queryByText(/tennis/i)).toBeNull()
    fireEvent.click(screen.getByText('TheSportsDB'))
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('https://www.thesportsdb.com/pricing')
  })

  it('godkänd nyckel: visar kvoten och sparar', async () => {
    stubFetch('ok')
    render(<KeyCard variant="banner" />)
    fireEvent.change(screen.getByTestId('sport-key-input'), { target: { value: ' 0123456789abcdef \n' } })
    fireEvent.click(screen.getByText('Kontrollera och spara'))
    await waitFor(() => expect(screen.getByText('Nyckeln fungerar · 12 av 100 anrop i dag · Gratisnivå')).toBeTruthy())
    expect(getSportSettings()).toMatchObject({ apiKey: '0123456789abcdef', provider: 'api-sports' })
  })

  it('underkänd nyckel: "Nyckeln godtogs inte" och inget sparas', async () => {
    stubFetch('bad')
    render(<KeyCard variant="banner" />)
    fireEvent.change(screen.getByTestId('sport-key-input'), { target: { value: 'wrong123' } })
    fireEvent.click(screen.getByText('Kontrollera och spara'))
    await waitFor(() => expect(screen.getByText('Nyckeln godtogs inte')).toBeTruthy())
    expect(getSportSettings().apiKey).toBeNull()
  })

  it('"Inte nu" döljer bannern för gott', () => {
    const onDone = vi.fn()
    render(<KeyCard variant="banner" onDone={onDone} />)
    fireEvent.click(screen.getByText('Inte nu'))
    expect(getSportSettings().keyCardDismissed).toBe(true)
    expect(shouldShowKeyBanner(getSportSettings())).toBe(false)
    expect(onDone).toHaveBeenCalled()
  })

  it('TV: "Skriv in med telefonen" visar telefonsidans QR', async () => {
    __setTvModeForTests(true)
    stubFetch('ok')
    render(<KeyCard variant="banner" />)
    expect(screen.queryByTestId('sport-key-input')).toBeNull()
    fireEvent.click(screen.getByText('Skriv in med telefonen'))
    await waitFor(() => expect(screen.getAllByTestId('qr').some((q) => q.getAttribute('data-value') === 'http://192.168.1.5:3012/sport-key?c=c0de')).toBe(true))
  })
})
```

- [ ] **Step 3: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/key-card.test.tsx`
Expected: FAIL med "Failed to resolve import './key-card'".

- [ ] **Step 4: Implementera**

```tsx
// runtime/sport/key-card.tsx
'use client'

import { useState } from 'react'
import { QRCodeSVG, useTvMode } from '@/lib/plugin-sdk'
import { TV, dp, station, Segment } from '../tv/tv-ui'
import { useTvText, type TvStringKey } from '../tv/tv-strings'
import { useTextPrompt } from '../tv/tv-text-entry'
import { API_SPORTS_REGISTER_URL } from './api-sports'
import { THESPORTSDB_PRICING_URL } from './thesportsdb'
import { providerFor } from './providers'
import { saveValidatedKey, type KeyFlowResult } from './key-flow'
import { useKeyHandoff } from './key-handoff'
import { currentBudget } from './budget'
import { setSportSettings, useSportSettings, type SportSettings } from './sport-store'
import type { ProviderId } from './provider'
import type { SportKind } from './sport-model'

const SPORT_NAMES: Array<[SportKind, TvStringKey]> = [
  ['football', 'sportNameFootball'], ['hockey', 'sportNameHockey'], ['basketball', 'sportNameBasketball'], ['handball', 'sportNameHandball'],
]

export function shouldShowKeyBanner(s: SportSettings): boolean {
  return !s.apiKey && !s.keyCardDismissed
}

type Phase = { kind: 'idle' } | { kind: 'checking' } | { kind: 'done'; result: KeyFlowResult }

export function KeyCard({ variant, onDone, pushLayer }: { variant: 'banner' | 'tab' | 'settings'; onDone?: () => void; pushLayer?: (close: () => void) => () => void }) {
  const { tt } = useTvText()
  const tv = useTvMode()
  const settings = useSportSettings()
  const [provider, setProvider] = useState<ProviderId>(settings.provider)
  const [draft, setDraft] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [phoneEntry, setPhoneEntry] = useState(false)
  const prompt = useTextPrompt({ pushLayer })
  const broken = !!settings.apiKey && !!currentBudget()?.isInvalid()

  const submit = async (raw: string) => {
    setPhase({ kind: 'checking' })
    const result = await saveValidatedKey(provider, raw)
    setPhase({ kind: 'done', result })
    if (result.ok) setPhoneEntry(false)
  }
  const handoff = useKeyHandoff(tv && phoneEntry, (key) => void submit(key))

  const covered = SPORT_NAMES.filter(([s]) => providerFor(provider).coverage(s) === 'full').map(([, k]) => tt(k))
  const sportsText = covered.length > 1 ? `${covered.slice(0, -1).join(', ')} ${tt('sportListAnd')} ${covered[covered.length - 1]}` : covered.join('')
  const signupUrl = provider === 'api-sports' ? API_SPORTS_REGISTER_URL : THESPORTSDB_PRICING_URL

  const message = (() => {
    if (phase.kind === 'checking') return tt('sportKeyChecking')
    if (phase.kind !== 'done') return broken ? tt('sportKeyBroken') : null
    const r = phase.result
    if (r.ok) {
      const plan = r.check.plan && r.check.plan.toLowerCase() === 'free' ? tt('sportPlanFree') : (r.check.plan ?? '')
      return r.check.limit != null && r.check.used != null ? tt('sportKeyOk', { used: r.check.used, limit: r.check.limit, plan }) : tt('sportKeyOkNoQuota', { plan })
    }
    return r.reason === 'network' ? tt('sportKeyNetwork') : r.reason === 'rejected' ? tt('sportKeyRejected') : null
  })()

  const btn = (label: string, onOk: () => void, primary = false, testId?: string) => (
    <div data-testid={testId} {...station(onOk)} style={{ minHeight: dp(48), padding: `0 ${dp(18)}px`, borderRadius: dp(10), display: 'inline-flex', alignItems: 'center', fontSize: dp(17), fontWeight: 600, cursor: 'pointer', background: primary ? TV.text : TV.s12, color: primary ? '#0e0f13' : TV.text }}>{label}</div>
  )

  return (
    <section data-testid={`sport-key-card-${variant}`} style={{ borderRadius: dp(16), background: TV.s06, border: `1px solid ${TV.lineCard}`, padding: dp(24), display: 'flex', gap: dp(24), flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(12) }}>
        <div style={{ fontSize: dp(24), fontWeight: 600 }}>{broken ? tt('sportKeyBroken') : tt('sportKeyTitle')}</div>
        <Segment options={[{ key: 'api-sports', label: 'API-Sports' }, { key: 'thesportsdb', label: 'TheSportsDB' }]} value={provider} onChange={(k) => { setProvider(k as ProviderId); setPhase({ kind: 'idle' }) }} />
        <div style={{ fontSize: dp(16), color: TV.muted }}>{tt('sportKeyChoice')}</div>
        <div style={{ fontSize: dp(16), color: TV.muted }}>{tt('sportKeyCovers', { sports: sportsText })}</div>
        {tv ? (
          <div style={{ display: 'flex', gap: dp(12), flexWrap: 'wrap' }}>
            {btn(tt('sportKeyPhone'), () => { setPhoneEntry(true); handoff.restart() }, true)}
            {prompt.available ? btn(tt('sportKeyKeyboard'), () => prompt.ask(tt('sportKeyPaste'), '', (v) => void submit(v), 'password')) : null}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: dp(10), flexWrap: 'wrap', alignItems: 'center' }}>
            <input data-testid="sport-key-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tt('sportKeyPaste')} autoComplete="off" spellCheck={false}
              style={{ flex: '1 1 220px', minHeight: 44, borderRadius: 10, border: `1px solid ${TV.lineStrong}`, background: 'rgba(0,0,0,0.25)', color: TV.text, padding: '0 12px', fontFamily: 'ui-monospace, monospace' }} />
            {btn(tt('sportKeyPaste'), () => { void navigator.clipboard?.readText?.().then((t) => setDraft(t)).catch(() => {}) })}
            {btn(tt('sportKeySave'), () => void submit(draft), true)}
          </div>
        )}
        {message ? <div role="status" style={{ fontSize: dp(16), color: phase.kind === 'done' && phase.result.ok ? '#3cd6a3' : TV.text }}>{message}</div> : null}
        {variant !== 'settings' && !settings.apiKey ? <div>{btn(tt('sportKeyNotNow'), () => { setSportSettings({ keyCardDismissed: true }); onDone?.() })}</div> : null}
      </div>
      <div style={{ display: 'flex', gap: dp(20), alignItems: 'flex-start' }}>
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: dp(8), alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: dp(8), borderRadius: dp(8) }}><QRCodeSVG value={signupUrl} size={dp(132)} /></div>
          {tv ? <figcaption style={{ fontSize: dp(14), color: TV.dim }}>{tt('sportKeyGetKey')}</figcaption> : <a href={signupUrl} target="_blank" rel="noreferrer" style={{ fontSize: dp(14), color: TV.dim }}>{tt('sportKeyGetKey')}</a>}
        </figure>
        {tv && phoneEntry ? (
          <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: dp(8), alignItems: 'center', maxWidth: dp(180) }}>
            {handoff.url ? <div style={{ background: '#fff', padding: dp(8), borderRadius: dp(8) }}><QRCodeSVG value={handoff.url} size={dp(132)} /></div> : null}
            <figcaption style={{ fontSize: dp(14), color: TV.dim, textAlign: 'center' }}>{handoff.expired ? tt('sportKeyExpired') : tt('sportKeyPhoneHint')}</figcaption>
            {handoff.expired ? btn(tt('sportKeyRetry'), handoff.restart) : null}
          </figure>
        ) : null}
      </div>
    </section>
  )
}
```

`Segment` i `tv-ui.tsx` tar `options`, `value` och `onChange`, och valet ritas som klickbara poster med etiketten som text (testet klickar på "TheSportsDB"). Om `Segment` saknar `role`/klickyta i stubbmiljön: använd två `btn(...)` i stället, med samma etiketter.

I `sport/tv/sport-shell.tsx` (fas 1) läser skalet redan inställningarna via `ctx.settings` (`useSportCtx`), så ingen ny hook behövs. Direkt ovanför `{body()}`:

```tsx
{shouldShowKeyBanner(ctx.settings) && tab !== 'results' ? <KeyCard variant="banner" pushLayer={nav.pushLayer} /> : null}
```

Fliken Resultat (Task 18) har sitt eget kort och visar inte bannern.

- [ ] **Step 5: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/key-card.test.tsx && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (5 tester). Inga nya tsc-fel.

- [ ] **Step 6: Commit**

```bash
cd "$PLG" && git add runtime/sport/key-card.tsx runtime/sport/key-card.test.tsx src/__test-stubs__/plugin-sdk.ts runtime/sport/tv/sport-shell.tsx runtime/tv/tv-strings.ts
git commit -m "live-tv sport: key card with provider choice, QR and instant validation"
```

---

### Task 17: Nyckeln i pluginets inställningar (skrivbord, TV, telefon)

**Files:**
- Create: `$PLG/runtime/sport/sport-key-settings.tsx`
- Modify: `$PLG/runtime/live-tv-settings-section.tsx` (nytt block sist), `$PLG/runtime/tv/tv-settings.tsx` (fliken `sport`), `$PLG/runtime/tv/mobile/settings-phone.tsx` (undersidan `sport` och raden i "Mer"), `$PLG/runtime/tv/tv-strings.ts`
- Test: `$PLG/runtime/sport/sport-key-settings.test.tsx`

**Interfaces:**
- Consumes: Task 13 (`maskKey`, `removeKey`), Task 16 (`KeyCard`), Task 14 (`useResultsController`, `rateLine`). `settings-ui.tsx` (`LtSection`, `LtRows`, `LtNote`, `LtBtn`, `LtConfirm`), `tv/settings-tabs.tsx` (`Row`, `Heading`).
- Produces: `export function SportKeySettingsDesktop(): JSX.Element`, `export function SportKeySettingsTv(props: { phone?: boolean }): JSX.Element`.

Strängar: `tabSport` (Sport / Sport), `sportSettingsTitle` (Results and tables / Resultat och tabeller), `sportSettingsSource` (Source / Källa), `sportSettingsKey` (Key / Nyckel), `sportKeyChange` (Change key / Byt nyckel), `sportKeyRemove` (Remove key / Ta bort nyckel), `sportKeyRemoveBody` (Results, tables and goal alerts stop. Matches from the guide remain. / Resultat, tabeller och målnotiser slutar. Matcherna ur guiden finns kvar.), `sportNoKey` (No key / Ingen nyckel), `sportCancel` (Cancel / Avbryt).

Kom ihåg att Live TV har **två** inställningsytor (skrivbordets kort och TV:ns rader). Båda måste få blocket.

- [ ] **Step 1: Skriv de fallerande testerna**

```tsx
// runtime/sport/sport-key-settings.test.tsx
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportKeySettingsDesktop, SportKeySettingsTv } from './sport-key-settings'
import { getSportSettings, setSportSettings } from './sport-store'
import { __resetBudgetForTests } from './budget'

beforeEach(() => { __resetPluginStorageForTests(); __resetBudgetForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('nyckeln i inställningarna', () => {
  it('skrivbord: maskerad nyckel, källa, och Ta bort nyckel med bekräftelse', () => {
    setSportSettings({ apiKey: '0123456789abcdef3f9a', provider: 'api-sports', keyPlan: 'Free' })
    render(<SportKeySettingsDesktop />)
    expect(screen.getByText('••••3f9a')).toBeTruthy()
    expect(screen.getByText('API-Sports')).toBeTruthy()
    expect(screen.queryByText('0123456789abcdef3f9a')).toBeNull()
    fireEvent.click(screen.getByText('Ta bort nyckel'))
    fireEvent.click(screen.getAllByText('Ta bort nyckel').at(-1)!)
    expect(getSportSettings().apiKey).toBeNull()
  })
  it('utan nyckel visas nyckelkortet direkt', () => {
    render(<SportKeySettingsDesktop />)
    expect(screen.getByTestId('sport-key-card-settings')).toBeTruthy()
  })
  it('TV-raderna: Nyckel ••••3f9a och Ta bort nyckel', () => {
    setSportSettings({ apiKey: 'abcdefgh3f9a', provider: 'thesportsdb' })
    render(<SportKeySettingsTv />)
    expect(screen.getByText('••••3f9a')).toBeTruthy()
    expect(screen.getByText('TheSportsDB')).toBeTruthy()
    expect(screen.getByText('Ta bort nyckel')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/sport-key-settings.test.tsx`
Expected: FAIL med "Failed to resolve import './sport-key-settings'".

- [ ] **Step 3: Implementera**

```tsx
// runtime/sport/sport-key-settings.tsx
'use client'

import { useState } from 'react'
import { LtBtn, LtConfirm, LtNote, LtRows, LtSection } from '../settings-ui'
import { Heading, Row } from '../tv/settings-tabs'
import { useTvText } from '../tv/tv-strings'
import { KeyCard } from './key-card'
import { maskKey, removeKey } from './key-flow'
import { rateLine } from './rate-line'
import { useResultsController } from './results-controller'
import { useSportSettings } from './sport-store'

const PROVIDER_LABEL = { 'api-sports': 'API-Sports', thesportsdb: 'TheSportsDB' } as const

function useQuotaText(): string | null {
  const { tt, lang, locale } = useTvText()
  const controller = useResultsController()
  return controller ? rateLine(controller.status(), tt, { lang, locale })?.text ?? null : null
}

export function SportKeySettingsDesktop() {
  const { tt } = useTvText()
  const s = useSportSettings()
  const quota = useQuotaText()
  const [changing, setChanging] = useState(false)
  const [confirm, setConfirm] = useState(false)
  return (
    <div data-testid="sport-key-settings">
      <LtSection eyebrow={tt('tabSport')} title={tt('sportSettingsTitle')} />
      {!s.apiKey || changing ? (
        <KeyCard variant="settings" onDone={() => setChanging(false)} />
      ) : (
        <LtRows>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0' }}>
            <span>{tt('sportSettingsSource')}</span><span>{PROVIDER_LABEL[s.provider]}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0' }}>
            <span>{tt('sportSettingsKey')}</span><span style={{ fontFamily: 'ui-monospace, monospace' }}>{maskKey(s.apiKey)}</span>
          </div>
          {quota ? <LtNote>{quota}</LtNote> : null}
          <div style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
            <LtBtn onClick={() => setChanging(true)}>{tt('sportKeyChange')}</LtBtn>
            <LtBtn variant="danger" onClick={() => setConfirm(true)}>{tt('sportKeyRemove')}</LtBtn>
          </div>
        </LtRows>
      )}
      {confirm ? (
        <LtConfirm title={tt('sportKeyRemove')} body={tt('sportKeyRemoveBody')} confirmLabel={tt('sportKeyRemove')} cancelLabel={tt('sportCancel')}
          onCancel={() => setConfirm(false)} onConfirm={() => { removeKey(); setConfirm(false) }} />
      ) : null}
    </div>
  )
}

export function SportKeySettingsTv({ phone = false }: { phone?: boolean }) {
  const { tt } = useTvText()
  const s = useSportSettings()
  const quota = useQuotaText()
  const [changing, setChanging] = useState(false)
  if (!s.apiKey || changing) return <KeyCard variant="settings" onDone={() => setChanging(false)} />
  return (
    <div data-testid="sport-key-settings-tv">
      <Heading phone={phone} hint={quota ?? undefined}>{tt('sportSettingsTitle')}</Heading>
      <Row phone={phone} label={tt('sportSettingsSource')} right={PROVIDER_LABEL[s.provider]} onOk={() => setChanging(true)} />
      <Row phone={phone} label={tt('sportSettingsKey')} right={maskKey(s.apiKey)} onOk={() => setChanging(true)} />
      <Row phone={phone} label={tt('sportKeyChange')} right="" onOk={() => setChanging(true)} />
      <Row phone={phone} testId="sport-key-remove" label={tt('sportKeyRemove')} right="" onOk={() => removeKey()} />
    </div>
  )
}
```

`LtBtn` har en `variant`. Om `'danger'` inte finns i dess unionstyp används den destruktiva varianten som `LtBtn` har (läs `settings-ui.tsx:106`). TV-raden "Ta bort nyckel" tas bort direkt, som de andra destruktiva TV-raderna i `settings-tabs.tsx`. Om de raderna bekräftar först (läs `ParentalTab`) gör vi likadant med samma mönster.

Kopplingar:
- `live-tv-settings-section.tsx`: sist i den yttre kolumnen (efter EPG-blocket), `<SportKeySettingsDesktop />`.
- `tv/tv-settings.tsx`: `type Tab = 'appearance' | 'content' | 'playlists' | 'epg' | 'parental' | 'sport'`, `TABS` får `'sport'` sist, `labels.sport = tt('tabSport')`, och i innehållet `{tab === 'sport' ? <SportKeySettingsTv /> : null}`.
- `tv/mobile/settings-phone.tsx`: villkoret blir `params.tab === 'epg' || params.tab === 'parental' || params.tab === 'content' || params.tab === 'sport'`. `rubrik` får grenen `params.tab === 'sport' ? 'tabSport'`, och kortets innehåll grenen `params.tab === 'sport' ? <SportKeySettingsTv phone />`. I "Mer" läggs `<NavRow testId="settings-sport" label={tt('tabSport')} onOk={() => nav.go('settings', { tab: 'sport' })} />` efter föräldrakontrollen.

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/sport-key-settings.test.tsx runtime/tv/tv-settings.test.tsx runtime/tv/tv-shell-phone.test.tsx runtime/live-tv-settings-section.test.tsx && npx tsc --noEmit -p tsconfig.json`
Expected: PASS. Om ett befintligt test räknar flikarna eller raderna i "Mer" ska förväntningen höjas med en.

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/sport-key-settings.tsx runtime/sport/sport-key-settings.test.tsx runtime/live-tv-settings-section.tsx runtime/tv/tv-settings.tsx runtime/tv/mobile/settings-phone.tsx runtime/tv/tv-strings.ts
git commit -m "live-tv sport: masked key, change and remove in both settings surfaces"
```

---

### Task 18: Resultat-fliken med tabell och form

**Files:**
- Create: `$PLG/runtime/sport/tv/sport-results.tsx`
- Modify (fas 1): `$PLG/runtime/sport/tv/sport-shell.tsx` (fliken `results` läggs till och renderar `SportResults`)
- Modify (fas 1): `$PLG/runtime/sport/tv/sport-shell.test.tsx` (fliktestet räknar nu tre flikar)
- Modify: `$PLG/runtime/tv/tv-strings.ts`
- Test: `$PLG/runtime/sport/tv/sport-results.test.tsx`

**Interfaces:**
- Consumes: Task 14 (`ResultsController.loadStandings`, `standings`), Task 15 (`MatchScore`, `matchStatusLabel`, `Crest` med `src`), Task 16 (`KeyCard`), Fas 1 `SportMatch`, `useSportSettings`, fliken `SportTab` och dagbrickorna i `sport-shell.tsx`, testfixturen `fxMatch`.
- Produces:
  ```ts
  export type ResultsFilter = 'all' | 'live' | 'mine'
  export interface ResultGroup { key: string; sport: SportKind; league: string; leagueId: string; season: string; round: number | null; matches: SportMatch[] }
  export function groupResults(matches: SportMatch[], filter: ResultsFilter): { groups: ResultGroup[]; liveCount: number; mineCount: number }
  export function formLetters(form: string | null, tt: TT): Array<{ letter: string; kind: 'W' | 'D' | 'L' }>
  export function SportResults(props: { matches: SportMatch[]; controller: ResultsController | null; onOpenMatch(m: SportMatch): void; tv: boolean }): JSX.Element
  ```

Obs: Task 21 flyttar `groupResults`, `formLetters` och `FORM_COLOR` till `sport/results-model.ts` (telefonen får inte importera ur `sport/tv/*`). Den här filen återexporterar dem sedan.

Resultat listar bara matcher med fixtur i en täckt sport. Tennis och EPG-matcher utan fixtur listas aldrig. "Mina kanaler" är matcher med källor som inte är "Bara resultat". Fas 1 har ingen Resultat-flik (`SportTab = 'foryou' | 'follows'`), så fliken läggs till här.

Strängar: `sportTabResults` (Results / Resultat), `sportResultsAll` (All / Alla), `sportResultsLive` (Live only / Bara live), `sportResultsMine` (My channels ({n}) / Mina kanaler ({n})), `sportJumpTo` (JUMP TO / HOPPA TILL), `sportTable` (Table / Tabell), `sportColTeam` (Team / Lag), `sportColPlayed` (P / M), `sportColPoints` (Pts / P), `sportColForm` (Form / Form), `sportResultsEmpty` (No results for this day. / Inga resultat den här dagen.), `sportFormW` (W / V), `sportFormD` (D / O), `sportFormL` (L / F). `sportRound` (Omgång {n}) finns redan i fas 1.

- [ ] **Step 1: Skriv de fallerande testerna**

```tsx
// runtime/sport/tv/sport-results.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportResults, formLetters, groupResults } from './sport-results'
import { tvText } from '../../tv/tv-strings'
import { setSportSettings } from '../sport-store'
import { fxMatch } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'

const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
let n = 0
// fxMatch ger Allsvenskan, AIK - Hammarby och en källa (TV4); fixturen och ställningen läggs på här.
const m = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: `m${++n}`, home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', start: n, stop: n + 1,
  status: 'finished', score: { home: 1, away: 0 }, round: 27, coverage: 'full',
  fixture: { provider: 'api-sports', id: `f${n}`, leagueId: '113', season: '2026' }, ...over,
})

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('groupResults', () => {
  it('ligagrupper med omgång; tennis och EPG utan fixtur listas aldrig', () => {
    const list = [m(), m({ status: 'live' }), m({ kind: 'hockey', league: 'SHL', fixture: { provider: 'api-sports', id: 'h', leagueId: '47', season: '2026' } }), m({ kind: 'tennis', coverage: 'epg' }), m({ fixture: undefined })]
    const r = groupResults(list, 'all')
    expect(r.groups.map((g) => [g.league, g.round, g.matches.length])).toEqual([['Allsvenskan', 27, 2], ['SHL', 27, 1]])
    expect(r.liveCount).toBe(1)
    expect(r.mineCount).toBe(3)
  })
  it('Bara live och Mina kanaler', () => {
    const list = [m({ status: 'live' }), m(), m({ resultOnly: true, sources: [] })]
    expect(groupResults(list, 'live').groups[0].matches).toHaveLength(1)
    expect(groupResults(list, 'mine').groups[0].matches).toHaveLength(2)
  })
  it('form på svenska', () => {
    expect(formLetters('WDL', tt).map((f) => f.letter).join('')).toBe('VOF')
    expect(formLetters(null, tt)).toEqual([])
  })
})

describe('SportResults', () => {
  it('utan nyckel: nyckelkortet; efter "Inte nu": den diskreta raden', () => {
    const { rerender } = render(<SportResults matches={[]} controller={null} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByTestId('sport-key-card-tab')).toBeTruthy()
    setSportSettings({ keyCardDismissed: true })
    rerender(<SportResults matches={[]} controller={null} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByText('Visa resultat – lägg till nyckel')).toBeTruthy()
  })
  it('med nyckel: grupper, HOPPA TILL och Tabell med form', async () => {
    setSportSettings({ apiKey: 'k123' })
    const rows = [{ rank: 1, team: { id: '363', name: 'AIK Stockholm', crest: null }, played: 26, points: 58, goalDiff: 25, form: 'WWDWW', group: null }]
    const controller = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => rows), subscribe: () => () => {} }
    render(<SportResults matches={[m()]} controller={controller as never} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByText('Allsvenskan · Omgång 27')).toBeTruthy()
    expect(screen.getByText('HOPPA TILL')).toBeTruthy()
    fireEvent.click(screen.getByText('Tabell'))
    await waitFor(() => expect(screen.getByText('AIK Stockholm')).toBeTruthy())
    expect(controller.loadStandings).toHaveBeenCalledWith('football', '113', '2026')
    expect(screen.getByText('58')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/tv/sport-results.test.tsx`
Expected: FAIL med "Failed to resolve import './sport-results'".

- [ ] **Step 3: Implementera**

```tsx
// runtime/sport/tv/sport-results.tsx
'use client'

import { useRef, useState } from 'react'
import { TV, dp, station, Chip } from '../../tv/tv-ui'
import { useTvText, type TvStringKey } from '../../tv/tv-strings'
import { Crest } from './sport-parts'
import { MatchScore, matchStatusLabel } from './sport-score'
import { KeyCard } from '../key-card'
import { useSportSettings } from '../sport-store'
import type { ResultsController } from '../results-controller'
import type { StandingRow } from '../provider'
import type { SportKind, SportMatch } from '../sport-model'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string
export type ResultsFilter = 'all' | 'live' | 'mine'
export interface ResultGroup { key: string; sport: SportKind; league: string; leagueId: string; season: string; round: number | null; matches: SportMatch[] }

// Matcher med fixtur bär källans status i `status` (live omfattar paus), så klockan behövs inte här.
const isLive = (m: SportMatch) => m.status === 'live'
const isMine = (m: SportMatch) => m.sources.length > 0 && !m.resultOnly

export function groupResults(matches: SportMatch[], filter: ResultsFilter): { groups: ResultGroup[]; liveCount: number; mineCount: number } {
  const eligible = matches.filter((m) => m.coverage === 'full' && m.fixture?.leagueId)
  const shown = eligible.filter((m) => (filter === 'live' ? isLive(m) : filter === 'mine' ? isMine(m) : true))
  const groups = new Map<string, ResultGroup>()
  for (const m of shown) {
    const key = `${m.kind}|${m.fixture!.leagueId}`
    const g = groups.get(key) ?? { key, sport: m.kind, league: m.league, leagueId: m.fixture!.leagueId!, season: m.fixture!.season ?? '', round: m.round ?? null, matches: [] }
    g.matches.push(m)
    groups.set(key, g)
  }
  for (const g of groups.values()) g.matches.sort((a, b) => a.start - b.start)
  return { groups: [...groups.values()], liveCount: eligible.filter(isLive).length, mineCount: eligible.filter(isMine).length }
}

export function formLetters(form: string | null, tt: TT): Array<{ letter: string; kind: 'W' | 'D' | 'L' }> {
  const map = { W: tt('sportFormW'), D: tt('sportFormD'), L: tt('sportFormL') }
  return (form ?? '').toUpperCase().split('').filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L').map((kind) => ({ kind, letter: map[kind] }))
}

const FORM_COLOR = { W: '#3cd6a3', D: 'rgba(243,244,248,0.45)', L: '#e0776a' }

function StandingsTable({ rows, tt }: { rows: StandingRow[]; tt: TT }) {
  const cell = { padding: `${dp(6)}px ${dp(8)}px`, fontSize: dp(15) } as const
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', color: TV.text }}>
      <thead><tr style={{ color: TV.dim, textAlign: 'left' }}><th style={cell}>#</th><th style={cell}>{tt('sportColTeam')}</th><th style={cell}>{tt('sportColPlayed')}</th><th style={cell}>{tt('sportColPoints')}</th><th style={cell}>{tt('sportColForm')}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.group ?? ''}-${r.rank}-${r.team.id}`} style={{ borderTop: `1px solid ${TV.line}` }}>
            <td style={cell}>{r.rank}</td>
            <td style={{ ...cell, display: 'flex', alignItems: 'center', gap: dp(8) }}><Crest name={r.team.name} colorKey={r.team.id} src={r.team.crest} size={dp(20)} />{r.team.name}</td>
            <td style={cell}>{r.played}</td>
            <td style={{ ...cell, fontWeight: 600 }}>{r.points}</td>
            <td style={cell}><span style={{ display: 'inline-flex', gap: dp(4) }}>{formLetters(r.form, tt).map((f, i) => <span key={i} style={{ width: dp(18), height: dp(18), borderRadius: dp(4), background: FORM_COLOR[f.kind], color: '#0e0f13', fontSize: dp(11), fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{f.letter}</span>)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SportResults({ matches, controller, onOpenMatch, tv }: { matches: SportMatch[]; controller: ResultsController | null; onOpenMatch(m: SportMatch): void; tv: boolean }) {
  const { tt } = useTvText()
  const settings = useSportSettings()
  const [filter, setFilter] = useState<ResultsFilter>('all')
  const [showCard, setShowCard] = useState(false)
  const [tables, setTables] = useState<Record<string, StandingRow[] | 'loading'>>({})
  const groupRefs = useRef(new Map<string, HTMLElement>())

  if (!settings.apiKey || !controller) {
    if (settings.keyCardDismissed && !showCard) {
      return <div {...station(() => setShowCard(true))} style={{ color: TV.dim, fontSize: dp(16), cursor: 'pointer', padding: dp(12) }}>{tt('sportKeyAddRow')}</div>
    }
    return <KeyCard variant="tab" onDone={() => setShowCard(false)} />
  }

  const { groups, liveCount, mineCount } = groupResults(matches, filter)
  const toggleTable = async (g: ResultGroup) => {
    if (tables[g.key]) { setTables((t) => { const { [g.key]: _drop, ...rest } = t; return rest }); return }
    setTables((t) => ({ ...t, [g.key]: 'loading' }))
    const rows = controller.standings(g.sport, g.leagueId, g.season) ?? (await controller.loadStandings(g.sport, g.leagueId, g.season))
    setTables((t) => ({ ...t, [g.key]: rows ?? [] }))
  }

  return (
    <div data-testid="sport-results" style={{ display: 'flex', flexDirection: 'column', gap: dp(20) }}>
      <div style={{ display: 'flex', gap: dp(10), flexWrap: 'wrap' }}>
        <Chip active={filter === 'all'} {...station(() => setFilter('all'), undefined, tv ? { 'data-init': '' } : undefined)}>{tt('sportResultsAll')}</Chip>
        <Chip active={filter === 'live'} {...station(() => setFilter('live'))}>{`${tt('sportResultsLive')} (${liveCount})`}</Chip>
        <Chip active={filter === 'mine'} {...station(() => setFilter('mine'))}>{tt('sportResultsMine', { n: mineCount })}</Chip>
      </div>
      {groups.length > 0 ? (
        <div style={{ display: 'flex', gap: dp(10), alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: dp(13), letterSpacing: '0.12em', color: TV.dim }}>{tt('sportJumpTo')}</span>
          {groups.map((g) => (
            <Chip key={g.key} active={false} {...station(() => { const el = groupRefs.current.get(g.key); el?.scrollIntoView({ block: 'start' }); (el?.querySelector('[data-f]') as HTMLElement | null)?.focus() })}>{g.league}</Chip>
          ))}
        </div>
      ) : null}
      {groups.length === 0 ? <div style={{ color: TV.dim, fontSize: dp(16) }}>{tt('sportResultsEmpty')}</div> : null}
      {groups.map((g) => (
        <section key={g.key} ref={(el) => { if (el) groupRefs.current.set(g.key, el); else groupRefs.current.delete(g.key) }} style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: dp(20), fontWeight: 600 }}>{g.round != null ? `${g.league} · ${tt('sportRound', { n: g.round })}` : g.league}</div>
            <div {...station(() => void toggleTable(g))} style={{ fontSize: dp(15), color: TV.muted, cursor: 'pointer', padding: `${dp(6)}px ${dp(12)}px`, borderRadius: dp(8), background: TV.s08 }}>{tt('sportTable')}</div>
          </div>
          {g.matches.map((m) => (
            <div key={m.id} {...station(() => onOpenMatch(m))} style={{ display: 'grid', gridTemplateColumns: `${dp(64)}px 1fr auto 1fr`, alignItems: 'center', gap: dp(10), padding: `${dp(10)}px ${dp(12)}px`, borderRadius: dp(10), background: TV.s05, cursor: 'pointer' }}>
              <span style={{ fontSize: dp(14), color: m.status === 'live' ? TV.live : TV.dim }}>{matchStatusLabel(m, tt) ?? ''}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: dp(8), justifyContent: 'flex-end' }}>{m.home}<Crest name={m.home ?? ''} colorKey={m.homeKey ?? ''} src={m.homeCrest} size={dp(22)} /></span>
              <MatchScore match={m} size="row" />
              <span style={{ display: 'flex', alignItems: 'center', gap: dp(8) }}><Crest name={m.away ?? ''} colorKey={m.awayKey ?? ''} src={m.awayCrest} size={dp(22)} />{m.away}</span>
            </div>
          ))}
          {tables[g.key] && tables[g.key] !== 'loading' ? <StandingsTable rows={tables[g.key] as StandingRow[]} tt={tt} /> : null}
        </section>
      ))}
    </div>
  )
}
```

`tv` styr fokus: första filtret får `data-init` på TV, som fas 1:s flikar. Fas 1:s övriga vyer är rena bodyfunktioner i skalet, så `SportResults` får `ctx.openMatch` som `onOpenMatch`.

I `sport/tv/sport-shell.tsx` (fas 1) läggs fliken till. `SportTab` blir `'foryou' | 'results' | 'follows'`, flikraden mappar `(['foryou', 'results', 'follows'] as const)` med etiketten `key === 'foryou' ? tt('sportTabForYou') : key === 'results' ? tt('sportTabResults') : tt('sportTabFollows')` (testid `sport-tab-results`, samma `station`-mönster som de andra), och i `body()` efter grenarna för `missing` och `error`:

```tsx
if (tab === 'results') return <SportResults matches={mergedMatches} controller={controller} onOpenMatch={ctx.openMatch} tv={tvMode} />
```

`mergedMatches`, `controller` och `tvMode` kommer från Task 15 punkt 1. "Visa som"-segmentet visas fortfarande bara på För dig. Fas 1:s skaltest som räknar flikarna höjs med en, och ett fall öppnar Resultat och väntar sig `sport-key-card-tab` utan nyckel.

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/tv/sport-results.test.tsx runtime/sport/tv/sport-shell.test.tsx && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (resultat 5 tester).

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/tv/sport-results.tsx runtime/sport/tv/sport-results.test.tsx runtime/sport/tv/sport-shell.tsx runtime/sport/tv/sport-shell.test.tsx runtime/tv/tv-strings.ts
git commit -m "live-tv sport: Results tab with league groups, filters and form tables"
```

---

### Task 19: Matchcentret: händelser, statistik, uppställningar och notis vid mål

**Files:**
- Create: `$PLG/runtime/sport/tv/sport-match-center-data.tsx`
- Modify (fas 1): `$PLG/runtime/sport/tv/sport-match-center.tsx` (rendera `MatchCenterData` under "Var kan jag se den")
- Modify: `$PLG/runtime/tv/tv-strings.ts`
- Test: `$PLG/runtime/sport/tv/sport-match-center-data.test.tsx`

**Interfaces:**
- Consumes: Task 14 (`useResultsController`, `loadFixture`), Task 10 (`usePollDemand`), Task 15 (`RateLineView`), Task 6/7 (`FixtureDetail`), Fas 1 `SportMatch`, `setSportSettings`, `useSportSettings`, `fxMatch`.
- Produces: `export function MatchCenterData(props: { match: SportMatch }): JSX.Element | null`, `export function eventLabel(e: FixtureEvent, tt: TT): string`, `export function statLabel(label: string, tt: TT): string`, `export function toggleGoalAlert(match: SportMatch): void`.

Matchcentret hämtar fixturen en gång när det öppnas. Medan en match pågår hämtas den igen när ställningen eller minuten ändras, det vill säga i pollningstakten, och 60 s TTL i både minnet och på disk avdubblar. Tomma delar döljs. Utan fixtur, eller i en otäckt sport, renderas ingenting och inga anrop görs.

Strängar: `sportEvents` (Events / Händelser), `sportStats` (Statistics / Statistik), `sportLineups` (Line-ups / Laguppställningar), `sportSubs` (Substitutes / Avbytare), `sportEvGoal` (Goal / Mål), `sportEvCard` (Card / Kort), `sportEvYellow` (Yellow card / Gult kort), `sportEvRed` (Red card / Rött kort), `sportEvSub` (Substitution / Byte), `sportEvVar` (VAR / VAR), `sportEvPenalty` (Penalty / Utvisning), `sportGoalAlert` (Goal alerts / Notis vid mål), `sportAppRunningOnly` (Only while the app is running / Bara när appen körs), `sportStatPossession` (Ball possession / Bollinnehav), `sportStatShots` (Shots / Skott), `sportStatShotsOn` (Shots on target / Skott på mål), `sportStatCorners` (Corners / Hörnor).

- [ ] **Step 1: Skriv de fallerande testerna**

```tsx
// runtime/sport/tv/sport-match-center-data.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { MatchCenterData } from './sport-match-center-data'
import { apiSports } from '../api-sports'
import { getSportSettings } from '../sport-store'
import { fxMatch } from '../__sport-fixture'
import footballId from '../__fixtures__/api-sports/football-fixture-id.json'
import hockeyDate from '../__fixtures__/api-sports/hockey-games-date.json'
import hockeyEvents from '../__fixtures__/api-sports/hockey-games-events.json'
import type { SportMatch } from '../sport-model'

const match = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: 'm1', home: 'Malmo FF', away: 'Djurgardens IF', homeKey: 'malmo', awayKey: 'dif', league: 'Allsvenskan', leagueKey: 'a',
  start: Date.now(), stop: Date.now() + 1, status: 'live', minute: 67, score: { home: 2, away: 1 }, coverage: 'full',
  fixture: { provider: 'api-sports', id: '1180001' }, ...over,
})

const h = vi.hoisted(() => ({ controller: null as unknown }))
vi.mock('../results-controller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../results-controller')>()),
  useResultsController: () => h.controller,
}))

function fakeController(detail: unknown) {
  const c = { loadFixture: vi.fn(async () => detail), status: () => ({ provider: 'api-sports', state: 'ok', intervalMs: 180_000, remainingToday: 41, pausedUntil: null, paid: false }), subscribe: () => () => {} }
  h.controller = c
  return c
}

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en'); h.controller = null })

describe('MatchCenterData', () => {
  it('fotboll: händelser, statistik och uppställningar', async () => {
    const c = fakeController(apiSports.fixture('football', '1180001', { finished: false }).parse([footballId]))
    render(<MatchCenterData match={match()} />)
    await waitFor(() => expect(screen.getByText('Händelser')).toBeTruthy())
    expect(c.loadFixture).toHaveBeenCalledWith('football', '1180001', false)
    expect(screen.getByText('Gult kort')).toBeTruthy()
    expect(screen.getByText('Bollinnehav')).toBeTruthy()
    expect(screen.getByText('Laguppställningar')).toBeTruthy()
    expect(screen.getByText('I. Kiese Thelin', { selector: '[data-lineup] *' })).toBeTruthy()
    expect(screen.getByTestId('sport-rate-line').textContent).toContain('Uppdateras var 3:e min · 41 anrop kvar i dag')
  })
  it('hockey: tom statistik och tomma uppställningar döljs', async () => {
    fakeController(apiSports.fixture('hockey', '51001', { finished: false }).parse([{ response: [hockeyDate.response[0]] }, hockeyEvents]))
    render(<MatchCenterData match={match({ kind: 'hockey', fixture: { provider: 'api-sports', id: '51001' } })} />)
    await waitFor(() => expect(screen.getByText('Händelser')).toBeTruthy())
    expect(screen.getByText('Utvisning')).toBeTruthy()
    expect(screen.queryByText('Statistik')).toBeNull()
    expect(screen.queryByText('Laguppställningar')).toBeNull()
  })
  it('otäckt sport eller ingen fixtur: ingenting och inga anrop', () => {
    const c = fakeController(null)
    const { container } = render(<MatchCenterData match={match({ kind: 'tennis', coverage: 'epg', fixture: undefined })} />)
    expect(container.innerHTML).toBe('')
    expect(c.loadFixture).not.toHaveBeenCalled()
  })
  it('Notis vid mål sparas per match och säger att det bara gäller när appen körs', async () => {
    fakeController(null)
    render(<MatchCenterData match={match()} />)
    expect(screen.getByText('Bara när appen körs')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sport-goal-alert'))
    expect(Object.keys(getSportSettings().goalAlertMatches)).toEqual(['m1'])
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/tv/sport-match-center-data.test.tsx`
Expected: FAIL med "Failed to resolve import './sport-match-center-data'".

- [ ] **Step 3: Implementera**

```tsx
// runtime/sport/tv/sport-match-center-data.tsx
'use client'

import { useEffect, useState } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import { TV, dp, station, Toggle } from '../../tv/tv-ui'
import { useTvText, type TvStringKey } from '../../tv/tv-strings'
import { RateLineView } from './sport-score'
import { useResultsController } from '../results-controller'
import { usePollDemand } from '../live-poller'
import { getSportSettings, setSportSettings, useSportSettings } from '../sport-store'
import type { FixtureDetail, FixtureEvent } from '../provider'
import type { SportMatch } from '../sport-model'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string
const FOUR_HOURS = 4 * 3_600_000

export function eventLabel(e: FixtureEvent, tt: TT): string {
  switch (e.type) {
    case 'goal': return tt('sportEvGoal')
    case 'card': return /red/i.test(e.detail) ? tt('sportEvRed') : /yellow/i.test(e.detail) ? tt('sportEvYellow') : tt('sportEvCard')
    case 'sub': return tt('sportEvSub')
    case 'var': return tt('sportEvVar')
    case 'penalty': return tt('sportEvPenalty')
    default: return e.detail
  }
}

const STAT_KEYS: Record<string, TvStringKey> = {
  'Ball Possession': 'sportStatPossession', 'Total Shots': 'sportStatShots', 'Shots on Goal': 'sportStatShotsOn', 'Corner Kicks': 'sportStatCorners',
}
export function statLabel(label: string, tt: TT): string {
  return STAT_KEYS[label] ? tt(STAT_KEYS[label]) : label
}

export function toggleGoalAlert(match: SportMatch): void {
  const current = { ...getSportSettings().goalAlertMatches }
  if (current[match.id]) delete current[match.id]
  else current[match.id] = match.start + FOUR_HOURS
  setSportSettings({ goalAlertMatches: current })
}

export function MatchCenterData({ match }: { match: SportMatch }) {
  const { tt } = useTvText()
  const tv = useTvMode()
  const controller = useResultsController()
  const settings = useSportSettings()
  const [detail, setDetail] = useState<FixtureDetail | null>(null)
  const covered = match.coverage === 'full' && !!match.fixture
  const live = match.status === 'live'
  usePollDemand('match-center', covered && live)

  useEffect(() => {
    if (!covered || !controller || !match.fixture) return
    let cancelled = false
    void controller.loadFixture(match.kind, match.fixture.id, match.status === 'finished').then((d) => { if (!cancelled) setDetail(d) })
    return () => { cancelled = true }
    // Pågående match: hämta om när ställning eller minut ändras (pollningstakten).
  }, [covered, controller, match.kind, match.fixture?.id, match.status, match.score?.home, match.score?.away, match.minute])

  if (!covered) return null
  const alertOn = !!settings.goalAlertMatches[match.id]
  const h2 = { fontSize: dp(18), fontWeight: 600, marginTop: dp(12) } as const
  const sideName = (s: 'home' | 'away' | null) => (s === 'home' ? match.home ?? '' : s === 'away' ? match.away ?? '' : '')

  return (
    <div data-testid="sport-match-center-data" style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      {controller ? <RateLineView status={controller.status()} tv={tv} /> : null}
      <div data-testid="sport-goal-alert" {...station(() => toggleGoalAlert(match))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(12), padding: `${dp(10)}px ${dp(12)}px`, borderRadius: dp(10), background: TV.s06, cursor: 'pointer' }}>
        <span><span style={{ fontSize: dp(16) }}>{tt('sportGoalAlert')}</span><br /><span style={{ fontSize: dp(13), color: TV.dim }}>{tt('sportAppRunningOnly')}</span></span>
        <Toggle on={alertOn} />
      </div>
      {detail && detail.events.length > 0 ? (
        <section>
          <div style={h2}>{tt('sportEvents')}</div>
          {detail.events.map((e, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: `${dp(48)}px ${dp(110)}px 1fr`, gap: dp(8), padding: `${dp(6)}px 0`, fontSize: dp(15), borderTop: `1px solid ${TV.line}` }}>
              <span style={{ color: TV.dim }}>{e.minute != null ? `${e.minute}'${e.extra ? `+${e.extra}` : ''}` : ''}</span>
              <span>{eventLabel(e, tt)}</span>
              <span>{[e.player, e.assist ? `(${e.assist})` : null, sideName(e.side) ? `· ${sideName(e.side)}` : null].filter(Boolean).join(' ')}</span>
            </div>
          ))}
        </section>
      ) : null}
      {detail && detail.stats.length > 0 ? (
        <section>
          <div style={h2}>{tt('sportStats')}</div>
          {detail.stats.map((s) => (
            <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: dp(8), padding: `${dp(6)}px 0`, fontSize: dp(15), borderTop: `1px solid ${TV.line}` }}>
              <span style={{ textAlign: 'right' }}>{s.home}</span><span style={{ color: TV.dim }}>{statLabel(s.label, tt)}</span><span>{s.away}</span>
            </div>
          ))}
        </section>
      ) : null}
      {detail && detail.lineups.length > 0 ? (
        <section>
          <div style={h2}>{tt('sportLineups')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: dp(16) }}>
            {detail.lineups.map((l) => (
              <div key={l.side} data-lineup={l.side} style={{ display: 'flex', flexDirection: 'column', gap: dp(4), fontSize: dp(14) }}>
                <div style={{ fontWeight: 600 }}>{sideName(l.side)}{l.formation ? ` · ${l.formation}` : ''}</div>
                {l.startXI.map((p, i) => <div key={`s${i}`}><span style={{ color: TV.dim, display: 'inline-block', width: dp(28) }}>{p.number ?? ''}</span><span>{p.name}</span>{p.pos ? <span style={{ color: TV.faint }}> {p.pos}</span> : null}</div>)}
                {l.subs.length > 0 ? <div style={{ color: TV.dim, marginTop: dp(6) }}>{tt('sportSubs')}</div> : null}
                {l.subs.map((p, i) => <div key={`b${i}`} style={{ color: TV.muted }}><span style={{ display: 'inline-block', width: dp(28) }}>{p.number ?? ''}</span>{p.name}</div>)}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
```

I `sport/tv/sport-match-center.tsx` (fas 1): rendera `<MatchCenterData match={match} />` direkt under "Var kan jag se den". Fas 1:s matchcenter har ingen rad för Händelser, Statistik eller Laguppställningar (bara Påminn mig och källorna), så inget tas bort. Rubrikens status, märken och ställning är Task 15 punkt 6.

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/tv/sport-match-center-data.test.tsx runtime/sport && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (4 nya tester). Fas 1:s matchcentertester är fortfarande gröna.

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/tv/sport-match-center-data.tsx runtime/sport/tv/sport-match-center-data.test.tsx runtime/sport/tv/sport-match-center.tsx runtime/tv/tv-strings.ts
git commit -m "live-tv sport: match center events, statistics, line-ups and goal alerts"
```

---

### Task 20: MÅL!-overlay i spelaren och målnotis medan appen körs

**Files:**
- Create: `$PLG/runtime/sport/goal-alerts.ts`
- Create: `$PLG/runtime/sport/sport-goal-mount.tsx`
- Create: `$PLG/runtime/sport/tv/player-goal-overlay.tsx`
- Modify: `$PLG/runtime/live-tv-player.tsx` (efterfrågan, overlay, spelande kanal)
- Modify: `$PLG/runtime/index.ts` (bootstrap)
- Modify: `$PLG/runtime/tv/tv-strings.ts`
- Test: `$PLG/runtime/sport/goal-alerts.test.ts`, `$PLG/runtime/sport/tv/player-goal-overlay.test.tsx`

**Interfaces:**
- Consumes: Task 12 (`onGoal`, `GoalEvent`), Task 14 (`useResultsController`, `useChannelSportLive`, `currentResults`), Task 10 (`usePollDemand`). `tryNativeNotification` från `reminders.ts`, `requestOpenBrowsePage` från SDK:t, `encodeChannelParams` från `live-tv-shell.tsx`. Fas 1 `SportMatch`, `followState`, `rankedSources` (`sport-day-model.ts`), `getFollows`, `getOverrides`, `sourceChannel` (`sport-model.ts`), `fxMatch` och `fxSource`.
- Produces:
  ```ts
  // goal-alerts.ts
  export function matchForGoal(e: GoalEvent, merged: SportMatch[]): SportMatch | null
  export function goalAlertWanted(match: SportMatch | null, settings: SportSettings, follows: SportFollow[], now?: number): boolean
  export function goalTitle(e: GoalEvent, tt: TT): string      // "MÅL! Malmo FF 3–1 AIK"
  export function goalBody(e: GoalEvent): string               // "S. Larsson 67'"
  export function setPlayingChannel(key: string | null): void
  export function playingChannel(): string | null
  // player-goal-overlay.tsx
  export function PlayerGoalOverlay(props: { channelKey: string; onJump(channel: M3uChannel): void }): JSX.Element | null
  // sport-goal-mount.tsx
  export function SportGoalMount(): JSX.Element | null
  ```

Regler:
- **Overlay i spelaren**: visas när ett mål gäller matchen som går på den spelade kanalen. Gäller målet en annan match visas overlayn bara om den matchen följs eller har "Notis vid mål" påslaget, och då med "Hoppa dit" (om matchen har en källa). Overlayn syns i 6 s.
- **Notis** (native och banner, via bootstrapen): `settings.goalAlerts` och (följd match eller "Notis vid mål" för matchen), men inte när spelaren redan visar den matchens kanal, eftersom overlayn täcker det. Bara medan appen körs.
- Spelaren registrerar efterfrågan `'player'` när den spelade kanalen har en pågående match i en täckt sport (`useChannelSportLive`).

Strängar: `sportGoal` (GOAL! / MÅL!), `sportJumpThere` (Jump there / Hoppa dit). `sportWatch` (Titta) finns redan i fas 1.

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// runtime/sport/goal-alerts.test.ts
import { describe, expect, it } from 'vitest'
import { goalAlertWanted, goalBody, goalTitle, matchForGoal } from './goal-alerts'
import { tvText } from '../tv/tv-strings'
import type { GoalEvent } from './goal-events'
import type { SportSettings } from './sport-store'
import { fxMatch } from './__sport-fixture'

const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const e: GoalEvent = { fixtureId: '1', provider: 'api-sports', sport: 'football', side: 'home', score: { home: 3, away: 1 }, scorer: 'S. Larsson', minute: 67, at: 0, home: 'Malmo FF', away: 'AIK' }
const match = fxMatch({ id: 'm1', home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', leagueKey: 'a', fixture: { provider: 'api-sports', id: '1' } })
const settings = (over: Partial<SportSettings> = {}) => ({ apiKey: 'k', view: 'matchday', alert: 'off', goalAlerts: true, provider: 'api-sports', keyPlan: null, keyCardDismissed: false, goalAlertMatches: {}, ...over }) as SportSettings

describe('goal-alerts', () => {
  it('hittar matchen via källa och fixtur-id', () => {
    expect(matchForGoal(e, [match])).toBe(match)
    expect(matchForGoal({ ...e, fixtureId: '2' }, [match])).toBeNull()
  })
  it('notis kräver målnotis på OCH följd match eller "Notis vid mål" för matchen', () => {
    expect(goalAlertWanted(match, settings(), [{ sport: 'football', kind: 'team', key: 'malmo', name: 'Malmö FF' }])).toBe(true)
    expect(goalAlertWanted(match, settings(), [])).toBe(false)
    expect(goalAlertWanted(match, settings({ goalAlertMatches: { m1: 10_000 } }), [], 5_000)).toBe(true)
    expect(goalAlertWanted(match, settings({ goalAlerts: false, goalAlertMatches: { m1: 10_000 } }), [], 5_000)).toBe(false)
    expect(goalAlertWanted(null, settings(), [])).toBe(false)
  })
  it('texterna', () => {
    expect(goalTitle(e, tt)).toBe('MÅL! Malmo FF 3–1 AIK')
    expect(goalBody(e)).toBe("S. Larsson 67'")
    expect(goalBody({ ...e, scorer: null })).toBe("67'")
  })
})
```

```tsx
// runtime/sport/tv/player-goal-overlay.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { PlayerGoalOverlay } from './player-goal-overlay'
import { emitGoals, type GoalEvent } from '../goal-events'
import { setSportSettings } from '../sport-store'
import { fxMatch, fxSource } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'

const src = (key: string) => fxSource(key, { channelKey: key })
const mk = (id: string, fixtureId: string, channel: string, home = 'Malmo FF'): SportMatch => fxMatch({
  id, league: 'A', leagueKey: 'a', home, away: 'AIK', homeKey: home.toLowerCase(), awayKey: 'aik',
  status: 'live', minute: 67, score: { home: 3, away: 1 }, sources: [src(channel)], coverage: 'full',
  fixture: { provider: 'api-sports', id: fixtureId },
})
const goal = (fixtureId: string): GoalEvent => ({ fixtureId, provider: 'api-sports', sport: 'football', side: 'home', score: { home: 3, away: 1 }, scorer: 'S. Larsson', minute: 67, at: 0, home: 'Malmo FF', away: 'AIK' })

const h = vi.hoisted(() => ({ controller: null as unknown }))
vi.mock('../results-controller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../results-controller')>()),
  useResultsController: () => h.controller,
}))

beforeEach(() => {
  vi.useFakeTimers()
  __resetPluginStorageForTests()
  __setLangForTests('sv')
  const merged = [mk('m1', '1', 'cmore1'), mk('m2', '2', 'tv4', 'Hammarby')]
  h.controller = { merged: () => merged, onMerged: () => () => {}, subscribe: () => () => {} }
})
afterEach(() => { cleanup(); vi.useRealTimers(); __setLangForTests('en'); h.controller = null })

describe('PlayerGoalOverlay', () => {
  it('mål i matchen på kanalen: MÅL! med ställning och målskytt, borta efter 6 s', () => {
    render(<PlayerGoalOverlay channelKey="cmore1" onJump={vi.fn()} />)
    act(() => emitGoals([goal('1')]))
    expect(screen.getByText('MÅL!')).toBeTruthy()
    expect(screen.getByText('Malmo FF 3–1 AIK')).toBeTruthy()
    expect(screen.getByText("S. Larsson 67'")).toBeTruthy()
    expect(screen.queryByText('Hoppa dit')).toBeNull()
    act(() => { vi.advanceTimersByTime(6_001) })
    expect(screen.queryByText('MÅL!')).toBeNull()
  })
  it('följd match på annan kanal: Hoppa dit byter kanal', () => {
    setSportSettings({ goalAlerts: true, goalAlertMatches: { m2: Date.now() + 3_600_000 } })
    const onJump = vi.fn()
    render(<PlayerGoalOverlay channelKey="cmore1" onJump={onJump} />)
    act(() => emitGoals([goal('2')]))
    fireEvent.click(screen.getByText('Hoppa dit'))
    expect(onJump).toHaveBeenCalledWith(expect.objectContaining({ url: 'http://x/tv4' }))
  })
  it('ej följd match på annan kanal: ingenting', () => {
    render(<PlayerGoalOverlay channelKey="cmore1" onJump={vi.fn()} />)
    act(() => emitGoals([goal('2')]))
    expect(screen.queryByText('MÅL!')).toBeNull()
  })
})
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/goal-alerts.test.ts runtime/sport/tv/player-goal-overlay.test.tsx`
Expected: FAIL med "Failed to resolve import './goal-alerts'" och "./player-goal-overlay".

- [ ] **Step 3: Implementera**

```ts
// runtime/sport/goal-alerts.ts
import { followState } from './sport-day-model'
import type { SportFollow, SportSettings } from './sport-store'
import type { GoalEvent } from './goal-events'
import type { SportMatch } from './sport-model'
import type { TvStringKey } from '../tv/tv-strings'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

export function matchForGoal(e: GoalEvent, merged: SportMatch[]): SportMatch | null {
  return merged.find((m) => m.fixture?.provider === e.provider && m.fixture.id === e.fixtureId) ?? null
}

export function goalAlertWanted(match: SportMatch | null, settings: SportSettings, follows: SportFollow[], now: number = Date.now()): boolean {
  if (!match || !settings.goalAlerts) return false
  return followState(match, follows).any || (settings.goalAlertMatches[match.id] ?? 0) > now
}

export function goalTitle(e: GoalEvent, tt: TT): string {
  return `${tt('sportGoal')} ${e.home} ${e.score.home}–${e.score.away} ${e.away}`
}

export function goalBody(e: GoalEvent): string {
  const minute = e.minute != null ? `${e.minute}'` : ''
  return [e.scorer, minute].filter(Boolean).join(' ')
}

let playing: string | null = null
/** Spelaren sätter sin kanal. Notisen hoppas över när overlayn redan visar målet. */
export function setPlayingChannel(key: string | null): void { playing = key }
export function playingChannel(): string | null { return playing }
```

```tsx
// runtime/sport/tv/player-goal-overlay.tsx
'use client'

import { useEffect, useState } from 'react'
import { TV, dp, station } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { onGoal, type GoalEvent } from '../goal-events'
import { goalAlertWanted, goalBody, matchForGoal } from '../goal-alerts'
import { useResultsController } from '../results-controller'
import { rankedSources } from '../sport-day-model'
import { getFollows, getOverrides, getSportSettings } from '../sport-store'
import { sourceChannel, type SportMatch } from '../sport-model'
import type { M3uChannel } from '../../live-tv-data'

const SHOW_MS = 6_000

export function PlayerGoalOverlay({ channelKey, onJump }: { channelKey: string; onJump(channel: M3uChannel): void }) {
  const { tt } = useTvText()
  const controller = useResultsController()
  const [shown, setShown] = useState<{ e: GoalEvent; match: SportMatch; here: boolean } | null>(null)

  useEffect(() => onGoal((e) => {
    const match = controller ? matchForGoal(e, controller.merged()) : null
    if (!match) return
    const here = match.sources.some((s) => s.channelKey === channelKey)
    if (!here && !goalAlertWanted(match, getSportSettings(), getFollows())) return
    setShown({ e, match, here })
  }), [controller, channelKey])

  useEffect(() => {
    if (!shown) return
    const t = setTimeout(() => setShown(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [shown])

  if (!shown) return null
  const { e, match, here } = shown
  const target = !here ? rankedSources(match, getOverrides())[0] : undefined
  return (
    <div data-live-tv-goal-overlay="" role="status" style={{ position: 'absolute', top: dp(40), left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'flex', alignItems: 'center', gap: dp(20), padding: `${dp(16)}px ${dp(24)}px`, borderRadius: dp(16), background: 'rgba(11,16,32,0.92)', border: `1px solid ${TV.lineStrong}`, color: TV.text }}>
      <span style={{ fontSize: dp(34), fontWeight: 800, color: TV.live, letterSpacing: '0.04em' }}>{tt('sportGoal')}</span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: dp(22), fontWeight: 600 }}>{`${e.home} ${e.score.home}–${e.score.away} ${e.away}`}</span>
        {goalBody(e) ? <span style={{ fontSize: dp(16), color: TV.muted }}>{goalBody(e)}</span> : null}
      </span>
      {target ? (
        <div {...station(() => { setShown(null); onJump(sourceChannel(target)) })} style={{ padding: `${dp(8)}px ${dp(14)}px`, borderRadius: dp(10), background: TV.text, color: '#0e0f13', fontWeight: 600, cursor: 'pointer' }}>{tt('sportJumpThere')}</div>
      ) : null}
    </div>
  )
}
```

`sourceChannel` (fas 1, `sport-model.ts`) gör en `MatchSource` till en `M3uChannel`, och `rankedSources` (fas 1, `sport-day-model.ts`) ger åsidosättningen först, så "Hoppa dit" väljer samma källa som "Titta".

```tsx
// runtime/sport/sport-goal-mount.tsx
'use client'

import { useEffect, useState } from 'react'
import { requestOpenBrowsePage } from '@/lib/plugin-sdk'
import { tryNativeNotification } from '../reminders'
import { encodeChannelParams } from '../live-tv-shell'
import { Btn, LT } from '../live-tv-ui'
import { useTvText } from '../tv/tv-strings'
import { onGoal, type GoalEvent } from './goal-events'
import { goalAlertWanted, goalBody, goalTitle, matchForGoal, playingChannel } from './goal-alerts'
import { currentResults } from './results-controller'
import { rankedSources } from './sport-day-model'
import { getFollows, getOverrides, getSportSettings } from './sport-store'
import { sourceChannel, type SportMatch } from './sport-model'

/** Målnotis medan appen körs (native och banner), på samma sätt som påminnelserna. */
export function SportGoalMount() {
  const { tt } = useTvText()
  const [banner, setBanner] = useState<{ e: GoalEvent; match: SportMatch } | null>(null)
  useEffect(() => onGoal((e) => {
    const match = matchForGoal(e, currentResults()?.merged() ?? [])
    if (!match || !goalAlertWanted(match, getSportSettings(), getFollows())) return
    if (match.sources.some((s) => s.channelKey === playingChannel())) return
    tryNativeNotification(goalTitle(e, tt), goalBody(e))
    setBanner({ e, match })
  }), [tt])
  useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(() => setBanner(null), 20_000)
    return () => window.clearTimeout(t)
  }, [banner])
  if (!banner) return null
  const source = rankedSources(banner.match, getOverrides())[0]
  return (
    <div role="status" style={{ position: 'fixed', right: 20, bottom: 24, zIndex: 400, maxWidth: 380, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: LT.radiusLg, background: 'rgba(11,16,32,0.96)', border: `1px solid ${LT.line}`, color: LT.text }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{goalTitle(banner.e, tt)}</div>
        {goalBody(banner.e) ? <div style={{ fontSize: 12, color: LT.dim }}>{goalBody(banner.e)}</div> : null}
      </div>
      {source ? (
        <Btn variant="primary" small onClick={() => { setBanner(null); requestOpenBrowsePage({ pageId: 'live-tv-browse', params: { view: 'channel', autoplay: '1', ...encodeChannelParams(sourceChannel(source)) } }) }}>{tt('sportWatch')}</Btn>
      ) : null}
    </div>
  )
}
```

`index.ts`, efter påminnelsernas bootstrap:

```ts
    ctx.registerBootstrap({ id: 'live-tv-sport-goals', Mount: SportGoalMount })
```

`live-tv-player.tsx`, i `LiveTvPlayer` (nära de andra krokarna, före första villkorliga returen):

```tsx
  const playingKey = channelKey(channel)
  const sportLive = useChannelSportLive(playingKey)
  usePollDemand('player', !!sportLive)
  useEffect(() => { setPlayingChannel(playingKey); return () => setPlayingChannel(null) }, [playingKey])
```

och i JSX före `{tvChrome ? <TvPlayerChrome … /> : null}`:

```tsx
      <PlayerGoalOverlay channelKey={playingKey} onJump={(next) => tv?.onSwitchChannel(next)} />
```

- [ ] **Step 4: Kör testerna och se dem gå igenom**

Run: `cd "$PLG" && npx vitest run runtime/sport/goal-alerts.test.ts runtime/sport/tv/player-goal-overlay.test.tsx runtime/sport/results-controller.test.ts runtime/live-tv-player-chrome.test.tsx runtime/tv/tv-shell-player.test.tsx && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (goal-alerts 3, overlay 3, och spelarens befintliga tester är fortfarande gröna).

- [ ] **Step 5: Commit**

```bash
cd "$PLG" && git add runtime/sport/goal-alerts.ts runtime/sport/goal-alerts.test.ts runtime/sport/sport-goal-mount.tsx runtime/sport/tv/player-goal-overlay.tsx runtime/sport/tv/player-goal-overlay.test.tsx runtime/live-tv-player.tsx runtime/index.ts runtime/tv/tv-strings.ts
git commit -m "live-tv sport: GOAL overlay with jump, and goal alerts while the app runs"
```

---

### Task 21: Telefonen får fullt Resultat (ligagrupper, tabell med form och sök i källan)

Jerrys beslut 2026-10-11 löser konflikt 6: telefonen får samma Resultat som TV och skrivbord, och följväljaren på telefonen får fritextsökningen i källan. Allt går genom samma lager som TV:n (`useSportResults`, `ResultsController.standings/loadStandings`, `searchProviderTeams`), så inga nya anrop och ingen ny kvotväg uppstår. Telefonträdet får **aldrig** importera ur `sport/tv/*` (importcykelregeln), så de rena delarna i Task 18 flyttas till `sport/results-model.ts`, och märket ritas med en egen liten `PhoneCrest`.

**Files:**
- Create: `$PLG/runtime/sport/results-model.ts` (rena: `groupResults`, `formLetters`, `FORM_COLOR`, `ResultsFilter`, `ResultGroup`, flyttade ur Task 18)
- Modify: `$PLG/runtime/sport/tv/sport-results.tsx` (Task 18: importerar och återexporterar ur `../results-model`)
- Create: `$PLG/runtime/sport/mobile/sport-results-phone.tsx` (`SportResultsPhone`, `PhoneCrest`)
- Create: `$PLG/runtime/sport/mobile/sport-follow-search-phone.tsx` (`PhoneFollowSearch`)
- Modify (fas 1): `$PLG/runtime/sport/mobile/sport-phone.tsx` (tredje segmentet Resultat, sökningen i följarket), `$PLG/runtime/sport/mobile/sport-phone.test.tsx`
- Modify: `$PLG/runtime/tv/tv-strings.ts` (EN + SV)
- Test: `$PLG/runtime/sport/mobile/sport-results-phone.test.tsx`

**Interfaces:**
- Consumes: Task 14 (`useSportResults` → `{ matches, status, controller }`, `ResultsController.standings(sport, leagueId, season): StandingRow[] | null`, `ResultsController.loadStandings(...)`), Task 15 (`scoreText`, `matchStatusLabel` ur `sport/score-model.ts`, `searchProviderTeams` ur `sport/follow-search.ts`, och punkt 8:s `mergedMatches`/`controller` i `SportPhone`), Task 11 (`foldTeamKey` ur `merge.ts`), Task 13 (`SportSettings.apiKey`, `provider`, `keyCardDismissed`, `SportFollow.providerIds`), Task 16 (`KeyCard`, testid `sport-key-card-tab`), Task 18 (strängarna `sportTabResults`, `sportResultsAll`, `sportResultsLive`, `sportResultsMine`, `sportJumpTo`, `sportTable`, `sportColTeam`, `sportColPlayed`, `sportColPoints`, `sportColForm`, `sportResultsEmpty`, `sportFormW/D/L`), Task 15 (`sportFollowSearch`). Fas 1: `MT`, `ellipsis`, `sectionLabel` (`tv/mobile/mobile-tokens.ts`), `MobileChips`, `MobileSegment`, `MobileSheet` (med `body`), `crestText`, `useFollows`, `isFollowing`, `toggleFollow`, `getFollows`, `mountSport`, `fxMatch`.
- Produces:
  ```ts
  // sport/results-model.ts (inga TV-importer utöver typen TvStringKey)
  export type ResultsFilter = 'all' | 'live' | 'mine'
  export interface ResultGroup { key: string; sport: SportKind; league: string; leagueId: string; season: string; round: number | null; matches: SportMatch[] }
  export function groupResults(matches: SportMatch[], filter: ResultsFilter): { groups: ResultGroup[]; liveCount: number; mineCount: number }
  export function formLetters(form: string | null, tt: TT): Array<{ letter: string; kind: 'W' | 'D' | 'L' }>
  export const FORM_COLOR: Record<'W' | 'D' | 'L', string>
  // sport/mobile/sport-results-phone.tsx
  export function PhoneCrest(props: { name: string; src?: string | null; size?: number }): JSX.Element
  export function SportResultsPhone(props: { matches: SportMatch[]; controller: ResultsController | null; onOpenMatch(m: SportMatch): void; pushLayer: (close: () => void) => () => void }): JSX.Element
  // sport/mobile/sport-follow-search-phone.tsx
  export function PhoneFollowSearch(props: { sport: SportKind }): JSX.Element | null   // null utan nyckel
  ```

Strängar (nya): `sportSearchSubmit` (Search / Sök), `sportFollowSearchEmpty` (No teams found. / Inga lag hittades.). Allt annat finns redan från Task 15, 16 och 18. Inga fjärrkontrollsord (OK, håll OK, ◂ ▸) på telefonen, som fas 1:s test `REMOTE_WORDS` kräver.

- [ ] **Step 1: Skriv de fallerande testerna**

```tsx
// runtime/sport/mobile/sport-results-phone.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportResultsPhone } from './sport-results-phone'
import { PhoneFollowSearch } from './sport-follow-search-phone'
import { getFollows, setSportSettings } from '../sport-store'
import { foldTeamKey } from '../merge'
import { fxMatch } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'

vi.mock('../follow-search', () => ({
  searchProviderTeams: vi.fn(async () => [{ id: '375', name: 'Malmo FF', crest: null, country: 'Sweden' }]),
}))

// Rå källtext för telefonträdet: samma grepp som deleted-desktop-views.test.ts.
const sources = import.meta.glob('./*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

let n = 0
const m = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: `p${++n}`, home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', start: n, stop: n + 1,
  status: 'finished', score: { home: 1, away: 0 }, round: 27, coverage: 'full',
  fixture: { provider: 'api-sports', id: `f${n}`, leagueId: '113', season: '2026' }, ...over,
})
const pushLayer = () => () => {}
const rows = [{ rank: 1, team: { id: '363', name: 'AIK Stockholm', crest: null }, played: 26, points: 58, goalDiff: 25, form: 'WWDWL', group: null }]
const fakeController = () => ({ standings: vi.fn(() => null), loadStandings: vi.fn(async () => rows), subscribe: () => () => {} })

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('Resultat på telefon', () => {
  it('utan nyckel: nyckelkortet; efter "Inte nu": den diskreta raden', () => {
    const { rerender } = render(<SportResultsPhone matches={[]} controller={null} onOpenMatch={vi.fn()} pushLayer={pushLayer} />)
    expect(screen.getByTestId('sport-key-card-tab')).toBeTruthy()
    setSportSettings({ keyCardDismissed: true })
    rerender(<SportResultsPhone matches={[]} controller={null} onOpenMatch={vi.fn()} pushLayer={pushLayer} />)
    expect(screen.getByText('Visa resultat – lägg till nyckel')).toBeTruthy()
  })

  it('med nyckel: ligagrupp med omgång, ställning, filter och HOPPA TILL; tryck öppnar matchen', () => {
    setSportSettings({ apiKey: 'k123' })
    const open = vi.fn()
    const live = m({ status: 'live', minute: 67, score: { home: 2, away: 1 } })
    render(<SportResultsPhone matches={[m(), live, m({ kind: 'tennis', coverage: 'epg' })]} controller={fakeController() as never} onOpenMatch={open} pushLayer={pushLayer} />)
    expect(screen.getByText('Allsvenskan · Omgång 27')).toBeTruthy()
    expect(screen.getByText('HOPPA TILL')).toBeTruthy()
    expect(screen.getAllByTestId('phone-result-score').map((e) => e.textContent)).toEqual(['2–1', '1–0']) // `live` skapades först och har tidigast start
    fireEvent.click(screen.getByTestId('chip-live'))
    expect(screen.getAllByTestId('phone-result-row')).toHaveLength(1)
    fireEvent.click(screen.getAllByTestId('phone-result-row')[0]!)
    expect(open).toHaveBeenCalledWith(live)
  })

  it('Tabell öppnar ett ark med M, P och form på svenska', async () => {
    setSportSettings({ apiKey: 'k123' })
    const controller = fakeController()
    render(<SportResultsPhone matches={[m()]} controller={controller as never} onOpenMatch={vi.fn()} pushLayer={pushLayer} />)
    fireEvent.click(screen.getByTestId('phone-table-football|113'))
    const sheet = await screen.findByTestId('phone-standings-sheet')
    await waitFor(() => expect(within(sheet).getByText('AIK Stockholm')).toBeTruthy())
    expect(within(sheet).getByText('58')).toBeTruthy()
    expect(within(sheet).getByText('26')).toBeTruthy()
    expect(within(sheet).getAllByTestId('phone-form').map((e) => e.textContent).join('')).toBe('VVOVF')
    expect(controller.loadStandings).toHaveBeenCalledWith('football', '113', '2026')
  })

  it('telefonträdet importerar aldrig ur sport/tv (importcykelregeln)', () => {
    const offenders = Object.entries(sources).filter(([file, src]) => !file.includes('.test.') && /from '\.\.\/tv\//.test(src)).map(([file]) => file)
    expect(Object.keys(sources).length).toBeGreaterThan(2)
    expect(offenders).toEqual([])
  })
})

describe('Sök i källan på telefon', () => {
  it('utan nyckel ritas inget sökfält', () => {
    const { container } = render(<PhoneFollowSearch sport="football" />)
    expect(container.textContent).toBe('')
  })

  it('sökningen skickas med Sök, och en träff följs med källans id', async () => {
    setSportSettings({ apiKey: 'k123', provider: 'api-sports' })
    render(<PhoneFollowSearch sport="football" />)
    fireEvent.change(screen.getByTestId('phone-follow-search-input'), { target: { value: 'malmo' } })
    fireEvent.submit(screen.getByTestId('phone-follow-search-input').closest('form')!)
    fireEvent.click(await screen.findByTestId('phone-follow-hit-375'))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: foldTeamKey('Malmo FF'), name: 'Malmo FF', providerIds: { 'api-sports': '375' } }])
  })
})
```

Lägg också ett fall sist i fas 1:s `runtime/sport/mobile/sport-phone.test.tsx` (stubbens språk är `en`):

```tsx
  it('Resultat är ett tredje segment och visar nyckelkortet utan nyckel', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] } })
    fireEvent.click(await screen.findByText('Results'))
    expect(await screen.findByTestId('sport-key-card-tab')).toBeTruthy()
    expect(screen.getByTestId('sport-phone-days')).toBeTruthy() // dagchipsen gäller även Resultat
  })
```

- [ ] **Step 2: Kör testerna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/mobile/sport-results-phone.test.tsx runtime/sport/mobile/sport-phone.test.tsx`
Expected: FAIL med "Failed to resolve import './sport-results-phone'" och, i sport-phone, "Unable to find an element with the text: Results".

- [ ] **Step 3: Flytta de rena delarna ur Task 18 till `results-model.ts`**

```ts
// runtime/sport/results-model.ts
import type { TvStringKey } from '../tv/tv-strings'
import type { SportKind, SportMatch } from './sport-model'

/*
  Resultatens rena delar. De bodde i sport/tv/sport-results.tsx (Task 18), men
  telefonträdet får inte importera ur sport/tv/* (importcykelregeln), så TV och
  telefon delar dem härifrån.
*/

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string
export type ResultsFilter = 'all' | 'live' | 'mine'
export interface ResultGroup { key: string; sport: SportKind; league: string; leagueId: string; season: string; round: number | null; matches: SportMatch[] }

// Matcher med fixtur bär källans status i `status` (live omfattar paus), så klockan behövs inte här.
const isLive = (m: SportMatch) => m.status === 'live'
const isMine = (m: SportMatch) => m.sources.length > 0 && !m.resultOnly

export function groupResults(matches: SportMatch[], filter: ResultsFilter): { groups: ResultGroup[]; liveCount: number; mineCount: number } {
  const eligible = matches.filter((m) => m.coverage === 'full' && m.fixture?.leagueId)
  const shown = eligible.filter((m) => (filter === 'live' ? isLive(m) : filter === 'mine' ? isMine(m) : true))
  const groups = new Map<string, ResultGroup>()
  for (const m of shown) {
    const key = `${m.kind}|${m.fixture!.leagueId}`
    const g = groups.get(key) ?? { key, sport: m.kind, league: m.league, leagueId: m.fixture!.leagueId!, season: m.fixture!.season ?? '', round: m.round ?? null, matches: [] }
    g.matches.push(m)
    groups.set(key, g)
  }
  for (const g of groups.values()) g.matches.sort((a, b) => a.start - b.start)
  return { groups: [...groups.values()], liveCount: eligible.filter(isLive).length, mineCount: eligible.filter(isMine).length }
}

export function formLetters(form: string | null, tt: TT): Array<{ letter: string; kind: 'W' | 'D' | 'L' }> {
  const map = { W: tt('sportFormW'), D: tt('sportFormD'), L: tt('sportFormL') }
  return (form ?? '').toUpperCase().split('').filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L').map((kind) => ({ kind, letter: map[kind] }))
}

export const FORM_COLOR: Record<'W' | 'D' | 'L', string> = { W: '#3cd6a3', D: 'rgba(243,244,248,0.45)', L: '#e0776a' }
```

I `runtime/sport/tv/sport-results.tsx` (Task 18): ta bort definitionerna av `ResultsFilter`, `ResultGroup`, `isLive`, `isMine`, `groupResults`, `formLetters` och `FORM_COLOR`, ta bort `SportKind` ur typimporten om den blir oanvänd, och lägg överst:

```ts
import { FORM_COLOR, formLetters, groupResults, type ResultGroup, type ResultsFilter } from '../results-model'
export { formLetters, groupResults, type ResultGroup, type ResultsFilter } from '../results-model'
```

Task 18:s test (`sport-results.test.tsx`) importerar fortfarande `groupResults` och `formLetters` ur `./sport-results` och ska vara grönt utan ändring.

- [ ] **Step 4: Implementera telefonens Resultat**

```tsx
// runtime/sport/mobile/sport-results-phone.tsx
'use client'

import { useRef, useState } from 'react'
import { getPluginHttpAssetUrl } from '@/lib/plugin-sdk'
import { station } from '../../tv/tv-ui'
import { useTvText, type TvStringKey } from '../../tv/tv-strings'
import { MT, ellipsis, sectionLabel } from '../../tv/mobile/mobile-tokens'
import { MobileChips } from '../../tv/mobile/mobile-chips'
import { MobileSheet } from '../../tv/mobile/mobile-sheet'
import { KeyCard } from '../key-card'
import { FORM_COLOR, formLetters, groupResults, type ResultGroup, type ResultsFilter } from '../results-model'
import { matchStatusLabel, scoreText } from '../score-model'
import { crestText, type SportMatch } from '../sport-model'
import { useSportSettings } from '../sport-store'
import type { ResultsController } from '../results-controller'
import type { StandingRow } from '../provider'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

/** Lagets märke på telefon: källans bild via appens logocache, annars initialerna (som fas 1:s Crest, utan TV-skalning). */
export function PhoneCrest({ name, src, size = 22 }: { name: string; src?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  const url = src && !broken ? getPluginHttpAssetUrl('/api/m3u-logo', src) : null
  if (url) return <img data-crest="" src={url} alt="" width={size} height={size} onError={() => setBroken(true)} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 999, background: MT.s12, color: MT.muted, fontSize: Math.round(size * 0.42), fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {crestText(name)}
    </span>
  )
}

function PhoneStandings({ rows, tt }: { rows: StandingRow[]; tt: TT }) {
  const cell = { padding: '8px 6px', fontSize: 14 } as const
  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '4px 14px 12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: MT.text }}>
        <thead>
          <tr style={{ color: MT.dim, textAlign: 'left', fontSize: 12 }}>
            <th style={cell}>#</th><th style={cell}>{tt('sportColTeam')}</th><th style={cell}>{tt('sportColPlayed')}</th><th style={cell}>{tt('sportColPoints')}</th><th style={cell}>{tt('sportColForm')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.group ?? ''}-${r.rank}-${r.team.id}`} style={{ borderTop: `1px solid ${MT.line08}` }}>
              <td style={cell}>{r.rank}</td>
              <td style={{ ...cell, maxWidth: 150 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}><PhoneCrest name={r.team.name} src={r.team.crest} size={18} /><span style={ellipsis}>{r.team.name}</span></span></td>
              <td style={cell}>{r.played}</td>
              <td style={{ ...cell, fontWeight: 700 }}>{r.points}</td>
              <td style={cell}>
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {formLetters(r.form, tt).slice(-5).map((f, i) => (
                    <span key={i} data-testid="phone-form" style={{ width: 16, height: 16, borderRadius: 4, background: FORM_COLOR[f.kind], color: '#0e0f13', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{f.letter}</span>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SportResultsPhone({ matches, controller, onOpenMatch, pushLayer }: { matches: SportMatch[]; controller: ResultsController | null; onOpenMatch(m: SportMatch): void; pushLayer: (close: () => void) => () => void }) {
  const { tt } = useTvText()
  const settings = useSportSettings()
  const [filter, setFilter] = useState<ResultsFilter>('all')
  const [showCard, setShowCard] = useState(false)
  const [table, setTable] = useState<{ group: ResultGroup; rows: StandingRow[] | null } | null>(null)
  const sections = useRef(new Map<string, HTMLElement>())

  if (!settings.apiKey || !controller) {
    if (settings.keyCardDismissed && !showCard) {
      return <div data-testid="phone-results-add-key" {...station(() => setShowCard(true))} style={{ padding: '16px 4px', fontSize: 15, color: MT.muted, cursor: 'pointer' }}>{tt('sportKeyAddRow')}</div>
    }
    return <KeyCard variant="tab" onDone={() => setShowCard(false)} pushLayer={pushLayer} />
  }

  const { groups, liveCount, mineCount } = groupResults(matches, filter)
  const openTable = async (g: ResultGroup) => {
    const cached = controller.standings(g.sport, g.leagueId, g.season)
    setTable({ group: g, rows: cached })
    if (cached) return
    const rows = await controller.loadStandings(g.sport, g.leagueId, g.season)
    setTable((t) => (t && t.group.key === g.key ? { group: g, rows: rows ?? [] } : t))
  }

  return (
    <div data-testid="phone-results" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <MobileChips<ResultsFilter>
        testId="phone-results-filter"
        items={[
          { key: 'all', label: tt('sportResultsAll'), id: 'all' },
          { key: 'live', label: `${tt('sportResultsLive')} (${liveCount})`, id: 'live' },
          { key: 'mine', label: tt('sportResultsMine', { n: mineCount }), id: 'mine' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {groups.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={sectionLabel}>{tt('sportJumpTo')}</span>
          <MobileChips<string>
            testId="phone-results-jump"
            items={groups.map((g) => ({ key: g.key, label: g.league, id: `jump-${g.key}` }))}
            value=""
            onChange={(key) => sections.current.get(key)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
          />
        </div>
      ) : null}
      {groups.length === 0 ? <div style={{ padding: '24px 4px', fontSize: 15, color: MT.muted }}>{tt('sportResultsEmpty')}</div> : null}
      {groups.map((g) => (
        <section key={g.key} ref={(el) => { if (el) sections.current.set(g.key, el); else sections.current.delete(g.key) }} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, scrollMarginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, fontSize: 17, fontWeight: 600, ...ellipsis }}>{g.round != null ? `${g.league} · ${tt('sportRound', { n: g.round })}` : g.league}</div>
            <div data-testid={`phone-table-${g.key}`} {...station(() => void openTable(g))} style={{ minHeight: MT.HIT, padding: '0 14px', borderRadius: 12, background: MT.s08, border: `1px solid ${MT.line08}`, display: 'inline-flex', alignItems: 'center', fontSize: 14, color: MT.muted70, cursor: 'pointer', flexShrink: 0 }}>{tt('sportTable')}</div>
          </div>
          {g.matches.map((m) => (
            <div key={m.id} data-testid="phone-result-row" {...station(() => onOpenMatch(m))} style={{ minHeight: 56, display: 'grid', gridTemplateColumns: '46px minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 14, background: MT.s07, border: `1px solid ${MT.line08}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: m.status === 'live' ? MT.live : MT.muted }}>{matchStatusLabel(m, tt) ?? ''}</span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minWidth: 0 }}><span style={{ fontSize: 14, ...ellipsis }}>{m.home}</span><PhoneCrest name={m.home ?? ''} src={m.homeCrest} /></span>
              <span data-testid="phone-result-score" style={{ fontSize: 16, fontWeight: 700, minWidth: 38, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{scoreText(m) ?? '–'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}><PhoneCrest name={m.away ?? ''} src={m.awayCrest} /><span style={{ fontSize: 14, ...ellipsis }}>{m.away}</span></span>
            </div>
          ))}
        </section>
      ))}
      {table ? (
        <MobileSheet
          testId="phone-standings-sheet"
          title={`${table.group.league} · ${tt('sportTable')}`}
          body={table.rows === null ? <div style={{ padding: 16, color: MT.muted }}>{tt('sportLoading')}</div> : <PhoneStandings rows={table.rows} tt={tt} />}
          items={[]}
          onClose={() => setTable(null)}
          pushLayer={pushLayer}
        />
      ) : null}
    </div>
  )
}
```

`KeyCard` är samma komponent som telefonens inställningar redan ritar (Task 17, `SportKeySettingsTv phone`), så ingen ny variant behövs. Ser kortet för stort ut på telefonbredd i Step 7 är det en justering i `key-card.tsx`, inte en egen telefonkopia.

- [ ] **Step 5: Implementera sökningen i följarket**

```tsx
// runtime/sport/mobile/sport-follow-search-phone.tsx
'use client'

import { useState } from 'react'
import { station } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { searchProviderTeams } from '../follow-search'
import { foldTeamKey } from '../merge'
import { isFollowing, toggleFollow, useFollows, useSportSettings } from '../sport-store'
import type { TeamHit } from '../provider'
import type { SportKind } from '../sport-model'
import { PhoneCrest } from './sport-results-phone'

/**
 * Följer på telefon: fritext mot källan, som FollowPicker på TV (Task 15 punkt 5).
 * Frågan SKICKAS (Sök eller Enter), aldrig per tecken: varje sökning är ett
 * anrop av typen `search` och skyddas av reserven i budget.ts.
 */
export function PhoneFollowSearch({ sport }: { sport: SportKind }) {
  const { tt } = useTvText()
  const settings = useSportSettings()
  const follows = useFollows()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<TeamHit[] | null>(null)
  const [busy, setBusy] = useState(false)
  if (!settings.apiKey) return null
  const tooShort = q.trim().length < 3
  const submit = async () => {
    if (busy || tooShort) return
    setBusy(true)
    try {
      setHits(await searchProviderTeams(sport, q))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div data-testid="phone-follow-search" style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: `1px solid ${MT.line08}` }}>
      <form onSubmit={(e) => { e.preventDefault(); void submit() }} style={{ display: 'flex', gap: 8 }}>
        {/* 16 px: mindre text zoomar in sidan på iOS när fältet får fokus. */}
        <input data-testid="phone-follow-search-input" type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tt('sportFollowSearch')} style={{ flex: 1, minWidth: 0, height: MT.HIT, borderRadius: 12, border: `1px solid ${MT.line14}`, background: MT.s07, color: MT.text, padding: '0 12px', fontSize: 16, fontFamily: MT.font }} />
        <button type="submit" data-testid="phone-follow-search-go" disabled={busy || tooShort} style={{ height: MT.HIT, padding: '0 16px', borderRadius: 12, border: 'none', background: MT.acc, color: MT.onAcc, fontSize: 15, fontWeight: 600, fontFamily: MT.font, opacity: busy || tooShort ? 0.5 : 1 }}>{tt('sportSearchSubmit')}</button>
      </form>
      {hits?.map((hit) => {
        const follow = { sport, kind: 'team' as const, key: foldTeamKey(hit.name), name: hit.name, providerIds: { [settings.provider]: hit.id } }
        const on = isFollowing(follows, follow)
        return (
          <div key={hit.id} data-testid={`phone-follow-hit-${hit.id}`} {...station(() => toggleFollow(follow))} style={{ minHeight: 48, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <PhoneCrest name={hit.name} src={hit.crest} size={26} />
            <span style={{ flex: 1, fontSize: 15, ...ellipsis }}>{hit.name}</span>
            {hit.country ? <span style={{ fontSize: 13, color: MT.muted, flexShrink: 0 }}>{hit.country}</span> : null}
            <span style={{ color: on ? '#fbbf24' : MT.dim, flexShrink: 0 }}>{on ? '★' : '☆'}</span>
          </div>
        )
      })}
      {hits && hits.length === 0 ? <div style={{ fontSize: 14, color: MT.muted }}>{tt('sportFollowSearchEmpty')}</div> : null}
    </div>
  )
}
```

Lägg strängarna i `tv/tv-strings.ts`: i `EN` `sportSearchSubmit: 'Search'`, `sportFollowSearchEmpty: 'No teams found.'`, i `SV` `sportSearchSubmit: 'Sök'`, `sportFollowSearchEmpty: 'Inga lag hittades.'`.

- [ ] **Step 6: Koppla in i `SportPhone`** (fas 1, efter Task 15 punkt 8)

I `runtime/sport/mobile/sport-phone.tsx`:
1. Importer: `import { SportResultsPhone } from './sport-results-phone'` och `import { PhoneFollowSearch } from './sport-follow-search-phone'`.
2. `const [tab, setTab] = useState<'foryou' | 'results' | 'follows'>('foryou')`.
3. Segmentet får tre val:
   ```tsx
   <MobileSegment testId="sport-phone-tabs" options={[{ key: 'foryou', label: tt('sportTabForYou') }, { key: 'results', label: tt('sportTabResults') }, { key: 'follows', label: tt('sportTabFollows') }]} value={tab} onChange={setTab} />
   ```
4. Grenen `{tab === 'foryou' ? (<>…</>) : (<PhoneFollows … />)}` ersätts med:
   ```tsx
   {tab !== 'follows' ? (
     <MobileChips<DayOffset> testId="sport-phone-days" items={([-1, 0, 1] as const).map((o) => ({ key: o, label: dayLabel(o), id: `day-${o}` }))} value={offset} onChange={setOffset} emphasisKey={0} />
   ) : null}
   {tab === 'foryou' ? (
     <>
       {/* fas 1:s sportchips, notisen och de tre PhoneSection, oförändrade */}
     </>
   ) : tab === 'results' ? (
     <SportResultsPhone matches={mergedMatches} controller={controller} onOpenMatch={openMatch} pushLayer={nav.pushLayer} />
   ) : (
     <PhoneFollows ctx={ctx} days={[todayDay.data, tomorrowDay.data]} />
   )}
   ```
   Dagchipsen flyttas alltså ut ur För dig-fragmentet. `mergedMatches` och `controller` är de som Task 15 punkt 8 la till (`useSportResults({ day: shiftDay(today, offset), epg: selected.data?.matches ?? NO_MATCHES })`), så Resultat följer vald dag precis som TV:ns flik.
5. Följarket (`sport-phone-follow-sheet`) får `body={<PhoneFollowSearch sport={filter === 'all' ? 'football' : filter} />}`. Kandidatlistan (`items`) är fas 1:s och oförändrad.

Matchens ark (`sport-phone-sheet`) öppnas från Resultat med samma `openMatch`. En "Bara resultat"-match har inga källor och får därför inga Titta-rader, bara följ-raderna.

- [ ] **Step 7: Kör testerna och typkontrollen**

Run: `cd "$PLG" && npx vitest run runtime/sport/mobile runtime/sport/tv/sport-results.test.tsx && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (sport-results-phone 6 tester, sport-phone 5 tester, sport-results oförändrat 5) och inga nya tsc-fel.

- [ ] **Step 8: Commit**

```bash
cd "$PLG" && git add runtime/sport/results-model.ts runtime/sport/tv/sport-results.tsx runtime/sport/mobile/sport-results-phone.tsx runtime/sport/mobile/sport-follow-search-phone.tsx runtime/sport/mobile/sport-results-phone.test.tsx runtime/sport/mobile/sport-phone.tsx runtime/sport/mobile/sport-phone.test.tsx runtime/tv/tv-strings.ts
git commit -m "live-tv sport: full Results tab and team search on phone"
```

---

### Task 22: Bakgrundsbild i Sport (Automatisk / Egen bild / Av)

Inställningen "Bakgrund i Sport" har tre lägen, och standard är Automatisk. **Automatisk** visar arenan för hero-matchen. Med API-Sports kommer bilden ur fixturens `venue.id` (`https://media.api-sports.io/football/venues/{id}.png`, finns för fotboll). Det är en bild på källans CDN och kostar inget anrop. Med TheSportsDB kommer den ur hemmalagets `strStadiumThumb`, och reserven är lagets `strFanart1`. Det kostar ett `lookupteam`-anrop per lag, som går genom kvothanteraren och cachas 30 dygn. Därefter kommer en neutral gradient per sport. Utan nyckel blir det alltid gradienten. **Egen bild** återanvänder appens befintliga egna bakgrund (`lib/home-background-settings.ts`: `home_background_urls`, profilbunden, URL:er eller uppladdade data-URL:er från Inställningar > Startsida) via ett nytt läs-seam i SDK:t, och den kan också vara en inklistrad bildlänk. **Av** visar ingen bakgrund. Bilden ligger bakom hela Sport-vyn med en mörk gradient från vänster till höger, så att texten går att läsa. Det gäller TV, skrivbord och telefon.

Varje bild från källorna går genom appens nya bildcache `GET /api/live-tv/sport/image?url=`. Den hämtar varje URL **en** gång, även när två klienter frågar samtidigt, och sparar den för alltid under `live-tv-sport/img/`. Bara källornas värdar är tillåtna. Egna länkar och startsidans bilder används som de är (som startsidan gör), eftersom de kan ligga på vilken värd som helst.

**Files:**
- Create: `$APP/src-tauri/src/live_tv_sport_image.rs`
- Modify: `$APP/src-tauri/src/lib.rs` (`pub mod live_tv_sport_image;` efter `pub mod live_tv_sport_fetch;`), `$APP/src-tauri/src/axum_server.rs` (rutten efter `/api/live-tv/sport/link`)
- Modify: `$APP/src-tauri/src/live_tv_sport_fetch.rs` (Task 1:s vitlista: `lookupteam.php` för TheSportsDB v1, plus ett test)
- Modify: `$APP/lib/plugin-sdk.ts` (läs-seam: `getHomeBackgroundUrls`, `onHomeBackgroundChanged`)
- Modify: `$PLG/src/__test-stubs__/plugin-sdk.ts` (samma två och `__setHomeBackgroundUrlsForTests`)
- Modify: `$PLG/runtime/sport/provider.ts` (`TeamArt`, `Fixture.venueImage?`, `SportsProvider.teamArt`), `$PLG/runtime/sport/api-sports.ts`, `$PLG/runtime/sport/thesportsdb.ts`, `$PLG/runtime/sport/sport-model.ts` (`SportMatch.venueImage?`), `$PLG/runtime/sport/merge.ts` (`fromFixture`)
- Create: `$PLG/runtime/sport/__fixtures__/thesportsdb/lookupteam.json`
- Modify (fas 1): `$PLG/runtime/sport/sport-store.ts` (`backdrop`, `backdropCustom`) och `$PLG/runtime/sport/sport-store.test.ts`
- Create: `$PLG/runtime/sport/backdrop.ts` (ren val-logik och krokar), `$PLG/runtime/sport/sport-backdrop.tsx` (lagret), `$PLG/runtime/sport/sport-backdrop-settings.tsx` (inställningen)
- Modify (fas 1): `$PLG/runtime/sport/tv/sport-shell.tsx`, `$PLG/runtime/sport/mobile/sport-phone.tsx`
- Modify: `$PLG/runtime/live-tv-settings-section.tsx`, `$PLG/runtime/tv/tv-settings.tsx`, `$PLG/runtime/tv/mobile/settings-phone.tsx` (samma tre ställen som Task 17), `$PLG/runtime/tv/tv-strings.ts`
- Test: `$PLG/runtime/sport/backdrop.test.ts`, `$PLG/runtime/sport/sport-backdrop.test.tsx`, `$PLG/runtime/sport/sport-backdrop-settings.test.tsx`, `$PLG/runtime/sport/sport-store.test.ts`, Rust `mod tests` i `live_tv_sport_image.rs` och `live_tv_sport_fetch.rs`

**Interfaces:**
- Consumes: Task 1 (`upstream`, `Provider`, `Bases`), Task 2 (`sport_dir(state) -> Option<PathBuf>`), Task 3 (rutten `/api/live-tv/sport/link`), Task 5 (`Fixture`, `ProviderCall`), Task 6 (`apiSports`, `num` och `footballFixture` i `api-sports.ts`), Task 7 (`theSportsDb`, `arr`, `str`, `enc` i `thesportsdb.ts`), Task 8 (`currentBudget()`, `Budget.run(kind, sport, call)`, `Budget.provider`), Task 11 (`fromFixture`, `mergeLinked`, `SportMatch.fixture`, `SportMatch.homeIds`), Task 13 (`SportSettings.apiKey`), Task 15 (`useSportResults` i skalen, `mergedDay`), Task 17 (inställningsytorna). Fas 1: `featuredMatch(matches, follows, now)`, `visibleMatches`, `useSportSettings`, `setSportSettings`, `LtSection`, `LtRows`, `LtBtn`, `LtNote`, `LtTextRow`, `hostOf`, `Row`, `Heading`, `useTextPrompt`, `mountSport`, `fxMatch`. Appen: `getHomeBackgroundUrls(): string[]`, `onHomeBackgroundChanged(listener): () => void` (`lib/home-background-settings.ts`).
- Produces:
  - HTTP `GET /api/live-tv/sport/image?url=<https-URL>` → bildens bytes med källans `content-type` (200), 400 felaktig URL, 403 värd utanför vitlistan, 502 uppströmsfel eller inte en bild (cachas inte), 503 ingen lagring. Rust: `pub fn host_allowed(url: &url::Url, extra_host: Option<&str>) -> bool`, `pub enum ImageError { BadRequest, Forbidden, Upstream }`, `pub async fn image_inner(dir: &Path, raw: &str, extra_host: Option<&str>) -> Result<(String, Vec<u8>), ImageError>`, `pub async fn image_handler(...)`.
  - SDK: `getHomeBackgroundUrls`, `onHomeBackgroundChanged` (bara läsning; appens Inställningar > Startsida äger skrivningen).
  - `provider.ts`: `export interface TeamArt { stadium: string | null; fanart: string | null }`, `Fixture.venueImage?: string | null`, `SportsProvider.teamArt(sport: SportKind, teamId: string): ProviderCall<TeamArt | null> | null` (`null` = ingen sådan uppslagning, inget anrop).
  - `api-sports.ts`: `export const API_SPORTS_MEDIA = 'https://media.api-sports.io'`, `export function venueImageUrl(id: unknown): string | null`.
  - `sport-model.ts`: `SportMatch.venueImage?: string | null`.
  - `sport-store.ts`: `export type SportBackdropMode = 'auto' | 'custom' | 'off'`, `export type SportBackdropCustom = { from: 'home'; index: number } | { from: 'url'; url: string }`, `SportSettings.backdrop: SportBackdropMode` (standard `'auto'`), `SportSettings.backdropCustom: SportBackdropCustom | null`.
  - `backdrop.ts`:
    ```ts
    export type BackdropChoice = { kind: 'none' } | { kind: 'image'; url: string; from: 'venue' | 'stadium' | 'fanart' | 'custom' } | { kind: 'gradient'; sport: SportKind }
    export interface BackdropInput { mode: SportBackdropMode; hasKey: boolean; hero: Pick<SportMatch, 'kind' | 'venueImage'> | null; art: TeamArt | null; custom: string | null; broken?: ReadonlySet<string> }
    export const SPORT_GRADIENTS: Record<SportKind, string>
    export const BACKDROP_SCRIM: string; export const BACKDROP_SCRIM_PHONE: string
    export function chooseSportBackdrop(i: BackdropInput): BackdropChoice
    export function resolveCustomBackdrop(c: SportBackdropCustom | null, homeUrls: string[]): string | null
    export function backdropSrc(c: Extract<BackdropChoice, { kind: 'image' }>): string | null
    export function useHomeBackgrounds(): string[]
    export function useHeroTeamArt(hero: SportMatch | null): TeamArt | null
    export function useSportBackdrop(hero: SportMatch | null): { choice: BackdropChoice; onBroken(url: string): void }
    export function __resetBackdropForTests(): void
    ```
  - `sport-backdrop.tsx`: `export function SportBackdropLayer(props: { choice: BackdropChoice; phone: boolean; onBroken(url: string): void }): JSX.Element | null`.
  - `sport-backdrop-settings.tsx`: `export function SportBackdropSettingsDesktop(): JSX.Element`, `export function SportBackdropSettingsTv(props: { phone?: boolean; pushLayer?: (close: () => void) => () => void }): JSX.Element`.

Strängar (EN / SV): `sportBackdropTitle` (Background in Sport / Bakgrund i Sport), `sportBackdropHint` (Automatic shows the stadium of the featured match. / Automatisk visar arenan för den utvalda matchen.), `sportBackdropAuto` (Automatic / Automatisk), `sportBackdropCustom` (Custom image / Egen bild), `sportBackdropOff` (Off / Av), `sportBackdropFromHome` (Home screen image / Startsidans bild), `sportBackdropHomeN` (Image {n} of {total} / Bild {n} av {total}), `sportBackdropNone` (None chosen / Ingen vald), `sportBackdropNoHome` (Add your own images under Settings > Home, or paste a link. / Lägg till egna bilder under Inställningar > Startsida, eller klistra in en länk.), `sportBackdropNoHomeShort` (None / Inga), `sportBackdropLink` (Image link / Bildlänk), `sportBackdropUse` (Use / Använd).

- [ ] **Step 1: Skriv de fallerande Rust-testerna**

Längst ned i den nya filen `$APP/src-tauri/src/live_tv_sport_image.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    const PNG: [u8; 4] = [137, 80, 78, 71];

    fn host_of(mock: &MockServer) -> String {
        mock.uri().trim_start_matches("http://").to_string()
    }

    #[test]
    fn only_the_sources_https_hosts_are_allowed() {
        let ok = |u: &str| host_allowed(&url::Url::parse(u).unwrap(), None);
        assert!(ok("https://media.api-sports.io/football/venues/1460.png"));
        assert!(ok("https://r2.thesportsdb.com/images/media/team/stadium/malmo.jpg"));
        assert!(ok("https://www.thesportsdb.com/images/media/team/fanart/malmo1.jpg"));
        assert!(!ok("http://media.api-sports.io/football/venues/1460.png"), "bara https");
        assert!(!ok("https://evil.example/x.png"));
        assert!(!ok("https://media.api-sports.io.evil.example/x.png"));
    }

    #[tokio::test]
    async fn two_clients_fetch_a_venue_image_once_and_it_stays_on_disk() {
        let mock = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/football/venues/1460.png"))
            .respond_with(ResponseTemplate::new(200).insert_header("content-type", "image/png").set_body_bytes(PNG.to_vec()))
            .expect(1)
            .mount(&mock)
            .await;
        let dir = tempfile::tempdir().unwrap();
        let url = format!("{}/football/venues/1460.png", mock.uri());
        let host = host_of(&mock);
        let (a, b) = tokio::join!(image_inner(dir.path(), &url, Some(&host)), image_inner(dir.path(), &url, Some(&host)));
        assert_eq!(a.ok().unwrap(), ("image/png".to_string(), PNG.to_vec()));
        assert_eq!(b.ok().unwrap(), ("image/png".to_string(), PNG.to_vec()));
        // Tredje gången: från disk. `expect(1)` kontrolleras när mocken släpps.
        assert!(image_inner(dir.path(), &url, Some(&host)).await.is_ok());
        assert!(dir.path().join("img").read_dir().unwrap().count() >= 2);
    }

    #[tokio::test]
    async fn non_image_and_upstream_errors_are_never_cached() {
        let mock = MockServer::start().await;
        Mock::given(method("GET")).and(path("/html.png"))
            .respond_with(ResponseTemplate::new(200).insert_header("content-type", "text/html").set_body_string("<html>"))
            .mount(&mock).await;
        Mock::given(method("GET")).and(path("/missing.png")).respond_with(ResponseTemplate::new(404)).mount(&mock).await;
        let dir = tempfile::tempdir().unwrap();
        let host = host_of(&mock);
        assert!(matches!(image_inner(dir.path(), &format!("{}/html.png", mock.uri()), Some(&host)).await, Err(ImageError::Upstream)));
        assert!(matches!(image_inner(dir.path(), &format!("{}/missing.png", mock.uri()), Some(&host)).await, Err(ImageError::Upstream)));
        assert!(!dir.path().join("img").exists() || dir.path().join("img").read_dir().unwrap().count() == 0);
    }

    #[tokio::test]
    async fn forbidden_host_and_bad_url_never_reach_the_network() {
        let dir = tempfile::tempdir().unwrap();
        assert!(matches!(image_inner(dir.path(), "https://evil.example/x.png", None).await, Err(ImageError::Forbidden)));
        assert!(matches!(image_inner(dir.path(), "inte en url", None).await, Err(ImageError::BadRequest)));
    }
}
```

och i `live_tv_sport_fetch.rs` (Task 1:s `mod tests`):

```rust
    #[test]
    fn thesportsdb_lookupteam_is_allowed_for_the_sport_backdrop() {
        let up = upstream(Provider::TheSportsDb, "football", "/v1/lookupteam.php?id=134001", "9999", &bases()).unwrap();
        assert_eq!(up.url, "https://www.thesportsdb.com/api/v1/json/9999/lookupteam.php?id=134001");
        assert_eq!(up.bucket, "all");
    }
```

- [ ] **Step 2: Kör Rust-testerna och se dem falla**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_image live_tv_sport_fetch::tests::thesportsdb_lookupteam`
Expected: kompileringsfel ("cannot find function `image_inner`"), sedan, när modulen finns, FAIL för `thesportsdb_lookupteam_is_allowed_for_the_sport_backdrop` (`called Option::unwrap() on a None value`). Kör de två filtren var för sig om cargo bara tar ett filter: `cargo test --lib live_tv_sport_image` och `cargo test --lib thesportsdb_lookupteam`.

- [ ] **Step 3: Implementera bildcachen och vitlistan**

Ovanför testmodulen i `live_tv_sport_image.rs`:

```rust
//! Bildcachen för Sports bakgrund: arenabilder och lagens fanart.
//!
//! Bilderna kostar inga API-anrop hos källan, men de ska ändå hämtas EN gång
//! per URL. De sparas för alltid under `live-tv-sport/img/` (arenor byter inte
//! bild), och två klienter som frågar samtidigt (TV:n och telefonen mot samma
//! värd) väntar på samma hämtning. `/api/m3u-logo` duger inte: den skalar ned
//! till 256×128.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::extract::{Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use once_cell::sync::Lazy;
use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::axum_server::AxumState;

pub const MAX_IMAGE_BYTES: usize = 8 * 1024 * 1024;
const ALLOWED_HOSTS: &[&str] = &["media.api-sports.io", "r2.thesportsdb.com", "www.thesportsdb.com"];

static CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder().timeout(Duration::from_secs(20)).build().expect("reqwest-klient")
});
static INFLIGHT: Lazy<std::sync::Mutex<HashMap<String, Arc<tokio::sync::Mutex<()>>>>> = Lazy::new(Default::default);

#[derive(Debug)]
pub enum ImageError {
    BadRequest,
    Forbidden,
    Upstream,
}

/// Källornas värdar över https. `extra_host` ("127.0.0.1:port") finns bara för testernas wiremock.
pub fn host_allowed(url: &url::Url, extra_host: Option<&str>) -> bool {
    let Some(host) = url.host_str() else { return false };
    let with_port = match url.port() {
        Some(p) => format!("{host}:{p}"),
        None => host.to_string(),
    };
    if extra_host.is_some_and(|h| h == with_port) {
        return true;
    }
    url.scheme() == "https" && url.port().is_none() && ALLOWED_HOSTS.contains(&host)
}

fn image_paths(dir: &Path, url: &str) -> (PathBuf, PathBuf) {
    let hash = format!("{:x}", Sha256::digest(url.as_bytes()));
    let base = dir.join("img");
    (base.join(format!("{hash}.bin")), base.join(format!("{hash}.type")))
}

/// En träff kräver typfilen, som skrivs SIST: en avbruten skrivning blir aldrig en halv träff.
fn read_hit(bin: &Path, ty: &Path) -> Option<(String, Vec<u8>)> {
    let content_type = std::fs::read_to_string(ty).ok()?;
    let bytes = std::fs::read(bin).ok()?;
    (!bytes.is_empty()).then_some((content_type, bytes))
}

fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let tmp = PathBuf::from(format!("{}.tmp-{}", path.display(), std::process::id()));
    std::fs::write(&tmp, bytes)?;
    std::fs::rename(&tmp, path).inspect_err(|_| {
        let _ = std::fs::remove_file(&tmp);
    })
}

fn write_hit(bin: &Path, ty: &Path, content_type: &str, bytes: &[u8]) {
    let Some(parent) = bin.parent() else { return };
    if std::fs::create_dir_all(parent).is_err() {
        return;
    }
    if write_atomic(bin, bytes).is_ok() {
        let _ = write_atomic(ty, content_type.as_bytes());
    }
}

async fn fetch_and_store(url: &url::Url, bin: &Path, ty: &Path) -> Result<(String, Vec<u8>), ImageError> {
    let res = CLIENT.get(url.clone()).send().await.map_err(|_| ImageError::Upstream)?;
    if !res.status().is_success() {
        return Err(ImageError::Upstream);
    }
    let content_type = res
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(';').next())
        .map(|v| v.trim().to_ascii_lowercase())
        .unwrap_or_default();
    if !content_type.starts_with("image/") {
        return Err(ImageError::Upstream);
    }
    let bytes = res.bytes().await.map_err(|_| ImageError::Upstream)?;
    if bytes.is_empty() || bytes.len() > MAX_IMAGE_BYTES {
        return Err(ImageError::Upstream);
    }
    write_hit(bin, ty, &content_type, &bytes);
    Ok((content_type, bytes.to_vec()))
}

pub async fn image_inner(dir: &Path, raw: &str, extra_host: Option<&str>) -> Result<(String, Vec<u8>), ImageError> {
    let url = url::Url::parse(raw.trim()).map_err(|_| ImageError::BadRequest)?;
    if !host_allowed(&url, extra_host) {
        return Err(ImageError::Forbidden);
    }
    let key = url.as_str().to_string();
    let (bin, ty) = image_paths(dir, &key);
    if let Some(hit) = read_hit(&bin, &ty) {
        return Ok(hit);
    }
    let lock = INFLIGHT.lock().unwrap().entry(key.clone()).or_default().clone();
    let result = {
        let _guard = lock.lock().await;
        // Den som väntade på en annan klients hämtning läser dess resultat från disk.
        match read_hit(&bin, &ty) {
            Some(hit) => Ok(hit),
            None => fetch_and_store(&url, &bin, &ty).await,
        }
    };
    INFLIGHT.lock().unwrap().remove(&key);
    result
}

#[derive(Debug, Deserialize)]
pub struct ImageQuery {
    pub url: Option<String>,
}

pub async fn image_handler(State(state): State<Arc<AxumState>>, Query(q): Query<ImageQuery>) -> Response {
    let Some(dir) = crate::live_tv_sport_fetch::sport_dir(&state) else {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    };
    let Some(raw) = q.url.filter(|u| !u.trim().is_empty()) else {
        return StatusCode::BAD_REQUEST.into_response();
    };
    match image_inner(&dir, &raw, None).await {
        Ok((content_type, bytes)) => (
            [(header::CONTENT_TYPE, content_type), (header::CACHE_CONTROL, "public, max-age=2592000".to_string())],
            Body::from(bytes),
        )
            .into_response(),
        Err(ImageError::BadRequest) => StatusCode::BAD_REQUEST.into_response(),
        Err(ImageError::Forbidden) => StatusCode::FORBIDDEN.into_response(),
        Err(ImageError::Upstream) => StatusCode::BAD_GATEWAY.into_response(),
    }
}
```

I `lib.rs`: `pub mod live_tv_sport_image;` efter `pub mod live_tv_sport_fetch;`. I `axum_server.rs`, direkt efter raden med `/api/live-tv/sport/link` (Task 3):

```rust
        .route("/api/live-tv/sport/image", get(crate::live_tv_sport_image::image_handler))
```

I `live_tv_sport_fetch.rs` (Task 1:s `upstream`), TheSportsDB-grenen: `["v1", file] => matches!(*file, "eventsday.php" | "lookuptable.php" | "searchteams.php" | "lookupteam.php"),`.

Testerna i `live_tv_sport_image.rs` använder `tokio::join!` med `#[tokio::test]` (en tråd), så de två anropen turas om vid `await`. Den andra väntar på låset och läser sedan från disk, och därför ger `expect(1)` beviset.

- [ ] **Step 4: Läs-seam för appens egna bakgrund i SDK:t**

I `$APP/lib/plugin-sdk.ts`, efter blocket med `getPluginHttpAssetUrl`:

```ts
/**
 * Appens EGNA BAKGRUND (Inställningar > Startsida), bara läsning. Live TV:s
 * Sport erbjuder samma bilder som "Egen bild" i stället för en egen
 * uppladdning: uppladdade bilder är data-URL:er, och en kopia i pluginets
 * synkade lagring hade fyllt Androids localStorage (10 MiB-taket).
 */
export { getHomeBackgroundUrls, onHomeBackgroundChanged } from './home-background-settings'
```

I `$PLG/src/__test-stubs__/plugin-sdk.ts`:

```ts
let homeBackgrounds: string[] = []
const homeBackgroundListeners = new Set<() => void>()
export function getHomeBackgroundUrls(): string[] {
  return homeBackgrounds
}
export function onHomeBackgroundChanged(listener: () => void): () => void {
  homeBackgroundListeners.add(listener)
  return () => { homeBackgroundListeners.delete(listener) }
}
export function __setHomeBackgroundUrlsForTests(urls: string[]): void {
  homeBackgrounds = urls
  for (const listener of homeBackgroundListeners) listener()
}
```

och i stubbens `__resetPluginStorageForTests` läggs `homeBackgrounds = []`.

- [ ] **Step 5: Kör Rust-testerna och appens typkontroll, och committa i APP**

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport_image && cargo test --lib thesportsdb_lookupteam && cargo build`
Expected: PASS (live_tv_sport_image 4 tester, lookupteam 1) och ett grönt bygge.

Run: `cd "$APP" && npx tsc --noEmit -p tsconfig.json`
Expected: inga nya fel.

```bash
cd "$APP" && git add src-tauri/src/live_tv_sport_image.rs src-tauri/src/lib.rs src-tauri/src/axum_server.rs src-tauri/src/live_tv_sport_fetch.rs lib/plugin-sdk.ts
git commit -m "live-tv sport: disk-cached image passthrough for the Sport backdrop, lookupteam whitelisted, home background read seam"
```

- [ ] **Step 6: Skriv de fallerande plugintesterna**

`runtime/sport/__fixtures__/thesportsdb/lookupteam.json`:

```json
{
  "_shape": "from docs — verify with real key",
  "teams": [
    {
      "idTeam": "134001",
      "strTeam": "Malmo FF",
      "strStadium": "Eleda Stadion",
      "strStadiumThumb": "https://r2.thesportsdb.com/images/media/team/stadium/malmo.jpg",
      "strFanart1": "https://r2.thesportsdb.com/images/media/team/fanart/malmo1.jpg",
      "strFanart2": null
    }
  ]
}
```

```ts
// runtime/sport/backdrop.test.ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { __resetBackdropForTests, backdropSrc, chooseSportBackdrop, resolveCustomBackdrop, useHeroTeamArt } from './backdrop'
import { apiSports } from './api-sports'
import { theSportsDb } from './thesportsdb'
import { mergeLinked } from './merge'
import footballDate from './__fixtures__/api-sports/football-fixtures-date.json'
import lookupteam from './__fixtures__/thesportsdb/lookupteam.json'
import type { SportMatch } from './sport-model'

const h = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock('./budget', async () => {
  const { theSportsDb: provider } = await import('./thesportsdb')
  return { currentBudget: () => ({ provider, run: h.run }) }
})

const VENUE = 'https://media.api-sports.io/football/venues/1460.png'
const art = { stadium: 'https://r2.thesportsdb.com/images/media/team/stadium/malmo.jpg', fanart: 'https://r2.thesportsdb.com/images/media/team/fanart/malmo1.jpg' }
const hero = { kind: 'football' as const, venueImage: null as string | null }
const base = { mode: 'auto' as const, hasKey: true, hero, art: null, custom: null }
const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 10, 22) }

describe('chooseSportBackdrop', () => {
  it('Automatisk: arenan, sedan lagets arenabild, sedan fanart, sist sportens gradient', () => {
    expect(chooseSportBackdrop({ ...base, hero: { ...hero, venueImage: VENUE }, art })).toEqual({ kind: 'image', url: VENUE, from: 'venue' })
    expect(chooseSportBackdrop({ ...base, art })).toEqual({ kind: 'image', url: art.stadium, from: 'stadium' })
    expect(chooseSportBackdrop({ ...base, art: { stadium: null, fanart: art.fanart } })).toEqual({ kind: 'image', url: art.fanart, from: 'fanart' })
    expect(chooseSportBackdrop(base)).toEqual({ kind: 'gradient', sport: 'football' })
  })
  it('utan nyckel eller utan hero: neutral gradient, aldrig en bild ur källan', () => {
    expect(chooseSportBackdrop({ ...base, hasKey: false, hero: { ...hero, venueImage: VENUE }, art })).toEqual({ kind: 'gradient', sport: 'football' })
    expect(chooseSportBackdrop({ ...base, hero: null })).toEqual({ kind: 'gradient', sport: 'other' })
  })
  it('en bild som inte gick att ladda hoppas över', () => {
    expect(chooseSportBackdrop({ ...base, hero: { ...hero, venueImage: VENUE }, art, broken: new Set([VENUE]) })).toEqual({ kind: 'image', url: art.stadium, from: 'stadium' })
    expect(chooseSportBackdrop({ ...base, art, broken: new Set([art.stadium, art.fanart]) })).toEqual({ kind: 'gradient', sport: 'football' })
  })
  it('Egen bild gäller även utan nyckel; saknas bilden blir det gradient', () => {
    expect(chooseSportBackdrop({ ...base, mode: 'custom', hasKey: false, custom: 'data:image/png;base64,AA' })).toEqual({ kind: 'image', url: 'data:image/png;base64,AA', from: 'custom' })
    expect(chooseSportBackdrop({ ...base, mode: 'custom', custom: null })).toEqual({ kind: 'gradient', sport: 'football' })
  })
  it('Av: ingenting, inte ens med arena', () => {
    expect(chooseSportBackdrop({ ...base, mode: 'off', hero: { ...hero, venueImage: VENUE } })).toEqual({ kind: 'none' })
  })
})

describe('bildens källor', () => {
  it('Egen bild slås upp i startsidans lista per index, eller är länken', () => {
    expect(resolveCustomBackdrop({ from: 'home', index: 1 }, ['a', 'b'])).toBe('b')
    expect(resolveCustomBackdrop({ from: 'home', index: 5 }, ['a'])).toBeNull()
    expect(resolveCustomBackdrop({ from: 'url', url: 'https://x/y.jpg' }, [])).toBe('https://x/y.jpg')
    expect(resolveCustomBackdrop(null, ['a'])).toBeNull()
  })
  it('källornas bilder går genom appens bildcache; Egen bild används som den är', () => {
    expect(backdropSrc({ kind: 'image', url: VENUE, from: 'venue' })).toBe('/api/live-tv/sport/image?src=' + encodeURIComponent(VENUE))
    expect(backdropSrc({ kind: 'image', url: 'data:image/png;base64,AA', from: 'custom' })).toBe('data:image/png;base64,AA')
    expect(backdropSrc({ kind: 'image', url: 'https://min.server/bild.jpg', from: 'custom' })).toBe('https://min.server/bild.jpg')
  })
  it('API-Sports: arenans bild ur fixturens venue-id utan anrop, och den följer med in i SportMatch', () => {
    const [live] = apiSports.day('football', '2026-10-10', DAY).parse([footballDate])
    expect(live!.venueImage).toBe(VENUE)
    expect(apiSports.teamArt('football', '375')).toBeNull()
    const [merged] = mergeLinked({ epg: [], fixtures: [live!], links: {}, overrides: {}, coverage: () => 'full' })
    expect(merged!.venueImage).toBe(VENUE)
  })
  it('TheSportsDB: lookupteam ger arenabild och fanart, cachas 30 dygn', () => {
    const call = theSportsDb.teamArt('football', '134001')!
    expect(call.requests).toEqual([{ sport: 'football', path: '/v1/lookupteam.php?id=134001', ttlS: 2_592_000 }])
    expect(call.parse([lookupteam])).toEqual(art)
    expect(call.parse([{ teams: null }])).toBeNull()
  })
})

describe('useHeroTeamArt', () => {
  const tsdbHero = (over: Partial<SportMatch> = {}) => ({ id: 'x', kind: 'football', venueImage: null, fixture: { provider: 'thesportsdb', id: 'e1' }, homeIds: { thesportsdb: '134001' }, ...over }) as unknown as SportMatch

  it('ett lookupteam per lag genom kvothanteraren, sedan minnet', async () => {
    __resetBackdropForTests()
    h.run.mockReset().mockResolvedValue({ ok: true, data: art, cached: false, fetchedAt: 1 })
    const a = renderHook(() => useHeroTeamArt(tsdbHero()))
    await waitFor(() => expect(a.result.current).toEqual(art))
    const b = renderHook(() => useHeroTeamArt(tsdbHero()))
    expect(b.result.current).toEqual(art)
    expect(h.run).toHaveBeenCalledTimes(1)
    expect(h.run).toHaveBeenCalledWith('search', 'football', expect.objectContaining({ requests: [expect.objectContaining({ path: '/v1/lookupteam.php?id=134001' })] }))
  })
  it('arenabild på hero, ingen hero eller ingen fixtur: inget anrop', () => {
    __resetBackdropForTests()
    h.run.mockReset()
    renderHook(() => useHeroTeamArt(tsdbHero({ venueImage: VENUE })))
    renderHook(() => useHeroTeamArt(null))
    renderHook(() => useHeroTeamArt(tsdbHero({ fixture: undefined })))
    expect(h.run).not.toHaveBeenCalled()
  })
})
```

```tsx
// runtime/sport/sport-backdrop.test.tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SportBackdropLayer } from './sport-backdrop'
import { setSportSettings } from './sport-store'
import { localDayKey } from './sport-epg'
import { fxMatch, mountSport } from './__sport-fixture'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

afterEach(() => { cleanup() })

describe('SportBackdropLayer', () => {
  it('bild med mörk gradient från vänster; en trasig bild rapporteras', () => {
    const onBroken = vi.fn()
    const url = 'https://media.api-sports.io/football/venues/1460.png'
    render(<SportBackdropLayer choice={{ kind: 'image', url, from: 'venue' }} phone={false} onBroken={onBroken} />)
    const layer = screen.getByTestId('sport-backdrop')
    expect(layer.getAttribute('data-backdrop')).toBe('venue')
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    const img = layer.querySelector('img')!
    expect(img.getAttribute('src')).toBe('/api/live-tv/sport/image?src=' + encodeURIComponent(url))
    expect(layer.querySelector('[data-scrim]')?.getAttribute('style')).toContain('linear-gradient(90deg')
    fireEvent.error(img)
    expect(onBroken).toHaveBeenCalledWith(url)
  })
  it('Av ritar ingenting', () => {
    const { container } = render(<SportBackdropLayer choice={{ kind: 'none' }} phone={false} onBroken={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('Sport-vyn', () => {
  const today = localDayKey(Date.now())
  it('TV och telefon: gradient bakom innehållet utan nyckel, borta när Av väljs', async () => {
    mountSport({}, { days: { [today]: [fxMatch({ id: 'a', start: Date.now() + 3_600_000 })] } })
    expect((await screen.findByTestId('sport-backdrop')).getAttribute('data-backdrop')).toBe('gradient')
    act(() => { setSportSettings({ backdrop: 'off' }) })
    expect(screen.queryByTestId('sport-backdrop')).toBeNull()
    cleanup()
    setSportSettings({ backdrop: 'auto' })
    mountSport({}, { phone: true, days: { [today]: [fxMatch({ id: 'b', start: Date.now() + 3_600_000 })] } })
    expect((await screen.findByTestId('sport-backdrop')).getAttribute('data-backdrop')).toBe('gradient')
  })
})
```

`setSportSettings({ backdrop: 'auto' })` före andra monteringen återställer läget, oavsett om `mountSport` nollställer lagringen eller inte.

```tsx
// runtime/sport/sport-backdrop-settings.test.tsx
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setHomeBackgroundUrlsForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportBackdropSettingsDesktop, SportBackdropSettingsTv } from './sport-backdrop-settings'
import { getSportSettings } from './sport-store'

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('Bakgrund i Sport, inställningen', () => {
  it('skrivbord: Automatisk som standard; Egen bild med startsidans bilder och en länk; Av', () => {
    __setHomeBackgroundUrlsForTests(['https://img.example/a.jpg', 'data:image/png;base64,AA'])
    render(<SportBackdropSettingsDesktop />)
    expect(getSportSettings().backdrop).toBe('auto')
    fireEvent.click(screen.getByText('Egen bild'))
    expect(getSportSettings().backdrop).toBe('custom')
    fireEvent.click(screen.getByTestId('sport-backdrop-home-1'))
    expect(getSportSettings().backdropCustom).toEqual({ from: 'home', index: 1 })
    fireEvent.change(screen.getByPlaceholderText('https://…'), { target: { value: 'https://min.server/bild.jpg' } })
    fireEvent.click(screen.getByText('Använd'))
    expect(getSportSettings().backdropCustom).toEqual({ from: 'url', url: 'https://min.server/bild.jpg' })
    fireEvent.click(screen.getByText('Av'))
    expect(getSportSettings().backdrop).toBe('off')
  })
  it('TV-raderna: läget stegar Automatisk → Egen bild → Av, och startsidans bilder stegas', () => {
    __setHomeBackgroundUrlsForTests(['https://img.example/a.jpg', 'https://img.example/b.jpg'])
    render(<SportBackdropSettingsTv />)
    fireEvent.click(screen.getByTestId('sport-backdrop-mode'))
    expect(getSportSettings().backdrop).toBe('custom')
    fireEvent.click(screen.getByTestId('sport-backdrop-home'))
    expect(getSportSettings().backdropCustom).toEqual({ from: 'home', index: 0 })
    fireEvent.click(screen.getByTestId('sport-backdrop-home'))
    expect(screen.getByText('Bild 2 av 2')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sport-backdrop-mode'))
    expect(getSportSettings().backdrop).toBe('off')
    expect(screen.queryByTestId('sport-backdrop-home')).toBeNull()
  })
})
```

Sist i fas 1:s `runtime/sport/sport-store.test.ts`:

```ts
describe('Bakgrund i Sport', () => {
  it('standard Automatisk; okända värden faller tillbaka', () => {
    expect(getSportSettings()).toMatchObject({ backdrop: 'auto', backdropCustom: null })
    expect(setSportSettings({ backdrop: 'bogus' as never })).toMatchObject({ backdrop: 'auto' })
  })
  it('Egen bild: startsidans bild per index eller en http(s)-länk; data-URL:er sparas aldrig i den synkade lagringen', () => {
    expect(setSportSettings({ backdrop: 'custom', backdropCustom: { from: 'home', index: 2 } })).toMatchObject({ backdrop: 'custom', backdropCustom: { from: 'home', index: 2 } })
    expect(setSportSettings({ backdropCustom: { from: 'url', url: '  https://x.example/y.jpg ' } }).backdropCustom).toEqual({ from: 'url', url: 'https://x.example/y.jpg' })
    expect(setSportSettings({ backdropCustom: { from: 'url', url: 'data:image/png;base64,AAAA' } }).backdropCustom).toBeNull()
    expect(setSportSettings({ backdropCustom: { from: 'home', index: -1 } }).backdropCustom).toBeNull()
  })
})
```

- [ ] **Step 7: Kör plugintesterna och se dem falla**

Run: `cd "$PLG" && npx vitest run runtime/sport/backdrop.test.ts runtime/sport/sport-backdrop.test.tsx runtime/sport/sport-backdrop-settings.test.tsx runtime/sport/sport-store.test.ts`
Expected: FAIL med "Failed to resolve import './backdrop'" (och motsvarande för `./sport-backdrop` och `./sport-backdrop-settings`), och i sport-store `expected undefined to be 'auto'`.

- [ ] **Step 8: Typer, adaptrar, modell och lagring**

`provider.ts` (Task 5):

```ts
/** Lagets bilder för Sports bakgrund (TheSportsDB `lookupteam`). */
export interface TeamArt { stadium: string | null; fanart: string | null }
```

I `Fixture` läggs `venueImage?: string | null` efter `venue`, och i `SportsProvider` efter `crestUrl`:

```ts
  /** Bilder för bakgrunden. `null` = källan har ingen sådan uppslagning, och då görs inget anrop. */
  teamArt(sport: SportKind, teamId: string): ProviderCall<TeamArt | null> | null
```

`api-sports.ts` (Task 6), efter importerna:

```ts
export const API_SPORTS_MEDIA = 'https://media.api-sports.io'

/** Arenans bild på källans CDN. Kostar inget anrop, och bara fotbollens fixtur bär venue-id. */
export function venueImageUrl(id: unknown): string | null {
  const n = num(id)
  return n != null && n > 0 ? `${API_SPORTS_MEDIA}/football/venues/${n}.png` : null
}
```

I `footballFixture` läggs `venueImage: venueImageUrl(raw.fixture.venue?.id),` efter `venue`, och i adapterobjektet `teamArt: () => null,` efter `crestUrl`. Task 6:s tester jämför med `toMatchObject` och påverkas inte.

`thesportsdb.ts` (Task 7), i adapterobjektet efter `crestUrl` (och `TeamArt` i typimporten från `./provider`):

```ts
  teamArt(sport, teamId): ProviderCall<TeamArt | null> {
    return {
      requests: [{ sport, path: `/v1/lookupteam.php?id=${enc(teamId)}`, ttlS: 2_592_000 }],
      parse: (bodies) => {
        const t = arr((bodies[0] as any)?.teams)[0]
        if (!t) return null
        return { stadium: str(t.strStadiumThumb), fanart: str(t.strFanart1) ?? str(t.strFanart2) }
      },
    }
  },
```

`sport-model.ts` (fas 1, efter Task 11:s fält): `venueImage?: string | null` på `SportMatch`. `merge.ts` (Task 11), sist i objektet som `fromFixture` returnerar: `...(f.venueImage ? { venueImage: f.venueImage } : {}),` (villkorligt, så att Task 11:s `toEqual` på hela matcher inte får ett nytt `undefined`-fält).

`sport-store.ts` (fas 1 + Task 13):

```ts
export type SportBackdropMode = 'auto' | 'custom' | 'off'
/**
 * Egen bild: en av appens egna bakgrunder (Inställningar > Startsida) per index,
 * eller en http(s)-länk. Bilden själv kopieras aldrig hit: lagringen synkas med
 * WebDAV, och uppladdade bilder är data-URL:er på flera MB.
 */
export type SportBackdropCustom = { from: 'home'; index: number } | { from: 'url'; url: string }

function sanitizeBackdropCustom(raw: unknown): SportBackdropCustom | null {
  const c = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  if (c?.from === 'home' && typeof c.index === 'number' && Number.isInteger(c.index) && c.index >= 0) return { from: 'home', index: c.index }
  if (c?.from === 'url' && typeof c.url === 'string' && /^https?:\/\/\S+$/i.test(c.url.trim())) return { from: 'url', url: c.url.trim() }
  return null
}
```

`SportSettings` får `backdrop: SportBackdropMode` och `backdropCustom: SportBackdropCustom | null`, `DEFAULT_SETTINGS` får `backdrop: 'auto', backdropCustom: null`, och `sanitizeSettings` får, efter Task 13:s fält:

```ts
    backdrop: r.backdrop === 'custom' || r.backdrop === 'off' ? r.backdrop : 'auto',
    backdropCustom: sanitizeBackdropCustom(r.backdropCustom),
```

- [ ] **Step 9: Val-logiken och krokarna**

```ts
// runtime/sport/backdrop.ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import { getHomeBackgroundUrls, getPluginHttpAssetUrl, onHomeBackgroundChanged } from '@/lib/plugin-sdk'
import { currentBudget } from './budget'
import { useSportSettings, type SportBackdropCustom, type SportBackdropMode } from './sport-store'
import type { TeamArt } from './provider'
import type { SportKind, SportMatch } from './sport-model'

export type BackdropChoice =
  | { kind: 'none' }
  | { kind: 'image'; url: string; from: 'venue' | 'stadium' | 'fanart' | 'custom' }
  | { kind: 'gradient'; sport: SportKind }

export interface BackdropInput {
  mode: SportBackdropMode
  hasKey: boolean
  hero: Pick<SportMatch, 'kind' | 'venueImage'> | null
  /** Hemmalagets bilder (TheSportsDB). `null` = okänt, eller API-Sports som inte har någon. */
  art: TeamArt | null
  /** Egen bild, redan uppslagen (http(s) eller startsidans data-URL). */
  custom: string | null
  /** Bilder som inte gick att ladda i den här sessionen. */
  broken?: ReadonlySet<string>
}

/** Neutral bakgrund per sport: mörk och svagt tonad, aldrig en bild. */
export const SPORT_GRADIENTS: Record<SportKind, string> = {
  football: 'radial-gradient(120% 90% at 85% 10%, #1f3b2c 0%, #0d1611 55%, #050806 100%)',
  hockey: 'radial-gradient(120% 90% at 85% 10%, #22364a 0%, #0c141c 55%, #05080b 100%)',
  basketball: 'radial-gradient(120% 90% at 85% 10%, #46301c 0%, #1a120b 55%, #080604 100%)',
  handball: 'radial-gradient(120% 90% at 85% 10%, #3a2a44 0%, #150f19 55%, #070509 100%)',
  motorsport: 'radial-gradient(120% 90% at 85% 10%, #45201f 0%, #190c0c 55%, #080404 100%)',
  tennis: 'radial-gradient(120% 90% at 85% 10%, #3b3f1e 0%, #15160b 55%, #070704 100%)',
  other: 'radial-gradient(120% 90% at 85% 10%, #2a2c33 0%, #111216 55%, #060608 100%)',
}

/** Läsbarheten (handoffens hero över arenafotot): mörkt till vänster där texten står, bilden syns till höger. */
export const BACKDROP_SCRIM = 'linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 38%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.3) 100%)'
/** Telefonen: texten går över hela bredden, så bilden tonas också ned uppifrån och ned. */
export const BACKDROP_SCRIM_PHONE = `linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 45%, #000 100%), ${BACKDROP_SCRIM}`

export function chooseSportBackdrop(i: BackdropInput): BackdropChoice {
  if (i.mode === 'off') return { kind: 'none' }
  const sport = i.hero?.kind ?? 'other'
  const usable = (url: string | null | undefined): url is string => !!url && !i.broken?.has(url)
  if (i.mode === 'custom') return usable(i.custom) ? { kind: 'image', url: i.custom, from: 'custom' } : { kind: 'gradient', sport }
  if (!i.hasKey || !i.hero) return { kind: 'gradient', sport }
  if (usable(i.hero.venueImage)) return { kind: 'image', url: i.hero.venueImage, from: 'venue' }
  const stadium = i.art?.stadium
  const fanart = i.art?.fanart
  if (usable(stadium)) return { kind: 'image', url: stadium, from: 'stadium' }
  if (usable(fanart)) return { kind: 'image', url: fanart, from: 'fanart' }
  return { kind: 'gradient', sport }
}

export function resolveCustomBackdrop(c: SportBackdropCustom | null, homeUrls: string[]): string | null {
  if (!c) return null
  return c.from === 'url' ? c.url : homeUrls[c.index] ?? null
}

/** Källornas bilder via appens bildcache (en hämtning per bild); Egen bild som den är, som startsidan gör. */
export function backdropSrc(c: Extract<BackdropChoice, { kind: 'image' }>): string | null {
  return c.from === 'custom' ? c.url : getPluginHttpAssetUrl('/api/live-tv/sport/image', c.url)
}

export function useHomeBackgrounds(): string[] {
  const [urls, setUrls] = useState(getHomeBackgroundUrls)
  useEffect(() => onHomeBackgroundChanged(() => setUrls(getHomeBackgroundUrls())), [])
  return urls
}

// `källa:sport:lag` → bilder. Bara lyckade svar sparas; en spärr eller ett nätfel försöks igen nästa gång.
const artCache = new Map<string, TeamArt | null>()
export function __resetBackdropForTests(): void {
  artCache.clear()
}

/**
 * Hemmalagets bilder för hero-matchen. API-Sports har ingen sådan uppslagning
 * (`teamArt` är null, och arenan kommer ur fixturen). TheSportsDB kostar ett
 * `lookupteam` per lag, genom kvothanteraren som ett `search`-anrop (skyddas
 * av reserven), och cachas sedan 30 dygn på disk och här i minnet.
 */
export function useHeroTeamArt(hero: SportMatch | null): TeamArt | null {
  const provider = hero?.fixture?.provider ?? null
  const teamId = provider ? hero?.homeIds?.[provider] ?? null : null
  const key = hero && provider && teamId && !hero.venueImage ? `${provider}:${hero.kind}:${teamId}` : null
  const [art, setArt] = useState<TeamArt | null>(() => (key ? artCache.get(key) ?? null : null))
  useEffect(() => {
    if (!key || !hero || !teamId) { setArt(null); return }
    if (artCache.has(key)) { setArt(artCache.get(key) ?? null); return }
    const budget = currentBudget()
    const call = budget?.provider.teamArt(hero.kind, teamId) ?? null
    if (!budget || !call) { setArt(null); return }
    let alive = true
    void budget.run('search', hero.kind, call).then((res) => {
      if (res.ok) artCache.set(key, res.data)
      if (alive) setArt(res.data ?? null)
    })
    return () => { alive = false }
    // `key` bär allt som avgör uppslagningen; matchobjektet byter identitet vid varje sammanslagning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return key ? art : null
}

export function useSportBackdrop(hero: SportMatch | null): { choice: BackdropChoice; onBroken(url: string): void } {
  const settings = useSportSettings()
  const homeUrls = useHomeBackgrounds()
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set())
  const art = useHeroTeamArt(settings.backdrop === 'auto' && settings.apiKey ? hero : null)
  const onBroken = useCallback((url: string) => setBroken((b) => (b.has(url) ? b : new Set(b).add(url))), [])
  const choice = chooseSportBackdrop({
    mode: settings.backdrop,
    hasKey: !!settings.apiKey,
    hero,
    art,
    custom: resolveCustomBackdrop(settings.backdropCustom, homeUrls),
    broken,
  })
  return { choice, onBroken }
}
```

- [ ] **Step 10: Lagret och inkopplingen i båda skalen**

```tsx
// runtime/sport/sport-backdrop.tsx
'use client'

import { BACKDROP_SCRIM, BACKDROP_SCRIM_PHONE, SPORT_GRADIENTS, backdropSrc, type BackdropChoice } from './backdrop'

/** Ligger bakom hela Sport-vyn. Tar aldrig fokus eller klick. */
export function SportBackdropLayer({ choice, phone, onBroken }: { choice: BackdropChoice; phone: boolean; onBroken(url: string): void }) {
  if (choice.kind === 'none') return null
  const image = choice.kind === 'image' ? choice : null
  const src = image ? backdropSrc(image) : null
  return (
    <div
      data-testid="sport-backdrop"
      data-backdrop={image ? image.from : 'gradient'}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', background: choice.kind === 'gradient' ? SPORT_GRADIENTS[choice.sport] : '#000' }}
    >
      {image && src ? (
        <>
          <img src={src} alt="" decoding="async" onError={() => onBroken(image.url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
          <div data-scrim="" style={{ position: 'absolute', inset: 0, background: phone ? BACKDROP_SCRIM_PHONE : BACKDROP_SCRIM }} />
        </>
      ) : null}
    </div>
  )
}
```

`runtime/sport/tv/sport-shell.tsx` (`SportTv`, efter Task 15 punkt 1 och Task 18): importera `featuredMatch` ur `../sport-day-model`, `useSportBackdrop` ur `../backdrop` och `SportBackdropLayer` ur `../sport-backdrop`. Efter raden där `matches` räknas (`visibleMatches(mergedDay, filter)`):

```tsx
const hero = useMemo(() => featuredMatch(matches, ctx.follows, ctx.now), [matches, ctx.follows, ctx.now])
const backdrop = useSportBackdrop(hero)
```

och returen lindas in, med fas 1:s rot i övrigt oförändrad:

```tsx
return (
  <div data-testid="sport-stage" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
    <SportBackdropLayer choice={backdrop.choice} phone={false} onBroken={backdrop.onBroken} />
    <div data-testid="sport-view" data-scroll="" style={{ /* fas 1:s stil oförändrad */ position: 'relative' }}>
      {/* fas 1:s innehåll oförändrat */}
    </div>
  </div>
)
```

`hero` är samma match som `SportMatchday` visar som hero (samma `featuredMatch` på samma lista), så bakgrunden och hero-kortet hör ihop. Ingen `zIndex` på innehållet: lagret ritas först och innehållet (`position: relative`) ovanpå, så att matchcentrets och väljarnas egna lager inte hamnar i en ny staplingskontext.

`runtime/sport/mobile/sport-phone.tsx` (`SportPhone`, efter Task 15 punkt 8 och Task 21), samma importer:

```tsx
const phoneHero = useMemo(() => featuredMatch(visibleMatches(mergedDay, filter), ctx.follows, ctx.now), [mergedDay, filter, ctx.follows, ctx.now])
const backdrop = useSportBackdrop(phoneHero)
```

och samma inlindning runt roten `sport-phone`: `<div data-testid="sport-stage" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><SportBackdropLayer choice={backdrop.choice} phone onBroken={backdrop.onBroken} />…</div>`, och roten får `position: 'relative'`. `useMemo` och `featuredMatch` läggs i importerna, men inget importeras ur `sport/tv/*`. Task 21:s importtest vaktar det.

- [ ] **Step 11: Inställningen på de tre ytorna**

```tsx
// runtime/sport/sport-backdrop-settings.tsx
'use client'

import { useState } from 'react'
import { LtBtn, LtNote, LtRows, LtSection, LtTextRow, hostOf } from '../settings-ui'
import { Heading, Row } from '../tv/settings-tabs'
import { useTextPrompt } from '../tv/tv-text-entry'
import { useTvText, type TvStringKey } from '../tv/tv-strings'
import { useHomeBackgrounds } from './backdrop'
import { setSportSettings, useSportSettings, type SportBackdropCustom, type SportBackdropMode } from './sport-store'

const MODES: SportBackdropMode[] = ['auto', 'custom', 'off']
const MODE_LABEL: Record<SportBackdropMode, TvStringKey> = { auto: 'sportBackdropAuto', custom: 'sportBackdropCustom', off: 'sportBackdropOff' }
const isHttp = (v: string) => /^https?:\/\/\S+$/i.test(v.trim())
const pick = (c: SportBackdropCustom) => setSportSettings({ backdrop: 'custom', backdropCustom: c })

export function SportBackdropSettingsDesktop() {
  const { tt } = useTvText()
  const s = useSportSettings()
  const home = useHomeBackgrounds()
  const [link, setLink] = useState(s.backdropCustom?.from === 'url' ? s.backdropCustom.url : '')
  return (
    <div data-testid="sport-backdrop-settings">
      <LtSection title={tt('sportBackdropTitle')} hint={tt('sportBackdropHint')} />
      <LtRows>
        <div style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
          {MODES.map((m) => (
            <LtBtn key={m} testId={`sport-backdrop-${m}`} active={s.backdrop === m} onClick={() => setSportSettings({ backdrop: m })}>{tt(MODE_LABEL[m])}</LtBtn>
          ))}
        </div>
        {s.backdrop === 'custom' ? (
          <>
            {home.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
                {home.map((url, index) => {
                  const on = s.backdropCustom?.from === 'home' && s.backdropCustom.index === index
                  return (
                    <button
                      key={index}
                      type="button"
                      data-testid={`sport-backdrop-home-${index}`}
                      aria-pressed={on}
                      onClick={() => pick({ from: 'home', index })}
                      style={{ width: 120, height: 68, padding: 0, borderRadius: 8, cursor: 'pointer', borderWidth: 2, borderStyle: 'solid', borderColor: on ? 'rgb(var(--accent-500))' : 'transparent', background: `center / cover no-repeat url("${url.replace(/"/g, '%22')}")` }}
                    />
                  )
                })}
              </div>
            ) : (
              <LtNote>{tt('sportBackdropNoHome')}</LtNote>
            )}
            <LtTextRow
              label={tt('sportBackdropLink')}
              value={link}
              onChange={setLink}
              placeholder="https://…"
              button={tt('sportBackdropUse')}
              buttonDisabled={!isHttp(link)}
              onButton={() => { if (isHttp(link)) pick({ from: 'url', url: link }) }}
              onEnter={() => { if (isHttp(link)) pick({ from: 'url', url: link }) }}
              testId="sport-backdrop-link"
            />
          </>
        ) : null}
      </LtRows>
    </div>
  )
}

export function SportBackdropSettingsTv({ phone = false, pushLayer }: { phone?: boolean; pushLayer?: (close: () => void) => () => void }) {
  const { tt } = useTvText()
  const s = useSportSettings()
  const home = useHomeBackgrounds()
  const prompt = useTextPrompt({ pushLayer })
  const nextMode = MODES[(MODES.indexOf(s.backdrop) + 1) % MODES.length]!
  const homeRight = s.backdropCustom?.from === 'home'
    ? tt('sportBackdropHomeN', { n: s.backdropCustom.index + 1, total: home.length })
    : home.length > 0 ? tt('sportBackdropNone') : tt('sportBackdropNoHomeShort')
  const nextHome = () => {
    if (home.length === 0) return
    const index = s.backdropCustom?.from === 'home' ? (s.backdropCustom.index + 1) % home.length : 0
    pick({ from: 'home', index })
  }
  const askLink = () => prompt.ask(tt('sportBackdropLink'), s.backdropCustom?.from === 'url' ? s.backdropCustom.url : '', (value) => {
    if (isHttp(value)) pick({ from: 'url', url: value })
  }, 'url')
  return (
    <div data-testid="sport-backdrop-settings-tv">
      <Heading phone={phone} hint={tt('sportBackdropHint')}>{tt('sportBackdropTitle')}</Heading>
      <Row phone={phone} testId="sport-backdrop-mode" label={tt('sportBackdropTitle')} right={tt(MODE_LABEL[s.backdrop])} onOk={() => setSportSettings({ backdrop: nextMode })} />
      {s.backdrop === 'custom' ? (
        <>
          <Row phone={phone} testId="sport-backdrop-home" label={tt('sportBackdropFromHome')} right={homeRight} onOk={nextHome} />
          <Row phone={phone} testId="sport-backdrop-link-tv" label={tt('sportBackdropLink')} right={s.backdropCustom?.from === 'url' ? hostOf(s.backdropCustom.url) : ''} onOk={askLink} />
        </>
      ) : null}
      {prompt.node}
    </div>
  )
}
```

Kopplingar, på samma tre ställen som Task 17 (Live TV har två inställningsytor, och telefonen har en egen undersida):
- `live-tv-settings-section.tsx`: direkt efter `<SportKeySettingsDesktop />`, `<SportBackdropSettingsDesktop />`.
- `tv/tv-settings.tsx`: innehållet för fliken blir `{tab === 'sport' ? <><SportKeySettingsTv /><SportBackdropSettingsTv pushLayer={nav.pushLayer} /></> : null}`.
- `tv/mobile/settings-phone.tsx`: kortets gren för `params.tab === 'sport'` blir `<><SportKeySettingsTv phone /><SportBackdropSettingsTv phone pushLayer={nav.pushLayer} /></>`.

Lägg strängarna ur tabellen ovan i `EN` och `SV` i `tv/tv-strings.ts`.

- [ ] **Step 12: Kör testerna och typkontrollen**

Run: `cd "$PLG" && npx vitest run runtime/sport && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (backdrop 11 tester, sport-backdrop 3, sport-backdrop-settings 2, sport-store 2 nya). Fas 1:s skal- och telefontester är fortfarande gröna. De letar efter `sport-view` och `sport-phone`, som finns kvar inuti `sport-stage`. Inga nya tsc-fel.

- [ ] **Step 13: Commit i PLG**

```bash
cd "$PLG" && git add src/__test-stubs__/plugin-sdk.ts runtime/sport/provider.ts runtime/sport/api-sports.ts runtime/sport/thesportsdb.ts runtime/sport/__fixtures__/thesportsdb/lookupteam.json runtime/sport/sport-model.ts runtime/sport/merge.ts runtime/sport/sport-store.ts runtime/sport/sport-store.test.ts runtime/sport/backdrop.ts runtime/sport/backdrop.test.ts runtime/sport/sport-backdrop.tsx runtime/sport/sport-backdrop.test.tsx runtime/sport/sport-backdrop-settings.tsx runtime/sport/sport-backdrop-settings.test.tsx runtime/sport/tv/sport-shell.tsx runtime/sport/mobile/sport-phone.tsx runtime/live-tv-settings-section.tsx runtime/tv/tv-settings.tsx runtime/tv/mobile/settings-phone.tsx runtime/tv/tv-strings.ts
git commit -m "live-tv sport: background in Sport (stadium of the featured match, custom image or off)"
```

---

### Task 23: Helhetsgrind, bygge och manuell verifiering

**Files:**
- Modify: `$PLG/dist/runtime.js` (byggd, `git add -f`)

**Interfaces:**
- Consumes: allt ovan.
- Produces: en byggd plugin-runtime på grenen, ej släppt.

- [ ] **Step 1: Hela testsviten och typkontrollen**

Run: `cd "$PLG" && npx tsc --noEmit -p tsconfig.json && npx vitest run`
Expected: inga nya tsc-fel och en grön svit. Det förbefintliga klockberoende `tv-player-chrome`-testet kan falla efter 12:11 och räknas inte.

Run: `cd "$APP/src-tauri" && cargo test --lib live_tv_sport && cargo build`
Expected: PASS (filtret täcker också `live_tv_sport_image` från Task 22) och ett grönt bygge.

Run: `cd "$APP" && npx vitest run lib/__tests__/sync-key-selection.test.ts`
Expected: PASS.

- [ ] **Step 2: Kontrollera "inga anrop utan nyckel" och "budgeten äger allt" en sista gång**

Run: `cd "$PLG" && grep -rn "sport/fetch\|sport-fetch'" runtime --include='*.ts' --include='*.tsx' | grep -v '\.test\.' `
Expected: träffar bara i `runtime/sport/sport-fetch.ts` och `runtime/sport/budget.ts`. Kontrollera också att `import type` är det enda sättet `key-flow.ts` refererar till `sport-fetch`.

Run: `cd "$PLG" && grep -rn "from '\.\./tv/" runtime/sport/mobile | grep -v '\.test\.'`
Expected: inga träffar (telefonträdet importerar aldrig ur `sport/tv/*`, se Task 21).

- [ ] **Step 3: Bygg pluginet från APP-worktreet**

Run: `cd "$APP" && node scripts/build-plugin-runtime.mjs "$PLG"`
Expected: `dist/runtime.js` skrivs utan fel. Kontrollera att bygget inte har lagt `import.meta.glob` i någon runtime-fil. Bara testfiler får använda den, eftersom en glob i runtime-koden gav 0.1.617 utan plugins.

- [ ] **Step 4: Manuell verifiering (Playwright mot 3011)**

Starta dev-appen från APP-worktreet. Kontrollera först vilken app som äger port 3011 (PID och sökväg): release-appen tar porten tyst. Kör sedan `node scripts/generate-bundled-plugin-runtimes.mjs` i APP. Stagea inte `lib/generated/*`.
1. `http://127.0.0.1:3011/?tvmode=1`, Sport utan nyckel: kortet visas överst, Resultat visar kortet, och nätverksloggen har **noll** anrop till `/api/live-tv/sport/fetch`.
2. Klistra in en gratisnyckel (skrivbord): "Nyckeln fungerar · N av 100 anrop i dag · Gratisnivå". Korten får ställning och märken, "Bara resultat" syns, och takt-raden visar "Uppdateras var …".
3. Tennis i sportknapparna: inget ställningsfält, ingen "Bara resultat", inte listad i Resultat.
4. Matchcenter för en pågående fotbollsmatch: Händelser, Statistik och Laguppställningar. För hockey döljs tomma delar.
5. Stäng Sport-vyn: inga fler `fetch`-anrop. Öppna spelaren på en kanal med pågående match: pollningen återupptas.
6. Smal yta, ≤639 px (telefon): Sport i "Mer", kortet med textfält och Klistra in. Inställningar > Mer > Sport visar den maskerade nyckeln.
7. TV-överlämning: "Skriv in med telefonen" → skanna QR:n → klistra in på telefonen → TV:n validerar och sparar.
8. Kvällskontroll (Jerry, med egen nyckel, under en matchkväll): `GET /api/live-tv/sport/quota?provider=api-sports` före och efter. Förbrukningen per hink ska stämma med dygnsplanen plus livepollningen i den visade takten.
9. Telefon (≤639 px) med nyckel: Sport har tre segment. Resultat visar ligagrupper med omgång, ställning och minut, filtren Alla / Bara live / Mina kanaler, HOPPA TILL, och Tabell öppnar ett ark med M, P och form. Följer > Lägg till: sök "malmo" med Sök, följ en träff. Utan nyckel visar Resultat nyckelkortet.
10. Bakgrund i Sport, Automatisk med API-Sports-nyckel: hero-matchens arena syns bakom vyn med mörk vänsterkant och läsbar text på TV, skrivbord och telefon. Nätverksloggen har **ett** `/api/live-tv/sport/image`-anrop per arena, och efter omladdning svarar det från disk (inga nya uppströmsanrop). `quota` ändras inte av bilderna. Utan nyckel visas sportens gradient och inga bildanrop görs.
11. Egen bild: lägg en bild under appens Inställningar > Startsida, välj den under Live TV > Sport > Bakgrund i Sport, och kontrollera att den syns i Sport på skrivbordet. Kontrollera också att det inbyggda `getHomeBackgroundUrls` i pluginbunten läser samma lista som värden (samma profil). Av tar bort bakgrunden.

- [ ] **Step 5: Commit av dist**

```bash
cd "/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/sportlage" && git add -f plugins/live-tv/dist/runtime.js
git commit -m "live-tv: rebuild dist for sportläge fas 2"
```

Ingen versionsbump, ingen push och inget släpp. Det avgör Jerry.

---

## Spec-luckor och beslut som planen tog

1. **Motorsport (formula-1)** finns som värd i specens adapterrad, men `SportMatch` saknar en race-modell utan hemma/borta. I fas 2 är motorsport bara EPG (`coverage: 'epg'`) för båda källorna. Ska Jerry vilja ha F1-resultat behövs en egen modell.
2. **Hockeyns, baskets och handbollens live hos API-Sports**: `live=all` är bara dokumenterat för fotboll. Planen pollar `games?date=idag`, som kostar ett anrop, och det ska verifieras med nyckel.
3. **`/sport/link` svarar `{ matchId, swapped }`** i stället för specens `{fixtureId → [källor]}`, och frågar med `listId` och `tzOffset` på samma sätt som fas 1:s `/sport/day`. Källorna finns redan på fas 1:s grupperade match, och `swapped` behövs för att märkena ska hamna på rätt lag.
4. **Fönstret "förstudio −15/+60 min"** tolkas som att EPG-start får ligga 60 min före och 15 min efter avspark.
5. **Målnotis "medan appen körs"** krockar med att pollningen bara sker med en öppen sportvy, ett öppet matchcenter eller en öppen spelare. Med Sport stängd och spelaren stängd kommer inga mål, även om appen är igång. Planen följer kvotregeln, som går först. Vill Jerry ha notiser i bakgrunden kostar det polling utan öppen vy.
6. **"Bara resultat · {kanal}"** på kortet: kanalen saknas när raden "Sänds på X" har strukits (beslut 3), så kortet visar bara "Bara resultat".
7. **TheSportsDB:s livescore-namn för hockey** (`icehockey`) och valideringsanropet (`/v2/all/sports`) är antaganden ur dokumentationen och ska verifieras med nyckel. Det gäller också `strTimestamp` som UTC.
8. **Nyckelöverlämningen på TV** använder Soffläges port 3012 med en engångskod, i stället för en parad Telefonkompis. Det fungerar för vilken telefon som helst på samma LAN, utan parning.
9. **Delade ligor i dygnsplanen**: tabeller planeras bara för ligor bland kopplade matcher med följda lag eller ligor. Visade ligor hämtas på begäran när "Tabell" öppnas, och det skyddas av reserven.
10. **Bakgrund i Sport (Task 22)**: API-Sports har arenabilder bara för fotboll (`media.api-sports.io/football/venues/{id}.png`, ur fixturens `venue.id`). Hockey, basket och handboll får därför gradient med API-Sports. TheSportsDB:s `strStadiumThumb` och `strFanart1` i `lookupteam` är antaganden ur dokumentationen och ska verifieras med nyckel. Lagets bilder kostar ett anrop per lag (som `search`, skyddat av reserven, cachat 30 dygn).
11. **Egen bild** återanvänder appens befintliga egna bakgrund (Inställningar > Startsida) via ett läs-seam i SDK:t och sparar bara ett index eller en http(s)-länk i `sport_settings_v1`. En egen uppladdning i pluginet byggs inte: startsidans uppladdningar är data-URL:er, och en kopia i den synkade pluginlagringen hade riskerat Androids 10 MiB-tak. Egna länkar går inte genom bildcachen, eftersom den bara tillåter källornas värdar.
