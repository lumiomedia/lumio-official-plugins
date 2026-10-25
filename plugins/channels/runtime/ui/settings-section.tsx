'use client'

/**
 * Pluginets inställningssektion: kanallistan med Redigera / Ta bort och
 * "Ny kanal". Redigering sker i kanalstudion på Kanaler-sidan — sektionen ber
 * bara värden öppna sidan med `studio`-parametern (värden stänger då
 * inställningarna). TV-skalet får samma sak som typade rader.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, PillBtn, Section, Switch, TOKENS, requestOpenBrowsePage, type PluginSettingsRow, type SettingsSection } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import { debridAccounts, forgetDebridAccount, onChannelsChanged, readChannels, refreshDebridCloud, sourceCacheSetting } from '../host'
import type { DebridProviderId } from '../data/cloud'
import { deleteChannel, readCachedPool, useChannels } from '../state/store'
import { S } from '../strings'
import { CHANNELS_PAGE_ID } from './guide-layout'
import { useText } from './use-text'

type Text = Record<string, string>
const CONFIRM_MS = 3000

const fill = (text: Text, vars: Record<string, string | number>): Text => {
  const one = (s: string) => Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), s)
  return Object.fromEntries(Object.entries(text).map(([l, s]) => [l, one(s)]))
}

export function openStudio(target: 'new' | string): void {
  requestOpenBrowsePage({ pageId: CHANNELS_PAGE_ID, params: { studio: target } })
}

export interface ChannelRowActions {
  edit(id: string): void
  remove(id: string): void
  create(): void
}

/** TV-raderna: en navigeringsrad per kanal (Redigera / Ta bort) och "Ny kanal". */
export function buildChannelRows(channels: ChannelDef[], actions: ChannelRowActions): PluginSettingsRow[] {
  const sorted = [...channels].sort((a, b) => a.number - b.number)
  const rows: PluginSettingsRow[] = [{ t: 'eyebrow', label: S.settingsTitle }]
  if (sorted.length === 0) rows.push({ t: 'note', text: S.settingsEmpty })
  for (const channel of sorted) {
    rows.push({
      t: 'action',
      label: fill(S.settingsChannelLine, { n: channel.number, name: channel.name }),
      rows: [
        { t: 'action', label: S.settingsEdit, run: () => actions.edit(channel.id) },
        {
          t: 'action',
          label: S.settingsDelete,
          danger: true,
          confirm: { title: fill(S.settingsDeleteTitle, { name: channel.name }), body: S.settingsDeleteBody, confirmLabel: S.settingsDelete },
          run: () => actions.remove(channel.id),
        },
      ],
    })
  }
  rows.push({ t: 'action', label: S.settingsNewRow, run: actions.create })
  const accounts = debridAccounts()
  if (accounts.length > 0) {
    rows.push({ t: 'eyebrow', label: S.settingsCloudTitle })
    for (const id of accounts) {
      rows.push({
        t: 'action',
        label: { en: CLOUD_NAMES[id], sv: CLOUD_NAMES[id], de: CLOUD_NAMES[id], fr: CLOUD_NAMES[id], es: CLOUD_NAMES[id] },
        danger: true,
        confirm: { title: fill(S.settingsCloudRemoveTitle, { name: CLOUD_NAMES[id] }), body: S.settingsCloudRemoveBody, confirmLabel: S.settingsCloudRemove },
        run: () => removeCloudAccount(id),
      })
    }
  }
  const cache = sourceCacheSetting()
  if (cache) {
    rows.push({ t: 'eyebrow', label: S.settingsCacheTitle })
    rows.push({ t: 'toggle', label: S.settingsCacheLabel, hint: S.settingsCacheHint, value: cache.get(), set: (on) => cache.set(on) })
  }
  return rows
}

export const channelsSettingsSection: SettingsSection = {
  id: 'channels',
  label: S.settingsLabel,
  Section: ChannelsSettingsSection,
  rows: () => buildChannelRows(readChannels(), { edit: openStudio, remove: deleteChannel, create: () => openStudio('new') }),
  subscribe: (listener) => onChannelsChanged(listener),
}

/**
 * Kanallistans logik (inställningssektionen är där kanalerna hanteras):
 * sorterad lista, titelantal ur poolcachen (inga uppslag)
 * och tvåstegs Ta bort (andra trycket inom 3 s tar bort).
 */
export function useChannelList(): {
  sorted: ChannelDef[]
  counts: Record<string, number | null>
  confirmId: string | null
  requestDelete(id: string): void
} {
  const channels = useChannels()
  const sorted = useMemo(() => [...channels].sort((a, b) => a.number - b.number), [channels])
  // Antal titlar bara ur poolcachen — sektionen gör inga uppslag.
  const counts = useMemo(() => Object.fromEntries(sorted.map((c) => [c.id, readCachedPool(c.id)?.length ?? null])), [sorted])
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const onDelete = (id: string) => {
    if (timer.current) clearTimeout(timer.current)
    if (confirmId !== id) {
      setConfirmId(id)
      timer.current = setTimeout(() => setConfirmId(null), CONFIRM_MS)
      return
    }
    setConfirmId(null)
    deleteChannel(id)
  }
  return { sorted, counts, confirmId, requestDelete: onDelete }
}

