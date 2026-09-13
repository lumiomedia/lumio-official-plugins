# Task P5: Inställningar och import-UX — rapport

Gren `feature/live-tv-storage-v2`, ovanpå P4 (`4e00586`).

P5 stänger de tre sista hålen efter lagring v2: TV-vyn hämtade fortfarande
spellistor SJÄLV (den gamla webview-parsningen med 2 000-taket), EPG-käll-
sektionen höll pluginets sista egna XMLTV-cache, och `needsReimport`/
`lastImportError` — som P2 införde — syntes ingenstans.

## 1. TV-inställningar (`tv/tv-settings.tsx`)

`fetchAndAddM3uList` (POST `/api/m3u` + `upsertLiveTvListFromFetch`) är borta.
Spellistefliken kör nu samma datalager som skrivbordet:

| Åtgärd | Väg |
| --- | --- |
| Lägg till M3U-URL | `ensureM3uList(url)` → `importList(list, onProgress)` → `applyM3uUrls` först vid `done` |
| Lägg till Xtream-inloggning | tangentbord server → användarnamn → lösenord, `fetchXtreamAccount` (auth-kontroll), `saveXtreamLogin`, `ensureXtreamList` → `importList` |
| Hämta om | `importList(list, …)` på befintlig lista (`existedBefore = true`) |

- **Förlopp** per rad ur jobbets `state/received/total`: `fetching` →
  "Hämtar 12 000 av 17 000…" (`toLocaleString(locale)`), okänd total →
  "Hämtar…", `parsing`/`writing` → egna texter. Tidigare var hela
  återkopplingen att raden dök upp (eller inte) efteråt.
- **Fel** som notis via skalets `nav.toast` ("Hämtningen misslyckades: …").
- **Orphan-skyddet** (spec §5): en NY lista vars första import faller raderas
  igen (`deleteLiveTvList`); en BEFINTLIG lista behåller sitt innehåll och får
  i stället `needsReimport`/`lastImportError` bokfört.
- **Raden** visar `channelCount` ("17 000 kanaler"), `fetchedAt` och —
  när `needsReimport` — ett "Behöver hämtas om"-märke plus felraden under.
- **Ordning och fokus:** listor som behöver hämtas om sorteras överst, och
  "Hämta om" är radens FÖRSTA station (före "Ta bort"). Jag satte medvetet
  INTE `data-init` på den: vyn har exakt en `data-init` (skalets aktiva flik,
  dokumenterat i filen), och eftersom flikraden ligger före innehållet i DOM
  hade en andra `data-init` ändå inte flyttat starfokus — bara brutit
  invarianten. Sorteringen + platsen ger samma praktiska effekt.

## 2. Skrivbordsinställningar

`live-tv-settings-section.tsx`: listkorten har fått samma presentation —
märke, felrad (`role="alert"`), och en egen "Hämta om"-knapp per lista med
jobbets förlopp under kortet. P2:s progress-koppling RENDERADE redan
`received/total`, men som en rå parentes ("(12000 / 17000)"); den går nu
genom `listImportProgress`/`listImportProgressUnknown` och lokaliserade tal.
`xtream-login-section.tsx` fick samma textbyte för sin egen importräknare.

## 3. Ominloggning för överförda Xtream-listor

`importMissingSources()` (P2, körs vid modellmontering) kan inte importera en
överförd Xtream-lista: `lists` speglas mellan enheter men `xtream_logins`
(lösenord) gör det inte, så `importList` kastar "xtream login missing".

- Raden säger nu "Logga in på nytt för att hämta kanaler" när listans
  `xtreamLoginId` inte svarar mot någon sparad inloggning.
- Skrivbordet: knappen `prefillXtreamLogin({ server, loginId })` (ny, liten
  modulnivåbuss i `xtream-login-section.tsx`) fyller i formuläret och
  scrollar dit. TV: "Hämta om" öppnar tangentbordskedjan med servern ifylld.
- **Login-id:t återanvänds.** Värdet parsas ur `source`
  (`xtream://<host>/<loginId>`) och används som id på den nya inloggningen, så
  `xtreamPseudoUrl` ger SAMMA källa — annars hade `ensureXtreamList` skapat en
  andra, tom lista bredvid den trasiga i stället för att laga den.

