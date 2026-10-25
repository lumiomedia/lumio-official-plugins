import type { TvStringKey } from '../tv/tv-strings'
import type { RateStatus } from './results-controller'
import { PROVIDER_LABEL } from './providers'
import { textLang } from '../lang'

function svOrdinal(n: number): string {
  const last = n % 10
  const lastTwo = n % 100
  return (last === 1 || last === 2) && lastTwo !== 11 && lastTwo !== 12 ? 'a' : 'e'
}

export function everyText(ms: number, lang: string): string {
  const minutes = ms >= 60_000
  const n = Math.max(1, Math.round(ms / (minutes ? 60_000 : 1_000)))
  const unit = minutes ? 'min' : 's'
  switch (textLang(lang)) {
    case 'sv':
      if (n === 1) return minutes ? 'varje minut' : 'varje sekund'
      return `var ${n}:${svOrdinal(n)} ${unit}`
    case 'de':
      if (n === 1) return minutes ? 'jede Minute' : 'jede Sekunde'
      return `alle ${n} ${unit}`
    case 'fr':
      if (n === 1) return minutes ? 'chaque minute' : 'chaque seconde'
      return `toutes les ${n} ${unit}`
    case 'es':
      if (n === 1) return minutes ? 'cada minuto' : 'cada segundo'
      return `cada ${n} ${unit}`
    default:
      if (n === 1) return minutes ? 'every minute' : 'every second'
      return `every ${n} ${unit}`
  }
}

/** Den tysta raden i Sport-huvudet och matchcentret. `null` = ingen rad (ingen nyckel: kortet syns i stället). */
export function rateLine(
  s: RateStatus,
  tt: (k: TvStringKey, v?: Record<string, string | number>) => string,
  opts: { lang: string; locale: string; tz?: string },
): { text: string; showPaidLink: boolean } | null {
  if (s.state === 'no-key') return null
  if (s.state === 'invalid-key') return { text: tt('sportKeyBroken'), showPaidLink: false }
  if (s.state === 'paused' && s.pausedUntil != null) {
    const time = new Intl.DateTimeFormat(opts.locale, { hour: '2-digit', minute: '2-digit', timeZone: opts.tz }).format(s.pausedUntil)
    return { text: tt('sportRatePaused', { time }), showPaidLink: false }
  }
  if (s.state === 'rate-limited') return { text: tt('sportRateMinute'), showPaidLink: false }
  const left = s.remainingToday != null ? ` · ${tt('sportRateLeft', { n: s.remainingToday })}` : ''
  const head = s.intervalMs != null ? tt('sportRateEvery', { every: everyText(s.intervalMs, opts.lang) }) : tt('sportRateIdle')
  // Flera källor: säg vilken sporten faktiskt använder (efter genomfall när den förstas kvot är slut).
  const via = s.multi && s.provider ? ` · ${tt('sportRateVia', { source: PROVIDER_LABEL[s.provider] })}` : ''
  return { text: `${head}${left}${via}`, showPaidLink: s.provider === 'api-sports' && !s.paid }
}
