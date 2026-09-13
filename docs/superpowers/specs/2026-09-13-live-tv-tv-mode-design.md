# Live TV – TV-läge (fjärrstyrd omdesign)

Datum: 2026-09-13
Repo: lumio-official-plugins, `plugins/live-tv`
Designkälla: `Moviefinder/design_handoff_live_tv_tv_mode/` (README + `Live TV - hi-fi.dc.html` + `screenshots/`)
Relaterad spec: `Moviefinder/docs/superpowers/specs/2026-09-13-video-surfaces-and-tv-sdk-design.md`

## 1. Mål

Live TV-pluginets TV-läge (`useTvMode() === true`) byggs om enligt handoffen: ikonrad, hubb, kanalguide i tre lägen, favoriter, kanaldetalj, sök, multivy, inställningar och en spelare där alla sekundära åtgärder ligger i glasmenyn. Allt styrs till 100 % med fjärrkontroll: pilar, OK, håll OK, Back, nummertangenter.

Skrivbord och mobil lämnas orörda.

## 2. Omfång

Ingår:

- Alla nio vyer i handoffen, i TV-läge.
- Spellisteval (aktiv spellista filtrerar hubb och guide).
- Sökvy med pluginets eget TV-tangentbord.
- Inställningsvy inne i Live TV.
- Multivy med 2, 1+2 och 4 rutor, byggd mot ett ytgränssnitt (avsnitt 6).
- Favoritordning med Flytta upp/ner.
- Nummertangenter och ChannelUp/Down.

Ingår inte:

- Inspelning ("Spela in"). Menyposter, knapp och inställningsflik utelämnas helt tills funktionen finns.
- Röstsök. Hjälptexten om mik-knappen utelämnas.
- Ändringar i skrivbords- och mobilvyerna.
- Flera samtidiga nativa videoytor i appen. Det är app-specen. Pluginet fungerar med dagens enda yta och byter automatiskt när appens API finns.

## 3. Arkitektur

### 3.1 Gren i inträdet

`runtime/index.ts`: `LiveTvBrowsePage` grenar på `useTvMode()`. TV renderar `LiveTvTvShell` från `runtime/tv/tv-shell.tsx`; övriga plattformar renderar som idag. Hooken anropas alltid (inga villkorliga hooks).

### 3.2 Filer

```
runtime/tv/
  tv-shell.tsx            ikonrad, vy-router, Back-stack, tangentzapp, lager
  tv-hub.tsx
  tv-guide.tsx            standardguide (Nu/Sen + Tablå) med toppband
  tv-guide-playlists.tsx  trekolumnsläget (handoffens Guide B)
  tv-favourites.tsx
  tv-channel.tsx          kanaldetalj
  tv-search.tsx           + tv-keyboard.tsx
  tv-multiview.tsx        + tv-channel-picker.tsx
  tv-settings.tsx
  tv-player-chrome.tsx    spelarens TV-lager (banner, ⋯, mini-guide)
  tv-ui.tsx               token, taggar, kort, förlopp, ikoner, fokus-CSS
  tv-strings.ts           EN/SV-strängar för TV-vyerna
  tv-settings-store.ts    live_tv_tv_settings_v1, live_tv_guide_mode_v1
  tv-multiview-store.ts   live_tv_multiview_v1
  tv-zap.ts               nummerbuffert och kanalnummer (ren logik)
  tv-schedule-window.ts   tablåfönster och blockpositioner (ren logik)
  video-surface.ts        ytgränssnitt (avsnitt 6)
```

Delas oförändrat: `live-tv-model.ts` (utökas, se 3.5), `live-tv-data.ts` (utökas), EPG-hooks, `catch-up.ts`, `channel-history.ts`, `reminders.ts`, `channel-locks.ts`, `live-tv-player.tsx` (får TV-lagret utbytt, se avsnitt 5.9), `PinGate`.

### 3.3 Vyer och navigering

