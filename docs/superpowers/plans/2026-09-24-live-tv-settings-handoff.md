# Live TV-inställningar enligt handoff — implementationsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live TV-pluginets inställningssida ritas 1:1 mot `Moviefinder/handoff-live-tv` i TV-, skrivbords- och mobilläge: spellistan som en enhet, en kategoripanel med riktigt ihopslagningsflöde, och tre staplade TV-vyer som går att köra med bara pilar, OK och Bakåt.

**Architecture:** Datamodellen finns redan (`LiveTvList` + `curation`); handoffens `hidden`/`merged` mappas på `curation.hidden`/`curation.merges` med ändrad semantik (medlemmars dolda läge vilar under en merge). En liten UI-sats för sidan (`settings-ui.tsx`: kort, knapp, kryssruta, fält, eyebrow, badge, dialog, toast, bakåt-lager) ger exakt wireframens mått på skrivbord/mobil och blir stationer med TV-typografi i TV-läge. Sidan (`live-tv-settings-section.tsx`) skrivs om i handoffens blockordning; kategoripanelen blir dialogen i §4.1; TV får `L:list`/`L:cats`/`L:name` som staplade paneler på `PickerPanel`-mönstret.

**Tech Stack:** React 18, TypeScript, Vitest/happy-dom, plugin-SDK (`Card` byts mot egen `LtCard` enligt facit; `useTvMode`, `getTvKeyboardPanel`, `TOKENS`, `useLang`).

**Spec:** `/Users/jerry/Local Sites/Moviefinder/handoff-live-tv/HANDOFF-live-tv.md` + wireframes i samma mapp (facit). Rader att mäta mot: TV `Lumio TV Settings v2.dc.html` 1143–1162 (sidan), 1950–2076 (vyerna), 2622–2648 (rader); skrivbord `Lumio Desktop Settings v2 minimal.dc.html` 654–720 (kortet), 164–235 (dialogen), 2237–2260 (block), 2624–2672 och 3075–3127 (data); mobil = skrivbordets markup i 420 px-ram.

Arbetskatalog: `/Users/jerry/Local Sites/lumio-official-plugins/plugins/live-tv`. Tester: `npx vitest run <fil>`. Bygg-grind: `cd /Users/jerry/Local Sites/Moviefinder/.worktrees/main-plugin-build && node scripts/build-plugin-runtime.mjs <plugin-root>`. Dev-servern får ny kod via `node scripts/generate-bundled-plugin-runtimes.mjs` i Moviefinder.

## Global Constraints

- Wireframarna är facit; specen förklarar. Copy ordagrant ur HANDOFF §3–§4 (engelska), svenska översättningar i samma tabeller.
- Inga emoji. Ingen hårdkodad accentfärg: accent via `var(--color-accent)`, `--color-accent-700`, `--color-accent-900`. Grundfärger enligt §6: bas `#0e0f13` (används inte som yta i appen — korten ligger på appens bakgrund), text `#e8e8ec`, hjälptext `#8b8e99`, sekundär knapptext `#c3c6d0`, destruktivt `#e0776a` / ram `rgba(224,119,106,0.3)`, grönt `#3cd6a3`.
- Mått enligt §6: kort `rgba(255,255,255,0.04)` radie 10 padding `16px 18px` gap 14; sammanfattningsrad `rgba(255,255,255,0.035)` radie 9; EPG-rad `rgba(0,0,0,0.25)` radie 8, URL mono 12 px; AUTO `rgba(60,214,163,0.12)`/`#3cd6a3` 10.5 px `letter-spacing .08em`; kryssrutor 17×17 radie 4; knappar radie 7 ram `1px solid rgba(255,255,255,0.12)`; dialog max 620 px, radie 14, `#1b1c23`, padding `26px 26px 22px`, overlay `rgba(6,7,10,0.72)`.
- TV: alla interaktiva element är `data-f`-stationer; typografi via `--st-*`; text via tangentbordspanelen; Bakåt stänger översta lagret och lämnar fokus på raden man kom ifrån.
- `hidden` och `merged` per spellista. En kategori i högst en merge. Medlemmar syns inte i kategorilistan. Split återställer medlemmarna med samma dolda/synliga läge som innan (= dolt-läget vilar under mergen). Merge-antal = summan av medlemmarna, räknas ut.
- Cancel återställer till ögonblicksbilden vid öppning (dialogens lokala utkast). Save stänger och toastar *Categories saved*.
- Befintliga tester som beskriver beteende som handoffen ändrar uppdateras; tester som beskriver oförändrat beteende (import, kvitto, EPG-status, VOD-bygge) ska fortsätta passera.
- Commits bara under `plugins/live-tv/`; dist committas inte förrän släpp.

