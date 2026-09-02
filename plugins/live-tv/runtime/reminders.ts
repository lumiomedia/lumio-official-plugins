'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, type M3uChannel } from './live-tv-data'
import type { EpgProgramme } from './epg/types'

/**
 * Programpåminnelser. Lokal plugin-lagring, schemaläggaren kör i appens
 * process medan den är igång (ingen bakgrundstjänst). En påminnelse förfaller
 * när programmet har börjat + REMINDER_GRACE_MS och rensas då bort.
 */
export const REMINDERS_KEY = 'reminders_v1'
export const REMINDER_LEAD_MS = 5 * 60_000
const REMINDER_GRACE_MS = 10 * 60_000

export interface Reminder {
  id: string
  channelKey: string
  channelName: string
  channelUrl: string
  channelLogo: string | null
  channelGroup: string
  channelTvgId: string | null
  title: string
  start: number
  stop: number
  createdAt: number
  /** Satt när bannern visats så den inte visas igen. */
  notifiedAt?: number
}

export function reminderId(channel: Pick<M3uChannel, 'name' | 'url'>, programme: Pick<EpgProgramme, 'start'>): string {
  return `${channelKey(channel)}@${programme.start}`
}

function sanitize(raw: unknown): Reminder[] {
  if (!Array.isArray(raw)) return []
  const out: Reminder[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Partial<Reminder>
    if (typeof r.id !== 'string' || typeof r.start !== 'number' || typeof r.channelUrl !== 'string') continue
    out.push({
      id: r.id,
      channelKey: typeof r.channelKey === 'string' ? r.channelKey : channelKey({ name: r.channelName ?? '', url: r.channelUrl }),
      channelName: typeof r.channelName === 'string' ? r.channelName : 'Unknown',
      channelUrl: r.channelUrl,
      channelLogo: typeof r.channelLogo === 'string' ? r.channelLogo : null,
      channelGroup: typeof r.channelGroup === 'string' ? r.channelGroup : 'Other',
      channelTvgId: typeof r.channelTvgId === 'string' ? r.channelTvgId : null,
      title: typeof r.title === 'string' ? r.title : '',
      start: r.start,
      stop: typeof r.stop === 'number' ? r.stop : r.start,
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : 0,
      notifiedAt: typeof r.notifiedAt === 'number' ? r.notifiedAt : undefined,
    })
  }
  return out.sort((left, right) => left.start - right.start)
}

export function getReminders(now: number = Date.now()): Reminder[] {
  return sanitize(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, [])).filter((r) => r.start + REMINDER_GRACE_MS > now)
}

function write(list: Reminder[]): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, list)
}

export function isReminded(channel: Pick<M3uChannel, 'name' | 'url'>, programme: Pick<EpgProgramme, 'start'>): boolean {
  const id = reminderId(channel, programme)
  return getReminders().some((r) => r.id === id)
}

export function toggleReminder(channel: M3uChannel, programme: EpgProgramme, now: number = Date.now()): Reminder[] {
  const id = reminderId(channel, programme)
  const current = getReminders(now)
  const next = current.some((r) => r.id === id)
    ? current.filter((r) => r.id !== id)
    : [
        ...current,
        {
          id,
          channelKey: channelKey(channel),
          channelName: channel.name,
          channelUrl: channel.url,
          channelLogo: channel.logo ?? null,
          channelGroup: channel.group,
          channelTvgId: channel.tvgId,
          title: programme.title,
          start: programme.start,
          stop: programme.stop,
          createdAt: now,
        },
      ].sort((left, right) => left.start - right.start)
  write(next)
  return next
}

export function removeReminder(id: string): Reminder[] {
  const next = getReminders().filter((r) => r.id !== id)
  write(next)
  return next
}

export function markReminderNotified(id: string, now: number = Date.now()): void {
  write(getReminders(now).map((r) => (r.id === id ? { ...r, notifiedAt: now } : r)))
}

export function onRemindersChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, listener)
}

/** Påminnelser vars förvarningsfönster (start − lead) har passerat och som inte visats. */
export function dueReminders(now: number = Date.now(), leadMs: number = REMINDER_LEAD_MS): Reminder[] {
  return getReminders(now).filter((r) => r.notifiedAt === undefined && r.start - leadMs <= now)
}

export function reminderToChannel(r: Reminder): M3uChannel {
  return { name: r.channelName, url: r.channelUrl, logo: r.channelLogo, group: r.channelGroup, tvgId: r.channelTvgId }
}

/**
 * Schemaläggare: kollar varje halvminut och vid ändringar. `onDue` får varje
 * förfallen påminnelse exakt en gång (markeras som visad direkt).
 */
export function startReminderScheduler(onDue: (reminder: Reminder) => void): () => void {
  let stopped = false
  const tick = () => {
    if (stopped) return
    const now = Date.now()
    for (const r of dueReminders(now)) {
      markReminderNotified(r.id, now)
      onDue(r)
    }
  }
  tick()
  const timer = window.setInterval(tick, 30_000)
  const off = onRemindersChanged(tick)
  return () => {
    stopped = true
    window.clearInterval(timer)
    off()
  }
}

/** Bäst-ansträngning systemnotis (WebKit/Android-webviews saknar ofta stöd). */
export function tryNativeNotification(title: string, body: string): void {
  try {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      new Notification(title, { body })
    } else if (Notification.permission === 'default') {
      void Notification.requestPermission().then((permission) => {
        if (permission === 'granted') new Notification(title, { body })
      })
    }
  } catch {
    // Ingen notis-API i den här webviewn — bannern i appen räcker.
  }
}

export function useReminders(): Reminder[] {
  const [list, setList] = useState<Reminder[]>(() => getReminders())
  useEffect(() => {
    const sync = () => setList(getReminders())
    sync()
    const off = onRemindersChanged(sync)
    const timer = window.setInterval(sync, 60_000)
    return () => {
      off()
      window.clearInterval(timer)
    }
  }, [])
  return list
}
