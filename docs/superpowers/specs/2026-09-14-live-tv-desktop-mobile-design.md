# Live TV – nya designen på skrivbord och mobil

Datum: 2026-09-14
Repon och grenar: lumio-official-plugins `plugins/live-tv`, ny gren `feature/live-tv-everywhere` från `feature/live-tv-storage-v2` (9911c5d). Moviefinder (värd) på `test/2026-09-14-live-tv-allt` (från `tv-shell`) för app-ändringarna i avsnitt 3.
Föregående specar: `docs/superpowers/specs/2026-09-13-live-tv-tv-mode-design.md` (TV-läget), `docs/superpowers/specs/2026-09-14-live-tv-storage-v2-design.md` (lagringen, oförändrad här).
Underlag: `.superpowers/sdd/2026-09-14-live-tv-storage-v2-plugin/desktop-mobile-inventory.md` (inventering av TV-antagandena, file:line), `Moviefinder/design_handoff_live_tv_tv_mode/README.md`.

Bakgrund: efter kvällens test 2026-09-13 säger Jerry att den omdesignade TV-ytan ska gälla överallt — "designen verkar funka som den är på desktop". Skalningen görs av appen (TV-scenens transform) även utanför TV-läget. Skrivbordets inställningssektioner behålls, pluginets egna inställningar blir snabbknappar. Skrivbordets EPG-rutnät behålls som ett valbart guideläge.

## 1. Mål

En layout på alla ytor. Samma komponentträd (`runtime/tv/*`) renderas i TV-läge, på skrivbord och på telefon; bara **inmatning** och **skala** skiljer. Hubb, guide, favoriter, kanaldetalj, sök, multivy, inställningar och spelarlagret ersätter dagens skrivbords- och mobilvyer (`live-tv-hub.tsx`, `live-tv-epg-page.tsx`, `live-tv-channel-page.tsx`, `live-tv-guide.tsx`). Ingen funktion får bara finnas på en yta.

## 2. Omfång

Fas 1 (den här specen, skrivbord): grenen i `runtime/index.ts:60-68` tas bort så `LiveTvTvShell` renderas överallt; appen skalar pluginets yta utanför TV-läget; pekvariant av håll-OK; Bakåt med klick och Esc; guideläget **Rutnät**; snabbknappar i pluginets inställningar; borttagning av de ersatta skrivbordsvyerna.

Fas 2 (separat spec, mobil): portträttvariant — ikonraden (`tv-shell.tsx:378-386`, 104 px) blir en bottenrad, hubbens sexkolumnsrutnät blir två, guidens 520 px kanalstation blir full bredd, minsta teckenstorlek och träffyta (44 px) sätts som golv. Fas 1 får inte låsa vägen dit: alla mått som fas 2 behöver ändra ligger i `tv-ui.tsx`/vyernas toppkonstanter, inte utspridda. **Ärlig gräns:** en 1920-scen nedskalad till 390 px bredd ger ~0,3 i skala, alltså 6–7 px text och 18 px ikoner (inventering §1). Fas 1 levererar därför mobil som "fungerar, litet", inte som färdig mobildesign; telefonen får inte marknadsföras som klar förrän fas 2 är byggd.

Ingår inte: inspelning, röstsök (tidigare beslut), Lagring v2:s interna delar, `plugins/twitch/**`.

## 3. App (Moviefinder)

**3.1 Scen utanför TV-läget.** Idag skriver `lib/tv-scene.ts:190-215` (`applyTvScene`) scenvariablerna på `document.documentElement` och `spa/src/index.css:2083-2087` transformerar **`body`** — och det sker bara i TV-läge (`lib/tv-focus.tsx:801-814`, `if (!isTv)`). Utanför TV-läget kan inte body skalas: värdens sidomeny och rubrik ligger där.

`lib/tv-scene.ts` får därför en **scenlåda**: en funktion som mäter ett givet element (ResizeObserver på elementets innehållsyta, inte fönstret), räknar samma `tvScene(bredd, höjd)` och sätter `--tv-scene-scale/-w/-h` plus `data-tv-scene-box="1"` **på elementet**, med `transform-origin: top left` på ett inre 1080-lager. Exponeras för plugin som en komponent via `lib/plugin-sdk.ts` i samma mönster som `getTvGlassMenu()` (`plugin-sdk.ts:90-92`), så pluginet kan sakna den på äldre appar.

