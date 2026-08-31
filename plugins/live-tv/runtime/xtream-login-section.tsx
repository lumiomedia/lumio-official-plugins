'use client'

import { useEffect, useState } from 'react'
import { useLang } from '@/lib/plugin-sdk'
import {
  clearLiveTvMemoryCache,
  clearStoredLiveTvChannels,
  deleteLiveTvList,
  deleteXtreamLogin,
  fetchXtreamAccount,
  fetchXtreamCategories,
  fetchXtreamChannels,
  getLiveTvLists,
  getXtreamLogins,
  normalizeXtreamBase,
  onXtreamLoginsChanged,
  saveXtreamLogin,
  upsertLiveTvListFromFetch,
  xtreamPseudoUrl,
  type XtreamCategory,
  type XtreamLogin,
} from './live-tv-data'

const MAX_CHANNELS = 2000

const inputClass =
  'w-full rounded-[1.1rem] border border-white/10 bg-white/8 px-3.5 py-2 text-sm text-slate-50 outline-none transition placeholder:text-slate-500 focus:bg-white/10'
const actionButtonClass =
  'rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/30 hover:text-white disabled:opacity-50'
const smallButtonClass =
  'rounded bg-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/15 disabled:opacity-50'

/**
 * Xtream Codes-inloggning: server + användarnamn + lösenord i stället för
 * M3U-länk. Behövs på riktigt — det finns leverantörer där get.php är helt
 * avstängd (tomma svar med hittepå-statuskoder) medan player_api.php svarar
 * korrekt, så en M3U-länk kan aldrig fungera hos dem. Kanalerna syntetiseras
 * ur API:t och landar i samma listflöde som M3U-hämtningarna.
 */
export function XtreamLoginSection() {
  const { t } = useLang()
  const [logins, setLogins] = useState<XtreamLogin[]>([])
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'authError' | 'netError'>('idle')
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setLogins(getXtreamLogins())
    sync()
    return onXtreamLoginsChanged(sync)
  }, [])

  async function refreshChannels(login: XtreamLogin): Promise<void> {
    const result = await fetchXtreamChannels(login, MAX_CHANNELS)
    upsertLiveTvListFromFetch(xtreamPseudoUrl(login), result.urlTvg, result.channels)
    // Gridens cache är nycklad på HELA url-uppsättningen — rensa så nästa
    // besök läser om. Samma grepp som M3U-hämtaknappen tar.
    clearLiveTvMemoryCache()
    clearStoredLiveTvChannels()
    setNotice(
      result.total > result.channels.length
        ? t('liveTvXtreamCapped')
            .replace('{max}', String(result.channels.length))
            .replace('{total}', String(result.total))
        : null,
    )
  }

  async function handleConnect() {
    const base = normalizeXtreamBase(server)
    const user = username.trim()
    const pass = password.trim()
    if (!base || !user || !pass) {
      setState('netError')
      return
    }
    setState('working')
    setNotice(null)
    try {
      const account = await fetchXtreamAccount({ base, username: user, password: pass })
      if (!account.auth) {
        setState('authError')
        return
      }
      // Samma panel + användare igen = uppdatera inloggningen (nytt lösenord,
      // förnyat konto) i stället för att skapa en dubblettlista.
      const existing = getXtreamLogins().find((entry) => entry.base === base && entry.username === user)
      const login: XtreamLogin = {
        id: existing?.id ?? crypto.randomUUID(),
        base,
        username: user,
        password: pass,
        format: account.allowedFormats.length === 0 || account.allowedFormats.includes('ts') ? 'ts' : 'm3u8',
        categoryIds: existing?.categoryIds ?? [],
      }
      saveXtreamLogin(login)
      await refreshChannels(login)
      setState('done')
      window.setTimeout(() => setState('idle'), 1800)
    } catch {
      setState('netError')
    }
  }

  function handleRemove(login: XtreamLogin) {
    deleteXtreamLogin(login.id)
    let host = login.base
    try {
      host = new URL(login.base).hostname
    } catch { /* behåll basen */ }
    const list = getLiveTvLists().find((entry) => entry.name === host)
    if (list) deleteLiveTvList(list.id)
    clearLiveTvMemoryCache()
    clearStoredLiveTvChannels()
    setNotice(null)
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <h4 className="text-sm font-semibold text-white">{t('liveTvXtreamTitle')}</h4>
        <p className="mt-1 text-xs text-slate-500">{t('liveTvXtreamDesc')}</p>
      </div>
      <input
        type="url"
        value={server}
        onChange={(event) => setServer(event.target.value)}
        placeholder={`${t('liveTvXtreamServer')} — http://host:8080`}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={inputClass}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t('liveTvXtreamUsername')}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={inputClass}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('liveTvXtreamPassword')}
          autoComplete="off"
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {state === 'authError' ? <span className="mr-auto text-xs text-rose-300">{t('liveTvXtreamAuthFailed')}</span> : null}
        {state === 'netError' ? <span className="mr-auto text-xs text-rose-300">{t('liveTvXtreamError')}</span> : null}
        <button type="button" onClick={() => void handleConnect()} disabled={state === 'working'} className={actionButtonClass}>
          {state === 'working' ? t('liveTvXtreamConnecting') : state === 'done' ? t('liveTvXtreamDone') : t('liveTvXtreamConnect')}
        </button>
      </div>
      {notice ? <p className="text-xs text-amber-300/90">{notice}</p> : null}
      {logins.map((login) => (
        <XtreamLoginCard key={login.id} login={login} onRefresh={refreshChannels} onRemove={handleRemove} />
      ))}
    </div>
  )
}