/** Tjänsternas namn (pluginet får namnge dem; appkärnan gör det inte). */
const CLOUD_NAMES: Record<DebridProviderId, string> = { realdebrid: 'Real-Debrid', torbox: 'TorBox', alldebrid: 'AllDebrid' }

/** Tar bort kontots nyckel och bygger om molnlistan, så filerna lämnar kanalerna. */
function removeCloudAccount(id: DebridProviderId): void {
  forgetDebridAccount(id)
  void refreshDebridCloud().catch(() => [])
}

/**
 * Molnkonton med sparad nyckel. Appens egen inställningsflik för tjänsterna
 * finns inte längre, så ett gammalt konto (utgånget, oanvänt) gick inte att
 * ta bort och gav kanalposter som aldrig gick att spela (2026-10-19).
 */
function CloudAccountsCard() {
  const t = useText()
  const [accounts, setAccounts] = useState(() => debridAccounts())
  const [confirm, setConfirm] = useState<DebridProviderId | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  if (accounts.length === 0) return null
  const onRemove = (id: DebridProviderId) => {
    if (timer.current) clearTimeout(timer.current)
    if (confirm !== id) {
      setConfirm(id)
      timer.current = setTimeout(() => setConfirm(null), CONFIRM_MS)
      return
    }
    setConfirm(null)
    removeCloudAccount(id)
    setAccounts(debridAccounts())
  }
  return (
    <Section title={t('settingsCloudTitle')} hint={t('settingsCloudHint')}>
      {accounts.map((id) => (
        <Card key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div data-cloud-account={id} style={{ color: TOKENS.text, fontWeight: 600 }}>{CLOUD_NAMES[id]}</div>
          <PillBtn size="sm" variant="danger" onClick={() => onRemove(id)}>
            {t(confirm === id ? 'settingsCloudRemoveConfirm' : 'settingsCloudRemove')}
          </PillBtn>
        </Card>
      ))}
    </Section>
  )
}

/** "Mellanlagra strömmar" — bara på Android, där valet finns. */
function SourceCacheCard() {
  const t = useText()
  const cache = useMemo(() => sourceCacheSetting(), [])
  const [on, setOn] = useState(() => cache?.get() ?? false)
  if (!cache) return null
  return (
    <Section title={t('settingsCacheTitle')}>
      <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <div style={{ color: TOKENS.text, fontWeight: 600 }}>{t('settingsCacheLabel')}</div>
          <div style={{ color: TOKENS.textDim, marginTop: 4, lineHeight: 1.5, maxWidth: '62ch' }}>{t('settingsCacheHint')}</div>
        </div>
        <Switch checked={on} onChange={(value) => { cache.set(value); setOn(value) }} />
      </Card>
    </Section>
  )
}

export function ChannelsSettingsSection() {
  return (
    <>
      <ChannelListSection />
      <CloudAccountsCard />
      <SourceCacheCard />
    </>
  )
}

function ChannelListSection() {
  const t = useText()
  const { sorted, counts, confirmId, requestDelete: onDelete } = useChannelList()

  return (
    <Section
      title={t('settingsTitle')}
      hint={t('settingsHint')}
      action={<PillBtn variant="primary" onClick={() => openStudio('new')}>{t('settingsNew')}</PillBtn>}
    >
      {sorted.length === 0 ? (
        <Card><p style={{ margin: 0, color: TOKENS.textDim }}>{t('settingsEmpty')}</p></Card>
      ) : (
        sorted.map((channel) => {
          const count = counts[channel.id]
          return (
            <Card key={channel.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span
                style={{
                  minWidth: 36, height: 28, padding: '0 6px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${TOKENS.borderStrong}`, background: TOKENS.surface2, color: TOKENS.text, fontWeight: 600,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                }}
              >
                {channel.number}
              </span>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div data-channel-name="" style={{ color: TOKENS.text, fontWeight: 600 }}>{channel.name}</div>
                {count != null ? <div style={{ color: TOKENS.textDim, marginTop: 2 }}>{t('settingsTitles', { n: count })}</div> : null}
              </div>
              <PillBtn size="sm" onClick={() => openStudio(channel.id)}>{t('settingsEdit')}</PillBtn>
              <PillBtn size="sm" variant="danger" onClick={() => onDelete(channel.id)}>
                {t(confirmId === channel.id ? 'settingsDeleteConfirm' : 'settingsDelete')}
              </PillBtn>
            </Card>
          )
        })
      )}
    </Section>
  )
}
