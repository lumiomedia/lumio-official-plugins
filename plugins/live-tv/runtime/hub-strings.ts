'use client'

import { useLang } from '@/lib/plugin-sdk'

/**
 * Hubbens texter bor i pluginet: pluginet auto-uppdateras oberoende av appen,
 * så nya nycklar i appens i18n hade gett råa nyckelnamn i äldre appar.
 */
const EN = {
  hubTitle: 'Live TV',
  hubAllGroups: 'All',
  hubOpenGrid: 'All channels',
  hubOpenGuide: 'Channel guide',
  hubLive: 'LIVE',
  hubWatchNow: 'Watch now',
  hubNoProgramme: 'No programme information',
  hubGuideKicker: 'Guide',
  hubGuideTitle: 'What is on tonight?',
  hubGuideBody: 'Browse channels and times side by side and jump straight into a programme.',
  hubFavorites: 'Your favourite channels',
  hubFavoritesEmpty: 'No favourites yet. Tap the heart on a channel to pin it here.',
  hubContinue: 'Continue watching',
  hubContinueEmpty: 'Channels you watch show up here.',
  hubRecommended: 'Recommended for you',
  hubRecommendedBecause: 'You often watch {group}',
  hubAllChannels: 'All channels',
  hubShowAllInGrid: 'Show all {count} channels',
  hubNext: 'Next',
  hubWatchedAt: 'Watched {time}',
  hubYesterday: 'yesterday',
  hubEmptyTitle: 'No channels yet',
  hubEmptyBody: 'Add an M3U playlist or an Xtream login under Settings → Live TV.',
  hubPin: 'Add to favourites',
  hubUnpin: 'Remove from favourites',
  guideToday: 'Today',
  guideTomorrow: 'Tomorrow',
  guideWatch: 'Watch',
} as const

const SV: Record<keyof typeof EN, string> = {
  hubTitle: 'Live TV',
  hubAllGroups: 'Alla',
  hubOpenGrid: 'Alla kanaler',
  hubOpenGuide: 'Kanalguide',
  hubLive: 'LIVE',
  hubWatchNow: 'Titta nu',
  hubNoProgramme: 'Ingen programinformation',
  hubGuideKicker: 'Guide',
  hubGuideTitle: 'Vad går i kväll?',
  hubGuideBody: 'Bläddra kanaler och tider sida vid sida och hoppa rakt in i ett program.',
  hubFavorites: 'Dina favoritkanaler',
  hubFavoritesEmpty: 'Inga favoriter ännu. Tryck på hjärtat på en kanal för att fästa den här.',
  hubContinue: 'Fortsätt titta',
  hubContinueEmpty: 'Kanaler du tittar på dyker upp här.',
  hubRecommended: 'Rekommenderat för dig',
  hubRecommendedBecause: 'Du ser ofta {group}',
  hubAllChannels: 'Alla kanaler',
  hubShowAllInGrid: 'Visa alla {count} kanaler',
  hubNext: 'Näst',
  hubWatchedAt: 'Sågs {time}',
  hubYesterday: 'i går',
  hubEmptyTitle: 'Inga kanaler ännu',
  hubEmptyBody: 'Lägg till en M3U-lista eller en Xtream-inloggning under Inställningar → Live TV.',
  hubPin: 'Lägg till i favoriter',
  hubUnpin: 'Ta bort från favoriter',
  guideToday: 'Idag',
  guideTomorrow: 'Imorgon',
  guideWatch: 'Titta',
}

export type HubStringKey = keyof typeof EN

export function hubText(lang: string | undefined, key: HubStringKey, vars?: Record<string, string | number>): string {
  const table = lang === 'sv' ? SV : EN
  let out: string = table[key] ?? EN[key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) out = out.replace(`{${name}}`, String(value))
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
