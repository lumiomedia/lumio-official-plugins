'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  addChannelToLiveTvList,
  applyM3uUrls,
  channelKey,
  createLiveTvList,
  deleteLiveTvList,
  ensureM3uList,
  ensureXtreamList,
  fetchXtreamAccount,
  fetchXtreamCategories,
  getLiveTvLists,
  getLiveTvUrlsKey,
  getM3uUrls,
  deleteXtreamLoginAndData,
  getOrphanXtreamLogins,
  getXtreamLogins,
  importList,
  isLogoFallbackEnabled,
  normalizeXtreamBase,
  onXtreamLoginsChanged,
  parseXtreamSource,
  removeChannelFromLiveTvList,
  saveXtreamLogin,
  setLogoFallbackEnabled,
  updateLiveTvListEpg,
  xtreamPseudoUrl,
  type LiveTvList,
  type M3uChannel,
  type XtreamAccount,
  type XtreamCategory,
  type XtreamLogin,
} from '../live-tv-data'
import { completeLogos } from '../index-client'
import type { ImportStatus } from '../index-client'
import { recordListImportOutcome } from '../list-import-flags'
import { activeProfileHasPin, getLockedChannelKeys, onChannelLocksChanged, pinSupportAvailable, toggleChannelLock, verifyActiveProfilePin } from '../channel-locks'
import { PinGate } from '../live-tv-ui'
import { useEpgStatus } from '../hooks/useEpgStatus'
import { useVodCategories } from '../hooks/useVodLibrary'
import { getVodMode, setVodMode, type VodMode } from '../vod-data'
import type { VodLibraryRow } from '../vod-library-rows'
import { useVodLibrarySources } from '../hooks/useVodLibrarySources'
import type { TvNav, TvViewProps } from './tv-shell'
import { TvCategoryPicker, TvListPicker } from './tv-list-picker'
import { TvCurationPicker } from './tv-curation-picker'
import { useTextPrompt } from './tv-text-entry'
import { TV, Toggle, dp, station } from './tv-ui'
import type { useTvText } from './tv-strings'
import { MT, ellipsis, sectionLabel } from './mobile/mobile-tokens'
import { MIcons } from './mobile/mobile-icons'
import { MobileToggle } from './mobile/mobile-toggle'

/*
 * Inställningarnas flikinnehåll (Spellistor, EPG, Föräldrakontroll) och
 * radprimitiverna de bygger på. Flyttade hit från `tv-settings.tsx` (P12) så
 * att telefonens `mobile/settings-phone.tsx` kan återanvända dem utan att
 * importera `tv-settings.tsx` — som i sin tur importerar telefonvyn. En
 * cykel mellan de två hade gett TDZ-krasch vid appstart (projektregeln).
 */

type TT = ReturnType<typeof useTvText>['tt']

/**
 * En rad i inställningarna. Ingen `data-init` här: skalets vänsterflik bär
 * redan det enda `data-init` som får finnas i den här vyn (se TvSettingsView
 * nedan), annars hamnar TV-fokuset på två ställen samtidigt när en flik
 * råkar sakna innehåll (t.ex. Spellistor utan listor).
 */
export function Row({ label, right, onOk, testId, phone = false }: { label: ReactNode; right: ReactNode; onOk: () => void; testId?: string; phone?: boolean }) {
  // Telefonen (P12): raden ligger i ett kort — ingen egen grund eller radie,
  // en linje under, och `minHeight` (aldrig `height`) på en rad med text.
  if (phone) {
    return (
      <div data-testid={testId} {...station(onOk)} style={{ minHeight: 52, padding: '10px 14px', borderRadius: 0, background: 'transparent', borderBottom: `1px solid ${MT.line07}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 15, cursor: 'pointer' }}>
        <span style={ellipsis}>{label}</span>
        <span style={{ flexShrink: 0, color: MT.muted, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>{right}</span>
      </div>
    )
  }
  return (
    <div data-testid={testId} {...station(onOk)} style={{ height: dp(64), minHeight: dp(64), borderRadius: dp(12), background: TV.s06, padding: `0 ${dp(18)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(16), fontSize: dp(19), cursor: 'pointer' }}>
      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ flexShrink: 0, color: 'rgba(243,244,248,0.6)', display: 'inline-flex', alignItems: 'center', gap: dp(10) }}>{right}</span>
    </div>
  )
}

/** Telefonens `›` i navigeringsraderna (52 px rader i ett kort). */
export const PhoneCaret = () => <span style={{ color: MT.dim, display: 'inline-flex', flexShrink: 0 }}><MIcons.CaretRight size={16} /></span>

export function Heading({ children, hint, phone = false }: { children: ReactNode; hint?: string; phone?: boolean }) {
  // Telefonen: sektionsetikett (12/600, versaler) med kortets inre luft.
  if (phone) return <div style={{ padding: '14px 14px 6px' }}><div style={sectionLabel}>{children}</div>{hint ? <div style={{ fontSize: 13, color: MT.dim, marginTop: 4 }}>{hint}</div> : null}</div>
  return <div><div style={{ fontSize: dp(26), fontWeight: 600 }}>{children}</div>{hint ? <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{hint}</div> : null}</div>
}

/*
 * Textinmatningen bor sedan 0.6.0 i `tv/tv-text-entry.tsx` (`useTextPrompt`):
 * samma värdpanel som förut i TV-läge, ett riktigt <input> utanför. Alla
 * kommentarer om fällorna (id-nyckeln mot återanvänd useState, öppnaren
 * fångad en gång, data-live-tv-host-ui, onDone+onClose) följde med dit.
 */

/**
 * Ta bort en lista helt: raden, kanalerna i indexet (nästa hämtning skriver
 * inte tillbaka dem) OCH M3U-adressen den kom ifrån. Ett listnamn ÄR
 * värdnamnet ur käll-URL:en (`deriveListName` i `live-tv-data.ts`), så
 * matchningen går på värdnamn. Xtream-inloggningar (`xtream://`) har sin egen
 * borttagningsväg och matchas aldrig här.
 */
function hostOf(url: string): string {
  try { return new URL(url).hostname || url } catch { return url }
}

function removeListAndSourceUrl(list: LiveTvList): void {
  const urls = getM3uUrls()
  const remaining = urls.filter((url) => !url.startsWith('xtream://') && hostOf(url) !== list.name)
  if (remaining.length !== urls.length) applyM3uUrls(remaining)
  deleteLiveTvList(list.id)
}

