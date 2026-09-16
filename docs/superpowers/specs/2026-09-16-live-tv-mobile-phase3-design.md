# Live TV – fas 3, telefonen i riktiga pixlar

Datum: 2026-09-16. Ersätter telefongrenen ur `2026-09-14-live-tv-mobile-phase2-design.md`
(fas 2). Utseende, mått och interaktioner är normativa i
`Moviefinder/design_handoff_live_tv_mobile/` (`README.md` + `Live TV - mobil.dc.html`,
arbetsordning i `IMPLEMENTATION.md`). Den här specen säger hur handoffen mappas på koden
och vilka beslut som fattats där handoffen lämnade dem öppna.

## Problemet

Fas 2 gav telefonen en egen designbredd (780 dp, skala ≈ 0,5) och en meny i en låda.
Resultatet är TV-läget nedskalat: flerkolumnslayouter i 390 px, texter klippta till
`EN| …`, spelare där titel och kontroller ligger ovanpå varandra, fjärrkontrollens
hjälptexter. Handoffen kräver det motsatta: en **mobilgren i samma TV-komponenter** som
renderar i enhetens egna css-px, utan scenskalning, med flik-rad, bottenark och en kolumn.

## Beslut

| Fråga | Beslut |
|---|---|
| Bas | Plugin från `feature/live-tv-mobile-phase2` (0.8.0 → **0.9.0**); app från `feature/live-tv-mobile-phase2-app` (0.1.599 → **0.1.600**). Lockstep som förut. |
| Tröskel | **640 css-px**, mätt mot lådans **kortaste sida**. Telefon i liggande (844×390) är telefon; iPad porträtt (768×1024) är det inte. |
| Skalning | Appen ger telefongrenen **skala 1** och lagret = lådans egna mått. Pluginet kompenserar inget. |
| Fas 2:ans telefongren | Tas bort: lådan, `PHONE_HIT_MIN_DP`, `PHONE_TEXT_MIN_DP`, `phoneTextFloor`, `CHANNEL_COLUMN_PHONE_MIN_DP`, golvtesterna, per-komponent-anropen av `usePhoneSurface`. |
| Guidelägen | Nycklarna `now`/`tl`/`grid`/`playlists` behålls i lagringen. På telefon visas tre segment: **Now** (`now`; ett lagrat `tl` visas som Now), **Timeline** (`grid`), **Lists** (`playlists`). Ingen migrering. |
| Record | Ritas inte — det finns ingen inspelning. Spelarens 2×2-rutnät blir Audio & subs · Auto · Channel info · Guide. |
| Keep screen awake | Ny inställning `keepAwake` (default på). `navigator.wakeLock?.request('screen')` medan spelaren är öppen; tyst fallback, återtas vid `visibilitychange`. |
| Fullscreen on rotate | Ny inställning `fullscreenOnRotate` (default på). `matchMedia('(orientation: landscape)')` i spelaren → liggande krom när ström spelar. |
| Multivy | Tak två rutor, staplade. `layout` i store:t lämnas orört; bara `tiles[0..1]` renderas. Två samtidiga strömmar som i dag. |

## 1. Flaggan och skalan (appen)

`lib/tv-scene.ts`:
- `TV_SCENE_PHONE_PX = 640`. `tvSceneBox()` räknar `phone = min(contentWidth, contentHeight) < TV_SCENE_PHONE_PX`.
- I telefongrenen returneras `{ scale: 1, width: contentWidth, height: contentHeight, narrow: true, phone: true }`. `TV_SCENE_PHONE_WIDTH` tas bort tillsammans med dess kommentar; `applyTvSceneBox` är oförändrad (skriver skala 1 och lådans mått).
- `narrow` sätts fortsatt (`contentWidth < 1024`) — en telefon är alltid också smal.

Tester i `lib/__tests__/tv-scene-box.test.ts`: 390×844 → skala 1, width 390, phone; 844×390 → phone; 639×900 → phone; 640×900 → inte phone; 768×1024 → inte phone, narrow, skala 768/1280.

Pluginets `usePhoneSurface` är oförändrad: den läser `data-tv-scene-phone`, och lådan mäter om sig vid rotation (`observeTvSceneBox`). `useSceneBoxScale` svarar 1 på telefon, vilket är rätt för klockan.

