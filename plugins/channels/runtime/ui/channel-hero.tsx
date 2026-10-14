'use client'

/**
 * Kanaler-sidans hero: vad som sänds nu på den valda kanalen. Läser bara
 * tablån (ren uträkning) — inga strömuppslag; spelaren gör dem först när
 * man trycker Titta live.
 */
import type { CSSProperties, ReactNode } from 'react'
import { requestBrowseBack } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import { programmeAt, type ProgrammeSlot } from '../model/schedule'
import type { PoolItem } from '../data/pool'
import type { PlayMode } from '../play/player-logic'
import { formatClock } from './guide-layout'
import { belowMenuPill, C, FONT, glass, RADIUS, fontSize } from './tokens'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

export interface ChannelHeroProps {
  channel: ChannelDef
  rundown: PoolItem[]
  loading: boolean
  /** Tablån visas men fler källor/metadata är på väg. */
  partial?: boolean
  now: number
  isTv: boolean
  isMobile: boolean
  /** Värden kan spela kanaler (app ≥ 0.1.625). */
  canPlay: boolean
  t: T
  onPlay(mode: PlayMode): void
  onEdit(): void
  onNewChannel(): void
}

/** Nästa program efter `t`, förbi en eventuell vila. */
export function nextProgramme(rundown: PoolItem[], channel: ChannelDef, t: number): ProgrammeSlot<PoolItem> | null {
  let slot = programmeAt(rundown, channel.airWindow, t)
  if (slot.kind === 'rest') slot = programmeAt(rundown, channel.airWindow, slot.nextAir)
  return slot.kind === 'programme' ? slot : null
}

