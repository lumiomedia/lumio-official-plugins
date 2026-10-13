import type { CouchCommand, CouchPlayer } from '@/lib/plugin-sdk'

/** Kanalen i Soffläge: direktsändning, bara paus och volym (ingen tidsförskjutning i Live TV). */
export function channelSnapshot(a: { name: string; paused: boolean; volume01: number; muted: boolean }): CouchPlayer {
  return {
    kind: 'channel', tmdbId: null, title: a.name, channelName: a.name, isLive: true, canSeek: false,
    pos: 0, dur: 0, playing: !a.paused, volume: a.muted ? 0 : Math.round(a.volume01 * 100),
    audio: [], audioId: null, subs: [], subId: null, subDelay: null, dialogBoost: null,
    streams: [], streamKey: null, sleep: { mode: 'off' },
  }
}

export function runChannelCommand(cmd: CouchCommand, h: { togglePause(): void; setVolume01(v: number): void }): void {
  if (cmd.type === 'toggle-play') h.togglePause()
  else if (cmd.type === 'volume') {
    const v = (cmd as { value?: unknown }).value
    if (typeof v === 'number' && Number.isFinite(v)) h.setVolume01(Math.max(0, Math.min(1, v / 100)))
  }
}
