'use client'

/**
 * Pluginets inställningssektion: kanallistan med Redigera / Ta bort och
 * "Ny kanal". Redigering sker i kanalstudion på Kanaler-sidan — sektionen ber
 * bara värden öppna sidan med `studio`-parametern (värden stänger då
 * inställningarna). TV-skalet får samma sak som typade rader.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, PillBtn, Section, TOKENS, requestOpenBrowsePage, type PluginSettingsRow, type SettingsSection } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import { onChannelsChanged, readChannels } from '../host'
import { deleteChannel, readCachedPool, useChannels } from '../state/store'
import { S } from '../strings'
import { CHANNELS_PAGE_ID } from './guide-layout'
import { useText } from './use-text'

type Text = { en: string; sv: string }
const CONFIRM_MS = 3000

const fill = (text: Text, vars: Record<string, string | number>): Text => {
  const one = (s: string) => Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), s)
  return { en: one(text.en), sv: one(text.sv) }
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

export function ChannelsSettingsSection() {
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
