'use client'

import type { ReactNode } from 'react'
import { formatClock } from '../live-tv-ui'
import type { TvViewProps } from './tv-shell'
import { Icons, TV, Tag, cardStyle, dp, station } from './tv-ui'
import { useTvText, type TvStringKey } from './tv-strings'
import { deleteRecording, formatBytes, recordingStreamUrl, stopRecording, useRecordings, type RecStatus, type Recording } from '../recordings'
import { MT, ellipsis } from './mobile/mobile-tokens'
import { MobileHeader } from './mobile/mobile-header'

/*
  INSPELNINGAR — vyn i rälsen (skrivbord/TV) och i telefonens Mer-ark.

  Sektioner i fast ordning: Pågår · Planerade · Klara · Misslyckade; tomma
  sektioner ritas inte. OK på en klar eller pågående inspelning spelar filen i
  appens spelare via `/api/live-tv/record/stream/<id>.ts` (Range fungerar, så
  en pågående går att se så långt den kommit). OK på en planerad öppnar menyn.
  Håll OK: Spela upp / Stoppa / Avbryt / Radera (med bekräftelse i glasmenyn).
*/

type Section = 'active' | 'scheduled' | 'done' | 'failed'
const SECTION_ORDER: Section[] = ['active', 'scheduled', 'done', 'failed']
const SECTION_LABEL: Record<Section, TvStringKey> = { active: 'recSectionActive', scheduled: 'recSectionScheduled', done: 'recSectionDone', failed: 'recSectionFailed' }

export function sectionOf(status: RecStatus): Section {
  if (status === 'recording') return 'active'
  if (status === 'scheduled') return 'scheduled'
  if (status === 'done' || status === 'stopped') return 'done'
  return 'failed'
}

export function groupRecordings(recordings: Recording[]): { section: Section; items: Recording[] }[] {
  const by = new Map<Section, Recording[]>()
  for (const r of recordings) {
    const s = sectionOf(r.status)
    by.set(s, [...(by.get(s) ?? []), r])
  }
  const sortKey = (r: Recording) => (r.status === 'scheduled' ? r.startAt : -(r.endedAt ?? r.startedAt ?? r.startAt))
  return SECTION_ORDER.filter((s) => by.has(s)).map((section) => ({ section, items: [...by.get(section)!].sort((a, b) => sortKey(a) - sortKey(b)) }))
}

function statusKey(r: Recording): TvStringKey | null {
  switch (r.status) {
    case 'missed': return 'recStatusMissed'
    case 'disk_full': return 'recStatusDiskFull'
    case 'failed': return 'recStatusFailed'
    case 'stopped': return 'recStatusStopped'
    case 'recording': return 'recording'
    default: return null
  }
}

/** Kan filen spelas? Klar, stoppad, eller pågående (så långt den kommit). */
function playable(r: Recording): boolean {
  return (r.status === 'done' || r.status === 'stopped' || r.status === 'recording' || r.status === 'disk_full' || r.status === 'failed') && (r.bytes > 0 || r.status === 'recording')
}

export function TvRecordings(props: TvViewProps) {
  return props.phone ? <TvRecordingsPhone {...props} /> : <TvRecordingsDesktop {...props} />
}

function useActions(nav: TvViewProps['nav'], tt: ReturnType<typeof useTvText>['tt']) {
  const play = (r: Recording) => nav.playStream({ url: recordingStreamUrl(r.id), title: r.title })
  const confirmDelete = (r: Recording, element: HTMLElement) => nav.openMenu({
    title: tt('recDeleteConfirm'),
    element,
    actions: [{ key: 'delete', label: tt('recDelete'), run: () => { void deleteRecording(r.id).catch(() => {}) } }],
  })
  const menu = (r: Recording, element: HTMLElement) => {
    const actions = []
    if (playable(r)) actions.push({ key: 'play', label: tt('recPlay'), run: () => play(r) })
    if (r.status === 'recording') actions.push({ key: 'stop', label: tt('stopRecording'), run: () => { void stopRecording(r.id).catch(() => {}) } })
    if (r.status === 'scheduled') actions.push({ key: 'cancel', label: tt('cancelRecording'), run: () => { void stopRecording(r.id).catch(() => {}) } })
    actions.push({ key: 'delete', label: tt('recDelete'), run: () => confirmDelete(r, element) })
    nav.openMenu({ title: r.title, element, actions })
  }
  const ok = (r: Recording, element: HTMLElement) => {
    if (r.status === 'scheduled' || !playable(r)) menu(r, element)
    else play(r)
  }
  return { ok, menu }
}

function timeLine(r: Recording, locale: string, tt: ReturnType<typeof useTvText>['tt']): string {
  const start = r.programmeStart ?? r.startAt
  const stop = r.programmeStop ?? r.stopAt
  const day = new Date(start).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  const parts = [`${day} ${formatClock(start, locale)}–${formatClock(stop, locale)}`]
  const key = statusKey(r)
  if (key) parts.push(tt(key))
  if (r.bytes > 0) parts.push(formatBytes(r.bytes, locale))
  return parts.join(' · ')
}