function duration(ms: number, t: T): string {
  const total = Math.max(1, Math.round(ms / 60_000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? t('durHm', { h, m }) : t('durM', { m })
}

export function ChannelHero({ channel, rundown, loading, partial, now, isTv, isMobile, canPlay, t, onPlay, onEdit, onNewChannel }: ChannelHeroProps) {
  const fs = (px: number) => fontSize(px, isTv)
  const slot = rundown.length > 0 ? programmeAt(rundown, channel.airWindow, now) : null
  const programme = slot?.kind === 'programme' ? slot : null
  const rest = slot?.kind === 'rest' ? slot : null
  const after = programme ? nextProgramme(rundown, channel, programme.stop) : rest ? nextProgramme(rundown, channel, rest.nextAir) : null

  const backdropUrl = programme?.item.backdropUrl

  let title: string
  let meta: string
  if (programme) {
    const item = programme.item
    title = item.kind === 'episode' && item.seriesTitle ? item.seriesTitle : item.title
    const parts: string[] = [item.kind === 'episode' ? t('heroEpisode') : t('heroMovie')]
    if (item.kind === 'episode' && item.season != null && item.episode != null) parts.push(`S${item.season}E${item.episode}`)
    if (item.kind === 'episode' && item.seriesTitle && item.title !== item.seriesTitle) parts.push(item.title)
    if (item.year != null) parts.push(String(item.year))
    parts.push(`${formatClock(programme.start)}–${formatClock(programme.stop)}`)
    parts.push(t('playerMinsLeft', { n: Math.max(1, Math.ceil((programme.stop - now) / 60_000)) }))
    meta = parts.join(' · ')
  } else if (rest) {
    title = t('heroRestTitle')
    meta = t('heroRestMeta', { dur: duration(rest.nextAir - now, t) })
  } else {
    title = channel.name
    meta = loading ? t('heroLoading') : t('playerEmpty')
  }
  const pct = programme ? Math.min(1, Math.max(0, (now - programme.start) / Math.max(1, programme.stop - programme.start))) : 0

  return (
    <section
      data-channels-hero=""
      style={{
        position: 'relative', overflow: 'hidden', minHeight: 330,
        padding: `${belowMenuPill(isTv, isMobile)} ${isMobile ? '16px 24px' : isTv ? '2.5rem 2rem' : '32px 28px'}`,
        background: C.base, color: C.text, fontFamily: FONT.ui, display: 'flex', flexDirection: 'column',
      }}
    >
      {backdropUrl ? (
        <>
          <span aria-hidden="true" data-hero-backdrop="" style={{ position: 'absolute', inset: 0, background: `url("${backdropUrl}") center / cover no-repeat` }} />
          <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: C.scrim }} />
        </>
      ) : null}

      {/* Under appens menypill, vänsterställt; högra hörnet är appens (klocka, hälsning). */}
      <div data-channels-topbar="" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Pill isTv={isTv} onClick={() => requestBrowseBack()}>{t('pageHome')}</Pill>
        <Pill isTv={isTv} active>{t('pageChannels')}</Pill>
        <Pill isTv={isTv} onClick={onNewChannel}>{t('pageNewChannel')}</Pill>
      </div>

      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: isMobile ? 32 : 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {programme || rest ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: RADIUS.pill,
              background: C.accent, color: C.onAccent, fontSize: fs(10.5), fontWeight: 700, letterSpacing: '0.16em',
            }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: C.onAccent }} />
              {t('heroLive')}
            </span>
          ) : null}
          <span style={{ fontSize: fs(11), letterSpacing: '0.22em', textTransform: 'uppercase', color: C.textSoft }}>
            {t('zapChannelLine', { n: channel.number, name: channel.name })}
          </span>
        </div>
        <h1 style={{
          margin: '10px 0 0', fontFamily: FONT.title, fontWeight: 400, fontSize: fs(isMobile ? 30 : 44), lineHeight: 1.05,
          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}
        >
          {title}
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: fs(14), color: C.textSoft }}>{meta}</p>
        {partial ? (
          <p data-channels-partial="" role="status" style={{ margin: '6px 0 0', fontSize: fs(12), color: C.textDim }}>{t('heroPartial')}</p>
        ) : null}
        {rest ? (
          <p style={{ margin: '10px 0 0', fontSize: fs(13), color: C.accentLight }}>{t('playerRest', { time: formatClock(rest.nextAir) })}</p>
        ) : (
          <div style={{ marginTop: 12, height: 3, maxWidth: 360, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: C.accent }} />
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          <HeroButton isTv={isTv} primary disabled={!canPlay} onClick={() => onPlay('live')}>{t('heroWatchLive')}</HeroButton>
          <HeroButton isTv={isTv} disabled={!canPlay || !programme} onClick={() => onPlay('start')}>{t('heroFromStart')}</HeroButton>
          <HeroButton isTv={isTv} onClick={onEdit}>{t('heroEdit')}</HeroButton>
        </div>
        {after ? (
          <p style={{ margin: '14px 0 0', fontSize: fs(13), color: C.textDim }}>
            {t('heroNext', { time: formatClock(after.start), title: after.item.kind === 'episode' && after.item.seriesTitle ? after.item.seriesTitle : after.item.title })}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function Pill({ children, onClick, active, isTv }: { children: ReactNode; onClick?: () => void; active?: boolean; isTv: boolean }) {
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', minHeight: isTv ? '2.25rem' : 30, padding: isTv ? '0 1rem' : '0 14px',
    ...glass(isTv, { fill: C.pillBg, blur: 20 }),
    borderRadius: RADIUS.pill, border: `1px solid ${active ? 'rgba(244,132,95,0.55)' : C.pillBorder}`,
    color: active ? C.accentLight : C.text,
    fontFamily: FONT.ui, fontSize: fontSize(10.5, isTv), fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
    whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default',
  }
  if (!onClick) return <span style={style}>{children}</span>
  return <button type="button" data-f="" onClick={onClick} style={style}>{children}</button>
}

function HeroButton({ children, onClick, primary, disabled, isTv }: { children: ReactNode; onClick(): void; primary?: boolean; disabled?: boolean; isTv: boolean }) {
  return (
    <button
      type="button"
      data-f=""
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: isTv ? '0.625rem 1.375rem' : '10px 22px', borderRadius: RADIUS.pill,
        ...(primary ? { background: C.accent, border: `1px solid ${C.accent}` } : glass(isTv, { fill: C.pillBg, blur: 20 })),
        color: primary ? C.onAccent : C.text,
        fontFamily: FONT.ui, fontSize: fontSize(14, isTv), fontWeight: 600, whiteSpace: 'nowrap',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}