Vyer adresseras via `params.view`: `hub` (standard) | `guide` | `favs` | `channel` | `search` | `multi` | `settings`. `guide` bär `mode` (`now` | `tl` | `playlists`) och `group`. `channel` bär dagens kanalparametrar (`encodeChannelParams`) plus valfritt `programme` (starttid i ms) för att förvälja ett program från sök.

Navigering mellan vyer går via `onNavigate` som idag, så värdens historik och direktlänkar fungerar. Skalet håller därutöver en **egen Back-stack** för lager (glasmeny, spellistmeny, kanalväljare, mini-guide, spårval) och för spelaren, som ligger ovanpå sidan i DOM:en.

Back-ordning:

1. Öppet lager stängs, fokus tillbaka till stationen som öppnade det.
2. Spelare stängs → tillbaka till vyn den öppnades från (guide, hubb, favoriter, kanaldetalj, multivy).
3. Kanaldetalj → guiden. Sök, favoriter, multivy, inställningar → hubben.
4. Hubben → `requestBrowseBack()` (lämnar Live TV).

Back fångas i skalet på `keydown` i capture-fas för `Escape`, `Backspace` och `GoBack`, med `stopPropagation` bara när skalet själv hanterar steget, så värdens motor tar över i steg 4.

### 3.4 Ikonrad

Pluginets egen rad till vänster (104 designpx = 68 px): Sök, Hem, Kanalguide, Multivy, Favoriter, och Inställningar längst ner. Aktiv post markeras. Raden döljs i spelaren. Raden får **inte** `data-col="side"`: värdens Back-regel skulle då flytta fokus till raden i stället för att gå bakåt. Raden är vanliga stationer; från vyns första kolumn når man den med ◂.

Värdens menychip är redan dolt för sid-id:t `live-tv-browse`.

### 3.5 Modellutökning

`LiveTvModel` får:

- `playlists: { id, name, count }[]` ur `lists`.
- `activePlaylistId: string | null` (null = alla). Sparas i `live_tv_active_playlist_v1`. `channels`, `groups`, `byKey`, `byUrl` filtreras på vald lista. Favoriter, historik och påminnelser filtreras **inte**, de visar kanaler oavsett lista.
- `setActivePlaylist(id | null)`.
- `channelNumber(channel): number` = 1-baserat index i den filtrerade listan.
- `pinnedKeys` behåller sparad ordning; `live-tv-data.ts` får `movePinnedLiveTvChannel(key, delta)`.

### 3.6 Fokus

- Varje klickbar yta är EN station (`data-f`). Inga inre knappar på kort.
- `data-init` per vy: hubb = första spotlightkortet; guide = raden för vald kanal; kanaldetalj = pågående program; spelare = ⋯-knappen; sök = första tangenten; multivy = rutan med ljud; inställningar = aktiv flik; favoriter = första kortet.
- Lager är `data-panel-root`. Fokus återställs till öppnande station vid stängning (samma mönster som `TvGlassMenu`).
- Scrollande ytor bär `data-scroll` (vertikalt) eller `data-row` (horisontellt).
- ◂▸ på kanalrader styrs med `data-f-left` / `data-f-right` mot kategorichips respektive kolumner, så värdens motor gör hoppet.
- Fokusring: 2 px accent, offset 3, glöd 28 px, injicerad som `<style>` från `tv-ui.tsx` scopad till `[data-live-tv-tv-root]`. Ersätter värdens 1 px-ring inom Live TV.

### 3.7 Mått och färg

Alla mått i handoffen är designpx för 1920×1080, och i pluginkod skrivs de RAKT AV som px. `tv-ui.tsx` exponerar `dp(n)` = `n` för spårbarhet, samt token `TV` (ytor, linjer, live, accent via `var(--accent-500)`).

