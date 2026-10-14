'use client'

/**
 * Kanalstudion: skapa eller redigera en kanals regler med live-förhandsvisning.
 *
 * Varje vald källa hämtas EN gång per öppning (via host.sourceDeps, så
 * metadata-, säsongs- och debridcacharna delas med resten av pluginet); varje
 * regeländring filtreras sedan lokalt. Förhandsvisningen gör aldrig ett
 * strömuppslag. Bara "Uppdatera" på debridraden tvingar en ny debridlista.
 *
 * TV: alla fält är stationer (data-f) i rader, så fokusmotorns geometri ger
 * ▲▼ mellan fältrader och ◀▶ inom raden; OK växlar ett chip. Namnfältet
 * skrivs med värdens skärmtangentbord. Bakåt avbryter studion.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Card, Switch, TOKENS, channelListDebridCloud, getTvKeyboardPanel, inputStyle, useLang } from '@/lib/plugin-sdk'
import { emptyDraft, nextChannelNumber, createChannel, validateDraft, type ChannelDef, type ChannelDraft, type SourceId } from '../model/channel'
import type { PoolItem } from '../data/pool'
import { loadDebridItems, loadLibraryItems, loadVodItems, loadWatchlistItems } from '../data/sources'
import { sourceDeps } from '../host'
import { deleteChannel, saveChannel } from '../state/store'
import { genreLabel, genreName, genreOptions, previewFor, sourceCounts, type SourcePools } from './studio-logic'
import { canonGenre, canonGenres } from '../data/genres'
import { formatClock } from './guide-layout'
import { belowMenuPill, C, FONT, fontSize } from './tokens'
import type { TextKey, useText } from './use-text'

type T = ReturnType<typeof useText>

const LOADERS: Record<SourceId, (deps: typeof sourceDeps, opts: { strict?: boolean }) => Promise<PoolItem[]>> = {
  library: loadLibraryItems,
  watchlist: loadWatchlistItems,
  debrid: loadDebridItems,
  vod: loadVodItems,
}

const SOURCES: Array<{ id: SourceId; label: TextKey }> = [
  { id: 'library', label: 'sourceLibrary' },
  { id: 'watchlist', label: 'sourceWatchlist' },
  { id: 'debrid', label: 'sourceDebrid' },
  // Av som standard; räknas ändå (lokalt index, billigt) så man ser vad som finns.
  { id: 'vod', label: 'sourceVod' },
]
const KINDS: Array<{ id: ChannelDraft['kind']; label: TextKey }> = [
  { id: 'any', label: 'kindAny' }, { id: 'movie', label: 'kindMovie' }, { id: 'tv', label: 'kindTv' },
]
const ERAS: Array<{ id: ChannelDraft['era']; label: TextKey }> = [
  { id: 'any', label: 'eraAny' }, { id: '70s', label: 'era70s' }, { id: '80s', label: 'era80s' }, { id: '90s', label: 'era90s' }, { id: '80s90s', label: 'era80s90s' },
  { id: '00s', label: 'era00s' }, { id: '10s', label: 'era10s' }, { id: '20s', label: 'era20s' },
]
const LENGTHS: Array<{ id: ChannelDraft['length']; label: TextKey }> = [
  { id: 'any', label: 'lengthAny' }, { id: 'short', label: 'lengthShort' }, { id: 'episode', label: 'lengthEpisode' }, { id: 'feature', label: 'lengthFeature' },
]
const ORDERS: Array<{ id: ChannelDraft['order']; label: TextKey }> = [
  { id: 'shuffle', label: 'orderShuffle' }, { id: 'chrono', label: 'orderChrono' }, { id: 'episodes', label: 'orderEpisodes' },
]
const WINDOWS: Array<{ id: ChannelDraft['airWindow']; label: TextKey }> = [
  { id: 'always', label: 'windowAlways' }, { id: 'evenings', label: 'windowEvenings' }, { id: 'late', label: 'windowLate' },
]

/** Bakåt: samma tangenter som värdens fokusmotor (Escape/Backspace) plus webbens namn. */
const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])
const CONFIRM_MS = 3000
const CLOCK_MS = 30_000

function draftOf(channel: ChannelDef | null): ChannelDraft {
  if (!channel) return emptyDraft()
  const { name, sources, genres, era, length, kind, order, airWindow, showOnHome } = channel
  return { name, sources: [...sources], genres: [...genres], era, length, kind, order, airWindow, showOnHome }
}

