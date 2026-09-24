# Live TV: kategorikuratering per källa

Datum: 2026-09-24 · Plugin: live-tv (0.10.0 → 0.11.0) · Ingen app-release krävs.

## Bakgrund

Testfeedback (2026-09-24): en Xtream-panel med 15 987 kanaler visar allt i bokstavsordning, 36 åt gången. Kategorimenyn visar bara nio kategorier. Att bygga egna listor kräver att varje kanal läggs till för hand (tak 500). Önskat flöde: importera → se alla kategorier → kryssa av oönskade → slå ihop → spara.

Orsaker i koden:

- `live-tv-grid.tsx` bygger kategorimenyn (`categories`) ur `visibleChannels`, alltså ur det som råkar vara laddat i vyn, inte ur indexet. `model.groups` är `topGroups(channels, 8)`.
- Ingen kuratering finns. Xtream-konton har ett kategorival vid import (`login.categoryIds`, `TvCategoryPicker`), m3u har inget, och ingen kan slå ihop.
- Modellen laddar redan alla kanaler per källa in i minnet (`loadChannelsForSource` → `channelsBySource`), och rutnät, sök, guide och kanalväljare filtrerar ur den. Kurateringen kan därför tillämpas där, utan Rust-ändring.

## Beslut (Jerry 2026-09-24)

1. Kuratering **per källa** (lista), inte globalt.
2. Dolda kategoriers kanaler är **borta överallt**: Alla, sök, guide, kanalväljare.
3. Ihopslagning **ersätter originalen**: de ingående grupperna försvinner ur menyn och den nya kategorin visar deras kanaler. En grupp ingår i högst en ihopslagning. Går att dela upp igen.
4. Panelen **öppnas automatiskt efter första importen** av en källa, med Hoppa över. Nås därefter via källans inställningar.
5. Tillämpas **i pluginets modell ovanpå indexet**, inte i Rust.

## Datamodell

Nya fält på `LiveTvList` (`live-tv-data.ts`):

```ts
export interface ListCuration {
  /** Originalgruppnamn som döljs. */
  hidden: string[]
  /** Ihopslagningar; `groups` är originalgruppnamn, `name` det nya. */
  merges: { name: string; groups: string[] }[]
}
curation?: ListCuration
/** Panelen har visats (sparad eller överhoppad) efter en import. */
curationSeen?: boolean
```

Invarianter, upprätthållna av en ren `normalizeCuration(curation, knownGroups)`:

- en grupp finns i högst en merge och inte samtidigt i `hidden`;
- merge-namn är trimmade, icke-tomma och unika; ett merge-namn får inte kollidera med en synlig originalgrupp;
- grupper som inte längre finns i källan behålls i reglerna (leverantören kan ta tillbaka dem) men visas inte i panelen.

Frånvarande `curation` = tom kuratering, allt syns. Befintliga listor påverkas inte förrän användaren sparar något.

## Tillämpning i modellen

`live-tv-model.ts`:

- Ny ren funktion `applyCuration(channels: IndexChannel[], curation: ListCuration | undefined): IndexChannel[]`. Gruppfältet kan vara semikolonseparerat ("Sport;HD"), samma regel som Rust-indexets `groups_of`: en kanal döljs om **alla** dess delgrupper är dolda; en kanal vars delgrupp ingår i en merge får delgruppen ersatt av merge-namnet; dubbletter i det omskrivna gruppfältet tas bort. Kanaler utan grupp påverkas inte.
- Anropas i `loadChannelsForSource` efter `loadAllChannels`/`applyLogoFallbackSwitch`, före `setPluginMemoryCache`. För `source === null` (alla källor) tillämpas varje källas kuratering på dess kanaler.
- När kurateringen för en lista sparas: nollställ minnescachen för källan och för "alla", avbryt pågående laddning, och signalera `emitIndexChanged()` så vyerna läser om.
- `model.groups` byter betydelse: från topp åtta till **hela** den kuraterade grupplistan `{ name, count }[]` sorterad efter antal fallande, sedan namn. `topGroups` behålls för chipraden (åtta första). Konsumenter som vill ha namnlistan tar `.map(g => g.name)`.
- `LiveTvList.groups` (kvittot efter import) förblir **okuraterade** originalgrupper med antal; det är panelens underlag.

## Kategorimenyn i rutnätet

`live-tv-grid.tsx`: `categories` byggs ur `model.groups` (kuraterade, alla, med antal), inte ur `visibleChannels`. Menyn blir rullbar och visar antal per kategori. Chipraden tar de åtta första oförändrat. Val av kategori filtrerar som i dag mot `c.group` (nu det omskrivna fältet).

TV-guidens `useGuideGroups` läser samma lista, fortsatt kapad till tolv.

## Panelen: skrivbord och telefon

Ny komponent `runtime/category-curation-panel.tsx` på pluginets primitiver (`Card`, `Checkbox`, `PillBtn`, `TOKENS`, `inputStyle` ur `@/lib/plugin-sdk`; inline-stilar, ingen yttre box). Öppnas från en ny knapp **Kategorier** på varje listkort i `live-tv-settings-section.tsx` (för `kind` m3u/xtream, inte custom).

Innehåll, uppifrån:

