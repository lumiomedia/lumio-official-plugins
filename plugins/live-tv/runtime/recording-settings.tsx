'use client'

import * as sdk from '@/lib/plugin-sdk'
import { requestOpenBrowsePage } from '@/lib/plugin-sdk'
import { LtChoiceRow, LtNote, LtRows, LtTextRow, LtToggleRow } from './settings-ui'
import { TvRow } from './tv-settings-ui'
import { Heading, Row } from './tv/settings-tabs'
import { Toggle, dp } from './tv/tv-ui'
import type { TvStringKey } from './tv/tv-strings'
import { TIMESHIFT_MINUTE_OPTIONS, nextRecordEndLate, nextRecordStartEarly, nextTimeshiftMinutes, setTvSettings, type TimeshiftMinutesSetting, type TvSettings } from './tv/tv-settings-store'
import { RECORD_END_LATE_OPTIONS, RECORD_KEEP_FREE_OPTIONS, RECORD_START_EARLY_OPTIONS, type RecordEndLateMin, type RecordStartEarlyMin } from './recording-plan'
import { formatBytes, saveRecordSettings, useRecordings } from './recordings'
import { LIVE_TV_BROWSE_PAGE_ID } from './live-tv-shell'
import { setTimeshiftOnDevice, useTimeshiftOnDevice } from './timeshift-device'

/*
  INSPELNINGENS INSTÄLLNINGAR — samma fyra värden på tre ytor.

  Marginalerna och växlarna bor i `TvSettings` (pluginets lager, synkas med
  resten). Mappen och "håll ledigt" ägs av APPEN (`POST /api/live-tv/record/settings`):
  de gäller enheten, inte profilen, och appen behöver dem utan att pluginet är
  monterat (schemaläggaren kör i Rust).
*/

type TT = (key: TvStringKey, vars?: Record<string, string | number>) => string

type DesktopSdk = { isPluginDesktopHost?: () => boolean; pickPluginFolder?: () => Promise<string | null> }
const desktopSdk = sdk as unknown as DesktopSdk

const minutesLabel = (tt: TT, min: number) => (min === 0 ? tt('never') : tt('minutesShort', { min }))

export function recordingSummary(s: TvSettings, tt: TT): string {
  if (!s.recordingEnabled) return tt('never')
  return `${tt('settingRecordStartEarly')}: ${minutesLabel(tt, s.recordStartEarlyMin)} · ${tt('settingRecordEndLate')}: ${minutesLabel(tt, s.recordEndLateMin)}`
}

function openRecordings(): void {
  requestOpenBrowsePage({ pageId: LIVE_TV_BROWSE_PAGE_ID, params: { view: 'recordings' } })
}

/** Appens Inställningar på skrivbordet: ett kort i dragspelet. */
/** Bara Android (media3): bufferten är boxens egen, så valet är per enhet (timeshift-device.ts). */
const showDeviceTimeshift = (): boolean => sdk.isAndroidTauriEnv === true