## Review Focus

1. **Merge → Split med en dold medlem:** medlemmen ska komma tillbaka som DOLD (spec §2). Test i Task 1.
2. **Bakåt med tangentbordspanelen öppen ovanpå en TV-vy:** ska stänga tangentbordet, inte vyn, och inte appens inställningar. Test i Task 2 (lagret tar bara Bakåt när dess panel är den sista `data-panel-root` i DOM).
3. **Remove på spellistan:** bekräftelsedialog med exakt copy; bekräftat = listan, kanalerna i indexet, kategorierna och EPG-källorna försvinner (`deleteLiveTvList`/`deleteXtreamLoginAndData`). Test i Task 3.
4. **Add med tomt XMLTV-fält:** toast *Paste an XMLTV URL first*, ingenting läggs till. Test i Task 3.
5. **Merge N med tomt namn:** toast *Give the merged category a name*, ingen merge. Test i Task 4 (skrivbord) och Task 5 (TV: knappen *Merge*).

---

### Task 1: Kurateringssemantik enligt handoffen + byta namn på merge

**Files:**
- Modify: `runtime/list-curation.ts`, `runtime/list-curation.test.ts`

**Interfaces:**
- `normalizeCuration`: behåller `hidden` även för grupper som ingår i en merge (vilande läge). Fortsatt: trim, unika, en grupp i högst en merge, tomma merges bort.
- `applyCuration`: en delgrupp som ingår i en merge byter namn till mergen OAVSETT dolt läge; en delgrupp som inte ingår och är dold filtreras.
- `curatedGroupCounts`: samma regel.
- Ny: `export function renameMerge(curation: ListCuration, index: number, name: string): ListCuration` (trimmar; tomt namn eller kollision med annan merge → oförändrad kopia).
- `mergeNameConflict` oförändrad.

- [ ] **Step 1: Skriv/ändra tester**
  - "merge över en dold medlem: kanalerna visas under mergens namn" (`applyCuration([ch('a','UK Sport')], {hidden:['UK Sport'], merges:[{name:'Sport',groups:['UK Sport']}]})` → group 'Sport').
  - "normalize behåller hidden för en medlem" (`hidden:['A']`, merge med A → hidden fortfarande `['A']`) — ersätter dagens test "tar bort en grupp ur hidden när den också ingår i en merge".
  - "split återställer dolt läge": efter att mergen tas bort ur objektet ger `applyCuration` filtrering av A igen.
  - `renameMerge`: byter namn; tomt → oförändrat; krock med annan merge → oförändrat.
- [ ] **Step 2: Kör → FAIL.** `npx vitest run runtime/list-curation.test.ts`
- [ ] **Step 3: Implementera** (ta bort `claimed`-filtret ur hidden-loopen i normalize; i `applyCuration`/`curatedGroupCounts` slå upp `renamed` FÖRE `hidden`).
- [ ] **Step 4: Kör → PASS.** Kör också `runtime/live-tv-model-curation.test.ts`, `runtime/category-curation-panel.test.tsx` (panelens merge-flöde tog bort medlemmar ur hidden — ta bort den raden i panelen så att läget vilar).
- [ ] **Step 5: Commit** `live-tv: mergens medlemmar behåller sitt dolda läge vilande; renameMerge`

---

