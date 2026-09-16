'use client'

import { useEffect, useMemo, useState } from 'react'
import { channelKey } from '../../live-tv-data'
import type { TvViewProps } from '../tv-shell'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import type { GuideMode } from '../tv-settings-store'
import { FAVS_GROUP, filterByGroup, useGuideGroups } from '../tv-guide-shared'
import { MT } from './mobile-tokens'
import { MobileHeader } from './mobile-header'
import { MobileSegment } from './mobile-segment'
import { MobileChips } from './mobile-chips'
import { MobileChannelRow } from './mobile-channel-row'

/**
 * Guidens lägen på telefon (handoffen §2): Now / Timeline / Lists. TV:ns
 * `'tl'` (tablåraden i Nu-vyn) finns inte här — telefonens tablå ÄR rutnätet
 * (`'grid'`, P6), så segmentet Timeline skriver `'grid'`. Ett lagrat `'tl'`
 * från TV:n visas därför som Now och skrivs aldrig tillbaka från telefonen.
 */
export type PhoneGuideMode = 'now' | 'grid' | 'playlists'

export function phoneGuideMode(stored: GuideMode): PhoneGuideMode {
  return stored === 'tl' ? 'now' : stored
}

/** Segmentväxeln i full bredd, delad av Nu-vyn (P5), rutnätet (P6) och listorna (P7). */
export function PhoneGuideModeBar({ mode, onChange }: { mode: PhoneGuideMode; onChange: (mode: PhoneGuideMode) => void }) {
  const { tt } = useTvText()
  const options: { key: PhoneGuideMode; label: string }[] = [
    { key: 'now', label: tt('phoneModeNow') },
    { key: 'grid', label: tt('phoneModeTimeline') },
    { key: 'playlists', label: tt('phoneModeLists') },
  ]
  return <MobileSegment options={options} value={mode} onChange={onChange} testId="guide-mode" />
}

// Samma steg som TV:ns lista: fler rader läggs på med Visa fler.
const ROW_STEP = 40

/**
 * Guiden · Nu på telefon (fas 3, handoffen §2). Ingen förhandsvisning, inget
 * toppband, ingen klocka och ingen vald rad: varje kanalrad bär sin egen
 * nu/sen-information (`MobileChannelRow`), tryck spelar och håll öppnar
 * kanalarket. Tablåraden (`'tl'`) finns inte här — se `phoneGuideMode`.
 */
export function TvGuideNowPhone({ model, nav, params, mode, onModeChange }: TvViewProps & { mode: PhoneGuideMode; onModeChange: (mode: PhoneGuideMode) => void }) {
  const { tt, locale } = useTvText()
  const groups = useGuideGroups(model, tt)
  // params.group valideras mot de faktiska grupperna precis som på TV:n —
  // en okänd kategori faller tillbaka till "Alla", inte till en tom vy.
  const [group, setGroup] = useState<string | null>(() => {
    const raw = params.group
    if (!raw || raw === 'all') return null
    if (raw === FAVS_GROUP) return FAVS_GROUP
    return model.groups.includes(raw) ? raw : null
  })
  const rows = useMemo(() => filterByGroup(model, group), [model, group])
  const [visible, setVisible] = useState(ROW_STEP)
  useEffect(() => { setVisible(ROW_STEP) }, [group])
  const visibleRows = useMemo(() => rows.slice(0, visible), [rows, visible])
  const noProgrammeLabel = model.epgLoading ? tt('loadingGuide') : tt('noProgramme')

  return (
    <div data-testid="guide-phone" data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Sidhuvudet äger sina egna kanter (60 px vänster för värdens menychip,
          16 höger) — kolumnens 16 px-luft dras tillbaka runt det. */}
      <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={tt('guideTitle')} /></div>
      <PhoneGuideModeBar mode={mode} onChange={onModeChange} />
      <MobileChips items={groups} value={group} onChange={setGroup} testId="guide-groups" />

      {rows.length === 0 ? (
        // Kanalerna kommer ur appens index: tomt betyder "hämtar" tills
        // sidhämtningen är klar, annars saknar kategorin kanaler.
        <div data-testid="guide-empty" style={{ padding: '32px 16px', textAlign: 'center', fontSize: 15, color: MT.muted }}>
          {model.channelsLoading ? tt('loadingChannels') : tt('guideEmpty')}
        </div>
      ) : (
        <div>
          {visibleRows.map((channel, index) => {
            const key = channelKey(channel)
            return (
              <MobileChannelRow
                key={key}
                channel={channel}
                number={model.channelNumber(channel)}
                now={model.nowFor(channel)}
                nowMs={model.nowMs}
                locale={locale}
                pinned={model.pinnedSet.has(key)}
                locked={model.locked.has(key)}
                noProgrammeLabel={noProgrammeLabel}
                onPress={() => nav.play({ channel })}
                onLongPress={(el) => nav.channelMenu(channel, el)}
                init={index === 0}
                testId="guide-row"
              />
            )
          })}
          {rows.length > visible ? (
            <div data-testid="show-more" {...station(() => setVisible((v) => v + ROW_STEP))} style={{ margin: '16px auto 0', width: 'fit-content', minHeight: 44, padding: '0 24px', borderRadius: 999, background: MT.s10, display: 'flex', alignItems: 'center', fontSize: 15, cursor: 'pointer' }}>{tt('showMore')}</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