function xtreamLoginMissing(list: LiveTvList): boolean {
  if (list.kind !== 'xtream') return false
  return !getXtreamLogins().some((login) => login.id === list.xtreamLoginId)
}

/** Jobbets tillstånd översatt till en rad text under listan som hämtas. */
type ImportProgress = { listId: string; state: ImportStatus['state']; received: number; total: number | null }

function progressText(tt: TT, locale: string, progress: ImportProgress): string {
  if (progress.state === 'parsing') return tt('importParsing')
  if (progress.state === 'writing') return tt('importWriting')
  return progress.total
    ? tt('importProgress', { received: progress.received.toLocaleString(locale), total: progress.total.toLocaleString(locale) })
    : tt('importProgressUnknown')
}

/**
 * `disabled` tar bort HANDLINGEN men inte stationen: fjärrkontrollen ska
 * fortfarande kunna gå förbi knappen medan den arbetar (en `display: none`
 * hade flyttat fokus till body mitt i en hämtning).
 */
export function Action({ label, onOk, testId, disabled, phone = false }: { label: string; onOk: () => void; testId?: string; disabled?: boolean; phone?: boolean }) {
  return (
    <div
      data-testid={testId}
      aria-disabled={disabled ? 'true' : undefined}
      {...station(() => { if (!disabled) onOk() })}
      style={phone
        // Telefonen: 36 px pill i knappraden under texten (raden runt är ≥ 44).
        ? { minHeight: 36, padding: '0 12px', borderRadius: 999, background: MT.s12, display: 'inline-flex', alignItems: 'center', fontSize: 14, whiteSpace: 'nowrap', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }
        : { height: dp(48), minHeight: dp(48), padding: `0 ${dp(20)}px`, borderRadius: 999, background: TV.s12, display: 'inline-flex', alignItems: 'center', fontSize: dp(17), whiteSpace: 'nowrap', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      {label}
    </div>
  )
}

/**
 * Kvittots tidsstämpel. Bara klockslaget räcker för dagens hämtning, men
 * "09:41" säger ingenting om en lista som hämtades i förrgår — då kommer
 * datumet med. Samma regel som skrivbordets `formatFetchedAt`.
 */
function formatFetchedAt(iso: string, locale: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return iso
  const now = new Date()
  return then.toDateString() === now.toDateString()
    ? then.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : then.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * En listrad. `memo` är inte pynt: framstegsräknaren tickar ~2 ggr/s under en
 * import, och utan den här spärren ritades ALLA rader om varje gång — på en
 * TV-box med tjugo spellistor räckte det för att rycka i fjärrnavigeringen.
 * Raden som faktiskt hämtar får en ny `busy` och ritas om; övriga får samma
 * `null` och hoppas över.
 */
export const ListRow = memo(function ListRow({
  list,
  tt,
  locale,
  busy,
  needsLogin,
  onRefetch,
  onRemove,
  onEditChannels,
  onCategories,
  phone = false,
}: {
  list: LiveTvList
  tt: TT
  locale: string
  busy: ImportProgress | null
  needsLogin: boolean
  onRefetch: (list: LiveTvList) => void
  onRemove: (list: LiveTvList) => void
  onEditChannels: (list: LiveTvList) => void
  onCategories: (list: LiveTvList) => void
  /** Telefonen (P12): namn + tagg, meta under, knapparna i en EGEN rad under texten. */
  phone?: boolean
}) {
  const importable = list.kind === 'm3u' || list.kind === 'xtream'
  const logoEnabled = isLogoFallbackEnabled(list)
  // Kvittot/felet lever i raden själv, inte i föräldern: samma mönster som
  // `logoComplete` i skrivbordets `live-tv-settings-section.tsx`, men
  // nyckling per lista behövs inte här — varje `ListRow` ÄR redan en lista.
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoResult, setLogoResult] = useState<{ matched: number; total: number } | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)

  /**
   * `completeLogos` sänder `emitIndexChanged()` själv (se `index-client.ts`)
   * — ropas INTE här igen, det hade blivit en dubbelsändning.
   */
  async function handleCompleteLogos(): Promise<void> {
    setLogoBusy(true)
    setLogoError(null)
    try {
      const result = await completeLogos(list.source ?? '')
      setLogoResult(result)
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : String(err))
    } finally {
      setLogoBusy(false)
    }
  }

  // Telefonens mått (handoffen §9) mot TV-scenens: samma träd, bara talen
  // och — på telefon — knappraden som egen flexrad under texten.
  const sub = phone ? 13 : dp(15)
  const meta = phone ? 13 : dp(16)
  return (
    <div
      data-testid={`list-row-${list.id}`}
      style={phone
        ? { padding: '10px 14px', borderBottom: `1px solid ${MT.line07}`, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15 }
        : { minHeight: dp(64), borderRadius: dp(12), background: TV.s06, padding: `${dp(12)}px ${dp(18)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(16), fontSize: dp(19) }}
    >
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: phone ? 4 : dp(4) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: phone ? 8 : dp(10), minWidth: 0 }}>
          <strong style={phone ? { fontSize: 15, fontWeight: 600, ...ellipsis } : { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</strong>
          {list.needsReimport ? (
            <span style={phone
              ? { flexShrink: 0, fontSize: 11, fontWeight: 600, minHeight: 22, padding: '0 8px', borderRadius: 999, background: MT.warnSoft, color: MT.warnText, display: 'inline-flex', alignItems: 'center' }
              : { flexShrink: 0, fontSize: dp(14), fontWeight: 600, padding: `${dp(3)}px ${dp(10)}px`, borderRadius: dp(8), background: 'rgba(244,132,95,0.18)', color: '#f4845f' }}>{tt('needsReimport')}</span>
          ) : null}
        </div>
        <div style={{ fontSize: meta, color: phone ? MT.dim : TV.dim }}>
          {tt('channelsCount', { count: (list.channelCount ?? list.channels?.length ?? 0).toLocaleString(locale) })}
          {list.fetchedAt ? ` · ${tt('fetchedAt', { time: formatFetchedAt(list.fetchedAt, locale) })}` : ''}
        </div>
        {busy ? <div style={{ fontSize: meta, color: TV.muted }}>{progressText(tt, locale, busy)}</div> : null}
        {!busy && needsLogin ? <div style={{ fontSize: sub, color: TV.muted }}>{tt('xtreamNeedsLogin')}</div> : null}
        {list.truncated ? (
          <div data-testid={`list-truncated-${list.id}`} style={{ fontSize: sub, color: '#fbbf24' }}>{tt('truncated')}</div>
        ) : null}
        {!busy && list.lastImportError ? (
          <div data-testid={`list-error-${list.id}`} style={{ fontSize: sub, color: '#fca5a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.lastImportError}</div>
        ) : null}
        {logoResult ? (
          <div data-testid={`list-logo-complete-result-${list.id}`} style={{ fontSize: sub, color: TV.dim }}>
            {tt('logoCompleteResult', { matched: logoResult.matched, total: logoResult.total })}
          </div>
        ) : null}
        {logoError ? (
          <div data-testid={`list-logo-complete-error-${list.id}`} style={{ fontSize: sub, color: '#fca5a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logoError}</div>
        ) : null}
      </div>
      {/* Ordning: Hämta om, Logotyper, Komplettera, Ta bort — "Ta bort" sist
          så fjärrkontrollen inte råkar landa på den. På telefon är det här en
          egen rad UNDER texten (`data-list-actions`), aldrig bredvid namnet. */}
      <div
        {...(phone ? { 'data-list-actions': '' } : {})}
        style={phone ? { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 } : { flexShrink: 0, display: 'flex', alignItems: 'center', gap: dp(10) }}
      >
        {importable ? <Action phone={phone} testId={`list-refetch-${list.id}`} label={busy ? tt('refetching') : tt('refetch')} onOk={() => onRefetch(list)} /> : null}
        {importable ? <Action phone={phone} testId={`list-categories-${list.id}`} label={tt('categories')} onOk={() => onCategories(list)} /> : null}
        {/* Egna listor har inget att hämta — de fylls med kanalväljaren. */}
        {list.kind === 'custom' ? <Action phone={phone} testId={`list-channels-${list.id}`} label={tt('listChannels')} onOk={() => onEditChannels(list)} /> : null}
        {/* Inställning, inte handling: egen bakgrundston — samma TV.s06 som
            radens egen grund, inte TV.s12 som knapparna nedan — och en
            riktig växel i stället för en på/av-etikett i en annars identisk
            pill. Utan skillnaden såg switchen ut som ännu en Komplettera-
            knapp (Jerrys ord efter test: "bara en checkbox ... klämd
            bredvid"). Egna listors kanaler renderas via tvillingar som bär
            URSPRUNGSLISTANS switch-tillstånd — den egna listans switch
            filtrerar ingenting, så den spärras av samma skäl som
            Komplettera nedan. */}
        <div
          data-testid={`list-logo-fallback-${list.id}`}
          aria-disabled={list.kind === 'custom' ? 'true' : undefined}
          {...station(() => { if (list.kind !== 'custom') setLogoFallbackEnabled(list.id, !logoEnabled) })}
          style={phone
            ? {
              minHeight: 36,
              padding: '0 12px',
              borderRadius: 999,
              background: MT.s06,
              border: `1px solid ${MT.line10}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              whiteSpace: 'nowrap',
              cursor: list.kind === 'custom' ? 'default' : 'pointer',
              opacity: list.kind === 'custom' ? 0.5 : 1,
            }
            : {
              height: dp(48),
              minHeight: dp(48),
              padding: `0 ${dp(16)}px`,
              borderRadius: 999,
              background: TV.s06,
              border: `1px solid ${TV.line}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: dp(10),
              fontSize: dp(15),
              whiteSpace: 'nowrap',
              cursor: list.kind === 'custom' ? 'default' : 'pointer',
              opacity: list.kind === 'custom' ? 0.5 : 1,
            }}
        >
          <span>{tt('logoFallback')}</span>
          {phone ? <MobileToggle on={logoEnabled} /> : <Toggle on={logoEnabled} />}
        </div>
        <Action
          phone={phone}
          testId={`list-logo-complete-${list.id}`}
          label={logoBusy ? tt('logoCompleteRunning') : tt('logoComplete')}
          disabled={!logoEnabled || list.kind === 'custom' || logoBusy}
          onOk={() => { void handleCompleteLogos() }}
        />
        <Action phone={phone} testId={`list-remove-${list.id}`} label={tt('remove')} onOk={() => onRemove(list)} />
      </div>
    </div>
  )
})

/**
 * Spellistor: hämtning går genom VÄRDENS importjobb (`importList`), inte
 * genom webviewn.
 *
 * Tidigare hämtade och parsade den här vyn M3U:n själv och skrev kanalerna
 * inbäddade i pluginlagringen (`upsertLiveTvListFromFetch`) — samma väg som
 * hade ett tak på 2 000 kanaler och som lagring v2 tog bort. Nu skapas bara
 * listposten här (`ensureM3uList`/`ensureXtreamList`), jobbet gör hämtningen
 * i Rust och raden visar dess `received`/`total` medan det pågår.
 */
export function PlaylistsTab({ model, nav, lists, tt, locale, toast, phone = false }: { model: TvViewProps['model']; nav: TvNav; lists: LiveTvList[]; tt: TT; locale: string; toast: (text: string) => void; phone?: boolean }) {
  // Dialogen utanför TV-läget registreras som lager, så skalets Bakåt (Esc
  // eller Bakåt-posten i ikonraden) stänger den före inställningsvyn.
  const keyboard = useTextPrompt({ pushLayer: nav.pushLayer })
  const [progress, setProgress] = useState<ImportProgress | null>(null)

  /**
   * `existedBefore`: en NY lista vars allra första import misslyckas ska inte
   * lämnas kvar som en tom, permanent post (spec §5) — men en lista som redan
   * fanns behåller sitt gamla innehåll när en omhämtning faller.
   */
  async function runImport(list: LiveTvList, existedBefore: boolean): Promise<boolean> {
    setProgress({ listId: list.id, state: 'fetching', received: 0, total: null })
    try {
      const status = await importList(list, (s) => setProgress({ listId: list.id, state: s.state, received: s.received, total: s.total ?? null }))
      if (status.state === 'error') {
        if (existedBefore) recordListImportOutcome(list.id, status.error ?? 'import failed')
        else deleteLiveTvList(list.id)
        toast(`${tt('importFailed')}: ${status.error ?? ''}`.trim())
        return false
      }
      recordListImportOutcome(list.id)
      const fresh = getLiveTvLists().find((entry) => entry.id === list.id)
      // Bara en NY lista (första importen): en omhämtning av en lista som fanns
      // före funktionen ska inte kapa fokus med en panel man inte bett om.
      if (!existedBefore && fresh && fresh.curationSeen !== true) setCuration({ listId: list.id, mode: 'after-import' })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (existedBefore) recordListImportOutcome(list.id, message)
      else deleteLiveTvList(list.id)
      toast(`${tt('importFailed')}: ${message}`)
      return false
    } finally {
      setProgress(null)
    }
  }

  const addUrl = () => keyboard.ask(tt('addM3u'), '', (value) => {
    const url = value.trim()
    if (!url) return
    const source = getLiveTvUrlsKey([url])
    const existedBefore = getLiveTvLists().some((entry) => entry.source === source)
    const list = ensureM3uList(url)
    void runImport(list, existedBefore).then((ok) => {
      // Adressen skrivs bara in bland de aktiva när hämtningen gick igenom —
      // annars stod en URL kvar som aldrig gav några kanaler.
      if (ok && !getM3uUrls().includes(url)) applyM3uUrls([...getM3uUrls(), url])
    })
  }, 'url')

  /** Server → användarnamn → lösenord, ett tangentbord i taget. */
  const askXtream = (prefillServer: string, reuseLoginId: string | null) => keyboard.ask(tt('xtreamServer'), prefillServer, (serverValue) => {
    const server = serverValue.trim()
    if (!server) return
    keyboard.ask(tt('xtreamUsername'), '', (usernameValue) => {
      const username = usernameValue.trim()
      if (!username) return
      keyboard.ask(tt('xtreamPassword'), '', (passwordValue) => {
        const password = passwordValue.trim()
        if (!password) return
        void connectXtream(server, username, password, reuseLoginId)
      }, 'password')
    }, 'username')
  }, 'url')

  async function connectXtream(server: string, username: string, password: string, reuseLoginId: string | null): Promise<void> {
    const base = normalizeXtreamBase(server)
    if (!base) { toast(tt('xtreamLoginFailed')); return }
    let account: Awaited<ReturnType<typeof fetchXtreamAccount>>
    try {
      // Inloggning = verifiering: alltid mot panelen, aldrig ur kontocachen.
      account = await fetchXtreamAccount({ base, username, password }, { force: true })
    } catch {
      toast(tt('xtreamLoginFailed'))
      return
    }
    if (!account.auth) { toast(tt('xtreamLoginFailed')); return }
    const existing = getXtreamLogins().find((entry) => entry.base === base && entry.username === username)
    const login: XtreamLogin = {
      id: existing?.id ?? reuseLoginId ?? crypto.randomUUID(),
      base,
      username,
      password,
      format: account.allowedFormats.length === 0 || account.allowedFormats.includes('ts') ? 'ts' : 'm3u8',
      categoryIds: existing?.categoryIds ?? [],
    }
    saveXtreamLogin(login)
    const source = xtreamPseudoUrl(login)
    const existedBefore = getLiveTvLists().some((entry) => entry.source === source)
    await runImport(ensureXtreamList(login), existedBefore)
  }

  /**
   * ORDNINGEN FRYSES VID MONTERINGEN.
   *
   * Listor som behöver hämtas om ska ligga överst — men om sorteringen
   * räknades om vid varje rendering bytte raden plats i samma ögonblick som
   * `needsReimport` rensades av en lyckad hämtning. React flyttar då nodens
   * plats i DOM, och den fokuserade knappen i raden tappar fokus till `body`:
   * fjärrkontrollen strandar mitt i det som just lyckades. Rangordningen
   * bestäms därför en gång; listor som tillkommer senare läggs sist, aldrig
   * invävda bland de befintliga.
   */
  const orderRef = useRef<string[]>([])
  const ordered = useMemo(() => {
    if (orderRef.current.length === 0) {
      orderRef.current = [...lists]
        .sort((a, b) => Number(Boolean(b.needsReimport)) - Number(Boolean(a.needsReimport)))
        .map((list) => list.id)
    } else {
      for (const list of lists) if (!orderRef.current.includes(list.id)) orderRef.current.push(list.id)
    }
    const rank = new Map(orderRef.current.map((id, index) => [id, index]))
    return [...lists].sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER))
  }, [lists])

  /**
   * Stabila handtag till raderna: `memo` på ListRow biter bara om props inte
   * byter identitet per rendering. Samma ref-mönster som skalets zap-buffert
   * (`tv-shell.tsx`) — det som ändrar sig (tangentbordet, pågående jobb)
   * skrivs till en ref i en effekt, och raderna får två oföränderliga
   * återanrop.
   */
  const refetchRef = useRef<(list: LiveTvList) => void>(() => {})
  useEffect(() => {
    refetchRef.current = (list: LiveTvList) => {
      // Avstå vid VARJE pågående hämtning, inte bara den här listans: två
      // samtidiga importjobb slogs om värdens skrivlås, och förloppsraden kan
      // bara visa ett.
      if (progress || refetchingAll) return
      if (xtreamLoginMissing(list)) {
        const parsed = parseXtreamSource(list.source)
        askXtream(parsed ? `http://${parsed.host}` : '', parsed?.loginId ?? null)
        return
      }
      void runImport(list, true)
    }
  })
  const onRefetch = useCallback((list: LiveTvList) => refetchRef.current(list), [])
  const onRemove = useCallback((list: LiveTvList) => removeListAndSourceUrl(list), [])
  /** Kategoripanelen (spec 2026-09-24): från radens knapp, eller automatiskt en gång efter första importen. */
  const [curation, setCuration] = useState<{ listId: string; mode: 'settings' | 'after-import' } | null>(null)
  const onCategories = useCallback((list: LiveTvList) => setCuration({ listId: list.id, mode: 'settings' }), [])

  /**
   * EGNA LISTOR: kanalerna bockas i en flervalsväljare, och medlemskapet hålls
   * i ett eget set i stället för att läsas ur `lists` vid varje rendering.
   * Listpropsen kommer via modellen, som läser om asynkront efter en
   * lagringsändring — bocken hade då blinkat till en halv sekund efter trycket.
   */
  const [pickerListId, setPickerListId] = useState<string | null>(null)
  const [members, setMembers] = useState<ReadonlySet<string>>(() => new Set())
  const pickerList = pickerListId ? (getLiveTvLists().find((entry) => entry.id === pickerListId) ?? null) : null
  const openPicker = useCallback((list: LiveTvList) => {
    setMembers(new Set((getLiveTvLists().find((entry) => entry.id === list.id)?.channels ?? []).map(channelKey)))
    setPickerListId(list.id)
  }, [])
  const toggleMember = (channel: M3uChannel) => {
    if (!pickerListId) return
    const key = channelKey(channel)
    if (members.has(key)) {
      removeChannelFromLiveTvList(pickerListId, channel)
      setMembers((current) => { const next = new Set(current); next.delete(key); return next })
      return
    }
    const outcome = addChannelToLiveTvList(pickerListId, channel)
    // 500-taket sitter i lagringen: utan kvitto hade trycket sett ut att göra
    // ingenting alls.
    if (outcome === 'full') { toast(tt('listFull')); return }
    // `duplicate` = kanalen ligger redan i listan (samma nyckel via en annan
    // källa). Bocken ska då visas, precis som för `added` — inte utebli och
    // få trycket att se verkningslöst ut.
    if (outcome === 'added' || outcome === 'duplicate') setMembers((current) => new Set(current).add(key))
  }
  const createList = () => keyboard.ask(tt('listName'), '', (value) => {
    const name = value.trim()
    if (!name) return
    openPicker(createLiveTvList(name))
  })

  /**
   * UPPDATERA ALLA: samma anrop som knappen per lista, en lista i taget.
   * Sekventiellt med flit — parallella importjobb i värden slogs om samma
   * skrivlås, och förloppsraden kan bara visa ett jobb.
   */
  const [refetchingAll, setRefetchingAll] = useState(false)
  const importable = lists.filter((list) => Boolean(list.source) && (list.kind === 'm3u' || list.kind === 'xtream') && !xtreamLoginMissing(list))
  async function refetchAll(): Promise<void> {
    // Samma vakt som per lista: en pågående hämtning (från en rad eller en
    // tidigare "alla") ska inte kunna dubbleras av ett andra tryck.
    if (progress || refetchingAll) return
    setRefetchingAll(true)
    try {
      for (const list of importable) await runImport(list, true)
    } finally {
      setRefetchingAll(false)
    }
  }

  // Telefonen: sektionsetiketten "Spellistor" ritas av `settings-phone.tsx`
  // utanför kortet, så rubrikraden här bär bara Uppdatera alla (när den finns).
  const plus = phone ? <PhoneCaret /> : '+'
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: phone ? 0 : dp(10) }}>
      {phone ? (
        importable.length > 0 ? (
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${MT.line07}`, display: 'flex', justifyContent: 'flex-end' }}>
            <Action phone testId="lists-refetch-all" label={refetchingAll ? tt('refetching') : tt('refetchAll')} disabled={refetchingAll || progress !== null} onOk={() => { void refetchAll() }} />
          </div>
        ) : null
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: dp(16) }}>
          <Heading>{tt('tabPlaylists')}</Heading>
          {importable.length > 0 ? <Action testId="lists-refetch-all" label={refetchingAll ? tt('refetching') : tt('refetchAll')} disabled={refetchingAll || progress !== null} onOk={() => { void refetchAll() }} /> : null}
        </div>
      )}
      {ordered.map((list) => (
        <ListRow
          key={list.id}
          list={list}
          tt={tt}
          locale={locale}
          busy={progress?.listId === list.id ? progress : null}
          needsLogin={xtreamLoginMissing(list)}
          onRefetch={onRefetch}
          onRemove={onRemove}
          onEditChannels={openPicker}
          onCategories={onCategories}
          phone={phone}
        />
      ))}
      {keyboard.available ? <Row phone={phone} label={tt('addM3u')} right={plus} onOk={addUrl} /> : null}
      {keyboard.available ? <Row phone={phone} label={tt('addXtream')} right={plus} onOk={() => askXtream('', null)} /> : null}
      {keyboard.available ? <Row phone={phone} testId="create-list" label={tt('createList')} right={plus} onOk={createList} /> : null}
      <XtreamAccounts nav={nav} tt={tt} locale={locale} phone={phone} onReimport={(list) => { void runImport(list, true) }} />
      {pickerList ? (
        <TvListPicker
          model={model}
          nav={nav}
          title={tt('pickChannels', { list: pickerList.name })}
          selected={members}
          onToggle={toggleMember}
          onClose={() => setPickerListId(null)}
        />
      ) : null}
      {curation ? (() => {
        const target = lists.find((entry) => entry.id === curation.listId)
        return target ? <TvCurationPicker nav={nav} list={target} mode={curation.mode} keyboard={keyboard} onClose={() => setCuration(null)} /> : null
      })() : null}
      {keyboard.node}
    </section>
  )
}

/** Utgångsdatumet ur Xtream-panelen (unix-sekunder). */
function formatExpiry(expDate: number | null, locale: string): string | null {
  if (!expDate) return null
  const when = new Date(expDate * 1000)
  if (Number.isNaN(when.getTime())) return null
  return when.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * KONTOKORTET + KATEGORIVALET — skrivbordets `xtream-login-section.tsx` i
 * TV-form. Kontot hämtas ur panelen (`fetchXtreamAccount`), kategorierna ur
 * `fetchXtreamCategories`, och valet skrivs till `login.categoryIds` — exakt
 * samma fält som importjobbet läser.
 */
function XtreamAccounts({ nav, tt, locale, onReimport, phone = false }: { nav: TvNav; tt: TT; locale: string; onReimport: (list: LiveTvList) => void; phone?: boolean }) {
  const [logins, setLogins] = useState<XtreamLogin[]>(getXtreamLogins)
  useEffect(() => onXtreamLoginsChanged(() => setLogins(getXtreamLogins())), [])
  const [pickerLoginId, setPickerLoginId] = useState<string | null>(null)
  const [categories, setCategories] = useState<XtreamCategory[] | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [dirty, setDirty] = useState(false)
  const pickerLogin = pickerLoginId ? (logins.find((entry) => entry.id === pickerLoginId) ?? null) : null

  function openCategories(login: XtreamLogin): void {
    setCategories(null)
    setSelected(new Set(login.categoryIds))
    setDirty(false)
    setPickerLoginId(login.id)
    void fetchXtreamCategories(login).then((list) => setCategories(list)).catch(() => setCategories([]))
  }

  function writeCategories(login: XtreamLogin, ids: string[]): void {
    saveXtreamLogin({ ...login, categoryIds: ids })
    setSelected(new Set(ids))
    setDirty(true)
  }

  /**
   * Urvalet ändrar VAD som importeras, så listan hämtas om när panelen stängs.
   * `xtreamPseudoUrl` beror bara på bas och login-id — kategorierna ingår inte,
   * så listan slås upp på login-id med pseudo-URL:en som reserv.
   */
  const listForLogin = (login: XtreamLogin): LiveTvList | null =>
    getLiveTvLists().find((entry) => entry.xtreamLoginId === login.id || entry.source === xtreamPseudoUrl(login)) ?? null

  function closeCategories(): void {
    const login = pickerLogin
    setPickerLoginId(null)
    setDirty(false)
    if (!login || !dirty) return
    const list = listForLogin(login)
    if (list) onReimport(list)
  }

  /**
   * Samma omhämtning när panelen försvinner UTAN att stängas — man byter flik
   * eller lämnar Live TV med Bakåt. Utan den här hade `categoryIds` legat
   * sparade medan indexet fortfarande innehöll de gamla kategorierna, och
   * ingenting i gränssnittet hade sagt att listan var osynkad. Importen körs
   * i värden (inte via vyns förloppsrad, som är borta) och ett fel märker
   * listan för omhämtning.
   */
  const pendingRef = useRef<{ login: XtreamLogin; dirty: boolean }>({ login: logins[0] ?? ({} as XtreamLogin), dirty: false })
  useEffect(() => { if (pickerLogin) pendingRef.current = { login: pickerLogin, dirty } })
  useEffect(() => () => {
    const pending = pendingRef.current
    if (!pending.dirty || !pending.login?.id) return
    const list = getLiveTvLists().find((entry) => entry.xtreamLoginId === pending.login.id)
    if (!list) return
    void importList(list).catch((err) => recordListImportOutcome(list.id, err instanceof Error ? err.message : String(err)))
  }, [])

  /**
   * Raderingen tar kontot OCH allt som hänger på det — spellistan, kanalerna i
   * indexet, biblioteket. Ett konto utan spellista gick tidigare inte att bli
   * av med härifrån alls, och det är just de som ligger kvar längst.
   */
  const orphanIds = new Set(getOrphanXtreamLogins().map((entry) => entry.id))
  function removeLogin(login: XtreamLogin): void {
    deleteXtreamLoginAndData(login.id)
    setLogins(getXtreamLogins())
  }

  if (logins.length === 0) return null
  return (
    <>
      <Heading phone={phone} hint={orphanIds.size > 0 ? tt('orphanLoginsHint') : undefined}>{tt('xtreamAccount')}</Heading>
      {logins.map((login) => (
        <XtreamAccountCard key={login.id} login={login} tt={tt} locale={locale} phone={phone} orphan={orphanIds.has(login.id)} onCategories={() => openCategories(login)} onRemove={() => removeLogin(login)} />
      ))}
      {pickerLogin ? (
        <TvCategoryPicker
          nav={nav}
          title={tt('xtreamCategoriesTitle')}
          categories={categories}
          selected={selected}
          onToggle={(category) => {
            const next = new Set(selected)
            if (next.has(category.id)) next.delete(category.id)
            else next.add(category.id)
            writeCategories(pickerLogin, [...next])
          }}
          onSelectAll={() => writeCategories(pickerLogin, [])}
          onClose={closeCategories}
        />
      ) : null}
    </>
  )
}

function XtreamAccountCard({ login, tt, locale, onCategories, onRemove, orphan = false, phone = false }: { login: XtreamLogin; tt: TT; locale: string; onCategories: () => void; onRemove: () => void; orphan?: boolean; phone?: boolean }) {
  const [account, setAccount] = useState<XtreamAccount | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    setFailed(false)
    void fetchXtreamAccount(login)
      .then((next) => { if (!cancelled) setAccount(next) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [login.base, login.username, login.password])
  let host = login.base
  try { host = new URL(login.base).host } catch { /* behåll basen */ }
  const expiry = account ? formatExpiry(account.expDate, locale) : null
  const meta = failed
    ? tt('xtreamAccountUnavailable')
    : account
      ? [account.status, expiry ? tt('xtreamExpires', { date: expiry }) : tt('xtreamNoExpiry'), account.maxConnections ? tt('xtreamMaxConnections', { count: account.maxConnections }) : null]
        .filter((part): part is string => Boolean(part)).join(' · ')
      : tt('refetching')
  return (
    <div
      data-testid={`xtream-account-${login.id}`}
      style={phone
        // Samma regel som ListRow på telefon: text först, knappen i egen rad under.
        ? { padding: '10px 14px', borderBottom: `1px solid ${MT.line07}`, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15 }
        : { minHeight: dp(64), borderRadius: dp(12), background: TV.s06, padding: `${dp(12)}px ${dp(18)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(16), fontSize: dp(19) }}
    >
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: phone ? 4 : dp(4) }}>
        <strong style={phone ? { fontSize: 15, fontWeight: 600, ...ellipsis } : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{host}</strong>
        <span style={{ fontSize: phone ? 13 : dp(16), color: failed ? '#fca5a5' : phone ? MT.dim : TV.dim }}>
          {orphan ? `${tt('orphanLogins')} · ${meta}` : meta}
        </span>
      </div>
      {phone ? (
        <div data-list-actions="" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <Action
            phone
            testId={`xtream-categories-${login.id}`}
            label={`${tt('xtreamCategories')}${login.categoryIds.length > 0 ? ` (${login.categoryIds.length})` : ''}`}
            onOk={onCategories}
          />
          <Action phone testId={`xtream-remove-${login.id}`} label={tt('orphanRemove')} onOk={onRemove} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), flexShrink: 0 }}>
          <Action
            testId={`xtream-categories-${login.id}`}
            label={`${tt('xtreamCategories')}${login.categoryIds.length > 0 ? ` (${login.categoryIds.length})` : ''}`}
            onOk={onCategories}
          />
          <Action testId={`xtream-remove-${login.id}`} label={tt('orphanRemove')} onOk={onRemove} />
        </div>
      )}
    </div>
  )
}

