'use client'

import { useEffect, useState, type CSSProperties, type JSX, type ReactNode } from 'react'
import { channelKey, getLiveTvLogoSrc, type M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import { qualityFromName, type LiveTvModel } from '../live-tv-model'
import { formatClock, progressOf } from '../live-tv-ui'
import type { TvNav } from './tv-shell'
import { Icons, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { useTvSettings } from './tv-settings-store'
import type { DesktopGuideMode } from './guide-surface'
import type { GuideSelection } from './guide-types'
import type { LiveBackground } from './v2-settings'
import { V2, mixHex, v2Bg } from './v2-tokens'
import { LivePill } from './v2-ui'
import { useTint } from './tint'
import { useProgrammeArt } from './programme-art'
import { LivePreviewArt } from './live-preview-art'
import { CutoutLayer } from './cutout-layer'

/** Herobandets höjd (handoff "Screen 2 / Layout") — samma med och utan bild. */
export const GUIDE_HERO_H = 276
/** Hur långt ner sidans ton tonar ut i bakgrunden under heron. */
const HERO_FADE_END = 640

const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

/**
 * Heron följer det fokuserade PROGRAMMET med 300 ms fördröjning så att den
 * inte flimrar medan man bläddrar. Första markeringen (från ingenting) visas
 * direkt — det finns inget att flimra från.
 */
export function useDebouncedSelection(sel: GuideSelection | null, ms = 300): GuideSelection | null {
  const [value, setValue] = useState(sel)
  useEffect(() => {
    if (sameSelection(value, sel)) return
    if (value === null) { setValue(sel); return }
    const timer = window.setTimeout(() => setValue(sel), ms)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, ms])
  return sameSelection(value, sel) ? sel : value
}

function sameSelection(a: GuideSelection | null, b: GuideSelection | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return channelKey(a.channel) === channelKey(b.channel) && (a.programme?.start ?? null) === (b.programme?.start ?? null)
}

/** Plats-kanal för krokarna när ingenting är markerat (inga uppslag görs då). */
const NO_CHANNEL: M3uChannel = { name: '', logo: null, group: '', url: '', tvgId: null }

type HeroState = 'live' | 'future' | 'past' | 'none'
function heroState(p: EpgProgramme | null, nowMs: number): HeroState {
  if (!p) return 'none'
  if (p.stop <= nowMs) return 'past'
  if (p.start > nowMs) return 'future'
  return 'live'
}

/** `rgb(r,g,b)` eller `#rrggbb` → samma färg med alfa (för herobildens uttoning). */
function clear(color: string): string {
  const rgb = color.match(/\d+/g)
  if (color.startsWith('rgb') && rgb) return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`
  const h = color.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0)`
}

/**
 * Kanalguidens hero (handoff v2 "Screen 2 / Layout"): 276 px band med rubrik,
 * klocka, lägessegment och källpill på samma plats i alla lägen, sedan
 * titelrad, tid + förlopp och två rader beskrivning. Live-förhandsvisning
 * 336×189 uppe till höger (OK = helskärm). Bandet målar också sidans ton:
 * `heroBase` ur bildens (annars logons) färg, blandad med bakgrunden.
 */
export function GuideHero({ sel, model, nav, mode, onMode, tint, background, sourceLabel, onOpenSource, isTv }: {
  sel: GuideSelection | null
  model: LiveTvModel
  nav: TvNav
  mode: DesktopGuideMode
  onMode(m: DesktopGuideMode): void
  tint: boolean
  background: LiveBackground
  sourceLabel: string
  onOpenSource(): void
  isTv: boolean
}): JSX.Element {
  const { tt, locale } = useTvText()
  const { nowMs } = model
  const channel = sel?.channel ?? null
  const programme = sel ? sel.programme ?? model.nowFor(sel.channel).now : null
  // Krokarna körs alltid (ordningen får inte bero på markeringen).
  const { url: art } = useProgrammeArt(channel ?? NO_CHANNEL, channel ? programme : null, { lookup: channel !== null })
  const logo = channel ? getLiveTvLogoSrc(channel.logo) ?? getLiveTvLogoSrc(channel.logoFallback) : null
  const tone = useTint(art ?? logo, tint && channel !== null)
  const bg = v2Bg(background)
  const base = tint && channel ? mixHex(tone, bg, art ? 55 : 30) : bg
  const previewEnabled = useTvSettings().previewEnabled

  const state = heroState(programme, nowMs)
  const minutesLeft = programme ? Math.max(0, Math.ceil((programme.stop - nowMs) / 60_000)) : 0
  const startsIn = programme ? Math.max(0, Math.ceil((programme.start - nowMs) / 60_000)) : 0
  const leftText = state === 'live'
    ? tt('minutesLeft', { min: minutesLeft })
    : state === 'future'
      ? `${tt('guideStartsIn', { min: startsIn })}${isTv ? ` · ${tt('okRemindShort')}` : ''}`
      : state === 'past' ? tt('guideAiredToday') : ''
  const number = channel ? model.channelNumber(channel) : null
  const quality = channel ? qualityFromName(channel.name) : null
  const channelLive = channel ? model.nowFor(channel).now !== null : false

  const segment = (key: DesktopGuideMode, label: string) => {
    const active = mode === key
    return (
      <div
        key={key}
        data-testid={`guide-mode-${key}`}
        {...station(() => onMode(key), undefined, { 'data-v2f': 'btn', ...(active ? { 'data-active': '' } : {}) })}
        style={{ height: dp(38), padding: `0 ${dp(18)}px`, borderRadius: 999, fontSize: dp(16), display: 'inline-flex', alignItems: 'center', cursor: 'pointer', background: active ? 'rgba(252,252,255,0.2)' : 'transparent', color: active ? V2.text : 'rgba(243,244,248,0.65)', whiteSpace: 'nowrap' }}
      >
        {label}
      </div>
    )
  }

  return (
    <div data-testid="guide-hero" style={{ position: 'relative', height: dp(GUIDE_HERO_H), flexShrink: 0 }}>
      {/* Sidans ton: bandets färg rakt ner till 276 px och sedan ut i
          bakgrunden vid 640 px. Ligger UNDER listan (zIndex 0); listan
          ritas ovanpå med genomskinliga ytor. */}
      <CutoutLayer testId="guide-hero-base" data={{ 'data-base': base }} background={tint && channel ? `linear-gradient(180deg, ${base} 0px, ${base} ${dp(GUIDE_HERO_H)}px, ${bg} ${dp(HERO_FADE_END)}px)` : 'transparent'} style={{ inset: 'auto', left: 0, right: 0, top: 0, height: dp(HERO_FADE_END), transition: 'background .4s', zIndex: 0 }} />
      <CutoutLayer background="transparent" style={{ overflow: 'hidden', zIndex: 0 }}>
        {art ? (
          <>
            <img data-testid="guide-hero-art" src={art} alt="" style={{ position: 'absolute', top: 0, right: 0, width: '66%', height: '100%', objectFit: 'cover' }} />
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${base} 0%, ${base} 30%, ${clear(base)} 66%), linear-gradient(0deg, ${base} 0%, ${clear(base)} 40%)` }} />
          </>
        ) : null}
      </CutoutLayer>

      {channel ? (
        <div
          data-testid="guide-hero-preview"
          {...station(() => nav.play({ channel }), undefined, { 'data-v2f': 'btn' })}
          style={{ position: 'absolute', right: dp(48), top: dp(34), width: dp(336), height: dp(189), borderRadius: dp(14), overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 18px 48px rgba(0,0,0,.45)', boxSizing: 'border-box', zIndex: 2, cursor: 'pointer' }}
        >
          <LivePreviewArt channel={channel} live={channelLive} enabled={previewEnabled && !nav.playerOpen} height={dp(189)} radius={dp(14)} style={{ width: '100%' }}>
            <span style={{ position: 'absolute', left: dp(14), bottom: dp(12) }}><LivePill /></span>
            <span style={{ position: 'absolute', right: dp(12), bottom: dp(12), fontSize: dp(14), color: V2.text2, maxWidth: '60%', ...ellipsis }}>
              {number !== null ? `${number} · ${channel.name}` : channel.name}
            </span>
          </LivePreviewArt>
        </div>
      ) : null}

      <div style={{ position: 'relative', zIndex: 1, height: '100%', boxSizing: 'border-box', padding: `${dp(34)}px ${dp(48)}px ${dp(26)}px`, display: 'flex', flexDirection: 'column', gap: dp(10), maxWidth: channel ? `calc(100% - ${dp(336 + 48 + 24)}px)` : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(16), minWidth: 0 }}>
          <span style={{ fontSize: dp(30), fontWeight: 600, whiteSpace: 'nowrap' }}>{tt('guideV2Title')}</span>
          <div data-testid="guide-mode" style={{ display: 'flex', gap: dp(4), padding: dp(4), borderRadius: 999, background: V2.surface3, border: '1px solid rgba(255,255,255,0.10)', marginLeft: dp(12), flexShrink: 0 }}>
            {segment('now', tt('modeNowSen'))}
            {segment('tl', tt('modeTabla'))}
            {segment('list', tt('modeChannelList'))}
          </div>
          <div
            data-testid="guide-source"
            title={sourceLabel}
            {...station(onOpenSource, undefined, { 'data-v2f': 'btn' })}
            style={{ height: dp(46), padding: `0 ${dp(18)}px`, borderRadius: 999, background: V2.surface3, border: '1px solid rgba(255,255,255,0.10)', display: 'inline-flex', alignItems: 'center', gap: dp(8), fontSize: dp(16), cursor: 'pointer', minWidth: 0, flexShrink: 1, boxSizing: 'border-box' }}
          >
            <span style={{ minWidth: 0, ...ellipsis }}>{sourceLabel}</span>
            <Icons.ChevronDown size={dp(16)} />
          </div>
        </div>

        {channel ? (
          <>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: dp(18), minWidth: 0 }}>
              <div data-testid="guide-hero-title" style={{ fontSize: dp(46), fontWeight: 600, lineHeight: 1.1, minWidth: 0, ...ellipsis }}>{programme?.title ?? channel.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: dp(12), fontSize: dp(18), color: V2.text2, flexShrink: 0 }}>
                {number !== null ? <span style={{ fontWeight: 600, color: V2.accText, fontVariantNumeric: 'tabular-nums' }}>{number}</span> : null}
                {programme ? <span>{channel.name}</span> : null}
                {state === 'live' ? <LivePill label={tt('live')} /> : null}
                {state === 'future' || state === 'past' ? (
                  <span data-testid="guide-hero-tag" style={{ height: dp(24), display: 'inline-flex', alignItems: 'center', padding: `0 ${dp(12)}px`, borderRadius: dp(8), background: 'rgba(252,252,255,0.14)', fontSize: dp(13), fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {state === 'future' ? tt('later') : tt('replay')}
                  </span>
                ) : null}
                {quality ? <span style={{ padding: `${dp(3)}px ${dp(12)}px`, borderRadius: dp(8), background: 'rgba(252,252,255,0.12)', fontSize: dp(15) }}>{quality}</span> : null}
              </div>
            </div>
            {programme ? (
              <div data-testid="guide-hero-time" style={{ display: 'flex', alignItems: 'center', gap: dp(16), fontSize: dp(19), color: V2.text2 }}>
                <span style={ellipsis}>{`${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}${leftText ? ` · ${leftText}` : ''}`}</span>
                {state === 'live' ? (
                  <div style={{ width: dp(260), height: dp(5), borderRadius: dp(5), background: 'rgba(252,252,255,0.16)', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${Math.round(progressOf(programme.start, programme.stop, nowMs) * 100)}%`, background: 'rgb(var(--accent-500))' }} />
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ fontSize: dp(19), color: V2.text2 }}>{tt('noProgramme')}</div>
            )}
            {programme?.description ? (
              <p data-testid="guide-hero-desc" style={{ margin: 0, fontSize: dp(18), color: V2.text2, maxWidth: '62ch', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{programme.description}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