## 4. EPG-diagnostik från appen

- `index-client.ts`: `epgStatus(listId)` → `GET /api/live-tv/epg/status`
  (`EpgStatus`/`EpgSourceStatus`). Ett tomt svar tolkas som "inget hämtat än",
  inte som fel — så säger appen (`status_handler` svarar med nollor när ingen
  butik finns).
- `epg-sources-section.tsx` läser den i stället för `useLiveTvEpgCache`: per
  adress kanaler/program + hämtningstid, eller adressens `error`; en
  sammanfattningsrad med butikens `fetchedAt`/programtotal; och "Hämta om EPG"
  som kör `refreshEpg(…, force=true)` + `waitForJob` och läser om statusen.
- **Butiken är global** (P3: ett EPG-lager för alla list-id), så status och
  omhämtning går mot `LIVE_TV_GLOBAL_EPG_ID` med SAMTLIGA listors adresser och
  källor (`getAllLiveTvEpgUrls`/`getLiveTvLists`). Att skicka bara den enskilda
  listans adresser hade hämtat om lagret utan de andra listornas källor.
  `listId`-propen säger numera bara "sektionen sitter på en riktig lista".

## 4b. `/api/live-tv/status` — fel svarsform (tillägg från koordinatorn)

`indexStatus()` deklarerade `Promise<{ sources: string[] }>`, men appen svarar
med OBJEKT (`live_tv_index.rs:450`: `{ sources: [{ id, channels, updatedAt }] }`).
`importMissingSources` gjorde `new Set(sources)` och `known.has(list.source)`
blev därmed ALLTID falskt: varje m3u-/Xtream-lista startade ett fullt
importjobb vid varje modellmontering, på varje enhet — raka motsatsen till
spec §3.4 ("bara saknade källor").

- `indexStatus()` returnerar nu `{ sourceIds: string[]; sources: IndexSourceStatus[] }`
  och mappar defensivt (en ren sträng från en äldre app blir `{ id, 0, 0 }`;
  tomma id filtreras bort).
- `live-tv-data.ts` jämför mot `sourceIds` (enda ändringen där utöver
  raderingen ovan).
- Teststubben `src/__test-stubs__/live-tv-index.ts` svarar i appens objektform.
- `runtime/live-tv-model.test.ts` mockade `indexStatus` i den gamla formen —
  en rads fixturfix (P3:s fil, minimal och nödvändig).