Enklaste samexistensen med värdens krom, och den vi väljer: **pluginsidan fyller innehållsytan, värdens krom ligger kvar utanför.** Scenlådan läggs runt `activeBrowsePage.Page` i `components/media-explorer.tsx:7289-7302`, i den gren som idag bara sätter `data-tv-browse-page` i TV-läge. Pluginets 104 px-rad bor inuti scenen och hamnar alltså bredvid appens sidomeny, inte i stället för den. Scenens minsta designbredd (`TV_SCENE_MIN_WIDTH_PX = 1280`) gäller innehållsytan, inte fönstret — ett 1512 px fönster med öppen sidomeny ger ~1200 px innehåll och hamnar i breddgrenen, vilket är avsett.

En transform gör elementet till containing block för `position: fixed`-barn. Pluginets fasta lager (`tv-shell.tsx:416,419` toasts, `tv-channel-picker.tsx:37` panelen, `tv/video-surface.ts:207`) hamnar därmed rätt **i designpixlar** inne i lådan utan ändring — det är exakt den bugg-klass som inventeringen §6 varnar för, och lådan löser den i stället för att flytta den. Undantaget är `TvGlassMenu`, som portalerar till `document.body` (`components/tv/tv-glass-menu.tsx:101-134`) och alltså hamnar utanför scenen; se öppen fråga 2.

Nativa videoytor är oberörda: `setBounds` matas från `getBoundingClientRect()`, som redan ger skalade skärmpixlar.

**3.2 Fokusmotorn även på skrivbord, musen leder.** Beslut (Jerry): pilnavigeringen behålls utanför TV-läget för tillgänglighetens skull, men musen är det ledande sättet att klicka sig fram. `lib/tv-focus.tsx:636-637` installerar därför motorn också när ett element med `data-tv-scene-box` finns i dokumentet, med tre begränsningar: (a) motorn är **skopad** till scenlådan — piltangenter utanför den (värdens sidomeny, sökfält) rörs inte; (b) motorn avstår när fokus står i `INPUT`, `TEXTAREA` eller `[contenteditable]`, så pilar fungerar i textfält (idag `preventDefault` på allt, `tv-focus.tsx:711`); (c) hovring med mus flyttar fokus till stationen under pekaren (`pointermove` med `pointerType === 'mouse'`, debounce en bildruta), så pilar alltid utgår från det man senast pekade på och fokusringen inte ligger kvar på ett annat kort. `data-init`, `data-panel-root`, `data-f-left/right` och `data-scroll` får därmed samma betydelse som på TV. Fokusringen i `tv-ui.tsx:81-99` visas bara vid tangentbordsnavigering (`:focus-visible`-semantik: motorn sätter `data-focus-source="key"|"pointer"` på roten och ringen ritas bara för `key`), så musanvändaren inte ser ringar hoppa.

**3.3 Håll-OK med pekare.** `lib/tv-hold.ts` får en pekarvariant vid sidan av `tvHoldHandlers` (`tv-hold.ts:28-55`): `pointerdown` startar samma `TV_HOLD_MS = 650`-timer i samma WeakMap, `pointerup`/`pointercancel`/`pointerleave` avbryter, utlöst håll undertrycker den efterföljande `click` (annars kommer både `onHold` och `onOk`). `contextmenu` mappas till `onHold` med `preventDefault`. Exporteras via `plugin-sdk.ts:95,101` bredvid `tvHoldHandlers`/`TV_HOLD_MS`.

**3.4 SDK.** Nytt: scenlådan (3.1) och pekarhållet (3.3). `docs/plugin-sdk.md` uppdateras. Appversion 0.1.597.

## 4. Plugin

### 4.1 Inmatning

En implementation per handling, tre inmatningsvägar. `station()` (`tv/tv-ui.tsx:104-123`) är den enda platsen som ändras för OK och håll.

| Handling | Fjärr/tangentbord | Mus | Touch |
|---|---|---|---|
| OK | Enter/Space (finns) | klick (finns, `tv-ui.tsx:110`) | tryck (finns) |
| Håll OK (kanalmeny, rutmeny, spelarmeny) | håll Enter 650 ms (finns) | högerklick **och** en synlig "…" på hovring | långtryck 650 ms via pointer (3.3) |
| Bakåt | Esc/Backspace/GoBack (finns, `tv-shell.tsx:61,241-262`) | Bakåt-knapp i skalet, värdens bakåt | systembakåt och kantsvep |
| Zappa | siffror 0–9 (finns, `tv-shell.tsx:277-308`) | siffror på tangentbord | — (ingen skärmnumpad) |
| Kanalbyte | ChannelUp/Down, PageUp/Down (finns) | mini-guiden i spelaren | mini-guiden |

