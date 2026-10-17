'use client'

/**
 * Studions titelfält: välj enskilda filmer/serier som kanalen ska sända.
 *
 * Förslagen kommer först ur de redan hämtade källpoolerna (direkt, lokalt),
 * sedan från värdens TMDb-sökning (createTitleSearch: 350 ms debounce, minst
 * två tecken, högst ett anrop ute). Valda titlar visas som chips med affisch
 * när en finns till hands (förslaget, källpoolen eller reservposten) — inget
 * extra uppslag görs för bilden.
 *
 * TV: fältet är en station som öppnar värdens skärmtangentbord (som
 * namnfältet); förslagen är staplade stationer, så ▲▼ går mellan dem.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { TOKENS, getTvKeyboardPanel, inputStyle } from '@/lib/plugin-sdk'
import { channelTitleKey, type ChannelTitle, type TitleSuggestion } from '../model/channel'
import { itemMatchesTitle, type PoolItem } from '../data/pool'
import { searchTmdbTitles } from '../host'
import { createTitleSearch, localTitleSuggestions, mergeSuggestions, toChannelTitle, type SearchState, type SourcePools } from './studio-logic'
import { FONT, fontSize } from './tokens'
import { dim, dimS, refocusLater, tvu } from './tv'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

const FIELD = '[data-studio-titles]'
const FIRST_SUGGESTION = '[data-title-suggestion]'

export function TitlePicker({ selected, onChange, pools, extra, isTv, t, labelStyle }: {
  selected: ChannelTitle[]
  onChange(next: ChannelTitle[]): void
  pools: SourcePools
  /** Reservposter för valda titlar som saknas i källorna (affischen till chipet). */
  extra: PoolItem[]
  isTv: boolean
  t: T
  labelStyle: CSSProperties
}) {
  const fs = (px: number) => fontSize(px, isTv)
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<SearchState>({ query: '', results: [], status: 'idle' })
  const [kbOpen, setKbOpen] = useState(false)
  // Affischer från förslag som valts i den här öppningen.
  const posters = useRef(new Map<string, string>())
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const searcher = useMemo(() => createTitleSearch((q) => searchTmdbTitles(q), setRemote), [])
  useEffect(() => () => searcher.dispose(), [searcher])
  useEffect(() => { searcher.set(query) }, [query, searcher])

  const local = useMemo(() => localTitleSuggestions(pools, query), [pools, query])
  const active = query.trim().length >= 2
  // TMDb-svaret gäller bara när det hör till det som står i fältet.
  const remoteHits = remote.query.toLowerCase() === query.trim().toLowerCase() ? remote.results : []
  const suggestions = active ? mergeSuggestions(local, remoteHits, selected, undefined, query) : []
  const localKeys = useMemo(() => new Set(local.map(channelTitleKey)), [local])

  const posterFor = (title: ChannelTitle): string | undefined => {
    const remembered = posters.current.get(channelTitleKey(title))
    if (remembered) return remembered
    for (const item of [...extra, ...pools.library, ...pools.vod, ...pools.debrid, ...pools.watchlist]) {
      if (item.posterUrl && itemMatchesTitle(item, title)) return item.posterUrl
    }
    return undefined
  }

  const add = (s: TitleSuggestion) => {
    const title = toChannelTitle(s)
    if (s.posterUrl) posters.current.set(channelTitleKey(title), s.posterUrl)
    onChange([...selected, title])
    setQuery('')
    refocusLater(() => (isTv ? document.querySelector<HTMLElement>(FIELD) : inputRef.current))
  }
  const remove = (key: string) => {
    onChange(selected.filter((x) => channelTitleKey(x) !== key))
    refocusLater(() => document.querySelector<HTMLElement>('[data-title-chip]') ?? document.querySelector<HTMLElement>(FIELD))
  }

  // Skrivbord: ▼ från fältet till första förslaget, ▲▼ i listan, Escape tömmer.
  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      const first = listRef.current?.querySelector<HTMLElement>(FIRST_SUGGESTION)
      if (first) { e.preventDefault(); first.focus() }
    } else if (e.key === 'Escape' && query) {
      e.preventDefault()
      e.stopPropagation()
      setQuery('')
    }
  }
  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isTv || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>(FIRST_SUGGESTION) ?? [])]
    const at = rows.indexOf(document.activeElement as HTMLElement)
    if (at < 0) return
    e.preventDefault()
    if (e.key === 'ArrowUp' && at === 0) { inputRef.current?.focus(); return }
    rows[Math.min(rows.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus()
  }

  const KeyboardPanel = isTv ? getTvKeyboardPanel() : null
  const fieldStyle: CSSProperties = { ...inputStyle, fontSize: fs(14), ...(isTv ? { minHeight: tvu(48), padding: `0 ${tvu(16)}`, maxWidth: tvu(640), boxSizing: 'border-box' } : {}) }
  const thumb = (url: string | undefined, w: number, h: number) => (
    <span
      aria-hidden="true"
      style={{
        width: dim(w, isTv), height: dim(h, isTv), flexShrink: 0, borderRadius: 4, background: url ? `center / cover no-repeat url("${url}")` : TOKENS.surface2,
        border: `1px solid ${TOKENS.border}`,
      }}
    />
  )

  const status = !active ? null
    : remote.status === 'searching' && suggestions.length === 0 ? t('titlesSearching')
    : remote.status === 'failed' && suggestions.length === 0 ? t('titlesSearchFailed')
    : remote.status === 'done' && suggestions.length === 0 ? t('titlesNoHits')
    : null

  return (
    <div data-studio-field="fieldTitles" style={{ marginBottom: dim(18, isTv, 22) }}>
      <p style={labelStyle}>{t('fieldTitles')}</p>
      {selected.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: dim(8, isTv), marginBottom: dimS(10, isTv) }}>
          {selected.map((title) => {
            const key = channelTitleKey(title)
            const name = title.year ? `${title.title} (${title.year})` : title.title
            return (
              <button
                key={key}
                type="button"
                data-f=""
                data-title-chip={key}
                aria-label={t('titleRemove', { title: name })}
                onClick={() => remove(key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: dim(8, isTv), borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  padding: isTv ? `${tvu(4)} ${tvu(12)} ${tvu(4)} ${tvu(4)}` : '3px 10px 3px 3px', fontSize: fs(13), fontWeight: 500, lineHeight: 1.25,
                  border: `1px solid ${TOKENS.accent}`, background: TOKENS.accentSoft, color: TOKENS.text,
                  ...(isTv ? { minHeight: tvu(40), boxSizing: 'border-box' as const } : {}),
                }}
              >
                {thumb(posterFor(title), 20, 30)}
                <span>{name}</span>
                <span aria-hidden="true" style={{ color: TOKENS.textMute, fontSize: fs(14) }}>×</span>
              </button>
            )
          })}
        </div>
      ) : null}
      {KeyboardPanel ? (
        <button
          type="button"
          data-f=""
          data-studio-titles=""
          onClick={() => setKbOpen(true)}
          style={{ ...fieldStyle, textAlign: 'left', cursor: 'pointer', color: query ? TOKENS.text : TOKENS.textMute }}
        >
          {query || t('fieldTitlesPlaceholder')}
        </button>
      ) : (
        <input
          ref={inputRef}
          data-f=""
          data-studio-titles=""
          value={query}
          maxLength={80}
          placeholder={t('fieldTitlesPlaceholder')}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
          style={fieldStyle}
        />
      )}
      {suggestions.length > 0 ? (
        <div
          ref={listRef}
          data-title-suggestions=""
          role="listbox"
          onKeyDown={onListKey}
          style={{
            marginTop: dimS(8, isTv), border: `1px solid ${TOKENS.border}`, borderRadius: 10, overflow: 'hidden', background: TOKENS.surface1,
            ...(isTv ? { maxWidth: tvu(640) } : {}),
          }}
        >
          {suggestions.map((s, i) => {
            const meta = [t(s.kind === 'tv' ? 'titleSeries' : 'titleMovie'), s.year != null ? String(s.year) : null, localKeys.has(channelTitleKey(s)) ? t('titlesInSources') : null]
              .filter(Boolean).join(' · ')
            return (
              <button
                key={`${channelTitleKey(s)}-${i}`}
                type="button"
                role="option"
                aria-selected={false}
                data-f=""
                data-title-suggestion={channelTitleKey(s)}
                onClick={() => add(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: dim(12, isTv), width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  padding: isTv ? `${tvu(8)} ${tvu(14)}` : '7px 12px', background: 'transparent', color: TOKENS.text, border: 'none',
                  borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.border}`,
                }}
              >
                {thumb(s.posterUrl, 28, 42)}
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: fs(13.5), fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  <span style={{ display: 'block', fontSize: fs(11.5), color: TOKENS.textMute, marginTop: 2, fontFamily: FONT.ui }}>{meta}</span>
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
      {status ? <p data-titles-status="" style={{ margin: `${dimS(6, isTv)} 0 0`, fontSize: fs(12), color: TOKENS.textDim }}>{status}</p> : null}
      {selected.length > 0 ? (
        <p data-titles-hint="" style={{ margin: `${dimS(8, isTv)} 0 0`, fontSize: fs(12.5), color: TOKENS.textDim, lineHeight: 1.4 }}>{t('titlesHint')}</p>
      ) : null}
      {kbOpen && KeyboardPanel ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
          <KeyboardPanel
            title={t('fieldTitles')}
            initial={query}
            placeholder={t('fieldTitlesPlaceholder')}
            maxLength={80}
            field="short"
            onChange={(value: string) => setQuery(value)}
            // Till första förslaget om det finns ett, annars tillbaka till fältet.
            onDone={(value: string) => {
              setKbOpen(false)
              setQuery(value)
              refocusLater(() => document.querySelector<HTMLElement>(FIRST_SUGGESTION) ?? document.querySelector<HTMLElement>(FIELD))
            }}
            onClose={() => { setKbOpen(false); refocusLater(() => document.querySelector<HTMLElement>(FIELD)) }}
          />
        </div>
      ) : null}
    </div>
  )
}
