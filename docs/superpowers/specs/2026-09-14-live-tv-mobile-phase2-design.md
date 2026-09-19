# Live TV – fas 2, telefonen

Datum: 2026-09-14. Fortsättning på `2026-09-14-live-tv-desktop-mobile-design.md` (fas 1, skrivbord)
och `2026-09-14-live-tv-logos-v2-design.md` (föregående omgång).

## Problemet

Fas 1 gav telefonen samma komponentträd som TV och skrivbord, och var ärlig om priset:
scenen håller golvet `TV_SCENE_MIN_WIDTH_PX = 1280` och gör scenen HÖGRE i stället för
smalare. En 390 px telefon får därmed skalan 0,3 — 32 designpixlars rubrik landar på
6–7 riktiga pixlar. Telefonen "fungerar, litet". Fas 2 gör den läsbar.

## Vad som byggs

### 1. Egen designbredd för telefonen (appen)

`lib/tv-scene.ts` får en telefongren: när lådans innehållsyta är smalare än
`TV_SCENE_PHONE_PX = 700` css-px räknas scenen mot designbredden
`TV_SCENE_PHONE_WIDTH = 780` i stället för 1280-golvet.

| Yta | Före | Efter |
|---|---|---|
| 390 px (iPhone 13 mini) | skala 0,20 → 32 dp = 6 px | skala 0,50 → 32 dp = 16 px |
| 430 px (iPhone Pro Max) | skala 0,22 → 32 dp = 7 px | skala 0,55 → 32 dp = 18 px |

Lådan sätter `data-tv-scene-phone="1"` vid sidan av den befintliga
`data-tv-scene-narrow`, och attributnamnet exponeras genom `lib/plugin-sdk.ts` som
`TV_SCENE_PHONE_ATTR`. Pluginet läser flaggan på exakt samma sätt som
`useNarrowSurface` redan läser den smala — ingen ny mekanism, bara ett nytt läge i den
som finns. Saknas attributet (äldre app) beter sig pluginet som i fas 1.

Telefon är alltid också smal: `data-tv-scene-narrow` sätts fortsatt, så allt fas 1 redan
gör vid smal yta gäller vidare.

### 2. Ikonraden blir en låda (pluginet)

I dag komprimeras raden till 64 designpixlar på smal yta (`tv-shell.tsx:133-186`). På 780
designpixlars bredd äter den nästan en tiondel av skärmen för navigering som används
sällan.

På telefon döljs raden. I stället ligger en enda knapp i vyns övre vänstra hörn. Tryck
öppnar raden som en låda som glider in från vänster, nu med etiketter eftersom det finns
plats. Lådan stängs när en post väljs, vid tryck utanför, och av Bakåt — den registreras
som ett lager i skalets befintliga kedja (lager → spelarkrom → skal → värden), så
telefonens svepgest och Bakåt-posten fungerar utan särfall.

Knappen är en station som alla andra, så fjärr- och tangentnavigering fortsätter fungera
på en telefon som kopplats till en skärm.

### 3. Portträttmått (pluginet)

- **Hubben**: sexkolumnsrutnätet blir två kolumner på telefon.
- **Guiden**: kanalstationen på 520 designpixlar blir full bredd.
- **Träffyta**: minst 88 designpixlar höjd på allt som går att trycka på — vid skalan 0,5
  är det 44 riktiga pixlar, Apples och Googles golv. Måttet sätts som en konstant, inte
  utspritt per vy.
- **Teckengolv**: ingen text under 28 designpixlar (14 riktiga). Texter som i dag är
  mindre räknas upp på telefon.
- **Multivy**: oförändrad från fas 1 — två rutor, en över och en under. Kapacitetsvalet
  3/4 förblir dolt under 1024 designpixlar.

Alla mått ligger redan i `tv-ui.tsx` och vyernas toppkonstanter, vilket fas 1 såg till.
Fas 2 lägger telefonvärden bredvid dem, inte nya mått i märkningen.

## Avgränsningar

Ingen ny visuell design: utseendet är TV-designen i portträtt, byggd vidare på den
mobilanpassning som redan finns. Ingen bottenrad — lådan ersätter den lösning fas 1:s
spec skissade. Inget eget telefonläge för spelaren utöver det fas 1 gav.

## Test

Plugin: vitest för lådans öppning och stängning (val, utanförtryck, Bakåt), för att raden
inte renderas på telefon, för hubbens två kolumner, guidens fulla bredd, och för att
träffytor och texter håller golvet. App: enhetstest för scenräkningen vid 390, 430, 700
och 1024 px — särskilt att 700 är telefongränsen och att 1024 fortsatt är den smala.

Manuell verifiering är Jerrys, på riktig telefon: läsbarhet, att lådan går att nå med
tummen, och att inget i fas 1:s skrivbordsläge ändrats.

## Versioner och grenar

App: `feature/live-tv-mobile-phase2-app` från `feature/live-tv-logos-v2-app`, version
0.1.599. Plugin: `feature/live-tv-mobile-phase2` från `feature/live-tv-logos-v2`, version
0.8.0, `minAppVersion` 0.1.599. Appen släpps före pluginet; ingenting släpps utan Jerrys
klartecken.
