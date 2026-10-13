'use client'

import { formatClock } from '../../live-tv-ui'
import { TV, station } from '../../tv/tv-ui'
import { localDayKey } from '../sport-epg'
import { FORM_COLOR, formLetters } from '../results-model'
import type { StandingRow } from '../provider'
import type { TeamFixture } from '../team-providers'
import type { SportCtx } from '../sport-ctx'
import { Crest } from '../crest'
import { SportIcons } from '../sport-icons'
import { ellipsis, rowCard, type U } from '../match-info/match-info-parts'
import { focusAttr } from '../surface'

/*
  Lag- och ligasidans byggstenar. Samma skala (`u`) som matchinfon: TV och
  skrivbord i full storlek, telefonen 0,8.
*/

// Rader är fokusstopp även när OK inte gör något: annars når fjärrkontrollen aldrig ner i listan.
export const NOOP = () => {}

/** "Idag 19:00" / "Imorgon 19:00" / "tis 14 okt 19:00"; bara datum när källan saknar klockslag. */
export function fixtureWhen(f: Pick<TeamFixture, 'kickoff' | 'dateOnly'>, ctx: Pick<SportCtx, 'now' | 'locale' | 'tt'>): string {
  const time = formatClock(f.kickoff, ctx.locale)
  const day = localDayKey(f.kickoff)
  const tomorrow = localDayKey(ctx.now + 86_400_000)
  const date = new Date(f.kickoff).toLocaleDateString(ctx.locale, { weekday: 'short', day: 'numeric', month: 'short' })
  if (f.dateOnly) return day === localDayKey(ctx.now) ? ctx.tt('sportToday') : day === tomorrow ? ctx.tt('sportTomorrow') : date
  if (day === localDayKey(ctx.now)) return ctx.tt('sportTodayAt', { time })
  if (day === tomorrow) return ctx.tt('sportTomorrowAt', { time })
  return `${date} ${time}`
}

