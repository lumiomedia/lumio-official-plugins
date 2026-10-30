# Live TV – Kanalguide v2 och Kanaler med två layouter

Datum: 2026-10-30. Utseende, mått, färger och interaktioner är normativa i
`Moviefinder/design_handoff_live_tv 2/` (`README.md` + `prototypes/*.dc.html`, skärmdumpar i
`screenshots/`). Den här specen säger hur handoffen mappas på koden, var den gäller och vilka
beslut som fattats där handoffen lämnar dem öppna eller krockar med det som finns.

## Räckvidd (Jerrys beslut 2026-10-30)

- **Bara två ytor ändras:** guiden (rälsnyckel `guide`) och kanalvyn (rälsnyckel `hub`, "Kanaler").
  Handoffens "Hem" = vår **Kanaler-vy**. Rälsens Hem (VOD-hemmet), rälsen själv, startvyn,
  spelaren, multivyn, sporten och kanalsidan rörs inte.
- **TV + skrivbord** (samma träd, `TvHubDesktop` / `TvGuideShell`). Telefonen (`runtime/tv/mobile/`)
  lämnas orörd — egen omgång senare. LAN-webbklientens äldre guidegren (`TvGuideStandard` m.fl.)
  lämnas också orörd.
- **Guiden får tre lägen:** Nu/Sen · Tablå · Kanallista. Grid, Now/Next-bannern och Timeline-zoomen
  försvinner från TV/skrivbord.
- **Kanaler får två layouter**, valbara i Inställningar → Live TV → Utseende:
  - **Klassisk** (standard) = dagens hubb i handoffens nya design (Screen 1b).
  - **Upplevelse** = Hem v3 (Screen 1).
  Klassisk som standard: befintliga användare ser samma struktur som idag, bara uppfräschad.

## Data som handoffen förutsätter men som inte finns

| Handoffen | Verklighet | Beslut |
|---|---|---|
| Programbild (art) | `EpgProgramme` = `{title, description?, start, stop}`; Jerrys Xtream-XMLTV har **noll** `<icon>` (17 169 program provade 2026-10-30) | Bildkedja i `tv/programme-art.ts`, se "Programbilder" nedan. Utan träff → **utan-bild-varianten** (logoplatta på `noart.surface`). |
| Färgton från bild | — | Ton ur programbilden när den finns, annars ur **kanallogon**, via `averageRgb`/canvas (`sport/backdrop.ts`); CORS-tainted eller saknad bild → neutral `#2b3142`. Cachas per bild-URL. |
| "Mest sedda just nu" | Ingen tittarstatistik | Sänds nu = senast sedda + favoriter först, sedan spellistans ordning, filtrerat på chip. |
| Hälsning "God eftermiddag Jerry" | Profilnamn finns kanske inte i SDK:t | Tid-på-dygnet-hälsning; namnet bara om SDK:t ger det defensivt, annars utan namn. |
| Fortsätt titta / Repris | `catchUpAcross` + `model.history` | Repris = catch-up-poster, Fortsätt = senast sedda kanaler (live). |
| Börjar snart | `useSchedules` | Program som startar inom 2 h på favoriter + senast sedda (max ~20 kanaler för att inte hämta hela tablån). |
| Starta om från början | Catch-up-URL per program | Visas bara när programmet har catch-up. |
| Live-förhandsvisning i guidens hero | `LivePreviewArt` + `settings.previewEnabled` | Återanvänds i 336×189-rutan. |

## Programbilder (Jerry 2026-10-30: "se om det går att koppla på bilder")

En kedja, första träff vinner:

1. **XMLTV `<icon src>`** per program. Kräver app-ändring: `src-tauri/src/xmltv.rs` läser
   `<icon src>` inuti `<programme>`, `Programme` får `icon: Option<String>`, EPG-lagret och
   `/api/live-tv/epg/*`-svaren bär fältet (`icon`, utelämnas när tomt). URL:erna internas per källa
   så att 300 000 program inte bär varsin kopia. Pluginets `EpgProgramme` får `icon?: string`, läst
   defensivt — äldre app ger inget fält och kedjan går vidare. Egen app-gren; följer nästa appsläpp.