### Task 2: Sidans UI-sats (`runtime/settings-ui.tsx`) med Bakåt-lager och toast

**Files:**
- Create: `runtime/settings-ui.tsx`, `runtime/settings-ui.test.tsx`
- Reuse: `runtime/tv-aware-controls.tsx` (`TextField`-mönstret för tangentbordet), `runtime/tv-linear-nav.tsx`.

**Interfaces (Produces):**
```ts
export function LtCard(props: { children: ReactNode; style?: CSSProperties; testId?: string })        // §6 kort
export function LtEyebrow(props: { children: ReactNode })                                               // 11px/500/.16em uppercase #e8e8ec
export function LtNote(props: { children: ReactNode })                                                  // 12.5px #8b8e99 lh 1.5
export function LtBtn(props: { children: ReactNode; onClick?: () => void; variant?: 'default' | 'accent' | 'danger'; disabled?: boolean; testId?: string; tvId?: string; tvNav?: TvNav; style?: CSSProperties })
export function LtCheck(props: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; testId?: string })   // 17×17 r4, hela raden klickbar
export function LtInput(props: { value: string; onChange: (v: string) => void; placeholder?: string; title: string; onEnter?: () => void; mono?: boolean; testId?: string; style?: CSSProperties })  // TV → tangentbordspanel
export function LtMono(props: { children: ReactNode })                                                  // ui-monospace 12px #c3c6d0 ellipsis
export function AutoBadge()                                                                             // "AUTO"
export function LtDialog(props: { title: string; body?: string; width?: number; onClose: () => void; children: ReactNode; testId?: string })  // overlay + box; mobil (<640) = full bredd; data-panel-root; Bakåt via useBackLayer
export function useBackLayer(active: boolean, onBack: () => void, rootRef: RefObject<HTMLElement | null>): void
export function useToast(): { toast: (text: string) => void; node: ReactNode }                         // fast botten, 2,4 s, en i taget
```
- `useBackLayer`: capture-lyssnare på `window` för `keydown` (`Escape`, `Backspace` utom när fokus står i input/textarea, `GoBack`, `BrowserBack`) och för `lumio-browse-back`-händelsen. Reagerar BARA om `rootRef.current` är den sista `[data-panel-root]` i dokumentet (då ligger inget tangentbord ovanpå). Anropar `preventDefault`, `stopImmediatePropagation`, `onBack()`. Efter stängning återförs fokus till elementet som var aktivt när lagret öppnades (spara `document.activeElement` vid aktivering).
- Alla `Lt*` renderar `data-f` + `--st-*`-typografi när `useTvMode()`.

- [ ] **Step 1: Tester**: LtBtn/LtCheck/LtInput är stationer på TV och vanliga på skrivbord; `LtDialog` + `useBackLayer`: Escape stänger när dialogen är sista panel-root, INTE när en annan `[data-panel-root]` ligger efter i DOM (simulera med en extra div); Backspace i ett input stänger inte; `useToast` visar text och tar bort den efter 2,4 s (fake timers).
- [ ] **Step 2: Kör → FAIL.** — **Step 3: Implementera.** — **Step 4: Kör → PASS.**
- [ ] **Step 5: Commit** `live-tv: UI-sats för inställningssidan enligt handoff — kort, knapp, kryssruta, fält, dialog, bakåt-lager, toast`

---

### Task 3: Sidan på skrivbord och mobil (`live-tv-settings-section.tsx`)

**Files:**
- Modify: `runtime/live-tv-settings-section.tsx` (skriv om render), `runtime/epg-sources-section.tsx` (EPG-lista per kort + `EpgStatusCard` i handoffens form), `runtime/vod-library-card.tsx` (USE AS LIBRARY-blocket), `runtime/xtream-login-section.tsx` (bara fälten + Log in & fetch; kontokortet flyttar in i spellistans kort), `runtime/hub-strings.ts`
- Modify tester: `runtime/live-tv-settings-section.test.tsx`, `runtime/xtream-login-section.test.tsx`, `runtime/epg-sources-section.test.tsx`

