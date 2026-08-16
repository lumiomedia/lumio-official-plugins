'use client'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLang } from '@/lib/plugin-sdk'

export type TwitchEmbedKind = 'live' | 'vod' | 'clip'

export function embedUrl(kind: TwitchEmbedKind, id: string, parents: string[]): string {
  const parentQs = parents.map((p) => `parent=${encodeURIComponent(p)}`).join('&')
  if (kind === 'clip') return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(id)}&${parentQs}`
  const key = kind === 'vod' ? 'video' : 'channel'
  return `https://player.twitch.tv/?${key}=${encodeURIComponent(id)}&${parentQs}`
}

export const TWITCH_EMBED_PARENTS = ['127.0.0.1', 'localhost', 'tauri.localhost']

// Twitch refuses to render (blank/white iframe) unless every parent hostname
// embedding it is declared. In a remote browser session the page is served
// from a dynamic host (e.g. <ip>.sslip.io), so the static desktop list isn't
// enough — fold in the live hostname before building the embed URL.
function resolveEmbedParents(): string[] {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  return Array.from(new Set([...(host ? [host] : []), ...TWITCH_EMBED_PARENTS]))
}

export function TwitchPlayerModal({
  kind,
  id,
  title,
  onClose,
}: {
  kind: TwitchEmbedKind
  id: string
  title: string
  onClose: () => void
}) {
  const { t } = useLang()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Portal to body: transformed ancestors would make fixed positioning container-relative.
  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-2 text-white">
        <span className="truncate text-sm">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="rounded-full px-3 py-1 hover:bg-white/10"
        >
          ✕
        </button>
      </div>
      <iframe
        title={title}
        src={embedUrl(kind, id, resolveEmbedParents())}
        className="h-full w-full flex-1 border-0"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>,
    document.body,
  )
}