## 2. Pluginets skal (`tv-shell.tsx`)

- `phone = usePhoneSurface(rootRef) && !isTv` läses **en gång** och skickas ned i `TvViewProps` som `phone: boolean`. Alla vyer och underkomponenter läser propen; inga fler `usePhoneSurface`-anrop under skalet.
- Roten får `data-lt-phone="1"` när `phone`. Pluginets `TvFocusStyle` kompletteras med `[data-lt-phone="1"] [data-f]:focus { outline: none; box-shadow: none }`.
- När `phone`: ingen ikonrad, ingen låda, ingen `TvHoldAffordance`, ingen `TvGlassMenu`, ingen `zapDigits`. I stället `MobileTabBar` under `<main>` och `MobileSheet` som `openMenu`-mål.
- `TvNav` oförändrad i form. `openMenu(target)` och `channelMenu(...)` fungerar som i dag men landar i `MobileSheet` när `phone`. `pushLayer` används av arket, Lists-nivå 2 och More-arket så Bakåt/svep poppar dem i ordning.
- Rotens `fontSize` på telefon: 15 px, `lineHeight` 1.4.

## 3. Nya delade byggstenar (`runtime/tv/mobile/`)

| Fil | Ansvar |
|---|---|
| `mobile-tokens.ts` | `MT`: handoffens tokens i riktiga px (bg, text, muted/dim/faint, ytor .05–.16, linjer .07/.08/.10, ark, scrim, live-färger, radier, typskala, `HIT = 44`, `TAB_BAR = 52`, `SAFE_BOTTOM = 'env(safe-area-inset-bottom, 18px)'`, `HEADER_LEFT = 60`). Ingen import från `TV` i `tv-ui.tsx`. |
| `mobile-header.tsx` | 52 px hög, `padding: 0 16px 0 60px`, titel 21/600 (ellips), valfri höger-pill (36 px). |
| `mobile-tab-bar.tsx` | Fem flikar Home · Guide · Favourites · Search · More. Aktiv från `nav.view` (`channel` → Guide, `multi`/`settings` → More). More öppnar ett `MobileSheet` med Multiview + Settings. Renderas inte när `nav.playerOpen`. `position: fixed; bottom: 0`, 52 px + safe area, gradient + blur. |
| `mobile-sheet.tsx` | Bottenark. Props: `target: TvGlassMenuTarget` (samma typ som värdens glasmeny — header/items återanvänds oförändrade) eller `{ header?, items, onClose }`. `role="dialog"`, scrim, `lumio-fade` 160 ms, Escape stänger, registreras via `nav.pushLayer`. Rader 56 px, primärpost 600, Avbryt-yta 50 px i 8 px ram över safe area. |
| `mobile-channel-row.tsx` | **Den viktigaste komponenten.** nr (26 px, tabular, högerställt) · logotyp · textstack `flex:1; min-width:0` med ellips per rad · hjärta/lås. `variant: 'guide' \| 'zap' \| 'search' \| 'sheet'` styr logotypmått (56×38 / 48×32) och vilka rader som visas (namn, nu-titel, förlopp + `N min`, `Next HH:MM Titel`, eller `No programme info` + `grupp · kvalitet`). `onPress` = spela, `onLongPress` = ark (`tvPointerHoldHandlers`-timing, ingen affordance). Kanalnamnet ligger **helt** i DOM — ellipsen är CSS. |
| `mobile-segment.tsx` | Segmentväxel, full bredd, `padding 3`, radius 999, segment 36 px (38 px i inställningar). |
| `mobile-chips.tsx` | Sidoscrollande chip-rad, chips 34 px i en rad ≥ 44 px, aktiv `.16` + kant + 600. |
| `mobile-logo.tsx` | Kanalbild: `playerFrameUrl` → `LiveTvLogoImage` → initialer. Mått via props. |

Ikoner: Phosphor regular som inlinead SVG, 24-rutnät, stroke 1.8, i `mobile-icons.tsx`
(house, list, heart, magnifying-glass, gear, caret-left/right, play, speaker-high/slash,
bell, lock, squares-four, arrows-out, dots-three, list-handle).

## 4. Vyerna