**Interfaces:**
- Consumes Task 2. Xtream-kontostatus per lista: `fetchXtreamAccount(login)` (finns) → `Active · expires 16 Dec 2026 · 1 connections`-raden (`formatExpiry` finns i settings-tabs; flytta till `live-tv-data.ts` eller duplicera lokalt).
- Produces: `export function PlaylistCard({ list, busy, onCategories, onUpdate, onRemove }: …)` i ny fil `runtime/playlist-card.tsx` med EPG-källor + logotypval; `LiveTvSettingsSection` bygger blocken 1–6.

Blockordning och copy (§3), ordagrant:
1. `LtCheck` × 2: *Use as home page* / *Replaces the regular Home rows…*; *Hide the movie hero on the Live TV page* / *Live TV then starts with the hub…*
2. `LtEyebrow` PLAYLISTS + ett `PlaylistCard` per lista (kind m3u/xtream; custom-listor visas som förut men utan Categories).
3. `LtEyebrow` M3U + befintlig textarea (stil LtInput) + `LtBtn` **Fetch list** (befintlig `handleFetchM3uList`).
4. `LtEyebrow` XTREAM LOGIN + Server URL · Username · Password + **Log in & fetch** (befintlig `XtreamLoginSection` utan kontokortet).
5. `LtEyebrow` PROGRAMME GUIDE STATUS + `LtNote` *The guide is fetched once for every playlist together.* + guidekort: URL mono, `4,197 channels · 66,111 programmes · fetched 12:37` i `#3cd6a3` 12 px, rad `Guide fetched 12:37 · 66,111 programmes` + **Refetch EPG**.
6. `LtEyebrow` USE AS LIBRARY + `LtNote` *Build a library index…* + kort: värd + `16,713 titles ready to index` / `Library built · N titles indexed` + **Build library**/**Rebuild** + `LtNote` *Turn it on under Settings → Home → Start page.*

`PlaylistCard` (§3.1): rad 1 värd (13.5/500) + knappar **Categories** · **Update channels**|**Refetch** · **Remove** (danger); rad 2 meta `Xtream · 2,037 channels · fetched 12:46` (busy → `Fetching…` på både knapp och meta); rad 3 kontostatus (Xtream); sammanfattningsrad `N categories · N hidden · N merged ›` (öppnar dialogen, `curatedGroupCounts`-baserat: categories = originalgrupper ej i merge, hidden = `curation.hidden` ∩ kända, merged = `merges.length`); EPG SOURCES: rader (mono URL, AUTO-bricka när `url === list.urlTvg`, Remove), *No EPG source for this playlist yet.*, LtInput + **Add** (tomt → toast *Paste an XMLTV URL first*); `LtCheck` *Fill in missing logos from iptv-org* / *Lets the list use…*. **Remove** → `LtDialog` titel `Remove {host}?`, body *Channels, categories and EPG sources from this playlist are removed from Live TV.*, knappar Cancel / **Remove** (danger) → `deleteXtreamLoginAndData(list.xtreamLoginId)` för Xtream, annars `deleteLiveTvList` + `applyM3uUrls`-städningen som i dag; toast `{host} removed`.

- [ ] **Step 1: Tester** (uppdatera befintliga + nya): blockordningen (eyebrows i DOM-ordning PLAYLISTS, M3U, XTREAM LOGIN, PROGRAMME GUIDE STATUS, USE AS LIBRARY); kortet visar meta + status + sammanfattning; Add med tomt fält toastar och lägger inte till; Remove → dialog → bekräfta → listan borta och `/api/live-tv/reset` anropad; auto-öppning efter ny import (finns) fortsätter passera.
- [ ] **Step 2: Kör → FAIL.** — **Step 3: Implementera.** — **Step 4: Kör → PASS**, hela sviten.
- [ ] **Step 5: Commit** `live-tv: inställningssidan enligt handoff — spellistan som en enhet, blockordning, copy och mått`

---

### Task 4: Kategoridialogen (§4.1) på skrivbord och mobil

**Files:**
- Modify: `runtime/category-curation-panel.tsx` → exporterar `CategoriesDialog({ list, mode, onClose })` (behåll `CategoryCurationPanel` som alias-export så rutnätet och testerna fortsätter fungera), `runtime/category-curation-panel.test.tsx`, `runtime/hub-strings.ts`

**Innehåll, uppifrån (facit rad 164–235):** `LtDialog` titel `Categories · {host}`, body *Hide the ones you never watch and merge the ones that belong together.*; summary; sök (`flex 1 1 180px`) + Show all + Hide all; MERGED (`LtEyebrow` "Merged"): rad `rgba(255,255,255,0.035)` r9 p10/12 med namnfält utan ram (13.5 px, `renameMerge` vid ändring) + meta `Norway · Denmark · Finland · 193 channels` + **Split**; lista (max-height 300, scroll, `rgba(255,255,255,0.035)` r9, rader p10/0 med separator `rgba(255,255,255,0.055)` från rad 2): 17×17 kryssruta, namn (dold → `#8b8e99`), mono antal, **Mark**/**Marked** (markerad: bg `var(--color-accent-900)`, ram `1px solid var(--color-accent)`, fg `#e8e8ec`); vid ≥ 2 markerade: ruta (`--color-accent-900`, ram `--color-accent-700`, r9, p12) med hint `A · B` (12 px `#c3c6d0`), namnfält (`rgba(0,0,0,0.3)`, ingen ram) + **Merge N**; annars hjälptexten §4.1. Fot: **Cancel** / **Save**.
- Sök filtrerar bara kategorilistan. Merge med tomt namn → toast *Give the merged category a name*. Efter merge nollställs markering och namn. Cancel = kasta utkastet. Save = spara + `onClose` + toast *Categories saved*. Mobil (`max-width: 639px`): dialogen fyller ramen.
- Rutnätets tomma tillstånd (Task 3 i förra planen) öppnar samma dialog.

