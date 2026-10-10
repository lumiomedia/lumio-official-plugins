# Sportläge fas 1 (EPG) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live TV får fliken Sport som, helt ur EPG:t och utan ett enda nytt nätanrop, visar dagens matcher (live, senare, avslutade, igår/imorgon), i hur många källor de sänds, låter användaren följa lag/turneringar med avsparksnotis och byta match eller öppna flera i Multiview från spelaren.

**Architecture:** Appen (Rust) känner igen sportprogram när XMLTV läses in (`live_tv_sport.rs`: titel-/desc-parser, normalisering, ligatabell, eventkanaler) och lägger ett valfritt `sport`-fält på programmet i EPG-butiken; sportprogram behåller 30 h bakåt, allt annat 6 h. En ny endpoint `GET /api/live-tv/sport/day` grupperar samma match över kanaler och spellistor till en match med rangordnade källor. Pluginet (`runtime/sport/`) hämtar dagen därifrån, håller följda lag/åsidosättningar/inställningar i pluginlagringen, återanvänder `reminders.ts` för avsparksnotisen och ritar vyerna enligt handoffen: TV först, skrivbord via samma träd i scenlådan, telefon som eget träd.

**Tech Stack:** Rust (axum, quick-xml, regex, once_cell, unicode-normalization; `cargo test --lib`), React 19 + TypeScript, Vitest + happy-dom + Testing Library i pluginet (`npx vitest run` i `plugins/live-tv`), esbuild-bygge av pluginruntimen (`scripts/build-plugin-runtime.mjs` i appen).

**Spec:** `PLG/docs/superpowers/specs/2026-10-10-sportlage-design.md` (bindande). Underlag: `/Users/jerry/Local Sites/Moviefinder/.worktrees/live-tv-vod-hem/.superpowers/sdd/sportlage-research.md` (Jerrys riktiga EPG-mönster) och handoffen `~/Downloads/design_handoff_live_tv_tv_mode/` (README, `Live TV prototyp v2.dc.html`, skärmdumpar 05, 06, 08, 09, 11, 12).

## Arbetsträd

- **APP** = `/Users/jerry/Local Sites/Moviefinder/.worktrees/sportlage`, gren `feature/sportlage`, skapas i Task 0 från `feature/live-tv-vod-hem`.
- **PLG** = `/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/sportlage`, gren `feature/sportlage` (finns). Pluginet ligger i `PLG/plugins/live-tv`; alla plugin-sökvägar nedan är relativa till den katalogen om inget annat sägs.

## Global Constraints

- Fas 1 är **bara EPG**: inga externa API:er, ingen nyckel, ingen ställning, inga tabeller, ingen matchcenter-statistik, ingen latensprobning, inga höjdpunkter, ingen "Sport ikväll" på Hem, ingen rad "Sänds på X, som inte finns i dina spellistor". Inget av det får byggas eller förberedas med döda knappar.
- Rate limits och uppspelningsstart går först: **inga nya nätanrop** mot leverantörer i fas 1. Pluginets enda nya anrop är lokala (`/api/live-tv/sport/day` mot den egna värden). Avsparksnotisens synk anropar ingenting alls när inga lag/turneringar följs.
- Sportdetekteringen sker i Rust vid inläsning, aldrig i pluginet (~133 000 program; telefonen ska inte tolka dem).
- Fönstret bakåt är **30 h bara för program med `sport`**; övriga program behåller 6 h (`WINDOW_BEFORE_MS`). Framåt oförändrat 48 h.
- Sportknappar i ordning: Fotboll, Ishockey, Basket, Handboll, Motorsport, Tennis. "Alla sporter" visar antal per sport för vald dag (inkl. Övrigt).
- Rälsen: ny post `sport` mellan Guide och Library, i övrigt **oförändrad** (ordning, mått, beteende). Telefon: Sport läggs i "Mer"-arket; flik-raden ändras inte.
- TV-typografin: appens kontrakt är `rem`/`var(--st-*)` för värdens primitiver. Inne i pluginets TV-scen ritas allt i designpixlar via `dp(n)` exakt som befintliga TV-vyer (`tv-favourites.tsx`: rubrik `dp(34)`, meta `dp(15–18)`); inga råa tal utan `dp()` i TV-trädet, inga `text-[..px]`. Telefonträdet använder äkta px via `MT` (`tv/mobile/mobile-tokens.ts`) som övriga telefonvyer.
- Strängar: alla nya texter i `runtime/tv/tv-strings.ts` (EN + SV), aldrig hårdkodade.
- Följda lag lagras på normaliserad nyckel (`sport_follows_v1`), inställningar i `sport_settings_v1`, åsidosättningar i `sport_overrides_v1` — pluginlagring som synkas, inget "cache" i nycklarna.
- Avsparksnotisen går genom befintliga `reminders.ts` (inga egna notissystem) och fungerar bara medan appen körs — det står vid växeln.
- Commits: **ingen AI-attribution** (ingen `Co-Authored-By`, inget "Claude"/"AI"/"generated with").
- APP: stage aldrig `lib/generated/*` eller `docs/superpowers/*` (gitignorerat/lokalt ändrat). Lägg aldrig en plan-sökväg i en `git add`.
- Pluginets `dist` byggs från **APP-worktreet** (`node scripts/build-plugin-runtime.mjs <PLG>/plugins/live-tv`) och stagas med `git add -f plugins/live-tv/dist/runtime.js` — inga andra dist-filer.
- Ingen push, ingen release, ingen versionsbump/publicering utan Jerrys klartecken. Ingen POST/DELETE mot den körande appen på 3011 för att sondera.

## Review Focus

1. **Äldre app utan `/api/live-tv/sport/day` (404)** — Sport-fliken ska visa "Sport kräver en nyare version av Lumio", aldrig snurra för evigt eller kasta. Test i Task 9 (klienten) och Task 18 (skalet).
2. **EPG-butik skriven före sportläget** (`sportVersion` saknas) — `/sport/day` ska berika den lokalt en gång utan att hämta XMLTV igen; annars är fliken tom i upp till sex timmar efter uppdateringen. Test i Task 5 och Task 8.
3. **Dygnsgräns och tidszon** — en match 00:30 svensk tid hör till den dagen, inte gårdagen i UTC; `tzOffset` per dag (sommartid). Test i Task 8 (Rust) och Task 9 (`tzOffsetFor`).
4. **Samma match i flera kanaler** med förstudio (±30 min), ombytt hemma/borta ("at"-flöden) och kort/långt lagnamn (TV4) ska bli EN match med N källor — men en repris senare samma dag (med eller utan datum i desc) ska hållas isär och inte räknas som live. Test i Task 7.
5. **Automatisk avsparksnotis + manuell påminnelse på samma program** — ingen dubblett, och när laget avföljs försvinner bara den automatiska. Test i Task 12. (Relaterat: Multiview från spelaren ska välja en källa som finns i den aktiva spellistan när en sådan finns, annars blir rutan tom — test i Task 11.)

---

## Filstruktur

**APP (Rust)**

| Fil | Ansvar |
|---|---|
| `src-tauri/src/xmltv.rs` (ändras) | Parsern läser `<category>`, `<sub-title>`, `<live/>`; ny filtrerad parse med "behåll gamla program bara om de kan vara sport"; `days_since_epoch` blir `pub(crate)` |
| `src-tauri/src/live_tv_sport.rs` (ny) | All sportlogik: `SportKind`, `SportInfo`, normalisering + exonymer, ligatabell, kanalheuristik, brusfilter, titel- och desc-parser, `detect`, eventkanaler, gruppering + rangordning, `day_handler` |
| `src-tauri/src/live_tv_epg.rs` (ändras) | `Programme.sport`, `EpgStore.sport_version`, detektering i ackumulatorn, 30 h för sport, berikning av gamla butiker; några hjälpare blir `pub(crate)` |
| `src-tauri/src/lib.rs` (ändras) | `pub mod live_tv_sport;` |
| `src-tauri/src/axum_server.rs` (ändras) | Route `GET /api/live-tv/sport/day` |

**PLG (plugin, `plugins/live-tv/runtime/`)**

| Fil | Ansvar |
|---|---|
| `sport/sport-model.ts` | Typer (`SportKind`, `SportMatch`, `MatchSource`, `SportDay`), `matchTitle`, `crestText`, `sourceChannel` |
| `sport/sport-epg.ts` | Klient mot `/sport/day`, dagnycklar, tidszon, 5 min minnescache, `useSportDay` |
| `sport/sport-store.ts` | `sport_settings_v1`, `sport_follows_v1`, `sport_overrides_v1`, `teamKeysMatch` |
| `sport/sport-day-model.ts` | Rena vyfunktioner: filtrering, sektioner, hero, nästa, tidslinje, krockar, följstatus, kandidater, källrangordning, Multiview-val, ligafärg |
| `sport/sport-alerts.ts` | Avsparksnotis = automatiska `Reminder` för följda matcher; synk i påminnelsemonteringen |
| `sport/sport-ctx.ts` | Vykontexten (`SportCtx`: klocka, texter, följda, åsidosättningar, Titta/Påminn) + texthjälpare som TV och telefon delar |
| `sport/__sport-fixture.tsx` | Testhjälp (ingen testfil): matcher relativt `Date.now()`, fetch-stubb för `/sport/day`, montering av skalet |
| `sport/tv/sport-icons.tsx` | Sportikoner (24-rutnät, stroke 1.8 som `tv-ui`) |
| `sport/tv/sport-shell.tsx` | `TvSport`: huvud, flikar, Visa som, dagbrickor, sportknappar, Alla sporter, matchcenter-lager |
| `sport/tv/sport-parts.tsx` | Delade bitar: `Crest`, `LeagueDot`, `StatusTag`, `MatchCard`, `SourceChip` |
| `sport/tv/sport-matchday.tsx` | Hero, Nästa på dina kanaler, Matchdag-tidslinje, Live nu/Senare idag/Avslutade |
| `sport/tv/sport-feed.tsx` | Dina lag, Just nu, Kvällsplan + Din kväll, Avslutade |
| `sport/tv/sport-follows.tsx` | Följer: kort per sport, avsparksnotis, följväljaren |
| `sport/tv/sport-match-center.tsx` | Matchcentret (låda): status, lag, följ, Var kan jag se den, Välj annan kanal |
| `sport/tv/player-sport.tsx` | Spelarens sportdelar: `usePlayerSport`, ticker/kolumn, Matcher-lådan med Välj flera → Multiview |
| `sport/mobile/sport-phone.tsx` | Telefonträdet |
| `reminders.ts` (ändras) | Per-påminnelse `leadMs`, `origin: 'sport'`, `replaceSportReminders` |
| `live-tv-reminders-mount.tsx` (ändras) | Startar `startSportAlertSync` |
| `tv/tv-strings.ts` (ändras) | Alla sporttexter EN + SV |
| `tv/tv-rail.tsx`, `tv/tv-shell.tsx`, `tv/tv-views.tsx`, `tv/mobile/mobile-tab-bar.tsx` (ändras) | Rälspost, vy, routing, Mer-arket |
| `tv/tv-player-types.ts`, `tv/tv-player-props.ts`, `tv/tv-player-chrome.tsx`, `tv/player-chrome-parts.tsx` (ändras) | Sportprops till spelaren, Matcher-knapp, ticker, låda |

Testfiler ligger bredvid källfilen (`*.test.ts(x)`), Rust-tester i respektive `mod tests`.

---

## DEL 1 — APPEN (Rust)

### Task 0: Arbetsträd och baslinje

**Files:** inga ändringar i källkod.

**Interfaces:**
- Produces: APP-worktreet på `feature/sportlage` med `node_modules` och `spa/node_modules` symlänkade; gröna baslinjer i båda repona.

- [ ] **Step 1: Skapa APP-worktreet**

```bash
cd "/Users/jerry/Local Sites/Moviefinder"
git worktree add .worktrees/sportlage -b feature/sportlage feature/live-tv-vod-hem
ln -s "/Users/jerry/Local Sites/Moviefinder/node_modules" .worktrees/sportlage/node_modules
ln -s "/Users/jerry/Local Sites/Moviefinder/spa/node_modules" .worktrees/sportlage/spa/node_modules
```

- [ ] **Step 2: Symlänka pluginets node_modules i PLG**

```bash
ln -s "/Users/jerry/Local Sites/lumio-official-plugins/plugins/live-tv/node_modules" "/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/sportlage/plugins/live-tv/node_modules"
```

(Hoppa över om länken redan finns.)

- [ ] **Step 3: Baslinje Rust**

Run: `cd "/Users/jerry/Local Sites/Moviefinder/.worktrees/sportlage/src-tauri" && cargo test --lib live_tv_epg && cargo test --lib xmltv`
Expected: PASS (första bygget i worktreet tar tid — det är väntat).

- [ ] **Step 4: Baslinje plugin**

Run: `cd "/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/sportlage/plugins/live-tv" && npx vitest run && npx tsc --noEmit -p . 2>&1 | tail -5`
Expected: vitest PASS. Notera antal tester och antal typfel (baslinjen; senare tasks får inte lägga till några). Fallerar ett test redan här, stoppa och rapportera — bygg inte vidare på en röd baslinje.

Ingen commit i den här tasken.

---

### Task 1: XMLTV-parsern läser `<category>`, `<sub-title>` och `<live/>`

**Files:**
- Modify: `APP/src-tauri/src/xmltv.rs` (structen `Programme` ~rad 43–50, parsern `parse_xmltv_document_with_limit` ~rad 89–300, `days_since_epoch` ~rad 342)
- Modify: `APP/src-tauri/src/live_tv_epg.rs` (testet `merge_keeps_the_longest_list_per_channel`, fyra `xmltv::Programme`-literaler)
- Test: `APP/src-tauri/src/xmltv.rs` (`mod tests`)

**Interfaces:**
- Produces: `xmltv::Programme { channel, title, description, start_ms, stop_ms, categories: Vec<String>, sub_title: Option<String>, live: bool }` med `#[derive(Debug, Clone, Default)]`; `pub(crate) fn days_since_epoch(year: i32, month: u32, day: u32) -> Option<i64>`.

- [ ] **Step 1: Skriv det fallerande testet** (i `xmltv.rs`, `mod tests`)

```rust
    #[test]
    fn parse_xmltv_reads_category_sub_title_and_live() {
        let xml = r#"<?xml version="1.0"?><tv>
          <programme start="20261010170000 +0000" stop="20261010190000 +0000" channel="A">
            <title>Allsvenskan</title><sub-title>AIK - Hammarby</sub-title>
            <category lang="en">Sports</category><category>Football</category><live/>
          </programme>
          <programme start="20261010190000 +0000" stop="20261010200000 +0000" channel="A"><title>Nyheter</title></programme>
        </tv>"#;
        let out = parse_xmltv(xml, i64::MIN, i64::MAX);
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].sub_title.as_deref(), Some("AIK - Hammarby"));
        assert_eq!(out[0].categories, vec!["Sports".to_string(), "Football".to_string()]);
        assert!(out[0].live);
        // Inget läcker till nästa program.
        assert!(out[1].categories.is_empty());
        assert!(out[1].sub_title.is_none());
        assert!(!out[1].live);
    }
```

- [ ] **Step 2: Kör testet och se det falla**

Run: `cd APP/src-tauri && cargo test --lib xmltv::tests::parse_xmltv_reads_category_sub_title_and_live`
Expected: FAIL — kompileringsfel `no field sub_title on type Programme`.

- [ ] **Step 3: Implementera**

Ersätt structen:

```rust
#[derive(Debug, Clone, Default)]
pub struct Programme {
    pub channel: String,
    pub title: String,
    pub description: Option<String>,
    pub start_ms: i64,
    pub stop_ms: i64,
    /// `<category>` i dokumentordning. Jerrys panel har inga; andra källor har,
    /// och sportdetekteringen använder dem som kanalledtråd.
    pub categories: Vec<String>,
    /// `<sub-title>` — vissa källor lägger "Hemma - Borta" här i stället för i titeln.
    pub sub_title: Option<String>,
    /// `<live/>` — källans egen live-flagga (Jerrys panel använder `ᴸᶦᵛᵉ` i titeln i stället).
    pub live: bool,
}
```

I `parse_xmltv_document_with_limit`: lägg till tillstånd efter `let mut in_display_name = false;`:

```rust
    let mut current_categories: Vec<String> = Vec::new();
    let mut current_category = String::new();
    let mut current_sub: Option<String> = None;
    let mut current_live = false;
    let mut in_category = false;
    let mut in_sub = false;
```

I `Event::Start`-grenen, i `b"programme" =>`-armen efter `in_desc = false;`:

```rust
                        current_categories = Vec::new();
                        current_category.clear();
                        current_sub = None;
                        current_live = false;
                        in_category = false;
                        in_sub = false;
```

och tre nya armar före `_ => {}`:

```rust
                    b"category" if in_programme => {
                        in_category = true;
                        current_category.clear();
                    }
                    b"sub-title" if in_programme => {
                        in_sub = true;
                    }
                    b"live" if in_programme => {
                        current_live = true;
                    }
```

Ersätt hela `Ok(Event::Empty(e)) => { … }`-grenen med:

```rust
            Ok(Event::Empty(e)) => {
                let local = e.name();
                match local.as_ref() {
                    // `<live/>` är den vanliga formen av flaggan.
                    b"live" if in_programme => current_live = true,
                    // Ett självstängt program har ingen titel och tappas.
                    _ => {}
                }
            }
```

I både `Event::Text` och `Event::CData`: byt villkoret `if in_display_name || in_title || in_desc {` mot `if in_display_name || in_title || in_desc || in_category || in_sub {` och lägg till två grenar efter `else if in_desc { … }`:

```rust
                    } else if in_category {
                        current_category.push_str(&s);
                    } else if in_sub {
                        let prev = current_sub.take().unwrap_or_default();
                        current_sub = Some(prev + &s);
                    }
```

I `Event::End`: lägg till armar före `b"programme" =>`:

```rust
                    b"category" => {
                        if in_category {
                            let trimmed = current_category.trim();
                            if !trimmed.is_empty() {
                                current_categories.push(trimmed.to_string());
                            }
                            current_category.clear();
                        }
                        in_category = false;
                    }
                    b"sub-title" => in_sub = false,
```

I `b"programme"`-armen: ersätt `programmes.push(Programme { channel, title, description: current_desc.take(), start_ms: start, stop_ms: stop, });` med

```rust
                                    programmes.push(Programme {
                                        channel,
                                        title,
                                        description: current_desc.take(),
                                        start_ms: start,
                                        stop_ms: stop,
                                        categories: std::mem::take(&mut current_categories),
                                        sub_title: current_sub.take().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
                                        live: current_live,
                                    });
```

och lägg till i återställningen efter `current_desc = None;` (samma arm):

```rust
                            current_categories = Vec::new();
                            current_sub = None;
                            current_live = false;
                            in_category = false;
                            in_sub = false;
```

Gör `days_since_epoch` till `pub(crate) fn days_since_epoch(…)` (sportparsern räknar repriser med den).

I `live_tv_epg.rs`, testet `merge_keeps_the_longest_list_per_channel`: lägg `..Default::default()` sist i var och en av de fyra `xmltv::Programme { … }`-literalerna, t.ex.

```rust
                xmltv::Programme { channel: "c1".into(), title: "b2".into(), description: None, start_ms: 20, stop_ms: 30, ..Default::default() },
```

- [ ] **Step 4: Kör testerna**

Run: `cd APP/src-tauri && cargo test --lib xmltv && cargo test --lib live_tv_epg`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd APP
git add src-tauri/src/xmltv.rs src-tauri/src/live_tv_epg.rs
git commit -m "xmltv: läs category, sub-title och live-flaggan"
```

---

### Task 2: Normalisering av lagnamn och svenska exonymer

**Files:**
- Create: `APP/src-tauri/src/live_tv_sport.rs`
- Modify: `APP/src-tauri/src/lib.rs` (efter `pub mod live_tv_import;`)
- Test: `APP/src-tauri/src/live_tv_sport.rs` (`mod tests`)

**Interfaces:**
- Produces: `pub fn fold(value: &str) -> String` (gemener, diakritik bort, `&`/`och` → `and`, icke-alfanumeriskt → mellanslag, ihopslagna mellanslag); `pub fn team_key(name: &str) -> String`; `pub fn keys_match(a: &str, b: &str) -> bool`; `pub fn strip_live_flag(title: &str) -> (String, bool)`; `pub const LIVE_FLAG: &str = "ᴸᶦᵛᵉ"`.

- [ ] **Step 1: Skriv de fallerande testerna**

Skapa `live_tv_sport.rs` med bara modulkommentar och testmodul:

```rust
//! Sportläge fas 1: sport ur EPG:t, utan ett enda nätanrop.
//!
//! Allt här är ren logik över titlar, beskrivningar och kanalnamn. EPG-lagret
//! (`live_tv_epg.rs`) kör `detect` när XMLTV läses in och lägger resultatet på
//! programmet; `/api/live-tv/sport/day` grupperar det till matcher.
//! Spec: lumio-official-plugins docs/superpowers/specs/2026-10-10-sportlage-design.md

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fold_lowercases_strips_diacritics_and_unifies_and() {
        assert_eq!(fold("Djurgårdens IF"), "djurgardens if");
        assert_eq!(fold("Brighton & Hove Albion"), "brighton and hove albion");
        assert_eq!(fold("Hammarby och Djurgården"), "hammarby and djurgarden");
        assert_eq!(fold("  Örgryte   IS. "), "orgryte is");
        assert_eq!(fold("Nottingham Forest–Leeds"), "nottingham forest leeds");
    }

    #[test]
    fn team_key_strips_affixes_and_maps_exonyms() {
        assert_eq!(team_key("Mjällby AIF"), "mjallby");
        assert_eq!(team_key("IK Sirius"), "sirius");
        assert_eq!(team_key("Malmö FF"), "malmo");
        assert_eq!(team_key("AFC Bournemouth"), "bournemouth");
        assert_eq!(team_key("SSC Napoli"), "napoli");
        // Exonymer — före och efter affixen.
        assert_eq!(team_key("Rumänien"), "romania");
        assert_eq!(team_key("Sverige"), "sweden");
        assert_eq!(team_key("Tjeckien"), "czechia");
        assert_eq!(team_key("FÄRÖARNA"), "faroe islands");
        assert_eq!(team_key("Göteborg"), "ifk goteborg");
        assert_eq!(team_key("IFK Göteborg"), "ifk goteborg");
        assert_eq!(team_key("Man Utd"), "manchester united");
        // Ett namn som bara är affix behåller dem i stället för att bli tomt.
        assert_eq!(team_key("IF"), "if");
    }

    #[test]
    fn keys_match_accepts_genitive_and_short_long_forms() {
        assert!(keys_match("djurgarden", "djurgarden"));
        assert!(keys_match("djurgarden", "djurgardens"));
        assert!(keys_match("helsingborgs", "helsingborg"));
        assert!(keys_match("nybro", "nybro vikings"));
        assert!(keys_match("karlskoga", "bik karlskoga"));
        assert!(keys_match("lulea", "lulea hf"));
        assert!(!keys_match("aik", "hammarby"));
        assert!(!keys_match("", ""));
        assert!(!keys_match("malmo redhawks", "malmo city fc united"));
    }

    #[test]
    fn strip_live_flag_reports_and_cleans() {
        assert_eq!(strip_live_flag("Allsvenskan : GAIS - Sirius ᴸᶦᵛᵉ"), ("Allsvenskan : GAIS - Sirius".to_string(), true));
        assert_eq!(strip_live_flag("Como - Roma Serie A  ᴸᶦᵛᵉ"), ("Como - Roma Serie A".to_string(), true));
        assert_eq!(strip_live_flag("Allsvenskan : GAIS - Sirius"), ("Allsvenskan : GAIS - Sirius".to_string(), false));
    }
}
```

Lägg i `lib.rs` efter `pub mod live_tv_import;`:

```rust
pub mod live_tv_sport;
```

- [ ] **Step 2: Kör och se dem falla**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport`
Expected: FAIL — `cannot find function fold`.

- [ ] **Step 3: Implementera** (ovanför `#[cfg(test)]`)

```rust
use std::collections::HashMap;

use once_cell::sync::Lazy;

/// Leverantörens live-flagga i titeln (upphöjda tecken). Reprisen av samma
/// match saknar den.
pub const LIVE_FLAG: &str = "ᴸᶦᵛᵉ";

/// Föreningsaffix som inte skiljer två lag åt (spec: Normalisering).
const AFFIXES: &[&str] = &["fc", "if", "ik", "aif", "bk", "sk", "hc", "ff", "is", "cf", "afc", "ssc"];

/// Svenska exonymer och vanliga kortformer → kanonisk nyckel. Vänsterledet är
/// redan `fold`at. Utökas efter testfallen (spec).
static EXONYMS: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    [
        ("sverige", "sweden"), ("norge", "norway"), ("danmark", "denmark"), ("finland", "finland"),
        ("island", "iceland"), ("rumanien", "romania"), ("tjeckien", "czechia"), ("nederlanderna", "netherlands"),
        ("holland", "netherlands"), ("tyskland", "germany"), ("frankrike", "france"), ("spanien", "spain"),
        ("italien", "italy"), ("england", "england"), ("skottland", "scotland"), ("wales", "wales"),
        ("irland", "ireland"), ("nordirland", "northern ireland"), ("schweiz", "switzerland"), ("osterrike", "austria"),
        ("belgien", "belgium"), ("kroatien", "croatia"), ("serbien", "serbia"), ("slovenien", "slovenia"),
        ("slovakien", "slovakia"), ("ungern", "hungary"), ("polen", "poland"), ("ukraina", "ukraine"),
        ("vitryssland", "belarus"), ("grekland", "greece"), ("turkiet", "turkey"), ("bulgarien", "bulgaria"),
        ("estland", "estonia"), ("lettland", "latvia"), ("litauen", "lithuania"), ("moldavien", "moldova"),
        ("faroarna", "faroe islands"), ("nordmakedonien", "north macedonia"), ("luxemburg", "luxembourg"),
        ("albanien", "albania"), ("kazakstan", "kazakhstan"), ("georgien", "georgia"), ("armenien", "armenia"),
        ("azerbajdzjan", "azerbaijan"), ("cypern", "cyprus"), ("montenegro", "montenegro"), ("bosnien", "bosnia"),
        ("goteborg", "ifk goteborg"), ("man utd", "manchester united"), ("manchester utd", "manchester united"),
        ("man city", "manchester city"), ("nottingham", "nottingham forest"), ("wolves", "wolverhampton"),
        ("wolverhampton wanderers", "wolverhampton"), ("west brom", "west bromwich"), ("west bromwich albion", "west bromwich"),
        ("psg", "paris saint germain"), ("paris sg", "paris saint germain"), ("spurs", "tottenham"),
        ("tottenham hotspur", "tottenham"), ("inter", "internazionale"), ("inter milan", "internazionale"),
    ]
    .into_iter()
    .collect()
});

/// Gemener, diakritik bort, `&`/`och` → `and`, allt som inte är bokstav eller
/// siffra → mellanslag, ihopslagna mellanslag.
pub fn fold(value: &str) -> String {
    use unicode_normalization::UnicodeNormalization;
    let mut out = String::with_capacity(value.len());
    for c in value.nfd() {
        if unicode_normalization::char::is_combining_mark(c) {
            continue;
        }
        match c {
            'ø' | 'Ø' => out.push('o'),
            'æ' | 'Æ' => out.push_str("ae"),
            'ß' => out.push_str("ss"),
            '&' => out.push_str(" and "),
            c if c.is_alphanumeric() => out.extend(c.to_lowercase()),
            _ => out.push(' '),
        }
    }
    out.split_whitespace()
        .map(|w| if w == "och" { "and" } else { w })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Ett lags jämförbara nyckel: `fold`, exonymer, affix bort.
pub fn team_key(name: &str) -> String {
    let folded = fold(name);
    if let Some(hit) = EXONYMS.get(folded.as_str()) {
        return (*hit).to_string();
    }
    let kept: Vec<&str> = folded.split(' ').filter(|w| !w.is_empty() && !AFFIXES.contains(w)).collect();
    let base = if kept.is_empty() { folded.clone() } else { kept.join(" ") };
    EXONYMS.get(base.as_str()).map(|s| (*s).to_string()).unwrap_or(base)
}

/// Samma lag? Lika, genitiv-s ("djurgardens"), eller kortformen är början
/// eller slutet av den långa ("nybro" / "nybro vikings", "karlskoga" /
/// "bik karlskoga"). Grupperingen kräver dessutom samma sport, liga och tid,
/// så den lösa regeln räcker utan att slå ihop olika matcher.
pub fn keys_match(a: &str, b: &str) -> bool {
    if a.is_empty() || b.is_empty() {
        return false;
    }
    if a == b || format!("{a}s") == b || format!("{b}s") == a {
        return true;
    }
    let (short, long) = if a.len() <= b.len() { (a, b) } else { (b, a) };
    let sw: Vec<&str> = short.split(' ').collect();
    let lw: Vec<&str> = long.split(' ').collect();
    sw.len() < lw.len() && (lw.starts_with(&sw) || lw.ends_with(&sw))
}

/// Titeln utan `ᴸᶦᵛᵉ` och med ihopslagna mellanslag, plus om flaggan fanns.
pub fn strip_live_flag(title: &str) -> (String, bool) {
    let live = title.contains(LIVE_FLAG);
    let cleaned = title.replace(LIVE_FLAG, " ");
    (cleaned.split_whitespace().collect::<Vec<_>>().join(" "), live)
}
```

- [ ] **Step 4: Kör testerna**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport`
Expected: PASS (4 tester).

- [ ] **Step 5: Commit**

```bash
cd APP
git add src-tauri/src/live_tv_sport.rs src-tauri/src/lib.rs
git commit -m "live-tv sport: normalisering av lagnamn och exonymer"
```

---

### Task 3: Ligatabell, kanalheuristik och brusfilter

**Files:**
- Modify: `APP/src-tauri/src/live_tv_sport.rs`
- Test: samma fil

**Interfaces:**
- Consumes: `fold` (Task 2).
- Produces: `pub enum SportKind { Football, Hockey, Basketball, Handball, Motorsport, Tennis, Other }` (serde `lowercase`, `Default = Other`, `Copy, Ord, Hash`); `pub struct League { pub key: &'static str, pub name: &'static str, pub kind: SportKind }` (`Copy`); `pub fn league_info(token: &str) -> Option<League>`; `pub fn league_suffix(text: &str) -> Option<(League, String)>`; `pub fn league_prefix(text: &str) -> Option<(League, String)>`; `pub fn kind_from_channel(text: &str) -> Option<SportKind>`; `pub fn is_noise(parts: &[&str]) -> bool`.

- [ ] **Step 1: Skriv de fallerande testerna** (i `mod tests`)

```rust
    #[test]
    fn league_info_knows_jerrys_leagues() {
        let l = league_info("Allsvenskan").unwrap();
        assert_eq!((l.key, l.kind), ("allsvenskan", SportKind::Football));
        assert_eq!(league_info("SHL").unwrap().kind, SportKind::Hockey);
        assert_eq!(league_info("HockeyAllsvenskan").unwrap().key, "hockeyallsvenskan");
        assert_eq!(league_info("NHL").unwrap().kind, SportKind::Hockey);
        assert_eq!(league_info("EFL Championship").unwrap().key, "efl-championship");
        assert_eq!(league_info("UEFA Nations League").unwrap().key, "uefa-nations-league");
        assert_eq!(league_info("Nations League").unwrap().key, "uefa-nations-league");
        assert_eq!(league_info("Portugisiska Ligan").unwrap().key, "liga-portugal");
        assert_eq!(league_info("F1").unwrap().kind, SportKind::Motorsport);
        assert_eq!(league_info("MotoGP").unwrap().kind, SportKind::Motorsport);
        assert_eq!(league_info("ATP TOUR").unwrap().kind, SportKind::Tennis);
        assert_eq!(league_info("NBA").unwrap().kind, SportKind::Basketball);
        assert_eq!(league_info("Handbollsligan").unwrap().kind, SportKind::Handball);
        assert!(league_info("Premier League Studio").is_none());
        assert!(league_info("Golf").is_none());
    }

    #[test]
    fn league_suffix_and_prefix_split_words() {
        let (l, before) = league_suffix("Mjällby - Degerfors Allsvenskan").unwrap();
        assert_eq!((l.key, before.as_str()), ("allsvenskan", "Mjällby - Degerfors"));
        let (l, before) = league_suffix("Como - Roma Serie A").unwrap();
        assert_eq!((l.key, before.as_str()), ("serie-a", "Como - Roma"));
        assert!(league_suffix("Allsvenskan").is_none(), "minst ett ord måste bli kvar");
        assert!(league_suffix("Hammarby - Djurgården").is_none());
        let (l, rest) = league_prefix("UEFA NATIONS LEAGUE MOLDAVIEN - FÄRÖARNA").unwrap();
        assert_eq!((l.key, rest.as_str()), ("uefa-nations-league", "MOLDAVIEN - FÄRÖARNA"));
    }

    #[test]
    fn kind_from_channel_reads_channel_names_and_ids() {
        assert_eq!(kind_from_channel("TV4 Hockey FHD SE"), Some(SportKind::Hockey));
        assert_eq!(kind_from_channel("VSportFotboll.se"), Some(SportKind::Football));
        assert_eq!(kind_from_channel("V Sport Motor HD SE"), Some(SportKind::Motorsport));
        assert_eq!(kind_from_channel("TV4 Tennis HD SE"), Some(SportKind::Tennis));
        assert_eq!(kind_from_channel("SVENSK HOCKEY"), Some(SportKind::Hockey));
        assert_eq!(kind_from_channel("Eurosport 1 HD SE"), Some(SportKind::Other));
        assert_eq!(kind_from_channel("TV4 Sportkanalen"), Some(SportKind::Other));
        assert_eq!(kind_from_channel("NFL Network"), Some(SportKind::Other));
        assert_eq!(kind_from_channel("SVT1 HD"), None);
        assert_eq!(kind_from_channel("Kanal 5"), None);
    }

    #[test]
    fn noise_words_are_caught_in_any_part() {
        assert!(is_noise(&["Premier League Studio"]));
        assert!(is_noise(&["Hockeylördag: studio"]));
        assert!(is_noise(&["Höjdpunkter"]));
        assert!(is_noise(&["Matchday 4 Highlights"]));
        assert!(is_noise(&["Sändningsuppehåll"]));
        assert!(is_noise(&["Premier League Preview"]));
        assert!(!is_noise(&["GAIS", "IK Sirius"]));
    }
```

- [ ] **Step 2: Kör och se dem falla**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport`
Expected: FAIL — `cannot find type SportKind`.

- [ ] **Step 3: Implementera** (lägg `use serde::{Deserialize, Serialize};` överst)

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SportKind {
    Football,
    Hockey,
    Basketball,
    Handball,
    Motorsport,
    Tennis,
    #[default]
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct League {
    pub key: &'static str,
    pub name: &'static str,
    pub kind: SportKind,
}

/// (alias som `fold`-form, nyckel, visningsnamn, sport). Alias får ha flera ord.
const LEAGUES: &[(&str, &str, &str, SportKind)] = &[
    ("allsvenskan", "allsvenskan", "Allsvenskan", SportKind::Football),
    ("superettan", "superettan", "Superettan", SportKind::Football),
    ("damallsvenskan", "damallsvenskan", "Damallsvenskan", SportKind::Football),
    ("svenska cupen", "svenska-cupen", "Svenska cupen", SportKind::Football),
    ("premier league", "premier-league", "Premier League", SportKind::Football),
    ("epl", "premier-league", "Premier League", SportKind::Football),
    ("efl championship", "efl-championship", "EFL Championship", SportKind::Football),
    ("efl league one", "efl-league-one", "EFL League One", SportKind::Football),
    ("fa cup", "fa-cup", "FA Cup", SportKind::Football),
    ("carabao cup", "efl-cup", "Carabao Cup", SportKind::Football),
    ("la liga", "la-liga", "La Liga", SportKind::Football),
    ("laliga", "la-liga", "La Liga", SportKind::Football),
    ("serie a", "serie-a", "Serie A", SportKind::Football),
    ("bundesliga", "bundesliga", "Bundesliga", SportKind::Football),
    ("ligue 1", "ligue-1", "Ligue 1", SportKind::Football),
    ("eredivisie", "eredivisie", "Eredivisie", SportKind::Football),
    ("portugisiska ligan", "liga-portugal", "Liga Portugal", SportKind::Football),
    ("liga portugal", "liga-portugal", "Liga Portugal", SportKind::Football),
    ("scottish premiership", "scottish-premiership", "Scottish Premiership", SportKind::Football),
    ("eliteserien", "eliteserien", "Eliteserien", SportKind::Football),
    ("superligaen", "superligaen", "Superligaen", SportKind::Football),
    ("mls", "mls", "MLS", SportKind::Football),
    ("uefa champions league", "uefa-champions-league", "Champions League", SportKind::Football),
    ("champions league", "uefa-champions-league", "Champions League", SportKind::Football),
    ("uefa europa league", "uefa-europa-league", "Europa League", SportKind::Football),
    ("europa league", "uefa-europa-league", "Europa League", SportKind::Football),
    ("uefa conference league", "uefa-conference-league", "Conference League", SportKind::Football),
    ("conference league", "uefa-conference-league", "Conference League", SportKind::Football),
    ("uefa nations league", "uefa-nations-league", "UEFA Nations League", SportKind::Football),
    ("nations league", "uefa-nations-league", "UEFA Nations League", SportKind::Football),
    ("shl", "shl", "SHL", SportKind::Hockey),
    ("hockeyallsvenskan", "hockeyallsvenskan", "HockeyAllsvenskan", SportKind::Hockey),
    ("sdhl", "sdhl", "SDHL", SportKind::Hockey),
    ("hockeyettan", "hockeyettan", "Hockeyettan", SportKind::Hockey),
    ("nhl", "nhl", "NHL", SportKind::Hockey),
    ("khl", "khl", "KHL", SportKind::Hockey),
    ("liiga", "liiga", "Liiga", SportKind::Hockey),
    ("champions hockey league", "chl", "Champions Hockey League", SportKind::Hockey),
    ("nba", "nba", "NBA", SportKind::Basketball),
    ("wnba", "wnba", "WNBA", SportKind::Basketball),
    ("euroleague", "euroleague", "EuroLeague", SportKind::Basketball),
    ("basketligan", "basketligan", "Basketligan", SportKind::Basketball),
    ("handbollsligan", "handbollsligan", "Handbollsligan", SportKind::Handball),
    ("ehf champions league", "ehf-champions-league", "EHF Champions League", SportKind::Handball),
    ("f1", "f1", "Formel 1", SportKind::Motorsport),
    ("formel 1", "f1", "Formel 1", SportKind::Motorsport),
    ("formula 1", "f1", "Formel 1", SportKind::Motorsport),
    ("motogp", "motogp", "MotoGP", SportKind::Motorsport),
    ("nascar", "nascar", "NASCAR", SportKind::Motorsport),
    ("indycar", "indycar", "IndyCar", SportKind::Motorsport),
    ("fia wec", "wec", "WEC", SportKind::Motorsport),
    ("wec", "wec", "WEC", SportKind::Motorsport),
    ("dtm", "dtm", "DTM", SportKind::Motorsport),
    ("wrc", "wrc", "WRC", SportKind::Motorsport),
    ("formel e", "formula-e", "Formel E", SportKind::Motorsport),
    ("formula e", "formula-e", "Formel E", SportKind::Motorsport),
    ("atp tour", "atp", "ATP Tour", SportKind::Tennis),
    ("atp", "atp", "ATP Tour", SportKind::Tennis),
    ("wta tour", "wta", "WTA Tour", SportKind::Tennis),
    ("wta", "wta", "WTA Tour", SportKind::Tennis),
    ("major league baseball", "mlb", "MLB", SportKind::Other),
    ("mlb", "mlb", "MLB", SportKind::Other),
    ("nfl", "nfl", "NFL", SportKind::Other),
];

static LEAGUE_INDEX: Lazy<HashMap<&'static str, League>> = Lazy::new(|| {
    LEAGUES.iter().map(|&(alias, key, name, kind)| (alias, League { key, name, kind })).collect()
});
const MAX_LEAGUE_WORDS: usize = 3;

pub fn league_info(token: &str) -> Option<League> {
    LEAGUE_INDEX.get(fold(token).as_str()).copied()
}

/// Sista 1–3 orden som en känd liga, och det som står före. Minst ett ord
/// måste bli kvar ("Häcken - Örgryte Allsvenskan" → Allsvenskan + lagen).
pub fn league_suffix(text: &str) -> Option<(League, String)> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let max = MAX_LEAGUE_WORDS.min(words.len().saturating_sub(1));
    for n in (1..=max).rev() {
        if let Some(league) = league_info(&words[words.len() - n..].join(" ")) {
            return Some((league, words[..words.len() - n].join(" ")));
        }
    }
    None
}

/// Första 1–3 orden som en känd liga, och resten ("UEFA NATIONS LEAGUE MOLDAVIEN - FÄRÖARNA").
pub fn league_prefix(text: &str) -> Option<(League, String)> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let max = MAX_LEAGUE_WORDS.min(words.len().saturating_sub(1));
    for n in (1..=max).rev() {
        if let Some(league) = league_info(&words[..n].join(" ")) {
            return Some((league, words[n..].join(" ")));
        }
    }
    None
}

/// Sport ur ett kanalnamn, tvg-id eller en XMLTV-kategori. `Some(Other)` =
/// en sportkanal utan bestämd sport; `None` = ingen sportkanal alls.
pub fn kind_from_channel(text: &str) -> Option<SportKind> {
    let f = fold(text);
    let word = |w: &str| f.split(' ').any(|t| t == w);
    let part = |s: &str| f.contains(s);
    if word("nfl") {
        return Some(SportKind::Other);
    }
    if part("fotboll") || part("football") || word("soccer") || part("premier league") || word("laliga") || word("epl") {
        return Some(SportKind::Football);
    }
    if part("hockey") || word("nhl") || word("shl") {
        return Some(SportKind::Hockey);
    }
    if part("basket") || word("nba") {
        return Some(SportKind::Basketball);
    }
    if part("handboll") || part("handball") {
        return Some(SportKind::Handball);
    }
    if word("motor") || word("f1") || part("formula") || word("motogp") || word("nascar") || part("racing") {
        return Some(SportKind::Motorsport);
    }
    if part("tennis") {
        return Some(SportKind::Tennis);
    }
    if part("sport") || word("espn") || word("dazn") {
        return Some(SportKind::Other);
    }
    None
}

/// Studio, höjdpunkter, magasin … (spec: Brus). Prövas på de DELAR av titeln
/// som blir lag eller event, inte på hela titeln — "Inter - Parma Serie A :
/// Serie A Highlights Show ᴸᶦᵛᵉ" är matchen själv.
const NOISE: &[&str] = &[
    "sandningsuppehall", "studio", "forstudio", "efterstudio", "hojdpunkter", "highlights", "magasin",
    "magazine", "preview", "classic", "classics", "sammanfattning", "weekly", "stories", "show", "dokumentar",
];

pub fn is_noise(parts: &[&str]) -> bool {
    parts.iter().any(|p| fold(p).split(' ').any(|w| NOISE.contains(&w)))
}
```

- [ ] **Step 4: Kör testerna**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd APP
git add src-tauri/src/live_tv_sport.rs
git commit -m "live-tv sport: ligatabell, kanalheuristik och brusfilter"
```

---

### Task 4: Titel- och desc-parsern, `detect`

**Files:**
- Modify: `APP/src-tauri/src/live_tv_sport.rs`
- Test: samma fil

**Interfaces:**
- Consumes: Task 2–3 (`fold`, `team_key`, `keys_match`, `strip_live_flag`, `league_info`, `league_suffix`, `kind_from_channel`, `is_noise`), `crate::xmltv::days_since_epoch` (Task 1).
- Produces:
  - `pub struct SportInfo { pub kind: SportKind, pub league: String, pub league_key: String, pub home: Option<String>, pub away: Option<String>, pub home_key: Option<String>, pub away_key: Option<String>, pub event: Option<String>, pub live: bool, pub rerun: bool, pub round: Option<u32>, pub venue: Option<String> }` — `Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default`, serde `camelCase`, `Option`-fält `default` + `skip_serializing_if = "Option::is_none"`.
  - `pub struct ParsedTitle { pub league: Option<League>, pub kind: SportKind, pub home: Option<String>, pub away: Option<String>, pub event: Option<String>, pub live: bool }`
  - `pub fn split_teams(s: &str) -> Option<(String, String)>` (hemma först; `A at H` vänds)
  - `pub fn parse_title(title: &str, channel_kind: Option<SportKind>) -> Option<ParsedTitle>`
  - `pub struct DescInfo { pub round: Option<u32>, pub venue: Option<String>, pub aired: Option<(u32, u32, i32)>, pub home_long: Option<String>, pub away_long: Option<String> }` + `pub fn parse_desc(desc: &str) -> DescInfo`
  - `pub fn detect(title: &str, sub_title: Option<&str>, desc: Option<&str>, categories: &[String], live_tag: bool, channel_names: &[String], start_ms: i64) -> Option<SportInfo>`

Regler (spec "Sportdetektering", i ordning): titeln utan `ᴸᶦᵛᵉ`; `Liga : Hemma - Borta` (känd liga; samma liga upprepad sist tas bort: "SHL : Djurgården - Linköping SHL"); TV4-formen `H - A Liga : Hemma Lång - Borta Lång` där de långa namnen föredras om de är samma lag; `H - A Liga` utan kolon; `A at H` (borta först) och `H vs. A` bara när kanalen/kategorin är sport. Motorsport och tennis är event utan lag ("F1 : Singapores GP - Kval" → event). Lagsporter kräver två lag. Brus prövas på de delar som blir lag/event. Ur desc: `omgång N`, `Från {arena}` / `Plats: {arena}`, `där X ställs mot Y i` (långa namn), `(dd/mm-yy)` ≠ sändningsdatum → repris.

- [ ] **Step 1: Skriv de fallerande testerna** — riktiga rader ur Jerrys flöde (research §2, uppmätt 2026-10-10)

```rust
    const T_1700Z: i64 = 1_791_651_600_000; // 2026-10-10 17:00 UTC
    const T_1200Z: i64 = 1_791_633_600_000; // 2026-10-10 12:00 UTC
    const T_2300Z: i64 = 1_791_673_200_000; // 2026-10-10 23:00 UTC (01:00 svensk tid den 11:e)

    fn det(title: &str, desc: Option<&str>, channel: &str, start: i64) -> Option<SportInfo> {
        detect(title, None, desc, &[], false, &[channel.to_string()], start)
    }

    #[test]
    fn detects_league_colon_home_away_with_desc() {
        let s = det(
            "Allsvenskan : GAIS - Sirius ᴸᶦᵛᵉ",
            Some("S2026 E180 Fotboll från Gamla Ullevi där GAIS ställs mot IK Sirius i omgång 23 av Allsvenskan. I studion på plats finns Axel Pileby."),
            "TV4Fotboll.se",
            T_1700Z,
        )
        .expect("match");
        assert_eq!(s.kind, SportKind::Football);
        assert_eq!((s.league.as_str(), s.league_key.as_str()), ("Allsvenskan", "allsvenskan"));
        assert_eq!((s.home.as_deref(), s.away.as_deref()), (Some("GAIS"), Some("IK Sirius")));
        assert_eq!((s.home_key.as_deref(), s.away_key.as_deref()), (Some("gais"), Some("sirius")));
        assert!(s.live && !s.rerun);
        assert_eq!(s.round, Some(23));
        assert_eq!(s.venue.as_deref(), Some("Gamla Ullevi"));
    }

    #[test]
    fn detects_tv4_forms_and_prefers_long_names() {
        let s = det("Mjällby - Degerfors Allsvenskan : Mjällby AIF - Degerfors IF ᴸᶦᵛᵉ", None, "TV4SportLive1.se", T_1700Z).unwrap();
        assert_eq!((s.home.as_deref(), s.away.as_deref()), (Some("Mjällby AIF"), Some("Degerfors IF")));
        assert_eq!((s.home_key.as_deref(), s.away_key.as_deref()), (Some("mjallby"), Some("degerfors")));
        assert_eq!(s.league_key, "allsvenskan");

        let s = det(
            "Häcken - Örgryte Allsvenskan  ᴸᶦᵛᵉ",
            Some("S2026 E185 Fotboll från Nordic Wellness Arena där BK Häcken ställs mot Örgryte IS i omgång 23 av Allsvenskan."),
            "TV4SportLive1.se",
            T_1700Z,
        )
        .unwrap();
        assert_eq!((s.home.as_deref(), s.away.as_deref()), (Some("BK Häcken"), Some("Örgryte IS")));
        assert_eq!(s.home_key.as_deref(), Some("hacken"));

        // Titeln avslutas med ett studiopåhäng — matchen är ändå matchen.
        let s = det("Inter - Parma Serie A : Serie A Highlights Show ᴸᶦᵛᵉ", None, "TV4Fotboll.se", T_1700Z).unwrap();
        assert_eq!((s.home.as_deref(), s.away.as_deref(), s.league_key.as_str()), (Some("Inter"), Some("Parma"), "serie-a"));
    }

    #[test]
    fn detects_repeated_league_and_genitive_long_names() {
        let s = det(
            "SHL : Djurgården - Linköping SHL ᴸᶦᵛᵉ",
            Some("S2026 E113 Ishockey från Hovet där Djurgårdens IF ställs mot Linköping HC i SHL. Kommentator: Björn Oldeen."),
            "TV4SportLive2.se",
            T_1700Z,
        )
        .unwrap();
        assert_eq!(s.kind, SportKind::Hockey);
        assert_eq!((s.home.as_deref(), s.away.as_deref()), (Some("Djurgårdens IF"), Some("Linköping HC")));
        assert_eq!(s.venue.as_deref(), Some("Hovet"));
    }

    #[test]
    fn rerun_is_read_from_the_aired_date() {
        // Sänd 01:00 svensk tid den 11:e, desc säger 10/10 → samma sändning, inte repris.
        let live = det("NHL : Boston Bruins - Philadelphia Flyers ᴸᶦᵛᵉ", Some("S2026 E50 Från TD Garden, Boston. (10/10-26)."), "VSportVinter.se", T_2300Z).unwrap();
        assert!(live.live && !live.rerun);
        assert_eq!(live.venue.as_deref(), Some("TD Garden"));
        let rerun = det(
            "Bundesliga : Dortmund - Werder Bremen",
            Some("S26 E25 Omgång 5. Från Signal Iduna Park, Dortmund. Kommentator: Magnus Dahlborn. (9/10-26)."),
            "VSport1.se",
            T_1200Z,
        )
        .unwrap();
        assert!(rerun.rerun && !rerun.live);
        assert_eq!((rerun.round, rerun.venue.as_deref()), (Some(5), Some("Signal Iduna Park")));
    }

    #[test]
    fn detects_at_and_vs_only_on_sport_channels() {
        let s = det("Toronto Maple Leafs at Colorado Avalanche", None, "NHL Network", T_1700Z).unwrap();
        assert_eq!(s.kind, SportKind::Hockey);
        assert_eq!((s.home.as_deref(), s.away.as_deref()), (Some("Colorado Avalanche"), Some("Toronto Maple Leafs")));
        assert_eq!(s.league_key, "");
        let s = det("Arsenal vs. Leeds United", None, "Sky Sports Premier League", T_1700Z).unwrap();
        assert_eq!((s.kind, s.home.as_deref()), (SportKind::Football, Some("Arsenal")));
        assert!(det("Arsenal vs. Leeds United", None, "SVT1 HD", T_1700Z).is_none());
        // En XMLTV-kategori räcker som ledtråd.
        let s = detect("Arsenal vs. Leeds United", None, None, &["Sports".to_string()], true, &["BBC One".to_string()], T_1700Z).unwrap();
        assert!(s.live);
    }

    #[test]
    fn detects_exonyms_events_and_sub_titles() {
        let s = det("UEFA Nations League : Rumänien - Sverige", None, "TV4Fotboll.se", T_1700Z).unwrap();
        assert_eq!((s.home_key.as_deref(), s.away_key.as_deref()), (Some("romania"), Some("sweden")));
        let f1 = det("F1 : Singapores GP - Kval ᴸᶦᵛᵉ", None, "VSportMotor.se", T_1700Z).unwrap();
        assert_eq!((f1.kind, f1.event.as_deref(), f1.home.as_deref()), (SportKind::Motorsport, Some("Singapores GP - Kval"), None));
        let atp = det("ATP TOUR: Shanghai Masters 1000  ᴸᶦᵛᵉ", None, "TV4Tennis.se", T_1700Z).unwrap();
        assert_eq!((atp.kind, atp.event.as_deref()), (SportKind::Tennis, Some("Shanghai Masters 1000")));
        let sub = detect("Allsvenskan", Some("AIK - Hammarby"), None, &[], false, &["TV4 Fotboll".to_string()], T_1700Z).unwrap();
        assert_eq!((sub.home_key.as_deref(), sub.away_key.as_deref()), (Some("aik"), Some("hammarby")));
    }

    #[test]
    fn noise_and_non_matches_are_rejected() {
        for (title, channel) in [
            ("Hockeylördag : Hockeylördag: studio ᴸᶦᵛᵉ", "TV4Hockey.se"),
            ("Premier League Studio : Förstudio ᴸᶦᵛᵉ", "VSportPremium.se"),
            ("Höjdpunkter", "TV4Fotboll.se"),
            ("Sändningsuppehåll", "TV4Fotboll.se"),
            ("UEFA Nations League : Matchday 4 Highlights", "VSportPremium.se"),
            ("Premier League  ᴸᶦᵛᵉ", "VSport1.se"),
            ("Champions League Magazine : UEFA Champions League Magazine Show", "VSport1.se"),
            ("Wikegård vs Håkan Loob : Håkan Loob", "TV4Sportkanalen.se"),
            ("KNOCKOUTS! : Arturo Gatti vs. Alfonso Gomez", "FightSports.se"),
            ("Formel 1 Highlights : Bahrains GP", "VSportExtra.se"),
            ("DP World Tour : Fedex Open De España - Day 2", "VSportGolf.se"),
            ("Mitt liv som skidskytt - del 2", "TV4Sportkanalen.se"),
        ] {
            assert!(det(title, None, channel, T_1700Z).is_none(), "{title} ska inte bli en match");
        }
    }

    #[test]
    fn parse_desc_reads_round_venue_names_and_date() {
        let d = parse_desc("S26 E62 Kommentering: Engelska.Plats: The Valley.");
        assert_eq!(d.venue.as_deref(), Some("The Valley"));
        let d = parse_desc("S2026 E99 Ishockey från Hägglunds Arena där MoDo ställs mot BIK Karlskoga i HockeyAllsvenskan.");
        assert_eq!((d.home_long.as_deref(), d.away_long.as_deref()), (Some("MoDo"), Some("BIK Karlskoga")));
        assert_eq!(d.venue.as_deref(), Some("Hägglunds Arena"));
        let d = parse_desc("S26 E26 Omgång 5. Från RheinEnergieStadion, Köln. (11/10-26).");
        assert_eq!((d.round, d.aired), (Some(5), Some((11, 10, 2026))));
        assert_eq!(parse_desc("Höjdpunkter från den senaste omgången av Bundesliga.").round, None);
    }
```

- [ ] **Step 2: Kör och se dem falla**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport`
Expected: FAIL — `cannot find function detect`.

- [ ] **Step 3: Implementera** (lägg `use regex::Regex;` överst)

```rust
/// Det EPG-lagret lägger på ett sportprogram (pluginets `sport`-fält).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SportInfo {
    pub kind: SportKind,
    #[serde(default)]
    pub league: String,
    #[serde(default)]
    pub league_key: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub home: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub away: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub home_key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub away_key: Option<String>,
    /// Lagsportlösa event (motorsport, tennis): "Singapores GP - Kval".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub event: Option<String>,
    #[serde(default)]
    pub live: bool,
    #[serde(default)]
    pub rerun: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub round: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub venue: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedTitle {
    pub league: Option<League>,
    pub kind: SportKind,
    pub home: Option<String>,
    pub away: Option<String>,
    pub event: Option<String>,
    pub live: bool,
}

static VS_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)^(.+?)\s+vs\.?\s+(.+)$").unwrap());
static AT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^(.+?)\s+at\s+(.+)$").unwrap());
static ROUND_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)\bomgång\s+(\d{1,3})\b").unwrap());
static VENUE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)\bfrån\s+(.+?)(?:\s+där\s|,|\.|$)").unwrap());
static PLATS_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)\bplats:\s*([^.]+)").unwrap());
static AIRED_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\((\d{1,2})/(\d{1,2})-(\d{2})\)").unwrap());
static LONG_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)\bdär\s+(.+?)\s+ställs\s+mot\s+(.+?)\s+i\s").unwrap());

/// En lagsida: 1–5 ord och minst en bokstav.
fn plausible_side(s: &str) -> bool {
    let words = s.split_whitespace().count();
    (1..=5).contains(&words) && s.chars().any(char::is_alphabetic)
}

fn split_vs_at(s: &str) -> Option<(String, String)> {
    if let Some(c) = VS_RE.captures(s) {
        let (h, a) = (c[1].trim(), c[2].trim());
        if plausible_side(h) && plausible_side(a) {
            return Some((h.to_string(), a.to_string()));
        }
    }
    if let Some(c) = AT_RE.captures(s) {
        // "Borta at Hemma" — USA-flödenas ordning.
        let (a, h) = (c[1].trim(), c[2].trim());
        if plausible_side(h) && plausible_side(a) {
            return Some((h.to_string(), a.to_string()));
        }
    }
    None
}

/// "Hemma - Borta" (exakt ett " - "), annars vs/at.
pub fn split_teams(s: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = s.split(" - ").collect();
    if parts.len() == 2 && plausible_side(parts[0]) && plausible_side(parts[1]) {
        return Some((parts[0].trim().to_string(), parts[1].trim().to_string()));
    }
    split_vs_at(s)
}

fn strip_same_league_suffix(text: &str, league: League) -> String {
    match league_suffix(text) {
        Some((l, before)) if l.key == league.key => before,
        _ => text.to_string(),
    }
}

fn is_event_sport(kind: SportKind) -> bool {
    matches!(kind, SportKind::Motorsport | SportKind::Tennis)
}

pub fn parse_title(title: &str, channel_kind: Option<SportKind>) -> Option<ParsedTitle> {
    let (clean, live) = strip_live_flag(title);
    if clean.is_empty() {
        return None;
    }
    let teams = |league: Option<League>, h: String, a: String| -> Option<ParsedTitle> {
        let kind = league.map(|l| l.kind).or(channel_kind)?;
        if is_noise(&[&h, &a]) {
            return None;
        }
        Some(ParsedTitle { league, kind, home: Some(h), away: Some(a), event: None, live })
    };
    let event = |league: League, name: String| -> Option<ParsedTitle> {
        if name.is_empty() || is_noise(&[&name]) {
            return None;
        }
        Some(ParsedTitle { league: Some(league), kind: league.kind, home: None, away: None, event: Some(name), live })
    };

    if let Some((prefix, rest)) = clean.split_once(':') {
        let (prefix, rest) = (prefix.trim(), rest.trim());
        if let Some(league) = league_info(prefix) {
            let rest = strip_same_league_suffix(rest, league);
            if is_event_sport(league.kind) {
                return event(league, rest);
            }
            let (h, a) = split_teams(&rest)?;
            return teams(Some(league), h, a);
        }
        // TV4: "Mjällby - Degerfors Allsvenskan : Mjällby AIF - Degerfors IF".
        if let Some((league, before)) = league_suffix(prefix) {
            let (hs, aws) = split_teams(&before)?;
            let long = split_teams(&strip_same_league_suffix(rest, league));
            let (h, a) = match long {
                Some((hl, al)) if keys_match(&team_key(&hs), &team_key(&hl)) && keys_match(&team_key(&aws), &team_key(&al)) => (hl, al),
                _ => (hs, aws),
            };
            return teams(Some(league), h, a);
        }
        return None;
    }
    if let Some((league, before)) = league_suffix(&clean) {
        if let Some((h, a)) = split_teams(&before) {
            return teams(Some(league), h, a);
        }
    }
    if let Some(league) = league_info(&clean) {
        // "F1 ᴸᶦᵛᵉ" är en sändning; "Premier League ᴸᶦᵛᵉ" saknar lag och är ingen match.
        return if is_event_sport(league.kind) { event(league, league.name.to_string()) } else { None };
    }
    if channel_kind.is_some() {
        if let Some((h, a)) = split_vs_at(&clean) {
            return teams(None, h, a);
        }
    }
    None
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct DescInfo {
    pub round: Option<u32>,
    pub venue: Option<String>,
    /// (dag, månad, år) ur "(10/10-26)".
    pub aired: Option<(u32, u32, i32)>,
    pub home_long: Option<String>,
    pub away_long: Option<String>,
}

pub fn parse_desc(desc: &str) -> DescInfo {
    let round = ROUND_RE.captures(desc).and_then(|c| c[1].parse().ok());
    let venue = VENUE_RE
        .captures(desc)
        .or_else(|| PLATS_RE.captures(desc))
        .map(|c| c[1].trim().to_string())
        .filter(|v| !v.is_empty());
    let aired = AIRED_RE.captures(desc).and_then(|c| {
        let d: u32 = c[1].parse().ok()?;
        let m: u32 = c[2].parse().ok()?;
        let y: i32 = c[3].parse().ok()?;
        Some((d, m, 2000 + y))
    });
    let (home_long, away_long) = match LONG_RE.captures(desc) {
        Some(c) => (Some(c[1].trim().to_string()), Some(c[2].trim().to_string())),
        None => (None, None),
    };
    DescInfo { round, venue, aired, home_long, away_long }
}

/// Sändes programmet det datum desc anger? Svensk tid ligger 0–2 h före UTC,
/// så programmets UTC-datum, +1 h och +2 h prövas — utan tidszonsbibliotek.
fn aired_on((d, m, y): (u32, u32, i32), start_ms: i64) -> bool {
    let Some(day) = crate::xmltv::days_since_epoch(y, m, d) else { return true };
    [0i64, 1, 2].iter().any(|h| (start_ms + h * 3_600_000).div_euclid(86_400_000) == day)
}

/// Sportfältet för ett program, eller `None` om det inte är en match/ett event.
pub fn detect(
    title: &str,
    sub_title: Option<&str>,
    desc: Option<&str>,
    categories: &[String],
    live_tag: bool,
    channel_names: &[String],
    start_ms: i64,
) -> Option<SportInfo> {
    let channel_kind = channel_names
        .iter()
        .find_map(|n| kind_from_channel(n))
        .or_else(|| categories.iter().find_map(|c| kind_from_channel(c)));
    let parsed = parse_title(title, channel_kind).or_else(|| {
        let sub = sub_title?.trim();
        if sub.is_empty() {
            return None;
        }
        parse_title(&format!("{} : {}", title.trim(), sub), channel_kind)
    })?;
    let d = desc.map(parse_desc).unwrap_or_default();
    let (mut home, mut away) = (parsed.home, parsed.away);
    let use_long = match (&home, &away, &d.home_long, &d.away_long) {
        (Some(h), Some(a), Some(hl), Some(al)) => keys_match(&team_key(h), &team_key(hl)) && keys_match(&team_key(a), &team_key(al)),
        _ => false,
    };
    if use_long {
        home = d.home_long.clone();
        away = d.away_long.clone();
    }
    let rerun = d.aired.map(|date| !aired_on(date, start_ms)).unwrap_or(false);
    Some(SportInfo {
        kind: parsed.kind,
        league: parsed.league.map(|l| l.name.to_string()).unwrap_or_default(),
        league_key: parsed.league.map(|l| l.key.to_string()).unwrap_or_default(),
        home_key: home.as_deref().map(team_key),
        away_key: away.as_deref().map(team_key),
        home,
        away,
        event: parsed.event,
        live: parsed.live || live_tag,
        rerun,
        round: d.round,
        venue: d.venue,
    })
}
```

- [ ] **Step 4: Kör testerna**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport`
Expected: PASS. Fallerar en rad ur Jerrys flöde: rätta regeln, inte testet — raderna är facit.

- [ ] **Step 5: Commit**

```bash
cd APP
git add src-tauri/src/live_tv_sport.rs
git commit -m "live-tv sport: titel- och desc-parser med riktiga EPG-rader"
```

---

### Task 5: EPG-lagret bär `sport`, 30 h bakåt bara för sport, gamla butiker berikas

**Files:**
- Modify: `APP/src-tauri/src/xmltv.rs` (ny `parse_xmltv_document_filtered`; `parse_xmltv_document_with_limit` delegerar)
- Modify: `APP/src-tauri/src/live_tv_sport.rs` (`SPORT_VERSION`, `SPORT_WINDOW_BEFORE_MS`, `may_be_sport_title`)
- Modify: `APP/src-tauri/src/live_tv_epg.rs` (`Programme`, `EpgStore`, `EpgAccumulator`, `refresh_with`, nya `enrich_sport` + `sport_ready_store`, synlighet)
- Test: `xmltv.rs`, `live_tv_epg.rs` (`mod tests`)

**Interfaces:**
- Consumes: `detect`, `parse_title`, `SportKind` (Task 4), `xmltv::Programme.{categories,sub_title,live}` (Task 1).
- Produces:
  - `xmltv::parse_xmltv_document_filtered(xml: &str, window_start_ms: i64, window_end_ms: i64, max_programmes: usize, past_cutoff_ms: i64, keep_past: &dyn Fn(&str) -> bool) -> ParsedXmltv`
  - `live_tv_sport::{SPORT_VERSION: u32 = 1, SPORT_WINDOW_BEFORE_MS: i64 = 30 h, may_be_sport_title(title: &str) -> bool}`
  - `live_tv_epg::Programme { title, description, start, stop, sport: Option<SportInfo> }`; `EpgStore.sport_version: u32`; `EpgAccumulator::with_past_cutoff(cutoff_ms: i64) -> EpgAccumulator`
  - `pub fn enrich_sport(store: &mut EpgStore)`; `pub(crate) async fn sport_ready_store(state: &AxumState, list_id: &str) -> Option<Arc<EpgStore>>`
  - Synliga för `live_tv_sport`: `pub(crate) fn key_of`, `pub(crate) fn tvg_id_for`, `pub(crate) async fn put_store`, `pub(crate) async fn persist`, `#[cfg(test)] pub(crate) async fn insert_store_for_test`.

- [ ] **Step 1: Skriv de fallerande testerna**

I `xmltv.rs` (`mod tests`):

```rust
    #[test]
    fn filtered_parse_keeps_old_programmes_only_when_the_predicate_says_so() {
        let xml = r#"<?xml version="1.0"?><tv>
          <programme start="20260513080000 +0000" stop="20260513100000 +0000" channel="A"><title>Allsvenskan : AIK - Hammarby</title></programme>
          <programme start="20260513080000 +0000" stop="20260513100000 +0000" channel="B"><title>Nyheter</title></programme>
          <programme start="20260513200000 +0000" stop="20260513210000 +0000" channel="B"><title>Kvällsnytt</title></programme>
        </tv>"#;
        let cutoff = parse_xmltv_time("20260513110000 +0000").unwrap();
        let out = parse_xmltv_document_filtered(xml, i64::MIN, i64::MAX, 100, cutoff, &|t: &str| t.starts_with("Allsvenskan"));
        let titles: Vec<&str> = out.programmes.iter().map(|p| p.title.as_str()).collect();
        assert_eq!(titles, vec!["Allsvenskan : AIK - Hammarby", "Kvällsnytt"]);
    }
```

I `live_tv_epg.rs` (`mod tests`):

```rust
    #[test]
    fn accumulator_keeps_old_programmes_only_when_they_are_sport() {
        let doc = ParsedXmltv {
            channels: vec![XmltvChannel { id: "TV4Fotboll.se".into(), display_names: vec!["TV4 Fotboll".into()] }],
            programmes: vec![
                xmltv::Programme { channel: "TV4Fotboll.se".into(), title: "Allsvenskan : AIK - Hammarby ᴸᶦᵛᵉ".into(), start_ms: 0, stop_ms: 7_200_000, ..Default::default() },
                xmltv::Programme { channel: "TV4Fotboll.se".into(), title: "Fotbollsmagasinet".into(), start_ms: 7_200_000, stop_ms: 9_000_000, ..Default::default() },
                xmltv::Programme { channel: "TV4Fotboll.se".into(), title: "Nyheter".into(), start_ms: 20_000_000, stop_ms: 21_000_000, ..Default::default() },
            ],
        };
        let mut acc = EpgAccumulator::with_past_cutoff(10_000_000);
        acc.absorb(doc);
        let (_, programmes) = acc.finish();
        let list = &programmes["TV4Fotboll.se"];
        assert_eq!(list.iter().map(|p| p.title.as_str()).collect::<Vec<_>>(), vec!["Allsvenskan : AIK - Hammarby ᴸᶦᵛᵉ", "Nyheter"]);
        let sport = list[0].sport.as_ref().expect("matchen är sport");
        assert_eq!(sport.home_key.as_deref(), Some("aik"));
        assert!(sport.live);
        assert!(list[1].sport.is_none());
    }

    #[test]
    fn enrich_sport_marks_an_old_store_without_fetching() {
        let mut store = EpgStore {
            list_id: "gammal".into(),
            channels: vec![XmltvChannel { id: "TV4Hockey.se".into(), display_names: vec!["TV4 Hockey".into()] }],
            programmes: [(
                "TV4Hockey.se".to_string(),
                vec![
                    Programme { title: "SHL : HV71 - Brynäs ᴸᶦᵛᵉ".into(), description: None, start: 0, stop: 1, sport: None },
                    Programme { title: "Hockeykväll".into(), description: None, start: 1, stop: 2, sport: None },
                ],
            )]
            .into_iter()
            .collect(),
            ..Default::default()
        };
        assert_eq!(store.sport_version, 0);
        enrich_sport(&mut store);
        assert_eq!(store.sport_version, crate::live_tv_sport::SPORT_VERSION);
        assert_eq!(store.programmes["TV4Hockey.se"][0].sport.as_ref().unwrap().league_key, "shl");
        assert!(store.programmes["TV4Hockey.se"][1].sport.is_none());
    }

    #[test]
    fn refresh_keeps_sport_thirty_hours_back_and_the_rest_six() {
        let rt = Runtime::new().unwrap();
        let state = Arc::new(AxumState::test_default());
        rt.block_on(async {
            put_store("lista-sport-30h", None).await;
            let now = now_ms();
            let old = now - 20 * 3_600_000;
            let doc = format!(
                "<?xml version=\"1.0\"?><tv>\n<channel id=\"TV4Hockey.se\"><display-name>TV4 Hockey</display-name></channel>\n\
                 <programme start=\"{a}\" stop=\"{b}\" channel=\"TV4Hockey.se\"><title>SHL : HV71 - Brynäs ᴸᶦᵛᵉ</title></programme>\n\
                 <programme start=\"{b}\" stop=\"{c}\" channel=\"TV4Hockey.se\"><title>Hockeykväll</title></programme>\n\
                 <programme start=\"{d}\" stop=\"{e}\" channel=\"TV4Hockey.se\"><title>Nyheter</title></programme>\n</tv>",
                a = xmltv_time(old),
                b = xmltv_time(old + 3 * 3_600_000),
                c = xmltv_time(old + 4 * 3_600_000),
                d = xmltv_time(now + 60_000),
                e = xmltv_time(now + 3_600_000),
            );
            let job = crate::live_tv_import::start_job();
            refresh_with(&state, &job, "lista-sport-30h", &["https://a/epg.xml".to_string()], &[], true, |_url: String| {
                let doc = doc.clone();
                async move { Ok(doc) }
            })
            .await
            .expect("hämtningen lyckades");
            let store = store_for(&state, "lista-sport-30h").await.expect("butik");
            let titles: Vec<&str> = store.programmes["TV4Hockey.se"].iter().map(|p| p.title.as_str()).collect();
            assert_eq!(titles, vec!["SHL : HV71 - Brynäs ᴸᶦᵛᵉ", "Nyheter"]);
            assert_eq!(store.sport_version, crate::live_tv_sport::SPORT_VERSION);
            assert_eq!(store.programmes["TV4Hockey.se"][0].sport.as_ref().unwrap().league_key, "shl");
        });
    }

    #[test]
    fn sport_ready_store_enriches_once_in_memory() {
        let rt = Runtime::new().unwrap();
        let state = Arc::new(AxumState::test_default());
        rt.block_on(async {
            insert_store_for_test(EpgStore {
                list_id: "lista-berikas".into(),
                programmes: [(
                    "TV4Fotboll.se".to_string(),
                    vec![Programme { title: "Allsvenskan : GAIS - Sirius".into(), description: None, start: 0, stop: 1, sport: None }],
                )]
                .into_iter()
                .collect(),
                ..Default::default()
            })
            .await;
            let store = sport_ready_store(&state, "lista-berikas").await.expect("butik");
            assert_eq!(store.sport_version, crate::live_tv_sport::SPORT_VERSION);
            assert!(store.programmes["TV4Fotboll.se"][0].sport.is_some());
            // Nästa läsning får den berikade butiken ur minnet.
            let again = store_for(&state, "lista-berikas").await.unwrap();
            assert_eq!(again.sport_version, crate::live_tv_sport::SPORT_VERSION);
        });
    }
```

- [ ] **Step 2: Kör och se dem falla**

Run: `cd APP/src-tauri && cargo test --lib live_tv_epg && cargo test --lib xmltv`
Expected: FAIL — kompileringsfel (`no field sport`, `with_past_cutoff`, `parse_xmltv_document_filtered` saknas).

- [ ] **Step 3: Implementera**

`live_tv_sport.rs`:

```rust
/// Höjs när detekteringen ändras så att butiker på disk berikas om (lokalt, utan hämtning).
pub const SPORT_VERSION: u32 = 1;
/// "Igår" kräver ~30 h bakåt — men bara för sport (spec: Fönstret bakåt).
pub const SPORT_WINDOW_BEFORE_MS: i64 = 30 * 60 * 60 * 1000;

/// Parserns billiga förfilter för program äldre än 6 h: kan titeln alls bli
/// sport? Kanalen är okänd där, så vs/at-titlar släpps igenom och avgörs av
/// `detect` med kanalens namn i ackumulatorn.
pub fn may_be_sport_title(title: &str) -> bool {
    parse_title(title, Some(SportKind::Other)).is_some()
}
```

`xmltv.rs`: döp om kroppen av `parse_xmltv_document_with_limit` till

```rust
/// Som `parse_xmltv_document_with_limit`, men program som slutar före
/// `past_cutoff_ms` behålls bara om `keep_past(titel)` säger ja. EPG-lagret
/// läser 30 h bakåt för sportens skull utan att de 24 extra timmarna av
/// allt annat någonsin hamnar i minnet eller räknas mot taket.
pub(crate) fn parse_xmltv_document_filtered(
    xml: &str,
    window_start_ms: i64,
    window_end_ms: i64,
    max_programmes: usize,
    past_cutoff_ms: i64,
    keep_past: &dyn Fn(&str) -> bool,
) -> ParsedXmltv {
```

(oförändrad kropp utom villkoret i `b"programme"`-armen, som blir)

```rust
                                if stop >= window_start_ms
                                    && start <= window_end_ms
                                    && (stop >= past_cutoff_ms || keep_past(&title))
                                {
```

och låt den gamla funktionen delegera:

```rust
pub(crate) fn parse_xmltv_document_with_limit(
    xml: &str,
    window_start_ms: i64,
    window_end_ms: i64,
    max_programmes: usize,
) -> ParsedXmltv {
    parse_xmltv_document_filtered(xml, window_start_ms, window_end_ms, max_programmes, window_start_ms, &|_| true)
}
```

`live_tv_epg.rs`:

1. `Programme` får ett fält sist:

```rust
    /// Satt när programmet är en match eller ett sportevent (`live_tv_sport::detect`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sport: Option<crate::live_tv_sport::SportInfo>,
```

Lägg `sport: None` i de sju testliteralerna `Programme { … }` i `mod tests` (i `fn programmes`, i `now_next_later_matches_plugin_rules` ×2, i `search_handler_finds_programmes_by_title` ×3 och i den andra `.map(|i| Programme {`-hjälparen); `cargo build` pekar ut dem med E0063.

2. `EpgStore` får ett fält efter `programmes`:

```rust
    /// `live_tv_sport::SPORT_VERSION` när sportfälten sattes; 0 = skriven före sportläget.
    #[serde(default)]
    pub sport_version: u32,
```

3. `EpgAccumulator`: nytt fält och konstruktor, och detektering i `absorb`:

```rust
#[derive(Default)]
pub struct EpgAccumulator {
    channel_order: Vec<String>,
    channels: HashMap<String, XmltvChannel>,
    programmes: BTreeMap<String, Vec<Programme>>,
    /// Program som slutar före gränsen behålls bara om de är sport (30 h mot 6 h).
    past_cutoff_ms: Option<i64>,
}

impl EpgAccumulator {
    pub fn with_past_cutoff(cutoff_ms: i64) -> Self {
        Self { past_cutoff_ms: Some(cutoff_ms), ..Default::default() }
    }

    pub fn absorb(&mut self, doc: ParsedXmltv) {
        // Kanalledtrådar för sportdetekteringen: display-namnen plus id:t
        // ("VSportFotboll.se" säger "fotboll" även utan display-namn).
        let hints: HashMap<String, Vec<String>> = doc
            .channels
            .iter()
            .map(|c| (c.id.clone(), c.display_names.iter().cloned().chain(std::iter::once(c.id.clone())).collect()))
            .collect();
        for channel in doc.channels {
            // … oförändrad …
        }

        let mut per_channel: BTreeMap<String, Vec<Programme>> = BTreeMap::new();
        for p in doc.programmes {
            let own;
            let hint: &[String] = match hints.get(&p.channel) {
                Some(h) => h,
                None => {
                    own = [p.channel.clone()];
                    &own
                }
            };
            let sport = crate::live_tv_sport::detect(
                &p.title,
                p.sub_title.as_deref(),
                p.description.as_deref(),
                &p.categories,
                p.live,
                hint,
                p.start_ms,
            );
            if let Some(cutoff) = self.past_cutoff_ms {
                if p.stop_ms < cutoff && sport.is_none() {
                    continue;
                }
            }
            per_channel.entry(p.channel).or_default().push(Programme {
                title: p.title,
                description: p.description,
                start: p.start_ms,
                stop: p.stop_ms,
                sport,
            });
        }
        // … resten oförändrad (sortering, längsta listan vinner) …
    }
```

4. Ny berikning + läsväg (efter `store_for`):

```rust
/// Sätt sportfälten i en butik som skrevs före sportläget. Ingen hämtning:
/// detekteringen körs på titlar och beskrivningar som redan ligger på disk
/// (kategorier och `<live/>` sparas inte, och Jerrys panel har inga).
pub fn enrich_sport(store: &mut EpgStore) {
    let hints: HashMap<String, Vec<String>> = store
        .channels
        .iter()
        .map(|c| (c.id.clone(), c.display_names.iter().cloned().chain(std::iter::once(c.id.clone())).collect()))
        .collect();
    for (id, list) in store.programmes.iter_mut() {
        let fallback = [id.clone()];
        let hint: &[String] = hints.get(id).map(Vec::as_slice).unwrap_or(&fallback);
        for p in list.iter_mut() {
            if p.sport.is_none() {
                p.sport = crate::live_tv_sport::detect(&p.title, None, p.description.as_deref(), &[], false, hint, p.start);
            }
        }
    }
    store.sport_version = crate::live_tv_sport::SPORT_VERSION;
}

/// Butiken med sportfälten satta. En gammal butik berikas EN gång i en
/// blockerande tråd, skrivs till disk och ersätter minnesposten.
pub(crate) async fn sport_ready_store(state: &AxumState, list_id: &str) -> Option<Arc<EpgStore>> {
    let store = store_for(state, list_id).await?;
    if store.sport_version >= crate::live_tv_sport::SPORT_VERSION {
        return Some(store);
    }
    let mut copy = (*store).clone();
    let enriched = tokio::task::spawn_blocking(move || {
        enrich_sport(&mut copy);
        copy
    })
    .await
    .ok()?;
    let arc = Arc::new(enriched);
    persist(state, arc.clone()).await;
    put_store(list_id, Some(arc.clone())).await;
    Some(arc)
}
```

5. `refresh_with`: byt fönstret och ackumulatorn

```rust
    let window_start = now - crate::live_tv_sport::SPORT_WINDOW_BEFORE_MS;
    let past_cutoff = now - WINDOW_BEFORE_MS;
    let window_end = now + WINDOW_AFTER_MS;

    let mut acc = EpgAccumulator::with_past_cutoff(past_cutoff);
```

och ersätt hela `Ok(text) => { … }`-armen med

```rust
            Ok(text) => {
                crate::live_tv_import::update_job(job, ImportState::Parsing, i as u64, Some(total));
                // Parsning OCH sportdetektering i den blockerande tråden —
                // detekteringen går över varje program och hör inte hemma på
                // exekutorns tråd.
                let taken = std::mem::take(&mut acc);
                let ((channels, programmes), absorbed) = tokio::task::spawn_blocking(move || {
                    let mut acc = taken;
                    let doc = xmltv::parse_xmltv_document_filtered(
                        &text,
                        window_start,
                        window_end,
                        MAX_PROGRAMMES,
                        past_cutoff,
                        &crate::live_tv_sport::may_be_sport_title,
                    );
                    let counts = (doc.channels.len() as u32, doc.programmes.len() as u32);
                    acc.absorb(doc);
                    (counts, acc)
                })
                .await
                .map_err(|e| format!("parsning avbröts: {e}"))?;
                acc = absorbed;
                stats.push(EpgSourceStat { url: url.clone(), channels, programmes, error: None, fetched_at_ms: now });
            }
```

och sätt `sport_version: crate::live_tv_sport::SPORT_VERSION,` i `EpgStore { … }` som byggs efter `acc.finish()`.

6. Synlighet: `fn key_of` → `pub(crate) fn key_of`, `fn tvg_id_for` → `pub(crate) fn tvg_id_for`, `async fn put_store` → `pub(crate) async fn put_store`, `async fn persist` → `pub(crate) async fn persist`, `async fn insert_store_for_test` → `pub(crate) async fn insert_store_for_test` (behåll `#[cfg(test)]`).

- [ ] **Step 4: Kör testerna**

Run: `cd APP/src-tauri && cargo test --lib live_tv_epg && cargo test --lib xmltv && cargo test --lib live_tv_sport`
Expected: PASS (även alla gamla EPG-tester — `/now`, `/schedule`, `/search` ska inte märka något).

- [ ] **Step 5: Commit**

```bash
cd APP
git add src-tauri/src/xmltv.rs src-tauri/src/live_tv_epg.rs src-tauri/src/live_tv_sport.rs
git commit -m "live-tv epg: sportfält vid inläsning, 30 h bakåt bara för sport"
```

---

### Task 6: Eventkanaler tolkas på kanalnamnet

**Files:**
- Modify: `APP/src-tauri/src/live_tv_sport.rs`
- Test: samma fil

**Interfaces:**
- Consumes: `fold`, `team_key`, `league_info`, `league_prefix`, `league_suffix`, `kind_from_channel`, `split_teams`, `is_noise`, `SportInfo`, `crate::xmltv::days_since_epoch`.
- Produces: `pub struct EventChannel { pub info: SportInfo, pub start_ms: i64, pub stop_ms: i64, pub ended: bool }`; `pub fn parse_event_channel(name: &str, now_ms: i64, tz_offset_min: i32) -> Option<EventChannel>`; `pub const EVENT_DURATION_MS: i64 = 150 * 60_000`.

Eventkanaler ("Live: Live Events", PPV-grupperna) saknar tvg-id; matchen står i namnet. Former ur Jerrys index:
`LIVE | JÄRFÄLLA HC VS BOO HC | Tue 29 Sep 18:55 CEST (SE) | 8K EXCLUSIVE | SE: SVENSK HOCKEY PPV 15`,
`SE: SVENSK HOCKEY PPV 5 - TIERPS HK VS NORRTÄLJE IK | Sun 07 Dec 09:25`,
`End | Philippines vs. Pakistan | FIFA ASEAN Cup | 2026-09-29 | 09:00 (GMT) | 8K EXCLUSIVE | SE: DAZN PPV 2`,
`LIVE | UEFA NATIONS LEAGUE MOLDAVIEN - FÄRÖARNA | Tue 29 Sep 17:50 CEST (SE) | … | SE: VIAPLAY PPV 2`.
"NO EVENT" hoppas över. Namn utan datum ("LIVE EVENT 26 - MAIN STAGE …", "PPV EVENT 07: 5pm …") kan inte placeras på en dag och hoppas över i fas 1. Event utan två lag hoppas över.

- [ ] **Step 1: Skriv de fallerande testerna**

```rust
    const SEP29_1500Z: i64 = 1_790_694_000_000; // 2026-09-29 15:00 UTC

    #[test]
    fn event_channel_with_status_and_swedish_time() {
        let e = parse_event_channel(
            "NEXT | ÄLTA IF VS IFK TUMBA IK | Tue 29 Sep 19:55 CEST (SE) | 8K EXCLUSIVE | SE: SVENSK HOCKEY PPV 39",
            SEP29_1500Z,
            120,
        )
        .expect("event");
        assert_eq!(e.start_ms, 1_790_704_500_000); // 17:55 UTC
        assert_eq!(e.stop_ms, e.start_ms + EVENT_DURATION_MS);
        assert_eq!(e.info.kind, SportKind::Hockey);
        assert_eq!((e.info.home.as_deref(), e.info.away.as_deref()), (Some("Älta IF"), Some("IFK Tumba IK")));
        assert_eq!(e.info.home_key.as_deref(), Some("alta"));
        assert!(!e.ended);
    }

    #[test]
    fn event_channel_provider_first_and_without_timezone() {
        // December = vintertid; utan tidszon i namnet gäller klientens offset.
        let e = parse_event_channel("SE: SVENSK HOCKEY PPV 5 - TIERPS HK VS NORRTÄLJE IK | Sun 07 Dec 09:25", SEP29_1500Z, 60).unwrap();
        assert_eq!(e.start_ms, 1_796_631_900_000); // 2026-12-07 08:25 UTC
        assert_eq!(e.info.away_key.as_deref(), Some("norrtalje"));
    }

    #[test]
    fn event_channel_iso_date_gmt_and_ended() {
        let e = parse_event_channel(
            "End | Philippines vs. Pakistan | FIFA ASEAN Cup | 2026-09-29 | 09:00 (GMT) | 8K EXCLUSIVE | SE: DAZN PPV 2",
            SEP29_1500Z,
            120,
        )
        .unwrap();
        assert_eq!(e.start_ms, 1_790_672_400_000);
        assert!(e.ended);
        assert_eq!(e.info.home.as_deref(), Some("Philippines"));
    }

    #[test]
    fn event_channel_league_in_text() {
        let e = parse_event_channel("LIVE | UEFA NATIONS LEAGUE MOLDAVIEN - FÄRÖARNA | Tue 29 Sep 17:50 CEST (SE) | 8K EXCLUSIVE | SE: VIAPLAY PPV 2", SEP29_1500Z, 120).unwrap();
        assert_eq!(e.info.league_key, "uefa-nations-league");
        assert_eq!((e.info.home_key.as_deref(), e.info.away_key.as_deref()), (Some("moldova"), Some("faroe islands")));
        assert!(e.info.live);
        let e = parse_event_channel("LIVE | SKELLEFTEÅ - LULEÅ SHL | Tue 29 Sep 18:45 CEST (SE) | 8K EXCLUSIVE | SE: PLAY+ PPV 9", SEP29_1500Z, 120).unwrap();
        assert_eq!((e.info.league_key.as_str(), e.start_ms), ("shl", 1_790_700_300_000));
    }

    #[test]
    fn event_channels_without_match_are_skipped() {
        for name in [
            "SE: PRIME PPV ᴿᴬᵂ 50 - NO EVENT STREAMING - | 8K EXCLUSIVE",
            "- NO EVENT STREAMING - | 8K EXCLUSIVE | SE: SVENSK HOCKEY PPV 60",
            "####### SVENSK HOCKEY PPV #######",
            "LIVE EVENT 26 - MAIN STAGE Live From Coachella 2026",
            "PPV EVENT 07: 5pm Gonzalez v Perez",
            "LIVE | PDC DART 2026 WORLD GRAND PRIX | Tue 29 Sep 19:00 CEST (SE) | 8K EXCLUSIVE | SE: VIAPLAY PPV 4",
            "LIVE | PREMIER LEAGUE SHOW | Tue 29 Sep 18:00 CEST (SE) | 8K EXCLUSIVE | SE: PLAY+ PPV 6",
            "JÄMTLAND - NOT DECIDED | Mon 23 Mar 18:50 | 8K EXCLUSIVE | SE: EXPRESSEN PPV 20",
            "TV4 Hockey FHD SE",
        ] {
            assert!(parse_event_channel(name, SEP29_1500Z, 120).is_none(), "{name}");
        }
    }
```

- [ ] **Step 2: Kör och se dem falla**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport::tests::event`
Expected: FAIL — `cannot find function parse_event_channel`.

- [ ] **Step 3: Implementera**

```rust
pub const EVENT_DURATION_MS: i64 = 150 * 60_000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EventChannel {
    pub info: SportInfo,
    pub start_ms: i64,
    pub stop_ms: i64,
    /// Namnet säger ENDED/End — avslutad oavsett klocka.
    pub ended: bool,
}

static WHEN_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(?:[A-Za-z]{3}\s+)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{1,2}):(\d{2})(?:\s+([A-Za-z]{3,4}))?").unwrap()
});
static ISO_DATE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^(\d{4})-(\d{2})-(\d{2})$").unwrap());
static ISO_TIME_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^(\d{1,2}):(\d{2})\s*\((?:GMT|UTC)\)$").unwrap());
static PROVIDER_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)^(?:SE:\s*)?(.+?)\s+PPV\s+\d+(?:\s+-\s+(.+))?$").unwrap());
const MONTHS: [&str; 12] = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/// Föreningsförkortningar som står kvar i versaler när ett namn i VERSALER görs läsbart.
const KEEP_UPPER: &[&str] = &["ifk", "hf", "bik", "gik", "hk", "aik", "ishf", "tp", "sde", "bois", "mff"];

fn year_of(ms: i64) -> i32 {
    let z = ms.div_euclid(86_400_000) + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (yoe + era * 400 + if m <= 2 { 1 } else { 0 }) as i32
}

fn local_ms(y: i32, m: u32, d: u32, hh: i64, mm: i64, offset_min: i32) -> Option<i64> {
    let days = crate::xmltv::days_since_epoch(y, m, d)?;
    Some(days * 86_400_000 + hh * 3_600_000 + mm * 60_000 - offset_min as i64 * 60_000)
}

/// "29 Sep 19:55 CEST" utan år: året som ger tiden närmast `now_ms`.
fn when_from_caps(c: &regex::Captures, now_ms: i64, tz_offset_min: i32) -> Option<i64> {
    let day: u32 = c[1].parse().ok()?;
    let month = MONTHS.iter().position(|m| c[2].eq_ignore_ascii_case(m))? as u32 + 1;
    let hh: i64 = c[3].parse().ok()?;
    let mm: i64 = c[4].parse().ok()?;
    let offset = match c.get(5).map(|m| m.as_str().to_ascii_uppercase()) {
        Some(z) if z == "CEST" => 120,
        Some(z) if z == "CET" => 60,
        Some(z) if z == "GMT" || z == "UTC" => 0,
        _ => tz_offset_min,
    };
    let year = year_of(now_ms);
    (year - 1..=year + 1)
        .filter_map(|y| local_ms(y, month, day, hh, mm, offset))
        .min_by_key(|ms| (ms - now_ms).abs())
}

/// "ÄLTA IF" → "Älta IF": läsbart utan att föreningsförkortningar blir "If".
fn display_case(s: &str) -> String {
    if s.chars().any(char::is_lowercase) {
        return s.to_string();
    }
    s.split_whitespace()
        .map(|w| {
            let f = fold(w);
            if AFFIXES.contains(&f.as_str()) || KEEP_UPPER.contains(&f.as_str()) || w.chars().any(|c| c.is_ascii_digit()) {
                w.to_string()
            } else {
                let mut cs = w.chars();
                match cs.next() {
                    Some(first) => first.to_uppercase().chain(cs.flat_map(char::to_lowercase)).collect(),
                    None => String::new(),
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn parse_event_channel(name: &str, now_ms: i64, tz_offset_min: i32) -> Option<EventChannel> {
    if fold(name).contains("no event") {
        return None;
    }
    let parts: Vec<&str> = name.split('|').map(str::trim).filter(|p| !p.is_empty()).collect();
    let mut status: Option<String> = None;
    let mut when: Option<i64> = None;
    let mut iso_day: Option<(i32, u32, u32)> = None;
    let mut provider = String::new();
    let mut text: Option<String> = None;
    let mut league_hint: Option<League> = None;
    for (i, part) in parts.iter().enumerate() {
        let f = fold(part);
        if i == 0 && ["live", "next", "ended", "end"].contains(&f.as_str()) {
            status = Some(f);
            continue;
        }
        if let Some(c) = WHEN_RE.captures(part) {
            when = when_from_caps(&c, now_ms, tz_offset_min);
            continue;
        }
        if let Some(c) = ISO_DATE_RE.captures(part) {
            iso_day = Some((c[1].parse().ok()?, c[2].parse().ok()?, c[3].parse().ok()?));
            continue;
        }
        if let Some(c) = ISO_TIME_RE.captures(part) {
            if let Some((y, m, d)) = iso_day {
                when = local_ms(y, m, d, c[1].parse().ok()?, c[2].parse().ok()?, 0);
            }
            continue;
        }
        if let Some(c) = PROVIDER_RE.captures(part) {
            provider = c[1].to_string();
            if let (Some(t), None) = (c.get(2), &text) {
                text = Some(t.as_str().to_string());
            }
            continue;
        }
        if f.ends_with("exclusive") {
            continue;
        }
        if text.is_none() {
            text = Some(part.to_string());
        } else if league_hint.is_none() {
            league_hint = league_info(part);
        }
    }
    let start_ms = when?;
    let text = text?;
    if fold(&text).contains("not decided") {
        return None;
    }
    // Ligan först i texten, sist i texten, eller som egen del.
    let (league, rest) = match league_prefix(&text) {
        Some((l, rest)) => (Some(l), rest),
        None => match league_suffix(&text) {
            Some((l, before)) => (Some(l), before),
            None => (league_hint, text.clone()),
        },
    };
    // En eventkanal är en sportkanal även när leverantören inte säger vilken sport.
    let kind = league.map(|l| l.kind).or_else(|| kind_from_channel(&provider)).unwrap_or(SportKind::Other);
    let (h, a) = split_teams(&rest)?;
    if is_noise(&[&h, &a]) {
        return None;
    }
    let (home, away) = (display_case(&h), display_case(&a));
    let ended = matches!(status.as_deref(), Some("ended") | Some("end"));
    Some(EventChannel {
        info: SportInfo {
            kind,
            league: league.map(|l| l.name.to_string()).unwrap_or_default(),
            league_key: league.map(|l| l.key.to_string()).unwrap_or_default(),
            home_key: Some(team_key(&home)),
            away_key: Some(team_key(&away)),
            home: Some(home),
            away: Some(away),
            event: None,
            live: status.as_deref() == Some("live"),
            rerun: false,
            round: None,
            venue: None,
        },
        start_ms,
        stop_ms: start_ms + EVENT_DURATION_MS,
        ended,
    })
}
```

- [ ] **Step 4: Kör testerna**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd APP
git add src-tauri/src/live_tv_sport.rs
git commit -m "live-tv sport: eventkanaler tolkas på kanalnamnet"
```

---

### Task 7: Gruppering till matcher med "N källor"

**Files:**
- Modify: `APP/src-tauri/src/live_tv_sport.rs`
- Test: samma fil

**Interfaces:**
- Consumes: `SportInfo`, `keys_match`, `fold`, `detect`, `parse_event_channel` (testerna).
- Produces:
  - `pub fn quality_from_name(name: &str) -> Option<&'static str>` (samma regel som pluginets `qualityFromName`: 4K > FHD > HD > SD)
  - `pub struct MatchSource { pub channel_key: String, pub name: String, pub url: String, pub logo: Option<String>, pub group: String, pub tvg_id: Option<String>, pub source_id: String, pub quality: Option<&'static str>, pub programme_start: i64, pub programme_stop: i64, pub live_flag: bool }` (`Serialize`, camelCase)
  - `pub struct SportEntry { pub info: SportInfo, pub start: i64, pub stop: i64, pub ended: bool, pub source: MatchSource }`
  - `pub struct SportMatch { pub id: String, pub kind: SportKind, pub league: String, pub league_key: String, pub home: Option<String>, pub away: Option<String>, pub home_key: Option<String>, pub away_key: Option<String>, pub event: Option<String>, pub start: i64, pub stop: i64, pub status: &'static str, pub rerun: bool, pub round: Option<u32>, pub venue: Option<String>, pub sources: Vec<MatchSource> }` (`Serialize`, camelCase; `None` serialiseras som `null`)
  - `pub fn group_entries(entries: Vec<SportEntry>, at: i64) -> Vec<SportMatch>` — sorterade på start; `status` ∈ `"live" | "upcoming" | "finished"`.

Regler (spec Gruppering): samma sport (Övrigt matchar allt), samma liga eller okänd, lagnycklar oberoende av ordning (`keys_match`), start inom ±30 min, samma repris-flagga → en match. Efteråt: en oflaggad sändning SENARE än en `ᴸᶦᵛᵉ`-flaggad sändning av samma match blir repris (TV4 skriver inget datum). Källor sorteras på kvalitet, sedan live-flagga, sedan namn; samma kanal räknas en gång.

- [ ] **Step 1: Skriv de fallerande testerna**

```rust
    fn entry(title: &str, channel: &str, start: i64, stop: i64) -> SportEntry {
        let info = detect(title, None, None, &[], false, &[channel.to_string()], start).expect("sport");
        let live_flag = info.live;
        SportEntry {
            info,
            start,
            stop,
            ended: false,
            source: MatchSource {
                channel_key: format!("{channel}::http://x/{channel}"),
                name: channel.to_string(),
                url: format!("http://x/{channel}"),
                logo: None,
                group: "Sport".into(),
                tvg_id: None,
                source_id: "src".into(),
                quality: quality_from_name(channel),
                programme_start: start,
                programme_stop: stop,
                live_flag,
            },
        }
    }
    const H: i64 = 3_600_000;
    const M: i64 = 60_000;

    #[test]
    fn same_match_on_three_channels_is_one_match_with_ranked_sources() {
        let t = T_1700Z;
        let out = group_entries(
            vec![
                entry("Mjällby - Degerfors Allsvenskan : Mjällby AIF - Degerfors IF ᴸᶦᵛᵉ", "TV4 Sport Live 1 HD SE", t, t + 2 * H),
                entry("Allsvenskan : Mjällby - Degerfors ᴸᶦᵛᵉ", "TV4 Sportkanalen FHD SE", t - 15 * M, t + 2 * H),
                entry("Allsvenskan : Mjällby - Degerfors ᴸᶦᵛᵉ", "TV4 Sport Live 1 SE", t, t + 2 * H),
            ],
            t + 30 * M,
        );
        assert_eq!(out.len(), 1);
        let m = &out[0];
        assert_eq!(m.status, "live");
        assert_eq!(m.start, t - 15 * M);
        assert_eq!(m.home.as_deref(), Some("Mjällby AIF"), "det längre namnet vinner");
        let names: Vec<&str> = m.sources.iter().map(|s| s.name.as_str()).collect();
        assert_eq!(names, vec!["TV4 Sportkanalen FHD SE", "TV4 Sport Live 1 HD SE", "TV4 Sport Live 1 SE"]);
    }

    #[test]
    fn swapped_home_and_away_is_the_same_match() {
        let t = T_2300Z;
        let out = group_entries(
            vec![
                entry("NHL : Boston Bruins - Philadelphia Flyers ᴸᶦᵛᵉ", "V Sport Vinter HD SE", t, t + 3 * H),
                entry("NHL : Philadelphia Flyers - Boston Bruins", "V Sport Premium SE", t + 10 * M, t + 3 * H),
                entry("Philadelphia Flyers at Boston Bruins", "NHL Network", t + 5 * M, t + 3 * H),
            ],
            t - H,
        );
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].sources.len(), 3);
        assert_eq!(out[0].status, "upcoming");
    }

    #[test]
    fn rerun_is_kept_apart_with_or_without_date() {
        let t = T_1700Z;
        // Utan datum: oflaggad sändning senare samma dag = repris.
        let out = group_entries(
            vec![
                entry("Allsvenskan : GAIS - Sirius ᴸᶦᵛᵉ", "TV4 Fotboll FHD SE", t, t + 2 * H),
                entry("Allsvenskan : GAIS - Sirius", "TV4 Fotboll FHD SE", t + 5 * H, t + 7 * H),
            ],
            t + 6 * H,
        );
        assert_eq!(out.len(), 2);
        assert!(!out[0].rerun && out[1].rerun);
        // Med datum i desc: repris även inom 30 min från live-sändningen.
        let mut rerun = entry("Bundesliga : Dortmund - Werder Bremen", "V Sport 1 HD SE", t + 10 * M, t + 2 * H);
        rerun.info.rerun = true;
        let out = group_entries(vec![entry("Bundesliga : Dortmund - Werder Bremen ᴸᶦᵛᵉ", "V Sport Fotboll HD SE", t, t + 2 * H), rerun], t);
        assert_eq!(out.len(), 2);
        assert_eq!(out.iter().filter(|m| m.rerun).count(), 1);
    }

    #[test]
    fn different_matches_at_the_same_time_stay_apart() {
        let t = T_1700Z;
        let out = group_entries(
            vec![
                entry("Allsvenskan : AIK - Hammarby ᴸᶦᵛᵉ", "TV4 Fotboll SE", t, t + 2 * H),
                entry("Allsvenskan : Malmö - Göteborg ᴸᶦᵛᵉ", "TV4 Sportkanalen SE", t, t + 2 * H),
                // Samma lag 3 h senare = en annan sändning, inte en källa till.
                entry("Allsvenskan : AIK - Hammarby ᴸᶦᵛᵉ", "TV4 Sport Live 2 SE", t + 3 * H, t + 5 * H),
            ],
            t,
        );
        assert_eq!(out.len(), 3);
    }

    #[test]
    fn event_channel_joins_the_epg_match_and_status_follows_the_clock() {
        let ev = parse_event_channel("LIVE | SKELLEFTEÅ - LULEÅ SHL | Tue 29 Sep 18:45 CEST (SE) | 8K EXCLUSIVE | SE: PLAY+ PPV 9", SEP29_1500Z, 120).unwrap();
        let mut from_event = entry("SHL : Skellefteå - Luleå ᴸᶦᵛᵉ", "PLAY+ PPV 9", ev.start_ms, ev.stop_ms);
        from_event.info = ev.info.clone();
        let out = group_entries(vec![entry("SHL : Skellefteå - Luleå ᴸᶦᵛᵉ", "TV4 Hockey FHD SE", ev.start_ms - 15 * M, ev.start_ms + 3 * H), from_event], ev.start_ms + 10 * M);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].sources.len(), 2);
        let mut ended = entry("Allsvenskan : AIK - Hammarby", "TV4 Fotboll SE", T_1700Z, T_1700Z + 2 * H);
        ended.ended = true;
        assert_eq!(group_entries(vec![ended], T_1700Z + 10 * M)[0].status, "finished");
        assert_eq!(group_entries(vec![entry("Allsvenskan : AIK - Hammarby", "TV4 Fotboll SE", T_1700Z, T_1700Z + 2 * H)], T_1700Z + 3 * H)[0].status, "finished");
    }

    #[test]
    fn quality_from_name_matches_the_plugin() {
        assert_eq!(quality_from_name("Eurosport 1 4K SE"), Some("4K"));
        assert_eq!(quality_from_name("TV4 Fotboll FHD SE"), Some("FHD"));
        assert_eq!(quality_from_name("V Sport 1 Sverige HD SE"), Some("HD"));
        assert_eq!(quality_from_name("TV4 Fotboll SE"), None);
    }
```

- [ ] **Step 2: Kör och se dem falla**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport`
Expected: FAIL — `cannot find function group_entries`.

- [ ] **Step 3: Implementera**

```rust
const GROUP_WINDOW_MS: i64 = 30 * 60_000;

pub fn quality_from_name(name: &str) -> Option<&'static str> {
    let up = name.to_uppercase();
    let words: Vec<&str> = up.split(|c: char| !c.is_ascii_alphanumeric()).filter(|w| !w.is_empty()).collect();
    if words.iter().any(|w| *w == "4K" || *w == "UHD" || w.starts_with("2160")) {
        return Some("4K");
    }
    if words.iter().any(|w| *w == "FHD" || w.starts_with("1080")) {
        return Some("FHD");
    }
    if words.iter().any(|w| *w == "HD" || *w == "720" || *w == "720P") {
        return Some("HD");
    }
    if words.iter().any(|w| *w == "SD" || *w == "576" || *w == "480") {
        return Some("SD");
    }
    None
}

fn quality_rank(q: Option<&str>) -> u8 {
    match q {
        Some("4K") => 0,
        Some("FHD") => 1,
        Some("HD") => 2,
        Some("SD") => 3,
        _ => 4,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchSource {
    pub channel_key: String,
    pub name: String,
    pub url: String,
    pub logo: Option<String>,
    pub group: String,
    pub tvg_id: Option<String>,
    /// Källan i kanalindexet — pluginet slår upp spellistans namn på den.
    pub source_id: String,
    pub quality: Option<&'static str>,
    pub programme_start: i64,
    pub programme_stop: i64,
    pub live_flag: bool,
}

#[derive(Debug, Clone)]
pub struct SportEntry {
    pub info: SportInfo,
    pub start: i64,
    pub stop: i64,
    pub ended: bool,
    pub source: MatchSource,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SportMatch {
    pub id: String,
    pub kind: SportKind,
    pub league: String,
    pub league_key: String,
    pub home: Option<String>,
    pub away: Option<String>,
    pub home_key: Option<String>,
    pub away_key: Option<String>,
    pub event: Option<String>,
    pub start: i64,
    pub stop: i64,
    pub status: &'static str,
    pub rerun: bool,
    pub round: Option<u32>,
    pub venue: Option<String>,
    pub sources: Vec<MatchSource>,
}

fn same_identity(a: &SportInfo, b: &SportInfo) -> bool {
    if a.kind != b.kind && a.kind != SportKind::Other && b.kind != SportKind::Other {
        return false;
    }
    if !a.league_key.is_empty() && !b.league_key.is_empty() && a.league_key != b.league_key {
        return false;
    }
    match (&a.home_key, &a.away_key, &b.home_key, &b.away_key) {
        (Some(ah), Some(aa), Some(bh), Some(ba)) => {
            (keys_match(ah, bh) && keys_match(aa, ba)) || (keys_match(ah, ba) && keys_match(aa, bh))
        }
        (None, None, None, None) => a.event.is_some() && a.event.as_deref().map(fold) == b.event.as_deref().map(fold),
        _ => false,
    }
}

/// Fyll i det gruppen saknar; ett längre namn för samma lag vinner ("Mjällby AIF" före "Mjällby").
fn merge_info(into: &mut SportInfo, from: &SportInfo) {
    if into.kind == SportKind::Other {
        into.kind = from.kind;
    }
    if into.league_key.is_empty() {
        into.league = from.league.clone();
        into.league_key = from.league_key.clone();
    }
    if into.round.is_none() {
        into.round = from.round;
    }
    if into.venue.is_none() {
        into.venue = from.venue.clone();
    }
    let same_way = match (&into.home_key, &from.home_key) {
        (Some(a), Some(b)) => keys_match(a, b),
        _ => false,
    };
    if same_way {
        if from.home.as_ref().map(String::len) > into.home.as_ref().map(String::len) {
            into.home = from.home.clone();
        }
        if from.away.as_ref().map(String::len) > into.away.as_ref().map(String::len) {
            into.away = from.away.clone();
        }
    }
    into.live |= from.live;
}

fn match_id(info: &SportInfo, start: i64) -> String {
    let mut sides: Vec<String> = match (&info.home_key, &info.away_key) {
        (Some(h), Some(a)) => vec![h.clone(), a.clone()],
        _ => vec![info.event.as_deref().map(fold).unwrap_or_default()],
    };
    sides.sort();
    format!(
        "{:?}|{}|{}|{}{}",
        info.kind,
        info.league_key,
        sides.join("|"),
        start / 300_000,
        if info.rerun { "|r" } else { "" }
    )
    .to_lowercase()
}

struct Group {
    info: SportInfo,
    start: i64,
    stop: i64,
    ended: bool,
    any_flag: bool,
    sources: Vec<MatchSource>,
}

pub fn group_entries(mut entries: Vec<SportEntry>, at: i64) -> Vec<SportMatch> {
    entries.sort_by(|a, b| a.start.cmp(&b.start).then_with(|| a.source.channel_key.cmp(&b.source.channel_key)));
    let mut groups: Vec<Group> = Vec::new();
    for e in entries {
        let hit = groups.iter_mut().find(|g| {
            g.info.rerun == e.info.rerun && (e.start - g.start).abs() <= GROUP_WINDOW_MS && same_identity(&g.info, &e.info)
        });
        match hit {
            Some(g) => {
                merge_info(&mut g.info, &e.info);
                g.stop = g.stop.max(e.stop);
                g.ended |= e.ended;
                g.any_flag |= e.info.live;
                if !g.sources.iter().any(|s| s.channel_key == e.source.channel_key) {
                    g.sources.push(e.source);
                }
            }
            None => groups.push(Group {
                any_flag: e.info.live,
                start: e.start,
                stop: e.stop,
                ended: e.ended,
                info: e.info,
                sources: vec![e.source],
            }),
        }
    }
    // Repris utan datum: oflaggad sändning efter en flaggad sändning av samma match.
    let flagged: Vec<(SportInfo, i64)> = groups.iter().filter(|g| g.any_flag && !g.info.rerun).map(|g| (g.info.clone(), g.start)).collect();
    for g in groups.iter_mut() {
        if !g.info.rerun && !g.any_flag && flagged.iter().any(|(info, start)| *start < g.start && same_identity(info, &g.info)) {
            g.info.rerun = true;
        }
    }
    groups
        .into_iter()
        .map(|mut g| {
            g.sources.sort_by(|a, b| {
                quality_rank(a.quality)
                    .cmp(&quality_rank(b.quality))
                    .then(b.live_flag.cmp(&a.live_flag))
                    .then_with(|| a.name.cmp(&b.name))
            });
            let status = if g.ended || at >= g.stop {
                "finished"
            } else if at >= g.start {
                "live"
            } else {
                "upcoming"
            };
            SportMatch {
                id: match_id(&g.info, g.start),
                kind: g.info.kind,
                league: g.info.league,
                league_key: g.info.league_key,
                home: g.info.home,
                away: g.info.away,
                home_key: g.info.home_key,
                away_key: g.info.away_key,
                event: g.info.event,
                start: g.start,
                stop: g.stop,
                status,
                rerun: g.info.rerun,
                round: g.info.round,
                venue: g.info.venue,
                sources: g.sources,
            }
        })
        .collect()
}
```

(I `.map` ovan räknas `id` före att fälten flyttas ur `g.info` — behåll fältordningen i literalen.)

- [ ] **Step 4: Kör testerna**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd APP
git add src-tauri/src/live_tv_sport.rs
git commit -m "live-tv sport: samma match över kanaler blir en match med N källor"
```

---

### Task 8: `GET /api/live-tv/sport/day`

**Files:**
- Modify: `APP/src-tauri/src/live_tv_sport.rs` (handler + insamling)
- Modify: `APP/src-tauri/src/axum_server.rs` (route efter `/api/live-tv/epg/search`)
- Test: `APP/src-tauri/src/live_tv_sport.rs`

**Interfaces:**
- Consumes: `live_tv_epg::{sport_ready_store, tvg_id_for, key_of, programmes_in_window, EpgStore, insert_store_for_test}`, `live_tv_index::{shared, LiveTvIndex, LiveTvChannel, write_source}`, `group_entries`, `parse_event_channel` (Task 5–7).
- Produces: `pub async fn day_handler(State<Arc<AxumState>>, Query<SportDayQuery>) -> Response`. Fråga: `listId` (pluginets globala EPG-id `global`), `day=YYYY-MM-DD`, `tzOffset` (minuter öster om UTC för den dagen, t.ex. 120), valfritt `at` (ms). Svar (camelCase):
  `{ day: string, from: number, to: number, at: number, fetchedAt: number | null, matches: SportMatch[], counts: { [kind]: number } }` — `counts` räknar inte repriser; matcher utan EPG-butik (bara eventkanaler) kommer ändå med.

- [ ] **Step 1: Skriv de fallerande testerna**

```rust
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::routing::get;
    use axum::Router;
    use std::sync::Arc;
    use tokio::runtime::Runtime;
    use tower::ServiceExt;

    use crate::axum_server::AxumState;
    use crate::live_tv_epg::{EpgStore, Programme};
    use crate::live_tv_index::{self, LiveTvChannel};
    use crate::xmltv::XmltvChannel;

    const OCT09_2230Z: i64 = 1_791_585_000_000; // 00:30 svensk tid den 10:e

    fn ch(name: &str, tvg: Option<&str>) -> LiveTvChannel {
        LiveTvChannel {
            name: name.to_string(),
            url: format!("http://sport/{}", name.len()),
            group: "Sport".into(),
            tvg_id_resolved: tvg.map(str::to_string),
            ..Default::default()
        }
    }

    fn prog(title: &str, channel_hint: &str, start: i64, stop: i64) -> Programme {
        Programme {
            title: title.into(),
            description: None,
            start,
            stop,
            sport: detect(title, None, None, &[], false, &[channel_hint.to_string()], start),
        }
    }

    async fn seed(state: &AxumState, list_id: &str, source: &str, version: u32) {
        let state_index = live_tv_index::shared(state);
        {
            let mut guard = state_index.write().await;
            live_tv_index::write_source(
                &mut guard,
                source,
                vec![
                    ch("TV4 Fotboll FHD SE", Some("TV4Fotboll.se")),
                    ch("TV4 Sportkanalen HD SE", Some("TV4Sportkanalen.se")),
                    ch("LIVE | SKELLEFTEÅ - LULEÅ SHL | Sat 10 Oct 19:00 CEST (SE) | 8K EXCLUSIVE | SE: PLAY+ PPV 9", None),
                ],
            );
        }
        let mut fotboll = vec![
            prog("Allsvenskan : AIK - Hammarby ᴸᶦᵛᵉ", "TV4Fotboll.se", OCT09_2230Z, OCT09_2230Z + 2 * H),
            prog("Allsvenskan : GAIS - Sirius ᴸᶦᵛᵉ", "TV4Fotboll.se", T_1700Z, T_1700Z + 2 * H),
        ];
        let mut kanalen = vec![prog("Allsvenskan : GAIS - Sirius ᴸᶦᵛᵉ", "TV4Sportkanalen.se", T_1700Z - 15 * M, T_1700Z + 2 * H)];
        if version == 0 {
            for p in fotboll.iter_mut().chain(kanalen.iter_mut()) {
                p.sport = None;
            }
        }
        crate::live_tv_epg::insert_store_for_test(EpgStore {
            list_id: list_id.into(),
            sources: vec![source.to_string()],
            fetched_at_ms: 77,
            sport_version: version,
            channels: vec![
                XmltvChannel { id: "TV4Fotboll.se".into(), display_names: vec!["TV4 Fotboll".into()] },
                XmltvChannel { id: "TV4Sportkanalen.se".into(), display_names: vec!["TV4 Sportkanalen".into()] },
            ],
            programmes: [("TV4Fotboll.se".to_string(), fotboll), ("TV4Sportkanalen.se".to_string(), kanalen)].into_iter().collect(),
            ..Default::default()
        })
        .await;
    }

    async fn get_json(state: Arc<AxumState>, uri: &str) -> (StatusCode, serde_json::Value) {
        let res = Router::new()
            .route("/api/live-tv/sport/day", get(day_handler))
            .with_state(state)
            .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
            .await
            .unwrap();
        let status = res.status();
        let bytes = axum::body::to_bytes(res.into_body(), usize::MAX).await.unwrap();
        (status, serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null))
    }

    #[test]
    fn day_handler_groups_epg_and_event_channels_for_the_local_day() {
        let rt = Runtime::new().unwrap();
        let state = Arc::new(AxumState::test_default());
        rt.block_on(async {
            seed(&state, "lista-sportdag", "sportdag-src", SPORT_VERSION).await;
            let at = T_1700Z + 30 * M;
            let (status, json) = get_json(state.clone(), &format!("/api/live-tv/sport/day?listId=lista-sportdag&day=2026-10-10&tzOffset=120&at={at}")).await;
            assert_eq!(status, StatusCode::OK);
            assert_eq!(json["fetchedAt"], 77);
            let matches = json["matches"].as_array().unwrap();
            // 00:30 svensk tid hör till den 10:e; GAIS–Sirius är en match med två källor; SHL ur eventkanalen.
            assert_eq!(matches.len(), 3, "{json}");
            assert_eq!(matches[0]["homeKey"], "aik");
            let gais = matches.iter().find(|m| m["homeKey"] == "gais").unwrap();
            assert_eq!(gais["status"], "live");
            assert_eq!(gais["sources"].as_array().unwrap().len(), 2);
            assert_eq!(gais["sources"][0]["sourceId"], "sportdag-src");
            let shl = matches.iter().find(|m| m["leagueKey"] == "shl").unwrap();
            assert_eq!(shl["sources"][0]["tvgId"], serde_json::Value::Null);
            assert_eq!(json["counts"]["football"], 2);
            assert_eq!(json["counts"]["hockey"], 1);

            // UTC-dagen: 22:30 den 9:e hör inte till den 10:e.
            let (_, utc) = get_json(state.clone(), &format!("/api/live-tv/sport/day?listId=lista-sportdag&day=2026-10-10&tzOffset=0&at={at}")).await;
            assert!(utc["matches"].as_array().unwrap().iter().all(|m| m["homeKey"] != "aik"));
        });
    }

    #[test]
    fn day_handler_enriches_an_old_store_and_rejects_a_bad_day() {
        let rt = Runtime::new().unwrap();
        let state = Arc::new(AxumState::test_default());
        rt.block_on(async {
            seed(&state, "lista-sportdag-gammal", "sportdag-gammal-src", 0).await;
            let (status, json) = get_json(state.clone(), "/api/live-tv/sport/day?listId=lista-sportdag-gammal&day=2026-10-10&tzOffset=120").await;
            assert_eq!(status, StatusCode::OK);
            assert!(json["matches"].as_array().unwrap().iter().any(|m| m["homeKey"] == "gais"), "{json}");
            let (bad, _) = get_json(state.clone(), "/api/live-tv/sport/day?listId=lista-sportdag&day=10-10-2026").await;
            assert_eq!(bad, StatusCode::BAD_REQUEST);
            let (no_list, _) = get_json(state, "/api/live-tv/sport/day?day=2026-10-10").await;
            assert_eq!(no_list, StatusCode::BAD_REQUEST);
        });
    }
```

(Kanalindexet är processglobalt — butikens `sources` scopar testerna till sin egen källa.)

- [ ] **Step 2: Kör och se dem falla**

Run: `cd APP/src-tauri && cargo test --lib live_tv_sport::tests::day_handler`
Expected: FAIL — `cannot find function day_handler`.

- [ ] **Step 3: Implementera** (lägg till importer överst: `use std::collections::BTreeMap; use std::sync::Arc; use axum::{extract::{Query, State}, http::StatusCode, response::{IntoResponse, Response}, Json};` och `use crate::axum_server::AxumState; use crate::live_tv_epg::{self, EpgStore}; use crate::live_tv_index::{self, LiveTvIndex};`)

```rust
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SportDayQuery {
    pub list_id: Option<String>,
    pub day: Option<String>,
    pub tz_offset: Option<i32>,
    pub at: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SportDayResponse {
    day: String,
    from: i64,
    to: i64,
    at: i64,
    fetched_at: Option<i64>,
    matches: Vec<SportMatch>,
    counts: BTreeMap<SportKind, usize>,
}

fn parse_day(text: &str) -> Option<i64> {
    let mut it = text.split('-');
    let (y, m, d) = (it.next()?.parse().ok()?, it.next()?.parse().ok()?, it.next()?.parse().ok()?);
    if it.next().is_some() || text.len() != 10 {
        return None;
    }
    crate::xmltv::days_since_epoch(y, m, d)
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Sportposterna i [from, to): EPG-program med `sport` på kanaler som har
/// tablå, och eventkanaler (utan tablå) tolkade på namnet. Bara listans egna
/// källor när butiken har några.
fn collect_entries(index: &LiveTvIndex, store: Option<&EpgStore>, from: i64, to: i64, at: i64, tz: i32) -> Vec<SportEntry> {
    let allowed = |id: &str| store.map(|s| s.sources.is_empty() || s.sources.iter().any(|x| x == id)).unwrap_or(true);
    let mut out = Vec::new();
    for (source_id, source) in index.sources.iter().filter(|(id, _)| allowed(id)) {
        for channel in &source.channels {
            let make_source = |start: i64, stop: i64, live: bool| MatchSource {
                channel_key: live_tv_epg::key_of(channel),
                name: channel.name.clone(),
                url: channel.url.clone(),
                logo: channel.logo.clone(),
                group: channel.group.clone(),
                tvg_id: channel.tvg_id.clone(),
                source_id: source_id.clone(),
                quality: quality_from_name(&channel.name),
                programme_start: start,
                programme_stop: stop,
                live_flag: live,
            };
            match store.and_then(|s| live_tv_epg::tvg_id_for(channel, s).and_then(|id| s.programmes.get(id))) {
                Some(list) => {
                    for p in live_tv_epg::programmes_in_window(list, from, to) {
                        let Some(info) = p.sport.clone() else { continue };
                        if p.start < from {
                            continue;
                        }
                        let source = make_source(p.start, p.stop, info.live);
                        out.push(SportEntry { info, start: p.start, stop: p.stop, ended: false, source });
                    }
                }
                None => {
                    let Some(ev) = parse_event_channel(&channel.name, at, tz) else { continue };
                    if ev.start_ms < from || ev.start_ms >= to {
                        continue;
                    }
                    let source = make_source(ev.start_ms, ev.stop_ms, ev.info.live);
                    out.push(SportEntry { info: ev.info, start: ev.start_ms, stop: ev.stop_ms, ended: ev.ended, source });
                }
            }
        }
    }
    out
}

pub async fn day_handler(State(state): State<Arc<AxumState>>, Query(q): Query<SportDayQuery>) -> Response {
    let list_id = q.list_id.unwrap_or_default().trim().to_string();
    if list_id.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "listId is required" }))).into_response();
    }
    let day_text = q.day.unwrap_or_default();
    let Some(day) = parse_day(&day_text) else {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "day must be YYYY-MM-DD" }))).into_response();
    };
    let tz = q.tz_offset.unwrap_or(0).clamp(-14 * 60, 14 * 60);
    let at = q.at.unwrap_or_else(now_ms);
    let from = day * 86_400_000 - tz as i64 * 60_000;
    let to = from + 86_400_000;
    let store = live_tv_epg::sport_ready_store(&state, &list_id).await;
    let index = live_tv_index::shared(&state);
    let entries = {
        let guard = index.read().await;
        collect_entries(&guard, store.as_deref(), from, to, at, tz)
    };
    let matches = group_entries(entries, at);
    let mut counts: BTreeMap<SportKind, usize> = BTreeMap::new();
    for m in matches.iter().filter(|m| !m.rerun) {
        *counts.entry(m.kind).or_insert(0) += 1;
    }
    (
        StatusCode::OK,
        Json(SportDayResponse {
            day: day_text,
            from,
            to,
            at,
            fetched_at: store.as_ref().map(|s| s.fetched_at_ms).filter(|t| *t > 0),
            matches,
            counts,
        }),
    )
        .into_response()
}
```

I `axum_server.rs`, efter raden med `/api/live-tv/epg/search`:

```rust
        .route("/api/live-tv/sport/day", get(crate::live_tv_sport::day_handler))
```

- [ ] **Step 4: Kör testerna och hela EPG-sviten**

Run: `cd APP/src-tauri && cargo test --lib live_tv_ && cargo test --lib xmltv && cargo build`
Expected: PASS och bygget går igenom (routen kompilerar mot `AxumState`).

- [ ] **Step 5: Commit**

```bash
cd APP
git add src-tauri/src/live_tv_sport.rs src-tauri/src/axum_server.rs
git commit -m "live-tv: /api/live-tv/sport/day — dagens matcher grupperade över kanaler"
```

---

## DEL 2 — PLUGINET

Alla kommandon nedan körs i `PLG/plugins/live-tv`. Testerna: `npx vitest run <fil>`; typkontroll: `npx tsc --noEmit -p .` (jämför mot baslinjen från Task 0 — inga NYA fel).

### Task 9: Matchmodell, klient mot `/sport/day` och testfixtur

**Files:**
- Create: `runtime/sport/sport-model.ts`
- Create: `runtime/sport/sport-epg.ts`
- Create: `runtime/sport/__sport-fixture.tsx` (testhjälp — importeras aldrig av runtime-kod)
- Test: `runtime/sport/sport-epg.test.ts`

**Interfaces:**
- Consumes: svaret från `GET /api/live-tv/sport/day` (Task 8), `LIVE_TV_GLOBAL_EPG_ID` (`live-tv-data.ts`).
- Produces:
  - `sport-model.ts`: `type SportKind = 'football' | 'hockey' | 'basketball' | 'handball' | 'motorsport' | 'tennis' | 'other'`; `SPORT_KINDS`, `SPORT_CHIPS` (de sex knapparna i specens ordning); `type SportFilter = SportKind | 'all'`; `type Quality = '4K' | 'FHD' | 'HD' | 'SD'`; `type MatchStatus = 'live' | 'upcoming' | 'finished'`; `interface MatchSource { channelKey; name; url; logo: string | null; group; tvgId: string | null; sourceId; quality: Quality | null; programmeStart; programmeStop; liveFlag: boolean }`; `interface SportMatch { id; kind; league; leagueKey; home: string | null; away: string | null; homeKey: string | null; awayKey: string | null; event: string | null; start; stop; status: MatchStatus; rerun: boolean; round: number | null; venue: string | null; sources: MatchSource[] }`; `interface SportDay { day; from; to; at; fetchedAt: number | null; matches: SportMatch[]; counts: Partial<Record<SportKind, number>> }`; `matchTitle(m): string`; `crestText(name: string): string`; `sourceChannel(s: MatchSource): M3uChannel`.
  - `sport-epg.ts`: `localDayKey(ms): string` ("YYYY-MM-DD", lokal tid); `shiftDay(day, delta): string`; `tzOffsetFor(day): number` (minuter öster om UTC, kl. 12 den dagen); `dayStartMs(day): number`; `class SportEndpointMissing extends Error`; `fetchSportDay(day: string, now?: number): Promise<SportDay>` (5 min minnescache per dag, ett avvisat löfte cachas inte); `__resetSportDayCache()`; `type SportDayState = 'loading' | 'ready' | 'missing' | 'error'`; `useSportDay(day: string | null, nowMs: number): { data: SportDay | null; state: SportDayState }` (`null` = hämta inget; hämtar om när `nowMs` passerar en ny 5-minutersgräns).
  - `__sport-fixture.tsx`: `MIN`, `HOUR`, `fxSource(name, over?)`, `fxMatch(over)`, `fxDay(day, matches)`, `stubSportDays(days | 'missing'): Mock` (byter `globalThis.fetch` för `/api/live-tv/sport/day`, släpper allt annat vidare till stubben som redan sitter).

- [ ] **Step 1: Skapa modellen** (`runtime/sport/sport-model.ts`)

```ts
import type { M3uChannel } from '../live-tv-data'

/** Spegel av Rusts `SportKind` (`src-tauri/src/live_tv_sport.rs`). */
export type SportKind = 'football' | 'hockey' | 'basketball' | 'handball' | 'motorsport' | 'tennis' | 'other'
export const SPORT_KINDS: readonly SportKind[] = ['football', 'hockey', 'basketball', 'handball', 'motorsport', 'tennis', 'other']
/** Sportknapparna (spec, beslut 2026-10-10), i ordning. */
export const SPORT_CHIPS: readonly SportKind[] = ['football', 'hockey', 'basketball', 'handball', 'motorsport', 'tennis']
export type SportFilter = SportKind | 'all'
export type Quality = '4K' | 'FHD' | 'HD' | 'SD'
export type MatchStatus = 'live' | 'upcoming' | 'finished'

export interface MatchSource {
  channelKey: string
  name: string
  url: string
  logo: string | null
  group: string
  tvgId: string | null
  /** Källan i kanalindexet; spellistans namn slås upp på den. */
  sourceId: string
  quality: Quality | null
  programmeStart: number
  programmeStop: number
  liveFlag: boolean
}

export interface SportMatch {
  id: string
  kind: SportKind
  league: string
  leagueKey: string
  home: string | null
  away: string | null
  homeKey: string | null
  awayKey: string | null
  /** Lagsportlösa event (motorsport, tennis). */
  event: string | null
  start: number
  stop: number
  status: MatchStatus
  rerun: boolean
  round: number | null
  venue: string | null
  sources: MatchSource[]
}

export interface SportDay {
  day: string
  from: number
  to: number
  at: number
  fetchedAt: number | null
  matches: SportMatch[]
  counts: Partial<Record<SportKind, number>>
}

export function matchTitle(m: Pick<SportMatch, 'home' | 'away' | 'event' | 'league'>): string {
  return m.home && m.away ? `${m.home} - ${m.away}` : m.event ?? m.league
}

const CREST_SKIP = new Set(['fc', 'if', 'ik', 'ifk', 'aif', 'bk', 'sk', 'hc', 'ff', 'is', 'cf', 'afc', 'ssc', 'hf', 'bik', 'gik'])

/** Handoffens initialcirkel: tre bokstäver ur första ordet som inte är ett föreningsaffix ("FC Barcelona" → BAR). */
export function crestText(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  const word = words.find((w) => !CREST_SKIP.has(w.toLowerCase()) && /\p{L}/u.test(w)) ?? words[0] ?? '?'
  return word.slice(0, 3).toUpperCase()
}

export function sourceChannel(s: MatchSource): M3uChannel {
  return { name: s.name, url: s.url, logo: s.logo, group: s.group, tvgId: s.tvgId }
}
```

- [ ] **Step 2: Skapa fixturen** (`runtime/sport/__sport-fixture.tsx`)

```tsx
import { vi } from 'vitest'
import { __resetSportDayCache } from './sport-epg'
import type { MatchSource, SportDay, SportKind, SportMatch } from './sport-model'

/*
  Testhjälp för sportvyerna. Importeras BARA av *.test.ts(x) — aldrig av
  runtime-kod (den drar in vitest). Matcherna läggs relativt Date.now() så
  att live/senare/avslutad stämmer oavsett när sviten körs.
*/
export const MIN = 60_000
export const HOUR = 3_600_000

export function fxSource(name: string, over: Partial<MatchSource> = {}): MatchSource {
  return { channelKey: `${name}::http://x/${name}`, name, url: `http://x/${name}`, logo: null, group: 'Sport', tvgId: null, sourceId: 'src-a', quality: null, programmeStart: 0, programmeStop: 0, liveFlag: true, ...over }
}

export function fxMatch(over: Partial<SportMatch> = {}): SportMatch {
  const home = over.home === undefined ? 'AIK' : over.home
  const away = over.away === undefined ? 'Hammarby' : over.away
  const start = over.start ?? Date.now()
  const stop = over.stop ?? start + 2 * HOUR
  return {
    id: `m-${home ?? over.event}-${away ?? ''}-${start}`,
    kind: 'football',
    league: 'Allsvenskan',
    leagueKey: 'allsvenskan',
    home,
    away,
    homeKey: home ? home.toLowerCase() : null,
    awayKey: away ? away.toLowerCase() : null,
    event: null,
    start,
    stop,
    status: 'upcoming',
    rerun: false,
    round: null,
    venue: null,
    sources: [fxSource('TV4 Fotboll FHD SE', { quality: 'FHD', programmeStart: start, programmeStop: stop })],
    ...over,
  }
}

export function fxDay(day: string, matches: SportMatch[]): SportDay {
  const counts: Partial<Record<SportKind, number>> = {}
  for (const m of matches) if (!m.rerun) counts[m.kind] = (counts[m.kind] ?? 0) + 1
  return { day, from: 0, to: 0, at: Date.now(), fetchedAt: Date.now(), matches, counts }
}

/** `/api/live-tv/sport/day` ur `days` (nycklat på dag), allt annat till fetch-stubben som redan sitter. */
export function stubSportDays(days: Record<string, SportMatch[]> | 'missing') {
  __resetSportDayCache()
  const base = globalThis.fetch
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input)
    const url = new URL(raw, 'http://localhost')
    if (url.pathname !== '/api/live-tv/sport/day') return base(input, init)
    if (days === 'missing') return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
    const day = url.searchParams.get('day') ?? ''
    return { ok: true, status: 200, json: async () => fxDay(day, days[day] ?? []) } as unknown as Response
  })
  globalThis.fetch = spy as unknown as typeof fetch
  return spy
}
```

- [ ] **Step 3: Skriv de fallerande testerna** (`runtime/sport/sport-epg.test.ts`)

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { SportEndpointMissing, __resetSportDayCache, fetchSportDay, localDayKey, shiftDay, tzOffsetFor, useSportDay } from './sport-epg'
import { crestText, matchTitle } from './sport-model'
import { HOUR, fxMatch, stubSportDays } from './__sport-fixture'

afterEach(() => __resetSportDayCache())

describe('dagnycklar', () => {
  it('flyttar över månads- och årsskiften i lokal tid', () => {
    expect(shiftDay('2026-10-10', -1)).toBe('2026-10-09')
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01')
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01')
    expect(localDayKey(new Date(2026, 9, 10, 0, 30).getTime())).toBe('2026-10-10')
  })
  it('tidszonen räknas för just den dagen (sommartid och vintertid kan skilja)', () => {
    expect(tzOffsetFor('2026-07-01')).toBe(-new Date(2026, 6, 1, 12).getTimezoneOffset())
    expect(tzOffsetFor('2026-12-01')).toBe(-new Date(2026, 11, 1, 12).getTimezoneOffset())
  })
})

describe('fetchSportDay', () => {
  it('frågar den globala EPG-butiken med dag och tidszon, och cachar i fem minuter', async () => {
    const spy = stubSportDays({ '2026-10-10': [fxMatch()] })
    const now = Date.now()
    const first = await fetchSportDay('2026-10-10', now)
    await fetchSportDay('2026-10-10', now + 60_000)
    expect(spy).toHaveBeenCalledTimes(1)
    const url = new URL(String(spy.mock.calls[0]![0]), 'http://localhost')
    expect(url.searchParams.get('listId')).toBe('global')
    expect(url.searchParams.get('day')).toBe('2026-10-10')
    expect(url.searchParams.get('tzOffset')).toBe(String(tzOffsetFor('2026-10-10')))
    expect(first.matches).toHaveLength(1)
    await fetchSportDay('2026-10-10', now + 6 * 60_000)
    expect(spy).toHaveBeenCalledTimes(2)
  })
  it('404 = äldre app: SportEndpointMissing, och felet cachas inte', async () => {
    const spy = stubSportDays('missing')
    await expect(fetchSportDay('2026-10-10')).rejects.toBeInstanceOf(SportEndpointMissing)
    await expect(fetchSportDay('2026-10-10')).rejects.toBeInstanceOf(SportEndpointMissing)
    expect(spy).toHaveBeenCalledTimes(2)
  })
  it('useSportDay ger missing på en äldre app och ready med data annars', async () => {
    stubSportDays('missing')
    const missing = renderHook(() => useSportDay('2026-10-10', Date.now()))
    await waitFor(() => expect(missing.result.current.state).toBe('missing'))
    stubSportDays({ '2026-10-11': [fxMatch({ start: Date.now() + HOUR })] })
    const ready = renderHook(() => useSportDay('2026-10-11', Date.now()))
    expect(ready.result.current.state).toBe('loading')
    await waitFor(() => expect(ready.result.current.state).toBe('ready'))
    expect(ready.result.current.data?.matches).toHaveLength(1)
    const none = renderHook(() => useSportDay(null, Date.now()))
    await act(async () => {})
    expect(none.result.current).toEqual({ data: null, state: 'ready' })
  })
})

describe('modellen', () => {
  it('titel och initialer', () => {
    expect(matchTitle({ home: 'GAIS', away: 'IK Sirius', event: null, league: 'Allsvenskan' })).toBe('GAIS - IK Sirius')
    expect(matchTitle({ home: null, away: null, event: 'Singapores GP - Kval', league: 'Formel 1' })).toBe('Singapores GP - Kval')
    expect(crestText('FC Barcelona')).toBe('BAR')
    expect(crestText('IFK Göteborg')).toBe('GÖT')
    expect(crestText('Paris SG')).toBe('PAR')
    expect(crestText('IF')).toBe('IF')
  })
})
```

- [ ] **Step 4: Kör och se dem falla**

Run: `npx vitest run runtime/sport/sport-epg.test.ts`
Expected: FAIL — `Failed to resolve import "./sport-epg"`.

- [ ] **Step 5: Implementera** (`runtime/sport/sport-epg.ts`)

```ts
'use client'

import { useEffect, useState } from 'react'
import { LIVE_TV_GLOBAL_EPG_ID } from '../live-tv-data'
import type { SportDay, SportMatch } from './sport-model'

/*
  Klienten mot värdens `/api/live-tv/sport/day` — ETT lokalt anrop per dag,
  inget mot någon leverantör. Status (live/senare/slut) räknas om i klienten
  på klockan, så dagen behöver bara hämtas om var femte minut.
*/

const pad = (n: number) => String(n).padStart(2, '0')

export function localDayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parts(day: string): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number)
  return [y ?? 1970, m ?? 1, d ?? 1]
}

export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = parts(day)
  return localDayKey(new Date(y, m - 1, d + delta, 12).getTime())
}

/** Minuter öster om UTC den dagen (kl. 12, så sommartidsbytet natten till inte stör). */
export function tzOffsetFor(day: string): number {
  const [y, m, d] = parts(day)
  return -new Date(y, m - 1, d, 12).getTimezoneOffset()
}

export function dayStartMs(day: string): number {
  const [y, m, d] = parts(day)
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

/** Värden svarar 404: appen är äldre än sportläget. */
export class SportEndpointMissing extends Error {
  constructor() {
    super('sport endpoint missing')
  }
}

const TTL_MS = 5 * 60_000
const cache = new Map<string, { at: number; promise: Promise<SportDay> }>()

export function __resetSportDayCache(): void {
  cache.clear()
}

function sanitizeDay(raw: unknown, day: string): SportDay {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<SportDay>
  const matches = Array.isArray(r.matches)
    ? (r.matches as SportMatch[]).map((m) => ({ ...m, sources: Array.isArray(m.sources) ? m.sources : [] }))
    : []
  return {
    day,
    from: Number(r.from ?? 0),
    to: Number(r.to ?? 0),
    at: Number(r.at ?? 0),
    fetchedAt: typeof r.fetchedAt === 'number' ? r.fetchedAt : null,
    matches,
    counts: r.counts && typeof r.counts === 'object' ? r.counts : {},
  }
}

export function fetchSportDay(day: string, now: number = Date.now()): Promise<SportDay> {
  const hit = cache.get(day)
  if (hit && now - hit.at < TTL_MS) return hit.promise
  const qs = new URLSearchParams({ listId: LIVE_TV_GLOBAL_EPG_ID, day, tzOffset: String(tzOffsetFor(day)) })
  const promise = fetch(`/api/live-tv/sport/day?${qs.toString()}`).then(async (res) => {
    if (res.status === 404) throw new SportEndpointMissing()
    if (!res.ok) throw new Error(`/api/live-tv/sport/day returned ${res.status}`)
    return sanitizeDay(await res.json(), day)
  })
  cache.set(day, { at: now, promise })
  promise.catch(() => {
    if (cache.get(day)?.promise === promise) cache.delete(day)
  })
  return promise
}

export type SportDayState = 'loading' | 'ready' | 'missing' | 'error'

export function useSportDay(day: string | null, nowMs: number): { data: SportDay | null; state: SportDayState } {
  const [result, setResult] = useState<{ day: string | null; data: SportDay | null; state: SportDayState }>({ day: null, data: null, state: 'loading' })
  const bucket = Math.floor(nowMs / TTL_MS)
  useEffect(() => {
    if (!day) return
    let cancelled = false
    fetchSportDay(day)
      .then((data) => { if (!cancelled) setResult({ day, data, state: 'ready' }) })
      .catch((error: unknown) => { if (!cancelled) setResult({ day, data: null, state: error instanceof SportEndpointMissing ? 'missing' : 'error' }) })
    return () => { cancelled = true }
  }, [day, bucket])
  if (!day) return { data: null, state: 'ready' }
  return result.day === day ? { data: result.data, state: result.state } : { data: null, state: 'loading' }
}
```

- [ ] **Step 6: Kör testerna och typkontrollen**

Run: `npx vitest run runtime/sport/sport-epg.test.ts && npx tsc --noEmit -p .`
Expected: PASS, inga nya typfel.

- [ ] **Step 7: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/sport-model.ts plugins/live-tv/runtime/sport/sport-epg.ts plugins/live-tv/runtime/sport/__sport-fixture.tsx plugins/live-tv/runtime/sport/sport-epg.test.ts
git commit -m "live-tv sport: matchmodell och klient mot /sport/day"
```

---

### Task 10: Sportlagring — inställningar, följda, åsidosättningar

**Files:**
- Create: `runtime/sport/sport-store.ts`
- Test: `runtime/sport/sport-store.test.ts`

**Interfaces:**
- Consumes: `SportKind`, `SPORT_KINDS` (Task 9), `readPluginJson`/`writePluginJson`/`onPluginStorageChanged` (`@/lib/plugin-sdk`), `LIVE_TV_PLUGIN_ID`.
- Produces:
  - `SPORT_SETTINGS_KEY = 'sport_settings_v1'`, `type SportViewMode = 'matchday' | 'feed'`, `type KickoffAlert = 'off' | '15' | 'kickoff'`, `interface SportSettings { view: SportViewMode; alert: KickoffAlert }` (standard `{ view: 'matchday', alert: '15' }`), `getSportSettings()`, `setSportSettings(patch): SportSettings`, `useSportSettings()`.
  - `SPORT_FOLLOWS_KEY = 'sport_follows_v1'`, `interface SportFollow { sport: SportKind; kind: 'team' | 'league'; key: string; name: string }`, `getFollows()`, `isFollowing(follows, f: Pick<SportFollow, 'sport' | 'kind' | 'key'>): boolean`, `toggleFollow(f: SportFollow): SportFollow[]`, `useFollows()`.
  - `SPORT_OVERRIDES_KEY = 'sport_overrides_v1'`, `interface OverrideChannel { key; name; url; logo: string | null; group; tvgId: string | null }`, `type SportOverrides = Record<string, OverrideChannel>` (match-id → kanal), `getOverrides()`, `setOverride(matchId, channel | null): SportOverrides`, `useOverrides()`.
  - `teamKeysMatch(a: string | null, b: string | null): boolean` — samma regel som Rusts `keys_match`.
  - `sportsCompatible(a: SportKind, b: SportKind): boolean` (lika, eller någon är `other`).

Åsidosättningen sparar hela kanalen, inte bara `channelKey`: en kanal ur en annan spellista än den aktiva måste gå att spela utan att indexet slås upp.

- [ ] **Step 1: Skriv de fallerande testerna** (`runtime/sport/sport-store.test.ts`)

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import {
  SPORT_FOLLOWS_KEY, SPORT_SETTINGS_KEY, getFollows, getOverrides, getSportSettings, isFollowing, setOverride,
  setSportSettings, sportsCompatible, teamKeysMatch, toggleFollow, useFollows,
} from './sport-store'

beforeEach(() => __resetForTests())

describe('sportinställningar', () => {
  it('standard och sanering av skräp', () => {
    expect(getSportSettings()).toEqual({ view: 'matchday', alert: '15' })
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { view: 'grid', alert: 5 })
    expect(getSportSettings()).toEqual({ view: 'matchday', alert: '15' })
    expect(setSportSettings({ view: 'feed' })).toEqual({ view: 'feed', alert: '15' })
    expect(setSportSettings({ alert: 'kickoff' })).toEqual({ view: 'feed', alert: 'kickoff' })
  })
})

describe('följda lag och turneringar', () => {
  const gais = { sport: 'football' as const, kind: 'team' as const, key: 'gais', name: 'GAIS' }
  it('växlar och lagrar på normaliserad nyckel', () => {
    expect(toggleFollow(gais)).toEqual([gais])
    expect(isFollowing(getFollows(), { sport: 'football', kind: 'team', key: 'gais' })).toBe(true)
    expect(toggleFollow(gais)).toEqual([])
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [gais, { sport: 'curling', kind: 'team', key: 'x', name: 'X' }, null])
    expect(getFollows()).toEqual([gais])
  })
  it('ett följt lag känns igen i kort och lång form, och i en sport som klassats som övrigt', () => {
    toggleFollow({ sport: 'hockey', kind: 'team', key: 'djurgarden', name: 'Djurgården' })
    expect(isFollowing(getFollows(), { sport: 'hockey', kind: 'team', key: 'djurgardens' })).toBe(true)
    expect(isFollowing(getFollows(), { sport: 'other', kind: 'team', key: 'djurgarden' })).toBe(true)
    expect(isFollowing(getFollows(), { sport: 'football', kind: 'team', key: 'djurgarden' })).toBe(false)
    expect(isFollowing(getFollows(), { sport: 'hockey', kind: 'league', key: 'djurgarden' })).toBe(false)
  })
  it('useFollows följer lagringen', () => {
    const { result } = renderHook(() => useFollows())
    expect(result.current).toEqual([])
    act(() => { toggleFollow(gais) })
    expect(result.current).toEqual([gais])
  })
})

describe('åsidosättningar', () => {
  it('sätter och tar bort en kanal per match', () => {
    const ch = { key: 'A::http://x/A', name: 'A', url: 'http://x/A', logo: null, group: 'Sport', tvgId: null }
    expect(setOverride('m1', ch)).toEqual({ m1: ch })
    expect(getOverrides().m1?.name).toBe('A')
    expect(setOverride('m1', null)).toEqual({})
  })
})

describe('teamKeysMatch (samma regel som Rust)', () => {
  it.each([
    ['djurgarden', 'djurgarden', true],
    ['djurgarden', 'djurgardens', true],
    ['nybro', 'nybro vikings', true],
    ['karlskoga', 'bik karlskoga', true],
    ['aik', 'hammarby', false],
    ['', '', false],
    [null, 'aik', false],
  ] as const)('%s ~ %s = %s', (a, b, expected) => {
    expect(teamKeysMatch(a, b)).toBe(expected)
  })
  it('sportsCompatible', () => {
    expect(sportsCompatible('hockey', 'other')).toBe(true)
    expect(sportsCompatible('hockey', 'football')).toBe(false)
  })
})
```

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/sport/sport-store.test.ts`
Expected: FAIL — `Failed to resolve import "./sport-store"`.

- [ ] **Step 3: Implementera** (`runtime/sport/sport-store.ts`)

```ts
'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { SPORT_KINDS, type SportKind } from './sport-model'

/*
  Sportens egna värden i pluginlagringen. Lagringen synkas med appens vanliga
  inställningssynk (WebDAV) — därför inget "cache" i nycklarna, och inget här
  är härlett ur EPG:t.
*/

export const SPORT_SETTINGS_KEY = 'sport_settings_v1'
export const SPORT_FOLLOWS_KEY = 'sport_follows_v1'
export const SPORT_OVERRIDES_KEY = 'sport_overrides_v1'

export type SportViewMode = 'matchday' | 'feed'
export type KickoffAlert = 'off' | '15' | 'kickoff'
export interface SportSettings {
  view: SportViewMode
  alert: KickoffAlert
}
const DEFAULT_SETTINGS: SportSettings = { view: 'matchday', alert: '15' }

function sanitizeSettings(raw: unknown): SportSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof SportSettings, unknown>>
  return {
    view: r.view === 'feed' || r.view === 'matchday' ? r.view : DEFAULT_SETTINGS.view,
    alert: r.alert === 'off' || r.alert === '15' || r.alert === 'kickoff' ? r.alert : DEFAULT_SETTINGS.alert,
  }
}

export function getSportSettings(): SportSettings {
  return sanitizeSettings(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, DEFAULT_SETTINGS))
}

export function setSportSettings(patch: Partial<SportSettings>): SportSettings {
  const next = sanitizeSettings({ ...getSportSettings(), ...patch })
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, next)
  return next
}

function useStored<T>(key: string, read: () => T): T {
  const [value, setValue] = useState(read)
  useEffect(() => {
    setValue(read())
    return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, key, () => setValue(read()))
    // `read` är en modulfunktion och byter aldrig identitet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return value
}

export function useSportSettings(): SportSettings {
  return useStored(SPORT_SETTINGS_KEY, getSportSettings)
}

/** Samma regel som `keys_match` i `live_tv_sport.rs`: lika, genitiv-s, eller kortformen är början/slutet av den långa. */
export function teamKeysMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  if (a === b || `${a}s` === b || `${b}s` === a) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  const sw = short.split(' ')
  const lw = long.split(' ')
  if (sw.length >= lw.length) return false
  const head = lw.slice(0, sw.length).join(' ')
  const tail = lw.slice(lw.length - sw.length).join(' ')
  return head === short || tail === short
}

/** En match som klassats som "övrigt" (t.ex. en eventkanal) kan vara vilken sport som helst. */
export function sportsCompatible(a: SportKind, b: SportKind): boolean {
  return a === b || a === 'other' || b === 'other'
}

export interface SportFollow {
  sport: SportKind
  kind: 'team' | 'league'
  /** Normaliserad nyckel (Rusts `team_key`, eller ligans nyckel). */
  key: string
  name: string
}

function sanitizeFollows(raw: unknown): SportFollow[] {
  if (!Array.isArray(raw)) return []
  const out: SportFollow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const f = item as Partial<SportFollow>
    if (!SPORT_KINDS.includes(f.sport as SportKind)) continue
    if (f.kind !== 'team' && f.kind !== 'league') continue
    if (typeof f.key !== 'string' || !f.key) continue
    out.push({ sport: f.sport as SportKind, kind: f.kind, key: f.key, name: typeof f.name === 'string' && f.name ? f.name : f.key })
  }
  return out
}

export function getFollows(): SportFollow[] {
  return sanitizeFollows(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, []))
}

export function isFollowing(follows: SportFollow[], f: Pick<SportFollow, 'sport' | 'kind' | 'key'>): boolean {
  return follows.some((x) =>
    x.kind === f.kind
    && sportsCompatible(x.sport, f.sport)
    && (f.kind === 'team' ? teamKeysMatch(x.key, f.key) : x.key === f.key))
}

export function toggleFollow(f: SportFollow): SportFollow[] {
  const current = getFollows()
  const next = isFollowing(current, f)
    ? current.filter((x) => !(x.kind === f.kind && sportsCompatible(x.sport, f.sport) && (f.kind === 'team' ? teamKeysMatch(x.key, f.key) : x.key === f.key)))
    : [...current, f]
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, next)
  return next
}

export function useFollows(): SportFollow[] {
  return useStored(SPORT_FOLLOWS_KEY, getFollows)
}

export interface OverrideChannel {
  key: string
  name: string
  url: string
  logo: string | null
  group: string
  tvgId: string | null
}
export type SportOverrides = Record<string, OverrideChannel>

function sanitizeOverrides(raw: unknown): SportOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: SportOverrides = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const c = value as Partial<OverrideChannel> | null
    if (!c || typeof c.key !== 'string' || typeof c.url !== 'string' || typeof c.name !== 'string') continue
    out[id] = { key: c.key, name: c.name, url: c.url, logo: typeof c.logo === 'string' ? c.logo : null, group: typeof c.group === 'string' ? c.group : '', tvgId: typeof c.tvgId === 'string' ? c.tvgId : null }
  }
  return out
}

export function getOverrides(): SportOverrides {
  return sanitizeOverrides(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, SPORT_OVERRIDES_KEY, {}))
}

export function setOverride(matchId: string, channel: OverrideChannel | null): SportOverrides {
  const next = { ...getOverrides() }
  if (channel) next[matchId] = channel
  else delete next[matchId]
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_OVERRIDES_KEY, next)
  return next
}

export function useOverrides(): SportOverrides {
  return useStored(SPORT_OVERRIDES_KEY, getOverrides)
}
```

- [ ] **Step 4: Kör testerna och typkontrollen**

Run: `npx vitest run runtime/sport/sport-store.test.ts && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/sport-store.ts plugins/live-tv/runtime/sport/sport-store.test.ts
git commit -m "live-tv sport: inställningar, följda lag och åsidosättningar"
```

---

### Task 11: Vymodellen (rena funktioner)

**Files:**
- Create: `runtime/sport/sport-day-model.ts`
- Test: `runtime/sport/sport-day-model.test.ts`

**Interfaces:**
- Consumes: Task 9 (`SportMatch`, `SportDay`, `MatchSource`, `SportFilter`, `SportKind`, `SPORT_KINDS`, `matchTitle`), Task 10 (`SportFollow`, `SportOverrides`, `teamKeysMatch`, `sportsCompatible`), `qualityFromName` (`live-tv-model.ts`).
- Produces:
  - `statusAt(m, now): MatchStatus` — serverns `finished` står kvar; annars på klockan.
  - `visibleMatches(day: SportDay | null, filter: SportFilter): SportMatch[]` — utan repriser, sorterat på start.
  - `sportCounts(day): Record<SportKind, number>` (utan repriser).
  - `splitSections(matches, now): { live: SportMatch[]; later: SportMatch[]; finished: SportMatch[] }`
  - `headerSummary(matches, now): { total: number; live: number }`
  - `followState(m, follows): { home: boolean; away: boolean; league: boolean; any: boolean }`
  - `rankedSources(m, overrides): MatchSource[]` — åsidosättningen först (även en kanal utanför matchens källor).
  - `featuredMatch(matches, follows, now): SportMatch | null`
  - `nextOnYourChannels(matches, now, excludeId: string | null, limit = 3): SportMatch[]`
  - `timelineAxis(matches, dayFrom): { start: number; end: number; hours: number[] }` (minst 8 h, inom dygnet; tomt = 15–23)
  - `interface TimelineRow { key: string; label: string; kind: SportKind; lanes: SportMatch[][] }` + `timelineRows(matches): TimelineRow[]` (girig fördelning på banor per liga)
  - `clashes(matches, minutes = 100): Set<string>` (match-id:n som krockar)
  - `interface FollowCandidate { sport: SportKind; kind: 'team' | 'league'; key: string; name: string; count: number }` + `followCandidates(days: (SportDay | null)[]): FollowCandidate[]`
  - `matchesFollow(m, f: SportFollow): boolean`, `nextMatchFor(f, days, now): SportMatch | null`, `teamRing(f, matches, now): 'live' | 'today' | 'none'`
  - `pickMultiviewKeys(matches, overrides, isKnown: (key: string) => boolean, max = 4): string[]` — välj en källa ur den aktiva spellistan när en sådan finns.
  - `leagueColor(key: string): string`, `crestColor(key: string): string`

- [ ] **Step 1: Skriv de fallerande testerna** (`runtime/sport/sport-day-model.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import {
  clashes, crestColor, featuredMatch, followCandidates, followState, headerSummary, leagueColor, nextMatchFor,
  nextOnYourChannels, pickMultiviewKeys, rankedSources, splitSections, sportCounts, statusAt, teamRing,
  timelineAxis, timelineRows, visibleMatches,
} from './sport-day-model'
import { HOUR, MIN, fxDay, fxMatch, fxSource } from './__sport-fixture'

const now = new Date(2026, 9, 10, 19, 0).getTime()
const dayFrom = new Date(2026, 9, 10, 0, 0).getTime()
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + HOUR })
const done = fxMatch({ id: 'done', home: 'Malmö', away: 'Göteborg', start: now - 4 * HOUR, stop: now - 2 * HOUR })
const rerun = fxMatch({ id: 'rerun', home: 'GAIS', away: 'Sirius', start: now + 3 * HOUR, rerun: true })
const shl = fxMatch({ id: 'shl', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'HV71', away: 'Brynäs', start: now + 30 * MIN })

describe('status och urval', () => {
  it('status på klockan, men serverns SLUT står kvar', () => {
    expect(statusAt(live, now)).toBe('live')
    expect(statusAt(later, now)).toBe('upcoming')
    expect(statusAt(done, now)).toBe('finished')
    expect(statusAt({ ...later, status: 'finished' }, now)).toBe('finished')
  })
  it('repriser syns aldrig och filtret håller sig till sporten', () => {
    const day = fxDay('2026-10-10', [later, rerun, live, shl])
    expect(visibleMatches(day, 'all').map((m) => m.id)).toEqual(['live', 'shl', 'later'])
    expect(visibleMatches(day, 'hockey').map((m) => m.id)).toEqual(['shl'])
    expect(visibleMatches(null, 'all')).toEqual([])
    expect(sportCounts(day)).toMatchObject({ football: 2, hockey: 1, tennis: 0 })
  })
  it('sektioner och sammanfattning', () => {
    const s = splitSections([live, later, done], now)
    expect([s.live.map((m) => m.id), s.later.map((m) => m.id), s.finished.map((m) => m.id)]).toEqual([['live'], ['later'], ['done']])
    expect(headerSummary([live, later, done], now)).toEqual({ total: 3, live: 1 })
  })
})

describe('följda och källor', () => {
  const follows = [{ sport: 'football' as const, kind: 'team' as const, key: 'hammarby', name: 'Hammarby' }]
  it('followState och hero: följd live före följd senare före annan', () => {
    expect(followState(later, follows)).toEqual({ home: false, away: true, league: false, any: true })
    expect(featuredMatch([later, live, done], follows, now)?.id).toBe('live')
    expect(featuredMatch([later, done], follows, now)?.id).toBe('later')
    expect(featuredMatch([], follows, now)).toBeNull()
    expect(nextOnYourChannels([live, later, shl, done], now, 'later').map((m) => m.id)).toEqual(['shl'])
  })
  it('åsidosättningen går först, även en kanal utanför matchens källor', () => {
    const m = fxMatch({ id: 'x', sources: [fxSource('A', { quality: 'FHD' }), fxSource('B')] })
    expect(rankedSources(m, {}).map((s) => s.name)).toEqual(['A', 'B'])
    expect(rankedSources(m, { x: { key: 'B::http://x/B', name: 'B', url: 'http://x/B', logo: null, group: 'Sport', tvgId: null } }).map((s) => s.name)).toEqual(['B', 'A'])
    const foreign = rankedSources(m, { x: { key: 'C::http://y/C', name: 'C 4K', url: 'http://y/C', logo: null, group: 'Sport', tvgId: null } })
    expect(foreign.map((s) => s.name)).toEqual(['C 4K', 'A', 'B'])
    expect(foreign[0]!.quality).toBe('4K')
  })
  it('Multiview väljer en källa ur den aktiva spellistan när den finns', () => {
    const a = fxMatch({ id: 'a', sources: [fxSource('Annan lista FHD', { quality: 'FHD' }), fxSource('Min kanal')] })
    const b = fxMatch({ id: 'b', sources: [fxSource('Bara här')] })
    const c = fxMatch({ id: 'c', sources: [] })
    const known = new Set(['Min kanal::http://x/Min kanal'])
    expect(pickMultiviewKeys([a, b, c], {}, (k) => known.has(k))).toEqual(['Min kanal::http://x/Min kanal', 'Bara här::http://x/Bara här'])
    expect(pickMultiviewKeys([a, a, b], {}, () => true, 1)).toEqual(['Annan lista FHD::http://x/Annan lista FHD'])
  })
})

describe('tidslinje, krockar och följkandidater', () => {
  it('axeln täcker matcherna, minst åtta timmar, inom dygnet', () => {
    const axis = timelineAxis([live, later], dayFrom)
    expect(axis.start).toBeLessThanOrEqual(live.start)
    expect(axis.end).toBeGreaterThanOrEqual(later.stop)
    expect(axis.end - axis.start).toBeGreaterThanOrEqual(8 * HOUR)
    expect(axis.end).toBeLessThanOrEqual(dayFrom + 24 * HOUR)
    expect(axis.hours[0]).toBe(axis.start)
    expect(timelineAxis([], dayFrom)).toMatchObject({ start: dayFrom + 15 * HOUR, end: dayFrom + 23 * HOUR })
  })
  it('överlappande matcher i samma liga hamnar på olika banor', () => {
    const overlap = fxMatch({ id: 'overlap', home: 'Mjällby', away: 'Degerfors', start: live.start + 15 * MIN })
    const after = fxMatch({ id: 'after', home: 'Häcken', away: 'Örgryte', start: live.stop })
    const rows = timelineRows([live, overlap, after, shl])
    const allsv = rows.find((r) => r.key === 'allsvenskan')!
    expect(allsv.lanes.map((lane) => lane.map((m) => m.id))).toEqual([['live', 'after'], ['overlap']])
    expect(rows.find((r) => r.key === 'shl')!.label).toBe('SHL')
  })
  it('krock under 100 minuter', () => {
    const a = fxMatch({ id: 'a', start: now })
    const b = fxMatch({ id: 'b', start: now + 90 * MIN })
    const c = fxMatch({ id: 'c', start: now + 5 * HOUR })
    expect([...clashes([c, a, b])].sort()).toEqual(['a', 'b'])
  })
  it('kandidater: lag och ligor ur dygnen, utan dubbletter och utan repriser', () => {
    const cands = followCandidates([fxDay('d1', [live, rerun, shl]), null, fxDay('d2', [later])])
    expect(cands.filter((c) => c.kind === 'league').map((c) => c.key)).toEqual(['allsvenskan', 'shl'])
    expect(cands.find((c) => c.key === 'gais')).toMatchObject({ kind: 'team', count: 1, sport: 'football' })
  })
  it('nästa match och ringen för ett följt lag', () => {
    const f = { sport: 'football' as const, kind: 'team' as const, key: 'gais', name: 'GAIS' }
    expect(nextMatchFor(f, [fxDay('d', [done, live, later])], now)?.id).toBe('live')
    expect(teamRing(f, [live, later], now)).toBe('live')
    expect(teamRing({ ...f, key: 'aik' }, [live, later], now)).toBe('today')
    expect(teamRing({ ...f, key: 'malmo' }, [live, later], now)).toBe('none')
  })
  it('färger är stabila', () => {
    expect(leagueColor('allsvenskan')).toBe(leagueColor('allsvenskan'))
    expect(leagueColor('okand-liga')).toMatch(/^hsl\(/)
    expect(crestColor('gais')).toBe(crestColor('gais'))
  })
})
```

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/sport/sport-day-model.test.ts`
Expected: FAIL — `Failed to resolve import "./sport-day-model"`.

- [ ] **Step 3: Implementera** (`runtime/sport/sport-day-model.ts`)

```ts
import { qualityFromName } from '../live-tv-model'
import { SPORT_KINDS, matchTitle, type MatchSource, type MatchStatus, type SportDay, type SportFilter, type SportKind, type SportMatch } from './sport-model'
import { sportsCompatible, teamKeysMatch, type SportFollow, type SportOverrides } from './sport-store'

/*
  Allt vyerna räknar ut, som rena funktioner. Ingen React, ingen lagring —
  vyerna skickar in klockan, följda och åsidosättningar.
*/

const HOUR = 3_600_000
const MIN = 60_000

export function statusAt(m: SportMatch, now: number): MatchStatus {
  if (m.status === 'finished' || now >= m.stop) return 'finished'
  if (now >= m.start) return 'live'
  return 'upcoming'
}

export function visibleMatches(day: SportDay | null, filter: SportFilter): SportMatch[] {
  if (!day) return []
  return day.matches
    .filter((m) => !m.rerun && (filter === 'all' || m.kind === filter))
    .sort((a, b) => a.start - b.start || matchTitle(a).localeCompare(matchTitle(b)))
}

export function sportCounts(day: SportDay | null): Record<SportKind, number> {
  const out = Object.fromEntries(SPORT_KINDS.map((k) => [k, 0])) as Record<SportKind, number>
  for (const m of day?.matches ?? []) if (!m.rerun) out[m.kind] += 1
  return out
}

export function splitSections(matches: SportMatch[], now: number): { live: SportMatch[]; later: SportMatch[]; finished: SportMatch[] } {
  return {
    live: matches.filter((m) => statusAt(m, now) === 'live'),
    later: matches.filter((m) => statusAt(m, now) === 'upcoming'),
    finished: matches.filter((m) => statusAt(m, now) === 'finished'),
  }
}

export function headerSummary(matches: SportMatch[], now: number): { total: number; live: number } {
  return { total: matches.length, live: matches.filter((m) => statusAt(m, now) === 'live').length }
}

export function matchesFollow(m: SportMatch, f: SportFollow): boolean {
  if (!sportsCompatible(f.sport, m.kind)) return false
  if (f.kind === 'league') return m.leagueKey !== '' && m.leagueKey === f.key
  return teamKeysMatch(f.key, m.homeKey) || teamKeysMatch(f.key, m.awayKey)
}

export function followState(m: SportMatch, follows: SportFollow[]): { home: boolean; away: boolean; league: boolean; any: boolean } {
  const team = (key: string | null) => follows.some((f) => f.kind === 'team' && sportsCompatible(f.sport, m.kind) && teamKeysMatch(f.key, key))
  const home = team(m.homeKey)
  const away = team(m.awayKey)
  const league = m.leagueKey !== '' && follows.some((f) => f.kind === 'league' && f.key === m.leagueKey)
  return { home, away, league, any: home || away || league }
}

export function rankedSources(m: SportMatch, overrides: SportOverrides): MatchSource[] {
  const o = overrides[m.id]
  if (!o) return m.sources
  const own = m.sources.find((s) => s.channelKey === o.key)
  const chosen: MatchSource = own ?? {
    channelKey: o.key, name: o.name, url: o.url, logo: o.logo, group: o.group, tvgId: o.tvgId,
    sourceId: '', quality: qualityFromName(o.name), programmeStart: m.start, programmeStop: m.stop, liveFlag: false,
  }
  return [chosen, ...m.sources.filter((s) => s.channelKey !== o.key)]
}

export function featuredMatch(matches: SportMatch[], follows: SportFollow[], now: number): SportMatch | null {
  const score = (m: SportMatch) => (followState(m, follows).any ? 1000 : 0) + m.sources.length
  const best = (list: SportMatch[]) => [...list].sort((a, b) => score(b) - score(a) || a.start - b.start)[0] ?? null
  const live = matches.filter((m) => statusAt(m, now) === 'live')
  const upcoming = matches.filter((m) => statusAt(m, now) === 'upcoming')
  return best(live) ?? best(upcoming.filter((m) => followState(m, follows).any)) ?? upcoming[0] ?? matches[matches.length - 1] ?? null
}

export function nextOnYourChannels(matches: SportMatch[], now: number, excludeId: string | null, limit = 3): SportMatch[] {
  return matches
    .filter((m) => m.id !== excludeId && m.sources.length > 0 && statusAt(m, now) === 'upcoming')
    .sort((a, b) => a.start - b.start)
    .slice(0, limit)
}

export function timelineAxis(matches: SportMatch[], dayFrom: number): { start: number; end: number; hours: number[] } {
  const dayTo = dayFrom + 24 * HOUR
  let start = dayFrom + 15 * HOUR
  let end = dayFrom + 23 * HOUR
  if (matches.length > 0) {
    start = Math.max(dayFrom, Math.floor(Math.min(...matches.map((m) => m.start)) / HOUR) * HOUR)
    end = Math.min(dayTo, Math.ceil(Math.max(...matches.map((m) => m.stop)) / HOUR) * HOUR)
    if (end - start < 8 * HOUR) {
      end = Math.min(dayTo, start + 8 * HOUR)
      start = Math.max(dayFrom, end - 8 * HOUR)
    }
  }
  const hours: number[] = []
  for (let t = start; t < end; t += HOUR) hours.push(t)
  return { start, end, hours }
}

export interface TimelineRow {
  key: string
  label: string
  kind: SportKind
  lanes: SportMatch[][]
}

export function timelineRows(matches: SportMatch[]): TimelineRow[] {
  const rows = new Map<string, TimelineRow>()
  for (const m of [...matches].sort((a, b) => a.start - b.start)) {
    const key = m.leagueKey || `kind:${m.kind}`
    const row = rows.get(key) ?? { key, label: m.league, kind: m.kind, lanes: [] }
    rows.set(key, row)
    const lane = row.lanes.find((l) => (l[l.length - 1]?.stop ?? 0) <= m.start)
    if (lane) lane.push(m)
    else row.lanes.push([m])
  }
  return [...rows.values()]
}

export function clashes(matches: SportMatch[], minutes = 100): Set<string> {
  const sorted = [...matches].sort((a, b) => a.start - b.start)
  const out = new Set<string>()
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length && sorted[j]!.start - sorted[i]!.start < minutes * MIN; j += 1) {
      out.add(sorted[i]!.id)
      out.add(sorted[j]!.id)
    }
  }
  return out
}

export interface FollowCandidate {
  sport: SportKind
  kind: 'team' | 'league'
  key: string
  name: string
  count: number
}

export function followCandidates(days: (SportDay | null)[]): FollowCandidate[] {
  const out = new Map<string, FollowCandidate>()
  const add = (c: Omit<FollowCandidate, 'count'>) => {
    const id = `${c.kind}:${c.key}`
    const hit = out.get(id)
    if (hit) hit.count += 1
    else out.set(id, { ...c, count: 1 })
  }
  for (const day of days) {
    for (const m of day?.matches ?? []) {
      if (m.rerun) continue
      if (m.leagueKey) add({ sport: m.kind, kind: 'league', key: m.leagueKey, name: m.league })
      if (m.home && m.homeKey) add({ sport: m.kind, kind: 'team', key: m.homeKey, name: m.home })
      if (m.away && m.awayKey) add({ sport: m.kind, kind: 'team', key: m.awayKey, name: m.away })
    }
  }
  return [...out.values()].sort((a, b) =>
    SPORT_KINDS.indexOf(a.sport) - SPORT_KINDS.indexOf(b.sport) || (a.kind === b.kind ? 0 : a.kind === 'league' ? -1 : 1) || a.name.localeCompare(b.name))
}

export function nextMatchFor(f: SportFollow, days: (SportDay | null)[], now: number): SportMatch | null {
  return days
    .flatMap((d) => d?.matches ?? [])
    .filter((m) => !m.rerun && statusAt(m, now) !== 'finished' && matchesFollow(m, f))
    .sort((a, b) => a.start - b.start)[0] ?? null
}

export function teamRing(f: SportFollow, matches: SportMatch[], now: number): 'live' | 'today' | 'none' {
  const mine = matches.filter((m) => !m.rerun && matchesFollow(m, f))
  if (mine.some((m) => statusAt(m, now) === 'live')) return 'live'
  if (mine.some((m) => statusAt(m, now) === 'upcoming')) return 'today'
  return 'none'
}

export function pickMultiviewKeys(matches: SportMatch[], overrides: SportOverrides, isKnown: (key: string) => boolean, max = 4): string[] {
  const out: string[] = []
  for (const m of matches) {
    const ranked = rankedSources(m, overrides)
    const chosen = ranked.find((s) => isKnown(s.channelKey)) ?? ranked[0]
    if (chosen && !out.includes(chosen.channelKey)) out.push(chosen.channelKey)
    if (out.length >= max) break
  }
  return out
}

const LEAGUE_COLORS: Record<string, string> = {
  allsvenskan: '#3b82f6', superettan: '#60a5fa', 'premier-league': '#a855f7', 'efl-championship': '#c084fc',
  'uefa-champions-league': '#2563eb', 'uefa-europa-league': '#f97316', 'uefa-nations-league': '#0ea5e9',
  'serie-a': '#22c55e', bundesliga: '#e11d48', 'la-liga': '#f59e0b', 'ligue-1': '#14b8a6',
  shl: '#ef4444', hockeyallsvenskan: '#fb923c', nhl: '#94a3b8', f1: '#dc2626', motogp: '#f43f5e', atp: '#84cc16',
}

function hue(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) % 360
  return h
}

export function leagueColor(key: string): string {
  return LEAGUE_COLORS[key] ?? `hsl(${hue(key)} 70% 60%)`
}

export function crestColor(key: string): string {
  return `hsl(${hue(key)} 55% 42%)`
}
```

- [ ] **Step 4: Kör testerna och typkontrollen**

Run: `npx vitest run runtime/sport/sport-day-model.test.ts && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/sport-day-model.ts plugins/live-tv/runtime/sport/sport-day-model.test.ts
git commit -m "live-tv sport: vymodell för sektioner, tidslinje, följda och källor"
```

---

### Task 12: Avsparksnotis genom befintliga påminnelser

**Files:**
- Modify: `runtime/reminders.ts` (`Reminder`, `sanitize`, `dueReminders`, ny `replaceSportReminders`)
- Create: `runtime/sport/sport-alerts.ts`
- Modify: `runtime/live-tv-reminders-mount.tsx` (starta synken)
- Test: `runtime/sport/sport-alerts.test.ts`

**Interfaces:**
- Consumes: Task 9 (`fetchSportDay`, `localDayKey`, `shiftDay`, `matchTitle`, `sourceChannel`), Task 10 (`getFollows`, `getSportSettings`, `getOverrides`, `KickoffAlert`, nycklarna), Task 11 (`followState`, `rankedSources`, `statusAt`), `reminderId`, `channelKey`.
- Produces:
  - `Reminder.leadMs?: number` (egen förvarning; saknas = `REMINDER_LEAD_MS`), `Reminder.origin?: 'sport'`.
  - `replaceSportReminders(next: Reminder[], now?: number): Reminder[]` — byter ut ALLA automatiska (`origin: 'sport'`), rör aldrig manuella, hoppar över en automatisk vars id redan finns som manuell, behåller `notifiedAt` för samma id, skriver inte om inget ändrats.
  - `KICKOFF_LEAD_MS: { '15': 900000; kickoff: 0 }`, `kickoffReminders(days, follows, alert, overrides, now): Reminder[]`, `syncKickoffReminders(now?): Promise<void>`, `startSportAlertSync(): () => void` (var 30:e minut + vid ändrad följ-/inställnings-/åsidosättningslagring).

Ingen följd = inget anrop alls, bara städning av gamla automatiska påminnelser.

- [ ] **Step 1: Skriv de fallerande testerna** (`runtime/sport/sport-alerts.test.ts`)

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests } from '@/lib/plugin-sdk'
import { dueReminders, getReminders, reminderId, replaceSportReminders, toggleReminder } from '../reminders'
import { KICKOFF_LEAD_MS, kickoffReminders, syncKickoffReminders } from './sport-alerts'
import { setSportSettings, toggleFollow } from './sport-store'
import { sourceChannel } from './sport-model'
import { HOUR, MIN, fxDay, fxMatch, stubSportDays } from './__sport-fixture'
import { localDayKey } from './sport-epg'

beforeEach(() => __resetForTests())

const now = Date.now()
const hammarby = { sport: 'football' as const, kind: 'team' as const, key: 'hammarby', name: 'Hammarby' }

describe('kickoffReminders', () => {
  it('följd kommande match → påminnelse på bästa källan med vald förvarning', () => {
    const m = fxMatch({ start: now + 2 * HOUR })
    const [r, ...rest] = kickoffReminders([fxDay('d', [m])], [hammarby], '15', {}, now)
    expect(rest).toEqual([])
    expect(r).toMatchObject({ origin: 'sport', leadMs: 15 * MIN, title: 'AIK - Hammarby', start: m.start, channelName: 'TV4 Fotboll FHD SE' })
    expect(r!.id).toBe(reminderId(sourceChannel(m.sources[0]!), { start: m.start }))
    expect(kickoffReminders([fxDay('d', [m])], [hammarby], 'kickoff', {}, now)[0]!.leadMs).toBe(KICKOFF_LEAD_MS.kickoff)
  })
  it('inget för ofölj, avslutade, pågående, repriser eller avstängd notis', () => {
    const m = fxMatch({ start: now + HOUR })
    expect(kickoffReminders([fxDay('d', [m])], [], '15', {}, now)).toEqual([])
    expect(kickoffReminders([fxDay('d', [m])], [hammarby], 'off', {}, now)).toEqual([])
    expect(kickoffReminders([fxDay('d', [fxMatch({ start: now - 10 * MIN })])], [hammarby], '15', {}, now)).toEqual([])
    expect(kickoffReminders([fxDay('d', [fxMatch({ start: now + HOUR, rerun: true })])], [hammarby], '15', {}, now)).toEqual([])
    expect(kickoffReminders([null], [hammarby], '15', {}, now)).toEqual([])
  })
})

describe('replaceSportReminders', () => {
  it('manuell påminnelse på samma program ger ingen dubblett, och avföljning tar bara bort den automatiska', () => {
    const m = fxMatch({ start: now + 2 * HOUR })
    const channel = sourceChannel(m.sources[0]!)
    toggleReminder(channel, { title: 'AIK - Hammarby', start: m.start, stop: m.stop }, now)
    const other = fxMatch({ id: 'other', home: 'Bajen', away: 'Hammarby', start: now + 5 * HOUR, sources: [{ ...m.sources[0]!, channelKey: 'B::http://x/B', name: 'B', url: 'http://x/B', programmeStart: now + 5 * HOUR }] })
    replaceSportReminders(kickoffReminders([fxDay('d', [m, other])], [hammarby], '15', {}, now), now)
    const list = getReminders(now)
    expect(list).toHaveLength(2)
    expect(list.filter((r) => r.origin === 'sport').map((r) => r.channelName)).toEqual(['B'])
    replaceSportReminders([], now)
    expect(getReminders(now).map((r) => r.origin ?? 'manual')).toEqual(['manual'])
  })
  it('förvarningen per påminnelse styr när den förfaller', () => {
    const at = fxMatch({ start: now + 20 * MIN })
    replaceSportReminders(kickoffReminders([fxDay('d', [at])], [hammarby], 'kickoff', {}, now), now)
    expect(dueReminders(now + 19 * MIN)).toHaveLength(0)
    replaceSportReminders(kickoffReminders([fxDay('d', [at])], [hammarby], '15', {}, now), now)
    expect(dueReminders(now + 6 * MIN)).toHaveLength(1)
  })
})

describe('syncKickoffReminders', () => {
  it('utan följda görs inget anrop alls', async () => {
    const spy = stubSportDays({})
    await syncKickoffReminders(now)
    expect(spy).not.toHaveBeenCalled()
  })
  it('med följda läses idag och imorgon och påminnelserna skrivs', async () => {
    toggleFollow(hammarby)
    setSportSettings({ alert: '15' })
    const spy = stubSportDays({ [localDayKey(now)]: [fxMatch({ start: now + HOUR })] })
    await syncKickoffReminders(now)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(getReminders(now).filter((r) => r.origin === 'sport')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/sport/sport-alerts.test.ts`
Expected: FAIL — `Failed to resolve import "./sport-alerts"` (och `replaceSportReminders` saknas).

- [ ] **Step 3: Implementera**

I `runtime/reminders.ts`, utöka `Reminder`:

```ts
  /** Satt när bannern visats så den inte visas igen. */
  notifiedAt?: number
  /** Egen förvarning i ms (avsparksnotisen: 15 min eller 0). Saknas = REMINDER_LEAD_MS. */
  leadMs?: number
  /** 'sport' = skapad av avsparksnotisen; byts ut av `replaceSportReminders`, aldrig av användarens egna. */
  origin?: 'sport'
}
```

I `sanitize`, sist i objektet som pushas:

```ts
      notifiedAt: typeof r.notifiedAt === 'number' ? r.notifiedAt : undefined,
      leadMs: typeof r.leadMs === 'number' && r.leadMs >= 0 ? r.leadMs : undefined,
      origin: r.origin === 'sport' ? 'sport' : undefined,
```

Byt `dueReminders`:

```ts
/** Påminnelser vars förvarningsfönster (start − lead) har passerat och som inte visats. */
export function dueReminders(now: number = Date.now(), leadMs: number = REMINDER_LEAD_MS): Reminder[] {
  return getReminders(now).filter((r) => r.notifiedAt === undefined && r.start - (r.leadMs ?? leadMs) <= now)
}
```

och lägg till efter `removeReminder`:

```ts
/**
 * Byt ut avsparksnotisens automatiska påminnelser mot `next`.
 *
 * Manuella påminnelser rörs aldrig. Har användaren själv satt en påminnelse
 * på samma program (samma id) vinner den — ingen dubblett. En automatisk som
 * redan visats behåller `notifiedAt`, så synken inte visar bannern igen.
 */
export function replaceSportReminders(next: Reminder[], now: number = Date.now()): Reminder[] {
  const current = getReminders(now)
  const manual = current.filter((r) => r.origin !== 'sport')
  const manualIds = new Set(manual.map((r) => r.id))
  const previous = new Map(current.filter((r) => r.origin === 'sport').map((r) => [r.id, r]))
  const auto = next
    .filter((r) => !manualIds.has(r.id))
    .map((r) => ({ ...r, origin: 'sport' as const, notifiedAt: previous.get(r.id)?.notifiedAt }))
  const merged = [...manual, ...auto].sort((left, right) => left.start - right.start)
  if (JSON.stringify(merged) !== JSON.stringify(current)) write(merged)
  return merged
}
```

Skapa `runtime/sport/sport-alerts.ts`:

```ts
'use client'

import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey } from '../live-tv-data'
import { reminderId, replaceSportReminders, type Reminder } from '../reminders'
import { fetchSportDay, localDayKey, shiftDay } from './sport-epg'
import { matchTitle, sourceChannel, type SportDay } from './sport-model'
import { followState, rankedSources, statusAt } from './sport-day-model'
import {
  SPORT_FOLLOWS_KEY, SPORT_OVERRIDES_KEY, SPORT_SETTINGS_KEY, getFollows, getOverrides, getSportSettings,
  type KickoffAlert, type SportFollow, type SportOverrides,
} from './sport-store'

/*
  AVSPARKSNOTISEN = VANLIGA PÅMINNELSER.

  Följda lags kommande matcher blir `Reminder` med `origin: 'sport'` och en
  egen förvarning. Schemaläggaren i `reminders.ts` visar dem som vilken
  påminnelse som helst — bara medan appen körs (spec). Synken läser dagen
  lokalt (`/sport/day`) och anropar ingenting alls när inget följs.
*/

export const KICKOFF_LEAD_MS = { '15': 15 * 60_000, kickoff: 0 } as const
export const SPORT_ALERT_SYNC_MS = 30 * 60_000

export function kickoffReminders(
  days: (SportDay | null)[],
  follows: SportFollow[],
  alert: KickoffAlert,
  overrides: SportOverrides,
  now: number,
): Reminder[] {
  if (alert === 'off' || follows.length === 0) return []
  const out: Reminder[] = []
  for (const day of days) {
    for (const m of day?.matches ?? []) {
      if (m.rerun || statusAt(m, now) !== 'upcoming' || !followState(m, follows).any) continue
      const source = rankedSources(m, overrides)[0]
      if (!source) continue
      const channel = sourceChannel(source)
      out.push({
        id: reminderId(channel, { start: source.programmeStart }),
        channelKey: channelKey(channel),
        channelName: channel.name,
        channelUrl: channel.url,
        channelLogo: channel.logo ?? null,
        channelGroup: channel.group,
        channelTvgId: channel.tvgId,
        title: matchTitle(m),
        start: source.programmeStart,
        stop: source.programmeStop,
        createdAt: now,
        leadMs: KICKOFF_LEAD_MS[alert],
        origin: 'sport',
      })
    }
  }
  return out
}

export async function syncKickoffReminders(now: number = Date.now()): Promise<void> {
  const follows = getFollows()
  const { alert } = getSportSettings()
  if (alert === 'off' || follows.length === 0) {
    replaceSportReminders([], now)
    return
  }
  const today = localDayKey(now)
  const days = await Promise.all([today, shiftDay(today, 1)].map((day) => fetchSportDay(day, now).catch(() => null)))
  replaceSportReminders(kickoffReminders(days, follows, alert, getOverrides(), now), now)
}

export function startSportAlertSync(): () => void {
  let stopped = false
  const run = () => {
    if (!stopped) void syncKickoffReminders().catch(() => {})
  }
  run()
  const timer = window.setInterval(run, SPORT_ALERT_SYNC_MS)
  const offs = [SPORT_FOLLOWS_KEY, SPORT_SETTINGS_KEY, SPORT_OVERRIDES_KEY].map((key) => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, key, run))
  return () => {
    stopped = true
    window.clearInterval(timer)
    for (const off of offs) off()
  }
}
```

I `runtime/live-tv-reminders-mount.tsx`: importera `import { startSportAlertSync } from './sport/sport-alerts'` och lägg en effekt direkt efter schemaläggarens:

```tsx
  // Avsparksnotisen: följda lags matcher blir påminnelser (spec: Följer).
  useEffect(() => startSportAlertSync(), [])
```

- [ ] **Step 4: Kör testerna (nya + påminnelsernas gamla)**

Run: `npx vitest run runtime/sport/sport-alerts.test.ts runtime/reminders.test.ts && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/reminders.ts plugins/live-tv/runtime/sport/sport-alerts.ts plugins/live-tv/runtime/sport/sport-alerts.test.ts plugins/live-tv/runtime/live-tv-reminders-mount.tsx
git commit -m "live-tv sport: avsparksnotis som vanliga påminnelser"
```

---

### Task 13: Texter, ikoner, vykontext och delade delar

**Files:**
- Modify: `runtime/tv/tv-strings.ts` (nya nycklar sist i `EN` och sist i `SV`)
- Create: `runtime/sport/sport-ctx.ts`
- Create: `runtime/sport/tv/sport-icons.tsx`
- Create: `runtime/sport/tv/sport-parts.tsx`
- Modify: `runtime/sport/__sport-fixture.tsx` (lägg till `fakeCtx`)
- Test: `runtime/sport/tv/sport-parts.test.tsx`

**Interfaces:**
- Consumes: Task 9–11, `toggleReminder`/`reminderId`/`useReminders` (`reminders.ts`), `formatClock`/`progressOf` (`live-tv-ui.tsx`), `TV`/`dp`/`station`/`Tag`/`Progress`/`cardStyle` (`tv/tv-ui.tsx`), `TvNav` (typ, `tv/tv-shell.tsx`), `LiveTvModel` (typ).
- Produces:
  - Strängnycklar (EN + SV): `railSport, sheetSport, sportTitle, sportSummary, sportYesterday, sportToday, sportTomorrow, sportTabForYou, sportTabFollows, sportViewAs, sportMatchday, sportFeed, sportAll, sportKindFootball, sportKindHockey, sportKindBasketball, sportKindHandball, sportKindMotorsport, sportKindTennis, sportKindOther, sportLiveWindow, sportEnded, sportYouFollow, sportWatchOn, sportMatchCenter, sportSources, sportSourcesShort, sportNextOnChannels, sportMatchdayHint, sportLiveNow, sportLater, sportFinished, sportYourTeams, sportYourTeamsHint, sportAddTeam, sportJustNow, sportJustNowSub, sportEveningPlan, sportYourEvening, sportEveningCount, sportClash, sportAlertOff, sportAlert15, sportAlertKickoff, sportFollowAdd, sportFollowSummary, sportKickoffAlert, sportAlertOnlyRunning, sportNoUpcoming, sportVs, sportTodayAt, sportTomorrowAt, sportLiveNowShort, sportFollowName, sportFollowingName, sportWhereToWatch, sportBest, sportLatencyUnknown, sportWatchQuality, sportWatch, sportPickChannel, sportPickChannelSub, sportYourChoice, sportUseAutomatic, sportRemindMe, sportReminded, sportMatches, sportMatchesHint, sportPickSeveral, sportOpenMultiview, sportOnThisChannel, sportLiveOnChannels, sportLaterOnChannels, sportNowPill, sportEmptyDay, sportLoading, sportNeedsUpdate, sportError, sportRound, sportPlaylistUnknown, sportFollowEmpty, sportClose`.
  - `sport-ctx.ts`: `KIND_KEYS: Record<SportKind, TvStringKey>`; `interface SportCtx { model: LiveTvModel; nav: TvNav; now: number; locale: string; tt(key, vars?): string; follows: SportFollow[]; overrides: SportOverrides; settings: SportSettings; reminders: Reminder[]; kindLabel(kind): string; playlistName(sourceId): string; openMatch(m): void; openFollowPicker(): void; watch(m, source?): void; toggleRemind(m): void; isReminded(m): boolean }`; `buildSportCtx(input): SportCtx`; `useSportCtx({ model, nav, openMatch, openFollowPicker }): SportCtx`; texthjälpare `timeLine(m, ctx)`, `sourceLine(m, ctx)`, `sourceChip(m, ctx)`, `followNextLine(ctx, follow, next)`, `alertLabel(ctx)`.
  - `sport-icons.tsx`: `SportIcons.{Ball, Hockey, Basket, Handball, Flag, Tennis, Calendar, Rows, Star, Bell, Plus, Play}` (`{ size?: number; filled?: boolean }`), `SportIcon({ kind, size })`.
  - `sport-parts.tsx`: stilar `ellipsis`, `overline`, `primaryBtn`, `secondaryBtn`, `sectionTitle`; komponenter `Crest({ name, colorKey, size? })`, `LeagueDot({ leagueKey, size? })`, `StatusTag({ match, ctx })`, `MatchCard({ match, ctx })`, `CardRow({ title, matches, ctx, testId })`, `Notice({ text, testId? })`.
  - `__sport-fixture.tsx`: `fakeCtx(over?: Partial<SportCtx>): SportCtx` (`watch`, `toggleRemind`, `openMatch`, `openFollowPicker` är `vi.fn()`; engelska texter; `nav.pushLayer` returnerar en no-op).

- [ ] **Step 1: Lägg in texterna**

Sist i `EN` (efter `sectionMore: 'More',`):

```ts
  // Sportläge (fas 1, EPG)
  railSport: 'Sport',
  sheetSport: 'Sport',
  sportTitle: 'Sport',
  sportSummary: '{day} · {count} matches · {live} live',
  sportYesterday: 'Yesterday',
  sportToday: 'Today',
  sportTomorrow: 'Tomorrow',
  sportTabForYou: 'For you',
  sportTabFollows: 'Following',
  sportViewAs: 'View as',
  sportMatchday: 'Matchday',
  sportFeed: 'Feed',
  sportAll: 'All sports',
  sportKindFootball: 'Football',
  sportKindHockey: 'Ice hockey',
  sportKindBasketball: 'Basketball',
  sportKindHandball: 'Handball',
  sportKindMotorsport: 'Motorsport',
  sportKindTennis: 'Tennis',
  sportKindOther: 'Other',
  sportLiveWindow: 'LIVE · {from}–{to}',
  sportEnded: 'ENDED',
  sportYouFollow: 'You follow',
  sportWatchOn: 'Watch on {channel}',
  sportMatchCenter: 'Match center',
  sportSources: '{n} sources in your playlists',
  sportSourcesShort: '{n} sources',
  sportNextOnChannels: 'Next on your channels',
  sportMatchdayHint: 'select a match for the match center',
  sportLiveNow: 'Live now',
  sportLater: 'Later',
  sportFinished: 'Finished',
  sportYourTeams: 'Your teams',
  sportYourTeamsHint: 'red ring = playing now · white ring = playing today',
  sportAddTeam: 'Add',
  sportJustNow: 'Right now',
  sportJustNowSub: '{n} matches',
  sportEveningPlan: 'Evening plan',
  sportYourEvening: 'Your evening',
  sportEveningCount: '{n} matches with a reminder',
  sportClash: 'Clashes',
  sportAlertOff: 'Off',
  sportAlert15: '15 min before',
  sportAlertKickoff: 'At kick-off',
  sportFollowAdd: 'Add teams or competitions',
  sportFollowSummary: '{n} followed · notice {rule}',
  sportKickoffAlert: 'Kick-off notice',
  sportAlertOnlyRunning: 'Notices only arrive while Lumio is running.',
  sportNoUpcoming: 'No match in the guide',
  sportVs: 'vs {opponent}',
  sportTodayAt: 'Today {time}',
  sportTomorrowAt: 'Tomorrow {time}',
  sportLiveNowShort: 'LIVE now',
  sportFollowName: 'Follow {name}',
  sportFollowingName: 'Following {name}',
  sportWhereToWatch: 'Where can I watch it',
  sportBest: 'BEST',
  sportLatencyUnknown: '—',
  sportWatchQuality: 'Watch · {quality}',
  sportWatch: 'Watch',
  sportPickChannel: 'Choose another channel…',
  sportPickChannelSub: 'Point the match at any channel in your playlists',
  sportYourChoice: 'Your choice',
  sportUseAutomatic: 'Use the automatic choice',
  sportRemindMe: 'Remind me',
  sportReminded: 'Reminder set',
  sportMatches: 'Matches',
  sportMatchesHint: 'Select to switch match. Select several to watch them together.',
  sportPickSeveral: 'Select several',
  sportOpenMultiview: 'Open in Multiview ({n})',
  sportOnThisChannel: 'On this channel',
  sportLiveOnChannels: 'Live on your channels',
  sportLaterOnChannels: 'Later today on your channels',
  sportNowPill: 'NOW',
  sportEmptyDay: 'No matches in the guide for this day.',
  sportLoading: 'Fetching matches…',
  sportNeedsUpdate: 'Sport needs a newer version of Lumio.',
  sportError: 'Could not read the guide.',
  sportRound: 'Round {n}',
  sportPlaylistUnknown: 'Playlist',
  sportFollowEmpty: 'Follow a team or a competition and its matches show up here.',
  sportClose: 'Close',
```

Sist i `SV` (efter `sectionMore: 'Mer',`):

```ts
  // Sportläge (fas 1, EPG)
  railSport: 'Sport',
  sheetSport: 'Sport',
  sportTitle: 'Sport',
  sportSummary: '{day} · {count} matcher · {live} live',
  sportYesterday: 'Igår',
  sportToday: 'Idag',
  sportTomorrow: 'Imorgon',
  sportTabForYou: 'För dig',
  sportTabFollows: 'Följer',
  sportViewAs: 'Visa som',
  sportMatchday: 'Matchdag',
  sportFeed: 'Flöde',
  sportAll: 'Alla sporter',
  sportKindFootball: 'Fotboll',
  sportKindHockey: 'Ishockey',
  sportKindBasketball: 'Basket',
  sportKindHandball: 'Handboll',
  sportKindMotorsport: 'Motorsport',
  sportKindTennis: 'Tennis',
  sportKindOther: 'Övrigt',
  sportLiveWindow: 'LIVE · {from}–{to}',
  sportEnded: 'SLUT',
  sportYouFollow: 'Du följer',
  sportWatchOn: 'Titta på {channel}',
  sportMatchCenter: 'Matchcenter',
  sportSources: '{n} källor i dina spellistor',
  sportSourcesShort: '{n} källor',
  sportNextOnChannels: 'Nästa på dina kanaler',
  sportMatchdayHint: 'välj en match för matchcenter',
  sportLiveNow: 'Live nu',
  sportLater: 'Senare',
  sportFinished: 'Avslutade',
  sportYourTeams: 'Dina lag',
  sportYourTeamsHint: 'röd ring = spelar nu · vit ring = spelar idag',
  sportAddTeam: 'Lägg till',
  sportJustNow: 'Just nu',
  sportJustNowSub: '{n} matcher',
  sportEveningPlan: 'Kvällsplan',
  sportYourEvening: 'Din kväll',
  sportEveningCount: '{n} matcher med påminnelse',
  sportClash: 'Krockar',
  sportAlertOff: 'Av',
  sportAlert15: '15 min före',
  sportAlertKickoff: 'Vid avspark',
  sportFollowAdd: 'Lägg till lag eller turneringar',
  sportFollowSummary: '{n} följs · notis {rule}',
  sportKickoffAlert: 'Avsparksnotis',
  sportAlertOnlyRunning: 'Notiser kommer bara medan Lumio är igång.',
  sportNoUpcoming: 'Ingen match i tablån',
  sportVs: 'mot {opponent}',
  sportTodayAt: 'Idag {time}',
  sportTomorrowAt: 'Imorgon {time}',
  sportLiveNowShort: 'LIVE nu',
  sportFollowName: 'Följ {name}',
  sportFollowingName: 'Följer {name}',
  sportWhereToWatch: 'Var kan jag se den',
  sportBest: 'BÄST',
  sportLatencyUnknown: '—',
  sportWatchQuality: 'Titta · {quality}',
  sportWatch: 'Titta',
  sportPickChannel: 'Välj annan kanal…',
  sportPickChannelSub: 'Peka matchen mot valfri kanal i dina spellistor',
  sportYourChoice: 'Ditt val',
  sportUseAutomatic: 'Använd automatiskt val',
  sportRemindMe: 'Påminn mig',
  sportReminded: 'Påminnelse satt',
  sportMatches: 'Matcher',
  sportMatchesHint: 'Välj en match för att byta. Välj flera för att se dem samtidigt.',
  sportPickSeveral: 'Välj flera',
  sportOpenMultiview: 'Öppna i Multiview ({n})',
  sportOnThisChannel: 'På den här kanalen',
  sportLiveOnChannels: 'Live på dina kanaler',
  sportLaterOnChannels: 'Senare idag på dina kanaler',
  sportNowPill: 'NU',
  sportEmptyDay: 'Inga matcher i tablån den här dagen.',
  sportLoading: 'Hämtar matcher…',
  sportNeedsUpdate: 'Sport kräver en nyare version av Lumio.',
  sportError: 'Kunde inte läsa tablån.',
  sportRound: 'Omgång {n}',
  sportPlaylistUnknown: 'Spellista',
  sportFollowEmpty: 'Följ ett lag eller en turnering så hamnar deras matcher här.',
  sportClose: 'Stäng',
```

- [ ] **Step 2: Skapa ikonerna** (`runtime/sport/tv/sport-icons.tsx`)

```tsx
import { createElement, type ReactNode } from 'react'
import { dp } from '../../tv/tv-ui'
import type { SportKind } from '../sport-model'

/* Samma ritregler som `Icons` i tv-ui.tsx: 24-rutnät, stroke 1.8, rundade ändar. */
type IconProps = { size?: number; filled?: boolean }
const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const svg = (size: number, children: ReactNode, fill = false) =>
  createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true', ...sw, fill: fill ? 'currentColor' : 'none' }, children)

export const SportIcons = {
  Ball: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 4.5h-5L8 10z" /><path d="M12 3v4M16 10l4.5-1.5M14.5 14.5 17 19M9.5 14.5 7 19M8 10 3.5 8.5" /></>),
  Hockey: ({ size = dp(26) }: IconProps) => svg(size, <><path d="M4 4l8 12h6a2 2 0 0 0 0-4h-3" /><path d="M20 4 12 16" /><ellipse cx="7" cy="19" rx="3" ry="1.2" /></>),
  Basket: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8" /></>),
  Handball: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M7 5.5c2 3 2 10 0 13M17 5.5c-2 3-2 10 0 13M3.5 10h17M3.5 14h17" /></>),
  Flag: ({ size = dp(26) }: IconProps) => svg(size, <><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>),
  Tennis: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M5 6c3 2 3 10 0 12M19 6c-3 2-3 10 0 12" /></>),
  Calendar: ({ size = dp(22) }: IconProps) => svg(size, <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>),
  Rows: ({ size = dp(22) }: IconProps) => svg(size, <path d="M4 7h16M4 12h16M4 17h16" />),
  Star: ({ size = dp(22), filled = false }: IconProps) => svg(size, <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />, filled),
  Bell: ({ size = dp(22) }: IconProps) => svg(size, <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  Plus: ({ size = dp(22) }: IconProps) => svg(size, <path d="M12 5v14M5 12h14" />),
  Play: ({ size = dp(22) }: IconProps) => svg(size, <path d="M8 5v14l11-7z" />, true),
}

export function SportIcon({ kind, size }: { kind: SportKind; size?: number }) {
  switch (kind) {
    case 'football': return <SportIcons.Ball size={size} />
    case 'hockey': return <SportIcons.Hockey size={size} />
    case 'basketball': return <SportIcons.Basket size={size} />
    case 'handball': return <SportIcons.Handball size={size} />
    case 'motorsport': return <SportIcons.Flag size={size} />
    case 'tennis': return <SportIcons.Tennis size={size} />
    default: return <SportIcons.Calendar size={size} />
  }
}
```

- [ ] **Step 3: Skapa vykontexten** (`runtime/sport/sport-ctx.ts`)

```ts
'use client'

import { useMemo } from 'react'
import type { LiveTvModel } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import { reminderId, toggleReminder, useReminders, type Reminder } from '../reminders'
import type { TvNav } from '../tv/tv-shell'
import { useTvText, type TvStringKey } from '../tv/tv-strings'
import { localDayKey } from './sport-epg'
import { matchTitle, sourceChannel, type MatchSource, type SportKind, type SportMatch } from './sport-model'
import { rankedSources, statusAt } from './sport-day-model'
import { teamKeysMatch, useFollows, useOverrides, useSportSettings, type SportFollow, type SportOverrides, type SportSettings } from './sport-store'

/*
  ALLT EN SPORTVY BEHÖVER, I ETT OBJEKT.

  Vyerna (TV och telefon) får `ctx` som prop i stället för att var och en
  läser lagring, klocka och navigering själv — då går de att testa med en
  falsk kontext (`fakeCtx`) utan att montera hela skalet, och "Titta" betyder
  samma sak överallt: bästa källan, åsidosättningen först.
*/

export const KIND_KEYS: Record<SportKind, TvStringKey> = {
  football: 'sportKindFootball',
  hockey: 'sportKindHockey',
  basketball: 'sportKindBasketball',
  handball: 'sportKindHandball',
  motorsport: 'sportKindMotorsport',
  tennis: 'sportKindTennis',
  other: 'sportKindOther',
}

export interface SportCtx {
  model: LiveTvModel
  nav: TvNav
  now: number
  locale: string
  tt: (key: TvStringKey, vars?: Record<string, string | number>) => string
  follows: SportFollow[]
  overrides: SportOverrides
  settings: SportSettings
  reminders: Reminder[]
  kindLabel(kind: SportKind): string
  playlistName(sourceId: string): string
  openMatch(match: SportMatch): void
  openFollowPicker(): void
  /** Spela matchen: angiven källa, annars bästa (åsidosättningen först). */
  watch(match: SportMatch, source?: MatchSource): void
  toggleRemind(match: SportMatch): void
  isReminded(match: SportMatch): boolean
}

export function buildSportCtx(input: {
  model: LiveTvModel
  nav: TvNav
  tt: SportCtx['tt']
  locale: string
  follows: SportFollow[]
  overrides: SportOverrides
  settings: SportSettings
  reminders: Reminder[]
  openMatch(match: SportMatch): void
  openFollowPicker(): void
}): SportCtx {
  const { model, nav, tt, overrides, reminders } = input
  const best = (m: SportMatch): MatchSource | null => rankedSources(m, overrides)[0] ?? null
  return {
    model,
    nav,
    now: model.nowMs,
    locale: input.locale,
    tt,
    follows: input.follows,
    overrides,
    settings: input.settings,
    reminders,
    kindLabel: (kind) => tt(KIND_KEYS[kind]),
    playlistName: (sourceId) => model.lists.find((list) => list.source === sourceId)?.name ?? tt('sportPlaylistUnknown'),
    openMatch: input.openMatch,
    openFollowPicker: input.openFollowPicker,
    watch: (m, source) => {
      const chosen = source ?? best(m)
      if (chosen) nav.play({ channel: sourceChannel(chosen) })
    },
    toggleRemind: (m) => {
      const chosen = best(m)
      if (chosen) toggleReminder(sourceChannel(chosen), { title: matchTitle(m), start: chosen.programmeStart, stop: chosen.programmeStop })
    },
    isReminded: (m) => {
      const chosen = best(m)
      return chosen ? reminders.some((r) => r.id === reminderId(sourceChannel(chosen), { start: chosen.programmeStart })) : false
    },
  }
}

export function useSportCtx(args: { model: LiveTvModel; nav: TvNav; openMatch(match: SportMatch): void; openFollowPicker(): void }): SportCtx {
  const { tt, locale } = useTvText()
  const follows = useFollows()
  const overrides = useOverrides()
  const settings = useSportSettings()
  const reminders = useReminders()
  const { model, nav, openMatch, openFollowPicker } = args
  return useMemo(
    () => buildSportCtx({ model, nav, tt, locale, follows, overrides, settings, reminders, openMatch, openFollowPicker }),
    [model, nav, tt, locale, follows, overrides, settings, reminders, openMatch, openFollowPicker],
  )
}

/** "LIVE · 19:00–21:00" / "21:00" / "SLUT" — ingen ställning i fas 1. */
export function timeLine(m: SportMatch, ctx: SportCtx): string {
  const st = statusAt(m, ctx.now)
  if (st === 'live') return ctx.tt('sportLiveWindow', { from: formatClock(m.start, ctx.locale), to: formatClock(m.stop, ctx.locale) })
  if (st === 'finished') return ctx.tt('sportEnded')
  return formatClock(m.start, ctx.locale)
}

/** "TV4 Fotboll FHD SE · 3 källor" — bästa källan och hur många det finns. */
export function sourceLine(m: SportMatch, ctx: SportCtx): string {
  const ranked = rankedSources(m, ctx.overrides)
  const first = ranked[0]
  if (!first) return ''
  return ranked.length > 1 ? `${first.name} · ${ctx.tt('sportSourcesShort', { n: ranked.length })}` : first.name
}

/** Flödets källchip: "3 källor · FHD", eller kanalens namn när den är ensam. */
export function sourceChip(m: SportMatch, ctx: SportCtx): string {
  const ranked = rankedSources(m, ctx.overrides)
  const first = ranked[0]
  if (!first) return ''
  if (ranked.length === 1) return first.name
  return first.quality ? `${ctx.tt('sportSourcesShort', { n: ranked.length })} · ${first.quality}` : ctx.tt('sportSourcesShort', { n: ranked.length })
}

export function alertLabel(ctx: SportCtx): string {
  return ctx.settings.alert === 'off' ? ctx.tt('sportAlertOff') : ctx.settings.alert === '15' ? ctx.tt('sportAlert15') : ctx.tt('sportAlertKickoff')
}

/** Följkortets rad: "Idag 19:50 · mot AIK" / "LIVE nu · AIK - Hammarby" / "Ingen match i tablån". */
export function followNextLine(ctx: SportCtx, follow: SportFollow, next: SportMatch | null): string {
  if (!next) return ctx.tt('sportNoUpcoming')
  const time = formatClock(next.start, ctx.locale)
  const when = statusAt(next, ctx.now) === 'live'
    ? ctx.tt('sportLiveNowShort')
    : localDayKey(next.start) === localDayKey(ctx.now)
      ? ctx.tt('sportTodayAt', { time })
      : ctx.tt('sportTomorrowAt', { time })
  if (follow.kind === 'league' || !next.home || !next.away) return `${when} · ${matchTitle(next)}`
  const opponent = teamKeysMatch(follow.key, next.homeKey) ? next.away : next.home
  return `${when} · ${ctx.tt('sportVs', { opponent })}`
}
```

- [ ] **Step 4: Skapa de delade delarna** (`runtime/sport/tv/sport-parts.tsx`)

```tsx
'use client'

import type { CSSProperties, ReactNode } from 'react'
import { formatClock, progressOf } from '../../live-tv-ui'
import { Progress, Tag, TV, cardStyle, dp, station } from '../../tv/tv-ui'
import { crestText, matchTitle, type SportMatch } from '../sport-model'
import { crestColor, followState, leagueColor, statusAt } from '../sport-day-model'
import { sourceLine, type SportCtx } from '../sport-ctx'
import { SportIcons } from './sport-icons'

export const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
export const overline: CSSProperties = { fontSize: dp(15), fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TV.dim }
export const sectionTitle: CSSProperties = { fontSize: dp(28), fontWeight: 600 }
export const primaryBtn: CSSProperties = {
  height: dp(60), minHeight: dp(60), padding: `0 ${dp(28)}px`, borderRadius: dp(14), background: TV.acc, color: TV.onAcc,
  display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(20), fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
}
export const secondaryBtn: CSSProperties = { ...primaryBtn, background: TV.s12, color: TV.text, border: `1px solid ${TV.lineCard}` }

/** Handoffens initialcirkel (riktiga märken kommer i fas 2). */
export function Crest({ name, colorKey, size = dp(56) }: { name: string; colorKey: string; size?: number }) {
  return (
    <span data-crest="" aria-hidden="true" style={{ width: size, height: size, borderRadius: 999, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: crestColor(colorKey), color: '#fff', fontSize: Math.round(size * 0.32), fontWeight: 700, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)' }}>
      {crestText(name)}
    </span>
  )
}

export function LeagueDot({ leagueKey, size = dp(12) }: { leagueKey: string; size?: number }) {
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: dp(3), background: leagueColor(leagueKey), flexShrink: 0 }} />
}

export function StatusTag({ match, ctx }: { match: SportMatch; ctx: SportCtx }) {
  const st = statusAt(match, ctx.now)
  if (st === 'live') return <Tag variant="live">{ctx.tt('live')}</Tag>
  if (st === 'finished') return <Tag variant="neutral">{ctx.tt('sportEnded')}</Tag>
  return <Tag variant="neutral">{formatClock(match.start, ctx.locale)}</Tag>
}

function TeamCell({ name, colorKey, align }: { name: string; colorKey: string; align: 'start' | 'end' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'end' ? 'flex-end' : 'flex-start', gap: dp(10), minWidth: 0, flexDirection: align === 'end' ? 'row' : 'row-reverse' }}>
      <span style={{ fontSize: dp(18), fontWeight: 600, ...ellipsis }}>{name}</span>
      <Crest name={name} colorKey={colorKey} size={dp(42)} />
    </div>
  )
}

/** Matchkortet (handoff 300 px på 1280-scenen): OK = matchcenter, håll = titta direkt. */
export function MatchCard({ match, ctx }: { match: SportMatch; ctx: SportCtx }) {
  const st = statusAt(match, ctx.now)
  const followed = followState(match, ctx.follows).any
  const reminded = ctx.isReminded(match)
  return (
    <div data-testid="sport-card" data-match-id={match.id} {...station(() => ctx.openMatch(match), () => ctx.watch(match))} style={{ ...cardStyle, width: dp(450), flexShrink: 0, padding: `${dp(16)}px ${dp(18)}px`, display: 'flex', flexDirection: 'column', gap: dp(12), cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(15), color: TV.muted }}>
        <LeagueDot leagueKey={match.leagueKey || match.kind} />
        <span style={{ ...ellipsis, flex: 1 }}>{match.league || ctx.kindLabel(match.kind)}</span>
        <StatusTag match={match} ctx={ctx} />
      </div>
      {match.home && match.away ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: dp(12) }}>
          <TeamCell name={match.home} colorKey={match.homeKey ?? match.home} align="end" />
          <span style={{ fontSize: dp(16), color: TV.dim }}>–</span>
          <TeamCell name={match.away} colorKey={match.awayKey ?? match.away} align="start" />
        </div>
      ) : (
        <div style={{ fontSize: dp(20), fontWeight: 600, ...ellipsis }}>{matchTitle(match)}</div>
      )}
      <Progress value={st === 'live' ? progressOf(match.start, match.stop, ctx.now) : st === 'finished' ? 1 : 0} height={dp(4)} track={TV.s10} />
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(8), fontSize: dp(15), color: TV.muted }}>
        <span style={{ ...ellipsis, flex: 1 }}>{sourceLine(match, ctx)}</span>
        {followed ? <span data-testid="card-followed" style={{ color: '#fbbf24', display: 'inline-flex' }}><SportIcons.Star size={dp(18)} filled /></span> : null}
        {reminded ? <span data-testid="card-reminded" style={{ display: 'inline-flex' }}><SportIcons.Bell size={dp(18)} /></span> : null}
      </div>
    </div>
  )
}

export function CardRow({ title, matches, ctx, testId }: { title: string; matches: SportMatch[]; ctx: SportCtx; testId: string }) {
  if (matches.length === 0) return null
  return (
    <section data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: dp(12) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}>
        <span style={sectionTitle}>{title}</span>
        <span style={{ fontSize: dp(17), color: TV.dim }}>{matches.length}</span>
      </div>
      <div data-row="" style={{ display: 'flex', gap: dp(16), overflowX: 'auto', paddingBottom: dp(6) }}>
        {matches.map((m) => <MatchCard key={m.id} match={m} ctx={ctx} />)}
      </div>
    </section>
  )
}

export function Notice({ text, testId }: { text: ReactNode; testId?: string }) {
  return <div data-testid={testId} style={{ ...cardStyle, padding: `${dp(28)}px ${dp(32)}px`, fontSize: dp(20), color: TV.muted }}>{text}</div>
}
```

- [ ] **Step 5: Lägg `fakeCtx` i fixturen** (lägg till sist i `runtime/sport/__sport-fixture.tsx`, och importerna överst)

```tsx
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from '../tv/tv-shell'
import { tvText } from '../tv/tv-strings'
import { buildSportCtx, type SportCtx } from './sport-ctx'

/** En kontext utan skal: engelska texter, en spellista "Xtream" (källa `src-a`), åtgärder som vi.fn(). */
export function fakeCtx(over: Partial<SportCtx> = {}): SportCtx {
  const nav = { play: vi.fn(), pushLayer: vi.fn(() => () => {}), toast: vi.fn(), go: vi.fn() } as unknown as TvNav
  const model = { nowMs: over.now ?? Date.now(), lists: [{ id: 'l1', name: 'Xtream', source: 'src-a' }], byKey: new Map(), allChannels: [] } as unknown as LiveTvModel
  const base = buildSportCtx({
    model,
    nav,
    tt: (key, vars) => tvText('en', key, vars),
    locale: 'en-GB',
    follows: over.follows ?? [],
    overrides: over.overrides ?? {},
    settings: over.settings ?? { view: 'matchday', alert: '15' },
    reminders: over.reminders ?? [],
    openMatch: vi.fn(),
    openFollowPicker: vi.fn(),
  })
  return { ...base, watch: vi.fn(), toggleRemind: vi.fn(), ...over }
}
```

- [ ] **Step 6: Skriv de fallerande testerna** (`runtime/sport/tv/sport-parts.test.tsx`)

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { tvText } from '../../tv/tv-strings'
import { MatchCard } from './sport-parts'
import { HOUR, MIN, fakeCtx, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
const now = Date.now()

describe('texterna', () => {
  it('finns på båda språken', () => {
    expect(tvText('sv', 'railSport')).toBe('Sport')
    expect(tvText('sv', 'sportTabForYou')).toBe('För dig')
    expect(tvText('sv', 'sportEnded')).toBe('SLUT')
    expect(tvText('en', 'sportSources', { n: 3 })).toBe('3 sources in your playlists')
    expect(tvText('sv', 'sportSummary', { day: 'Idag', count: 10, live: 4 })).toBe('Idag · 10 matcher · 4 live')
  })
})

describe('MatchCard', () => {
  it('live: LIVE-tagg, bästa källan och antal källor; OK öppnar matchcentret', () => {
    const ctx = fakeCtx({ now })
    const m = fxMatch({ start: now - 30 * MIN, sources: [fxSource('TV4 Fotboll FHD SE', { quality: 'FHD' }), fxSource('TV4 Fotboll SE')] })
    render(<MatchCard match={m} ctx={ctx} />)
    const card = screen.getByTestId('sport-card')
    expect(card).toHaveTextContent('LIVE')
    expect(card).toHaveTextContent('TV4 Fotboll FHD SE · 2 sources')
    expect(card).toHaveTextContent('AIK')
    expect(card.textContent).not.toMatch(/\d+\s*[-–]\s*\d+/)
    fireEvent.click(card)
    expect(ctx.openMatch).toHaveBeenCalledWith(m)
  })
  it('kommande visar tid, avslutad SLUT/ENDED, följd stjärna', () => {
    const ctx = fakeCtx({ now, follows: [{ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }] })
    const { rerender } = render(<MatchCard match={fxMatch({ start: now + HOUR })} ctx={ctx} />)
    expect(screen.getByTestId('card-followed')).toBeInTheDocument()
    rerender(<MatchCard match={fxMatch({ start: now - 3 * HOUR, stop: now - HOUR })} ctx={ctx} />)
    expect(screen.getByTestId('sport-card')).toHaveTextContent('ENDED')
  })
  it('event utan lag visar eventets namn', () => {
    render(<MatchCard match={fxMatch({ kind: 'motorsport', league: 'Formel 1', leagueKey: 'f1', home: null, away: null, event: 'Singapores GP - Kval' })} ctx={fakeCtx({ now })} />)
    expect(screen.getByTestId('sport-card')).toHaveTextContent('Singapores GP - Kval')
  })
})
```

- [ ] **Step 7: Kör testerna och typkontrollen**

Run: `npx vitest run runtime/sport/tv/sport-parts.test.tsx runtime/tv/tv-strings.test.ts && npx tsc --noEmit -p .`
Expected: PASS. (`SV` är `Record<keyof typeof EN, string>` — en nyckel som saknas i SV fälls av tsc.)

- [ ] **Step 8: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/tv/tv-strings.ts plugins/live-tv/runtime/sport/sport-ctx.ts plugins/live-tv/runtime/sport/tv/sport-icons.tsx plugins/live-tv/runtime/sport/tv/sport-parts.tsx plugins/live-tv/runtime/sport/tv/sport-parts.test.tsx plugins/live-tv/runtime/sport/__sport-fixture.tsx
git commit -m "live-tv sport: texter, ikoner, vykontext och matchkort"
```

---

### Task 14: För dig · Matchdag (hero, nästa, tidslinje, sektioner)

**Files:**
- Create: `runtime/sport/tv/sport-matchday.tsx`
- Test: `runtime/sport/tv/sport-matchday.test.tsx`

**Interfaces:**
- Consumes: Task 11 (`featuredMatch`, `nextOnYourChannels`, `splitSections`, `timelineAxis`, `timelineRows`, `statusAt`, `followState`, `rankedSources`, `leagueColor`), Task 13 (`SportCtx`, `timeLine`, `Crest`, `LeagueDot`, `CardRow`, `primaryBtn`, `secondaryBtn`, `overline`, `ellipsis`, `SportIcons`), `crestText`, `matchTitle`, `formatClock`, `progressOf`.
- Produces: `SportMatchday({ ctx, matches, dayFrom }: { ctx: SportCtx; matches: SportMatch[]; dayFrom: number })`. Testid:n: `sport-hero`, `sport-hero-watch`, `sport-hero-mc`, `sport-next`, `sport-next-row`, `sport-timeline`, `sport-block-<id>` (med `data-status`), `sport-section-live|later|finished`.

Handoff (skärmdump 05): hero med lag + initialcirklar, i stället för ställning `LIVE · 19:00–21:00` (spec), progress, Titta på {kanal} (accent), Matchcenter, "N källor i dina spellistor"; höger kolumn "NÄSTA PÅ DINA KANALER" (tre rader, klocka om påminnelse finns; håll = växla påminnelse); tidslinjen med en rad per liga (färgruta), överlappande matcher på egna banor, live i accenttoning, kommande `.14`, slut `.07`, nu-linje; sedan Live nu / Senare / Avslutade som kortrader.

- [ ] **Step 1: Skriv de fallerande testerna**

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SportMatchday } from './sport-matchday'
import { HOUR, MIN, fakeCtx, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
const now = new Date(2026, 9, 10, 19, 15).getTime()
const dayFrom = new Date(2026, 9, 10, 0, 0).getTime()
const live = fxMatch({ id: 'live', home: 'FC Barcelona', away: 'Paris SG', league: 'Champions League', leagueKey: 'uefa-champions-league', venue: 'Estadi Olímpic', start: now - 30 * MIN, stop: now + 90 * MIN, sources: [fxSource('V Sport Fotboll', { quality: 'FHD' }), fxSource('V Sport Fotboll HD'), fxSource('Sport SE')] })
const next1 = fxMatch({ id: 'n1', home: 'AIK', away: 'Hammarby', start: now + 35 * MIN })
const next2 = fxMatch({ id: 'n2', home: 'Malmö FF', away: 'IFK Göteborg', start: now + 45 * MIN })
const next3 = fxMatch({ id: 'n3', home: 'Liverpool', away: 'Chelsea', league: 'Premier League', leagueKey: 'premier-league', start: now + 105 * MIN })
const next4 = fxMatch({ id: 'n4', home: 'Real', away: 'Inter', start: now + 3 * HOUR })
const done = fxMatch({ id: 'done', home: 'Örgryte', away: 'GAIS', start: now - 4 * HOUR, stop: now - 2 * HOUR })
const all = [done, live, next1, next2, next3, next4]

describe('Matchdag', () => {
  it('hero: pågående match, LIVE-fönster utan ställning, Titta och Matchcenter', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchday ctx={ctx} matches={all} dayFrom={dayFrom} />)
    const hero = screen.getByTestId('sport-hero')
    expect(hero).toHaveTextContent('FC Barcelona')
    expect(hero).toHaveTextContent('Paris SG')
    expect(hero).toHaveTextContent(/LIVE · \d\d:\d\d–\d\d:\d\d/)
    expect(hero).toHaveTextContent('Champions League · Estadi Olímpic')
    expect(hero).toHaveTextContent('3 sources in your playlists')
    expect(hero.querySelector('[data-score]')).toBeNull()
    fireEvent.click(screen.getByTestId('sport-hero-watch'))
    expect(ctx.watch).toHaveBeenCalledWith(live)
    expect(screen.getByTestId('sport-hero-watch')).toHaveTextContent('Watch on V Sport Fotboll')
    fireEvent.click(screen.getByTestId('sport-hero-mc'))
    expect(ctx.openMatch).toHaveBeenCalledWith(live)
  })
  it('nästa på dina kanaler: tre kommande, inte hero-matchen, klocka på påmind', () => {
    const ctx = fakeCtx({ now, isReminded: (m) => m.id === 'n2' })
    render(<SportMatchday ctx={ctx} matches={all} dayFrom={dayFrom} />)
    const rows = within(screen.getByTestId('sport-next')).getAllByTestId('sport-next-row')
    expect(rows.map((r) => r.getAttribute('data-match-id'))).toEqual(['n1', 'n2', 'n3'])
    expect(within(rows[1]!).getByTestId('next-reminded')).toBeInTheDocument()
  })
  it('tidslinjen: rad per liga, status per block, klick öppnar matchcentret', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchday ctx={ctx} matches={all} dayFrom={dayFrom} />)
    const timeline = screen.getByTestId('sport-timeline')
    expect(timeline).toHaveTextContent('Champions League')
    expect(timeline).toHaveTextContent('Premier League')
    expect(screen.getByTestId('sport-block-live').getAttribute('data-status')).toBe('live')
    expect(screen.getByTestId('sport-block-done').getAttribute('data-status')).toBe('finished')
    expect(screen.getByTestId('sport-block-n1').getAttribute('data-status')).toBe('upcoming')
    fireEvent.click(screen.getByTestId('sport-block-n3'))
    expect(ctx.openMatch).toHaveBeenCalledWith(next3)
  })
  it('sektionerna Live nu / Senare / Avslutade', () => {
    render(<SportMatchday ctx={fakeCtx({ now })} matches={all} dayFrom={dayFrom} />)
    expect(within(screen.getByTestId('sport-section-live')).getAllByTestId('sport-card')).toHaveLength(1)
    expect(within(screen.getByTestId('sport-section-later')).getAllByTestId('sport-card')).toHaveLength(4)
    expect(within(screen.getByTestId('sport-section-finished')).getByTestId('sport-card')).toHaveTextContent('ENDED')
  })
})
```

(`[data-score]` är attributet fas 2:s ställningsfält ska bära; i fas 1 får det inte finnas.)

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/sport/tv/sport-matchday.test.tsx`
Expected: FAIL — `Failed to resolve import "./sport-matchday"`.

- [ ] **Step 3: Implementera** (`runtime/sport/tv/sport-matchday.tsx`)

```tsx
'use client'

import { formatClock, progressOf } from '../../live-tv-ui'
import { Progress, Tag, TV, cardStyle, dp, station } from '../../tv/tv-ui'
import { crestText, matchTitle, type SportMatch } from '../sport-model'
import { featuredMatch, followState, leagueColor, nextOnYourChannels, rankedSources, splitSections, statusAt, timelineAxis, timelineRows } from '../sport-day-model'
import { timeLine, type SportCtx } from '../sport-ctx'
import { CardRow, Crest, LeagueDot, ellipsis, overline, primaryBtn, secondaryBtn } from './sport-parts'
import { SportIcons } from './sport-icons'

export function SportMatchday({ ctx, matches, dayFrom }: { ctx: SportCtx; matches: SportMatch[]; dayFrom: number }) {
  const hero = featuredMatch(matches, ctx.follows, ctx.now)
  const next = nextOnYourChannels(matches, ctx.now, hero?.id ?? null)
  const { live, later, finished } = splitSections(matches, ctx.now)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dp(28) }}>
      <div style={{ display: 'flex', gap: dp(20), alignItems: 'stretch' }}>
        {hero ? <SportHero ctx={ctx} match={hero} /> : null}
        <NextOnChannels ctx={ctx} matches={next} />
      </div>
      <MatchdayTimeline ctx={ctx} matches={matches} dayFrom={dayFrom} />
      <CardRow title={ctx.tt('sportLiveNow')} matches={live} ctx={ctx} testId="sport-section-live" />
      <CardRow title={ctx.tt('sportLater')} matches={later} ctx={ctx} testId="sport-section-later" />
      <CardRow title={ctx.tt('sportFinished')} matches={finished} ctx={ctx} testId="sport-section-finished" />
    </div>
  )
}

function SportHero({ ctx, match }: { ctx: SportCtx; match: SportMatch }) {
  const best = rankedSources(match, ctx.overrides)[0] ?? null
  const st = statusAt(match, ctx.now)
  const followed = followState(match, ctx.follows).any
  const context = [followed ? ctx.tt('sportYouFollow') : null, match.league || ctx.kindLabel(match.kind), match.venue].filter(Boolean).join(' · ')
  return (
    <div data-testid="sport-hero" style={{ ...cardStyle, flex: 1, minWidth: 0, borderRadius: dp(20), padding: `${dp(24)}px ${dp(32)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(16), background: `radial-gradient(60% 80% at 50% 0%, ${TV.accMix(14)}, transparent), ${TV.s07}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(12), fontSize: dp(17), color: TV.muted }}>
        {st === 'live' ? <Tag variant="live">{ctx.tt('live')}</Tag> : null}
        <span>{context}</span>
      </div>
      {match.home && match.away ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: dp(28), width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: dp(18), minWidth: 0 }}>
            <span style={{ fontSize: dp(42), fontWeight: 600, ...ellipsis }}>{match.home}</span>
            <Crest name={match.home} colorKey={match.homeKey ?? match.home} size={dp(84)} />
          </div>
          <span style={{ fontSize: dp(22), fontWeight: 600, color: st === 'live' ? TV.liveText : TV.muted, textAlign: 'center', whiteSpace: 'nowrap' }}>{timeLine(match, ctx)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(18), minWidth: 0 }}>
            <Crest name={match.away} colorKey={match.awayKey ?? match.away} size={dp(84)} />
            <span style={{ fontSize: dp(42), fontWeight: 600, ...ellipsis }}>{match.away}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(8) }}>
          <span style={{ fontSize: dp(42), fontWeight: 600 }}>{matchTitle(match)}</span>
          <span style={{ fontSize: dp(22), color: st === 'live' ? TV.liveText : TV.muted }}>{timeLine(match, ctx)}</span>
        </div>
      )}
      {st === 'live' ? <Progress value={progressOf(match.start, match.stop, ctx.now)} height={dp(5)} style={{ width: '40%' }} /> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(14), flexWrap: 'wrap', justifyContent: 'center' }}>
        {best ? (
          <div data-testid="sport-hero-watch" {...station(() => ctx.watch(match))} style={primaryBtn}>
            <SportIcons.Play size={dp(20)} />
            {ctx.tt('sportWatchOn', { channel: best.name })}
          </div>
        ) : null}
        <div data-testid="sport-hero-mc" {...station(() => ctx.openMatch(match))} style={secondaryBtn}>{ctx.tt('sportMatchCenter')}</div>
        {match.sources.length > 0 ? <span style={{ fontSize: dp(16), color: '#86efac' }}>{ctx.tt('sportSources', { n: match.sources.length })}</span> : null}
      </div>
    </div>
  )
}

function NextOnChannels({ ctx, matches }: { ctx: SportCtx; matches: SportMatch[] }) {
  return (
    <div data-testid="sport-next" style={{ ...cardStyle, width: dp(450), flexShrink: 0, padding: `${dp(20)}px ${dp(20)}px`, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <span style={overline}>{ctx.tt('sportNextOnChannels')}</span>
      {matches.map((m) => {
        const best = rankedSources(m, ctx.overrides)[0]
        return (
          <div key={m.id} data-testid="sport-next-row" data-match-id={m.id} {...station(() => ctx.openMatch(m), () => ctx.toggleRemind(m))} style={{ display: 'flex', alignItems: 'center', gap: dp(14), padding: `${dp(12)}px ${dp(14)}px`, borderRadius: dp(12), background: TV.s08, border: `1px solid ${TV.line}`, cursor: 'pointer' }}>
            <span style={{ fontSize: dp(24), fontWeight: 700, flexShrink: 0 }}>{formatClock(m.start, ctx.locale)}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
              <div style={{ fontSize: dp(15), color: TV.dim, ...ellipsis }}>{best?.name ?? ''}</div>
            </div>
            {ctx.isReminded(m) ? <span data-testid="next-reminded" style={{ display: 'inline-flex', color: TV.accText }}><SportIcons.Bell size={dp(20)} /></span> : null}
          </div>
        )
      })}
    </div>
  )
}

const LABEL_W = 216

function MatchdayTimeline({ ctx, matches, dayFrom }: { ctx: SportCtx; matches: SportMatch[]; dayFrom: number }) {
  const axis = timelineAxis(matches, dayFrom)
  const rows = timelineRows(matches)
  const span = axis.end - axis.start
  const pct = (t: number) => ((Math.min(Math.max(t, axis.start), axis.end) - axis.start) / span) * 100
  const nowInside = ctx.now >= axis.start && ctx.now <= axis.end
  return (
    <div data-testid="sport-timeline" style={{ ...cardStyle, padding: `${dp(20)}px ${dp(24)}px`, display: 'flex', flexDirection: 'column', gap: dp(8) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}>
        <span style={{ fontSize: dp(26), fontWeight: 600 }}>{ctx.tt('sportMatchday')}</span>
        <span style={{ fontSize: dp(16), color: TV.dim }}>{ctx.tt('sportMatchdayHint')}</span>
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ width: dp(LABEL_W), flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: 1, height: dp(26) }}>
          {axis.hours.map((h) => <span key={h} style={{ position: 'absolute', left: `${pct(h)}%`, fontSize: dp(14), color: TV.dim }}>{formatClock(h, ctx.locale)}</span>)}
        </div>
      </div>
      {rows.flatMap((row) => row.lanes.map((lane, laneIndex) => (
        <div key={`${row.key}-${laneIndex}`} data-row="" style={{ display: 'flex', alignItems: 'center', height: dp(50) }}>
          <div style={{ width: dp(LABEL_W), flexShrink: 0, display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(16), fontWeight: 600, paddingRight: dp(10), boxSizing: 'border-box' }}>
            {laneIndex === 0 ? <><LeagueDot leagueKey={row.key} /><span style={ellipsis}>{row.label || ctx.kindLabel(row.kind)}</span></> : null}
          </div>
          <div style={{ position: 'relative', flex: 1, height: dp(42), background: TV.s05, borderRadius: dp(8) }}>
            {lane.map((m) => {
              const st = statusAt(m, ctx.now)
              const left = pct(m.start)
              const width = Math.max(pct(m.stop) - left, 1.5)
              const label = m.home && m.away ? `${crestText(m.home)}–${crestText(m.away)}` : matchTitle(m)
              return (
                <div
                  key={m.id}
                  data-testid={`sport-block-${m.id}`}
                  data-status={st}
                  {...station(() => ctx.openMatch(m))}
                  style={{
                    position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${width}%`, boxSizing: 'border-box', padding: `0 ${dp(10)}px`,
                    display: 'flex', alignItems: 'center', fontSize: dp(15), fontWeight: 600, borderRadius: dp(8), cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap',
                    background: st === 'live' ? TV.accMix(30) : st === 'finished' ? TV.s07 : TV.s14,
                    border: `1px solid ${st === 'live' ? TV.accMix(85) : TV.lineCard}`,
                    borderLeft: `${dp(4)}px solid ${leagueColor(m.leagueKey || m.kind)}`,
                    color: st === 'finished' ? TV.dim : TV.text,
                  }}
                >
                  {st === 'upcoming' ? `${formatClock(m.start, ctx.locale)} ${label}` : label}
                </div>
              )
            })}
            {nowInside ? <div aria-hidden="true" style={{ position: 'absolute', top: -dp(4), bottom: -dp(4), left: `${pct(ctx.now)}%`, width: dp(3), background: TV.acc, boxShadow: `0 0 ${dp(8)}px ${TV.acc}` }} /> : null}
          </div>
        </div>
      )))}
    </div>
  )
}
```

- [ ] **Step 4: Kör testerna och typkontrollen**

Run: `npx vitest run runtime/sport/tv/sport-matchday.test.tsx && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/tv/sport-matchday.tsx plugins/live-tv/runtime/sport/tv/sport-matchday.test.tsx
git commit -m "live-tv sport: Matchdag — hero, nästa på dina kanaler, tidslinje"
```

---

### Task 15: För dig · Flöde (Dina lag, Just nu, Kvällsplan, Din kväll)

**Files:**
- Create: `runtime/sport/tv/sport-feed.tsx`
- Test: `runtime/sport/tv/sport-feed.test.tsx`

**Interfaces:**
- Consumes: Task 11 (`splitSections`, `teamRing`, `nextMatchFor`, `clashes`, `followState`, `leagueColor`), Task 13 (`SportCtx`, `sourceChip`, `alertLabel`, `Crest`, `overline`, `ellipsis`, `sectionTitle`, `SportIcons`), `localDayKey`, `formatClock`, `progressOf`, `matchTitle`.
- Produces: `SportFeed({ ctx, matches, days }: { ctx: SportCtx; matches: SportMatch[]; days: (SportDay | null)[] })` — `days[0]` = vald dag, `days[1]` = imorgon. Testid:n `feed-teams`, `feed-team` (med `data-ring`), `feed-add`, `feed-now`, `feed-now-row`, `feed-source-chip`, `feed-play`, `feed-plan`, `feed-plan-row`, `feed-plan-check` (`role="checkbox"`), `sport-evening`, `evening-row`, `evening-clash`, `feed-finished`.

Handoff (skärmdump 06): Dina lag som runda avatarer (röd ring + LIVE-märke = spelar nu, vit ring = spelar idag, annars svag), status LIVE / klockslag / Imorgon, "+ Lägg till"; Just nu som breda rader med ligafärgad kant, LIVE + miniprogress (ingen minut i fas 1), överlappande initialcirklar, titel, liga (· du följer), källchip "3 källor · FHD", spela-knapp; Kvällsplan med kryssruta = befintlig påminnelse och kortet DIN KVÄLL med regel, lista och ⚠ vid krock under 100 min; Avslutade i tre kolumner.

- [ ] **Step 1: Skriv de fallerande testerna**

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SportFeed } from './sport-feed'
import { HOUR, MIN, fakeCtx, fxDay, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
const now = new Date(2026, 9, 10, 19, 15).getTime()
const live = fxMatch({ id: 'live', home: 'FC Barcelona', away: 'Paris SG', homeKey: 'barcelona', start: now - 30 * MIN, stop: now + 90 * MIN, sources: [fxSource('V Sport Fotboll FHD', { quality: 'FHD' }), fxSource('B'), fxSource('C')] })
const a = fxMatch({ id: 'a', home: 'AIK', away: 'Hammarby', start: now + 35 * MIN })
const b = fxMatch({ id: 'b', home: 'Malmö', away: 'Göteborg', start: now + 60 * MIN })
const c = fxMatch({ id: 'c', home: 'Liverpool', away: 'Chelsea', start: now + 4 * HOUR })
const done = fxMatch({ id: 'done', home: 'Örgryte', away: 'GAIS', start: now - 4 * HOUR, stop: now - 2 * HOUR })
const matches = [done, live, a, b, c]
const follows = [
  { sport: 'football' as const, kind: 'team' as const, key: 'barcelona', name: 'FC Barcelona' },
  { sport: 'football' as const, kind: 'team' as const, key: 'hammarby', name: 'Hammarby' },
  { sport: 'football' as const, kind: 'team' as const, key: 'djurgarden', name: 'Djurgården' },
]

describe('Flöde', () => {
  it('Dina lag: röd ring för live, vit för idag, svag annars; + Lägg till öppnar väljaren', () => {
    const tomorrow = fxMatch({ id: 't', home: 'Djurgården', away: 'IFK', homeKey: 'djurgarden', start: now + 24 * HOUR })
    const ctx = fakeCtx({ now, follows })
    render(<SportFeed ctx={ctx} matches={matches} days={[fxDay('d0', matches), fxDay('d1', [tomorrow])]} />)
    const teams = screen.getAllByTestId('feed-team')
    expect(teams.map((t) => t.getAttribute('data-ring'))).toEqual(['live', 'today', 'none'])
    expect(teams[0]).toHaveTextContent('LIVE')
    expect(teams[2]).toHaveTextContent('Tomorrow')
    fireEvent.click(screen.getByTestId('feed-add'))
    expect(ctx.openFollowPicker).toHaveBeenCalled()
  })
  it('Just nu: källchip med antal och kvalitet, spela startar matchen', () => {
    const ctx = fakeCtx({ now, follows })
    render(<SportFeed ctx={ctx} matches={matches} days={[fxDay('d0', matches), null]} />)
    const row = screen.getByTestId('feed-now-row')
    expect(row).toHaveTextContent('FC Barcelona - Paris SG')
    expect(within(row).getByTestId('feed-source-chip')).toHaveTextContent('3 sources · FHD')
    fireEvent.click(within(row).getByTestId('feed-play'))
    expect(ctx.watch).toHaveBeenCalledWith(live)
  })
  it('Kvällsplan: kryssrutan växlar påminnelsen, Din kväll varnar för krockar under 100 min', () => {
    const ctx = fakeCtx({ now, isReminded: (m) => m.id === 'a' || m.id === 'b' })
    render(<SportFeed ctx={ctx} matches={matches} days={[fxDay('d0', matches), null]} />)
    const checks = screen.getAllByTestId('feed-plan-check')
    expect(checks.map((c) => c.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false'])
    fireEvent.click(checks[2]!)
    expect(ctx.toggleRemind).toHaveBeenCalledWith(c)
    const evening = screen.getByTestId('sport-evening')
    expect(evening).toHaveTextContent('2 matches with a reminder')
    expect(within(evening).getAllByTestId('evening-clash')).toHaveLength(2)
    expect(within(screen.getByTestId('feed-finished')).getByText(/Örgryte - GAIS/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/sport/tv/sport-feed.test.tsx`
Expected: FAIL — `Failed to resolve import "./sport-feed"`.

- [ ] **Step 3: Implementera** (`runtime/sport/tv/sport-feed.tsx`)

```tsx
'use client'

import type { CSSProperties } from 'react'
import { formatClock, progressOf } from '../../live-tv-ui'
import { Progress, TV, cardStyle, dp, station } from '../../tv/tv-ui'
import { localDayKey } from '../sport-epg'
import { matchTitle, type SportDay, type SportMatch } from '../sport-model'
import { clashes, followState, leagueColor, nextMatchFor, splitSections, teamRing } from '../sport-day-model'
import { alertLabel, sourceChip, type SportCtx } from '../sport-ctx'
import type { SportFollow } from '../sport-store'
import { Crest, ellipsis, overline, sectionTitle } from './sport-parts'
import { SportIcons } from './sport-icons'

const avatarCol: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(8), width: dp(150), flexShrink: 0, cursor: 'pointer' }

export function SportFeed({ ctx, matches, days }: { ctx: SportCtx; matches: SportMatch[]; days: (SportDay | null)[] }) {
  const { live, later, finished } = splitSections(matches, ctx.now)
  const planned = later.filter((m) => ctx.isReminded(m))
  const clash = clashes(planned)
  const dayMatches = days[0]?.matches ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dp(32) }}>
      <section data-testid="feed-teams" style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}>
          <span style={sectionTitle}>{ctx.tt('sportYourTeams')}</span>
          <span style={{ fontSize: dp(16), color: TV.dim }}>{ctx.tt('sportYourTeamsHint')}</span>
        </div>
        <div data-row="" style={{ display: 'flex', gap: dp(24), overflowX: 'auto', padding: `${dp(8)}px ${dp(6)}px` }}>
          {ctx.follows.map((f) => <TeamAvatar key={`${f.kind}:${f.key}`} ctx={ctx} follow={f} dayMatches={dayMatches} days={days} />)}
          <div data-testid="feed-add" {...station(ctx.openFollowPicker)} style={avatarCol}>
            <span style={{ width: dp(108), height: dp(108), borderRadius: 999, border: `2px dashed ${TV.lineStrong}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><SportIcons.Plus size={dp(36)} /></span>
            <span style={{ fontSize: dp(17), fontWeight: 600 }}>{ctx.tt('sportAddTeam')}</span>
          </div>
        </div>
      </section>

      {live.length > 0 ? (
        <section data-testid="feed-now" style={{ display: 'flex', flexDirection: 'column', gap: dp(12) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}>
            <span style={sectionTitle}>{ctx.tt('sportJustNow')}</span>
            <span style={{ fontSize: dp(16), color: TV.dim }}>{ctx.tt('sportJustNowSub', { n: live.length })}</span>
          </div>
          {live.map((m) => (
            <div key={m.id} data-testid="feed-now-row" style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: dp(18), padding: `${dp(14)}px ${dp(18)}px`, borderLeft: `${dp(6)}px solid ${leagueColor(m.leagueKey || m.kind)}` }}>
              <div style={{ width: dp(80), display: 'flex', flexDirection: 'column', gap: dp(6), flexShrink: 0 }}>
                <span style={{ color: TV.live, fontWeight: 700, fontSize: dp(16) }}>{ctx.tt('live')}</span>
                <Progress value={progressOf(m.start, m.stop, ctx.now)} height={dp(4)} />
              </div>
              <div {...station(() => ctx.openMatch(m))} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: dp(16), cursor: 'pointer' }}>
                {m.home && m.away ? (
                  <span style={{ display: 'flex', flexShrink: 0 }}>
                    <Crest name={m.home} colorKey={m.homeKey ?? m.home} size={dp(48)} />
                    <span style={{ marginLeft: -dp(14) }}><Crest name={m.away} colorKey={m.awayKey ?? m.away} size={dp(48)} /></span>
                  </span>
                ) : null}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: dp(21), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
                  <div style={{ fontSize: dp(15), color: TV.muted, ...ellipsis }}>{[m.league || ctx.kindLabel(m.kind), followState(m, ctx.follows).any ? ctx.tt('sportYouFollow').toLowerCase() : null].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
              <span data-testid="feed-source-chip" style={{ fontSize: dp(15), padding: `${dp(6)}px ${dp(12)}px`, borderRadius: dp(8), background: TV.s12, whiteSpace: 'nowrap' }}>{sourceChip(m, ctx)}</span>
              <div data-testid="feed-play" {...station(() => ctx.watch(m))} aria-label={ctx.tt('sportWatch')} style={{ width: dp(56), height: dp(56), minHeight: dp(56), borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <SportIcons.Play size={dp(22)} />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {later.length > 0 ? (
        <section data-testid="feed-plan" style={{ display: 'flex', gap: dp(20), alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
            <span style={sectionTitle}>{ctx.tt('sportEveningPlan')}</span>
            {later.map((m) => {
              const reminded = ctx.isReminded(m)
              const best = m.sources[0]
              return (
                <div key={m.id} data-testid="feed-plan-row" style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: dp(16), padding: `${dp(12)}px ${dp(16)}px` }}>
                  <div data-testid="feed-plan-check" {...station(() => ctx.toggleRemind(m))} role="checkbox" aria-checked={reminded ? 'true' : 'false'} aria-label={ctx.tt('sportRemindMe')} style={{ width: dp(34), height: dp(34), minHeight: dp(34), borderRadius: dp(8), border: `2px solid ${reminded ? TV.acc : TV.lineStrong}`, background: reminded ? TV.acc : 'transparent', color: TV.onAcc, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: dp(20), cursor: 'pointer', flexShrink: 0 }}>{reminded ? '✓' : ''}</div>
                  <span style={{ fontSize: dp(22), fontWeight: 700, width: dp(84), flexShrink: 0 }}>{formatClock(m.start, ctx.locale)}</span>
                  <div {...station(() => ctx.openMatch(m))} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <div style={{ fontSize: dp(20), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
                    <div style={{ fontSize: dp(15), color: TV.muted, ...ellipsis }}>{[m.league || ctx.kindLabel(m.kind), best?.name].filter(Boolean).join(' · ')}</div>
                  </div>
                  {followState(m, ctx.follows).any ? <span style={{ color: '#fbbf24', display: 'inline-flex' }}><SportIcons.Star size={dp(22)} filled /></span> : null}
                </div>
              )
            })}
          </div>
          <div data-testid="sport-evening" style={{ ...cardStyle, width: dp(420), flexShrink: 0, padding: dp(20), display: 'flex', flexDirection: 'column', gap: dp(10) }}>
            <span style={overline}>{ctx.tt('sportYourEvening')}</span>
            <span style={{ fontSize: dp(20), fontWeight: 600 }}>{ctx.tt('sportEveningCount', { n: planned.length })}</span>
            <span style={{ fontSize: dp(15), color: TV.muted }}>{`${ctx.tt('sportKickoffAlert')}: ${alertLabel(ctx)}`}</span>
            {planned.map((m) => (
              <div key={m.id} data-testid="evening-row" style={{ display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(16) }}>
                <span style={{ fontWeight: 700 }}>{formatClock(m.start, ctx.locale)}</span>
                <span style={{ ...ellipsis, flex: 1 }}>{matchTitle(m)}</span>
                {clash.has(m.id) ? <span data-testid="evening-clash" title={ctx.tt('sportClash')} style={{ color: '#fbbf24' }}>⚠ {ctx.tt('sportClash')}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {finished.length > 0 ? (
        <section data-testid="feed-finished" style={{ display: 'flex', flexDirection: 'column', gap: dp(12) }}>
          <span style={sectionTitle}>{ctx.tt('sportFinished')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: dp(12) }}>
            {finished.map((m) => (
              <div key={m.id} {...station(() => ctx.openMatch(m))} style={{ ...cardStyle, padding: `${dp(12)}px ${dp(16)}px`, display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(17), cursor: 'pointer' }}>
                <span style={{ ...ellipsis, flex: 1 }}>{matchTitle(m)}</span>
                <span style={{ fontSize: dp(14), color: TV.dim }}>{ctx.tt('sportEnded')}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function TeamAvatar({ ctx, follow, dayMatches, days }: { ctx: SportCtx; follow: SportFollow; dayMatches: SportMatch[]; days: (SportDay | null)[] }) {
  const ring = teamRing(follow, dayMatches, ctx.now)
  const next = nextMatchFor(follow, days, ctx.now)
  const status = ring === 'live'
    ? ctx.tt('live')
    : next
      ? localDayKey(next.start) === localDayKey(ctx.now) ? formatClock(next.start, ctx.locale) : ctx.tt('sportTomorrow')
      : ''
  const ringShadow = ring === 'live' ? `0 0 0 ${dp(4)}px #ef4444` : ring === 'today' ? `0 0 0 ${dp(3)}px ${TV.text}` : `0 0 0 ${dp(2)}px ${TV.s14}`
  return (
    <div data-testid="feed-team" data-ring={ring} {...station(() => { if (next) ctx.openMatch(next) })} style={avatarCol}>
      <span style={{ position: 'relative', borderRadius: 999, boxShadow: ringShadow, display: 'inline-flex' }}>
        <Crest name={follow.name} colorKey={follow.key} size={dp(108)} />
        {ring === 'live' ? <span style={{ position: 'absolute', left: '50%', bottom: -dp(10), transform: 'translateX(-50%)', padding: `${dp(2)}px ${dp(8)}px`, borderRadius: dp(6), background: '#ef4444', color: '#fff', fontSize: dp(12), fontWeight: 700, letterSpacing: '0.1em' }}>{ctx.tt('live')}</span> : null}
      </span>
      <span style={{ fontSize: dp(17), fontWeight: 600, maxWidth: '100%', textAlign: 'center', ...ellipsis, marginTop: dp(6) }}>{follow.name}</span>
      <span style={{ fontSize: dp(15), color: ring === 'live' ? TV.live : TV.muted }}>{status}</span>
    </div>
  )
}
```

- [ ] **Step 4: Kör testerna och typkontrollen**

Run: `npx vitest run runtime/sport/tv/sport-feed.test.tsx && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/tv/sport-feed.tsx plugins/live-tv/runtime/sport/tv/sport-feed.test.tsx
git commit -m "live-tv sport: Flöde — dina lag, just nu, kvällsplan med krockvarning"
```

---

### Task 16: Följer — kort per sport, avsparksnotis, följväljaren

**Files:**
- Create: `runtime/sport/tv/sport-follows.tsx`
- Test: `runtime/sport/tv/sport-follows.test.tsx`

**Interfaces:**
- Consumes: Task 10 (`toggleFollow`, `isFollowing`, `setSportSettings`, `SportFollow`, `KickoffAlert`), Task 11 (`nextMatchFor`, `followCandidates`), Task 13 (`SportCtx`, `followNextLine`, `alertLabel`, `Crest`, `primaryBtn`, `ellipsis`, `sectionTitle`, `SportIcons`, `SportIcon`), `SPORT_KINDS`, `PickerPanel`/`Check` (`tv/tv-list-picker.tsx`), `Chip`/`Segment`/`cardStyle` (`tv/tv-ui.tsx`).
- Produces: `SportFollows({ ctx, days }: { ctx: SportCtx; days: (SportDay | null)[] })` (`days` = idag, imorgon); `FollowPicker({ ctx, days, onClose }: { ctx: SportCtx; days: (SportDay | null)[]; onClose: () => void })` (`days` = igår, idag, imorgon). Testid:n `follows-add`, `follows-alert`, `follows-empty`, `follow-group-<sport>`, `follow-card` (`data-following`), `follow-star`, `follow-picker`, `follow-row-<key>`, `follow-chip-<sport|all>`.

Handoff (skärmdump 08): "Lägg till lag eller turneringar" (accent), sammanfattning "N följs · notis 15 min före", Avsparksnotis Av / 15 min före / Vid avspark, grupper per sport med fyrkolumnskort (initialcirkel, stjärna, namn, nästa match). Ett avföljt kort dämpas till 0,55 men ligger kvar tills vyn lämnas (så att ett felklick går att ångra). Väljaren listar lag och turneringar ur EPG:t igår–imorgon (spec), filtrerade på sport — ingen fritext i fas 1.

- [ ] **Step 1: Skriv de fallerande testerna**

```tsx
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { SPORT_FOLLOWS_KEY, getFollows, getSportSettings, type SportFollow } from '../sport-store'
import { FollowPicker, SportFollows } from './sport-follows'
import { HOUR, MIN, fakeCtx, fxDay, fxMatch } from '../__sport-fixture'

afterEach(cleanup)
const now = new Date(2026, 9, 10, 18, 0).getTime()
const ham = fxMatch({ id: 'ham', home: 'AIK', away: 'Hammarby', start: now + 110 * MIN })
const cl = fxMatch({ id: 'cl', league: 'Champions League', leagueKey: 'uefa-champions-league', home: 'FC Barcelona', away: 'Paris SG', homeKey: 'barcelona', start: now - 30 * MIN })
const shl = fxMatch({ id: 'shl', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'Frölunda', away: 'Färjestad', homeKey: 'frolunda', awayKey: 'farjestad', start: now + 24 * HOUR })
const days = [fxDay('d0', [ham, cl]), fxDay('d1', [shl])]
const follows: SportFollow[] = [
  { sport: 'football', kind: 'team', key: 'hammarby', name: 'Hammarby' },
  { sport: 'football', kind: 'league', key: 'uefa-champions-league', name: 'Champions League' },
  { sport: 'hockey', kind: 'team', key: 'frolunda', name: 'Frölunda' },
]
beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, follows)
})

describe('Följer', () => {
  it('grupper per sport med nästa match', () => {
    render(<SportFollows ctx={fakeCtx({ now, follows })} days={days} />)
    const football = screen.getByTestId('follow-group-football')
    const cards = within(football).getAllByTestId('follow-card')
    expect(cards[0]).toHaveTextContent(/Hammarby.*Today \d\d:\d\d · vs AIK/)
    expect(cards[1]).toHaveTextContent('LIVE now · FC Barcelona - Paris SG')
    expect(within(screen.getByTestId('follow-group-hockey')).getByTestId('follow-card')).toHaveTextContent(/Tomorrow \d\d:\d\d · vs Färjestad/)
    expect(screen.getByText('3 followed · notice 15 min before')).toBeInTheDocument()
  })
  it('stjärnan avföljer, kortet dämpas men ligger kvar', () => {
    const { rerender } = render(<SportFollows ctx={fakeCtx({ now, follows })} days={days} />)
    fireEvent.click(within(screen.getAllByTestId('follow-card')[0]!).getByTestId('follow-star'))
    expect(getFollows().map((f) => f.key)).toEqual(['uefa-champions-league', 'frolunda'])
    rerender(<SportFollows ctx={fakeCtx({ now, follows: getFollows() })} days={days} />)
    const first = screen.getAllByTestId('follow-card')[0]!
    expect(first).toHaveTextContent('Hammarby')
    expect(first.getAttribute('data-following')).toBe('0')
  })
  it('avsparksnotisen sparas', () => {
    render(<SportFollows ctx={fakeCtx({ now, follows })} days={days} />)
    fireEvent.click(within(screen.getByTestId('follows-alert')).getByText('At kick-off'))
    expect(getSportSettings().alert).toBe('kickoff')
    expect(screen.getByText('Notices only arrive while Lumio is running.')).toBeInTheDocument()
  })
  it('tomt läge och Lägg till', () => {
    const ctx = fakeCtx({ now, follows: [] })
    render(<SportFollows ctx={ctx} days={days} />)
    expect(screen.getByTestId('follows-empty')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('follows-add'))
    expect(ctx.openFollowPicker).toHaveBeenCalled()
  })
})

describe('Följväljaren', () => {
  it('lag och turneringar ur EPG:t, filter per sport, rad växlar följning', () => {
    __resetForTests()
    const ctx = fakeCtx({ now })
    render(<FollowPicker ctx={ctx} days={[null, ...days]} onClose={() => {}} />)
    expect(screen.getByTestId('follow-picker')).toBeInTheDocument()
    expect(screen.getByTestId('follow-row-aik')).toBeInTheDocument()
    expect(screen.getByTestId('follow-row-shl')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('follow-row-aik'))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }])
    fireEvent.click(screen.getByTestId('follow-chip-hockey'))
    expect(screen.queryByTestId('follow-row-aik')).toBeNull()
    expect(screen.getByTestId('follow-row-frolunda')).toBeInTheDocument()
    expect(ctx.nav.pushLayer).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/sport/tv/sport-follows.test.tsx`
Expected: FAIL — `Failed to resolve import "./sport-follows"`.

- [ ] **Step 3: Implementera** (`runtime/sport/tv/sport-follows.tsx`)

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Chip, Segment, TV, cardStyle, dp, station } from '../../tv/tv-ui'
import { Check, PickerPanel } from '../../tv/tv-list-picker'
import { SPORT_KINDS, type SportDay, type SportKind } from '../sport-model'
import { followCandidates, nextMatchFor } from '../sport-day-model'
// `getStoredFollows`: väljarens bockar ska visa ett klick direkt, innan skalets `useFollows` hunnit rita om kontexten.
import { getFollows as getStoredFollows, isFollowing, setSportSettings, toggleFollow, type KickoffAlert, type SportFollow } from '../sport-store'
import { alertLabel, followNextLine, type SportCtx } from '../sport-ctx'
import { Crest, ellipsis, primaryBtn, sectionTitle } from './sport-parts'
import { SportIcon, SportIcons } from './sport-icons'

const same = (a: Pick<SportFollow, 'kind' | 'key'>, b: Pick<SportFollow, 'kind' | 'key'>) => a.kind === b.kind && a.key === b.key

export function SportFollows({ ctx, days }: { ctx: SportCtx; days: (SportDay | null)[] }) {
  // Avföljda ligger kvar (dämpade) tills vyn lämnas — ett felklick ska gå att ångra.
  const [shown, setShown] = useState<SportFollow[]>(ctx.follows)
  useEffect(() => {
    setShown((prev) => [...prev, ...ctx.follows.filter((f) => !prev.some((p) => same(p, f)))])
  }, [ctx.follows])
  const alertOptions: { key: KickoffAlert; label: string }[] = [
    { key: 'off', label: ctx.tt('sportAlertOff') },
    { key: '15', label: ctx.tt('sportAlert15') },
    { key: 'kickoff', label: ctx.tt('sportAlertKickoff') },
  ]
  const groups = SPORT_KINDS.map((kind) => [kind, shown.filter((f) => f.sport === kind)] as const).filter(([, list]) => list.length > 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dp(24) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(18), flexWrap: 'wrap' }}>
        <div data-testid="follows-add" {...station(ctx.openFollowPicker)} style={primaryBtn}>
          <SportIcons.Plus size={dp(20)} />
          {ctx.tt('sportFollowAdd')}
        </div>
        <span style={{ fontSize: dp(17), color: TV.muted }}>{ctx.tt('sportFollowSummary', { n: ctx.follows.length, rule: alertLabel(ctx).toLowerCase() })}</span>
        <div data-testid="follows-alert" style={{ ...cardStyle, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(12), padding: `${dp(8)}px ${dp(12)}px` }}>
          <SportIcons.Bell size={dp(20)} />
          <span style={{ fontSize: dp(17), fontWeight: 600 }}>{ctx.tt('sportKickoffAlert')}</span>
          <Segment options={alertOptions} value={ctx.settings.alert} onChange={(alert) => setSportSettings({ alert })} />
        </div>
      </div>
      <span style={{ fontSize: dp(15), color: TV.dim }}>{ctx.tt('sportAlertOnlyRunning')}</span>
      {shown.length === 0 ? <div data-testid="follows-empty" style={{ ...cardStyle, padding: dp(28), fontSize: dp(20), color: TV.muted }}>{ctx.tt('sportFollowEmpty')}</div> : null}
      {groups.map(([kind, list]) => (
        <section key={kind} data-testid={`follow-group-${kind}`} style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
            <SportIcon kind={kind} size={dp(28)} />
            <span style={sectionTitle}>{ctx.kindLabel(kind)}</span>
            <span style={{ fontSize: dp(17), color: TV.dim }}>{list.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: dp(16) }}>
            {list.map((f) => <FollowCard key={`${f.kind}:${f.key}`} ctx={ctx} follow={f} days={days} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function FollowCard({ ctx, follow, days }: { ctx: SportCtx; follow: SportFollow; days: (SportDay | null)[] }) {
  const following = isFollowing(ctx.follows, follow)
  const next = nextMatchFor(follow, days, ctx.now)
  return (
    <div data-testid="follow-card" data-following={following ? '1' : '0'} style={{ ...cardStyle, padding: dp(20), display: 'flex', flexDirection: 'column', gap: dp(10), opacity: following ? 1 : 0.55 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <Crest name={follow.name} colorKey={follow.key} size={dp(66)} />
        <div data-testid="follow-star" {...station(() => toggleFollow(follow))} aria-pressed={following ? 'true' : 'false'} aria-label={following ? ctx.tt('sportFollowingName', { name: follow.name }) : ctx.tt('sportFollowName', { name: follow.name })} style={{ marginLeft: 'auto', color: following ? '#fbbf24' : TV.dim, display: 'inline-flex', cursor: 'pointer' }}>
          <SportIcons.Star size={dp(28)} filled={following} />
        </div>
      </div>
      <span style={{ fontSize: dp(22), fontWeight: 600, ...ellipsis }}>{follow.name}</span>
      <span {...(next ? station(() => ctx.openMatch(next)) : {})} style={{ fontSize: dp(15), color: TV.muted, ...ellipsis }}>{followNextLine(ctx, follow, next)}</span>
    </div>
  )
}

export function FollowPicker({ ctx, days, onClose }: { ctx: SportCtx; days: (SportDay | null)[]; onClose: () => void }) {
  const [sport, setSport] = useState<SportKind | 'all'>('all')
  const all = followCandidates(days)
  const rows = all.filter((c) => sport === 'all' || c.sport === sport)
  const chips: { key: SportKind | 'all'; label: string }[] = [
    { key: 'all', label: ctx.tt('sportAll') },
    ...SPORT_KINDS.filter((k) => all.some((c) => c.sport === k)).map((k) => ({ key: k, label: ctx.kindLabel(k) })),
  ]
  return (
    <PickerPanel
      nav={ctx.nav}
      title={ctx.tt('sportFollowAdd')}
      onClose={onClose}
      testId="follow-picker"
      chips={(
        <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto' }}>
          {chips.map((chip, index) => (
            <Chip key={chip.key} data-testid={`follow-chip-${chip.key}`} active={sport === chip.key} {...station(() => setSport(chip.key), undefined, rows.length === 0 && index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(40), minHeight: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>
          ))}
        </div>
      )}
      rows={rows.map((c, index) => {
        const on = isFollowing(ctx.follows, c) || isFollowing(getStoredFollows(), c)
        return (
          <div key={`${c.kind}:${c.key}`} data-testid={`follow-row-${c.key}`} {...station(() => toggleFollow({ sport: c.sport, kind: c.kind, key: c.key, name: c.name }), undefined, index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(74), minHeight: dp(74), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
            <Check on={on} label={c.name} />
            <Crest name={c.name} colorKey={c.key} size={dp(46)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{c.name}</div>
              <div style={{ fontSize: dp(15), color: TV.dim, ...ellipsis }}>{ctx.kindLabel(c.sport)}</div>
            </div>
          </div>
        )
      })}
    />
  )
}
```


- [ ] **Step 4: Kör testerna och typkontrollen**

Run: `npx vitest run runtime/sport/tv/sport-follows.test.tsx && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/tv/sport-follows.tsx plugins/live-tv/runtime/sport/tv/sport-follows.test.tsx
git commit -m "live-tv sport: Följer med avsparksnotis och följväljare ur EPG:t"
```

---

### Task 17: Matchcentret — Var kan jag se den, Välj annan kanal

**Files:**
- Create: `runtime/sport/tv/sport-match-center.tsx`
- Test: `runtime/sport/tv/sport-match-center.test.tsx`

**Interfaces:**
- Consumes: Task 10 (`toggleFollow`, `setOverride`), Task 11 (`rankedSources`, `followState`, `statusAt`), Task 13 (`SportCtx`, `timeLine`, `Crest`, `StatusTag`, `overline`, `ellipsis`, `primaryBtn`, `SportIcons`), `sourceChannel`, `matchTitle`, `channelKey`, `ChannelArt`/`RoundBtn`/`TV`/`dp`/`station` (`tv/tv-ui.tsx`), `TvChannelPicker` (`tv/tv-channel-picker.tsx`).
- Produces: `SportMatchCenter({ ctx, match, onClose }: { ctx: SportCtx; match: SportMatch; onClose: () => void })` — höger låda, registrerar ETT lager via `ctx.nav.pushLayer` (Bakåt stänger), fokus tillbaka till öppnaren. Testid:n `match-center`, `mc-close`, `mc-follow-home|away|league`, `mc-remind`, `mc-source` (`data-selected`), `mc-best`, `mc-watch`, `mc-pick-channel`, `mc-clear-override`.

Handoff (skärmdump 09): status, liga · arena, lagen med initialcirklar och tid i stället för ställning; följpiller för hemma/borta/liga + Påminn mig (inte "Notis vid mål" — fas 2); VAR KAN JAG SE DEN: alla källor (logga, namn, spellista · fördröjning "—", kvalitet, BÄST på första när det finns fler än en), vald rad vit; "Titta · FHD"; "Välj annan kanal…" pekar matchen mot valfri kanal och vinner alltid. Raderna Händelser, Statistik och Laguppställningar finns INTE i fas 1.

- [ ] **Step 1: Skriv de fallerande testerna**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { SPORT_OVERRIDES_KEY, getFollows, getOverrides } from '../sport-store'
import { SportMatchCenter } from './sport-match-center'
import { MIN, fakeCtx, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
beforeEach(() => __resetForTests())
const now = Date.now()
const m = fxMatch({
  id: 'm', home: 'FC Barcelona', away: 'Paris SG', homeKey: 'barcelona', awayKey: 'paris saint germain',
  league: 'Champions League', leagueKey: 'uefa-champions-league', venue: 'Estadi Olímpic', round: 5,
  start: now - 30 * MIN, stop: now + 90 * MIN,
  sources: [fxSource('V Sport Fotboll', { quality: 'FHD' }), fxSource('V Sport Fotboll HD', { quality: 'HD', sourceId: 'src-b' })],
})

describe('Matchcentret', () => {
  it('huvud, källor med BÄST och spellista, ett lager', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchCenter ctx={ctx} match={m} onClose={() => {}} />)
    const mc = screen.getByTestId('match-center')
    expect(mc).toHaveTextContent('LIVE')
    expect(mc).toHaveTextContent('Champions League · Estadi Olímpic · Round 5')
    const rows = screen.getAllByTestId('mc-source')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('V Sport Fotboll')
    expect(rows[0]).toHaveTextContent('Xtream · —')
    expect(rows[1]).toHaveTextContent('Playlist · —')
    expect(screen.getByTestId('mc-best')).toHaveTextContent('BEST')
    expect(ctx.nav.pushLayer).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Lineups|Statistics|Events|goal/i)).toBeNull()
  })
  it('vald källa spelas och lådan stängs', () => {
    const ctx = fakeCtx({ now })
    const onClose = vi.fn()
    render(<SportMatchCenter ctx={ctx} match={m} onClose={onClose} />)
    expect(screen.getByTestId('mc-watch')).toHaveTextContent('Watch · FHD')
    fireEvent.click(screen.getAllByTestId('mc-source')[1]!)
    expect(screen.getAllByTestId('mc-source')[1]!.getAttribute('data-selected')).toBe('1')
    fireEvent.click(screen.getByTestId('mc-watch'))
    expect(ctx.watch).toHaveBeenCalledWith(m, m.sources[1])
    expect(onClose).toHaveBeenCalled()
  })
  it('följ hemma och liga, påminn', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchCenter ctx={ctx} match={m} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('mc-follow-home'))
    fireEvent.click(screen.getByTestId('mc-follow-league'))
    expect(getFollows()).toEqual([
      { sport: 'football', kind: 'team', key: 'barcelona', name: 'FC Barcelona' },
      { sport: 'football', kind: 'league', key: 'uefa-champions-league', name: 'Champions League' },
    ])
    fireEvent.click(screen.getByTestId('mc-remind'))
    expect(ctx.toggleRemind).toHaveBeenCalledWith(m)
  })
  it('åsidosättningen står först som Ditt val och kan tas bort', () => {
    const override = { key: 'C::http://y/C', name: 'C 4K', url: 'http://y/C', logo: null, group: 'Sport', tvgId: null }
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_OVERRIDES_KEY, { m: override })
    render(<SportMatchCenter ctx={fakeCtx({ now, overrides: { m: override } })} match={m} onClose={() => {}} />)
    const first = screen.getAllByTestId('mc-source')[0]!
    expect(first).toHaveTextContent('C 4K')
    expect(first).toHaveTextContent('Your choice')
    fireEvent.click(screen.getByTestId('mc-clear-override'))
    expect(getOverrides().m).toBeUndefined()
  })
})
```

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/sport/tv/sport-match-center.test.tsx`
Expected: FAIL — `Failed to resolve import "./sport-match-center"`.

- [ ] **Step 3: Implementera** (`runtime/sport/tv/sport-match-center.tsx`)

```tsx
'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { channelKey } from '../../live-tv-data'
import { ChannelArt, RoundBtn, TV, dp, station } from '../../tv/tv-ui'
import { TvChannelPicker } from '../../tv/tv-channel-picker'
import { matchTitle, sourceChannel, type SportMatch } from '../sport-model'
import { followState, rankedSources, statusAt } from '../sport-day-model'
import { setOverride, toggleFollow } from '../sport-store'
import { timeLine, type SportCtx } from '../sport-ctx'
import { Crest, StatusTag, ellipsis, overline, primaryBtn } from './sport-parts'
import { SportIcons } from './sport-icons'

const pill = (on: boolean): CSSProperties => ({
  height: dp(52), minHeight: dp(52), padding: `0 ${dp(20)}px`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: dp(8),
  fontSize: dp(17), fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  background: on ? 'rgba(251,191,36,0.16)' : TV.s10, color: on ? '#fde68a' : TV.text, border: `1px solid ${on ? 'rgba(251,191,36,0.45)' : TV.lineCard}`,
})

export function SportMatchCenter({ ctx, match, onClose }: { ctx: SportCtx; match: SportMatch; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  // Senaste nav/onClose i refar: lagret registreras EN gång per öppning
  // (samma mönster och skäl som PickerPanel i tv-list-picker.tsx).
  const navRef = useRef(ctx.nav)
  const onCloseRef = useRef(onClose)
  useEffect(() => { navRef.current = ctx.nav; onCloseRef.current = onClose })
  const [picking, setPicking] = useState(false)
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    const close = () => {
      onCloseRef.current()
      window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0)
    }
    const off = navRef.current.pushLayer(close)
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
    return off
  }, [])

  const ranked = rankedSources(match, ctx.overrides)
  const override = ctx.overrides[match.id]
  const index = Math.min(selected, Math.max(ranked.length - 1, 0))
  const chosen = ranked[index] ?? null
  const fs = followState(match, ctx.follows)
  const st = statusAt(match, ctx.now)
  const context = [match.league || ctx.kindLabel(match.kind), match.venue, match.round ? ctx.tt('sportRound', { n: match.round }) : null].filter(Boolean).join(' · ')
  const follow = (kind: 'team' | 'league', key: string | null, name: string | null) => {
    if (key && name) toggleFollow({ sport: match.kind, kind, key, name })
  }

  return (
    <>
      <div data-live-tv-layer="" aria-hidden="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 59, background: TV.scrim }} />
      <div ref={rootRef} data-testid="match-center" data-panel-root="" data-live-tv-layer="" data-scroll="" role="dialog" aria-label={matchTitle(match)} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(840)}px, 100%)`, zIndex: 60, background: '#141519', borderLeft: '1px solid rgba(255,255,255,0.16)', padding: `${dp(28)}px ${dp(32)}px`, display: 'flex', flexDirection: 'column', gap: dp(20), overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
          <StatusTag match={match} ctx={ctx} />
          <span style={{ fontSize: dp(17), color: TV.muted, ...ellipsis }}>{context}</span>
          <RoundBtn data-testid="mc-close" {...station(onClose)} aria-label={ctx.tt('sportClose')} style={{ marginLeft: 'auto' }}>✕</RoundBtn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: dp(20) }}>
          {match.home && match.away ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(10), minWidth: 0 }}>
                <Crest name={match.home} colorKey={match.homeKey ?? match.home} size={dp(99)} />
                <span style={{ fontSize: dp(22), fontWeight: 600, ...ellipsis }}>{match.home}</span>
              </div>
              <span style={{ fontSize: dp(24), fontWeight: 600, color: st === 'live' ? TV.liveText : TV.muted, whiteSpace: 'nowrap' }}>{timeLine(match, ctx)}</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(10), minWidth: 0 }}>
                <Crest name={match.away} colorKey={match.awayKey ?? match.away} size={dp(99)} />
                <span style={{ fontSize: dp(22), fontWeight: 600, ...ellipsis }}>{match.away}</span>
              </div>
            </>
          ) : (
            <div style={{ gridColumn: '1 / 4', textAlign: 'center' }}>
              <div style={{ fontSize: dp(30), fontWeight: 600 }}>{matchTitle(match)}</div>
              <div style={{ fontSize: dp(20), color: TV.muted }}>{timeLine(match, ctx)}</div>
            </div>
          )}
        </div>

        <div data-row="" style={{ display: 'flex', gap: dp(10), flexWrap: 'wrap' }}>
          {match.home && match.homeKey ? (
            <div data-testid="mc-follow-home" {...station(() => follow('team', match.homeKey, match.home))} aria-pressed={fs.home ? 'true' : 'false'} style={pill(fs.home)}>
              <SportIcons.Star size={dp(18)} filled={fs.home} />
              {fs.home ? ctx.tt('sportFollowingName', { name: match.home }) : ctx.tt('sportFollowName', { name: match.home })}
            </div>
          ) : null}
          {match.away && match.awayKey ? (
            <div data-testid="mc-follow-away" {...station(() => follow('team', match.awayKey, match.away))} aria-pressed={fs.away ? 'true' : 'false'} style={pill(fs.away)}>
              <SportIcons.Star size={dp(18)} filled={fs.away} />
              {fs.away ? ctx.tt('sportFollowingName', { name: match.away }) : ctx.tt('sportFollowName', { name: match.away })}
            </div>
          ) : null}
          {match.leagueKey ? (
            <div data-testid="mc-follow-league" {...station(() => follow('league', match.leagueKey, match.league))} aria-pressed={fs.league ? 'true' : 'false'} style={pill(fs.league)}>
              <SportIcons.Star size={dp(18)} filled={fs.league} />
              {fs.league ? ctx.tt('sportFollowingName', { name: match.league }) : ctx.tt('sportFollowName', { name: match.league })}
            </div>
          ) : null}
          {ranked.length > 0 && st !== 'finished' ? (
            <div data-testid="mc-remind" {...station(() => ctx.toggleRemind(match))} aria-pressed={ctx.isReminded(match) ? 'true' : 'false'} style={pill(false)}>
              <SportIcons.Bell size={dp(18)} />
              {ctx.isReminded(match) ? ctx.tt('sportReminded') : ctx.tt('sportRemindMe')}
            </div>
          ) : null}
        </div>

        <span style={overline}>{ctx.tt('sportWhereToWatch')}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          {ranked.map((s, i) => {
            const on = i === index
            return (
              <div key={s.channelKey} data-testid="mc-source" data-selected={on ? '1' : '0'} {...station(() => setSelected(i), undefined, i === 0 ? { 'data-init': '' } : undefined)} style={{ display: 'flex', alignItems: 'center', gap: dp(16), padding: `${dp(12)}px ${dp(16)}px`, borderRadius: dp(12), cursor: 'pointer', background: on ? TV.text : TV.s08, color: on ? '#12152a' : TV.text, border: `1px solid ${on ? TV.text : TV.lineCard}` }}>
                <ChannelArt channel={sourceChannel(s)} style={{ width: dp(72), height: dp(46), flexShrink: 0 }} radius={dp(8)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{s.name}</div>
                  <div style={{ fontSize: dp(15), opacity: 0.7, ...ellipsis }}>{`${ctx.playlistName(s.sourceId)} · ${ctx.tt('sportLatencyUnknown')}`}</div>
                </div>
                {override && i === 0 ? <span style={{ fontSize: dp(14), fontWeight: 600 }}>{ctx.tt('sportYourChoice')}</span> : null}
                {s.quality ? <span style={{ fontSize: dp(16), fontWeight: 700 }}>{s.quality}</span> : null}
                {i === 0 && ranked.length > 1 ? <span data-testid="mc-best" style={{ fontSize: dp(14), fontWeight: 700, letterSpacing: '0.1em', color: on ? '#c2410c' : TV.accText }}>{ctx.tt('sportBest')}</span> : null}
              </div>
            )
          })}
        </div>
        {chosen ? (
          <div data-testid="mc-watch" {...station(() => { ctx.watch(match, chosen); onClose() })} style={{ ...primaryBtn, justifyContent: 'center' }}>
            <SportIcons.Play size={dp(20)} />
            {chosen.quality ? ctx.tt('sportWatchQuality', { quality: chosen.quality }) : ctx.tt('sportWatch')}
          </div>
        ) : null}
        <div data-testid="mc-pick-channel" {...station(() => setPicking(true))} style={{ display: 'flex', alignItems: 'center', gap: dp(14), padding: `${dp(14)}px ${dp(16)}px`, borderRadius: dp(12), background: TV.s08, border: `1px solid ${TV.lineCard}`, cursor: 'pointer' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: dp(19), fontWeight: 600 }}>{ctx.tt('sportPickChannel')}</div>
            <div style={{ fontSize: dp(15), color: TV.muted }}>{ctx.tt('sportPickChannelSub')}</div>
          </div>
          <span aria-hidden="true">›</span>
        </div>
        {override ? (
          <div data-testid="mc-clear-override" {...station(() => setOverride(match.id, null))} style={{ fontSize: dp(17), color: TV.accText, cursor: 'pointer', padding: `${dp(8)}px ${dp(4)}px` }}>{ctx.tt('sportUseAutomatic')}</div>
        ) : null}
      </div>
      {picking ? (
        <TvChannelPicker
          model={ctx.model}
          nav={ctx.nav}
          title={ctx.tt('sportPickChannel')}
          onPick={(channel) => {
            setOverride(match.id, { key: channelKey(channel), name: channel.name, url: channel.url, logo: channel.logo ?? null, group: channel.group, tvgId: channel.tvgId })
            setSelected(0)
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </>
  )
}
```

- [ ] **Step 4: Kör testerna och typkontrollen**

Run: `npx vitest run runtime/sport/tv/sport-match-center.test.tsx && npx tsc --noEmit -p .`
Expected: PASS. (`RoundBtn` tar `StationProps` via `...rest` — `data-testid` och `aria-label` följer med.)

- [ ] **Step 5: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/tv/sport-match-center.tsx plugins/live-tv/runtime/sport/tv/sport-match-center.test.tsx
git commit -m "live-tv sport: matchcenter med Var kan jag se den och Välj annan kanal"
```

---

### Task 18: Sportskalet, rälsposten och routingen

**Files:**
- Create: `runtime/sport/tv/sport-shell.tsx`
- Modify: `runtime/tv/tv-rail.tsx` (`RailKey`, `railKeyForView`, posten)
- Modify: `runtime/tv/tv-shell.tsx:82-83` (`TvView`, `VIEWS`) och More-arket (~rad 660)
- Modify: `runtime/tv/tv-views.tsx`
- Modify: `runtime/tv/mobile/mobile-tab-bar.tsx:37-43` (`tabForView`)
- Modify: `runtime/sport/__sport-fixture.tsx` (lägg till `mountSport`)
- Modify (tester som speglar rälsen): `runtime/tv/tv-rail.test.tsx`, `runtime/tv/tv-shell.test.tsx`, `runtime/tv/mobile/mobile-tab-bar.test.tsx`
- Test: `runtime/sport/tv/sport-shell.test.tsx`

**Interfaces:**
- Consumes: Task 9–17 (allt ovan).
- Produces: `TvSport(props: TvViewProps)`; `TvView` får `'sport'`; `RailKey` får `'sport'` (mellan `guide` och `library`); `railKeyForView('sport') === 'sport'`; `tabForView('sport') === 'more'`; More-arket får posten Sport; fixturen `mountSport(params?, { days?, phone?, follows? }): { onNavigate, fetchSpy, box, …render }`.
- Testid:n i skalet: `sport-view`, `sport-summary`, `sport-tab-foryou|follows` (aktiv bär `data-init`), `sport-day--1|0|1`, `sport-chip-<sport>`, `sport-all`, `sport-missing`, `sport-empty`.

Handoff (skärmdump 05/06/08): rubrik "Sport" + "Idag · N matcher · N live" + klocka; flikarna För dig / Följer (Resultat-fliken hör till fas 2 och visas inte); "Visa som" Matchdag/Flöde bara på För dig, valet sparas i `sport_settings_v1`; dagbrickor Igår/Idag/Imorgon; sportknappar bara för sporter med matcher den dagen; "Alla sporter" öppnar en panel med antal per sport.

- [ ] **Step 1: Lägg `mountSport` i fixturen** (sist i `runtime/sport/__sport-fixture.tsx`, importerna överst)

```tsx
import { afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { LiveTvTvShell } from '../tv/tv-shell'
import { SPORT_FOLLOWS_KEY, type SportFollow } from './sport-store'

const fxChannel = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
/** Spellistan i skalets tester. "TV4 Fotboll FHD SE" har samma nyckel som `fxMatch`s standardkälla. */
export const fxList: LiveTvList = { id: 'l1', name: 'Xtream', channels: [fxChannel('A'), fxChannel('B'), fxChannel('TV4 Fotboll FHD SE')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

const boxes: HTMLElement[] = []
afterEach(() => {
  cleanup()
  for (const box of boxes.splice(0)) box.remove()
})

/** Monterar skalet på Sport-vyn. TV-läge som standard; `phone: true` märker lådan som värdens telefonscen. */
export function mountSport(params: Record<string, string> = {}, opts: { days?: Record<string, SportMatch[]> | 'missing'; phone?: boolean; follows?: SportFollow[] } = {}) {
  __resetForTests()
  __setTvModeForTests(!opts.phone)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [fxList])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  if (opts.follows) writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, opts.follows)
  seedLiveTvIndex()
  const fetchSpy = stubSportDays(opts.days ?? {})
  const onNavigate = vi.fn()
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  if (opts.phone) {
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
  }
  document.body.appendChild(box)
  boxes.push(box)
  const view = render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'sport', ...params }} onNavigate={onNavigate} onOpenDetails={() => {}} />, { container: box })
  return { ...view, onNavigate, fetchSpy, box }
}
```

- [ ] **Step 2: Skriv de fallerande testerna** (`runtime/sport/tv/sport-shell.test.tsx`)

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { localDayKey, shiftDay } from '../sport-epg'
import { getOverrides, getSportSettings } from '../sport-store'
import { HOUR, MIN, fxMatch, mountSport } from '../__sport-fixture'

vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

const now = Date.now()
const today = localDayKey(now)
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + 2 * HOUR })
const shl = fxMatch({ id: 'shl', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'HV71', away: 'Brynäs', start: now + 3 * HOUR })

describe('Sportskalet', () => {
  it('rubrik med sammanfattning, hero, exakt en data-init', async () => {
    mountSport({}, { days: { [today]: [live, later] } })
    expect(await screen.findByTestId('sport-hero')).toHaveTextContent('GAIS')
    expect(screen.getByTestId('sport-summary')).toHaveTextContent('Today · 2 matches · 1 live')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('Visa som Flöde sparas i sportinställningarna', async () => {
    mountSport({}, { days: { [today]: [live, later] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(screen.getByText('Feed'))
    expect(getSportSettings().view).toBe('feed')
    expect(await screen.findByTestId('feed-teams')).toBeInTheDocument()
  })
  it('dagbrickan Imorgon hämtar morgondagen', async () => {
    const { fetchSpy } = mountSport({}, { days: { [today]: [live] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(screen.getByTestId('sport-day-1'))
    expect(await screen.findByTestId('sport-empty')).toBeInTheDocument()
    expect(screen.getByTestId('sport-summary')).toHaveTextContent('Tomorrow · 0 matches · 0 live')
    const days = fetchSpy.mock.calls.map((call) => new URL(String(call[0]), 'http://localhost').searchParams.get('day'))
    expect(days).toContain(shiftDay(today, 1))
  })
  it('sportknappar bara för sporter med matcher; Alla sporter visar antal och filtrerar', async () => {
    mountSport({}, { days: { [today]: [live, later, shl] } })
    await screen.findByTestId('sport-hero')
    expect(screen.getByTestId('sport-chip-football')).toBeInTheDocument()
    expect(screen.getByTestId('sport-chip-hockey')).toBeInTheDocument()
    expect(screen.queryByTestId('sport-chip-tennis')).toBeNull()
    fireEvent.click(screen.getByTestId('sport-all'))
    const panel = await screen.findByTestId('choice-panel')
    expect(within(panel).getByTestId('choice-row-Football')).toHaveTextContent('2')
    fireEvent.click(within(panel).getByTestId('choice-row-Ice hockey'))
    await waitFor(() => expect(screen.getByTestId('sport-summary')).toHaveTextContent('Today · 1 matches · 0 live'))
  })
  it('en äldre app utan endpointen får ett besked, inte en evig laddning', async () => {
    mountSport({}, { days: 'missing' })
    expect(await screen.findByTestId('sport-missing')).toHaveTextContent('Sport needs a newer version of Lumio.')
  })
  it('Titta i hero spelar bästa källan', async () => {
    mountSport({}, { days: { [today]: [live] } })
    fireEvent.click(await screen.findByTestId('sport-hero-watch'))
    expect(await screen.findByTestId('player')).toHaveTextContent('TV4 Fotboll FHD SE')
  })
  it('kortet öppnar matchcentret; Välj annan kanal sparar åsidosättningen; Bakåt stänger lager för lager', async () => {
    const { onNavigate } = mountSport({}, { days: { [today]: [live, later] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(within(screen.getByTestId('sport-section-later')).getByTestId('sport-card'))
    expect(await screen.findByTestId('match-center')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('mc-pick-channel'))
    fireEvent.click(await screen.findByTestId('picker-row-A'))
    expect(getOverrides().later?.name).toBe('A')
    await waitFor(() => expect(screen.queryByTestId('channel-picker')).toBeNull())
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('match-center')).toBeNull())
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('rälsens Sport-post navigerar till sportvyn', async () => {
    const { onNavigate } = mountSport({ view: 'hub' }, { days: {} })
    fireEvent.click(screen.getByTestId('rail-sport'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'sport' } })
  })
})
```

Uppdatera de befintliga rälstesterna (rälsen får en post till, i övrigt oförändrad):

- `runtime/tv/tv-rail.test.tsx`, första testet: förväntad ordning blir `['rail-back', 'rail-search', 'rail-home', 'rail-hub', 'rail-guide', 'rail-sport', 'rail-library', 'rail-multi', 'rail-favs', 'rail-settings']`; i `railKeyForView`-testet lägg till `expect(railKeyForView('sport')).toBe('sport')`.
- `runtime/tv/tv-shell.test.tsx`: "ritar ikonraden med nio stationer" → `toHaveLength(10)` (och byt "nio" mot "tio" i testnamnet); ordningstestet får `'rail-sport'` mellan `'rail-guide'` och `'rail-library'`.
- `runtime/tv/mobile/mobile-tab-bar.test.tsx`: lägg till `expect(tabForView('sport')).toBe('more')` bredvid `tabForView('settings')`.

- [ ] **Step 3: Kör och se dem falla**

Run: `npx vitest run runtime/sport/tv/sport-shell.test.tsx runtime/tv/tv-rail.test.tsx runtime/tv/tv-shell.test.tsx runtime/tv/mobile/mobile-tab-bar.test.tsx`
Expected: FAIL — `sport-shell` saknas, rälsen har nio poster.

- [ ] **Step 4: Implementera skalet** (`runtime/sport/tv/sport-shell.tsx`)

```tsx
'use client'

import { useCallback, useMemo, useState } from 'react'
import type { TvViewProps } from '../../tv/tv-shell'
import { TvChoicePanel } from '../../tv/tv-list-picker'
import { Chip, Segment, TV, dp, station, useTvClockNode } from '../../tv/tv-ui'
import { SPORT_CHIPS, SPORT_KINDS, type SportFilter, type SportKind, type SportMatch } from '../sport-model'
import { dayStartMs, localDayKey, shiftDay, useSportDay } from '../sport-epg'
import { setSportSettings } from '../sport-store'
import { headerSummary, sportCounts, visibleMatches } from '../sport-day-model'
import { useSportCtx } from '../sport-ctx'
import { Notice } from './sport-parts'
import { SportIcon } from './sport-icons'
import { SportMatchday } from './sport-matchday'
import { SportFeed } from './sport-feed'
import { FollowPicker, SportFollows } from './sport-follows'
import { SportMatchCenter } from './sport-match-center'

type SportTab = 'foryou' | 'follows'
type DayOffset = -1 | 0 | 1
const OFFSETS: readonly DayOffset[] = [-1, 0, 1]

/** Sportvyn. Skrivbordet ritar samma träd i scenlådan (Live TV:s "everywhere"-modell). */
export function TvSport(props: TvViewProps) {
  return <SportTv {...props} />
}

function SportTv({ model, nav }: TvViewProps) {
  const [tab, setTab] = useState<SportTab>('foryou')
  const [offset, setOffset] = useState<DayOffset>(0)
  const [filter, setFilter] = useState<SportFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [allOpen, setAllOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const openMatch = useCallback((m: SportMatch) => setOpenId(m.id), [])
  const openFollowPicker = useCallback(() => setPickerOpen(true), [])
  const ctx = useSportCtx({ model, nav, openMatch, openFollowPicker })
  const { tt, locale } = ctx
  const clock = useTvClockNode(locale)

  const today = localDayKey(model.nowMs)
  const day = shiftDay(today, offset)
  const selected = useSportDay(day, model.nowMs)
  // Fler dagar bara när en vy faktiskt behöver dem — alla är lokala och cachade.
  const wantsToday = tab === 'follows' || pickerOpen
  const todayDay = useSportDay(wantsToday ? today : null, model.nowMs)
  const tomorrowDay = useSportDay(wantsToday || ctx.settings.view === 'feed' ? shiftDay(today, 1) : null, model.nowMs)
  const yesterdayDay = useSportDay(pickerOpen ? shiftDay(today, -1) : null, model.nowMs)

  const counts = sportCounts(selected.data)
  const matches = useMemo(() => visibleMatches(selected.data, filter), [selected.data, filter])
  const summary = headerSummary(matches, ctx.now)
  const total = SPORT_KINDS.reduce((sum, k) => sum + counts[k], 0)
  const open = useMemo(() => {
    if (!openId) return null
    return [selected.data, todayDay.data, tomorrowDay.data].flatMap((d) => d?.matches ?? []).find((m) => m.id === openId) ?? null
  }, [openId, selected.data, todayDay.data, tomorrowDay.data])
  const dayLabel = (o: DayOffset) => (o === -1 ? tt('sportYesterday') : o === 0 ? tt('sportToday') : tt('sportTomorrow'))

  const body = () => {
    if (selected.state === 'missing') return <Notice testId="sport-missing" text={tt('sportNeedsUpdate')} />
    if (selected.state === 'error') return <Notice testId="sport-error" text={tt('sportError')} />
    if (tab === 'follows') return <SportFollows ctx={ctx} days={[todayDay.data, tomorrowDay.data]} />
    if (selected.state === 'loading') return <Notice testId="sport-loading" text={tt('sportLoading')} />
    if (matches.length === 0) return <Notice testId="sport-empty" text={tt('sportEmptyDay')} />
    return ctx.settings.view === 'feed'
      ? <SportFeed ctx={ctx} matches={matches} days={[selected.data, tomorrowDay.data]} />
      : <SportMatchday ctx={ctx} matches={matches} dayFrom={dayStartMs(day)} />
  }

  return (
    <div data-testid="sport-view" data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `${dp(34)}px ${dp(48)}px ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(22) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(18) }}>
        <span style={{ fontSize: dp(40), fontWeight: 600 }}>{tt('sportTitle')}</span>
        <span data-testid="sport-summary" style={{ fontSize: dp(19), color: TV.muted }}>{tt('sportSummary', { day: dayLabel(offset), count: summary.total, live: summary.live })}</span>
        <span style={{ marginLeft: 'auto' }}>{clock}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: dp(28), borderBottom: `1px solid ${TV.s12}` }}>
        {(['foryou', 'follows'] as const).map((key) => (
          <div
            key={key}
            data-testid={`sport-tab-${key}`}
            {...station(() => setTab(key), undefined, key === tab ? { 'data-init': '' } : undefined)}
            aria-selected={key === tab ? 'true' : 'false'}
            style={{ padding: `${dp(8)}px 0 ${dp(12)}px`, fontSize: dp(24), fontWeight: 600, cursor: 'pointer', color: key === tab ? TV.text : TV.muted, borderBottom: `${dp(4)}px solid ${key === tab ? TV.acc : 'transparent'}`, marginBottom: -1 }}
          >
            {key === 'foryou' ? tt('sportTabForYou') : tt('sportTabFollows')}
          </div>
        ))}
        {tab === 'foryou' ? (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(12), paddingBottom: dp(8) }}>
            <span style={{ fontSize: dp(16), color: TV.dim }}>{tt('sportViewAs')}</span>
            <Segment options={[{ key: 'matchday' as const, label: tt('sportMatchday') }, { key: 'feed' as const, label: tt('sportFeed') }]} value={ctx.settings.view} onChange={(view) => setSportSettings({ view })} />
          </div>
        ) : null}
      </div>

      <div data-row="" style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
        {OFFSETS.map((o) => {
          const active = o === offset
          return (
            <div key={o} data-testid={`sport-day-${o}`} {...station(() => setOffset(o))} aria-pressed={active ? 'true' : 'false'} style={{ minWidth: dp(144), height: dp(68), padding: `0 ${dp(18)}px`, borderRadius: dp(14), display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box', background: active ? TV.text : TV.s10, color: active ? '#12152a' : TV.text, border: `1px solid ${active ? TV.text : TV.lineCard}` }}>
              <span style={{ fontSize: dp(20), fontWeight: 700 }}>{dayLabel(o)}</span>
              <span style={{ fontSize: dp(15), opacity: 0.7 }}>{new Date(dayStartMs(shiftDay(today, o)) + 12 * 3_600_000).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          )
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(10) }}>
          {SPORT_CHIPS.filter((k) => counts[k] > 0).map((k) => {
            const active = filter === k
            return (
              <div key={k} data-testid={`sport-chip-${k}`} {...station(() => setFilter(active ? 'all' : k))} aria-label={ctx.kindLabel(k)} title={ctx.kindLabel(k)} aria-pressed={active ? 'true' : 'false'} style={{ height: dp(68), minWidth: dp(68), padding: active ? `0 ${dp(18)}px` : 0, boxSizing: 'border-box', borderRadius: dp(14), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: dp(8), cursor: 'pointer', background: active ? TV.accMix(22) : TV.s10, color: active ? TV.accText : TV.text, border: `1px solid ${active ? TV.acc : TV.lineCard}`, fontSize: dp(18), fontWeight: 600 }}>
                <SportIcon kind={k} size={dp(26)} />
                {active ? ctx.kindLabel(k) : null}
              </div>
            )
          })}
          <Chip data-testid="sport-all" active={filter === 'all'} {...station(() => setAllOpen(true))}>
            {filter === 'all' ? tt('sportAll') : ctx.kindLabel(filter)} ▾
          </Chip>
        </div>
      </div>

      {body()}

      {allOpen ? (
        <TvChoicePanel
          nav={nav}
          title={tt('sportAll')}
          options={[{ key: null, label: tt('sportAll'), count: total }, ...SPORT_KINDS.filter((k) => counts[k] > 0).map((k) => ({ key: k, label: ctx.kindLabel(k), count: counts[k] }))]}
          value={filter === 'all' ? null : filter}
          onPick={(key) => setFilter((key as SportKind | null) ?? 'all')}
          onClose={() => setAllOpen(false)}
        />
      ) : null}
      {open ? <SportMatchCenter ctx={ctx} match={open} onClose={() => setOpenId(null)} /> : null}
      {pickerOpen ? <FollowPicker ctx={ctx} days={[yesterdayDay.data, todayDay.data, tomorrowDay.data]} onClose={() => setPickerOpen(false)} /> : null}
    </div>
  )
}
```

- [ ] **Step 5: Koppla in vyn, rälsen och telefonens Mer-ark**

`runtime/tv/tv-shell.tsx`:

```ts
export type TvView = 'hub' | 'guide' | 'favs' | 'channel' | 'search' | 'multi' | 'library' | 'title' | 'cast' | 'settings' | 'sport'
const VIEWS: TvView[] = ['hub', 'guide', 'favs', 'channel', 'search', 'multi', 'library', 'title', 'cast', 'settings', 'sport']
```

och i More-arkets `items` (telefon), först i listan:

```tsx
            { key: 'sport', label: tt('sheetSport'), run: () => go('sport') },
```

`runtime/tv/tv-views.tsx`: `import { TvSport } from '../sport/tv/sport-shell'` och `sport: TvSport,` sist i `TV_VIEWS`.

`runtime/tv/tv-rail.tsx`:

```ts
import { SportIcons } from '../sport/tv/sport-icons'

export type RailKey = 'back' | 'search' | 'home' | 'hub' | 'guide' | 'sport' | 'library' | 'multi' | 'favs' | 'settings'

export function railKeyForView(view: TvView): RailKey | null {
  if (view === 'channel') return 'guide'
  if (view === 'hub' || view === 'search' || view === 'guide' || view === 'sport' || view === 'library' || view === 'multi' || view === 'favs' || view === 'settings') return view
  return null
}
```

och i `rail`-listan mellan Guide och Library:

```tsx
    { key: 'sport', label: tt('railSport'), icon: <SportIcons.Ball /> },
```

`runtime/tv/mobile/mobile-tab-bar.tsx`, i `tabForView`:

```ts
  if (view === 'multi' || view === 'settings' || view === 'sport') return 'more'
```

(Skalets `onSelect` gör redan `go(key as TvView)` för okända poster — Sport behöver ingen egen gren.)

- [ ] **Step 6: Kör testerna och hela sviten**

Run: `npx vitest run runtime/sport runtime/tv && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/tv/sport-shell.tsx plugins/live-tv/runtime/sport/tv/sport-shell.test.tsx plugins/live-tv/runtime/sport/__sport-fixture.tsx plugins/live-tv/runtime/tv/tv-shell.tsx plugins/live-tv/runtime/tv/tv-views.tsx plugins/live-tv/runtime/tv/tv-rail.tsx plugins/live-tv/runtime/tv/mobile/mobile-tab-bar.tsx plugins/live-tv/runtime/tv/tv-rail.test.tsx plugins/live-tv/runtime/tv/tv-shell.test.tsx plugins/live-tv/runtime/tv/mobile/mobile-tab-bar.test.tsx
git commit -m "live-tv: Sport i rälsen — För dig (Matchdag/Flöde) och Följer"
```

---

### Task 19: Spelaren — ticker, Matcher-lådan, Välj flera → Multiview

**Files:**
- Create: `runtime/sport/tv/player-sport.tsx`
- Modify: `runtime/tv/tv-player-types.ts` (`PlayerSportProps`, `LiveTvPlayerTvProps.sport?`)
- Modify: `runtime/tv/tv-player-props.ts` (skicka vidare `sport`)
- Modify: `runtime/tv/player-chrome-parts.tsx` (`PlayerControlRow`: Matcher-knappen)
- Modify: `runtime/tv/tv-player-chrome.tsx` (`TvPlayerChromeDesktop`: lådans tillstånd, Bakåt, ticker)
- Modify: `runtime/tv/tv-shell.tsx` (`usePlayerSport`, `openSportMultiview`, `sport` till `buildTvPlayerProps`)
- Test: `runtime/sport/tv/player-sport.test.tsx`

**Interfaces:**
- Consumes: Task 9–13 (`useSportDay`, `localDayKey`, `visibleMatches`, `rankedSources`, `statusAt`, `pickMultiviewKeys`, `useOverrides`, `useSportSettings`, `crestText`, `matchTitle`, `sourceChannel`, `Crest`, `ellipsis`, `overline`), `MultiviewState`/`MultiviewLayout`/`setMultiviewState` (`tv/tv-multiview-store.ts`), `PlayRequest` (`live-tv-shell.tsx`).
- Produces:
  - `interface PlayerSportProps { matches: SportMatch[]; overrides: SportOverrides; view: SportViewMode; onSwitchMatch(m: SportMatch): void; onOpenMultiview(channelKeys: string[]): void; isKnownChannel(key: string): boolean }`; `LiveTvPlayerTvProps.sport?: PlayerSportProps`; `buildTvPlayerProps({ …, sport? })`.
  - `multiviewFor(keys: string[]): MultiviewState` (2 → layout 2, 3 → 3, 4+ → 4, ljud på första)
  - `matchesForPlayer(matches, currentKey, now): { onChannel: SportMatch[]; live: SportMatch[]; later: SportMatch[] }` (bara matcher med källa)
  - `usePlayerSport({ active, model, play, openMultiview }): PlayerSportProps | undefined` — hämtar dagen BARA medan spelaren är öppen (och inte på telefon).
  - `PlayerSportTicker({ sport, channel, nowMs, variant: 'ticker' | 'column', ps })`, `PlayerMatchesDrawer({ sport, channel, nowMs, locale, onClose })`. Testid:n `player-matches` (knappen), `player-sport-ticker` (`data-variant`), `player-matches-drawer`, `pm-row` (`data-picked`), `pm-now`, `pm-pick`, `pm-close`, `pm-open-multiview`.

Handoff (skärmdumpar 11, 12): ticker ovanför kontrollraden i Matchdag-läget, kolumn uppe till höger i Flöde-läget — i fas 1 utan ställning och utan MÅL!-overlay, bara "BAR – PAR · LIVE". Matcher-knappen syns när kanalen sänder en sportmatch just nu. Lådan (520 px på 1280-scenen): PÅ DEN HÄR KANALEN (NU-piller), LIVE PÅ DINA KANALER, SENARE IDAG PÅ DINA KANALER (ingen "Bara resultat" i fas 1); klick byter match; "Välj flera" ger kryssrutor (högst fyra) och "Öppna i Multiview". Telefonens spelarkrom ändras inte i fas 1.

- [ ] **Step 1: Skriv de fallerande testerna** (`runtime/sport/tv/player-sport.test.tsx`)

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey } from '../../live-tv-data'
import type { LiveTvModel } from '../../live-tv-model'
import { TvPlayerChrome } from '../../tv/tv-player-chrome'
import type { LiveTvPlayerTvProps, PlayerSportProps } from '../../tv/tv-player-types'
import { PlayerMatchesDrawer, matchesForPlayer, multiviewFor, usePlayerSport } from './player-sport'
import { HOUR, MIN, fxList, fxMatch, fxSource, stubSportDays } from '../__sport-fixture'

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [fxList])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

const now = Date.now()
const here = fxSource('B')
const onHere = fxMatch({ id: 'here', home: 'FC Barcelona', away: 'Paris SG', start: now - 30 * MIN, stop: now + HOUR, sources: [here] })
const elsewhere = fxMatch({ id: 'else', home: 'Arsenal', away: 'Bayern', start: now - 20 * MIN, stop: now + HOUR, sources: [fxSource('C')] })
const soon = fxMatch({ id: 'soon', home: 'AIK', away: 'Hammarby', start: now + HOUR, sources: [fxSource('A')] })
const ghost = fxMatch({ id: 'ghost', home: 'Örgryte', away: 'GAIS', start: now - 10 * MIN, stop: now + HOUR, sources: [] })
const channelB = { name: 'B', logo: null, group: 'Sport', url: 'http://x/B', tvgId: null }

function sportProps(over: Partial<PlayerSportProps> = {}): PlayerSportProps {
  return { matches: [onHere, elsewhere, soon, ghost], overrides: {}, view: 'matchday', onSwitchMatch: vi.fn(), onOpenMultiview: vi.fn(), isKnownChannel: () => true, ...over }
}
function tv(over: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return { channelNumber: 2, quality: null, favourite: false, bannerHideMs: 0, neighbours: [channelB], pinnedKeys: [], nowFor: () => ({ now: null, next: null, later: null }), nowMs: now, locale: 'en-GB', gateOpen: false, phone: false, fullscreenOnRotate: true, keepAwake: true, onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...over }
}

describe('rena delar', () => {
  it('multiviewFor väljer layout efter antal', () => {
    expect(multiviewFor(['a', 'b'])).toEqual({ layout: 2, tiles: ['a', 'b'], audioIndex: 0 })
    expect(multiviewFor(['a', 'b', 'c'])).toEqual({ layout: 3, tiles: ['a', 'b', 'c'], audioIndex: 0 })
    expect(multiviewFor(['a'])).toEqual({ layout: 2, tiles: ['a', null], audioIndex: 0 })
    expect(multiviewFor(['a', 'b', 'c', 'd', 'e']).tiles).toEqual(['a', 'b', 'c', 'd'])
  })
  it('matchesForPlayer: på kanalen, live annorstädes, senare — bara med källa', () => {
    const lists = matchesForPlayer([onHere, elsewhere, soon, ghost], here.channelKey, now)
    expect(lists.onChannel.map((m) => m.id)).toEqual(['here'])
    expect(lists.live.map((m) => m.id)).toEqual(['else'])
    expect(lists.later.map((m) => m.id)).toEqual(['soon'])
  })
  it('usePlayerSport hämtar ingenting medan spelaren är stängd', async () => {
    const spy = stubSportDays({})
    const model = { nowMs: now, byKey: new Map() } as unknown as LiveTvModel
    const { result } = renderHook(() => usePlayerSport({ active: false, model, play: vi.fn(), openMultiview: vi.fn() }))
    await act(async () => {})
    expect(result.current).toBeUndefined()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('Matcher-lådan', () => {
  it('sektioner med NU, klick byter match', () => {
    const sport = sportProps()
    render(<PlayerMatchesDrawer sport={sport} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} />)
    const drawer = screen.getByTestId('player-matches-drawer')
    expect(drawer).toHaveTextContent('On this channel')
    expect(drawer).toHaveTextContent('Live on your channels')
    expect(drawer).toHaveTextContent('Later today on your channels')
    const rows = within(drawer).getAllByTestId('pm-row')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]!).getByTestId('pm-now')).toHaveTextContent('NOW')
    fireEvent.click(rows[1]!)
    expect(sport.onSwitchMatch).toHaveBeenCalledWith(elsewhere)
  })
  it('Välj flera → högst fyra → Öppna i Multiview med valda källor', () => {
    const sport = sportProps()
    render(<PlayerMatchesDrawer sport={sport} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('pm-pick'))
    const rows = screen.getAllByTestId('pm-row')
    fireEvent.click(rows[0]!)
    fireEvent.click(rows[1]!)
    expect(rows[0]!.getAttribute('data-picked')).toBe('1')
    expect(sport.onSwitchMatch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('pm-open-multiview'))
    expect(sport.onOpenMultiview).toHaveBeenCalledWith([here.channelKey, 'C::http://x/C'])
  })
})

describe('kromet', () => {
  it('Matcher-knappen och tickern syns när kanalen sänder en match; Bakåt stänger lådan, inte spelaren', () => {
    const onClose = vi.fn()
    render(<TvPlayerChrome channel={channelB} tv={tv({ sport: sportProps() })} paused={false} onTogglePause={() => {}} onClose={onClose} />)
    expect(screen.getByTestId('player-sport-ticker').getAttribute('data-variant')).toBe('ticker')
    fireEvent.click(screen.getByTestId('player-matches'))
    expect(screen.getByTestId('player-matches-drawer')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('player-matches-drawer')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })
  it('Flöde-läget ger kolumnen; utan sport ingen knapp', () => {
    const { rerender } = render(<TvPlayerChrome channel={channelB} tv={tv({ sport: sportProps({ view: 'feed' }) })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.getByTestId('player-sport-ticker').getAttribute('data-variant')).toBe('column')
    rerender(<TvPlayerChrome channel={channelB} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.queryByTestId('player-matches')).toBeNull()
    expect(screen.queryByTestId('player-sport-ticker')).toBeNull()
  })
  it('matchen på kanalen avgör: ingen knapp på en kanal utan pågående match', () => {
    render(<TvPlayerChrome channel={{ ...channelB, name: 'Z', url: 'http://x/Z' }} tv={tv({ sport: sportProps() })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.queryByTestId('player-matches')).toBeNull()
    expect(channelKey(channelB)).toBe(here.channelKey)
  })
})
```

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/sport/tv/player-sport.test.tsx`
Expected: FAIL — `Failed to resolve import "./player-sport"`.

- [ ] **Step 3: Typerna och props-byggaren**

`runtime/tv/tv-player-types.ts`, överst:

```ts
import type { SportMatch } from '../sport/sport-model'
import type { SportOverrides, SportViewMode } from '../sport/sport-store'

/** Sportläget i spelaren (fas 1): dagens matcher ur EPG:t, inga resultat. */
export interface PlayerSportProps {
  /** Dagens matcher utan repriser, sorterade på start. */
  matches: SportMatch[]
  overrides: SportOverrides
  /** Visa som: Matchdag = ticker, Flöde = kolumn. */
  view: SportViewMode
  /** Byt till matchens bästa källa; spelaren står kvar öppen. */
  onSwitchMatch(match: SportMatch): void
  /** Öppna kanalerna i Multiview (stänger spelaren). */
  onOpenMultiview(channelKeys: string[]): void
  /** Finns kanalen i den aktiva spellistan? Multiview kan bara visa sådana. */
  isKnownChannel(key: string): boolean
}
```

och sist i `LiveTvPlayerTvProps`:

```ts
  /** Saknas = ingen sport i spelaren (telefon, stängd spelare, äldre app). */
  sport?: PlayerSportProps
```

`runtime/tv/tv-player-props.ts`: lägg `sport?: PlayerSportProps` sist i `args`-typen (importera typen från `./tv-player-types`) och `sport: args.sport,` sist i returobjektet.

- [ ] **Step 4: Spelarens sportdelar** (`runtime/sport/tv/player-sport.tsx`)

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../../live-tv-data'
import type { LiveTvModel } from '../../live-tv-model'
import type { PlayRequest } from '../../live-tv-shell'
import { formatClock } from '../../live-tv-ui'
import type { MultiviewLayout, MultiviewState } from '../../tv/tv-multiview-store'
import type { PlayerSportProps } from '../../tv/tv-player-types'
import { useTvText } from '../../tv/tv-strings'
import { TV, dp, station } from '../../tv/tv-ui'
import { crestText, matchTitle, sourceChannel, type SportMatch } from '../sport-model'
import { localDayKey, useSportDay } from '../sport-epg'
import { pickMultiviewKeys, rankedSources, statusAt, visibleMatches } from '../sport-day-model'
import { useOverrides, useSportSettings } from '../sport-store'
import { Crest, ellipsis, overline } from './sport-parts'

const MAX_PICK = 4

export function multiviewFor(keys: string[]): MultiviewState {
  const picked = keys.slice(0, MAX_PICK)
  const layout: MultiviewLayout = picked.length <= 2 ? 2 : picked.length === 3 ? 3 : 4
  return { layout, tiles: Array.from({ length: layout }, (_, i) => picked[i] ?? null), audioIndex: 0 }
}

export function matchesForPlayer(matches: SportMatch[], currentKey: string, now: number): { onChannel: SportMatch[]; live: SportMatch[]; later: SportMatch[] } {
  const withSource = matches.filter((m) => m.sources.length > 0)
  const onChannel = withSource.filter((m) => statusAt(m, now) === 'live' && m.sources.some((s) => s.channelKey === currentKey))
  return {
    onChannel,
    live: withSource.filter((m) => statusAt(m, now) === 'live' && !onChannel.includes(m)),
    later: withSource.filter((m) => statusAt(m, now) === 'upcoming'),
  }
}

/** Dagens matcher till spelaren — ett lokalt anrop, och bara medan spelaren är öppen. */
export function usePlayerSport(args: { active: boolean; model: LiveTvModel; play: (request: PlayRequest) => void; openMultiview: (keys: string[]) => void }): PlayerSportProps | undefined {
  const settings = useSportSettings()
  const overrides = useOverrides()
  const { active, model, play, openMultiview } = args
  const { data } = useSportDay(active ? localDayKey(model.nowMs) : null, model.nowMs)
  return useMemo(() => {
    if (!active || !data) return undefined
    return {
      matches: visibleMatches(data, 'all'),
      overrides,
      view: settings.view,
      onSwitchMatch: (m) => {
        const best = rankedSources(m, overrides)[0]
        if (best) play({ channel: sourceChannel(best) })
      },
      onOpenMultiview: openMultiview,
      isKnownChannel: (key) => model.byKey.has(key),
    }
  }, [active, data, overrides, settings.view, play, openMultiview, model.byKey])
}

const shortLabel = (m: SportMatch) => (m.home && m.away ? `${crestText(m.home)} – ${crestText(m.away)}` : m.event ?? m.league)

export function PlayerSportTicker({ sport, channel, nowMs, variant, ps }: { sport: PlayerSportProps; channel: M3uChannel; nowMs: number; variant: 'ticker' | 'column'; ps: (n: number) => number }) {
  const { tt } = useTvText()
  const lists = matchesForPlayer(sport.matches, channelKey(channel), nowMs)
  const items = [...lists.onChannel, ...lists.live].slice(0, variant === 'ticker' ? 6 : 5)
  if (items.length === 0) return null
  if (variant === 'column') {
    return (
      <div data-testid="player-sport-ticker" data-variant="column" style={{ position: 'absolute', top: ps(96), right: ps(20), width: ps(300), display: 'flex', flexDirection: 'column', gap: ps(6), pointerEvents: 'none', zIndex: 31 }}>
        {items.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: ps(8), padding: `${ps(8)}px ${ps(12)}px`, borderRadius: ps(10), background: 'rgba(20,21,25,0.86)', border: `1px solid ${TV.lineCard}`, fontSize: ps(14), fontWeight: 600 }}>
            <span style={{ ...ellipsis, flex: 1 }}>{shortLabel(m)}</span>
            <span style={{ color: TV.live, fontSize: ps(12) }}>{tt('live')}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div data-testid="player-sport-ticker" data-variant="ticker" style={{ display: 'flex', alignItems: 'center', gap: ps(8), marginBottom: ps(8), overflow: 'hidden' }}>
      <span style={{ fontSize: ps(11), fontWeight: 700, letterSpacing: '0.14em', color: TV.dim }}>{tt('live')}</span>
      {items.map((m) => (
        <span key={m.id} style={{ padding: `${ps(4)}px ${ps(10)}px`, borderRadius: ps(8), border: `1px solid ${TV.lineCard}`, background: 'rgba(0,0,0,0.5)', fontSize: ps(13), fontWeight: 600, whiteSpace: 'nowrap' }}>{shortLabel(m)}</span>
      ))}
    </div>
  )
}

export function PlayerMatchesDrawer({ sport, channel, nowMs, locale, onClose }: { sport: PlayerSportProps; channel: M3uChannel; nowMs: number; locale: string; onClose: () => void }) {
  const { tt } = useTvText()
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
  }, [])
  const lists = matchesForPlayer(sport.matches, channelKey(channel), nowMs)
  const all = [...lists.onChannel, ...lists.live, ...lists.later]
  const toggle = (m: SportMatch) => setPicked((prev) => (prev.includes(m.id) ? prev.filter((id) => id !== m.id) : prev.length >= MAX_PICK ? prev : [...prev, m.id]))
  let rowIndex = 0
  const row = (m: SportMatch, now: boolean) => {
    const index = rowIndex++
    const best = rankedSources(m, sport.overrides)[0]
    const on = picked.includes(m.id)
    const meta = [m.league, statusAt(m, nowMs) === 'live' ? tt('live') : formatClock(m.start, locale), best?.name].filter(Boolean).join(' · ')
    return (
      <div key={m.id} data-testid="pm-row" data-picked={on ? '1' : '0'} {...station(() => (picking ? toggle(m) : sport.onSwitchMatch(m)), undefined, index === 0 ? { 'data-init': '' } : undefined)} style={{ display: 'flex', alignItems: 'center', gap: dp(14), padding: `${dp(12)}px ${dp(14)}px`, borderRadius: dp(12), cursor: 'pointer', background: now ? TV.accMix(16) : TV.s08, border: `1px solid ${now ? TV.accMix(60) : TV.line}` }}>
        {picking ? <span style={{ width: dp(30), height: dp(30), borderRadius: dp(8), border: `2px solid ${on ? TV.acc : TV.lineStrong}`, background: on ? TV.acc : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span> : null}
        <span style={{ display: 'flex', flexShrink: 0 }}>
          {m.home ? <Crest name={m.home} colorKey={m.homeKey ?? m.home} size={dp(44)} /> : null}
          {m.away ? <span style={{ marginLeft: -dp(12) }}><Crest name={m.away} colorKey={m.awayKey ?? m.away} size={dp(44)} /></span> : null}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
          <div style={{ fontSize: dp(15), color: TV.muted, ...ellipsis }}>{meta}</div>
        </div>
        {now ? <span data-testid="pm-now" style={{ padding: `${dp(3)}px ${dp(10)}px`, borderRadius: 999, border: `1px solid ${TV.accMix(80)}`, color: TV.accText, fontSize: dp(13), fontWeight: 700 }}>{tt('sportNowPill')}</span> : null}
      </div>
    )
  }
  const section = (title: string, list: SportMatch[], now: boolean) => (list.length === 0 ? null : (
    <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
      <span style={overline}>{title}</span>
      {list.map((m) => row(m, now))}
    </div>
  ))
  return (
    <div ref={rootRef} data-testid="player-matches-drawer" data-panel-root="" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `min(${dp(780)}px, 100%)`, zIndex: 40, background: '#141519', borderLeft: '1px solid rgba(255,255,255,0.16)', padding: dp(28), boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: dp(14), color: TV.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
        <span style={{ fontSize: dp(30), fontWeight: 600 }}>{tt('sportMatches')}</span>
        <div data-testid="pm-pick" {...station(() => { setPicking((v) => !v); setPicked([]) })} aria-pressed={picking ? 'true' : 'false'} style={{ marginLeft: 'auto', height: dp(48), minHeight: dp(48), padding: `0 ${dp(16)}px`, borderRadius: dp(12), border: `1px solid ${TV.lineCard}`, background: picking ? TV.s16 : TV.s08, display: 'inline-flex', alignItems: 'center', fontSize: dp(16), fontWeight: 600, cursor: 'pointer' }}>{tt('sportPickSeveral')}</div>
        <div data-testid="pm-close" {...station(onClose)} aria-label={tt('sportClose')} style={{ width: dp(48), height: dp(48), minHeight: dp(48), borderRadius: dp(12), border: `1px solid ${TV.lineCard}`, background: TV.s08, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</div>
      </div>
      <span style={{ fontSize: dp(16), color: TV.muted }}>{tt('sportMatchesHint')}</span>
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: dp(16) }}>
        {section(tt('sportOnThisChannel'), lists.onChannel, true)}
        {section(tt('sportLiveOnChannels'), lists.live, false)}
        {section(tt('sportLaterOnChannels'), lists.later, false)}
      </div>
      {picking ? (
        <div
          data-testid="pm-open-multiview"
          {...station(() => {
            const chosen = all.filter((m) => picked.includes(m.id))
            if (chosen.length > 0) sport.onOpenMultiview(pickMultiviewKeys(chosen, sport.overrides, sport.isKnownChannel))
          })}
          aria-disabled={picked.length === 0 ? 'true' : 'false'}
          style={{ height: dp(60), minHeight: dp(60), borderRadius: dp(14), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: dp(20), fontWeight: 600, cursor: 'pointer', opacity: picked.length === 0 ? 0.5 : 1 }}
        >
          {tt('sportOpenMultiview', { n: picked.length })}
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Kromet** (`runtime/tv/player-chrome-parts.tsx` och `runtime/tv/tv-player-chrome.tsx`)

`PlayerControlRow` får tre valfria props sist i typen:

```ts
  /** Kanalen sänder en sportmatch just nu (fas 1-sportläget). */
  sportAvailable?: boolean
  matchesOpen?: boolean
  onToggleMatches?: () => void
```

(lägg dem i destruktureringen) och en knapp direkt efter Guide-knappen:

```tsx
        {sportAvailable && onToggleMatches ? (
          <div data-testid="player-matches" {...station(onToggleMatches, undefined, { 'aria-label': tt('sportMatches'), 'aria-pressed': matchesOpen ? 'true' : 'false', 'data-guide-row': '' })} style={{ ...ctlStyle(ps, matchesOpen), padding: `0 ${ps(14)}px`, fontSize: ps(14) }}>
            {tt('sportMatches')}
          </div>
        ) : null}
```

I `TvPlayerChromeDesktop` (`tv-player-chrome.tsx`), importera `import { PlayerMatchesDrawer, PlayerSportTicker, matchesForPlayer } from '../sport/tv/player-sport'` och:

1. Tillstånd efter `guideOpen`:

```tsx
  const [matchesOpen, setMatchesOpen] = useState(false)
  const sportHere = tv.sport ? matchesForPlayer(tv.sport.matches, channelKey(channel), tv.nowMs).onChannel.length > 0 : false
```

2. `reveal`: villkoret blir `if (hideMs > 0 && !guideOpen && !matchesOpen && !menu && !hoverRef.current)` och `matchesOpen` läggs i beroendelistan.

3. `layerRef`: `useEffect(() => { layerRef.current = { menuOpen: menu !== null, guideOpen: guideOpen || matchesOpen, gateOpen: tv.gateOpen } })` — fokusslingan står tillbaka medan lådan är öppen, precis som för EPG-överlägget.

4. Stäng-funktion efter `closeGuide`:

```tsx
  const closeMatches = useCallback(() => {
    setMatchesOpen(false)
    window.setTimeout(() => initRef.current?.focus({ preventScroll: true }), 0)
  }, [])
```

5. I tangentlyssnaren, i Escape/Backspace-grenen FÖRE `if (guideOpen)`:

```tsx
        if (matchesOpen) {
          closeMatches()
          return
        }
```

och lägg `matchesOpen, closeMatches` i effektens beroendelista.

6. I bannern, före `<PlayerControlRow …>`:

```tsx
        {tv.sport && sportHere && tv.sport.view === 'matchday' ? <PlayerSportTicker sport={tv.sport} channel={channel} nowMs={tv.nowMs} variant="ticker" ps={ps} /> : null}
```

och på `<PlayerControlRow …>`: `sportAvailable={sportHere} matchesOpen={matchesOpen} onToggleMatches={() => { if (matchesOpen) closeMatches(); else { setMatchesOpen(true); setVisible(true); clearTimer() } }}`.

7. Efter `<PlayerScheduleOverlay …/>`:

```tsx
      {tv.sport && sportHere && tv.sport.view === 'feed' && visible ? <PlayerSportTicker sport={tv.sport} channel={channel} nowMs={tv.nowMs} variant="column" ps={ps} /> : null}
      {matchesOpen && tv.sport ? (
        <div style={{ pointerEvents: 'auto' }}>
          <PlayerMatchesDrawer sport={tv.sport} channel={channel} nowMs={tv.nowMs} locale={tv.locale} onClose={closeMatches} />
        </div>
      ) : null}
```

- [ ] **Step 6: Skalet kopplar in sporten** (`runtime/tv/tv-shell.tsx`)

Importera `import { multiviewFor, usePlayerSport } from '../sport/tv/player-sport'` och lägg, direkt före `const View = TV_VIEWS[view]`:

```tsx
  // Matcher-lådans "Öppna i Multiview": rutorna fylls med de valda kanalerna
  // och spelaren stängs. Telefonen har ingen sportdel i spelaren (fas 1).
  const openSportMultiview = useCallback((keys: string[]) => {
    setMultiviewState(multiviewFor(keys))
    setActive(null)
    go('multi')
  }, [go])
  const playerSport = usePlayerSport({ active: active !== null && !phone, model, play, openMultiview: openSportMultiview })
```

och `sport: playerSport,` sist i argumentet till `buildTvPlayerProps({ … })`.

- [ ] **Step 7: Kör testerna och hela pluginsviten**

Run: `npx vitest run runtime/sport/tv/player-sport.test.tsx runtime/tv && npx tsc --noEmit -p .`
Expected: PASS (inklusive de befintliga kromtesterna — utan `tv.sport` ändras ingenting).

- [ ] **Step 8: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/tv/player-sport.tsx plugins/live-tv/runtime/sport/tv/player-sport.test.tsx plugins/live-tv/runtime/tv/tv-player-types.ts plugins/live-tv/runtime/tv/tv-player-props.ts plugins/live-tv/runtime/tv/player-chrome-parts.tsx plugins/live-tv/runtime/tv/tv-player-chrome.tsx plugins/live-tv/runtime/tv/tv-shell.tsx
git commit -m "live-tv sport: Matcher-lådan och ticker i spelaren, Välj flera till Multiview"
```

---

### Task 20: Telefonen

**Files:**
- Create: `runtime/sport/mobile/sport-phone.tsx`
- Modify: `runtime/sport/tv/sport-shell.tsx` (`TvSport` grenar på `phone`)
- Test: `runtime/sport/mobile/sport-phone.test.tsx`

**Interfaces:**
- Consumes: Task 9–13 (`useSportCtx`, `timeLine`, `sourceLine`, `followNextLine`, `alertLabel`, `visibleMatches`, `splitSections`, `sportCounts`, `rankedSources`, `followState`, `followCandidates`, `nextMatchFor`, `toggleFollow`, `isFollowing`, `setSportSettings`), `MobileHeader`, `MobileSegment`, `MobileChips`, `MobileSheet`, `MT`, `ellipsis` (`tv/mobile/*`), `station`.
- Produces: `SportPhone(props: TvViewProps)`. Testid:n `sport-phone`, `sport-phone-tabs`, `sport-phone-days`, `sport-phone-sports`, `sport-phone-row`, `sport-phone-sheet`, `sport-phone-follow`, `sport-phone-add`, `sport-phone-follow-sheet`, `sport-phone-alert`.

Telefonen följer Live TV:s telefonmönster: eget träd (importerar ingenting ur `sport/tv/*` — projektregeln mot importcykler mellan TV- och telefonträden), äkta px via `MT`, inget fjärrkontrollsordförråd. För dig visas som listor (Live nu / Senare / Avslutade); ett tryck öppnar ett bottenark (`MobileSheet`) med Titta på varje källa, Följ hemma/borta/liga och Påminn mig. Följer: lista med nästa match, avsparksnotis och "Lägg till" som ett ark.

- [ ] **Step 1: Skriv de fallerande testerna**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { localDayKey } from '../sport-epg'
import { getFollows, getSportSettings } from '../sport-store'
import { HOUR, MIN, fxMatch, mountSport } from '../__sport-fixture'
import { mountPhone } from '../../tv/mobile/__phone-mount'

vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

const now = Date.now()
const today = localDayKey(now)
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + 2 * HOUR })
const REMOTE_WORDS = /\bOK\b|håll OK|hold OK|◂|▸/

describe('Sport på telefon', () => {
  it('listor per status utan fjärrkontrollsord; tryck öppnar arket och Titta spelar', async () => {
    const { box } = mountSport({}, { phone: true, days: { [today]: [live, later] } })
    const rows = await screen.findAllByTestId('sport-phone-row')
    expect(rows).toHaveLength(2)
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
    fireEvent.click(rows[0]!)
    const sheet = await screen.findByTestId('sport-phone-sheet')
    fireEvent.click(within(sheet).getByText('Watch on TV4 Fotboll FHD SE · FHD'))
    expect(await screen.findByTestId('player')).toHaveTextContent('TV4 Fotboll FHD SE')
  })
  it('arket följer hemmalaget', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] } })
    fireEvent.click(await screen.findByTestId('sport-phone-row'))
    fireEvent.click(within(await screen.findByTestId('sport-phone-sheet')).getByText('Follow AIK'))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }])
  })
  it('Följer: nästa match, avsparksnotis och Lägg till', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] }, follows: [{ sport: 'football', kind: 'team', key: 'hammarby', name: 'Hammarby' }] })
    fireEvent.click(await screen.findByText('Following'))
    await waitFor(() => expect(screen.getByTestId('sport-phone-follow')).toHaveTextContent(/Hammarby.*Today \d\d:\d\d · vs AIK/))
    fireEvent.click(within(screen.getByTestId('sport-phone-alert')).getByText('Off'))
    expect(getSportSettings().alert).toBe('off')
    fireEvent.click(screen.getByTestId('sport-phone-add'))
    const sheet = await screen.findByTestId('sport-phone-follow-sheet')
    fireEvent.click(within(sheet).getByText(/^AIK · Football$/))
    await waitFor(() => expect(getFollows().map((f) => f.key)).toContain('aik'))
  })
  it('Mer-arket har Sport', async () => {
    const { onNavigate } = mountPhone({ view: 'hub' })
    fireEvent.click(screen.getByTestId('tab-more'))
    fireEvent.click(within(await screen.findByRole('dialog')).getByText('Sport'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'sport' } })
  })
})
```

- [ ] **Step 2: Kör och se dem falla**

Run: `npx vitest run runtime/sport/mobile/sport-phone.test.tsx`
Expected: FAIL — `Failed to resolve import "../sport/mobile/sport-phone"` eller att `sport-phone-row` saknas (TvSport ritar TV-trädet).

- [ ] **Step 3: Implementera** (`runtime/sport/mobile/sport-phone.tsx`)

```tsx
'use client'

import { useCallback, useState } from 'react'
import type { TvViewProps } from '../../tv/tv-shell'
import { station } from '../../tv/tv-ui'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { MobileHeader } from '../../tv/mobile/mobile-header'
import { MobileSegment } from '../../tv/mobile/mobile-segment'
import { MobileChips } from '../../tv/mobile/mobile-chips'
import { MobileSheet } from '../../tv/mobile/mobile-sheet'
import { SPORT_KINDS, matchTitle, type SportFilter, type SportMatch } from '../sport-model'
import { localDayKey, shiftDay, useSportDay } from '../sport-epg'
import { followCandidates, followState, nextMatchFor, rankedSources, sportCounts, splitSections, statusAt, visibleMatches } from '../sport-day-model'
import { isFollowing, setSportSettings, toggleFollow, type KickoffAlert } from '../sport-store'
import { alertLabel, followNextLine, sourceLine, timeLine, useSportCtx, type SportCtx } from '../sport-ctx'

type DayOffset = -1 | 0 | 1

export function SportPhone({ model, nav }: TvViewProps) {
  const [tab, setTab] = useState<'foryou' | 'follows'>('foryou')
  const [offset, setOffset] = useState<DayOffset>(0)
  const [filter, setFilter] = useState<SportFilter>('all')
  const [sheet, setSheet] = useState<SportMatch | null>(null)
  const [adding, setAdding] = useState(false)
  const openMatch = useCallback((m: SportMatch) => setSheet(m), [])
  const openFollowPicker = useCallback(() => setAdding(true), [])
  const ctx = useSportCtx({ model, nav, openMatch, openFollowPicker })
  const { tt } = ctx
  const today = localDayKey(model.nowMs)
  const selected = useSportDay(shiftDay(today, offset), model.nowMs)
  const wantsFollow = tab === 'follows' || adding
  const todayDay = useSportDay(wantsFollow ? today : null, model.nowMs)
  const tomorrowDay = useSportDay(wantsFollow ? shiftDay(today, 1) : null, model.nowMs)
  const counts = sportCounts(selected.data)
  const { live, later, finished } = splitSections(visibleMatches(selected.data, filter), ctx.now)
  const dayLabel = (o: DayOffset) => (o === -1 ? tt('sportYesterday') : o === 0 ? tt('sportToday') : tt('sportTomorrow'))

  const sheetItems = (m: SportMatch) => {
    const fs = followState(m, ctx.follows)
    const follow = (kind: 'team' | 'league', key: string | null, name: string | null, on: boolean) =>
      key && name ? [{ key: `follow-${kind}-${key}`, label: on ? tt('sportFollowingName', { name }) : tt('sportFollowName', { name }), run: () => toggleFollow({ sport: m.kind, kind, key, name }) }] : []
    const ranked = rankedSources(m, ctx.overrides)
    return [
      ...ranked.slice(0, 4).map((s, i) => ({ key: `watch-${i}`, label: `${tt('sportWatchOn', { channel: s.name })}${s.quality ? ` · ${s.quality}` : ''}`, run: () => ctx.watch(m, s) })),
      ...follow('team', m.homeKey, m.home, fs.home),
      ...follow('team', m.awayKey, m.away, fs.away),
      ...follow('league', m.leagueKey || null, m.league || null, fs.league),
      ...(ranked.length > 0 && statusAt(m, ctx.now) !== 'finished' ? [{ key: 'remind', label: ctx.isReminded(m) ? tt('sportReminded') : tt('sportRemindMe'), run: () => ctx.toggleRemind(m) }] : []),
    ]
  }

  const notice = selected.state === 'missing' ? tt('sportNeedsUpdate') : selected.state === 'error' ? tt('sportError') : selected.state === 'loading' ? tt('sportLoading') : live.length + later.length + finished.length === 0 ? tt('sportEmptyDay') : null

  return (
    <div data-testid="sport-phone" data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={tt('sportTitle')} /></div>
      <MobileSegment testId="sport-phone-tabs" options={[{ key: 'foryou', label: tt('sportTabForYou') }, { key: 'follows', label: tt('sportTabFollows') }]} value={tab} onChange={setTab} />
      {tab === 'foryou' ? (
        <>
          <MobileChips<DayOffset> testId="sport-phone-days" items={([-1, 0, 1] as const).map((o) => ({ key: o, label: dayLabel(o), id: `day-${o}` }))} value={offset} onChange={setOffset} emphasisKey={0} />
          <MobileChips<SportFilter> testId="sport-phone-sports" items={[{ key: 'all', label: tt('sportAll'), id: 'all' }, ...SPORT_KINDS.filter((k) => counts[k] > 0).map((k) => ({ key: k as SportFilter, label: `${ctx.kindLabel(k)} ${counts[k]}`, id: k }))]} value={filter} onChange={setFilter} />
          {notice ? <div style={{ padding: '24px 4px', fontSize: 15, color: MT.muted }}>{notice}</div> : null}
          <PhoneSection ctx={ctx} title={tt('sportLiveNow')} matches={live} />
          <PhoneSection ctx={ctx} title={tt('sportLater')} matches={later} />
          <PhoneSection ctx={ctx} title={tt('sportFinished')} matches={finished} />
        </>
      ) : (
        <PhoneFollows ctx={ctx} days={[todayDay.data, tomorrowDay.data]} />
      )}
      {sheet ? <MobileSheet testId="sport-phone-sheet" title={matchTitle(sheet)} subtitle={[sheet.league || ctx.kindLabel(sheet.kind), timeLine(sheet, ctx)].join(' · ')} items={sheetItems(sheet)} onClose={() => setSheet(null)} pushLayer={nav.pushLayer} /> : null}
      {adding ? (
        <MobileSheet
          testId="sport-phone-follow-sheet"
          title={tt('sportFollowAdd')}
          items={followCandidates([todayDay.data, tomorrowDay.data]).slice(0, 60).map((c) => ({
            key: `${c.kind}:${c.key}`,
            label: `${isFollowing(ctx.follows, c) ? '★ ' : ''}${c.name} · ${ctx.kindLabel(c.sport)}`,
            run: () => toggleFollow({ sport: c.sport, kind: c.kind, key: c.key, name: c.name }),
          }))}
          onClose={() => setAdding(false)}
          pushLayer={nav.pushLayer}
        />
      ) : null}
    </div>
  )
}

function PhoneSection({ ctx, title, matches }: { ctx: SportCtx; title: string; matches: SportMatch[] }) {
  if (matches.length === 0) return null
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
      <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
      {matches.map((m) => {
        const st = statusAt(m, ctx.now)
        return (
          <div key={m.id} data-testid="sport-phone-row" {...station(() => ctx.openMatch(m))} style={{ minHeight: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: MT.s07, border: `1px solid ${MT.line08}`, cursor: 'pointer' }}>
            <span style={{ width: 54, flexShrink: 0, fontSize: 13, fontWeight: 700, color: st === 'live' ? MT.live : MT.text }}>{st === 'live' ? ctx.tt('live') : st === 'finished' ? ctx.tt('sportEnded') : timeLine(m, ctx)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
              <div style={{ fontSize: 12.5, color: MT.muted, ...ellipsis }}>{[m.league || ctx.kindLabel(m.kind), sourceLine(m, ctx)].filter(Boolean).join(' · ')}</div>
            </div>
            {followState(m, ctx.follows).any ? <span style={{ color: '#fbbf24' }}>★</span> : null}
          </div>
        )
      })}
    </section>
  )
}

function PhoneFollows({ ctx, days }: { ctx: SportCtx; days: Parameters<typeof nextMatchFor>[1] }) {
  const alertOptions: { key: KickoffAlert; label: string }[] = [
    { key: 'off', label: ctx.tt('sportAlertOff') },
    { key: '15', label: ctx.tt('sportAlert15') },
    { key: 'kickoff', label: ctx.tt('sportAlertKickoff') },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div data-testid="sport-phone-add" {...station(ctx.openFollowPicker)} style={{ minHeight: 48, borderRadius: 14, background: MT.acc, color: MT.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{ctx.tt('sportFollowAdd')}</div>
      <div data-testid="sport-phone-alert" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, color: MT.muted }}>{`${ctx.tt('sportKickoffAlert')} · ${alertLabel(ctx)}`}</span>
        <MobileSegment options={alertOptions} value={ctx.settings.alert} onChange={(alert) => setSportSettings({ alert })} />
        <span style={{ fontSize: 12.5, color: MT.dim }}>{ctx.tt('sportAlertOnlyRunning')}</span>
      </div>
      {ctx.follows.length === 0 ? <div style={{ fontSize: 15, color: MT.muted, padding: '16px 4px' }}>{ctx.tt('sportFollowEmpty')}</div> : null}
      {ctx.follows.map((f) => {
        const next = nextMatchFor(f, days, ctx.now)
        return (
          <div key={`${f.kind}:${f.key}`} data-testid="sport-phone-follow" {...station(() => { if (next) ctx.openMatch(next) })} style={{ minHeight: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: MT.s07, cursor: 'pointer' }}>
            <span style={{ color: '#fbbf24' }}>★</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{f.name}</div>
              <div style={{ fontSize: 12.5, color: MT.muted, ...ellipsis }}>{followNextLine(ctx, f, next)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

I `runtime/sport/tv/sport-shell.tsx`: importera `import { SportPhone } from '../mobile/sport-phone'` och byt `TvSport` mot den tidiga grenen (samma mönster som `TvFavourites` — två separata träd, inga krokar före grenen):

```tsx
export function TvSport(props: TvViewProps) {
  return props.phone ? <SportPhone {...props} /> : <SportTv {...props} />
}
```

- [ ] **Step 4: Kör testerna och telefonsviten**

Run: `npx vitest run runtime/sport/mobile runtime/tv/mobile runtime/tv/tv-shell-phone.test.tsx && npx tsc --noEmit -p .`
Expected: PASS. (`MobileSheet` stänger arket efter en åtgärd — följarket öppnas om för nästa val; det räcker i fas 1.)

- [ ] **Step 5: Commit**

```bash
cd PLG
git add plugins/live-tv/runtime/sport/mobile/sport-phone.tsx plugins/live-tv/runtime/sport/mobile/sport-phone.test.tsx plugins/live-tv/runtime/sport/tv/sport-shell.tsx
git commit -m "live-tv sport: telefonvyn med ark för match och följ"
```

---

### Task 21: Bygg runtimen, hela sviterna och manuell kontroll

**Files:**
- Modify: `PLG/plugins/live-tv/dist/runtime.js` (byggd, `git add -f`)
- Inga versionsändringar: `plugin.json`, `package.json`, `marketplace.json` och `minAppVersion` rörs inte — version och appgolv sätts vid släpp, som Jerry beslutar (sportläget kräver appen med `/sport/day`).

**Interfaces:**
- Consumes: allt.
- Produces: en ombyggd `dist/runtime.js` på `feature/sportlage` och en rapport med verifieringsutfallet.

- [ ] **Step 1: Hela Rust-sviten för det som rörts**

Run: `cd APP/src-tauri && cargo test --lib live_tv_ && cargo test --lib xmltv && cargo build`
Expected: PASS.

- [ ] **Step 2: Hela pluginsviten och typkontrollen**

Run: `cd PLG/plugins/live-tv && npx vitest run && npx tsc --noEmit -p .`
Expected: PASS; antalet tester = baslinjen från Task 0 + de nya; inga nya typfel.

- [ ] **Step 3: Bygg runtimen från APP-worktreet**

Run: `cd APP && node scripts/build-plugin-runtime.mjs "/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/sportlage/plugins/live-tv"`
Verifiera: `grep -c "/api/live-tv/sport/day" PLG/plugins/live-tv/dist/runtime.js` ≥ 1 och `grep -c "sport_follows_v1" PLG/plugins/live-tv/dist/runtime.js` ≥ 1.

- [ ] **Step 4: Manuell kontroll mot den körande appen (läsanrop, inget POST)**

Starta APP-bygget som vanligt för utveckling och kontrollera FÖRST vem som äger porten: `lsof -iTCP:3011 -sTCP:LISTEN` — PID:en ska vara APP-worktreets process, inte release-appen. Sedan:

- `curl -s "http://127.0.0.1:3011/api/live-tv/sport/day?listId=global&day=$(date +%F)&tzOffset=120" | python3 -m json.tool | head -80` — dagens matcher ur Jerrys flöde: Allsvenskan/SHL/PL med `sources` > 1 där samma match går på flera kanaler, `counts` per sport, inga studioprogram.
- Playwright mot `http://127.0.0.1:3011/?tvmode=1`: Live TV → rälsens Sport. Kontrollera mot skärmdumparna 05, 06, 08, 09, 12: hero utan ställning, tidslinjen med ligarader och nu-linje, Flöde, Följer med avsparksnotis, matchcentret med källor och BÄST, Välj annan kanal; i spelaren Matcher-knappen och lådan, Välj flera → Multiview.
- Samma på skrivbord (utan `?tvmode=1`) och i ett fönster ≤ 639 px (telefonträdet; Sport ligger i Mer-arket).
- Notera i rapporten allt som avviker från handoffen, med skärmdump.

- [ ] **Step 5: Commit (bara runtimen)**

```bash
cd PLG
git add -f plugins/live-tv/dist/runtime.js
git commit -m "live-tv: bygg om dist med sportläge fas 1"
```

Ingen push och ingen versionsbump — släpp bara på Jerrys klartecken.

---

## Självgranskning (gjord när planen skrevs)

**Spec-täckning (fas 1-kolumnen):** parsern läser category/sub-title/live (Task 1); detektering i Rust vid inläsning i specens ordning — eventkanaler (6), titelmönster inkl. TV4-form, `at`, `vs.` (4), liga → sport och kanalnamn (3), brus (3), desc omgång/arena/repris (4); normalisering + exonymer (2); 30 h bara för sport (5); gruppering "N källor" med repris/live isär (7); `/sport/day` (8); modell, klient, lagring (9–10); huvud med sammanfattning, dagbrickor, sportknappar, Alla sporter med antal (18); hero, Nästa på dina kanaler + klocka, tidslinje, Live nu/Senare/Avslutade utan ställning (14); Flöde: Dina lag, Just nu, Kvällsplan, Din kväll med krock < 100 min (15); Följer + avsparksnotis via reminders (12, 16); matchcenter med följ, Var kan jag se den (kvalitet, BÄST, fördröjning "—"), Välj annan kanal som vinner överallt (11, 17); spelarens ticker/kolumn och Matcher-lådan med Välj flera → Multiview (19); TV först, skrivbord samma träd, telefon i Mer-arket (18, 20). Medvetet utanför: `/sport/link`, `/sport/fetch`, nyckelkort, Resultat-fliken, kvothanterare, ställning, märken, MÅL!, latens, höjdpunkter, Sport ikväll, "Sänds på X" (fas 2/3 eller borttaget).

**Platshållare:** inga TBD/TODO; varje kodsteg har koden.

**Typkonsistens:** `SportInfo`/`SportMatch`/`MatchSource` (Rust, camelCase) ↔ `SportMatch`/`MatchSource` (TS) har samma fält; `teamKeysMatch` ↔ `keys_match` har samma regel och samma testfall; `SportCtx`-fälten används med samma namn i Task 13–20; `PlayerSportProps` definieras i Task 19 och används bara där.
