'use client'

import { setChannelHidden, setChannelName, useChannelOverrides } from '../channel-overrides'
import { Heading, Row } from './settings-tabs'
import { TV, dp } from './tv-ui'
import { MT } from './mobile/mobile-tokens'
import type { TvStringKey } from './tv-strings'

type TT = (key: TvStringKey, vars?: Record<string, string | number>) => string

/** Källans namn ur nyckeln (`namn::url`) — en dold kanal finns inte i modellen att slå upp. */
const nameOfKey = (key: string): string => key.slice(0, Math.max(0, key.lastIndexOf('::'))) || key

/**
 * DOLDA OCH OMDÖPTA KANALER (Jerry 2026-10-31) under Innehåll. En dold kanal
 * visas igen med OK; en omdöpt får tillbaka sitt namn från källan. Själva
 * dölj/byt namn finns i kanalens hållmeny.
 */
export function ChannelOverridesSection({ tt, phone = false }: { tt: TT; phone?: boolean }) {
  const { hidden, names } = useChannelOverrides()
  const renamed = Object.entries(names)
  const empty = hidden.length === 0 && renamed.length === 0
  return (
    <section data-testid="channel-overrides" style={{ display: 'flex', flexDirection: 'column', gap: phone ? 0 : dp(10) }}>
      <Heading phone={phone} hint={tt('hiddenChannelsHint')}>{tt('hiddenChannelsHeading')}</Heading>
      {empty ? <div style={phone ? { fontSize: 15, color: MT.dim, padding: '4px 14px 14px' } : { fontSize: dp(18), color: TV.dim }}>{tt('hiddenChannelsNone')}</div> : null}
      {hidden.map((key) => (
        <Row phone={phone} key={`h:${key}`} testId={`hidden-channel-${key}`} label={names[key] ?? nameOfKey(key)} right={tt('channelShow')} onOk={() => setChannelHidden(key, false)} />
      ))}
      {renamed.filter(([key]) => !hidden.includes(key)).map(([key, name]) => (
        <Row
          phone={phone}
          key={`n:${key}`}
          testId={`renamed-channel-${key}`}
          label={<span>{name}<span style={{ color: phone ? MT.dim : TV.dim, marginLeft: phone ? 8 : dp(12), fontSize: phone ? 13 : dp(17) }}>{tt('channelRenamedFrom', { name: nameOfKey(key) })}</span></span>}
          right={tt('channelResetName')}
          onOk={() => setChannelName(key, null)}
        />
      ))}
    </section>
  )
}
