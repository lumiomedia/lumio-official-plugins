'use client'

import { TV, station } from '../../tv/tv-ui'
import type { SportCtx } from '../sport-ctx'
import type { SquadPlayer } from '../team-providers'
import { positionGroup } from '../match-info-model'
import { positionLabel } from '../match-info/match-info-text'
import { IconBtn, PlayerAvatar, ellipsis, rowCard, type U } from '../match-info/match-info-parts'
import { flagEmoji } from '../team-model'
import { SportIcons } from '../sport-icons'
import { NOOP } from './page-parts'
import { SportPageDrawer } from './sport-page-drawer'

/*
  SPELARKORTET PÅ LAGSIDAN (Jerry 2026-10-12: spelarna gick inte att trycka
  på). Bara det truppens EGET svar redan har — inga spelaranrop: källornas
  spelarslag kostar kvot och ger inte mer (API-Sports /players kräver en
  säsong gratisplanen saknar, sportapi.ai:s statistik kräver frågeparametrar
  genomkopplingen inte släpper igenom). En spelare utan något utöver namn,
  nummer och position öppnar inget kort (och är inget fokusstopp på TV).
*/

/** Har spelaren något mer att visa än raden i truppen redan visar? */
export function hasPlayerDetails(p: SquadPlayer): boolean {
  return !!(p.photo || p.age || p.nationality || p.born || p.height || p.injury)
}

/** Åldern ur födelsedagen ("1992-05-11"), annars källans ålder. */
export function playerAge(p: SquadPlayer, now: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(p.born ?? '')
  if (!m) return p.age ?? null
  const d = new Date(now)
  let age = d.getFullYear() - Number(m[1])
  if (d.getMonth() + 1 < Number(m[2]) || (d.getMonth() + 1 === Number(m[2]) && d.getDate() < Number(m[3]))) age -= 1
  return age
}

export function PlayerDrawer({ u, ctx, player, teamName, depth, phone, onClose }: { u: U; ctx: SportCtx; player: SquadPlayer; teamName: string; depth: number; phone: boolean; onClose: () => void }) {
  const age = playerAge(player, ctx.now)
  const group = positionGroup(player.pos)
  // Nationaliteten är ibland en landskod ("BE"): flaggan då, koden står kvar som text.
  const nat = player.nationality ? (/^[A-Z]{2}$/.test(player.nationality) ? `${flagEmoji(player.nationality)} ${player.nationality}` : player.nationality) : null
  const born = player.born ? new Date(`${player.born.slice(0, 10)}T12:00:00`).toLocaleDateString(ctx.locale, { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const facts: Array<[string, string]> = [
    ...(player.number != null ? [[ctx.tt('sportPlayerNumber'), `#${player.number}`] as [string, string]] : []),
    ...(player.pos ? [[ctx.tt('sportPlayerPosition'), group === 'other' ? player.pos : positionLabel(group, ctx.tt)] as [string, string]] : []),
    ...(nat ? [[ctx.tt('sportPlayerNationality'), nat] as [string, string]] : []),
    ...(born ? [[ctx.tt('sportPlayerBorn'), age != null ? `${born} (${ctx.tt('sportPlayerAgeYears', { n: age })})` : born] as [string, string]] : age != null ? [[ctx.tt('sportPlayerAge'), ctx.tt('sportPlayerAgeYears', { n: age })] as [string, string]] : []),
    ...(player.height ? [[ctx.tt('sportPlayerHeight'), player.height] as [string, string]] : []),
    ...(player.injury ? [[ctx.tt('sportTeamInjured'), player.injury] as [string, string]] : []),
  ]
  const head = (
    <div data-testid="pl-head" style={{ display: 'flex', alignItems: 'center', gap: u(18) }}>
      <PlayerAvatar u={u} name={player.name} photo={player.photo} size={u(96)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div data-testid="pl-name" style={{ fontSize: u(28), fontWeight: 700, ...ellipsis }}>{player.name}</div>
        <div style={{ fontSize: u(17), color: TV.muted, ...ellipsis }}>{[player.number != null ? `#${player.number}` : null, teamName].filter(Boolean).join(' · ')}</div>
      </div>
      {phone ? null : <IconBtn u={u} testId="pl-close" label={ctx.tt('sportClose')} onPress={onClose}><SportIcons.Close size={u(20)} /></IconBtn>}
    </div>
  )
  return (
    <SportPageDrawer nav={ctx.nav} depth={depth} phone={phone} testId="player-drawer" label={player.name} onClose={onClose} head={head}>
      <div data-page-depth={depth} style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
        {facts.map(([label, value]) => (
          <div key={label} data-testid="pl-fact" {...station(NOOP)} style={{ ...rowCard(u), display: 'flex', alignItems: 'center', gap: u(12), minHeight: u(60), padding: `0 ${u(20)}px` }}>
            <span style={{ flex: 1, fontSize: u(17), color: TV.muted }}>{label}</span>
            <span style={{ fontSize: u(18), fontWeight: 700, color: label === ctx.tt('sportTeamInjured') ? '#f87171' : TV.text }}>{value}</span>
          </div>
        ))}
      </div>
    </SportPageDrawer>
  )
}