**"…"-knappen** ritas **en gång** i skalet, inte per kort: `station()` sätter `data-hold=""` när `onHold` finns, och `tv-shell.tsx` håller en delegerad hovringslyssnare på rotnoden som placerar en enda "…"-knapp över den hovrade stationens övre högra hörn (position ur `getBoundingClientRect()`, döljs vid `pointerleave`, vid scroll och när pekaren är grov). Klick på den anropar stationens `onHold`. Det ger affordansen på **varje** station med hållhandling utan att röra ett enda anropsställe, och utan att bryta regeln "ett kort = en station" på TV (knappen renderas aldrig i TV-läge).

**Bakåt** drivs av samma `back()` (`tv-shell.tsx:204-212`) från både tangent och klick. Ikonraden får överst en Bakåt-post utanför TV-läget; alla fyra nivåerna (lager → spelarkrom → skal → `requestBrowseBack()`) nås därmed med pekaren. På mobil kopplas `hooks/useSwipeBack.ts` till `back` i skalet med `enabled` = inget PIN-lager öppet; hooken no-oppar redan själv i TV-läge (`useSwipeBack.ts:52`), och den ska **inte** längre navigera direkt till hubben som skrivbordssidorna gör idag — den ska ta ett steg i kedjan.

### 4.2 Skal och skalning

`runtime/index.ts:60-68`: grenen på `useTvMode()` tas bort, `LiveTvTvShell` renderas alltid. Hooken finns kvar i skalet för de tre skillnaderna: skärmtangentbord, "…"-knappen och ikonradens Bakåt-post. Skalet lindar sitt innehåll i värdens scenlåda (3.1) när den finns; saknas den (äldre app) avstår pluginet — därför höjs `minAppVersion`. Alla `dp()`-mått (`tv-ui.tsx:28-30`, identitet) är oförändrade, eftersom de fortsatt är designpixlar inne i en scen. `hooks/useIsMobileLayout.ts` invarianten "en TV är aldrig mobil" står kvar men får en ny mening: den styr nu bara **fas 2:s** portträttgren, inte om TV-trädet renderas. Regeln skrivs om i filens kommentar för att inte läsas som "TV-trädet = skrivbord".

### 4.3 Vyer

Alla sju vyer i `tv/tv-views.tsx:13-21` gäller överallt. Nytt fjärde guideläge:

**Rutnät.** `live_tv_guide_mode_v1` får värdet `'grid'`; segmentväxeln i guiden visar Nu/Sen · Tablå · Rutnät · Spellistor. Läget är skrivbordets nuvarande EPG-tablå (`live-tv-epg-page.tsx`) porterad till `tv/tv-guide-grid.tsx` med samma delar: Idag/Imorgon, Nu-knapp, kategorichips, 240 px per timme, 160 px kanalkolumn (`sticky` utanför mobil), Nu-linje, detaljremsan för valt program. Data via `hooks/useSchedules.ts` och `epg-rows.ts` som idag. Måtten skrivs som `dp()` inne i scenen.

Fjärrnavigering i rutnätet: varje programblock är en station, kanalkolumnen en station per rad; ◂▸ flyttar i tid inom raden, ▴▾ byter kanal (motorns geometri räcker — blocken är absolut positionerade i rad), tidsspåret bär `data-row` och listan `data-scroll` så fokus hålls i sikte; OK = spela om programmet pågår, annars öppna kanaldetalj med programmet förvalt; håll OK = påminnelse av/på, lås/lås upp. Dubbelklicket som idag sätter påminnelse (`live-tv-epg-page.tsx:270-283`) behålls för mus.

**Överlappsfix (Jerrys skärmdump, "Live NFL Football Night"/"NFL Cowboys @ Giants", "Matc…").** Blockets bredd är `Math.max(4, …)` (`live-tv-epg-page.tsx:258`) medan blocket har `padding: '6px 8px'` och `boxSizing: 'border-box'` (`:283-299`). Ett block smalare än sin egen vågräta padding kan inte bli så smalt — det renderas minst 16 px brett och lägger sig över grannen, som är absolut positionerad och inte reflowar. Åtgärd: geometrin flyttas till en ren modul (`epg-grid-geometry.ts`) med `MIN_BLOCK_PX`; under den bredden ritas blocket som **bara en markör** (accentstreck, ingen padding, ingen text, `title` kvar för verktygstips); mellan markörbredden och ~72 px ritas bara titeln; padding klipps till `min(8, bredd/3)`; alla block får `overflow: hidden` och enradig ellips på både titel och tid. Måttet verifieras i skärmdump före/efter på samma panel.