Här stod tidigare att måtten ska delas med 1,54 (`dp(n) = Math.round(n / 1.54)`), efter handoffens genväg "pluginet skalas redan med `--tv-base-scale: 1.54`". Det gällde aldrig råa px. Appens `lib/tv-scene.ts` lägger ut hela TV-läget i en scen med fast designhöjd (1080) och skalar scenen med en `transform`; en px inne i scenen ÄR alltså en designpixel på varje skärm. `--tv-base-scale` bor i `--tv-u`, och `lib/tv-metrics.ts` säger det rakt ut: `tvFont(n)`/`tvBox(n)` = n designpixlar just för att råa px inte bär den skalan. Divisionen gav ett TV-läge ritat 1,54 gånger för litet — uppmätt i tv-sim på 1920×1080 (scenskala 1): ikonraden 68 px i stället för 104, hubbtiteln 22 px i stället för 34. Efter rättningen mäts ikonraden till exakt 104 och titeln till 34. Bara mått uttryckta i `rem` eller `var(--tv-u)` skulle behöva ÷1,54.

Känd begränsning att provköra på riktig TV: råa px följer inte appens inställning för gränssnittsskala (`--ui-scale`), som appens egna TV-ytor plockar upp via `tvFont`/`tvBox`. Live TV:s TV-läge skalas alltså bara med scenen, inte med användarens skalinställning.

Bakgrund `#000`. Text `#f3f4f8`. Accent `rgb(var(--accent-500))`, accentText `#ffd9c9`. Text på accentfylld yta alltid `#fff`.

### 3.8 Fjärrtangenter i skalet

- `0–9`: när inställningen `numericZap` är på. Buffert med 1,5 s timeout, visas som en liten ruta uppe till höger. Vid timeout eller OK: favoriter 1–N först, annars listnummer i aktiv spellista. Träff spelar kanalen; miss visas 1 s och försvinner.
- `ChannelUp` / `ChannelDown` (och `PageUp` / `PageDown` som fallback): i spelaren byter kanal i guidens ordning.
- Medietangenter går som idag via värdens brygga.

## 4. Lagring

| Nyckel | Innehåll |
|---|---|
| `live_tv_tv_settings_v1` | `{ previewEnabled: true, startOnLastChannel: false, numericZap: true, bannerHideMs: 4000 \| 2000 \| 6000 \| 0 }` |
| `live_tv_guide_mode_v1` | `'now' \| 'tl' \| 'playlists'` |
| `live_tv_active_playlist_v1` | `string \| null` |
| `live_tv_multiview_v1` | `{ layout: 2 \| 3 \| 4, tiles: (string \| null)[], audioIndex: number }` |

Alla via `readPluginJson` / `writePluginJson` med `onPluginStorageChanged`. `bannerHideMs = 0` betyder aldrig.

## 5. Vyer

Layout, mått, färger och texter följer handoffens README och skärmdumpar. Här står beslut som handoffen lämnar öppna eller som avviker.

### 5.1 Hubb

- Topprad: titel, spellistpill, sökchip (navigerar till `search`), Kanalguide-knapp, klocka (avsnitt 7).
- Spellistmeny: `data-panel-root`, poster för varje lista plus "Alla spellistor" först, sist "+ Lägg till spellista …" → `settings` med fliken Spellistor.
- Spotlight: 3 kort. Urvalsregel som idag: första favorit som sänder live → favoriter → senast sedda → första kanal med tablå. Orsakstaggen kommer ur regeln som träffade. Bild: sparad bildruta (`playerFrameUrl`) → logotyp → initialer.
- Favoriter: sidoscrollande rad. OK = kanaldetalj, håll = kanalmeny.
- Fortsätt titta: `catchUpAcross` + kanalhistorik, repriser först. Kortet spelar reprisen via `buildTimeshiftUrl`.
- Alla kanaler: kategorichips (Alla, Favoriter, spellistans grupper via `topGroups`, tak 12), rutnät 6 kolumner, 36 kort i första steget, "Visa fler" i steg om 36 som egen station.
- Tom hubb: dagens `hubEmptyTitle` / `hubEmptyBody` med en station som öppnar `settings`.

### 5.2 Kanalguide (standard)