1. Rubrikrad: listans namn, "N kategorier · M dolda · K ihopslagna".
2. Sökfält (filtrerar raderna på namn) och knappar **Visa alla**, **Dölj alla**.
3. Rader: en per synlig originalgrupp (kryssruta = visas, namn, antal) och en per merge (namn i fetstil, "innehåller A, B, C", summerat antal, knapp **Dela upp**). Sorterade efter antal fallande.
4. Markeringsläge: varje rad har en andra kryssruta "markera"; när minst två är markerade visas fältet **Slå ihop till…** med namnfält och knapp **Slå ihop**. Markerade rader som redan ingår i en merge kan inte väljas.
5. Fot: **Spara**, **Avbryt**. Vid automatisk öppning efter import heter Avbryt **Hoppa över**.

Ändringar hålls i lokalt tillstånd tills Spara; Avbryt/Hoppa över kastar dem. Spara skriver `curation` (normaliserad) och `curationSeen: true` via listlagringen och nollställer cachen. Hoppa över skriver bara `curationSeen: true`.

Underlaget hämtas med `listGroups(list.source)` när panelen öppnas (färskt ur indexet), med `list.groups` som reserv om anropet faller.

## Panelen: TV

Ny komponent `runtime/tv/tv-curation-picker.tsx` på `PickerPanel`-mönstret från `tv-list-picker.tsx`, med `station`-fokus och `dp()`-mått. Öppnas från en ny rad **Kategorier** per lista i `PlaylistsTab` (`settings-tabs.tsx`).

- Övre rader: **Visa alla**, **Dölj alla**, **Slå ihop…** (växlar markeringsläge), **Spara**, **Hoppa över/Avbryt**.
- Grupprader: OK växlar visas/dold. I markeringsläge växlar OK markering i stället, och raden **Klar: slå ihop N** frågar efter namn med `keyboard.ask` (TV-tangentbordet) och skapar mergen.
- Merge-rader: OK ger valet **Dela upp** via en bekräftelserad.
- Fokus startar på första grupprad (`data-init`).

## Importflödet

I båda importvägarna (`handleFetchM3uList`/`handleRefetchList` på skrivbordet, `PlaylistsTab` på TV): när `importList` svarar `done` för en lista med `curationSeen !== true` öppnas panelen med Hoppa över. Panelen öppnas **inte** vid omhämtning av en lista som redan har `curationSeen`. Misslyckad import öppnar ingen panel.

Xtreams befintliga kategorival vid import lämnas orört. Den nya panelen visar för en Xtream-lista de grupper som faktiskt finns i indexet.

## Strängar

Nya nycklar i `hub-strings.ts` (skrivbord/telefon) och `tv/tv-strings.ts` (TV), engelska och svenska: Kategorier, Visa alla, Dölj alla, Slå ihop till…, Slå ihop, Dela upp, Spara, Hoppa över, Avbryt, "N kategorier · M dolda · K ihopslagna", "innehåller {groups}", Markera, Klar: slå ihop {n}, namnfältets rubrik och felmeddelande vid tomt/kolliderande namn.

## Fel och kanter

- Källa utan grupper (alla kanaler ogrupperade): panelen visar en rad "Inga kategorier i den här listan" och bara Hoppa över/Stäng.
- Tom kuratering sparas som frånvarande fält (inte `{hidden:[],merges:[]}`), så listlagringen inte växer i onödan.
- Merge-namn lika med en dold originalgrupp tillåts (den dolda syns ändå inte); lika med en synlig originalgrupp avvisas med felmeddelande.
- Om alla grupper döljs visas rutnätets tomma tillstånd med texten "Alla kategorier är dolda" och en knapp till panelen.
- Favoriter, historik och påminnelser pekar på kanaler via nyckel; en favorit i en dold kategori ligger kvar i Favoriter (uppslag via indexet) men syns inte i Alla. Det är avsiktligt och dokumenteras i koden.

## Test

Vitest, i pluginet:

- `applyCuration`: tom kuratering är identitet; dold grupp filtrerar; merge skriver om; multigrupp "A;B" med A dold behålls som "B"; med A och B dolda försvinner; merge över delgrupp ger dubblettfri grupp; normalisering tar bort konflikter och tomma namn.
- Modellens `groups`: hela listan med antal, sorterad, och att chipraden fortfarande är åtta.
- Rutnätets kategorimeny: listar alla grupper ur modellen oberoende av vad som är laddat (utökning av `live-tv-grid-categories.test.tsx`).
- Cache: sparad kuratering nollställer källans cache och "alla".
- Importflöde: panelen öppnas exakt en gång efter `done` utan `curationSeen`, inte vid omhämtning, inte vid fel.
- Panelen (skrivbord): Spara skriver normaliserad kuratering och `curationSeen`; Hoppa över skriver bara `curationSeen`; Slå ihop kräver två markerade och ett giltigt namn.

Manuellt: tv-sim (`?tvmode=1`) och telefonbredd i webbläsaren mot dev-servern, plus en riktig m3u med > 50 grupper.

## Släpp

Plugin 0.11.0, CHANGELOG-post under "## 0.11.0 — Choose your categories". Bygg från `.worktrees/main-plugin-build` enligt rutinen, full typkontroll, ingen release utan Jerrys klartecken.

## Utanför omfånget

Globala regler över källor, kuratering av favoritlistan, ändring av Xtreams importval, Rust-sidans frågeparametrar, och guidens tak på tolv grupper.