export function RecordingSettingsDesktop({ tvSettings, tt }: { tvSettings: TvSettings; tt: TT }) {
  const onDevice = useTimeshiftOnDevice()
  const { list } = useRecordings(false)
  const keepFreeGb = list ? Math.round(list.keepFreeBytes / 1_000_000_000) : 2
  const canPick = typeof desktopSdk.isPluginDesktopHost === 'function' && desktopSdk.isPluginDesktopHost() && typeof desktopSdk.pickPluginFolder === 'function'
  const pickFolder = async () => {
    const folder = await desktopSdk.pickPluginFolder?.()
    if (folder) await saveRecordSettings({ folder, keepFreeGb })
  }
  return (
    <LtRows>
      <LtToggleRow first testId="lt-record-enabled" label={tt('settingRecording')} desc={tt('settingRecordingHint')} checked={tvSettings.recordingEnabled} onChange={(recordingEnabled) => setTvSettings({ recordingEnabled })} />
      <LtTextRow
        testId="lt-record-folder"
        label={tt('settingRecordFolder')}
        value={list?.folder ?? ''}
        onChange={() => {}}
        button={canPick ? tt('settingRecordFolderPick') : undefined}
        onButton={canPick ? () => { void pickFolder() } : undefined}
      />
      {typeof list?.freeBytes === 'number' ? <LtNote>{tt('recFreeSpace', { free: formatBytes(list.freeBytes, 'en') })}</LtNote> : null}
      <LtChoiceRow
        testId="lt-record-keep-free"
        label={tt('settingRecordKeepFree')}
        options={RECORD_KEEP_FREE_OPTIONS.map((gb) => ({ key: String(gb), label: tt('gigabytes', { gb }) }))}
        value={String(keepFreeGb)}
        onChange={(key) => { void saveRecordSettings({ folder: list?.folder ?? null, keepFreeGb: Number(key) }) }}
      />
      <LtChoiceRow
        testId="lt-record-start-early"
        label={tt('settingRecordStartEarly')}
        options={RECORD_START_EARLY_OPTIONS.map((min) => ({ key: String(min), label: minutesLabel(tt, min) }))}
        value={String(tvSettings.recordStartEarlyMin)}
        onChange={(key) => setTvSettings({ recordStartEarlyMin: Number(key) as RecordStartEarlyMin })}
      />
      <LtChoiceRow
        testId="lt-record-end-late"
        label={tt('settingRecordEndLate')}
        options={RECORD_END_LATE_OPTIONS.map((min) => ({ key: String(min), label: minutesLabel(tt, min) }))}
        value={String(tvSettings.recordEndLateMin)}
        onChange={(key) => setTvSettings({ recordEndLateMin: Number(key) as RecordEndLateMin })}
      />
      <LtToggleRow first={false} testId="lt-record-notify" label={tt('settingRecordNotify')} checked={tvSettings.recordNotify} onChange={(recordNotify) => setTvSettings({ recordNotify })} />
      <LtChoiceRow testId="lt-record-open" label={tt('settingRecordOpen')} options={[{ key: 'open', label: tt('railRecordings') }]} value="" onChange={openRecordings} />
      <LtToggleRow first={false} testId="lt-timeshift-enabled" label={tt('settingTimeshift')} desc={tt('settingTimeshiftHint')} checked={tvSettings.timeshiftEnabled} onChange={(timeshiftEnabled) => setTvSettings({ timeshiftEnabled })} />
      <LtChoiceRow
        testId="lt-timeshift-minutes"
        label={tt('settingTimeshiftMinutes')}
        options={TIMESHIFT_MINUTE_OPTIONS.map((min) => ({ key: String(min), label: tt('minutesShort', { min }) }))}
        value={String(tvSettings.timeshiftMinutes)}
        onChange={(key) => setTvSettings({ timeshiftMinutes: Number(key) as TimeshiftMinutesSetting })}
      />
      {showDeviceTimeshift() ? (
        <LtToggleRow first={false} testId="lt-timeshift-device" label={tt('settingTimeshiftDevice')} desc={tt('settingTimeshiftDeviceHint')} checked={onDevice} onChange={(on) => setTimeshiftOnDevice(on)} />
      ) : null}
    </LtRows>
  )
}

