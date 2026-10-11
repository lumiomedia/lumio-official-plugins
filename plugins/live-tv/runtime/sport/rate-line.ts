import type { TvStringKey } from '../tv/tv-strings'
import type { RateStatus } from './results-controller'

function svOrdinal(n: number): string {
  const last = n % 10
  const lastTwo = n % 100
  return (last === 1 || last === 2) && lastTwo !== 11 && lastTwo !== 12 ? 'a' : 'e'
}

export function everyText(ms: number, lang: string): string {
  const minutes = ms >= 60_000
  const n = Math.max(1, Math.round(ms / (minutes ? 60_000 : 1_000)))
  if (lang === 'sv') {
    if (n === 1) return minutes ? 'varje minut' : 'varje sekund'
    return `var ${n}:${svOrdinal(n)} ${minutes ? 'min' : 's'}`
  }
  if (n === 1) return minutes ? 'every minute' : 'every second'
  return `every ${n} ${minutes ? 'min' : 's'}`
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
  return { text: `${head}${left}`, showPaidLink: s.provider === 'api-sports' && !s.paid }
}