/** V/O/F-brickan (sv) eller W/D/L (en) i formens färger. */
export function FormLetter({ u, kind, letter, size = 28 }: { u: U; kind: 'W' | 'D' | 'L'; letter: string; size?: number }) {
  return (
    <span data-testid="form-letter" data-result={kind} style={{ width: u(size), height: u(size), flexShrink: 0, borderRadius: u(7), background: FORM_COLOR[kind], color: '#0e0f13', fontSize: u(Math.round(size * 0.6)), fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{letter}</span>
  )
}

/**
 * Tabellraderna: placering, märke och namn, spelade, +/-, poäng och (med
 * `form`) formen. `mark` = radens index som markeras (laget sidan handlar
 * om); `highlight` markerar fler rader på samma sätt (följda lag). En rad med
 * `onOpen` öppnar lagets egen sida; annars är raden ett tomt fokusstopp.
 * `rowAttrs` ger raderna uttryckliga grannar när tabellen ligger i en lista.
 */
export const FORM_SIZE = 22
const FORM_GAP = 4
/** Luft mellan poängen och formbrickorna. */
const FORM_LEAD = 24
export function StandingsRows({ u, rows, mark, ctx, onOpen, testId, form, highlight, rowAttrs, rowText = 17, crest = 26 }: {
  u: U; rows: StandingRow[]; mark: number; ctx: Pick<SportCtx, 'tt'>; onOpen?: (row: StandingRow) => void; testId: string
  form?: boolean; highlight?: (row: StandingRow) => boolean; rowAttrs?: (i: number, n: number) => Record<string, string> | undefined
  /** Radtextens storlek i designpixlar före skalan (förval 17). */
  rowText?: number
  /** Märkets storlek i designpixlar före skalan (förval 26). */
  crest?: number
}) {
  // Med form (resultattabellen, full bredd): sifferkolumnerna lite luftigare och formen en bit från poängen.
  const formW = 5 * u(FORM_SIZE) + 4 * u(FORM_GAP)
  const cols = form
    ? `${u(34)}px minmax(0,1fr) ${u(52)}px ${u(60)}px ${u(60)}px ${formW + u(FORM_LEAD)}px`
    : `${u(34)}px minmax(0,1fr) ${u(40)}px ${u(48)}px ${u(48)}px`
  return (
    <div data-testid={testId} style={{ ...rowCard(u), padding: `${u(6)}px ${u(10)}px`, display: 'flex', flexDirection: 'column' }}>
      <div data-testid={`${testId}-head`} style={{ display: 'grid', gridTemplateColumns: cols, gap: u(8), padding: `${u(6)}px ${u(8)}px`, fontSize: u(14), fontWeight: 700, color: u.dim }}>
        <span>#</span><span>{ctx.tt('sportColTeam')}</span><span style={{ textAlign: 'right' }}>{ctx.tt('sportColPlayed')}</span><span style={{ textAlign: 'right' }}>+/-</span><span style={{ textAlign: 'right' }}>{ctx.tt('sportColPoints')}</span>
        {form ? <span style={{ paddingLeft: u(FORM_LEAD) }}>{ctx.tt('sportColForm')}</span> : null}
      </div>
      {rows.map((r, i) => {
        const on = i === mark || !!highlight?.(r)
        return (
          <div key={`${r.group ?? ''}-${r.rank}-${r.team.id || r.team.name}`} data-testid="page-standings-row" data-mark={on ? '1' : '0'} {...station(onOpen ? () => onOpen(r) : NOOP, undefined, { ...focusAttr('table-row'), ...rowAttrs?.(i, rows.length) })}
            aria-label={onOpen ? ctx.tt('sportTeamOpen', { name: r.team.name }) : undefined}
            style={{ display: 'grid', gridTemplateColumns: cols, gap: u(8), alignItems: 'center', minHeight: u(48), padding: `0 ${u(8)}px`, borderRadius: u(10), fontSize: u(rowText), cursor: onOpen ? 'pointer' : 'default', background: on ? TV.accMix(20) : 'transparent', color: on ? TV.accText : TV.text, fontWeight: on ? 700 : 500 }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: on ? TV.accText : TV.muted }}>{r.rank}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: u(10), minWidth: 0 }}>
              <Crest name={r.team.name} colorKey={r.team.id || r.team.name} src={r.team.crest} size={u(crest)} />
              <span style={ellipsis}>{r.team.name}</span>
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: TV.muted }}>{r.played}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: TV.muted }}>{r.goalDiff == null ? '' : r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>{r.points}</span>
            {form ? (
              <span data-testid="standings-form" style={{ display: 'flex', gap: u(FORM_GAP), paddingLeft: u(FORM_LEAD) }}>
                {formLetters(r.form, ctx.tt).slice(-5).map((f, k) => <FormLetter key={k} u={u} kind={f.kind} letter={f.letter} size={FORM_SIZE} />)}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

/** En match i en lista (kommande, omgången): när, lagen och ställningen eller tiden; kanal och klocka när tablån har den. */
export function FixtureRow({ u, f, ctx, title, sub, reminded, onPress, testId }: { u: U; f: TeamFixture; ctx: SportCtx; title: string; sub: string; reminded?: boolean | null; onPress?: () => void; testId: string }) {
  const score = f.score && f.status !== 'scheduled' ? `${f.score.home}–${f.score.away}` : null
  const live = f.status === 'live' || f.status === 'ht'
  return (
    <div data-testid={testId} {...station(onPress ?? NOOP)} style={{ ...rowCard(u), minHeight: u(68), display: 'flex', alignItems: 'center', gap: u(14), padding: `${u(10)}px ${u(16)}px`, cursor: onPress ? 'pointer' : 'default' }}>
      <span style={{ width: u(156), flexShrink: 0, whiteSpace: 'nowrap', fontSize: u(15), fontWeight: 700, color: live ? TV.live : TV.muted, fontVariantNumeric: 'tabular-nums' }}>{live ? ctx.tt('sportLiveShort') : fixtureWhen(f, ctx)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: u(18), fontWeight: 700, ...ellipsis }}>{title}</div>
        {sub ? <div style={{ fontSize: u(15), color: TV.muted, ...ellipsis }}>{sub}</div> : null}
      </div>
      {score ? <span style={{ fontSize: u(20), fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{score}</span> : null}
      {reminded != null ? <span data-testid="page-fixture-bell" data-on={reminded ? '1' : '0'} style={{ display: 'inline-flex', flexShrink: 0, color: reminded ? TV.acc : u.dim }}><SportIcons.Bell size={u(20)} /></span> : null}
    </div>
  )
}

export function PageNote({ u, text, testId }: { u: U; text: string; testId: string }) {
  return <div data-testid={testId} {...station(NOOP)} style={{ fontSize: u(17), color: u.dim, padding: `${u(4)}px 0` }}>{text}</div>
}
