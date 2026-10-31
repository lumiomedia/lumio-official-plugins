/**
 * Delade `Intl.DateTimeFormat` per språk + alternativ.
 *
 * `Date.prototype.toLocale*String(locale, opts)` bygger en ny formaterare vid
 * VARJE anrop — på en Mi Box S var det 23 % av guidens tid per pil-tryck
 * (två klockslag per block × 238 block). Formateraren är tillståndslös, så en
 * per nyckel räcker; utdata är identisk med `toLocale*String`.
 */
const formatters = new Map<string, Intl.DateTimeFormat>()

export function cachedDateTimeFormat(locale: string | string[] | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${Array.isArray(locale) ? locale.join(',') : locale ?? ''}|${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    formatters.set(key, formatter)
  }
  return formatter
}

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
const clocks = new Map<string, Intl.DateTimeFormat>()

/** "HH:MM" som `toLocaleTimeString(locale, { hour, minute })`, utan ny formaterare per anrop. */
export function clockFormat(locale: string): Intl.DateTimeFormat {
  let formatter = clocks.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, CLOCK)
    clocks.set(locale, formatter)
  }
  return formatter
}