Mönster: varje `tv-*.tsx` får en tidig gren `if (phone) return <XPhone …/>`. Telefongrenen
delar hooks, modell, sortering och urval med TV-grenen — bara renderingen byts. Ligger
TV-varianten redan över ~400 rader bor telefongrenen i `mobile/x-phone.tsx`; annars i
samma fil. TV/skrivbord rör inte en rad i sin gren.

| Vy | Telefongren | Acceptans |
|---|---|---|
| Hub | Header "Live TV" + spellistpill → sökfält (tryck → Search) → **ett** spotlight-kort (dagens `tv-spotlight.ts`) → Favourites-sidoscroll (156×72, scroll-snap) → Continue watching (170 px) → All channels 2 kolumner med kategorichips + `results-pagination`. `scroll-padding-bottom: 96px`. | Inget horisontellt spill vid 320 px. |
| Guide · Now | `MobileSegment` Now/Timeline/Lists → `MobileChips` kategorier → `MobileChannelRow variant="guide"`. `TvPreview` monteras inte. Ingen `onFocus`-logik, ingen debounce. | Första kanalraden syns utan scroll på 390×844. Ingen `TvPreview` i DOM. |
| Guide · Timeline | Kanalkolumn 112 px `position: sticky; left: 0`, tidsspår i x-scroll, 90-min-fönster i ~260 px (px/min som parameter till `epg-grid-geometry.ts`), rad 64 px, Nu-linje, Nu-knapp, datumrad. | Nu-linjen på rätt x vid 90 min; block klipps inte utanför spåret. |
| Guide · Lists | Drill-down. Nivå 1: filterfält + Favourites-sektion (accentkort) + sektion per spellista med kategorirader (antal högerställt, `Show all N`). Nivå 2: `listsPath` i vyns state, samma `MobileChannelRow`, header med kategorinamn, `pushLayer` så svep/Bakåt poppar. | Nivå 2 återanvänder raden; svep höger går till nivå 1. |
| Kanaldetalj | Header namn + hjärta → kanalrad (72×46) → primärknapp 48 px full bredd (`Watch now` / `Play replay` / `Remind me`, TV:ns regler) → dagchips → programrader `min-height: 60px`. Tryck på rad → programark (`MobileSheet`) med beskrivning, primärknapp; kanalinfo + PIN-lås under `Channel info`. | ±2 dagar nås utan klippta chips. |
| Favoriter | Header + Edit-pill; rader 74 px med ordningsnummer, logotyp 64×42, textstack, dra-handtag. Drag via pointer events (ingen extern lib) skriver `pinnedChannels`-ordningen. Sist `+ Add from the guide`. | Omordning överlever omstart. |
| Sök | `<input>` 16 px med systemtangentbord; `TvKeyboardPanel`/`tv-text-entry` monteras inte. Förslagschips. Grupper Channels (68 px) och Programmes today (56 px). Tomt läge centrerat. | Ingen iOS-zoom; ingen `TvKeyboardPanel` i DOM. |
| Multivy | Header + Swap; underrad Audio; två rutor 220 px staplade, AUDIO-tagg, tyst-knapp 34 px; tom ruta → kanalark. Knapprad Change channel / Fullscreen. Kanalväljaren = `MobileSheet` med chips + `MobileChannelRow variant="sheet"`. Segmentväxeln 1+2/4 renderas inte. | `layout` 4 i store:t → ändå två rutor. |
| Inställningar | Sektionslista med kort: Playlists (namn + statustagg på raden, meta under, **knappar under texten**), Add M3U / Xtream / Create list som 52 px rader; Guide default segment 38 px; Behaviour: Start on last channel · Keep screen awake · Autoplay in fullscreen on rotate; More: EPG sources · Parental control. `previewEnabled`/`numericZap`/`bannerHideMs` visas inte. | Inget överlapp i spellistekortet på 320 px. |
| Spelare · porträtt | Video 16:9 (`object-fit: contain`) med överlägg (Back 40, LIVE + kvalitet, volym · förlopp · helskärm; döljs efter 4 s). Under: kanalrad → titel 22/600 två rader → tid → Next → 2×2-rutnät 46 px → Zap-lista (favoriter först, `MobileChannelRow variant="zap"`). `PlayerScheduleOverlay` monteras inte. | Titel och kontroller överlappar aldrig. |
| Spelare · liggande | Helskärm; banner `padding: 44px 60px 22px`; toppraden Back + `nr · namn` vänster, LIVE + `HD · HH:MM` höger; infoblock `flex:1; min-width:0` + kontroller `flex:0 0 auto` på samma rad; förlopp 5 px på egen rad under. | 844×390: titel och volym överlappar inte. |

