'use client'

import { useLang } from '@/lib/plugin-sdk'

/**
 * Live TV-vyernas texter bor i pluginet: pluginet auto-uppdateras oberoende
 * av appen, så nya nycklar i appens i18n hade gett råa nyckelnamn i äldre
 * appar. `{namn}` ersätts med vars.
 */
const EN = {
  categories: 'Categories',
  curationSummary: '{groups} categories · {hidden} hidden · {merged} merged',
  showAll: 'Show all',
  hideAll: 'Hide all',
  mergeInto: 'Merge into…',
  mergeHint: 'To merge categories: press Mark on two or more rows, then give the merged category a name.',
  mergeAction: 'Merge',
  mergeSelected: 'Merge selected ({n})',
  splitMerge: 'Split',
  mergeContains: 'Contains {groups}',
  markForMerge: 'Mark',
  save: 'Save',
  skip: 'Skip',
  mergeNameLabel: 'Name of the merged category',
  mergeNameEmpty: 'Give the category a name.',
  mergeNameTaken: 'A merged category with that name already exists.',
  mergeNameIsGroup: 'That name is already a visible category.',
  noCategoriesInList: 'This playlist has no categories.',
  searchCategories: 'Search categories',
  curationIntro: 'Choose which categories to show. You can change this later under the playlist\u2019s settings.',
  allCategoriesHidden: 'All categories in this playlist are hidden.',
  openCategories: 'Choose categories',
  // Gemensamt
  back: 'Back',
  search: 'Search',
  reminders: 'Reminders',
  hubLive: 'LIVE',
  hubWatchNow: 'Watch now',
  hubNoProgramme: 'No programme information',
  hubLoadingEpg: 'Fetching guide…',
  channelsCount: '{count} channels',
  minutesLeft: '{min} min left',
  // Hubb
  hubGuideKicker: 'Full channel guide',
  // EPG
  // Kanaldetalj
  today: 'Today',
  channelInfo: 'Channel information',
  quality: 'Quality',
  yes: 'Yes',
  no: 'No',
  unknown: 'Unknown',
  parental: 'Parental control',
  enterPin: 'Enter the profile PIN',
  pinWrong: 'Wrong PIN. Try again.',
  unlock: 'Unlock',
  cancel: 'Cancel',
  // Spelare
  guide: 'Guide',
  // Sök
  searchPlaceholder: 'Search channels and programmes',
  noResults: 'Nothing matched "{query}".',
  // Påminnelser
  remindersEmpty: 'No reminders. Tap the bell on a programme to add one.',
  remove: 'Remove',
  startsNow: 'Starts now on {channel}',
  startsIn: 'Starts in {min} min on {channel}',
  watch: 'Watch',
  dismiss: 'Dismiss',
  // M3U-hämtning
  m3uFetchProgress: 'Fetching list {current} of {total}…',
  m3uFetchedAt: 'fetched {time}',
  m3uNeverFetched: 'not fetched yet',
  m3uFetchFailedOn: 'Could not fetch {host}: {error}',
  m3uFetchKeepOpen: 'This can take a while for a large playlist. You can leave this page — the fetch keeps running.',
  // EPG-diagnostik (appens butik, /api/live-tv/epg/status)
  epgStatusTitle: 'Programme guide status',
  epgStatusAllLists: 'The guide is fetched once for every playlist together.',
  epgSourceStats: '{channels} channels · {programmes} programmes',
  epgSourceFetched: 'fetched {time}',
  epgFetchedAt: 'Guide fetched {time} · {programmes} programmes',
  epgNeverFetched: 'The guide has not been fetched yet.',
  epgRefresh: 'Refetch EPG',
  epgRefreshing: 'Fetching…',
  // Import-UX
  listNeedsReimport: 'Needs refetching',
  listRefetch: 'Refetch',
  listRefetching: 'Fetching…',
  listImportProgress: 'Fetching {received} of {total}…',
  listImportProgressUnknown: 'Fetching…',
  listImportParsing: 'Reading the playlist…',
  listImportWriting: 'Saving the channels…',
  listImportFailed: 'The fetch failed: {error}',
  listTruncated: 'The playlist was cut off at 64 MiB — some channels are missing',
  appTooOld: 'Live TV requires Lumio 0.1.596 or newer',
  listFull: 'The list is full — 500 channels at most',
  xtreamNeedsLogin: 'Sign in again to fetch channels',
  xtreamRelogin: 'Sign in again',
  // Logotypreserv (P5)
  logoFallbackToggle: 'Fill in missing logos from iptv-org',
  logoFallbackHint: 'Lets the list use the iptv-org logo registry when a channel has none of its own.',
  logoComplete: 'Complete',
  logoCompleteRunning: 'Completing…',
  logoCompleteResult: '{matched} of {total} completed',
  // Flerlistekörningen (Jerrys granskningsfynd): scope + framsteg syns i
  // knappens egen text, en enda lista ser fortfarande ut som `logoCompleteRunning`.
  logoCompleteRunningProgress: 'Completing list {current} of {total}…',
  // Delresultatet innan ett fel mitt i en flerlistekörning — `{error}` är
  // appens egen feltext, ordagrant, inte en omskriven variant.
  logoCompletePartialError: '{completed} of {total} lists completed — then: {error}',
  // Komplettera-knappen i själva Live TV-vyn — en egen handling, skild från
  // ovanstående switch (som bara styr OM reserven får användas).
  logoCompleteButton: 'Complete logos',
  // P8
  xtreamAccountUnavailable: 'Could not read the account',
  xtreamExpires: 'expires {date}',
  xtreamNoExpiry: 'no expiry date',
  xtreamMaxConnections: '{count} connections',
} as const