function TvRecordingsDesktop({ nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const { list } = useRecordings(true)
  const groups = groupRecordings(list?.recordings ?? [])
  const { ok, menu } = useActions(nav, tt)
  let first = true
  return (
    <div data-scroll="" data-testid="tv-recordings" style={{ flex: 1, overflowY: 'auto', padding: `${dp(34)}px ${dp(48)}px ${dp(40)}px`, display: 'flex', flexDirection: 'column', gap: dp(22) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(16) }}>
        <span style={{ fontSize: dp(34), fontWeight: 600 }}>{tt('railRecordings')}</span>
        {typeof list?.freeBytes === 'number' ? <span style={{ fontSize: dp(18), color: 'rgba(243,244,248,0.5)' }}>{tt('recFreeSpace', { free: formatBytes(list.freeBytes, locale) })}</span> : null}
      </div>
      {list && groups.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: dp(10), maxWidth: dp(720) }}>
          <div style={{ fontSize: dp(22), fontWeight: 600 }}>{tt('recordingsEmpty')}</div>
          <div style={{ fontSize: dp(18), color: TV.muted }}>{tt('recordingsEmptyHint')}</div>
          <div {...station(() => nav.go('guide', { group: 'all' }), undefined, { 'data-init': '' })} style={{ alignSelf: 'flex-start', height: dp(48), minHeight: dp(48), padding: `0 ${dp(22)}px`, borderRadius: 999, border: `1px solid ${TV.lineStrong}`, background: TV.s06, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer' }}>{tt('railGuide')}</div>
        </div>
      ) : null}
      {groups.map(({ section, items }) => (
        <section key={section} data-testid="rec-section" data-section={section} style={{ display: 'flex', flexDirection: 'column', gap: dp(12) }}>
          <div style={{ fontSize: dp(20), fontWeight: 600, color: 'rgba(243,244,248,0.75)' }}>{tt(SECTION_LABEL[section])}</div>
          <div data-row="" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: dp(14) }}>
            {items.map((r) => {
              const init = first ? { 'data-init': '' } : undefined
              first = false
              return <RecordingCard key={r.id} r={r} locale={locale} tt={tt} onOk={(el) => ok(r, el)} onHold={(el) => menu(r, el)} init={init} />
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function RecordingCard({ r, locale, tt, onOk, onHold, init }: { r: Recording; locale: string; tt: ReturnType<typeof useTvText>['tt']; onOk: (el: HTMLElement) => void; onHold: (el: HTMLElement) => void; init?: Record<string, string> }) {
  const live = r.status === 'recording'
  let el: HTMLElement | null = null
  return (
    <div
      ref={(node) => { el = node }}
      data-testid={`rec-card-${r.id}`}
      {...station(() => { if (el) onOk(el) }, (element) => onHold(element), init)}
      style={{ ...cardStyle, borderRadius: dp(16), cursor: 'pointer', display: 'flex', alignItems: 'center', gap: dp(16), padding: `${dp(14)}px ${dp(18)}px`, boxSizing: 'border-box' }}
    >
      <span style={{ flexShrink: 0, width: dp(44), height: dp(44), borderRadius: dp(10), background: TV.s12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: live ? '#ef4444' : 'rgba(243,244,248,0.7)' }}>
        <Icons.Record size={dp(22)} filled={live} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(4) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), minWidth: 0 }}>
          <span style={{ fontSize: dp(20), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
          {live ? <Tag variant="live">{tt('recording')}</Tag> : null}
        </div>
        <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.channelName} · {timeLine(r, locale, tt)}</div>
      </div>
    </div>
  )
}

function TvRecordingsPhone({ nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const { list } = useRecordings(true)
  const groups = groupRecordings(list?.recordings ?? [])
  const { ok, menu } = useActions(nav, tt)
  const row = (r: Recording): ReactNode => {
    let el: HTMLElement | null = null
    const live = r.status === 'recording'
    return (
      <div
        key={r.id}
        ref={(node) => { el = node }}
        data-testid={`rec-card-${r.id}`}
        {...station(() => { if (el) ok(r, el) }, (element) => menu(r, element))}
        style={{ minHeight: 64, borderRadius: 14, background: MT.s07, border: `1px solid ${MT.line08}`, padding: '10px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      >
        <span style={{ flexShrink: 0, color: live ? '#ef4444' : MT.dim, display: 'inline-flex' }}><Icons.Record size={22} filled={live} /></span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{r.title}</div>
          <div style={{ fontSize: 13, color: MT.dim, ...ellipsis }}>{r.channelName} · {timeLine(r, locale, tt)}</div>
        </div>
      </div>
    )
  }
  return (
    <div data-scroll="" data-testid="tv-recordings" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={tt('railRecordings')} /></div>
      {list && groups.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{tt('recordingsEmpty')}</div>
          <div style={{ color: MT.dim, fontSize: 14 }}>{tt('recordingsEmptyHint')}</div>
        </div>
      ) : null}
      {groups.map(({ section, items }) => (
        <section key={section} data-testid="rec-section" data-section={section} style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: MT.dim, marginBottom: 8 }}>{tt(SECTION_LABEL[section])}</div>
          {items.map(row)}
        </section>
      ))}
    </div>
  )
}