2. **TMDb via appens titelsökning** (`/api/media` med titelfråga, finns redan): bara för
   **heron** (efter 300 ms debounce) och **kort som syns** i Upplevelses rader / Klassisks spotlight
   och Fortsätt titta — aldrig tablåns block. Träff kräver normaliserad exakt titelmatch (ev. år ur
   beskrivningen ignoreras); bilden = `backdrop_url`. Hoppa över titlar som ser ut som sändningar
   snarare än verk (innehåller "live", "news"/"nyheter", "highlights", "vs", "v ", siffra + "Day",
   kanalnamnet, eller kanalen ligger i en sport-/nyhetsgrupp). Cache per normaliserad titel i
   pluginlagring, **även missar**, 7 dygn; högst 2 uppslag samtidigt, högst 30 per minut.
3. Ingen träff → logoplatta.

`useProgrammeArt(channel, programme, { lookup: boolean })` → `{ url: string | null }` är enda
ingången för vyerna.

## Utseende

- Nya färgtoken i en egen modul (`tv/v2-tokens.ts`): `bg.base #161a23` (Skiffer), Grafit, Natt,
  ytorna `surface.1–5`, `surface.accent`, logoplattor, LIVE-färger, meny. **`TV.bg` (#000) ändras
  inte** — v2-bakgrunden målas bara av Kanaler och guiden, så sport/multivy/kanalsida påverkas inte.
- **Accent:** handoffen säger `#f4845f`. Appen har användarvald accent (`TV.acc` från
  `--accent-500`). Vi använder **appens accent** för fokusring, progress och nu-linje, med
  `#f4845f` som standardvärde när inget annat är valt — annars bryter guiden mot resten av appen.
- **Typografi:** handoffens px-värden är 1920×1080-designpixlar. TV-vyerna ritar redan i den
  skalade scenen med `dp()` (identitet), så värdena skrivs som `dp(n)` precis som i dagens
  guide/hubb. (Kontraktet `var(--st-*)` gäller appskalade ytor som inställningssidorna; inställnings-
  raderna nedan följer det.) Skrivbordet: samma komponenter; guiden skalas som idag.
- Fokus: ett system — korallring + skala enligt handoffen, ring inset i guiden. Endast en ring åt
  gången; rader dimmas till .8 när fokus ligger i hero/chips (Upplevelse).
- Ljusa logoplattor (`#f3f4f8`) med riktiga logor via `LiveTvLogoImage`; initialer som reserv.

## Guiden (Screen 2)

- `TvGuideShell` behålls som ägare av läge, kategori, fönster och markering, men ritar nytt:
  - **Herobandet** 276 px: rubrik + klocka + segmentkontroll (Nu/Sen · Tablå · Kanallista) på samma
    plats i alla lägen; titelrad (titel · nummer · kanal · tagg · kvalitet), tid + progress,
    2-radig beskrivning; live-förhandsvisning 336×189 uppe till höger (OK = fullskärm). Heron följer
    fokuserat **program** med 300 ms debounce.
  - **Kategorier:** kolumn 236 px (standard) eller chips — användarval.
  - **Kanalcell** 380 px: logoplatta 76×48 med nummerbricka, namn, "Kategori · HD", hjärta.
- **Nu/Sen:** Nu (1.3) · Sen (1) · Senare (1, dämpad).
- **Tablå:** 2-timmarsfönster, tick var 30:e min, block absolut placerade (återanvänder
  `epg-grid-geometry.ts` / `useGridRows`), nu-linje med glöd och klockbricka, "◂ tidigare",
  klocka på block med påminnelse. ◂▸ stegar program för program över hela dagen; fönstret följer.
  Behåller dagens ±12 h-förskjutning och Idag/I morgon om den finns i fönstret.
- **Kanallista:** nu-cell per rad + högerkolumn 560 px med tre programkort (Nu/Sen/Senare) för
  fokuserad kanal; ▸ in i korten, ▲▼ mellan dem, ◂ tillbaka.
- **Tangenter:** ▲▼ kanal (samma tidskolumn i Tablå), ◂ från första kolumnen → kategorikolumnen,
  **N** = till nu, **T** = växla Nu/Sen ↔ Tablå, **Bakåt** = till nu → kategorier → lämna guiden.
- **OK:** live → fullskärm; framtida → påminnelse av/på; passerat → repris (om catch-up finns).
- **Håll OK** → appens glasmeny (`nav.channelMenu` + `extra`) med innehåll efter programstatus
  (Framtida / Live / Passerat enligt handoffen). Ingen egen menykomponent — glasmenyn finns redan
  och är samma på hela TV:n.
- **Lagrat läge:** `GuideMode` får värdena `now | tl | list` för TV/skrivbord. Gamla sparade värden
  mappas: `nownext → now`, `grid | timeline → tl`, `playlists → list`. Telefonens
  `phoneGuideMode` lär sig `tl → grid` och `list → playlists` så att en synkad inställning inte
  förvirrar telefonen.
- Det som dör på TV/skrivbord (`GuideGridView`s grid-gren, `GuideDetailPanel`, `NowNextBanner`,
  lägesdelen i `GuideControlRow`, guidelägeskorten i TV-inställningarna) tas bort och läggs i
  `deleted-desktop-views.test.ts`. Det telefonen eller LAN-grenen använder behålls.

## Kanaler – Klassisk (Screen 1b)

Samma sektioner som dagens `TvHubDesktop`, ny design: toppradens sökfält-pill, spellistepill,
Kanalguide-pill, hälsning + klocka; Spotlight (3 kolumner), Favoriter (330×96-kort), Fortsätt titta
(330 breda), Alla kanaler (6 kolumner, chips högerställda). Geometrisk fokus som idag (appens
fokusmotor). OK på favorit öppnar guiden fokuserad på kanalen. Initial fokus = första spotlight-kortet.

## Kanaler – Upplevelse (Screen 1)

Ny komponent `TvHubExperience`: ambient tonbakgrund, hero (kicker, titel, meta + progress,
beskrivning, knapprad / tangentlegend), kategorichips, fem rader: Fortsätt titta · Sänds nu (3D-
coverflow) · Dina kanaler · Börjar snart · Utforska. Egen zonnavigering (hero → chips → rader)
med egen ◂▸▲▼-hantering som stoppar appens geometriska motor inom vyn — samma mönster som dagens
guide (`onKeyDown` + `preventDefault`/`stopPropagation`). Rad-scroll med transform, varje rad minns
sin kolumn. Utforska-kort öppnar guiden filtrerad på kategorin. Håll OK = glasmenyn.
Skrivbord: mus — första klick fokuserar, andra aktiverar (enligt handoffen); hjul scrollar rader.

## Inställningar

Nya fält i `TvSettings` (nyckeln `live_tv_tv_settings_v1` finns redan):
`hubLayout: 'classic' | 'experience'` (standard `classic`), `guideCategoryLayout: 'column' | 'chips'`
(standard `column`), `heroTint: boolean` (standard `true`), `liveBackground: 'slate' | 'graphite' | 'night'`
(standard `slate`). Rader i **båda** träden: TV `AppearanceTab` (raden måste ha `onOk` för att vara
en station) och skrivbordets `DesktopPage` (`LtChoiceRow`). Gäller direkt utan omstart; byte av
layout ger layoutens initiala fokus. Telefonens inställningssida rörs inte.

## Strängar

Alla nya nycklar i `tv-strings.ts` på alla fem språk (EN, SV, DE, FR, ES); skrivbordsinställningarna i
`hub-strings.ts`.

## Test och leverans

- Vitest per komponent enligt befintligt mönster (`LiveTvTvShell` + stub-SDK): exakt en `[data-init]`
  per vy, lägesmappning, tangenter N/T/Bakåt, menyinnehåll per programstatus, inställningsrader i
  båda träden, telefonens guide oförändrad.
- Visuell kontroll i `tv-sim.html` (1920×1080) och skrivbordsappen mot skärmdumparna.
- Version: live-tv 0.18.0. Bygg runtimen från ett rent app-worktree på lägsta app som bär använda
  SDK-medlemmar (troligen main/0.1.638); `minAppVersion` därefter. **Ingen release utan Jerrys
  klartecken.**