const SV: Record<keyof typeof EN, string> = {
  categories: 'Kategorier',
  curationSummary: '{groups} kategorier · {hidden} dolda · {merged} ihopslagna',
  showAll: 'Visa alla',
  hideAll: 'Dölj alla',
  mergeInto: 'Slå ihop till…',
  mergeHint: 'Slå ihop kategorier: tryck Markera på två eller fler rader och ge den ihopslagna kategorin ett namn.',
  mergeAction: 'Slå ihop',
  mergeSelected: 'Slå ihop markerade ({n})',
  splitMerge: 'Dela upp',
  mergeContains: 'Innehåller {groups}',
  markForMerge: 'Markera',
  save: 'Spara',
  skip: 'Hoppa över',
  mergeNameLabel: 'Namn på den ihopslagna kategorin',
  mergeNameEmpty: 'Ge kategorin ett namn.',
  mergeNameTaken: 'Det finns redan en ihopslagen kategori med det namnet.',
  mergeNameIsGroup: 'Det namnet är redan en synlig kategori.',
  noCategoriesInList: 'Den här spellistan har inga kategorier.',
  searchCategories: 'Sök kategorier',
  curationIntro: 'Välj vilka kategorier som ska visas. Du kan ändra det senare under spellistans inställningar.',
  allCategoriesHidden: 'Alla kategorier i den här spellistan är dolda.',
  openCategories: 'Välj kategorier',
  back: 'Tillbaka',
  search: 'Sök',
  reminders: 'Påminnelser',
  hubLive: 'LIVE',
  hubWatchNow: 'Titta nu',
  hubNoProgramme: 'Ingen programinformation',
  hubLoadingEpg: 'Hämtar tablå…',
  channelsCount: '{count} kanaler',
  minutesLeft: '{min} min kvar',
  hubGuideKicker: 'Full kanalguide',
  today: 'Idag',
  channelInfo: 'Kanalinformation',
  quality: 'Kvalitet',
  yes: 'Ja',
  no: 'Nej',
  unknown: 'Okänt',
  parental: 'Föräldrakontroll',
  enterPin: 'Ange profilens PIN-kod',
  pinWrong: 'Fel PIN-kod. Försök igen.',
  unlock: 'Lås upp',
  cancel: 'Avbryt',
  guide: 'Guide',
  searchPlaceholder: 'Sök kanaler och program',
  noResults: 'Inget matchade "{query}".',
  remindersEmpty: 'Inga påminnelser. Tryck på klockan på ett program för att lägga till en.',
  remove: 'Ta bort',
  startsNow: 'Börjar nu på {channel}',
  startsIn: 'Börjar om {min} min på {channel}',
  watch: 'Titta',
  dismiss: 'Stäng',
  // M3U-hämtning
  m3uFetchProgress: 'Hämtar lista {current} av {total}…',
  m3uFetchedAt: 'hämtad {time}',
  m3uNeverFetched: 'inte hämtad än',
  m3uFetchFailedOn: 'Kunde inte hämta {host}: {error}',
  m3uFetchKeepOpen: 'En stor spellista kan ta en stund. Du kan lämna sidan — hämtningen fortsätter.',
  epgStatusTitle: 'Tablåns status',
  epgStatusAllLists: 'Tablån hämtas en gång för alla spellistor tillsammans.',
  epgSourceStats: '{channels} kanaler · {programmes} program',
  epgSourceFetched: 'hämtad {time}',
  epgFetchedAt: 'Tablån hämtad {time} · {programmes} program',
  epgNeverFetched: 'Tablån är inte hämtad än.',
  epgRefresh: 'Hämta om EPG',
  epgRefreshing: 'Hämtar…',
  listNeedsReimport: 'Behöver hämtas om',
  listRefetch: 'Hämta om',
  listRefetching: 'Hämtar…',
  listImportProgress: 'Hämtar {received} av {total}…',
  listImportProgressUnknown: 'Hämtar…',
  listImportParsing: 'Läser spellistan…',
  listImportWriting: 'Sparar kanalerna…',
  listImportFailed: 'Hämtningen misslyckades: {error}',
  listTruncated: 'Spellistan kapades vid 64 MiB – vissa kanaler saknas',
  appTooOld: 'Live TV kräver Lumio 0.1.596 eller nyare',
  listFull: 'Listan är full — högst 500 kanaler',
  xtreamNeedsLogin: 'Logga in på nytt för att hämta kanaler',
  xtreamRelogin: 'Logga in på nytt',
  logoFallbackToggle: 'Fyll i saknade logotyper från iptv-org',
  logoFallbackHint: 'Låter listan använda iptv-orgs logotypregister när en kanal saknar egen logotyp.',
  logoComplete: 'Komplettera',
  logoCompleteRunning: 'Kompletterar…',
  logoCompleteResult: '{matched} av {total} kompletterade',
  logoCompleteRunningProgress: 'Kompletterar lista {current} av {total}…',
  logoCompletePartialError: '{completed} av {total} listor klara — sedan: {error}',
  logoCompleteButton: 'Komplettera logotyper',
  // P8
  xtreamAccountUnavailable: 'Kunde inte läsa kontot',
  xtreamExpires: 'giltigt till {date}',
  xtreamNoExpiry: 'inget utgångsdatum',
  xtreamMaxConnections: '{count} anslutningar',
}

export type HubStringKey = keyof typeof EN

export function hubText(lang: string | undefined, key: HubStringKey, vars?: Record<string, string | number>): string {
  const table = lang === 'sv' ? SV : EN
  let out: string = table[key] ?? EN[key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) out = out.split(`{${name}}`).join(String(value))
  }
  return out
}

export function useHubText() {
  const lang: string = useLang().lang
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB'
  return {
    lang,
    locale,
    h: (key: HubStringKey, vars?: Record<string, string | number>) => hubText(lang, key, vars),
  }
}