- Toppband med tyst förhandsvisning (480×270 designpx) via ytgränssnittet. Fokus på en kanalrad uppdaterar text direkt; ström byts efter 300 ms debounce. Med `previewEnabled = false` krymper bandet, sparad bildruta visas i stället.
- Kategorirad: Alla, Favoriter, grupper. Segmentväxel med tre val: Nu/Sen, Tablå, Spellistor. Val sparas i `live_tv_guide_mode_v1`. Spellistor byter till `tv-guide-playlists.tsx`.
- Nu/Sen-läge och tablåläge delar radkomponent. Tablåfönster: föregående hela halvtimme minus 30 min, 2 h brett, nu-linje. Blockpositioner räknas i `tv-schedule-window.ts`.
- Rader i steg om 40, "Visa fler" som station längst ner. Kanaler utan tablå visas med "Ingen programinformation", filtreras inte bort.
- OK på raden = spela. OK på förhandsvisningen = spela.

### 5.3 Kanalguide · spellistor

- Vänster: varje spellista som rubrikrad med sina grupper indragna, sist Favoriter. Fokus byter kolumn med ◂▸.
- Mitten: kanalrader för vald lista/grupp. Fokus = vald kanal.
- Höger: förhandsvisning (samma regler) och Nu/Sen/Senare-kort. OK på Nu = spela; OK på Sen/Senare = `toggleReminder`, kortets hjälprad byter till "Påminnelse satt".

### 5.4 Favoriter

- Rutnät 3 kolumner i `pinnedKeys`-ordning. Kortets favoritnummer = index + 1.
- Hållmeny: kanalmenyn plus Flytta upp / Flytta ner. Fokus följer kortet efter flytt.
- "+ Lägg till från guiden" → `guide` med `group=all`.

### 5.5 Kanaldetalj

- Tre kolumner: tablå (dagrubriker Igår/Idag/…), dagväljare −2…+2, detalj.
- Fokus på programrad uppdaterar detaljkolumnen. OK = detaljens primärknapp: Spela repris (kräver `channelSupportsCatchUp` och programmet passerat), Titta nu (pågår), Påminn mig / Ta bort påminnelse (framtid).
- Förhandsvisning i detaljkolumnen: kanalens ström tyst när programmet pågår, annars sparad bildruta med etikett `repris · tillgänglig N dagar` / `börjar HH:MM`.
- Kanalinformation: Kvalitet (`qualityFromName`), Källa (listans namn + värd), Repris (dagar ur `tv_archive`), PIN-toggle via `PinGate` och `toggleChannelLock`.
- Hjärta uppe till höger togglar favorit.
- Öppnas med `programme` i params: raden förväljs och får `data-init`.

### 5.6 Sök

- Vänster: pluginets eget tangentbord (`tv-keyboard.tsx`). Rader: `1234567890` / `qwertyuiopå` / `asdfghjklöä` / `zxcvbnm,.-` samt raden mellanslag · ⌫ · `123?` (växlar till tecken) · Klar. Layout från handoffens mått. Första tangenten `data-init`.
- Sök körs vid varje tryck mot kanalnamn och dagens EPG-titlar i aktiv spellista, max 30 kanaler och 30 program.
- Förslagsrad: upp till 6 chips med kanalnamn/titlar som börjar på söksträngen. OK fyller fältet.
- Höger: Kanaler (OK = kanaldetalj) och Program idag (OK = kanaldetalj med programmet valt). Håll på kanal = kanalmenyn.

### 5.7 Multivy

- Layouter 2, 1+2, 4. Tillstånd i `live_tv_multiview_v1`.
- Varje ruta binder en yta via `useVideoSurface`. Ljudrutan är alltid levande. Övriga är levande om ytgränssnittet rapporterar kapacitet, annars sparad bildruta uppdaterad var 10 s genom att ytan i tur och ordning tar en bildruta (se 6.3).
- Tom ruta: `+ Välj kanal` → kanalväljaren (högerpanel, `data-panel-root`, kategorichips + kanalrader). OK tilldelar och stänger.
- Rutmeny (håll OK): Ljud hit · Byt kanal · Förstora (layout 1+2 med rutan först) · Helskärm (öppnar spelaren med rutans kanal) · Ta bort ruta.
- "Lägg till i multivy" från kanalmenyn: första lediga ruta, annars sista. Navigerar inte; visar en kort bekräftelse.

