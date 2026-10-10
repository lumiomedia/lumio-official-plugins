# Live TV: Sportläge — design

Datum: 2026-10-10. Gren: `feature/sportlage` (plugin live-tv, grenad från
`feature/live-tv-vod-hem`) + motsvarande i appen (EPG-lagret i Rust).
Underlag: handoffen `~/Downloads/design_handoff_live_tv_tv_mode/` (README,
`Live TV prototyp v2.dc.html`, skärmdumpar 05–09, 11, 12) och
`Moviefinder/.worktrees/live-tv-vod-hem/.superpowers/sdd/sportlage-research.md`.

## Mål

Live TV får fliken **Sport** i rälsen. Den ska vara så enkel som möjligt för
användaren. Utan inställningar visar den alla matcher som finns i hens
spellistor: vad som går nu, vad som kommer senare, var matchen sänds och i
hur många källor. Allt det kommer ur EPG:n. Klistrar användaren in **en**
gratis nyckel får fliken dessutom ställning, matchminut, tabeller,
matchcenter, MÅL!-overlay och klubbmärken. Vi driver ingen server, och inget
anrop görs som inte behövs.

## Beslut (Jerry 2026-10-10)

1. Rätt handoff är `design_handoff_live_tv_tv_mode`. Sportdelen byggs som
   den är ritad, för både Matchdag och Flöde.
2. **Ingen hosting.** Ingen egen server, worker eller proxy. Alla externa
   anrop går från användarens app med **användarens egen nyckel**.
3. **Extern källa: API-Sports** (api-sports.io). Gratisnivån ger 100 anrop
   per dag och alla endpoints. Betald nivå kostar från 19 USD/mån och ger
   7 500 anrop per dag. Märken hämtas från media-URL:er, som inte räknas mot
   kvoten. Källan ligger bakom ett providergränssnitt men bara API-Sports
   byggs. Ingen TheSportsDB eller ESPN i v1.
4. Sportfliken fungerar **utan nyckel** (fas 1, bara EPG). Med nyckel
   tillkommer resultat. Användaren ombeds aldrig om något annat än den här
   nyckeln.
5. **Kvothanteraren** är den centrala delen. Pollning sker bara när
   sportvyn, matchcentret eller en sportsändning i spelaren är öppen.
   Användaren ser den faktiska uppdateringstakten.
6. Rate limits är en produktregel som går först: inga anrop som går att
   undvika.
7. Plattformar: TV först. Skrivbord och telefon följer Live TV:s
   "everywhere"-modell, alltså samma träd i en skalad scenlåda på skrivbord
   och flikrad med "Mer"-ark på telefon.
8. **Täckning:** Ishockey finns i API-Sports (262 ligor och cuper, alla
   svenska ligor inklusive SHL). Det som återstår att verifiera med en riktig
   nyckel är hur djupa händelser, uppställningar och statistik är.
   **Tennis finns inte i API-Sports.** Tennis, och varje annan sport som
   källan saknar, är bara EPG. Sportknappen visar ändå matcherna ur EPG:n men
   utan ställning eller tabell, och gränssnittet lovar aldrig resultat för
   dem.

## Faser

| Fas | Innehåll | Nätanrop |
|---|---|---|
| **1 – EPG** | Sportdetektering ur Jerrys flöde, matchmodell, gruppering över kanaler ("N källor"), Matchdag och Flöde utan ställning, Följer med avsparksnotis, Var kan jag se den, Matcher-lådan i spelaren, "Igår" (EPG-fönstret bakåt ~30 h för sportprogram) | Inga nya |
| **2 – API-Sports** | Nyckelkort, kvothanterare, ställning, minut och status, tabeller med form, fliken Resultat, "Bara resultat", matchcenter (händelser, statistik, uppställningar), MÅL!-overlay, märken, koppling mellan EPG och fixtur med manuell override | Användarens nyckel, inom budget |
| **3 – Polish** | Probning av fördröjning och kvalitet i strömmen ("BÄST" på riktigt), höjdpunkter ur VOD och catch-up, Multiview-val från Sport, finputs | Bara strömprobning |

