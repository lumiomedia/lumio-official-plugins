# Live TV – kanalguiden städad på skrivbord och TV

Datum: 2026-09-17. Bygger på `2026-09-16-live-tv-mobile-phase3-design.md`. Utseende, mått och
interaktioner är normativa i `Moviefinder/design_handoff_live_tv_desktop_epg/` (`README.md` +
`Live TV - desktop EPG.dc.html`, arbetsordning i `IMPLEMENTATION.md`). Den här specen säger hur
handoffen mappas på koden, var den gäller, och vilka beslut som fattats där handoffen lämnade dem
öppna eller där den krockar med fas 3.

## Problemet

Guiden på skrivbord och TV har fyra lägen, tre kontrollrader, en tyst förhandsvisning, en 40-px-rubrik
och en klocka som slåss om överkanten; tre av fyra lägen visar mest tomma kolumner; Playlists är en egen
sida; banners ligger över sista raderna; kanalcellen saknar `min-width: 0` så spåren får olika
nollpunkt; tidsfönstret börjar vid en fast timme så nu-linjen hamnar var som helst.

## Beslut

| Fråga | Beslut |
|---|---|
| Var | **Skrivbordsappen (Tauri) och TV-läget.** `newGuide = isTv \|\| (isDesktopTauriEnv && !phone)`. LAN/fjärr-webbklienter (`!isDesktopTauriEnv`) behåller dagens skrivbordsguide orörd; telefonen (fas 3) och Android rörs inte. |
| Mått | Handoffens px används som **designpixlar i scenen** (som TV-handoffen): 1280+-scenen på skrivbord, 1920-scenen på TV. Ingen separat TV-skalning; TV får proportionellt bredare spår. |
| Lägen | **Tre** enligt prototypen: Grid (standard), Now / Next, Timeline (dagsöversikt med zoom 2 h / 6 h / dag). |
| Lagring | `live_tv_guide_mode_v1` behåller nycklarna och får `'nownext' \| 'timeline'`. Normalisering per yta vid läsning — skrivbord/TV: `now`/`tl` → `nownext`, `playlists` → `grid`; telefon: `nownext` → `now`, `timeline` → `grid`. Skrivbord/TV skriver bara `grid \| nownext \| timeline`. **Ingen migrering.** |
| Källa | Källväljaren = befintliga `activePlaylistId`/`setActivePlaylist` (`live_tv_active_playlist_v1`). Modellens `useTvMode`-gate för `activeList` lyfts till `isTv \|\| isDesktopTauriEnv`. Telefon/LAN oförändrade (löser fas 3:s parkerade beslut för skrivbordet). |
| Nya nycklar | `guideCategory: string \| null` (lagras), `timelineZoom: '2h' \| '6h' \| 'day'` (default `day`), `nowNextDetails: boolean` (default `true`) i `tv-settings-store.ts`. `guideWindowStart` är VY-state, inte lagring. |
| Förhandsvisning | `TvPreview` monteras inte i guiden (skrivbord och TV). Kanaldetalj behåller sin förhandsvisning, så `previewEnabled` finns kvar. |
| TV-rester | Bara på skrivbord: roten får `data-live-tv-desktop="1"` → `TvFocusStyle` byter fokusglöd mot 1 px accentkant; `OK = …`-strängar gatas med `isTv`. TV behåller glöd, håll-OK och glasmeny (fjärren behöver dem). |
| Sammanslagning i Timeline | Bara vid zoom `day` (grövre än 6 h), enligt handoffens förslag. |
| Hover-debounce | 120 ms på skrivbord; på TV följer panelen fokus utan debounce. |

## 1. Guidens skal (`tv-guide.tsx`)

`TvGuide` grenar: `phone` → fas 3 (orört); `newGuide` → `TvGuideShell`; annars dagens
`TvGuideStandard`/`TvGuideGrid`/`TvGuidePlaylists` (LAN/fjärr, orört).

