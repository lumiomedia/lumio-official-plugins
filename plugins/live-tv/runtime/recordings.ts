'use client'

import { useEffect, useState } from 'react'

/*
  INSPELNINGAR — klienten mot appens `/api/live-tv/record/*`.

  Appen äger jobben (schema, ffmpeg, filerna, persistensen). Pluginet ritar
  och pratar bara HTTP, precis som för kanalindexet och EPG:n. En delad
  cache i modulen gör att spelaren, guiden, vyn Inspelningar och
  notismonteringen ser samma lista utan att var och en pollar.
*/

export type RecStatus = 'scheduled' | 'recording' | 'done' | 'stopped' | 'failed' | 'missed' | 'disk_full'

export interface Recording {
  id: string
  title: string
  channelName: string
  channelKey: string
  logo?: string | null
  playUrl: string
  startAt: number
  stopAt: number
  programmeStart?: number | null
  programmeStop?: number | null
  status: RecStatus
  path?: string | null
  bytes: number
  startedAt?: number | null
  endedAt?: number | null
  error?: string | null
  createdAt: number
}

export interface RecordingList {
  recordings: Recording[]
  folder: string | null
  freeBytes: number | null
  keepFreeBytes: number
}

export interface ScheduleBody {
  title: string
  channelName: string
  channelKey: string
  logo?: string
  playUrl: string
  startAt: number
  stopAt: number
  programmeStart?: number
  programmeStop?: number
}

export const RECORD_API = '/api/live-tv/record'
/** Pollning medan vyn är öppen eller något jobb väntar/pågår. */
export const RECORDINGS_POLL_ACTIVE_MS = 15_000
export const RECORDINGS_POLL_IDLE_MS = 60_000

/** Slutar på `.ts`: media3 på Android gissar behållaren på filändelsen. */
export function recordingStreamUrl(id: string): string {
  return `${RECORD_API}/stream/${encodeURIComponent(id)}.ts`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const message = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `HTTP ${res.status}`
    throw new Error(message)
  }
  return data as T
}

const jsonInit = (method: string, body: unknown): RequestInit => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export async function listRecordings(): Promise<RecordingList> {
  const list = await request<RecordingList>(`${RECORD_API}/list`)
  return { recordings: Array.isArray(list?.recordings) ? list.recordings : [], folder: list?.folder ?? null, freeBytes: typeof list?.freeBytes === 'number' ? list.freeBytes : null, keepFreeBytes: typeof list?.keepFreeBytes === 'number' ? list.keepFreeBytes : 0 }
}

export async function scheduleRecording(body: ScheduleBody): Promise<Recording> {
  const rec = await request<Recording>(`${RECORD_API}/schedule`, jsonInit('POST', body))
  void refreshRecordings()
  return rec
}

export async function stopRecording(id: string): Promise<Recording> {
  const rec = await request<Recording>(`${RECORD_API}/stop`, jsonInit('POST', { id }))
  void refreshRecordings()
  return rec
}

export async function deleteRecording(id: string): Promise<void> {
  await request<unknown>(`${RECORD_API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  void refreshRecordings()
}

export async function saveRecordSettings(s: { folder?: string | null; keepFreeGb: number }): Promise<void> {
  await request<unknown>(`${RECORD_API}/settings`, jsonInit('POST', { folder: s.folder ?? null, keepFreeGb: s.keepFreeGb }))
  void refreshRecordings()
}

// ── Delad cache ────────────────────────────────────────────────────────────

let cache: RecordingList | null = null
let inflight: Promise<RecordingList | null> | null = null
const listeners = new Set<() => void>()
const emit = () => { for (const l of [...listeners]) l() }

export function getCachedRecordings(): RecordingList | null {
  return cache
}

/** Hämtar listan en gång för alla som frågar samtidigt; ett fel behåller den gamla listan. */
export function refreshRecordings(): Promise<RecordingList | null> {
  if (inflight) return inflight
  inflight = listRecordings()
    .then((list) => { cache = list; return list })
    .catch(() => cache)
    .finally(() => { inflight = null; emit() })
  return inflight
}

export function onRecordingsChanged(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function hasPendingRecordings(list: RecordingList | null): boolean {
  return !!list?.recordings.some((r) => r.status === 'scheduled' || r.status === 'recording')
}

export function useRecordings(active: boolean): { list: RecordingList | null; refresh: () => Promise<RecordingList | null> } {
  const [list, setList] = useState<RecordingList | null>(cache)
  const pending = hasPendingRecordings(list)
  useEffect(() => onRecordingsChanged(() => setList(cache)), [])
  useEffect(() => {
    void refreshRecordings()
    const period = active || pending ? RECORDINGS_POLL_ACTIVE_MS : RECORDINGS_POLL_IDLE_MS
    const timer = setInterval(() => { void refreshRecordings() }, period)
    return () => clearInterval(timer)
  }, [active, pending])
  return { list, refresh: refreshRecordings }
}

/** Jobbet för kanal + program (väntande eller pågående); utan program: det som spelas in på kanalen just nu. */
export function recordingFor(list: RecordingList | null, channelKey: string, programmeStart: number | null): Recording | undefined {
  if (!list) return undefined
  if (programmeStart != null) {
    return list.recordings.find((r) => r.channelKey === channelKey && r.programmeStart === programmeStart && (r.status === 'scheduled' || r.status === 'recording'))
  }
  return list.recordings.find((r) => r.channelKey === channelKey && r.status === 'recording')
}

/** 1.2 GB / 340 MB (binära enheter, som filsystemen räknar). */
export function formatBytes(n: number, locale: string): string {
  const GB = 1024 ** 3
  const MB = 1024 ** 2
  if (n >= GB) return `${(n / GB).toLocaleString(locale, { maximumFractionDigits: 1 })} GB`
  return `${Math.round(n / MB).toLocaleString(locale)} MB`
}