/**
 * EPG-fliken: adresserna OCH diagnostiken.
 *
 * Liggarens beslut att TV:s EPG-flik avsiktligt SKA SAKNA diagnostik är
 * UPPHÄVT (Jerry, 2026-09-14, spec 4.4 punkt 2): samma siffror ska finnas på
 * båda ytorna. Rätta alltså inte tillbaka till "TV visar bara adresserna".
 * Datat kommer ur den delade hooken (`hooks/useEpgStatus.ts`), som
 * skrivbordets `EpgStatusCard` läser likadant — två ytor kan inte visa olika
 * siffror för samma globala butik.
 */
/**
 * "Innehåll från spellistan" — vad VOD får göra i Live TV.
 *
 * Valet är per spellista: ett konto kan vara en ren kanalpanel och nästa mest
 * film, och ett delat läge hade tvingat samma svar på båda. Antalet läses ur
 * bibliotekets index, inte ur en gissning.
 *
 * Bor här och inte i tv-settings.tsx av samma skäl som de andra flikarna:
 * telefonvyn återanvänder dem, och den får inte importera skrivbordsvyn.
 */
export function ContentTab({ model, tt, phone = false }: { model: TvViewProps['model']; tt: TT; phone?: boolean }) {
  const source = model.activeSource
  const playlistId = model.activePlaylistId
  const cats = useVodCategories(source)
  const [mode, setModeState] = useState<VodMode>(() => getVodMode(playlistId))
  useEffect(() => setModeState(getVodMode(playlistId)), [playlistId])

  // Ingen grind på `playlistId`: den är null utanför TV-läget, och valet ska
  // gå att göra där också — `setVodMode` sparar det då för alla spellistor.
  const choose = (next: VodMode) => {
    setVodMode(playlistId, next)
    setModeState(next)
  }

  const options: { key: VodMode; title: string; body: string }[] = [
    { key: 'link', title: tt('vodModeLinkTitle'), body: tt('vodModeLinkBody') },
    { key: 'rows', title: tt('vodModeRowsTitle'), body: tt('vodModeRowsBody') },
    { key: 'off', title: tt('vodModeOffTitle'), body: tt('vodModeOffBody') },
  ]

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: phone ? 12 : dp(14) }} data-testid="settings-content">
      <Heading phone={phone} hint={cats.total > 0 ? tt('vodHint', { count: cats.total }) : tt('vodHintEmpty')}>
        {tt('vodHeading')}
      </Heading>
      <div style={{ display: 'flex', gap: phone ? 10 : dp(16), flexWrap: 'wrap' }}>
        {options.map((option) => {
          const active = option.key === mode
          return (
            <div
              key={option.key}
              data-testid={`vod-mode-${option.key}`}
              data-active={active ? '' : undefined}
              {...station(() => choose(option.key))}
              style={phone
                ? { width: '100%', padding: '12px 14px', borderRadius: 12, background: MT.s07, border: `1px solid ${active ? TV.acc : MT.line10}`, cursor: 'pointer' }
                : { width: dp(340), padding: `${dp(16)}px ${dp(18)}px`, borderRadius: dp(14), background: TV.s07, border: `1px solid ${active ? TV.acc : TV.lineCard}`, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ fontSize: phone ? 15 : dp(19), fontWeight: 600 }}>{option.title}</div>
              <div style={{ fontSize: phone ? 13 : dp(16), color: phone ? MT.dim : 'rgba(243,244,248,0.6)', marginTop: 4 }}>{option.body}</div>
            </div>
          )
        })}
      </div>
      <VodLibrarySection tt={tt} phone={phone} />
    </section>
  )
}

