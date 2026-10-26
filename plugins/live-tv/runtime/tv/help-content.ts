/**
 * SÅ GÖR DU — Live TV:s hjälpsida (feedback 2026-10-26: "Where do you go to
 * get information on how to use this app?"). Varje avsnitt är en sak man kan
 * göra, med stegen i gränssnittets egna ord: knapptexterna här måste stämma
 * med tv-strings.ts. Engelska och svenska; övriga språk visar engelska.
 *
 * "Hold OK" är fjärrens håll; på datorn motsvaras det av högerklick eller
 * "…" som syns när man pekar, och på telefonen av ett långt tryck.
 */
export interface HelpSection { id: string; title: string; steps: string[] }

const en: HelpSection[] = [
  { id: 'menu', title: 'The channel menu', steps: [
    'Hold OK on a channel or programme to open its menu. On a computer, right-click or use the … button; on a phone, press and hold.',
    'The menu has Add to favourites, Add to multiview, Remind me and more.',
  ] },
  { id: 'playlist', title: 'Add a playlist', steps: [
    'Live TV → Settings → Playlists.',
    'Choose Add M3U URL for a playlist address, or Add Xtream login for a server with username and password.',
    'After the first import you can choose which categories to keep.',
  ] },
  { id: 'favourites', title: 'Favourites and their order', steps: [
    'Hold OK on a channel and choose Add to favourites.',
    'To reorder: open Favourites in the rail, hold OK on a channel and choose Move up or Move down. On a phone: Favourites → Edit, then drag.',
    'The order sets the number keys: 1 is the first favourite.',
  ] },
  { id: 'lists', title: 'Your own lists', steps: [
    'Live TV → Settings → Playlists → Create list, and give it a name.',
    'Pick the channels to include. Later, Channels on the list changes them and Rename changes the name.',
    'Your list appears in the Guide under Playlists.',
  ] },
  { id: 'categories', title: 'Tidy up categories', steps: [
    'Live TV → Settings → Playlists → choose the playlist → Categories.',
    'OK on a category shows or hides it. Merge into… joins several categories under one name; OK on a merged category splits it again.',
    'The order of categories: Settings → Appearance → Group order (playlist order, A–Z or most channels).',
  ] },
  { id: 'shift', title: 'The guide shows the wrong time', steps: [
    'If the whole guide is hours off, your provider labels its times with the wrong time zone.',
    'Live TV → Settings → EPG sources → Guide time shift, and choose how many hours to move it.',
  ] },
  { id: 'multiview', title: 'Multiview', steps: [
    'Open Multiview in the rail, or hold OK on a channel and choose Add to multiview.',
    'Choose 2 tiles, 1 + 2 or 4 tiles. OK on a tile moves the sound there; hold OK on a tile to switch channel, enlarge it, open it full screen or remove it.',
    'Full screen fills the screen with the tiles. Back leaves full screen.',
  ] },
  { id: 'sport', title: 'Sport: today’s games', steps: [
    'Open Sport in the rail. Step between yesterday, today and tomorrow, and use the chips to show one sport.',
    'OK on a match opens the match info: pick which channel to watch on, then Watch.',
    'Tick matches in the Evening plan to plan your night. A match without a channel yet stays in the plan and gets its reminder when a channel shows it.',
    'Scores come free for many leagues (including NFL, NBA and NHL). For more, add your own key under Settings → Sport.',
  ] },
  { id: 'switch', title: 'Switch between games while watching', steps: [
    'While a match plays, choose Matches in the player. OK on another match switches to it.',
    'To watch several at once: in Matches, add up to four games to Multiview and choose Open in Multiview.',
  ] },
]

const sv: HelpSection[] = [
  { id: 'menu', title: 'Kanalmenyn', steps: [
    'Håll OK på en kanal eller ett program för att öppna menyn. På datorn högerklickar du eller använder …; på telefonen håller du fingret kvar.',
    'I menyn finns Lägg till i favoriter, Lägg till i multivy, Påminn mig med mera.',
  ] },
  { id: 'playlist', title: 'Lägg till en spellista', steps: [
    'Live TV → Inställningar → Spellistor.',
    'Välj Lägg till M3U-URL för en adress, eller Lägg till Xtream-inloggning för en server med användarnamn och lösenord.',
    'Efter första importen väljer du vilka kategorier som ska vara med.',
  ] },
  { id: 'favourites', title: 'Favoriter och deras ordning', steps: [
    'Håll OK på en kanal och välj Lägg till i favoriter.',
    'Ändra ordning: öppna Favoriter i ikonraden, håll OK på en kanal och välj Flytta upp eller Flytta ner. På telefonen: Favoriter → Redigera och dra.',
    'Ordningen styr sifferknapparna: 1 är första favoriten.',
  ] },
  { id: 'lists', title: 'Egna listor', steps: [
    'Live TV → Inställningar → Spellistor → Skapa lista, och ge den ett namn.',
    'Välj kanalerna. Senare ändrar Kanaler på listan dem, och Byt namn ändrar namnet.',
    'Listan syns i Guiden under Spellistor.',
  ] },
  { id: 'categories', title: 'Städa kategorierna', steps: [
    'Live TV → Inställningar → Spellistor → välj spellistan → Kategorier.',
    'OK på en kategori visar eller döljer den. Slå ihop till… samlar flera kategorier under ett namn; OK på en hopslagen kategori delar den igen.',
    'Kategoriernas ordning: Inställningar → Utseende → Gruppordning (spellistans ordning, A–Ö eller flest kanaler).',
  ] },
  { id: 'shift', title: 'Guiden visar fel tid', steps: [
    'Ligger hela guiden timmar fel märker din leverantör tiderna med fel tidszon.',
    'Live TV → Inställningar → EPG-källor → Förskjut tablån, och välj hur många timmar den ska flyttas.',
  ] },
  { id: 'multiview', title: 'Multivy', steps: [
    'Öppna Multivy i ikonraden, eller håll OK på en kanal och välj Lägg till i multivy.',
    'Välj 2 rutor, 1 + 2 eller 4 rutor. OK på en ruta flyttar ljudet dit; håll OK på en ruta för att byta kanal, förstora, visa i helskärm eller ta bort den.',
    'Helskärm fyller skärmen med rutorna. Bakåt lämnar helskärmen.',
  ] },
  { id: 'sport', title: 'Sport: dagens matcher', steps: [
    'Öppna Sport i ikonraden. Stega mellan i går, i dag och i morgon, och välj sport med knapparna.',
    'OK på en match öppnar matchinfon: välj kanal och sedan Titta.',
    'Bocka matcher i Kvällsplanen för att planera kvällen. En match utan kanal ännu ligger kvar i planen och får sin påminnelse när en kanal visar den.',
    'Resultat finns gratis för många ligor (bland annat NFL, NBA och NHL). För fler lägger du in en egen nyckel under Inställningar → Sport.',
  ] },
  { id: 'switch', title: 'Byt match medan du tittar', steps: [
    'När en match spelas väljer du Matcher i spelaren. OK på en annan match byter till den.',
    'Flera samtidigt: lägg till upp till fyra matcher i Multivy under Matcher och välj Öppna i Multiview.',
  ] },
]

export function helpSections(lang: string): HelpSection[] {
  return lang === 'sv' ? sv : en
}