### Strängar
Hjälpsträngarna (`OK = titta`, `håll OK = meny`, `◂▸ kategori`, `liveström, tyst · OK = helskärm`, multivyns hjälprad) renderas aldrig när `phone` (test: ingen text som matchar `/\bOK\b|håll/` i DOM). Nya EN/SV-strängar i `tv-strings.ts`: fliketiketter, `Watch now`, `Next`, `N min`, `No programme info`, `Show all N categories`, `Add from the guide`, `Programmes today`, `N hits`, `Swap`, `Audio`, `Select channel`, `Change channel`, `Fullscreen`, `Keep screen awake while playing`, `Autoplay in fullscreen on rotate`, `Cancel`.

### Inställningsstore
`tv-settings-store.ts`: `keepAwake: boolean` (default `true`), `fullscreenOnRotate: boolean` (default `true`). Läses defensivt som de andra fälten.

## 5. Vad som tas bort ur fas 2

- `tv-shell.tsx`: `railOpen`, `railRef`, `drawerItem`, `backFromRail`, `layerOffRef`, öppningsknappen, lådan. `tv-shell-phone.test.tsx` skrivs om mot flik-raden.
- `tv-ui.tsx`: `PHONE_HIT_MIN_DP`, `PHONE_TEXT_MIN_DP`, `phoneTextFloor`. `tv-guide-shared.tsx`: `CHANNEL_COLUMN_PHONE_MIN_DP` och `channelColumnStyle`-telefongrenen.
- Alla `usePhoneSurface(...)`-anrop i vyer/komponenter (19 st) → `phone`-prop.
- Golvtesterna (M-P4) i `*.test.tsx` som mäter `minHeight ≥ 88` / `fontSize ≥ 28`.

Fas 2:ans app-del (`TV_SCENE_PHONE_ATTR`, `usePhoneSurface`, `useSceneBoxScale`, klockan i lådan) behålls.

## Avgränsningar

Ingen ny datamodell, ingen ny lagring utöver två inställningsfält. Inga animationer utöver arkens fade och Lists-drill-downens push/pop. Ingen inspelning. Tablett i porträtt (≥ 640) får fortsatt fas 1:s skalade smala TV-gren.

## Test

Plugin (vitest, happy-dom): befintliga tester körs med `phone=false` oförändrade. Nya fall per vy med `phone=true`: förhandsvisning, TV-tangentbord, glasmeny och hold-affordance monteras inte; `MobileChannelRow` har hela namnet i DOM; träffytor har `minHeight ≥ 44`; ingen text < 13 px; tab-raden borta när `playerOpen`; arket stängs av Bakåt via `pushLayer`; multivyn renderar två rutor vid `layout: 4`; favoriternas drag skriver ny ordning.

App (vitest): `tvSceneBox` vid 390×844, 844×390, 639×900, 640×900, 768×1024.

Visuellt (Playwright mot tv-sim/dev-servern): 320×568, 390×844, 430×932, 844×390 — inget horisontellt spill, alla elva skärmar mot handoffens ramar.

Manuell verifiering är Jerrys, på riktig telefon (iOS + Android): test-DMG/APK byggs; ingenting släpps utan klartecken.

## Versioner och grenar

App: `feature/live-tv-mobile-phase3-app` från `feature/live-tv-mobile-phase2-app`, version
0.1.600. Plugin: `feature/live-tv-mobile-phase3` från `feature/live-tv-mobile-phase2`,
version 0.9.0, `minAppVersion` 0.1.600. Arbetsträd: `.worktrees/mobile-phase3` respektive
`.worktrees/mobile-phase3-app`. `dist/runtime.js` byggs mot fas 3-appträdet FÖRE
versionsbumpen. Appen släpps före pluginet.