/**
 * "Använd som bibliotek" — fas A3.
 *
 * Bygger ett biblioteksindex av spellistans VOD. Knappen gör INTE biblioteket
 * till startsida: det valet bor i KÄRNANS inställningar (Jerry 2026-09-03,
 * "startsidevalet hör hemma i appen, inte i pluginet"). Pluginet bygger
 * indexet och pekar vidare; gränsen står kvar.
 *
 * Raderna kommer ur `vodLibraryRows`, inte ur `model.activeSource`: den senare
 * är null utanför TV-läget, och en källa ska gå att bygga från vilken yta som
 * helst.
 */
function VodLibrarySection({ tt, phone }: { tt: TT; phone: boolean }) {
  const { rows, progress, error, build, disabled } = useVodLibrarySources()
  if (rows.length === 0) return null

  const statusText = (row: VodLibraryRow) => {
    if (progress?.libraryId === row.libraryId) return tt('vodLibraryBuilding', { count: progress.done.toLocaleString() })
    if (row.importing) return tt('vodLibraryImporting')
    if (row.indexedTitles === null) return tt('vodLibraryNotBuilt', { count: row.vodTitles.toLocaleString() })
    return tt('vodLibraryBuilt', { count: row.indexedTitles.toLocaleString() })
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: phone ? 8 : dp(10) }} data-testid="vod-library">
      <Heading phone={phone} hint={tt('vodLibraryHint')}>{tt('vodLibraryHeading')}</Heading>
      {rows.map((row) => (
        <div
          key={row.libraryId}
          data-testid={`vod-library-${row.vodSource}`}
          style={phone
            ? { padding: '12px 14px', borderBottom: `1px solid ${MT.line07}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }
            : { minHeight: dp(64), borderRadius: dp(12), background: TV.s06, padding: `${dp(12)}px ${dp(18)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(16) }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: phone ? 15 : dp(19), ...ellipsis }}>{row.label}</div>
            <div style={{ fontSize: phone ? 13 : dp(16), color: phone ? MT.dim : TV.dim }}>{statusText(row)}</div>
          </div>
          <Action
            phone={phone}
            testId={`vod-library-build-${row.vodSource}`}
            label={row.indexedTitles === null ? tt('vodLibraryBuild') : tt('vodLibraryRebuild')}
            disabled={disabled(row)}
            onOk={() => { void build(row) }}
          />
        </div>
      ))}
      {/* 5 px under texten på telefon: raden är sektionens sista, och utan den
          låg den kant i kant med kortets underkant (Jerry 2026-09-22). */}
      <div style={{ fontSize: phone ? 13 : dp(16), color: phone ? MT.dim : TV.dim, padding: phone ? '0 14px 5px' : undefined }}>
        {error ? tt('vodLibraryFailed', { error }) : tt('vodLibraryWhereToEnable')}
      </div>
    </section>
  )
}