### 4.4 Inställningar

Appens egna sektioner är **primärytan för administration** och behålls oförändrade i uppbyggnad: `live-tv-settings-section.tsx`, `xtream-login-section.tsx`, `epg-sources-section.tsx`. Pluginets inställningsvy (`tv/tv-settings.tsx`) är **snabbknappar** som speglar dem och som når allt utan att lämna Live TV.

Dessa fyra ska finnas på **båda** ytorna:

1. **Egna listor med kanalväljare.** Skrivbordet har den i `live-tv-grid.tsx:531,1045-1052,1208,1301`. TV-varianten i fliken Spellistor återanvänder `tv/tv-channel-picker.tsx`-mönstret (högerpanel, `data-panel-root`, kategorichips, kanalrader, OK = i/ur listan med bock).
2. **EPG-status per adress.** `epg-sources-section.tsx:56-141` (`EpgStatusCard`, `/api/live-tv/epg/status`). Datadelen bryts ut till en hook som båda ytorna läser; TV:s EPG-flik får en radlista med hämtad-tid, antal program och fel per adress. (Beslutet i liggaren att TV:s EPG-flik avsiktligt saknar diagnostik upphävs här av Jerrys krav.)
3. **Fullständigt Xtream-konto.** Kontoinfo (status, utgångsdatum, max anslutningar) via `fetchXtreamAccount` och kategorival vid import via `fetchXtreamCategories` (`xtream-login-section.tsx:169,297-370`). TV:s trestegsguide (`tv-settings.tsx:381-405`) kompletteras med ett kontokort och en kategorilista i väljarmönstret från punkt 1.
4. **Uppdatera.** Skrivbordets batch-knapp (`live-tv-grid.tsx:1088`) och TV:s `onRefetch` per rad blir samma anrop (`importList`) på båda ytorna: en Uppdatera-knapp per lista **och** en som kör alla, med förloppet från `ImportStatus`.

**Textinmatning.** `useKeyboardPrompt()` (`tv-settings.tsx:133`) och sökvyns egna tangentbord (`tv/tv-keyboard.tsx`, använt av `tv-search.tsx`) får en gemensam abstraktion: i TV-läge värdens `TvKeyboardPanel` (`plugin-sdk.ts:85-87`) respektive plugintangentbordet som idag; utanför TV-läget ett riktigt `<input>` — en rad i dialogen för inställningar, ett fokuserat sökfält i sökvyn. Inget skärmtangentbord på skrivbord.

### 4.5 Skrivbordsbeteenden som ersätts eller ska följa med

Ersätts och raderas: `live-tv-hub.tsx`, `live-tv-epg-page.tsx`, `live-tv-channel-page.tsx`, `live-tv-guide.tsx` samt de döda `isTv`-grenarna i dem (inventering §4). `live-tv-grid.tsx` behålls — den är startsideöverstyrningens yta (`runtime/index.ts:49-56`, `live-tv-home-override.tsx`) och rörs bara av punkt 1 och 4 ovan. `player-extras.tsx` ersätts av `tv/tv-player-chrome.tsx` på alla ytor.

Ska följa med: hovringslägen (saknas helt i `tv-ui.tsx` — `station()`, `Chip`, `RoundBtn`, `Toggle` får en hovringsyta), hjulscroll i `data-scroll`/`data-row` (fungerar redan, behållarna är vanliga `overflow:auto`; verifieras att motorns egen kantscroll inte slåss med en pekarscroll), markeringsfri text på kort (`user-select: none` på stationer, men **inte** i program- och kanalbeskrivningar), omritning vid fönsterändring (scenlådans ResizeObserver, 3.1), och `title`-verktygstips på trunkerade titlar.

## 5. Fel och gränser