function XtreamLoginCard({
  login,
  onRefresh,
  onRemove,
}: {
  login: XtreamLogin
  onRefresh: (login: XtreamLogin) => Promise<void>
  onRemove: (login: XtreamLogin) => void
}) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<XtreamCategory[] | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(login.categoryIds))
  const [busy, setBusy] = useState(false)

  let host = login.base
  try {
    host = new URL(login.base).host
  } catch { /* behåll basen */ }

  async function handleToggleOpen() {
    const next = !open
    setOpen(next)
    if (next && categories === null) {
      setCategories(await fetchXtreamCategories(login).catch(() => []))
    }
  }

  function toggleCategory(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleApply(categoryIds: string[]) {
    setBusy(true)
    try {
      const next = { ...login, categoryIds }
      saveXtreamLogin(next)
      setSelected(new Set(categoryIds))
      await onRefresh(next)
    } finally {
      setBusy(false)
    }
  }

  const needle = query.trim().toLowerCase()
  const filtered = (categories ?? []).filter((category) => !needle || category.name.toLowerCase().includes(needle))

  return (
    <div className="space-y-2 rounded-xl border border-white/5 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{host}</span>
        <button type="button" onClick={() => void handleToggleOpen()} className={smallButtonClass}>
          {t('liveTvXtreamCategories')}{login.categoryIds.length > 0 ? ` (${login.categoryIds.length})` : ''}
        </button>
        <button type="button" onClick={() => void handleApply([...selected]).catch(() => {})} disabled={busy} className={smallButtonClass}>
          {t('liveTvXtreamApplyCategories')}
        </button>
        <button type="button" onClick={() => onRemove(login)} className={`${smallButtonClass} text-rose-300`}>
          {t('liveTvXtreamRemove')}
        </button>
      </div>
      {open ? (
        <div className="space-y-2">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('liveTvXtreamSearchCategories')}
            className={inputClass}
          />
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={selected.size === 0}
                onChange={() => setSelected(new Set())}
                className="h-3.5 w-3.5 accent-amber-400"
              />
              {t('liveTvXtreamAllCategories')}
            </label>
            {(categories === null ? [] : filtered).map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={selected.has(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  className="h-3.5 w-3.5 accent-amber-400"
                />
                <span className="truncate">{category.name}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