`TvGuideShell` äger: normaliserat läge (`desktopGuideMode(stored)`), `guideCategory`
(lagrad), `windowStart` (vy-state, `floor(now / 30 min) * 30 min` vid inträde och Nu-knapp), markerad
kanal/program (`selection`), `nowNextDetails`, `timelineZoom`. Det renderar **kontrollraden** och
sedan en av tre vyer med allt som props. Lägesväxling byter bara rendering; källa, kategori, dag
och markering behålls. `modeStack` + `pushLayer` (Bakåt poppar läge) behålls som idag.

## 2. Kontrollraden (`runtime/tv/guide-control-row.tsx`, ny)

56 px, den enda raden över innehållet, `padding 0 20`, `gap 10`, `border-bottom .08`. Ordning:
källväljare · kategoriväljare · avdelare · dagsegment (Today / Tomorrow) · Nu-knapp (Grid,
Timeline) · `flex: 1` · lägessegment (Grid · Now / Next · Timeline) · [Timeline: zoomsegment
2 h · 6 h · Hela dagen] · avdelare · [Now / Next: Detaljer-toggle] · klocka (`useTvClockNode`).
Dropdown- och segmentstil enligt handoffen. Fler val = fler dropdowns, aldrig en ny rad.

**Fokusstationer:** källväljaren och kategoriväljaren är `station()`-knappar som öppnar
`TvChoicePanel` (ny, i `tv-list-picker.tsx` bredvid `TvListPicker`): enval, högerpanel med
`data-panel-root`, `data-live-tv-layer`, `data-init` på valt alternativ, `nav.pushLayer(close)`
som enda Bakåt-väg, fokus återställs till öppnaren — exakt `TvListPicker`-mönstret. Samma
komponent med mus. Källväljaren listar `[Alla spellistor, …model.playlists]` med antal;
kategoriväljaren `useGuideGroups`-listan med antal. Segment och knappar är redan stationer.

## 3. Kanalcell (`GuideChannelCell` i `tv-guide-shared.tsx`)

`flex: 0 0 <w>; minWidth: 0; boxSizing: border-box` i header OCH rader. Varianter: `grid` 240
(nr 26 tabular högerställt · logotyp 44×28 · namn 14/600 ellips + `grupp · kvalitet` 12 px 45 % ·
hjärta), `nownext` 340 (logotyp 48×30), `timeline` 240 kompakt (nr · namn · hjärta). Dagens
`ChannelCell` (520 dp, TV-mått) tas bort tillsammans med `channelColumnStyle`.

## 4. Vyerna

**Grid** (`tv-guide-grid.tsx`, `TvGuideGridDesktop` skrivs om; telefongrenen orörd): kontrollrad
→ tidsaxel 30 px → rutnät → pagineringsrad 52 px; till höger **permanent detaljpanel 320 px**
(`guide-detail-panel.tsx`, ny: bildruta 180 px via `ChannelArt`, `nr · namn`, titel 20/600
clamp2, `tid · N min kvar`, förlopp, beskrivning, Titta nu 40 px + Påminn mig/Favorit 38 px).
Fönster 3 h = 6 halvtimmesspalter från `windowStart`; `pxPerMin` = spårbredd / 180 (spåret är
`flex: 1`, blocken i procent av fönstret → `epgRowBoxes` anropas med `pxPerMin = 100 / 180` och
`left/width` skrivs som `%`). Rader 60; block klippta vid vänsterkant (`epgBlockBox` klipper
redan: `clippedStart`). Tomma rader kollapsar till en cell (`Ingen tablå … · sänder live`) och
sorteras sist: `useGridRows` får `withEpg` + `withoutEpg`, paginering över den sammanslagna
listan. Panelen följer hover (120 ms) på skrivbord, fokus på TV; klick/OK på pågående block
spelar, på framtida markerar. Dagens `grid-detail`-banner och flytande "Show more" tas bort.