### 5.8 Inställningar

Flikar: Utseende, Spellistor, EPG-källor, Föräldrakontroll. Handoffens flikar Inspelning och Uppspelning utelämnas: inspelning finns inte, och pluginet har inga egna uppspelningsval (fallbacktrappan i `live-tv-playback-fallback.ts` är fast, och göm-tiden för kontroller läses redan ur appens inställning).

- Utseende: Accentfärg med appens förval (`ACCENT_PRESETS` via SDK, avsnitt 7; sektionen döljs om SDK:t saknar dem). Kanalguidens standardvy: tre kort. Beteende: förhandsvisning, starta på senaste kanalen, nummertangenter, dölj infobannern efter 2 s / 4 s / 6 s / aldrig.
- Spellistor: listor med namn, antal, hämtad-tid; Lägg till M3U-URL / Xtream-inloggning (text via värdens `TvKeyboardPanel`), Hämta om, Ta bort. Återanvänder datalagrets funktioner; UI är nytt i TV-form.
- EPG-källor: lista + lägg till/ta bort URL, samma mönster.
- Föräldrakontroll: låsta kanaler som lista med Lås upp; kräver profil-PIN som idag.

### 5.9 Spelare

`LiveTvPlayer` behålls. På TV renderas `tv-player-chrome.tsx` i stället för dagens kontrollrad och `PlayerScheduleOverlay`.

- Topp: Back (52 designpx) + `nr · kanal`; höger LIVE-tagg · kvalitet · klocka.
- Infobanner nederst: titel, `tid · N min kvar · Sen <titel>`, förlopp, hjälptext och ⋯-knapp (`data-init`). Döljs efter `bannerHideMs`; ▲, ▾ eller fokusrörelse visar den igen.
- ▾ eller menyvalet Guide öppnar mini-guiden: sidoscrollande kort i guidens ordning med aktuell kanal centrerad. OK byter kanal via `onSwitchChannel`. Back stänger.
- Glasmeny (⋯ eller håll OK): Guide · Multivy · Lägg till i/Ta bort från favoriter · Kanaldetaljer · Paus/Spela. "Ljud & undertext" ur handoffen skjuts upp: dagens spelare har inget spårval och SDK:t exponerar inte mpv:s spårlistor; posten läggs till när `getMpvAudioTracks`/`setMpvAudioTrack` finns i SDK:t.
- ChannelUp/Down byter kanal i guidens ordning. Nummertangenter zappar.
- Starta på senaste kanalen: när inställningen är på och `hub` öppnas utan params och historiken har en kanal, öppnas spelaren direkt. Back från spelaren går då till hubben.

## 6. Ytgränssnitt (`video-surface.ts`)

### 6.1 Gränssnitt

```ts
interface SurfaceSource { channel: M3uChannel; url: string }
interface VideoSurfaceOptions { muted: boolean; audio?: boolean }
interface VideoSurfaceHandle {
  ready: boolean          // ytan spelar och har ritat en bildruta
  failed: boolean
  live: boolean           // riktig ström (false = bildruta-fallback)
  frameUrl: string | null // senaste sparade bildruta för kanalen
}
function useVideoSurface(
  rectRef: RefObject<HTMLElement>,
  source: SurfaceSource | null,
  options: VideoSurfaceOptions,
): VideoSurfaceHandle
function videoSurfaceCapabilities(): { maxLive: number }
```

`rectRef` mäts med `ResizeObserver` och vid scroll; bounds skickas till ytan i CSS-px. Ytan stängs vid unmount eller `source = null`.

### 6.2 Implementation med appens fler-yte-API

När `sdk.createVideoSurface` finns (app-specen) skapar hooken en yta per anrop. `maxLive` kommer från `getVideoSurfaceCapabilities()`.

### 6.3 Implementation med dagens enda yta

När API:t saknas:

