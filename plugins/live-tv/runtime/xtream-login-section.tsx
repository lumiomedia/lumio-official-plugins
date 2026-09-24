'use client'

import { useEffect, useRef, useState } from 'react'
import { LtNote, LtRows, LtTextRow, UI, fmtInt } from './settings-ui'
import {
  clearLiveTvMemoryCache,
  clearStoredLiveTvChannels,
  deleteLiveTvList,
  ensureXtreamList,
  fetchXtreamAccount,
  getLiveTvLists,
  getXtreamLogins,
  importList,
  normalizeXtreamBase,
  saveXtreamLogin,
  xtreamPseudoUrl,
  type XtreamAccount,
  type XtreamLogin,
} from './live-tv-data'
import { useHubText } from './hub-strings'
import { recordListImportOutcome } from './list-import-flags'

/** Utgångsdatumet ur Xtream-panelen (unix-sekunder). Samma format som TV:s kontokort. */
function formatXtreamExpiry(expDate: number | null, locale: string): string | null {
  if (!expDate) return null
  const when = new Date(expDate * 1000)
  if (Number.isNaN(when.getTime())) return null
  return when.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Kontoraden på spellistans kort (§3.1: `Active · expires 16 Dec 2026`):
 * status, utgång och max anslutningar ur panelen. `fetchXtreamAccount`
 * cachar 5 minuter per bas+användare, så det här kör högst en riktig
 * hämtning per montering. `null` när listan inte är en Xtream-lista.
 */
export function useXtreamAccountMeta(login: XtreamLogin | null): { text: string; failed: boolean } | null {
  const { h, locale } = useHubText()
  const [account, setAccount] = useState<XtreamAccount | null>(null)
  const [failed, setFailed] = useState(false)
  const base = login?.base ?? null
  const username = login?.username ?? null
  const password = login?.password ?? null
  useEffect(() => {
    if (!base || !username || password === null) return
    let cancelled = false
    setFailed(false)
    void fetchXtreamAccount({ base, username, password })
      .then((next) => { if (!cancelled) setAccount(next) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [base, username, password])
  if (!login) return null
  if (failed) return { text: h('xtreamAccountUnavailable'), failed: true }
  if (!account) return { text: h('listRefetching'), failed: false }
  const expiry = formatXtreamExpiry(account.expDate, locale)
  return {
    failed: false,
    text: [
      account.status,
      expiry ? h('xtreamExpires', { date: expiry }) : h('xtreamNoExpiry'),
      account.maxConnections ? h('xtreamMaxConnections', { count: account.maxConnections }) : null,
    ].filter((part): part is string => Boolean(part)).join(' · '),
  }
}

/**
 * "Logga in på nytt"-bryggan från listkorten (`playlist-card.tsx`) och
 * TV-vyns spellistepanel.
 *
 * En Xtream-lista som kommit hit via enhetsöverföringen har kvar sin källa
 * (`xtream://<host>/<loginId>`) men INTE inloggningen — lösenord speglas inte
 * — så `importList` kan inte köras för den. Kortet skickar då hit panelens
 * värdnamn och listans login-id; formuläret fylls i, och id:t ÅTERANVÄNDS när
 * den nya inloggningen sparas så att pseudo-URL:en (och därmed listan och
 * dess plats i indexet) blir densamma i stället för att en andra, tom lista
 * skapas bredvid den trasiga.
 */
export interface XtreamPrefill {
  server: string
  loginId?: string
}

const prefillListeners = new Set<(prefill: XtreamPrefill) => void>()

export function prefillXtreamLogin(prefill: XtreamPrefill): void {
  for (const listener of [...prefillListeners]) listener(prefill)
}

function onXtreamPrefill(listener: (prefill: XtreamPrefill) => void): () => void {
  prefillListeners.add(listener)
  return () => { prefillListeners.delete(listener) }
}

export type XtreamLoginState = 'idle' | 'working' | 'done' | 'authError' | 'netError'

/**
 * Inloggningsformulärets tillstånd och flöde, delat av skrivbordets rader och
 * TV-sidans rader. Kontot och dess kanaler blir en spellista med eget kort;
 * kortet äger kontostatusen, uppdateringen och borttagningen.
 *
 * Behövs på riktigt — det finns leverantörer där get.php är helt avstängd
 * medan player_api.php svarar korrekt, så en M3U-länk kan aldrig fungera hos
 * dem. Kanalerna syntetiseras ur API:t och landar i samma listflöde.
 */
export function useXtreamLoginForm({ onImported, onPrefill }: { onImported?: (listId: string, existedBefore: boolean) => void; onPrefill?: () => void } = {}) {
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<XtreamLoginState>('idle')
  // Jobbets `state.received/total` (importList) — synlig framstegsräknare för
  // stora Xtream-utbud (tiotusentals kanaler kan ta en stund).
  const [importProgress, setImportProgress] = useState<{ received: number; total: number | null } | null>(null)
  /**
   * Sätts av "Logga in på nytt" (se prefillXtreamLogin ovan). KNUTEN till
   * serveradressen förifyllningen kom med: skriver man om fältet till en annan
   * panel är det inte längre samma lista man lagar.
   */
  const [reuse, setReuse] = useState<{ loginId: string; server: string } | null>(null)
  const reuseLoginId = reuse && reuse.server === server ? reuse.loginId : null
  const onPrefillRef = useRef(onPrefill)
  useEffect(() => { onPrefillRef.current = onPrefill })

  useEffect(() => onXtreamPrefill((prefill) => {
    setServer(prefill.server)
    setUsername('')
    setPassword('')
    setReuse(prefill.loginId ? { loginId: prefill.loginId, server: prefill.server } : null)
    setState('idle')
    onPrefillRef.current?.()
  }), [])

  async function refreshChannels(login: XtreamLogin): Promise<void> {
    const source = xtreamPseudoUrl(login)
    // Om importen misslyckas för en HELT NY lista ska den inte lämnas kvar
    // som en tom, orimporterad post — spec §5. En redan befintlig lista rörs
    // inte vid ett fel.
    const existedBefore = getLiveTvLists().some((entry) => entry.source === source)
    const list = ensureXtreamList(login)
    setImportProgress({ received: 0, total: null })
    try {
      const status = await importList(list, (s) => setImportProgress({ received: s.received, total: s.total ?? null }))
      clearLiveTvMemoryCache()
      clearStoredLiveTvChannels()
      if (status.state === 'error') {
        if (!existedBefore) deleteLiveTvList(list.id)
        throw new Error(status.error ?? 'xtream import failed')
      }
      // Ominloggningen ÄR fixen på "behöver hämtas om".
      recordListImportOutcome(list.id)
      onImported?.(list.id, existedBefore)
    } catch (err) {
      if (existedBefore) recordListImportOutcome(list.id, err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setImportProgress(null)
    }
  }

  async function connect() {
    const base = normalizeXtreamBase(server)
    const user = username.trim()
    const pass = password.trim()
    if (!base || !user || !pass) {
      setState('netError')
      return
    }
    setState('working')
    try {
      const account = await fetchXtreamAccount({ base, username: user, password: pass })
      if (!account.auth) {
        setState('authError')
        return
      }
      // Samma panel + användare igen = uppdatera inloggningen i stället för
      // att skapa en dubblettlista.
      const existing = getXtreamLogins().find((entry) => entry.base === base && entry.username === user)
      const login: XtreamLogin = {
        id: existing?.id ?? reuseLoginId ?? crypto.randomUUID(),
        base,
        username: user,
        password: pass,
        format: account.allowedFormats.length === 0 || account.allowedFormats.includes('ts') ? 'ts' : 'm3u8',
        categoryIds: existing?.categoryIds ?? [],
      }
      saveXtreamLogin(login)
      setReuse(null)
      await refreshChannels(login)
      setState('done')
      window.setTimeout(() => setState('idle'), 1800)
    } catch {
      setState('netError')
    }
  }

  return { server, setServer, username, setUsername, password, setPassword, state, connect, importProgress }
}

/**
 * XTREAM LOGIN på skrivbordet (handoff §3 block 4): tre rader — Server URL,
 * Username, Password — och knappen Log in & fetch på lösenordsraden.
 */
export function XtreamLoginSection({ onImported }: { onImported?: (listId: string, existedBefore: boolean) => void } = {}) {
  const { h, locale } = useHubText()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const form = useXtreamLoginForm({ onImported, onPrefill: () => rootRef.current?.scrollIntoView?.({ block: 'center' }) })
  const buttonLabel = form.state === 'working' ? h('loggingIn') : form.state === 'done' ? h('loginFetched') : h('loginAndFetch')

  return (
    <div ref={rootRef} data-testid="xtream-login">
      <LtRows>
        <LtTextRow first label={h('serverUrl')} value={form.server} onChange={form.setServer} placeholder="http://host:8080" fieldWidth={240} onEnter={() => void form.connect()} />
        <LtTextRow label={h('username')} value={form.username} onChange={form.setUsername} placeholder={h('username')} fieldWidth={180} onEnter={() => void form.connect()} />
        <LtTextRow
          label={h('password')}
          value={form.password}
          onChange={form.setPassword}
          placeholder={h('password')}
          fieldWidth={180}
          secret
          button={buttonLabel}
          onButton={() => void form.connect()}
          buttonDisabled={form.state === 'working'}
        />
      </LtRows>
      {form.state === 'authError' ? <p role="alert" style={{ margin: '8px 0 0', fontSize: 12.5, color: UI.danger }}>{h('loginRejected')}</p> : null}
      {form.state === 'netError' ? <p role="alert" style={{ margin: '8px 0 0', fontSize: 12.5, color: UI.danger }}>{h('loginUnreachable')}</p> : null}
      {form.importProgress ? (
        <LtNote style={{ marginTop: 8 }}>
          {form.importProgress.total
            ? h('listImportProgress', { received: fmtInt(form.importProgress.received, locale), total: fmtInt(form.importProgress.total, locale) })
            : h('listImportProgressUnknown')}
        </LtNote>
      ) : null}
    </div>
  )
}
