# Live TV – Logotyper v2

Datum: 2026-09-14. Omgång efter "everywhere" (app 0.1.597 / plugin 0.6.0).

## Problemet

Kanallogotyper hämtas i dag genom `/api/m3u-logo?url=…`: appen laddar ned
leverantörens bild, skalar den till 256×128 PNG och svarar med
`max-age=86400`. Ingenting sparas på disk. Enda skyddet är en negativ
minnescache på 60 sekunder.

Två följder:

1. **Allt hämtas om.** Vid omstart, eller när webviewens cache töms eller
   evakueras, går varje synligt kanalkort mot leverantörens bildvärd igen. Den
   värden är ofta densamma för hela panelen och svarar inte sällan 503 — som
   51.158.145.100 gjorde under testet 2026-09-13.
2. **Saknad logotyp förblir saknad.** Kanaler utan `tvg-logo`, och kanaler vars
   bild inte går att hämta, visar initialer i all framtid.

## Vad som byggs

En diskcache för hämtade logotyper, och iptv-orgs öppna logotypregister som
**reserv** — aldrig som ersättning. Leverantörens egen logotyp vinner alltid
när den finns och går att hämta.

### Appen (Rust)

**`logo_cache.rs` – diskcache.** Optimerade PNG:er sparas under appens
datakatalog i `live-tv-logos/`, filnamn `<sha256(url)>.png`, skrivna atomärt
(tmp + rename) på samma sätt som EPG-butiken. `/api/m3u-logo` svarar från disk
när filen finns och sätter filens mtime till nu, så mtime = "senast använd".
Vid miss: hämta → `optimize_logo` (oförändrad) → skriv → svara.

Tak 200 MB. Katalogens storlek räknas upp en gång i bakgrunden efter start;
när taket överskrids raderas filer i mtime-ordning, äldst först, tills
storleken ligger under 90 % av taket. Cachen rörs inte av omimport eller av att
en lista tas bort; den töms via appens befintliga rensa-cache-väg.

Den negativa minnescachen på 60 sekunder behålls oförändrad, och en miss
skriver fortfarande ingen fil — 502 med `no-store` är kvar som svar, eftersom
pluginets `onError` bygger på det.

**`logo_directory.rs` – iptv-org-registret.** `channels.json` och `logos.json`
från `iptv-org.github.io/api` hämtas och kokas ned till ett eget index på disk
(`live-tv-logo-directory.json`): per iptv-org-id en vald logotyp-URL, plus
namn, alternativnamn och land för namnmatchningen. Indexet hämtas om när det är
äldre än sju dygn; hämtningen sker i bakgrunden och blockerar aldrig en vy.
Saknas nät används det gamla indexet vidare.

Val av logotyp per kanal-id: PNG före övriga format; SVG hoppas över helt
eftersom bildkoden inte kan läsa dem; varianter taggade `dark` väljs bort så
länge ett alternativ finns, därför att Lumios gränssnitt är mörkt. Vid lika
värde vinner den bredaste bilden upp till 1000 px.

**`POST /api/live-tv/logo-fallback` – "Komplettera".** Tar listans källnyckel,
går igenom kanalerna i indexet och matchar mot registret:

1. **tvg-id först.** `normalize_tvg_id` på kanalens `tvgId` (eller
   `tvgIdResolved` när det finns) mot registrets id.
2. **Namn som andrahand.** `normalize_channel_name` mot registrets namn och
   alternativnamn, och bara inom kanalens land när landet går att utläsa ur
   tvg-id:ts suffix (`.se`) eller ur registrets landsfält för en entydig
   namnträff. Flera träffar utan landsgrind räknas som ingen träff.

Varje träff skrivs som ett nytt, separat fält `logoFallback` på kanalen i
indexet. Kanalens `logo` ändras aldrig. Svaret är `{ matched, total }`.
Fältet serialiseras bara när det finns, precis som `tvgIdResolved` — tomma
nycklar kostar plats i en fil med tiotusentals kanaler.

Endpointen är synkron: matchningen i Rust är millisekunder (hela importen av
17 000 kanaler tar 43 ms), och nedladdningen av registret sker på användarens
egen knapptryckning.

### Pluginet

**Rendering.** `getLiveTvLogoSrc` får kanalens `logoFallback` som andra källa.
Kanalkortet provar leverantörens logotyp först; när proxyn svarar 502 byter
`onError` till reserven (också genom `/api/m3u-logo`, så den cachas likadant).
Saknar kanalen leverantörslogotyp går kortet direkt på reserven. Saknas båda,
eller fallerar även reserven, visas initialerna som redan finns.

**Inställning per lista.** `LiveTvList` får `logoFallbackEnabled` med
förvalet på — även för listor som redan finns, eftersom en tom ruta aldrig är
bättre än en trolig logotyp. Avstängd innebär att `logoFallback` inte används
vid rendering och att Komplettera inte kan köras för listan; redan skrivna
fält ligger kvar och börjar gälla igen om switchen slås på.

**Gränssnitt.** I listans rad, på skrivbordet och i TV-inställningarna via
snabbknappsraden som redan finns där: switchen "Fyll i saknade logotyper från
iptv-org" och knappen "Komplettera", som under körning visar pågående läge och
efteråt "X av Y kompletterade".

## Avgränsningar

Ingen automatisk komplettering vid import — knappen räcker, och importen ska
inte bli långsammare. Inga SVG-logotyper. Inget "alltid iptv-org"-läge:
reserven är en reserv.

## Test

Rust: cachens skrivning, träff som rör mtime, utrensning vid tak, registrets
parsning och logotypval (PNG före webp, SVG bort, dark bort), matchningens
ordning (tvg-id före namn, namnträff utan land avvisas när den är tvetydig).
Plugin: vitest för src-valet, `onError`-bytet till reserven, initialerna när
båda saknas, och att avstängd switch döljer reserven.

Manuell verifiering är Jerrys, i en DMG: logotyper överlever omstart utan
nätanrop, Komplettera fyller en lista utan tvg-logo, leverantörens logotyp
vinner fortfarande där den finns.

## Versioner och grenar

App: gren från testgrenen `test/2026-09-14-live-tv-allt` (340bd71), version
0.1.598. Plugin: gren från `feature/live-tv-everywhere` (117ffb9), version
0.7.0, `minAppVersion` 0.1.598. Appen släpps före pluginet; ingenting släpps
utan Jerrys klartecken.