- [ ] **Step 1: Tester**: rubrik/body; MERGED-rad med rename + Split; Mark/Marked-växling och att rutan syns vid två; tomt namn → toast och ingen merge; sök påverkar inte MERGED; Cancel kastar; Save skriver + toast.
- [ ] **Step 2–4:** FAIL → implementera → PASS (inkl. `runtime/live-tv-grid-categories.test.tsx`, `runtime/category-curation-panel.tv.test.tsx` uppdateras till dialogens struktur).
- [ ] **Step 5: Commit** `live-tv: kategoridialogen enligt handoff §4.1 — MERGED med rename/split, markera, slå ihop, cancel/save`

---

### Task 5: TV — sidan som rader och tre staplade vyer (§4.2)

**Files:**
- Create: `runtime/tv/tv-settings-views.tsx` (`TvPlaylistPanel`, `TvCategoriesPanel`, `TvNamePanel`, `TvConfirmRows`), `runtime/tv/tv-settings-views.test.tsx`
- Modify: `runtime/live-tv-settings-section.tsx` (TV-gren: renderar `TvSettingsPage`), `runtime/tv/tv-list-picker.tsx` (`PickerPanel` tar `onBack?` och `data-panel-root`; redan exporterad)

**TV-sidan (facit 1143–1162, 2622–2648):** rader i appens TV-inställningars stil (återanvänd `Row`/`Heading`/`Action`-mönstret ur `runtime/tv/settings-tabs.tsx`, `dp()`-mått, `TV`-tokens): två växlar; eyebrow PLAYLISTS + en rad per lista (label värd, hint `Xtream · 2,037 channels · fetched 12:46`, värde `10 categories · 1 hidden · 1 merged`, chevron) → `TvPlaylistPanel`; eyebrow M3U + textrad *M3U URLs* (värde eller *Not set*, öppnar tangentbordet) + **Fetch list**; eyebrow XTREAM LOGIN + tre textrader + **Log in & fetch**; PROGRAMME GUIDE STATUS + note + guiderad (`Guide fetched 12:37`, hint `4,197 channels · 66,111 programmes`, värde **Refetch EPG**); USE AS LIBRARY + note + biblioteksrad (värd, hint `16,713 titles ready to index`, värde **Build library**/**Rebuild**) + note.

**`TvPlaylistPanel` (L:list, facit 1957–1993):** titel värd, hint `Xtream · 2,037 channels`; rader: info Status/Channels; act **Categories** (`Edit`) → `TvCategoriesPanel`; act **Update channels**/**Refetch**; eyebrow EPG SOURCES; en act per källa (Remove) eller note *No EPG source for this playlist yet.*; act **Add XMLTV URL** → tangentbord → lägg till; tog *Fill in missing logos from iptv-org*; eyebrow PLAYLIST; act **Remove playlist** → `TvConfirmRows` (titel `Remove {host}?`, body, Cancel/**Remove**); knapp **Complete** (stänger).

**`TvCategoriesPanel` (L:cats, facit 2027–2076):** note summary; knapprad: Show all · Hide all · **Merge categories** | i markeringsläge Cancel · **Merge N categories**/*Mark two or more*; MERGED: per merge rad `name` (meta medlemmar · N channels, värde **Rename** → `TvNamePanel` i redigeringsläge) + rad `Split {name}` (meta *The categories return as separate rows*); eyebrow CATEGORIES / MARK THE CATEGORIES TO MERGE; per kategori tog (visa/dölj) eller act Mark/Marked; note *To merge categories: press Merge categories, mark two or more rows, then give the merged category a name. It shows as one row in Live TV.*; knapp **Save** (skriver `updateLiveTvListCuration`, toast *Categories saved*, stänger). Utkastet är lokalt; Bakåt utan Save = kasta.

**`TvNamePanel` (L:name, facit 1994–2026):** titel *Name the merged category* / *Rename merged category*, hint medlemmarna `A · B`; `TvKeyboardPanel` (SDK) med `extra`: **Use “{suggest}”** (första medlemmen utan `Live: `-prefix, bara när fältet är tomt), **Clear**, och Klar-knappen = **Merge** / **Save name**. Tomt namn → toast *Give the category a name*. Efter merge/rename: toast *Merged into {name}* / *Renamed to {name}*, tillbaka till L:cats med nollställd markering.

Bakåt: varje panel `useBackLayer` (Task 2). Fokus återförs till raden man kom ifrån.

- [ ] **Step 1: Tester** (TV-läge, `nav`-fri): sidan renderar PLAYLISTS-rader med rätt värde; OK på raden öppnar L:list med rätt rader; Categories → L:cats; Merge categories → markeringsläge, två Mark → Merge 2 → L:name → Klar (stubben) → tillbaka med mergen i utkastet; Save skriver; Escape stänger översta panelen bara.
- [ ] **Step 2–4:** FAIL → implementera → PASS, hela sviten.
- [ ] **Step 5: Commit** `live-tv: TV-inställningarna som rader och tre staplade vyer enligt handoff §4.2`

---

### Task 6: Strängar, städning, bygge

**Files:** `runtime/hub-strings.ts` (alla nya nycklar EN/SV), borttagning av `tv-linear-nav`-koppling om TV-sidan inte längre behöver den (TV-raderna är en kolumn → geometrin räcker; behåll modulen om andra sektioner använder den), `CHANGELOG.md` (0.11.0-posten kompletteras: *Settings page rebuilt: each playlist is one card with its categories, EPG sources and logo choice; a proper merge flow; TV gets remote-driven views*).

- [ ] **Step 1:** `npx tsc --noEmit -p tsconfig.json` (bara förbefintliga fel), `npx vitest run` (grönt utom det klockberoende `tv-player-chrome`-testet efter 12:11).
- [ ] **Step 2:** bygg-grinden från `.worktrees/main-plugin-build`; `generate-bundled-plugin-runtimes.mjs` i Moviefinder för dev-servern.
- [ ] **Step 3: Commit** `live-tv 0.11.0: inställningssidan enligt handoff`