## Vyerna: fält → källa

Förkortningar: **E** = EPG/kanalnamn (fas 1). **A** = API-Sports (fas 2,
kräver nyckel och en sport som källan täcker). **L** = lokalt
(inställningar, påminnelser, startvaktens historik). "—" betyder att fältet
döljs.

| Vy / fält | Fas 1 | Fas 2 | Anmärkning |
|---|---|---|---|
| **Huvud**: "Idag · N matcher · N live · N på dina kanaler" | E (live = `ᴸᶦᵛᵉ` + tid) | E+A | Utan nyckel räknas bara matcher i EPG:n |
| Dagbrickor Igår/Idag/Imorgon | E (−30 h…+48 h) | +A (resultat för Igår) | |
| Sportknappar och lådan "Alla sporter" (antal) | E (liga → sport, kanalnamn) | E+A | Knappar visas bara för sporter med matcher den dagen |
| **Hero-tavla**: lag, liga | E | A (kanoniska namn) | |
| Hero: ställning, `31' · pågår`, progress | progress från EPG-tid, status "LIVE" | A | Utan A: inget ställningsfält, bara "LIVE · 19:00–21:00" |
| Hero: arena | E (desc "Från X") | A | |
| Hero: märken | initialcirklar (handoffens) | A (media-URL) | |
| Hero: "Titta på {kanal}", "N källor" | E (grupperingen) | E | |
| Nästa på dina kanaler (+ klocka) | E + L (reminders) | samma | |
| **Matchdag-tidslinje** (ligarader, block, nu-linje) | E (start/stopp ur EPG) | A (avsparkstid, SLUT, målblink) | Ligafärg från egen tabell |
| **Live nu / Senare idag / Avslutade** (kort) | E | A (ställning, minut, SLUT) | Avslutade utan A = EPG-program som slutat, utan ställning |
| Kort: "Bara resultat · {kanal}" | — | A (fixtur utan kopplad kanal) | Visas bara med nyckel |
| Höjdpunkter | — | — | Fas 3 (VOD/catch-up) |
| **Flöde: Dina lag** (avatar, ring, status) | E + L (följda) | A (märke, "LIVE 2–1") | |
| Flöde: Just nu, Kvällsplan, Din kväll (krock < 100 min) | E + L | +A | Kryssrutan = befintlig påminnelse |
| **Resultat** (ligagrupper, Omgång N, rader) | Fliken visar nyckelkortet | A | "Omgång N" finns även i EPG:s desc men fliken kräver A |
| Resultat: Bara live / Mina kanaler (antal), HOPPA TILL | — | A + E | |
| Resultat: **Tabell** (#, Lag, M, P, Form) | — | A (`standings`, form ingår) | |
| **Följer**: sök "Lägg till lag eller turneringar" | E (lag och ligor sedda i EPG senaste/kommande dygn) | A (sök i källan) | Följda lagras neutralt, se Modell |
| Följer: Avsparksnotis Av / 15 min före / Vid avspark | L (reminders) | samma | Bara när appen körs |
| Följer: kort med nästa match | E | A | |
| **Matchcenter**: status, liga · arena, lag | E | A | |
| Matchcenter: Följ hemma/borta/liga | L | L | |
| Matchcenter: Notis vid mål | — | A + pollning | Bara när appen körs |
| **Var kan jag se den** (logga, namn, spellista, kvalitet) | E (kvalitet ur namnet: 4K > FHD > HD > SD) | E | |
| … fördröjning, BÄST | BÄST = kvalitet + startvaktens historik, fördröjning "—" | samma | Riktig latens i fas 3 |
| … "Sänds på X, som inte finns i dina spellistor" | — | A (tv-kanal saknas i fixturen, se Öppna frågor) | |
| **Välj annan kanal…** | L (override per match) | L | Vinner alltid |
| Händelser, Statistik, Laguppställningar | dolda raderna | A (fotboll: alla tre; hockey: händelser, resten verifieras) | Tomt svar → raden döljs |
| **Spelare**: ticker/kolumn | E (bara "LIVE"-status) | A | Följer Visa som (Matchdag = ticker, Flöde = kolumn) |
| Spelare: MÅL!-overlay + Hoppa dit | — | A (ställningsdiff mellan pollningar) | Målskytt om källan skickar händelser |
| Spelare: Matcher-lådan (på kanalen / live / senare / bara resultat), Välj flera → Multiview | E (utan "bara resultat") | +A | |
| Hem: Sport ikväll | E | +A | Hör till Hem-handoffen; byggs bara om Hem görs |

**Sporter som källan saknar** (tennis i v1 och andra API-Sports saknar):
de klassas `coverage: 'epg'`. Kort och rader för dem har inget ställningsfält
och ingen "Bara resultat"-text. Matchcentret visar inte raderna för
Resultat eller Händelser, och Resultat-fliken listar dem inte. Nyckelkortet
nämner bara de sporter som får resultat.

## Arkitektur

### App (Rust)

**`xmltv.rs` / `live_tv_epg.rs`**
- Parsern läser också `<category>`, `<sub-title>` och `<live/>` om de finns.
  Jerrys panel har dem inte, men andra källor har det.
- Sportextraktion vid inläsning. Programmet får valfria fält:
  `sport { kind, league, home, away, homeKey, awayKey, live, rerun, round?,
  venue? }`. Det görs i Rust, eftersom det finns ~133 000 program och
  telefonen inte ska behöva tolka dem.
- Fönstret bakåt utökas till **30 h, men bara för program med `sport`**.
  Övriga program behåller 6 h, så att lagringen inte växer med ~50 %.
- Nya endpoints:
  - `GET /api/live-tv/sport/day?listIds&day&tz` returnerar matcher
    grupperade över kanaler och spellistor, med källorna rangordnade.
  - `POST /api/live-tv/sport/link` tar fixturer
    `[{id, home, away, league, kickoff}]` och returnerar kopplade
    `{fixtureId → [källor]}`. Normaliseringen finns alltså på ett enda
    ställe.
- **Sportdetektering**, i den här ordningen:
  1. Eventkanaler tolkas på kanalnamnet ("LIVE EVENT 26 - MAIN STAGE …").
     "NO EVENT" hoppas över.
  2. Titelmönster: `Liga : Hemma - Borta[ ᴸᶦᵛᵉ]`; TV4-formen
     `H - A Liga : Hemma Lång - Borta Lång`, där de långa namnen föredras;
     `A at H` (borta först); `H vs. A`.
  3. Ligatoken mot en känd ligatabell, som ger sport. Annars används
     kanalnamnet (Hockey, Fotboll, Motor, Tennis).
  4. Brus filtreras bort: Sändningsuppehåll, studio, Höjdpunkter, Magasin,
     Preview, Classic.
  5. Ur desc: `omgång N`, `Från {arena}` och `(dd/mm-yy)` ≠ programdatum,
     som betyder repris.
- **Normalisering**: gemener, diakritik bort, affix bort
  (FC/IF/IK/AIF/BK/SK/HC/FF/IS/CF/AFC/SSC), "&"/"och". Till det kommer en
  handskriven exonymtabell (Sverige→Sweden, Rumänien→Romania,
  Tjeckien→Czechia, Göteborg→IFK Göteborg …) som utökas efter testfallen.
- **Gruppering** (fas 1): (sport, liga-nyckel, lag-nycklar oberoende av
  ordning, start ±30 min) blir en match. Repris och live hålls isär.
- **Lokal genomkoppling för API-Sports**:
  `GET /api/live-tv/sport/fetch?sport&path&ttl`. Appen lägger på
  nyckelheadern, läser kvotheaders och svarar ur **diskcache**
  (`live-tv-sport/`) om posten fortfarande är färsk. Det här är ingen
  hosting: koden körs i användarens egen app och löser både CORS och
  diskcachen. Telefon- och LAN-klienter går via sin egen värd-app.

### Plugin (`runtime/sport/`)

| Modul | Ansvar |
|---|---|
| `sport-model.ts` | Typer: `SportKind`, `Match` (id, sport, league, home/away `Team`, kickoff, status `scheduled\|live\|ht\|finished\|postponed`, minute?, score?, round?, venue?, `sources: Source[]`, `fixture?: {provider, id}`, `coverage: 'full'\|'epg'`), `Source` (kanal, spellista, kvalitet, rank), `Team` (namn, nyckel, `providerIds?`) |
| `sport-epg.ts` | Klient mot `/sport/day`, plus mappning till `Match` |
| `provider.ts` | Gränssnittet `SportsProvider`: `coverage(sport)`, `day(sport, date)`, `live(sport)`, `fixture(sport, id)`, `standings(sport, league, season)`, `searchTeams(q)`, `validateKey()`, `crestUrl(team)` |
| `api-sports.ts` | Adaptern. Värd per sport (`v3.football…`, `v1.hockey…`, `v1.basketball…`, `v1.handball…`, `v1.formula-1…`); dagsprogram `fixtures?date=&timezone=Europe/Stockholm`; live `fixtures?live=all` (fotboll, med händelser); matchcenter `fixtures?id=` (fotboll: events, lineups och statistics i **ett** anrop); hockey `games?date=` + `games/events?game=`; `standings?league&season`; `status` för validering. Statusmappning per sport |
| `budget.ts` | Kvothanteraren (se nedan) |
| `merge.ts` | Slår ihop EPG-matcher och fixturer via `/sport/link`. Override vinner. Fixturer utan källa → "Bara resultat" |
| `sport-store.ts` | Plugin-lagring (synkas, inget "cache" i namnet): `sport_settings_v1` {apiKey, view `matchday\|feed`, alert `off\|15\|kickoff`, goalAlerts}, `sport_follows_v1` [{sport, kind team\|league, key, name, providerIds?}], `sport_overrides_v1` {matchKey → channelKey}. Följda lag lagras på normaliserad nyckel, så att de fungerar redan i fas 1 och kopplas till källans id när det id:t blir känt |
| `sport-alerts.ts` | Avsparksnotis: skapar och tar bort vanliga `Reminder` i `reminders.ts` för följda matcher med kanal (ledtid enligt inställningen). Målnotis vid ställningsdiff |
| `key-card.tsx` | Nyckelkortet och nyckelflödet |
| `tv/sport-*.tsx` | Vyerna: `sport-shell` (huvud, flikar, dag och sport), `sport-matchday`, `sport-feed`, `sport-results`, `sport-follows`, `sport-match-center` (låda 560), `player-sport-ticker`, `player-matches-drawer` |

Rälsen (`tv/tv-rail.tsx`): ny `RailKey` `'sport'` mellan Guide och Library.
`TvView` får `'sport'` och `TV_VIEWS` får `sport`. Strängarna läggs i
`tv-strings.ts`. Telefon: Sport läggs i "Mer"-arket, och flikraden ändras
inte.

### Nyckeln (fas 2)

- **Ett kort** överst i Sport, eller i stället för Resultat-fliken, när
  nyckel saknas: "Visa resultat och tabeller – gratis, tar 1 minut". Kortet
  har länk och QR till API-Sports registrering och raden "Klistra in
  nyckel". Kortet kan döljas med "Inte nu", och efter det visas bara en
  diskret rad i Resultat-fliken.
- **Inmatning**: skrivbord och telefon får ett textfält med klistra in. TV
  använder SDK:ns `t: 'qr'`-rad och Soffläge/Telefonkompis, så att nyckeln
  matas in i telefonen. Tangentbordet på TV:n är reserv.
- **Validering direkt**: `status`-anropet (räknas inte mot kvoten) ger
  "Nyckeln fungerar · 12 av 100 anrop i dag · Gratisnivå". Fel nyckel ger
  "Nyckeln godtogs inte", och nyckeln sparas inte.
- Nyckeln synkas med den vanliga inställningssynken (WebDAV). Den visas
  maskerad (`••••3f9a`), och "Ta bort nyckel" finns i pluginets
  inställningar.

### Kvothanteraren (`budget.ts`)

Hanteraren äger **varje** anrop mot källan. Inget annat i koden får anropa
adaptern direkt.

- **Bokföring per kvotdygn**, som återställs 00:00 UTC, och per kvothink.
  Jerry har fått uppgiften att en nyckel delar kvoten mellan alla sporter.
  Hanteraren klarar också en kvot per sport-API, om testet med riktig nyckel
  visar det. Sanningen är svarets kvotheaders (resterande/gräns). Lokal
  räkning används bara mellan svaren. Minutgränsen respekteras också.
- **Dygnsplan**, med anrop i prioritetsordning:
  1. Dagsprogram **idag** per sport med matcher i EPG eller bland följda
     (~1 anrop per sport). Igår och Imorgon hämtas en gång per dygn, och
     när Igår väl är hämtat är det slutgiltigt.
  2. Matchcenter på begäran (1 anrop). Resultatet cachas 60 s för en
     pågående match och för alltid för en avslutad.
  3. Tabell en gång per dygn per följd eller visad liga.
  4. **Reserv** på 10 % (minst 5) för matchcenter.
  5. Det som blir över går till **livepollning**.
- **Livepollning** sker bara medan sportvyn, matchcentret eller en
  sportsändning i spelaren är öppen och någon match i täckt sport är live
  eller börjar inom 10 min. Ett "allt live"-anrop görs per sport. Intervallet
  är `max(golv, återstående livefönster / (kvar − reserv))`. Livefönstret
  räknas från dagsprogrammet (sista avspark + 2 h). Golvet är 15 s.
  Gratisnivån landar på ~2–4 min en matchkväll, och betald på 15 s.
  Pollningen pausas när vyn stängs eller appen hamnar i bakgrunden.
- **Synlig takt**: en tyst rad i Sport-huvudet och matchcentret, till
  exempel "Uppdateras var 3:e min · 41 anrop kvar i dag". Den har en diskret
  länk "Snabbare med betald nyckel". Ingen popup.
- **Cachen ligger på disk** (genomkopplingen), aldrig i localStorage.
  Android-taket på 10 MiB gör att det inte går. TTL: dagsprogram 15 min för
  idag och 6 h för andra dagar; tabell 24 h; avslutad fixtur för alltid;
  märken i appens bildcache. Startvärdet visas ur cachen innan något anrop
  görs.

## Dataflöde

1. Sport öppnas och `/sport/day` hämtas (lokalt, ingen kvot). Vyn ritas
   direkt med EPG-matcher.
2. Med nyckel: `budget.day(sport)` för de sporter som syns svarar ur
   diskcachen om posten är färsk, annars med ett anrop. Därefter länkar
   `merge.ts` via `/sport/link`. Korten får ställning och märken, och
   "Bara resultat" läggs till.
3. Är någon match live körs pollningsslingan med `budget.live(sport)`.
   Ändras ställningen sker följande:
   - ställningen uppdateras och målblinket visas;
   - MÅL!-overlay visas om spelaren är öppen;
   - notis skickas om matchen följs och målnotis är på.
4. Matchcentret öppnas: `budget.fixture(id)` hämtas en gång. Medan centret
   är öppet följer det pollningstakten.
5. "Välj annan kanal…" skriver `sport_overrides_v1`, och raden går före
   automatkopplingen överallt (Titta, Matcher-lådan, Var kan jag se den).

## Felhantering och degradering

- **Ingen nyckel** gör fas 1 fullt fungerande, och Resultat visar
  nyckelkortet.
- **429 eller slut på kvot** stoppar alla anrop till kvotdygnets slut, eller
  till minutgränsen har passerat. Vyn visar senaste cachen med raden
  "Resultat pausade till 02:00 – dagens anrop är slut". Inga fel visas i
  korten. Allt EPG-baserat fungerar som vanligt.
- **401 eller ogiltig nyckel** ger ett nyckelkort i felläge: "Nyckeln
  fungerar inte längre". Pollningen stannar.
- **Nätfel eller timeout**: ett omförsök med backoff inom budget, sedan
  cachen. Vi gör aldrig omförsök i en loop.
- **Fixtur utan koppling** blir "Bara resultat". **EPG-match utan fixtur**
  visas med EPG-data, och vi gissar ingen ställning.
- **Sport utan täckning** (tennis): `coverage: 'epg'`, och inga anrop görs.
- **Tomma underdelar** (hockeyns uppställningar eller statistik): raden döljs
  i stället för att visas tom.
- **Notiser** fungerar bara medan appen körs. Det står vid växlarna.

## Test

- **Rust**: tabelltester för titelparsern och desc-parsern med verkliga
  rader ur Jerrys flöde (Allsvenskan, SHL, PL, NHL "at", TV4 SportLive,
  Nations League med exonym, studio- och brusrader, repris med datum,
  eventkanalnamn). Gruppering till "N källor". Fönstret 30 h bara för sport.
  `/sport/link` med ombytt hemma/borta och förstudio −15/+60 min.
  Genomkopplingens cache-TTL och kvotheaders mot en lokal mockserver.
- **Plugin** (vitest): API-Sports-adaptern mot fixtur-JSON i `__fixtures__/`
  (fotboll date/live/id, hockey games/events, standings, status). För att få
  fram de filerna gör Jerry **en** inspelning med sin egen nyckel, som
  committas utan nyckel. `budget.ts` testas med falsk klocka: planen för
  gratis- och betalnivå, intervallformeln, reserven, 429, dygnsskifte UTC,
  att pollningen stannar när vyn stängs och att inga anrop görs utan nyckel.
  `merge.ts` testas med override. `sport-alerts` testas mot `reminders.ts`.
  Vyerna testas för täckt och otäckt sport (tennis får inget ställningsfält)
  och för nyckelkortets tillstånd.
- **Manuellt**: Playwright mot 3011 i `?tvmode=1`, på skrivbord och på
  ≤639 px. En matchkväll med gratisnyckel kontrolleras mot att antalet
  anrop i dagens bokföring stämmer med planen.

## Utanför v1

Egen server eller proxy, andra källor än API-Sports, tennisresultat,
bakgrundsnotiser när appen är stängd, latensprobning (fas 3),
höjdpunkter (fas 3), spelarprofil från uppställningen.

## Öppna frågor till Jerry

1. Är kvoten delad mellan alla sporter eller satt per sport-API? Det ska
   verifieras med din nyckel vid inspelningen. Hanteraren klarar båda
   fallen.
2. Vilka sporter ska ha egna knappar från start? Förslaget är Fotboll,
   Ishockey, Basket, Handboll, Motorsport och Tennis (bara EPG).
3. Ska "Sänds på X, som inte finns i dina spellistor" vara med? API-Sports
   har inga tv-kanaler, så raden kräver en egen tabell (liga → svensk
   rättighetsinnehavare) eller tas bort.
4. Sport ikväll på Hem: ska det ingå nu, eller vänta på Hem-handoffen?
