import { createElement, type ComponentType } from 'react'
import type { HomeRowProps, HomeSourceContribution, PluginContext } from '@/lib/plugin-sdk'
import { tvText, type TvStringKey } from '../../tv/tv-strings'
import { KIND_KEYS } from '../sport-ctx'
import { SPORT_CHIPS } from '../sport-model'
import { getFollows } from '../sport-store'
import { seenSportLeagues } from './rows-feed'
import { leagueChoices, type SportRowKind } from './rows-model'
import { SportHomeRow } from './sport-home-row'

/*
  SPORTENS SEX HEMRADER som källor i appens radväljare (egna hemrader).

  Ingen visas av sig själv (`showOnHome: false`): användaren lägger till dem
  i Hem-inställningarna som vilken rad som helst. Radens eget val (sport,
  liga, dölj ställning) deklareras på källan (`option`) och sätts per rad i
  radredigeraren; en äldre värd utan valet ger raden standardvärdet.

  Båda facken är valfria — en värd utan dem får sporten utan hemrader.
*/

type Option = NonNullable<HomeSourceContribution['option']>

const both = (key: TvStringKey, vars?: Record<string, string>) => ({ en: tvText('en', key, vars), sv: tvText('sv', key, vars) })

const sportOption: Option = {
  label: both('sportRowOptionSport'),
  choices: () => [{ value: '', label: both('sportAll') }, ...SPORT_CHIPS.map((k) => ({ value: k, label: both(KIND_KEYS[k]) }))],
}

const leagueOption: Option = {
  label: both('sportRowOptionLeague'),
  choices: () => [
    { value: '', label: both('sportRowLeagueAuto') },
    ...leagueChoices(getFollows(), seenSportLeagues()).map((l) => ({ value: l.key, label: l.name })),
  ],
}

const scoresOption: Option = {
  label: both('sportRowOptionScores'),
  choices: () => [{ value: '', label: both('sportRowShowScores') }, { value: 'hide', label: both('sportRowHideScores') }],
}

interface RowDef { kind: SportRowKind; id: string; title: TvStringKey; option?: Option }

export const SPORT_HOME_ROWS: readonly RowDef[] = [
  { kind: 'live-now', id: 'sport-live-now', title: 'sportRowLiveNow', option: sportOption },
  { kind: 'my-teams', id: 'sport-my-teams', title: 'sportRowMyTeams' },
  { kind: 'tonight', id: 'sport-tonight', title: 'sportRowTonight', option: sportOption },
  { kind: 'zap', id: 'sport-zap', title: 'sportRowZap', option: sportOption },
  { kind: 'league', id: 'sport-league', title: 'sportRowLeague', option: leagueOption },
  { kind: 'results', id: 'sport-results', title: 'sportRowResults', option: scoresOption },
]

/** En stabil komponent per variant (en ny pil per rendering hade monterat om raden). */
const ROWS = Object.fromEntries(SPORT_HOME_ROWS.map((def) => {
  const Row = (props: HomeRowProps) => createElement(SportHomeRow, { ...props, kind: def.kind })
  Row.displayName = `SportHomeRow(${def.kind})`
  return [def.kind, Row]
})) as Record<SportRowKind, ComponentType<HomeRowProps>>

export function registerSportHomeRows(ctx: PluginContext): void {
  const host = ctx as unknown as Partial<Pick<PluginContext, 'registerHomeRow' | 'registerHomeSource'>>
  if (typeof host.registerHomeRow !== 'function' || typeof host.registerHomeSource !== 'function') return
  for (const def of SPORT_HOME_ROWS) {
    const rowId = `${def.id}-row`
    host.registerHomeRow.call(ctx, { id: rowId, title: both(def.title), showOnHome: false, Row: ROWS[def.kind] })
    host.registerHomeSource.call(ctx, {
      id: def.id,
      label: { en: tvText('en', 'sportRowSource', { name: tvText('en', def.title) }), sv: tvText('sv', 'sportRowSource', { name: tvText('sv', def.title) }) },
      rowId,
      ...(def.option ? { option: def.option } : {}),
    })
  }
}
