'use client'

import { formatClock, progressOf } from '../../live-tv-ui'
import type { PlayerSportProps } from '../../tv/tv-player-types'
import { useTvText } from '../../tv/tv-strings'
import { station } from '../../tv/tv-ui'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { MIcons } from '../../tv/mobile/mobile-icons'
import { matchTitle, type SportMatch } from '../sport-model'
import { playerMatchGroups, rankedSources, statusAt } from '../sport-day-model'
import { matchStatusLabel, scoreText } from '../score-model'
import { PhoneCrest } from './sport-results-phone'

/**
  Telefonens Matcher-ark i spelaren: samma tidsgrupper som TV:ns låda
  ("Pågår nu", sedan avsparkstid), märkena bredvid varandra, kanalen som
  underrad och en Multiview-ikon per rad. Arket (MobileSheet) äger
  "Öppna i Multiview" som sin enda post när något är markerat.
*/
export function PhoneMatchList({ sport, currentKey, nowMs, locale, picked, onTogglePick, onDone }: { sport: PlayerSportProps; currentKey: string; nowMs: number; locale: string; picked: string[]; onTogglePick: (m: SportMatch) => void; onDone: () => void }) {
  const { tt } = useTvText()
  const groups = playerMatchGroups(sport.matches, currentKey, nowMs)
  return (
    <div data-testid="phone-matches-list">
      {groups.map((g) => (
        <div key={g.start ?? 'now'} data-testid="phone-matches-group">
          <div style={{ padding: '12px 20px 4px', fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: g.start === null ? MT.acc : MT.muted }}>
            {g.start === null ? tt('sportLiveOnChannels') : formatClock(g.start, locale)}
          </div>
          {g.matches.map((m) => {
            const st = statusAt(m, nowMs)
            const title = matchTitle(m)
            const on = picked.includes(m.id)
            const here = st === 'live' && m.sources.some((s) => s.channelKey === currentKey)
            const best = rankedSources(m, sport.overrides)[0]
            const status = st === 'live' ? matchStatusLabel(m, tt) ?? tt('live') : formatClock(m.start, locale)
            return (
              <div key={m.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px 0 20px', minHeight: 60, borderBottom: `1px solid ${MT.line07}`, background: here ? MT.accMix(12) : 'transparent' }}>
                <div data-testid="phone-match-row" {...station(() => { sport.onSwitchMatch(m); onDone() }, undefined, { 'aria-label': title })} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0' }}>
                  <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {m.home ? <PhoneCrest name={m.home} src={m.homeCrest} size={26} /> : null}
                    {m.away ? <PhoneCrest name={m.away} src={m.awayCrest} size={26} /> : null}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{title}</div>
                    <div style={{ fontSize: 12.5, color: MT.muted, ...ellipsis }}>{[best?.name, m.league].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {scoreText(m) ? <span style={{ fontSize: 15, fontWeight: 700 }}>{scoreText(m)}</span> : null}
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: st === 'live' ? MT.acc : MT.muted }}>{status}</span>
                  </span>
                </div>
                <div data-testid="phone-match-mv" {...station(() => onTogglePick(m), undefined, { 'aria-label': on ? tt('sportMultiviewRemove', { name: title }) : tt('sportMultiviewAdd', { name: title }) })} aria-pressed={on ? 'true' : 'false'} style={{ width: MT.HIT, height: MT.HIT, flexShrink: 0, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: on ? MT.onAcc : MT.muted, background: on ? MT.acc : 'transparent' }}>
                  <MIcons.SquaresFour size={20} />
                </div>
                {st === 'live' ? <div aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: `${Math.round(progressOf(m.start, m.stop, nowMs) * 100)}%`, background: MT.acc }} /> : null}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