export function EpgTab({ lists, nav, tt, locale, phone = false }: { lists: LiveTvList[]; nav: TvNav; tt: TT; locale: string; phone?: boolean }) {
  const keyboard = useTextPrompt({ pushLayer: nav.pushLayer })
  const { status, urls: statusUrls, refreshing, refresh } = useEpgStatus()
  /* SPELLISTANS EGEN ADRESS VISAS OCKSÅ (Jerry 2026-09-22: "klickade på epg
     source ... men den är tom").

     En Xtream-inloggning sätter listans `urlTvg` — panelens xmltv.php ur
     M3U-huvudet — och rör aldrig `epgUrls`. Hämtningen känner till den
     (getAllLiveTvEpgUrls tar BÅDA, se live-tv-data.ts), men den här listan
     visade bara `epgUrls`. Sidan blev alltså helt tom efter en inloggning
     trots att adressen fanns, och statusdelen nedan ritas först när en
     hämtning lyckats — så det fanns inte ens en Hämta om-knapp att trycka på.

     Panelens adress kan inte tas bort som en tillagd kan (den kommer ur
     spellistan och skulle komma tillbaka vid nästa import); den stängs i
     stället av med `autoEpgDisabled`, flaggan som redan styr om hämtningen
     använder den. */
  const urls = useMemo(() => lists.flatMap((list) => [
    ...(list.urlTvg && !list.autoEpgDisabled
      ? [{ listId: list.id, url: list.urlTvg, fromPlaylist: true }]
      : []),
    ...list.epgUrls.map((url) => ({ listId: list.id, url, fromPlaylist: false })),
  ]), [lists])
  // Telefonen: raderna ligger kant i kant i ett kort (ingen luft mellan).
  const sectionGap = phone ? 0 : dp(10)
  return (
    <>
      <section style={{ display: 'flex', flexDirection: 'column', gap: sectionGap }}>
        <Heading phone={phone}>{tt('tabEpg')}</Heading>
        {urls.map(({ listId, url, fromPlaylist }) => {
          const list = lists.find((l) => l.id === listId)!
          return (
            <Row
              phone={phone}
              key={`${listId}:${url}`}
              label={fromPlaylist ? `${url}  ·  ${tt('epgFromPlaylist')}` : url}
              right={fromPlaylist ? tt('epgAutoOff') : tt('remove')}
              onOk={() => fromPlaylist
                ? updateLiveTvListEpg(listId, { autoEpgDisabled: true })
                : updateLiveTvListEpg(listId, { epgUrls: list.epgUrls.filter((u) => u !== url) })}
            />
          )
        })}
        {keyboard.available && lists[0] ? <Row phone={phone} label={tt('addEpgUrl')} right={phone ? <PhoneCaret /> : '+'} onOk={() => keyboard.ask(tt('addEpgUrl'), '', (value) => { const url = value.trim(); if (url) updateLiveTvListEpg(lists[0].id, { epgUrls: [...lists[0].epgUrls, url] }) }, 'url')} /> : null}
        {keyboard.node}
      </section>
      {statusUrls.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: sectionGap }}>
          <div style={phone ? { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingRight: 14 } : { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: dp(16) }}>
            <Heading phone={phone}>{tt('epgStatusTitle')}</Heading>
            <Action phone={phone} testId="epg-refresh" label={refreshing ? tt('epgRefreshing') : tt('epgRefresh')} disabled={refreshing} onOk={() => { void refresh() }} />
          </div>
          {statusUrls.map((url) => {
            const stat = status?.urls.find((item) => item.url === url)
            const fetched = stat?.fetchedAt ? formatFetchedAt(new Date(stat.fetchedAt).toISOString(), locale) : null
            return (
              <div
                key={url}
                data-testid={`epg-status-${url}`}
                style={phone
                  ? { minHeight: 52, padding: '10px 14px', borderBottom: `1px solid ${MT.line07}`, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15 }
                  : { minHeight: dp(64), borderRadius: dp(12), background: TV.s06, padding: `${dp(12)}px ${dp(18)}px`, display: 'flex', flexDirection: 'column', gap: dp(4), fontSize: dp(18) }}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                {stat?.error
                  ? <span style={{ fontSize: phone ? 13 : dp(16), color: '#fca5a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.error}</span>
                  : (
                    <span style={{ fontSize: phone ? 13 : dp(16), color: phone ? MT.dim : TV.dim }}>
                      {stat ? tt('epgSourceStats', { channels: stat.channels.toLocaleString(locale), programmes: stat.programmes.toLocaleString(locale) }) : tt('epgNeverFetched')}
                      {fetched ? ` · ${tt('fetchedAt', { time: fetched })}` : ''}
                    </span>
                  )}
              </div>
            )
          })}
        </section>
      ) : null}
    </>
  )
}

