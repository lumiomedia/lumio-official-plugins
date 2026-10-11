import type { TvStringKey } from './tv-strings'

/**
 * STARTVY (Jerry 2026-10-11: "en inställning i live tv, som väljer vilken av
 * vyerna … appen startar — home är alltid default").
 *
 * Gäller bara när Live TV öppnas UTAN mål: menyvalet, rälsens väg in och en
 * kallstart rakt in i Live TV — alltså när värden öppnar sidan helt utan
 * params. Allt med ett uttryckligt mål (direktlänk, kanal, `view`, sportsidan)
 * vinner som förut.
 *
 * Multivyn är medvetet inte ett val: den startar nativa videoytor, och utan
 * valda kanaler är den en tom ruta att landa i. Sök och Inställningar är inga
 * platser man "bor" i.
 */
export type LiveTvStartView = 'home' | 'hub' | 'guide' | 'sport' | 'library' | 'favs'

/** Ordningen är rälsens. */
export const START_VIEWS: readonly LiveTvStartView[] = ['home', 'hub', 'guide', 'sport', 'library', 'favs']
export const DEFAULT_START_VIEW: LiveTvStartView = 'home'

export function sanitizeStartView(raw: unknown): LiveTvStartView {
  return (START_VIEWS as readonly unknown[]).includes(raw) ? (raw as LiveTvStartView) : DEFAULT_START_VIEW
}

/** Nästa val (TV-raderna växlar runt med OK, som infobannerns tid). */
export function nextStartView(current: LiveTvStartView): LiveTvStartView {
  return START_VIEWS[(START_VIEWS.indexOf(current) + 1) % START_VIEWS.length]
}

/** Valens namn är rälsens — samma ord som användaren ser i Live TV. */
export function startViewLabelKey(view: LiveTvStartView): TvStringKey {
  switch (view) {
    case 'home': return 'railHome'
    case 'hub': return 'railChannels'
    case 'guide': return 'railGuide'
    case 'sport': return 'railSport'
    case 'library': return 'railLibrary'
    case 'favs': return 'railFavourites'
  }
}

/**
 * Var en öppning utan mål faktiskt landar. `'home'` = VOD-hemmet (skalet kollar
 * indexet och går vidare, annars Kanaler). Med "Dölj VOD helt" finns varken
 * Hem eller Bibliotek — då Kanaler, som förut.
 */
export function resolveStartView(view: LiveTvStartView, vodHidden: boolean): LiveTvStartView {
  if (vodHidden && (view === 'home' || view === 'library')) return 'hub'
  return view
}

/** Skalets rotvy för en startvy: Hem har ingen egen vy i skalet, dess reserv är Kanaler. */
export function startRootView(view: LiveTvStartView, vodHidden: boolean): Exclude<LiveTvStartView, 'home'> {
  const resolved = resolveStartView(view, vodHidden)
  return resolved === 'home' ? 'hub' : resolved
}
