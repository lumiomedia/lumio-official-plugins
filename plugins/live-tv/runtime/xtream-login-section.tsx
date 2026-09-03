'use client'

import { useEffect, useState } from 'react'
import { Card, Checkbox, PillBtn, TOKENS, inputStyle, useLang } from '@/lib/plugin-sdk'
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
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>{t('liveTvXtreamTitle')}</div>
          <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: TOKENS.textMute }}>{t('liveTvXtreamDesc')}</p>
        </div>
        <input
          type="url"
          value={server}
          onChange={(event) => setServer(event.target.value)}
          placeholder={`${t('liveTvXtreamServer')} — http://host:8080`}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={inputStyle}
        />
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t('liveTvXtreamUsername')}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={inputStyle}
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('liveTvXtreamPassword')}
            autoComplete="off"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          {state === 'authError' ? <span style={{ marginRight: 'auto', fontSize: 12, color: TOKENS.red }}>{t('liveTvXtreamAuthFailed')}</span> : null}
          {state === 'netError' ? <span style={{ marginRight: 'auto', fontSize: 12, color: TOKENS.red }}>{t('liveTvXtreamError')}</span> : null}
          <PillBtn variant="accent" onClick={() => void handleConnect()} disabled={state === 'working'}>
            {state === 'working' ? t('liveTvXtreamConnecting') : state === 'done' ? t('liveTvXtreamDone') : t('liveTvXtreamConnect')}
          </PillBtn>
        </div>
        {notice ? <p style={{ margin: 0, fontSize: 12, color: TOKENS.warn }}>{notice}</p> : null}
        {logins.map((login) => (
          <XtreamLoginCard key={login.id} login={login} onRefresh={refreshChannels} onRemove={handleRemove} />
        ))}
      </div>
    </Card>
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

  const row = (checked: boolean, onChange: () => void, label: string) => (
    <div style={{ padding: '6px 0' }}>
      <Checkbox checked={checked} onChange={onChange} label={<span style={{ fontSize: 13 }}>{label}</span>} />
    </div>
  )

  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${TOKENS.border}`, background: TOKENS.surface0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ minWidth: 0, flex: 1, fontSize: 14, fontWeight: 600, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{host}</span>
        <PillBtn size="sm" onClick={() => void handleToggleOpen()}>
          {t('liveTvXtreamCategories')}{login.categoryIds.length > 0 ? ` (${login.categoryIds.length})` : ''}
        </PillBtn>
        <PillBtn size="sm" variant="accent" onClick={() => void handleApply([...selected]).catch(() => {})} disabled={busy}>
          {t('liveTvXtreamApplyCategories')}
        </PillBtn>
        <PillBtn size="sm" variant="danger" onClick={() => onRemove(login)}>{t('liveTvXtreamRemove')}</PillBtn>
      </div>
      {open ? (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('liveTvXtreamSearchCategories')}
            style={inputStyle}
          />
          <div style={{ maxHeight: 224, overflowY: 'auto', paddingRight: 4 }}>
            {row(selected.size === 0, () => setSelected(new Set()), t('liveTvXtreamAllCategories'))}
            {(categories === null ? [] : filtered).map((category) => (
              <div key={category.id}>{row(selected.has(category.id), () => toggleCategory(category.id), category.name)}</div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )

}