export function ParentalTab({ model, tt, phone = false }: { model: TvViewProps['model']; tt: TT; phone?: boolean }) {
  const [keys, setKeys] = useState(getLockedChannelKeys)
  useEffect(() => onChannelLocksChanged(() => setKeys(getLockedChannelKeys())), [])
  const channels = keys
    .map((key) => model.allChannels.find((c) => channelKey(c) === key))
    .filter((c): c is M3uChannel => Boolean(c))
  // Lås/upplåsning går via PinGate — samma regel som tv-channel.tsx. Utan PIN-infrastruktur (eller ingen PIN satt på
  // profilen) finns inget att verifiera mot, så då låses kanalen upp direkt
  // i stället för att fastna bakom en grind ingen kan öppna.
  const lockAvailable = pinSupportAvailable() && activeProfileHasPin()
  const [pinTarget, setPinTarget] = useState<M3uChannel | null>(null)
  const requestUnlock = (channel: M3uChannel) => {
    if (!lockAvailable) { toggleChannelLock(channel); return }
    setPinTarget(channel)
  }
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: phone ? 0 : dp(10) }}>
      <Heading phone={phone}>{tt('lockedChannels')}</Heading>
      {channels.length === 0 ? <div style={phone ? { fontSize: 15, color: MT.dim, padding: '4px 14px 14px' } : { fontSize: dp(18), color: TV.dim }}>{tt('noLocked')}</div> : null}
      {channels.map((channel) => <Row phone={phone} key={channelKey(channel)} label={channel.name} right={tt('unlock')} onOk={() => requestUnlock(channel)} />)}
      <PinGate
        open={pinTarget !== null}
        title={tt('enterPin')}
        wrongText={tt('pinWrong')}
        unlockLabel={tt('unlock')}
        cancelLabel={tt('cancel')}
        onVerify={verifyActiveProfilePin}
        onClose={() => setPinTarget(null)}
        onUnlocked={() => {
          const channel = pinTarget
          setPinTarget(null)
          if (channel) toggleChannelLock(channel)
        }}
      />
    </section>
  )
}