/** Live TV:s egna inställningar (skrivbord/TV i skalet och telefonen): rader i Beteende-stil. */
export function RecordingSettingsRows({ settings, tt, phone = false, onOpen }: { settings: TvSettings; tt: TT; phone?: boolean; onOpen: () => void }) {
  const onDevice = useTimeshiftOnDevice()
  const rows = (
    <>
      <Row phone={phone} testId="setting-recordingEnabled" label={tt('settingRecording')} right={<Toggle on={settings.recordingEnabled} />} onOk={() => setTvSettings({ recordingEnabled: !settings.recordingEnabled })} />
      <Row phone={phone} testId="setting-recordStartEarlyMin" label={tt('settingRecordStartEarly')} right={minutesLabel(tt, settings.recordStartEarlyMin)} onOk={() => setTvSettings({ recordStartEarlyMin: nextRecordStartEarly(settings.recordStartEarlyMin) })} />
      <Row phone={phone} testId="setting-recordEndLateMin" label={tt('settingRecordEndLate')} right={minutesLabel(tt, settings.recordEndLateMin)} onOk={() => setTvSettings({ recordEndLateMin: nextRecordEndLate(settings.recordEndLateMin) })} />
      <Row phone={phone} testId="setting-recordNotify" label={tt('settingRecordNotify')} right={<Toggle on={settings.recordNotify} />} onOk={() => setTvSettings({ recordNotify: !settings.recordNotify })} />
      <Row phone={phone} testId="setting-recordOpen" label={tt('settingRecordOpen')} right="›" onOk={onOpen} />
      <Row phone={phone} testId="setting-timeshiftEnabled" label={tt('settingTimeshift')} right={<Toggle on={settings.timeshiftEnabled} />} onOk={() => setTvSettings({ timeshiftEnabled: !settings.timeshiftEnabled })} />
      <Row phone={phone} testId="setting-timeshiftMinutes" label={tt('settingTimeshiftMinutes')} right={tt('minutesShort', { min: settings.timeshiftMinutes })} onOk={() => setTvSettings({ timeshiftMinutes: nextTimeshiftMinutes(settings.timeshiftMinutes) })} />
      {showDeviceTimeshift() ? (
        <Row phone={phone} testId="setting-timeshiftDevice" label={tt('settingTimeshiftDevice')} right={<Toggle on={onDevice} />} onOk={() => setTimeshiftOnDevice(!onDevice)} />
      ) : null}
    </>
  )
  if (phone) return rows
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading hint={tt('settingRecordingHint')}>{tt('settingRecording')}</Heading>
      {rows}
    </section>
  )
}

/** Appens Inställningar i TV-läget: TvRow-rader med hjälptext. */
export function RecordingSettingsTvRows({ tvSettings, tt }: { tvSettings: TvSettings; tt: TT }) {
  const onDevice = useTimeshiftOnDevice()
  return (
    <>
      <TvRow testId="tv-record-enabled" label={tt('settingRecording')} hint={tt('settingRecordingHint')} toggle={tvSettings.recordingEnabled} onToggle={(recordingEnabled) => setTvSettings({ recordingEnabled })} />
      <TvRow testId="tv-record-start-early" label={tt('settingRecordStartEarly')} value={minutesLabel(tt, tvSettings.recordStartEarlyMin)} onOk={() => setTvSettings({ recordStartEarlyMin: nextRecordStartEarly(tvSettings.recordStartEarlyMin) })} />
      <TvRow testId="tv-record-end-late" label={tt('settingRecordEndLate')} value={minutesLabel(tt, tvSettings.recordEndLateMin)} onOk={() => setTvSettings({ recordEndLateMin: nextRecordEndLate(tvSettings.recordEndLateMin) })} />
      <TvRow testId="tv-record-notify" label={tt('settingRecordNotify')} toggle={tvSettings.recordNotify} onToggle={(recordNotify) => setTvSettings({ recordNotify })} />
      <TvRow testId="tv-record-open" label={tt('settingRecordOpen')} caret onOk={openRecordings} />
      <TvRow testId="tv-timeshift-enabled" label={tt('settingTimeshift')} hint={tt('settingTimeshiftHint')} toggle={tvSettings.timeshiftEnabled} onToggle={(timeshiftEnabled) => setTvSettings({ timeshiftEnabled })} />
      <TvRow testId="tv-timeshift-minutes" label={tt('settingTimeshiftMinutes')} value={tt('minutesShort', { min: tvSettings.timeshiftMinutes })} onOk={() => setTvSettings({ timeshiftMinutes: nextTimeshiftMinutes(tvSettings.timeshiftMinutes) })} />
      {showDeviceTimeshift() ? (
        <TvRow testId="tv-timeshift-device" label={tt('settingTimeshiftDevice')} hint={tt('settingTimeshiftDeviceHint')} toggle={onDevice} onToggle={(on) => setTimeshiftOnDevice(on)} />
      ) : null}
    </>
  )
}