- Saknad scenlåda (app < 0.1.597): pluginet vägrar inte, men ritas oskalat och fel — därför spärras det av `minAppVersion`, inte av en fallback.
- Innehållsytan under 1280 designpixlar: breddgrenen i `tvScene` ger en högre scen; vyerna måste tåla en scen högre än 1080 (hubbens och guidens listor scrollar redan).
- Grov pekare: "…"-knappen ritas aldrig; långtryck är enda vägen till hållmenyn.
- Högerklick inne i ett textfält ska ge systemmenyn, inte hållmenyn.
- Zappen får inte äta siffror i värdens egna fält: lyssnaren hoppar redan över `INPUT`/`TEXTAREA` (`tv-shell.tsx:293-295`); utanför TV-läget läggs `[contenteditable]` till.
- Rutnätet utan tablå: samma tomtext som idag, raden faller bort i `selectEpgRows`.

## 6. Tester

Vitest (happy-dom, samma verktyg som idag — inventering §5 visar att klickvägar redan testas med `fireEvent.click` i `tv/tv-guide.test.tsx`):
- Pekarhåll: `pointerDown` + falska timers 650 ms → `onHold`, och att efterföljande `click` inte också ger `onOk`; avbrott vid `pointerup` före 650 ms → `onOk`.
- `contextmenu` på en station med håll → `onHold`, `preventDefault` anropad.
- "…"-knappen: `pointerOver` på `[data-hold]` visar en knapp, klick på den kör `onHold`, `pointerLeave` döljer den; ingen knapp i TV-läge (`__setTvModeForTests(true)`).
- Bakåt-kedjan körs identiskt av `keyDown(window, Escape)` och av klick på skalets Bakåt-post (lager → spelare → vy → `requestBrowseBack`).
- `epg-grid-geometry`: block smalare än `MIN_BLOCK_PX` ger markörform, blocken överlappar aldrig i vänster/bredd-par, klippning vid fönsterkant.
- Prompt: utanför TV-läge renderas `<input>` och inget `TvKeyboardPanel`; i TV-läge tvärtom.
- Inställningar: de fyra funktionerna i 4.4 finns i både `tv-settings.tsx` och skrivbordssektionerna (renderingstest per yta).

Playwright i `http://localhost:5173/tv-sim.html` med mus: hovring, "…", högerklick, klickbaserad Bakåt, rutnätets scroll. Skrivbordets dev-server: pluginsidan i ett 1512×982-fönster med sidomeny öppen och stängd, plus 1280×800 — skärmdump mot TV-referensen.

## 7. Verifiering och release

Appen först (scenlåda + pekarhåll): 0.1.597. Pluginet därefter: **0.6.0**, `minAppVersion` 0.1.596 → **0.1.597**. `dist/runtime.js` byggs om i samma omgång som bumpen, från ett app-träd som bär scenlådan och pekarhållet (testgrenen tills den mergats, därefter `main-plugin-build`), och bunten kontrolleras innehålla den nya versionssträngen innan release — annars serveras gammal kod under nytt versionsnummer och cachen hämtar aldrig om. Manuell lista till Jerry: skrivbord i två fönsterstorlekar, telefon i landskap och porträtt (förväntat "litet, men rätt"), rutnätet mot panelen i skärmdumpen, de fyra inställningsfunktionerna på båda ytorna, Bakåt med mus och med Esc. Inget släpps utan Jerrys klartecken.

## 8. Öppna frågor — alla avgjorda 2026-09-14

1. ~~Ikonraden~~ **Beslutat (Jerry):** ikonraden ligger kvar på skrivbord men med mindre vänsterpadding (upplevs onödigt bred bredvid appens sidomeny; måttet sätts i `tv-shell.tsx:382` och verifieras i skärmdump). På mobil döljs raden; hur den ersätts avgörs i fas 2 (förslag: bottenrad).
2. **Beslutat (Jerry):** `TvGlassMenu` portaleras in i scenlådan (värden exponerar portalmålet) så menyn har samma skala som kortet. Jerrys följdkrav — "folk fattar inte long press på desktop med mus" — täcks av "…"-knappen på hovring och högerklick i 4.1; knappen ska vara tydlig (ikon + tooltip "Fler val"), inte diskret.
3. **Beslutat (Jerry):** ja, pilnavigering behålls på skrivbord (tillgänglighet), men musen är ledande — se 3.2 (skopad motor, textfält undantagna, hovring flyttar fokus, ring bara vid tangentbord).
4. **Beslutat (Jerry):** ja, nummerzapp på skrivbord utanför textfält; ingen skärmnumpad.
5. ~~Multivy på telefon~~ **Beslutat (Jerry):** ja, redan i fas 1, men bara två rutor staplade lodrätt (en över, en under) när innehållsytan är smalare än 1024 designpixlar; kapacitetsvalet 3/4 döljs där.