- Tester: `index-client.test.ts` (objektform → `sourceIds`, strängform
  accepteras, tomt svar), `live-tv-data.test.ts` ("importerar bara källor som
  SAKNAS i indexet": känd källa hoppas över, okänd importeras).

## 5. Raderat

| Modul | Varför |
| --- | --- |
| `runtime/epg/cache.ts` + test | Pluginets XMLTV-cache i pluginlagringen. Sista läsaren var EPG-sektionen. |
| `runtime/epg/fetcher.ts` + test | Bara cachen använde den. |
| `runtime/hooks/useLiveTvEpgCache.ts` | Bryggan mellan de två. |
| `upsertLiveTvListFromFetch` i `live-tv-data.ts` | Sista anroparen var TV-vyn. `runtime/live-tv-list-receipt.test.ts` (som bara testade den) raderad med den. |

`epg/name-match.ts` och `epg/lookup.ts` är kvar (teststubben respektive
`computeNowNextLater`). `epg/types.ts` likaså — `EpgCacheEntry` är fortfarande
INDATA-formen i vy-testernas fixturer.

**Undantag i annan fil:** `runtime/live-tv-grid-categories.test.tsx` hade en
kvarglömd `vi.mock('./hooks/useLiveTvEpgCache', …)` (griden importerar inte
hooken). En mock mot en raderad modul kastar vid insamling, så den raden togs
bort — enda ändringen i den filen.

**Ej gjort (uppdraget ändrat under arbetet):** `handleToggleChannelInActiveList`
i `live-tv-grid.tsx` — koordinatorn flyttade den till P4:s fixrunda mitt i
arbetet. Filen är orörd av mig (`git status` verifierat).

## Ny fil

`runtime/list-import-flags.ts` — `recordListImportOutcome(listId, error?)`.
`importMissingSources` bokför utfallet själv, men en MANUELL "Hämta om" gjorde
det inte: märket satt kvar efter en lyckad omhämtning och ett nytt fel syntes
inte förrän nästa omstart. Ligger utanför `live-tv-data.ts` dels för att inte
ändra `importList`s kontrakt (den ska lämna listan orörd vid fel, spec §5),
dels för att den filen ägs av P2.

## Strängar

- `hub-strings.ts`: `epgSourceFetched`, `epgFetchedAt`, `epgNeverFetched`,
  `epgRefresh`, `epgRefreshing`, `listNeedsReimport`, `listRefetch`,
  `listRefetching`, `listImportProgress(+Unknown)`, `listImportParsing`,
  `listImportWriting`, `listImportFailed`, `xtreamNeedsLogin`,
  `xtreamRelogin`.
- `tv/tv-strings.ts`: `refetching`, `importProgress(+Unknown)`,
  `importParsing`, `importWriting`, `importFailed`, `needsReimport`,
  `xtreamServer/Username/Password`, `xtreamNeedsLogin`, `xtreamLoginFailed`.
  `addM3uFailed` borttagen (ersatt av den detaljerade felnotisen).
- Xtream-taknotisen: `liveTvXtreamCapped` fanns inte kvar i repot (borttagen
  redan i P2), och ingen "2 000"-formulering finns i någon sträng — bara i
  historiska kodkommentarer.

## Tester

`cd plugins/live-tv && npx vitest run` → **60 filer / 298 tester gröna.**
(Baseline före P5: 60/288. Tre testfiler raderade med sina moduler, en ny —
nettot uppåt kommer av att P4 la till filer parallellt under passet.)

Nya/utökade:
- `runtime/index-client.test.ts` (+2): `epgStatus` bygger rätt query och
  normaliserar; ett tomt svar blir "inget hämtat än" i stället för att kasta.
- `runtime/tv/tv-settings.test.tsx` (+3, en omskriven): importjobbets förlopp
  ("Fetching 12,000 of 17,000…") → kvitto med `channelCount`; misslyckad
  förstahämtning tar bort listan OCH säger till; `needsReimport`-märke +
  felrad + ordningen; Xtream utan inloggning → ominloggning med värden ifylld.
- `runtime/live-tv-settings-section.test.tsx` (ny, 3): jobbräknaren renderas
  (inte bara köräknaren); märke/fel + "Hämta om" som rensar flaggorna;
  ominloggningsknappen fyller i Xtream-formuläret.
- `runtime/epg-sources-section.test.tsx` (+2, mockar nu `index-client`):
  per-adress-rader med fel och sammanfattning; "Hämta om EPG" kör
  `refreshEpg(global, urls, sources, true)` + `waitForJob` och läser om.
- `runtime/live-tv-data.test.ts` (+1): bara saknade källor importeras.
- `src/__test-stubs__/live-tv-index.ts`: `/api/live-tv/epg/status` tillagd i
  fetch-stubben (annars 404 i varje vy som renderar EPG-sektionen), och
  `/api/live-tv/status` svarar i appens objektform.

`npx tsc --noEmit -p tsconfig.json`: 49 fel, exakt samma mängd som baseline
(rad-för-rad jämfört; bara radnummerskift i `live-tv-grid.tsx`/
`live-tv-home-override.tsx`, som P4 redigerade parallellt). Inga nya fel i
mina filer.

## Att veta

- **Samtidighet.** `view-helpers.ts`, `live-tv-grid.tsx`, `live-tv-guide.tsx`
  och `live-tv-model.ts` ändrades av P4:s fixrunda medan jag arbetade; en
  mellankörning av sviten visade 9 fel i tre filer (`__resetViewHelpersForTests`
  tillfälligt borta). De var gröna igen vid slutkörningen och är inte mina
  filer — inget av det är staged i min commit.
- **`Action`-knapparna i TV** är vanliga stationer (`station()`), inte `Row`:
  en rad behöver två åtgärder, och nästlade stationer hade gett fjärren en
  fokusbar inuti en fokusbar.
- **Kvar:** `liveTvGuideFetchFailed` i appens i18n har ingen läsare kvar i
  pluginet (noterat redan av P4). `epg/types.ts` bär fortfarande
  `EpgSourceFailure`/`EpgSourceStat` som bara fixturer använder.

---

# Fixrunda (granskning av 632727c → "Needs fixes")

Ovanpå P4-fixen `71c954d`.

## Important

**1. Ominloggningen rensade inte flaggorna.**
`xtream-login-section.tsx` `refreshChannels` körde `importList` men aldrig
`recordListImportOutcome` — efter en LYCKAD ominloggning stod "Behöver hämtas
om" och det gamla felet kvar på kortet tills appen startades om, trots att
kanalerna just hämtats. Nu bokförs utfallet på samma sätt som
`handleRefetchList`: `recordListImportOutcome(list.id)` vid `done`, och ETT
felskrivande ställe (`catch`) för både jobbfel och nätfel — jobbfelet kastas
vidare i stället för att skrivas två gånger. En HELT NY lista som faller tas
fortfarande bort i stället för att flaggas (spec §5).
Test: `live-tv-settings-section.test.tsx` "ominloggningen rensar …" — verifierad
RÖD utan fixen.

**2. Fokus strandade när ordningen räknades om.**
`ordered` sorterades per render, så raden bytte plats i samma ögonblick som
`needsReimport` rensades; React flyttade DOM-noden och den fokuserade knappen
tappade fokus till `body` — fjärrkontrollen strandade mitt i det som just
lyckades. Ordningen FRYSES nu vid monteringen (`orderRef` med rangordning per
list-id); listor som tillkommer senare läggs sist, aldrig invävda.
Test: "fokus stannar kvar i raden när märket rensas av en lyckad hämtning" —
asserterar både att raden ligger kvar överst och att `document.activeElement`
fortfarande är inuti raden. Verifierad RÖD utan fixen.

## Minor

**3. `reuseLoginId` var klibbig.** Den är nu knuten till serveradressen
förifyllningen kom med (`reuse: { loginId, server }`; `reuseLoginId` är `null`
så snart fältet skrivits om). Skriver man om fältet till en annan panel är det
inte samma lista man lagar, och ett kvarhängande id hade låtit den NYA
inloggningen ta över den gamla listans källa i indexet.

**4. Ett EPG-kontrollblock i stället för N.** Diagnostiken är flyttad ur
`EpgSourcesSection` till en ny `EpgStatusCard`, renderad EN gång ovanför
listkorten (`live-tv-settings-section.tsx`). Butiken är global (P3), så per
lista blev det N `epgStatus`-läsningar av samma sak och N "Hämta om EPG"-
knappar som alla gjorde exakt samma globala omhämtning — med var sitt
`refreshing`, så de andra såg overksamma ut medan en arbetade. Kortet bär en
egen etikett ("Tablån hämtas en gång för alla spellistor tillsammans"),
prenumererar på `onLiveTvListsChanged` (adresserna redigeras i korten under
det) och ritas inte alls utan EPG-adresser. `EpgSourcesSection` är tillbaka
till ren adresshantering; `listId`/`allUrls`-propsen är borta.
Tester: per-adress-rader + fel, EN läsning och EN knapp för två listor,
omhämtning + omläsning, och tom rendering utan adresser.

**5. `parseXtreamSource`** flyttad till `live-tv-data.ts` bredvid
`xtreamPseudoUrl` (var dubblerad i tv-settings och settings-section).

**6. TV:s `fetchedAt`** har fått samma datum-fallback som skrivbordet
(`formatFetchedAt`): "09:41" sa ingenting om en lista hämtad i förrgår.

**7. Framstegs-state scopat till raden.** `ListRow` är utbruten och `memo`:ad;
bara raden som hämtar får en ny `busy`, övriga får samma `null` och hoppas
över. Återanropen är stabila via ett ref-i-effekt-handtag (samma mönster som
skalets zap-buffert), annars hade `memo` inte bitit.

**Ej ändrat (beslut):** TV:s EPG-flik saknar diagnostik med avsikt
(handoff-skärm 11).

## Verifiering

`npx vitest run` → **60 filer / 303 tester gröna** (före fixrundan 60/298).
`npx tsc --noEmit -p tsconfig.json` → 49 fel, exakt samma mängd som före
(bara radnummerskift i `live-tv-settings-section.tsx`). Inga nya fel i mina
filer.