**Now / Next** (`tv-guide.tsx`, `TvGuideNowNext`): kontrollrad → (infobanner om `nowNextDetails`)
→ kolumnhuvud 30 px (`KANAL` 340 · `NU` · `SEN` · `SENARE`, kolumnvikter 2 / 1,2 / 1, kolumnlinjer)
→ rader 56 (`now-next-later-row.tsx` skrivs om: NU-cell titel + 90 px förlopp/`N m`; SEN/SENARE
titel + starttid) → pagineringsrad. Tomma rader = en cell + `Titta nu` 26 px. Infobanner: sparad
bildruta 200×112 (ingen ström, ingen `OK = …`), textblock `flex:1; min-width:0`, knappar
`flex: 0 0 auto`. `tl`-renderingen (tidslinje i rad) tas bort från skrivbord/TV.

**Timeline** (`guide-timeline.tsx`, ny; delar `useGridRows` + `epgRowBoxes(pxPerMin)`): zoom
`2h | 6h | day`; `day` = 06–22 i 2-timmarsspalter; rader 40; kanalcell `timeline`; block utan tid
(`radius 6`, titel 12 px 65 %), block < 20 min i vald zoom = staplar utan text; sammanslagning
`Titel · Titel` bara vid `day`; nu-linje; OK/klick på rad → `guideMode = 'grid'` +
`windowStart = floor(klickad tid / 30 min)`; fotrad 48 px med hjälptext + Visa fler.

**Spellistvyn** (`tv-guide-playlists.tsx`): skrivbords-/TV-grenen tas bort (källväljaren
ersätter den); telefonens Lists (`guide-lists-phone.tsx`, `list-tree.ts`) och LAN-grenen
kvar tills LAN får en egen omgång — filen behåller `TvGuidePlaylistsDesktop` för `!newGuide`.

## 5. Strängar, stil, tester

Nya strängar EN + SV: `modeNowNext`, `modeTimelineDay`, `zoom2h/zoom6h/zoomDay`, `details`,
`allPlaylistsShort`, `noEpgRow` ("No guide for this channel · broadcasting live"),
`paginationRow` ("{shown} of {total} channels have a guide in this category"), `showMoreN`,
`noEpgLast` ("Channels without a guide are listed last"), `timelineHint`, `watchNowShort`.
`OK = …`-strängar renderas bara när `isTv`.

`TvFocusStyle`: under `[data-live-tv-desktop="1"]` ersätts glöden med `outline: 1px solid accent;
outline-offset: -1px; box-shadow: none`.

Tester: befintliga `tv-guide*.test.tsx`/`tv-guide-grid.test.tsx`/`tv-guide-playlists.test.tsx`
testar den gamla TV-layouten och skrivs om mot den nya (`__setTvModeForTests(true)` = ny guide);
en bevarad LAN-svit (`__setTvModeForTests(false)`, `isDesktopTauriEnv` stubbad `false`) låser att
den gamla guiden finns kvar. Nya fall: geometri (halvtimmesstart, klippning, 30/60/90-bredder i
procent), lägesnormalisering per yta, `nowNextDetails` av/på utan `<video>`, alla kanalceller
lika `flex-basis`, tomma rader = en cell sist, `TvChoicePanel` (öppna/välja/Bakåt/fokus
tillbaka), Timeline-klick → grid med rätt `windowStart`, `TvPreview` inte i DOM i guiden.
Stubben `plugin-sdk.ts` får `__setDesktopTauriEnvForTests`.

## Avgränsningar

Ingen appändring (minAppVersion 0.1.600 kvar). Ingen ny datamodell. LAN/fjärr, telefon och
Android oförändrade. Kanaldetaljens förhandsvisning orörd.

## Versioner och grenar

Plugin: `feature/live-tv-desktop-epg` från `feature/live-tv-mobile-phase3`, arbetsträd
`.worktrees/desktop-epg`, version **0.10.0**. `dist/runtime.js` byggs mot fas 3-appträdet
(`mobile-phase3-app`, 0.1.600) FÖRE versionsbumpen. Test-DMG på Jerrys ord; inget släpps utan
klartecken.