- `maxLive = 1`. Endast en `useVideoSurface` med `audio: true` (eller den enda aktiva) får den nativa ytan, via dagens `openMpvPlayer` / `openNativePlayer` + `setBounds`, muted när `muted`. På HTML-motorn används ett `<video muted>` positionerat över rektangeln i en fixed portal.
- Övriga anrop får `live = false` och `frameUrl` = senast sparade bildruta för kanalen (`playerFrameUrl`). Ingen rundgång: att låta den enda ytan byta kanal för att ta bildrutor hade brutit ljudrutan i flera sekunder per cykel. Rutan visar bildrutan (eller logotyp) med etiketten "bildruta". Riktiga ytor kommer med app-specen.

Spelaren själv använder inte gränssnittet; den äger den nativa ytan när den är öppen. Guidens förhandsvisning stängs alltid innan spelaren öppnas.

## 7. Värdberoenden

| Behov | SDK idag | Fallback i pluginet |
|---|---|---|
| Glasmeny | `getTvGlassMenu()` | krävs (finns sedan appens TV-läge) |
| Håll OK | `tvHoldHandlers` | krävs |
| TV-tangentbord för URL-inmatning | `getTvKeyboardPanel()` | text-inmatning döljs, hänvisning till appens inställningar |
| Klocka | saknas → `getTvClock()` (app-spec) | enkel lokal klocka med minutbyte |
| Accent | saknas → `getAccent/setAccent/ACCENT_PRESETS` (app-spec) | accentsektionen döljs |
| Håll-tid | `TV_HOLD_MS` saknas i SDK | lokal konstant 650 |
| Flera videoytor | saknas → `createVideoSurface` (app-spec) | avsnitt 6.3 |

`minAppVersion` lämnas på 0.1.58. Alla nya SDK-funktioner läses via `sdk as unknown as {...}` som `getTvGlassMenu`-mönstret idag.

## 8. Strängar

`tv-strings.ts` med EN/SV enligt `hub-strings.ts`-mönstret (`useTvText()`). Befintliga nycklar återanvänds där texten är densamma. Svenska texter tas från handoffen.

## 9. Fel- och tomlägen

- Ingen kanallista: hubbens tomläge med station till inställningar.
- Guide utan tablå: "Ingen programinformation" per rad; kalla EPG-cachen: "Hämtar tablå…" i toppbandet.
- Förhandsvisning misslyckas: bandet faller tillbaka till sparad bildruta utan felruta; loggas i debug-loggen.
- Multivy-ruta misslyckas: rutan visar kanalens logotyp och "Kunde inte spela" som text, hållmenyn fungerar fortfarande.
- Låst kanal: `PinGate` före spelning, i alla vyer, som idag.

## 10. Tester

Vitest (ren logik):

- `tv-schedule-window.test.ts`: fönsterstart, blockens left/width i procent, klippning vid fönsterkanter.
- `tv-zap.test.ts`: buffert, timeout, favoriter före listnummer, miss.
- `live-tv-data`: `movePinnedLiveTvChannel` gränser.
- `live-tv-model`: filtrering på aktiv spellista, `channelNumber`.
- Sök: filtrering och förslag.
- Multivy-tillstånd: tilldela, ta bort, förstora, ljudindex vid borttagning.
- Spotlight-urval med orsak.

Rendering (happy-dom, som `live-tv-hub.test.tsx`):

- Varje vy har exakt en `data-init` när den monteras med testdata.
- Hållmenyerna innehåller rätt poster och saknar "Spela in".
- Back-stacken: lager → spelare → vy → `requestBrowseBack`.

Visuellt: varje vy i `http://localhost:5173/tv-sim.html` (1920×1080) jämförs mot handoffens skärmdump, och pilnavigering körs igenom per vy med tangentbord.

## 11. Bygge och release

- Pluginet byggs från `Moviefinder/.worktrees/main-plugin-build` (aldrig från en arbetsgren), `dist/runtime.js` byggs om **före** versionsbump.
- Version 0.4.0. `CHANGELOG.md` beskriver TV-läget; inga referenser till AI i commit eller noter.
- Ingen release eller push utan Jerrys klartecken.