export function ChannelStudio({ studio, channels, isTv, isMobile, t, onDone }: {
  studio: string
  channels: ChannelDef[]
  isTv: boolean
  isMobile: boolean
  t: T
  onDone(savedId?: string): void
}) {
  const { lang } = useLang()
  const genreLang: 'en' | 'sv' = lang === 'sv' ? 'sv' : 'en'
  const fs = (px: number) => fontSize(px, isTv)
  const editing = useMemo(() => (studio === 'new' ? null : channels.find((c) => c.id === studio) ?? null), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<ChannelDraft>(() => draftOf(editing))
  // Ny kanal: tablåns frö väljs nu, så den sparade kanalen sänder exakt det förhandsvisningen visar.
  const [seed] = useState(() => editing?.seed ?? Math.floor(Math.random() * 2 ** 31))
  const [attempted, setAttempted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [kbOpen, setKbOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(Date.now)
  const [pools, setPools] = useState<Partial<Record<SourceId, PoolItem[]>>>({})
  const [failedSources, setFailedSources] = useState<Partial<Record<SourceId, boolean>>>({})

  const patch = useCallback((next: Partial<ChannelDraft>) => setDraft((d) => ({ ...d, ...next })), [])

  // ── Källor: en hämtning per källa och öppning ─────────────────────────────
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  const started = useRef(new Set<SourceId>())
  // Generation per källa: bara den senaste hämtningen får skriva (en långsam
  // första debridladdning får inte skriva över en färskare Uppdatera).
  const generation = useRef<Record<SourceId, number>>({ library: 0, watchlist: 0, debrid: 0, vod: 0 })
  const load = useCallback((source: SourceId, run: () => Promise<PoolItem[]>) => {
    started.current.add(source)
    const gen = ++generation.current[source]
    return run().then(
      (items) => ({ items, failed: false }),
      () => ({ items: [] as PoolItem[], failed: true }),
    ).then(({ items, failed }) => {
      if (!alive.current || generation.current[source] !== gen) return
      setPools((p) => ({ ...p, [source]: items }))
      setFailedSources((f) => ({ ...f, [source]: failed }))
    })
  }, [])
  useEffect(() => {
    // Valda källor, plus VOD-katalogens antal (lokalt index) även när den är av.
    for (const source of new Set<SourceId>([...draft.sources, 'vod'])) {
      if (!started.current.has(source)) void load(source, () => LOADERS[source](sourceDeps, { strict: true }))
    }
  }, [draft.sources, load])

  const refreshDebrid = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await load('debrid', async () => {
        await channelListDebridCloud({ force: true }).catch(() => [])
        return loadDebridItems(sourceDeps, { strict: true })
      })
    } finally {
      if (alive.current) setRefreshing(false)
    }
  }, [refreshing, load])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_MS)
    return () => clearInterval(timer)
  }, [])

  const full: SourcePools = useMemo(
    () => ({ library: pools.library ?? [], watchlist: pools.watchlist ?? [], debrid: pools.debrid ?? [], vod: pools.vod ?? [] }),
    [pools],
  )
  const loading = draft.sources.some((s) => pools[s] === undefined)
  const preview = useMemo(() => previewFor(draft, full, seed, now), [draft, full, seed, now])
  const counts = useMemo(() => sourceCounts(full), [full])
  const genres = useMemo(() => {
    const list = genreOptions(full)
    const known = new Set(list.map((g) => canonGenre(g)[0]))
    // En sparad genre som inte finns i de hämtade källorna ska fortfarande gå att välja bort.
    const extra = canonGenres(draft.genres).filter((token) => !known.has(token)).map((token) => genreName(token))
    return [...list, ...extra]
  }, [full, draft.genres])
  const chosenGenres = useMemo(() => new Set(canonGenres(draft.genres)), [draft.genres])
  const toggleGenre = (name: string) => {
    const token = canonGenre(name)[0]
    if (!token) return
    patch({
      genres: chosenGenres.has(token) ? draft.genres.filter((g) => !canonGenre(g).includes(token)) : [...draft.genres, name],
    })
  }
  // En källa som inte svarade ger inget antal att varna för: räkningen vore bara källfelet.
  const anyFailed = draft.sources.some((s) => failedSources[s])
  const validation = validateDraft(draft, loading || anyFailed ? null : preview.count)
  const showError = (field: 'name' | 'sources') => attempted && validation.errors.includes(field)

  // ── Spara / ta bort ───────────────────────────────────────────────────────
  const save = () => {
    setAttempted(true)
    if (validation.errors.length > 0) return
    const clean = { ...draft, name: draft.name.trim() }
    if (editing) {
      // Behåll id, nummer, färgton, frö och skapad-tid.
      saveChannel({ ...editing, ...clean })
      onDone(editing.id)
      return
    }
    const def = { ...createChannel(clean, channels), seed }
    saveChannel(def)
    onDone(def.id)
  }

  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current) }, [])
  const onDelete = () => {
    if (!editing) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), CONFIRM_MS)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    deleteChannel(editing.id)
    onDone()
  }

  const cancel = () => onDone(editing?.id)
  const cancelRef = useRef(cancel)
  cancelRef.current = cancel
  const kbOpenRef = useRef(kbOpen)
  kbOpenRef.current = kbOpen

  // TV: Bakåt avbryter studion i stället för att lämna sidan. Tangentbordspanelen äger Bakåt själv.
  useEffect(() => {
    if (!isTv) return
    const handler = (event: KeyboardEvent) => {
      if (kbOpenRef.current || !BACK_KEYS.has(event.key)) return
      const el = document.activeElement
      if (event.key === 'Backspace' && el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      cancelRef.current()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isTv])

  // ── Rendering ─────────────────────────────────────────────────────────────
  const KeyboardPanel = isTv ? getTvKeyboardPanel() : null
  const labelStyle: CSSProperties = {
    fontSize: fs(11), fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.textMute, margin: '0 0 8px',
  }
  const errorStyle: CSSProperties = { margin: '6px 0 0', fontSize: fs(12.5), color: TOKENS.red }
  const twoCols = !isMobile

  const field = (label: TextKey, children: ReactNode, extra?: ReactNode, error?: ReactNode) => (
    <div data-studio-field={label} style={{ marginBottom: isTv ? '1.25rem' : 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <p style={labelStyle}>{t(label)}</p>
        {extra}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
      {error}
    </div>
  )

  const single = <K extends string>(options: Array<{ id: K; label: TextKey }>, value: K, set: (v: K) => void) =>
    options.map((o) => (
      <Chip key={o.id} isTv={isTv} selected={value === o.id} onClick={() => set(o.id)}>{t(o.label)}</Chip>
    ))

  const toggleIn = <V extends string>(list: V[], value: V): V[] => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value])

  const nameField = KeyboardPanel ? (
    <button
      type="button"
      data-f=""
      data-init=""
      data-studio-name=""
      onClick={() => setKbOpen(true)}
      style={{ ...inputStyle, fontSize: fs(14), textAlign: 'left', cursor: 'pointer', color: draft.name ? TOKENS.text : TOKENS.textMute }}
    >
      {draft.name || t('fieldNamePlaceholder')}
    </button>
  ) : (
    <input
      data-f=""
      data-init=""
      data-studio-name=""
      value={draft.name}
      maxLength={60}
      placeholder={t('fieldNamePlaceholder')}
      onChange={(e) => patch({ name: e.target.value })}
      style={{ ...inputStyle, fontSize: fs(14), borderColor: showError('name') ? TOKENS.red : undefined }}
    />
  )

  const form = (
    <div data-studio-form="" style={{ minWidth: 0 }}>
      <div style={{ marginBottom: isTv ? '1.25rem' : 18 }}>
        <p style={labelStyle}>{t('fieldName')}</p>
        {nameField}
        {showError('name') ? <p style={errorStyle}>{t('errorName')}</p> : null}
      </div>
      {field(
        'fieldSources',
        SOURCES.map((s) => (
          <Chip
            key={s.id}
            isTv={isTv}
            selected={draft.sources.includes(s.id)}
            count={failedSources[s.id] ? '—' : pools[s.id] ? counts[s.id] : undefined}
            data-source={s.id}
            onClick={() => patch({ sources: toggleIn(draft.sources, s.id) })}
          >
            {t(s.label)}
          </Chip>
        )),
        <button
          type="button"
          data-f=""
          data-studio-refresh=""
          disabled={refreshing}
          onClick={() => void refreshDebrid()}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: refreshing ? 'default' : 'pointer', color: TOKENS.textDim,
            fontSize: fs(11.5), textDecoration: 'underline', opacity: refreshing ? 0.5 : 1, fontFamily: 'inherit',
          }}
        >
          {`${t('sourceDebrid')}: ${t('sourceRefresh')}`}
        </button>,
        showError('sources') ? <p style={errorStyle}>{t('errorSources')}</p> : null,
      )}
      {field('fieldKind', single(KINDS, draft.kind, (kind) => patch({ kind })))}
      {field(
        'fieldGenre',
        genres.map((g) => (
          <Chip
            key={g}
            isTv={isTv}
            selected={chosenGenres.has(canonGenre(g)[0] ?? '')}
            onClick={() => toggleGenre(g)}
          >
            {genreLabel(g, genreLang)}
          </Chip>
        )),
      )}
      <div style={{ display: 'grid', gridTemplateColumns: twoCols ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', columnGap: 24 }}>
        {field('fieldEra', single(ERAS, draft.era, (era) => patch({ era })))}
        {field('fieldLength', single(LENGTHS, draft.length, (length) => patch({ length })))}
        {field('fieldOrder', single(ORDERS, draft.order, (order) => patch({ order })))}
        {field('fieldWindow', single(WINDOWS, draft.airWindow, (airWindow) => patch({ airWindow })))}
      </div>
      <Card style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fs(14), fontWeight: 600, color: TOKENS.text }}>{t('showOnHome')}</div>
          <div style={{ fontSize: fs(12.5), color: TOKENS.textDim, marginTop: 2 }}>{t('showOnHomeHint')}</div>
        </div>
        <button
          type="button"
          data-f=""
          role="switch"
          aria-checked={draft.showOnHome}
          data-studio-home=""
          onClick={() => patch({ showOnHome: !draft.showOnHome })}
          style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', borderRadius: 999 }}
        >
          <Switch checked={draft.showOnHome} />
        </button>
      </Card>
    </div>
  )

  const number = editing?.number ?? nextChannelNumber(channels)
  const previewPanel = (
    <aside data-studio-preview="" style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            minWidth: isTv ? '2.75rem' : 44, height: isTv ? '2.25rem' : 36, padding: '0 8px', borderRadius: 8, display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: `1px solid ${TOKENS.borderStrong}`, background: TOKENS.surface2, fontFamily: FONT.mono,
            fontSize: fs(13), fontWeight: 600, color: TOKENS.text,
          }}
        >
          {number}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: fs(16), fontWeight: 600, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {draft.name.trim() || t('previewUnnamed')}
          </div>
          <div data-studio-summary="" style={{ fontFamily: FONT.mono, fontSize: fs(12), color: TOKENS.textDim, marginTop: 2 }}>
            {loading ? t('previewLoading') : t('previewSummary', { n: preview.count, h: preview.totalHours, window: t(preview.windowLabel) })}
          </div>
        </div>
      </div>
      {validation.warnings.includes('few-titles') ? (
        <p data-studio-warning="" style={{ margin: '12px 0 0', fontSize: fs(12.5), color: TOKENS.warn, lineHeight: 1.4 }}>{t('warnFewTitles')}</p>
      ) : null}
      <p style={{ ...labelStyle, margin: '18px 0 8px' }}>{t('previewTonight')}</p>
      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 10, overflow: 'hidden', background: TOKENS.surface1 }}>
        {loading ? (
          <p style={{ margin: 0, padding: '14px 16px', fontSize: fs(13), color: TOKENS.textDim }}>{t('previewLoading')}</p>
        ) : preview.tonight.length === 0 ? (
          <p style={{ margin: 0, padding: '14px 16px', fontSize: fs(13), color: TOKENS.textDim }}>{t('previewEmpty')}</p>
        ) : (
          preview.tonight.map((row, i) => (
            <div
              key={`${row.start}-${i}`}
              data-studio-row=""
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
                borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.border}`,
                background: row.isNow ? 'rgba(255,139,90,0.08)' : 'transparent',
              }}
            >
              <span style={{ fontFamily: FONT.mono, fontSize: fs(12), color: TOKENS.textDim, flexShrink: 0 }}>{formatClock(row.start)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: fs(13.5), fontWeight: 600, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</div>
                <div style={{ fontSize: fs(11.5), color: TOKENS.textMute, marginTop: 2 }}>{row.meta}</div>
              </div>
              {row.isNow ? (
                <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: 999, background: TOKENS.orange, color: 'hsl(22 56% 7%)', fontSize: fs(10.5), fontWeight: 700, letterSpacing: '0.06em' }}>
                  {t('previewNow')}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: fs(11.5), lineHeight: 1.5, color: TOKENS.textMute }}>{t('previewNote')}</p>
    </aside>
  )

  const footer = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: isTv ? '1.5rem' : 24 }}>
      {editing ? (
        <FocusPill isTv={isTv} variant="danger" data="studio-delete" onClick={onDelete}>
          {t(confirmDelete ? 'studioDeleteConfirm' : 'studioDelete')}
        </FocusPill>
      ) : null}
      <div style={{ flex: 1 }} />
      <FocusPill isTv={isTv} variant="ghost" data="studio-cancel" onClick={cancel}>{t('studioCancel')}</FocusPill>
      <FocusPill isTv={isTv} variant="primary" data="studio-save" onClick={save}>{t(editing ? 'studioSave' : 'studioCreate')}</FocusPill>
    </div>
  )

  return (
    <div
      data-channels-studio=""
      style={{
        background: C.base, minHeight: '100%', color: TOKENS.text, fontFamily: FONT.ui,
        // Under appens menypill; högra hörnet lämnas åt appens klocka.
        padding: `${belowMenuPill(isTv, isMobile)} ${isMobile ? '16px 32px' : isTv ? '2.5rem 2.5rem' : '32px 40px'}`,
      }}
    >
      <p style={{ ...labelStyle, margin: 0 }}>{t('studioEyebrow')}</p>
      <h1 style={{ margin: '4px 0 0', fontSize: fs(24), fontWeight: 700, color: TOKENS.text }}>{t(editing ? 'studioEdit' : 'studioNew')}</h1>
      <div style={{ height: 1, background: TOKENS.border, margin: isTv ? '1.25rem 0' : '20px 0' }} />
      <div
        style={{
          display: 'grid', gap: isMobile ? 28 : 32, alignItems: 'start',
          gridTemplateColumns: isMobile || isTv ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 360px',
        }}
      >
        {form}
        {/* TV: knapparna före förhandsvisningen, så Spara inte ligger en lång rullning bort. */}
        {isTv ? footer : null}
        {previewPanel}
      </div>
      {isTv ? null : footer}
      {kbOpen && KeyboardPanel ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
          <KeyboardPanel
            title={t('fieldName')}
            initial={draft.name}
            placeholder={t('fieldNamePlaceholder')}
            maxLength={60}
            field="short"
            onDone={(value: string) => { setKbOpen(false); patch({ name: value }) }}
            onClose={() => setKbOpen(false)}
          />
        </div>
      ) : null}
    </div>
  )
}

/** Chip enligt handoffen: radie 8, 6×12, 13px/500; vald = accentton + accentkant. */
function Chip({ selected, count, isTv, onClick, children, ...rest }: {
  selected: boolean
  count?: number | string
  isTv: boolean
  onClick(): void
  children: ReactNode
  'data-source'?: string
}) {
  return (
    <button
      type="button"
      data-f=""
      data-chip=""
      aria-pressed={selected}
      onClick={onClick}
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, cursor: 'pointer',
        padding: isTv ? '0.375rem 0.75rem' : '6px 12px', fontSize: fontSize(13, isTv), fontWeight: 500, fontFamily: 'inherit',
        border: `1px solid ${selected ? TOKENS.accent : TOKENS.borderStrong}`,
        background: selected ? TOKENS.accentSoft : TOKENS.surface1,
        color: selected ? TOKENS.text : TOKENS.textDim,
      }}
    >
      {children}
      {count != null ? <span style={{ fontFamily: FONT.mono, fontSize: fontSize(11, isTv), color: TOKENS.textMute }}>{count}</span> : null}
    </button>
  )
}

/**
 * Knapp i PillBtn:s form (samma varianter och färger), men som egen <button>
 * med data-f: PillBtn tar inga data-attribut, och TV-stationen måste sitta på
 * själva knappen.
 */
function FocusPill({ isTv, variant, data, onClick, children }: {
  isTv: boolean
  variant: 'ghost' | 'primary' | 'danger'
  data: string
  onClick(): void
  children: ReactNode
}) {
  const look: Record<typeof variant, CSSProperties> = {
    ghost: { background: 'transparent', border: `1px solid ${TOKENS.borderStrong}`, color: TOKENS.text, fontWeight: 500 },
    primary: { background: TOKENS.orange, border: `1px solid ${TOKENS.orange}`, color: 'hsl(22 58% 6%)', fontWeight: 600 },
    danger: { background: 'transparent', border: '1px solid rgba(255,90,106,0.4)', color: TOKENS.red, fontWeight: 500 },
  }
  return (
    <button
      type="button"
      data-f=""
      {...{ [`data-${data}`]: '' }}
      onClick={onClick}
      style={{
        ...look[variant], padding: isTv ? '0.6875rem 1.125rem' : '11px 18px', borderRadius: 8, cursor: 'pointer',
        fontSize: fontSize(14, isTv), fontFamily: 'inherit', letterSpacing: 0.2, whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}
