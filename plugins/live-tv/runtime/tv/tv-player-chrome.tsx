'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTvGlassMenu, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { formatClock, progressOf } from '../live-tv-ui'
import type { LiveTvPlayerTvProps } from './tv-player-types'
import { Icons, Progress, RoundBtn, Tag, TV, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'

/** Kort på var sida om den spelande kanalen i mini-guiden. */
const MINI_WINDOW = 25

export function TvPlayerChrome({ channel, tv, paused, onTogglePause, onClose }: { channel: M3uChannel; tv: LiveTvPlayerTvProps; paused: boolean; onTogglePause: () => void; onClose: () => void }) {
  const { tt } = useTvText()
  const clock = useTvClockNode(tv.locale)
  const [visible, setVisible] = useState(true)
  const [miniOpen, setMiniOpen] = useState(false)
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const timerRef = useRef<number | null>(null)
  const dotsRef = useRef<HTMLDivElement | null>(null)
  const miniRef = useRef<HTMLDivElement | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)
  const bannerRef = useRef<HTMLDivElement | null>(null)
  const TvGlassMenu = getTvGlassMenu()
  const info = tv.nowFor(channel)
  // 0 = dölj aldrig (LiveTvPlayerTvProps-kommentaren). Ingen egen tröskel
  // ovanpå inställningen — README §9 anger just "4 s (inställning)", inget
  // golv.
  const hideMs = tv.bannerHideMs

  const reveal = useCallback(() => {
    setVisible(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    if (hideMs > 0 && !miniOpen && !menu) timerRef.current = window.setTimeout(() => setVisible(false), hideMs)
  }, [hideMs, miniOpen, menu])
  useEffect(() => { reveal(); return () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current) } }, [reveal, channel])

  const index = tv.neighbours.findIndex((c) => channelKey(c) === channelKey(channel))

  /**
   * Mini-guiden ritar ett FÖNSTER, inte hela listan.
   *
   * `tv.neighbours` är modellens kompletta kanallista — i en IPTV-spellista
   * tiotusentals poster. Varje kort slår dessutom upp `tv.nowFor(c)`, så en
   * ▾-tryckning byggde tiotusentals DOM-noder och lika många EPG-uppslag i ett
   * enda pass; på en TV-box syns det som flera sekunders frys. Fjärrkontrollen
   * kan bara gå ett steg i taget från den spelande kanalen, så ±25 kort räcker
   * med marginal (ChannelUp/Down byter kanal och bygger om fönstret).
   */
  const miniCards = useMemo(() => {
    if (index < 0) return tv.neighbours.slice(0, MINI_WINDOW * 2)
    return tv.neighbours.slice(Math.max(0, index - MINI_WINDOW), index + MINI_WINDOW + 1)
  }, [tv, index])
  const step = useCallback((delta: 1 | -1) => {
    if (tv.neighbours.length === 0) return
    const next = tv.neighbours[(index + delta + tv.neighbours.length) % tv.neighbours.length]
    if (next) tv.onSwitchChannel(next)
  }, [tv, index])

  /**
   * Var kromets lager står just nu, läst av fokusslingan nedan.
   *
   * Slingan får inte läsa `menu`/`miniOpen` direkt: den lever i en effekt som
   * bara ska starta om när KANALEN byts, annars börjar den om varje gång ett
   * lager öppnas och stjäl då fokus från just det lagret.
   */
  const layerRef = useRef({ menuOpen: false, miniOpen: false, gateOpen: false })
  useEffect(() => { layerRef.current = { menuOpen: menu !== null, miniOpen, gateOpen: tv.gateOpen } })

  /**
   * ⋯ tar fokus när spelaren öppnas — annars finns ingen station alls.
   *
   * Skalet hoppar över sin fokuseffekt medan spelaren är öppen
   * (`tv-shell.tsx`: `if (active) return`), och värdens fokusmotor kallas bara
   * när en SIDA monteras. Fokus blev därför kvar på stationen i vyn BAKOM
   * spelaren (uppmätt i tv-sim: `guide-row`). Sedan kromet äger ◂/▸/OK utanför
   * sina egna element var ⋯ därmed omöjlig att nå: dess `data-init` hjälpte
   * ingen, och håll-OK kunde aldrig öppna menyn trots att bannern lovar det.
   *
   * Självhävdande slinga, samma mönster som gamla TV-grenens Stäng-knapp
   * (`live-tv-player.tsx`): fokus sätts om tills det suttit kvar några
   * bildrutor, för spelarens egen uppstart (yta, hls, värdens motor) flyttar
   * fokus sent och en enda `focus()` vid montering försvinner.
   *
   * Slingan avstår medan glasmenyn, mini-guiden eller PIN-grinden är öppen —
   * de äger fokus då — och ger upp efter fyra sekunder så att den aldrig
   * slåss i evighet.
   */
  useEffect(() => {
    const node = dotsRef.current
    if (!node) return
    let frame = 0
    let held = 0
    const deadline = Date.now() + 4000
    const tick = () => {
      if (!node.isConnected) return
      const active = document.activeElement
      const inLayer = layerRef.current.menuOpen || layerRef.current.miniOpen || layerRef.current.gateOpen
      if (active === node) {
        if (++held >= 5) return
      } else if (inLayer) {
        held = 0
      } else {
        held = 0
        node.focus({ preventScroll: true })
      }
      if (Date.now() < deadline) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [channel])

  /**
   * Stäng mini-guiden och lämna ALDRIG fokus på `body`.
   *
   * Korten är mini-guidens enda stationer: försvinner de medan ett av dem har
   * fokus faller fokus till `document.body`, och då har fjärrkontrollen ingen
   * station att gå vidare från (uppmätt i tv-sim efter OK på ett kort:
   * `document.activeElement === document.body`). ⋯-knappen är kromets
   * data-init-station och den rätta platsen att landa på.
   *
   * setTimeout 0: fokus måste sättas EFTER att React tagit bort korten, annars
   * flyttar borttagningen fokus tillbaka till body igen.
   */
  const closeMini = useCallback(() => {
    setMiniOpen(false)
    window.setTimeout(() => dotsRef.current?.focus({ preventScroll: true }), 0)
  }, [])

  // Tangenter: ▲ visar bannern, ▾ öppnar mini-guiden, ChannelUp/Down zappar,
  // Back stänger mini-guiden eller (annars) spelaren.
  //
  // `stopImmediatePropagation` och inte bara `stopPropagation`: tre
  // capture-lyssnare (skal, spelare, kromet) sitter på SAMMA mål (`window`),
  // och `stopPropagation` stoppar bara vidare BUBBLING/CAPTURE till andra
  // MÅL i trädet — inte syskonlyssnare på samma mål, som körs i
  // registreringsordning. Spelarens lyssnare läggs om varje gång dess
  // beroenden ändras (ny funktion, ny plats i listan), så "kromet monterades
  // före spelaren"-ordningen går inte att lita på. `stopImmediatePropagation`
  // hindrar DOM:en från att kalla några fler lyssnare alls för just den här
  // händelsen, oavsett ordning.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (menu) return // glasmenyn stänger sig själv på Back (host TvGlassMenu)
      if (tv.gateOpen) return // PIN-grinden äger Enter/Back medan den är uppe (tv-shell.tsx)
      if (event.key === 'ChannelUp' || event.key === 'PageUp') { event.preventDefault(); event.stopImmediatePropagation(); step(1); return }
      if (event.key === 'ChannelDown' || event.key === 'PageDown') { event.preventDefault(); event.stopImmediatePropagation(); step(-1); return }
      if (event.key === 'ArrowDown' && !miniOpen) { event.preventDefault(); event.stopImmediatePropagation(); setMiniOpen(true); reveal(); return }
      if (event.key === 'ArrowUp' && !miniOpen) { event.preventDefault(); event.stopImmediatePropagation(); reveal(); return }
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (miniOpen) {
          closeMini()
          return
        }
        onClose()
        return
      }
      // ◂ ▸ och OK ÄGS av spelaren när fokus står utanför kromet.
      //
      // Spelaren täcker skärmen men tar inte fokus: `document.activeElement`
      // står kvar på stationen i vyn BAKOM (uppmätt i tv-sim: `guide-row`).
      // ▲/▾ och Back fångades redan här, men ◂/▸ och OK gjorde det inte —
      // de bubblade ned till den dolda raden. Uppmätt: med spelaren öppen
      // bytte ▸ kategori i guiden bakom (toppbandet tappade sin kanal), och
      // OK startade om samma kanal. Användaren ser ingenting av det förrän
      // Back tar hen tillbaka till en vy som har flyttat sig.
      //
      // Står fokus INNE i kromet (⋯-stationen, mini-guidens kort) släpps de
      // igenom: där ska OK öppna menyn/byta kanal och sidopilarna flytta
      // fokus mellan korten.
      const target = event.target
      const insideChrome = target instanceof Node && (
        topRef.current?.contains(target) === true
        || bannerRef.current?.contains(target) === true
        || miniRef.current?.contains(target) === true
      )
      if (!insideChrome && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        event.stopImmediatePropagation()
        reveal()
        return
      }
      if (event.key.startsWith('Arrow') || event.key === 'Enter') reveal()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu, miniOpen, step, reveal, onClose, closeMini, tv.gateOpen])

  useEffect(() => {
    if (!miniOpen) return
    // Fallback på första kortet: `data-init` sitter på kortet för den kanal
    // som spelas, och den kanalen behöver inte finnas i `tv.neighbours` alls
    // (spelas något utanför listan blir `index` −1). Utan fallbacken öppnades
    // mini-guiden med fokus kvar där det stod — ⋯ eller vyn bakom — och
    // korten gick inte att nå med fjärren.
    const mini = miniRef.current
    const current = mini?.querySelector<HTMLElement>('[data-init]') ?? mini?.querySelector<HTMLElement>('[data-testid="mini-card"]')
    current?.focus({ preventScroll: true })
    current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [miniOpen])

  const openMenu = (element: HTMLElement) => {
    setMenu({
      title: `${channel.name}${info.now ? ` · ${info.now.title}` : ''}`,
      element,
      actions: [
        { key: 'guide', label: tt('menuGuide'), run: () => setMiniOpen(true) },
        { key: 'multi', label: tt('menuMultiview'), run: tv.onOpenMultiview },
        { key: 'pause', label: paused ? tt('menuResume') : tt('menuPause'), run: onTogglePause },
        { key: 'fav', label: tv.favourite ? tt('menuRemoveFavourite') : tt('menuAddFavourite'), run: tv.onToggleFavourite },
        { key: 'info', label: tt('menuChannelDetails'), run: tv.onOpenChannelDetails },
      ],
    })
  }

  return (
    <>
      <div ref={topRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: `${dp(36)}px ${dp(48)}px`, display: 'flex', alignItems: 'center', gap: dp(16), opacity: visible ? 1 : 0, transition: 'opacity 200ms', pointerEvents: visible ? 'auto' : 'none', zIndex: 30 }}>
        <RoundBtn {...station(onClose)} background="rgba(252,252,255,0.12)"><Icons.ChevronLeft /></RoundBtn>
        <span style={{ fontSize: dp(20), color: 'rgba(243,244,248,0.75)' }}>{tv.channelNumber ? `${tv.channelNumber} · ` : ''}{channel.name}</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: dp(14), fontSize: dp(17) }}>
          {info.now ? <Tag variant="live">{tt('live')}</Tag> : null}
          {tv.quality ? <span style={{ color: 'rgba(243,244,248,0.75)' }}>{tv.quality}</span> : null}
          {clock}
        </span>
      </div>
      <div ref={bannerRef} data-testid="banner" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: dp(48), paddingTop: dp(120), background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.92) 55%)', display: 'flex', alignItems: 'flex-end', gap: dp(24), opacity: visible ? 1 : 0, transition: 'opacity 200ms', pointerEvents: visible ? 'auto' : 'none', zIndex: 30 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          <div style={{ fontSize: dp(44), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? channel.name}</div>
          {info.now ? (
            <>
              <div style={{ fontSize: dp(20), color: 'rgba(243,244,248,0.7)' }}>
                {`${formatClock(info.now.start, tv.locale)}–${formatClock(info.now.stop, tv.locale)} · ${tt('minutesLeft', { min: Math.max(0, Math.round((info.now.stop - tv.nowMs) / 60_000)) })}`}
                {info.next ? <> · <span style={{ color: TV.accText }}>{tt('nextLabel')}</span> {info.next.title}</> : null}
              </div>
              <Progress value={progressOf(info.now.start, info.now.stop, tv.nowMs)} height={dp(6)} style={{ maxWidth: dp(900) }} />
            </>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(16), flexShrink: 0 }}>
          <span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.45)' }}>{tt('playerHelp')}</span>
          <div ref={dotsRef} {...station(() => dotsRef.current && openMenu(dotsRef.current), (el) => openMenu(el), { 'data-init': '', 'aria-label': tt('moreActions') })} style={{ width: dp(52), height: dp(52), borderRadius: 999, background: 'rgba(252,252,255,0.10)', border: `1px solid ${TV.lineCard}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icons.Dots /></div>
        </div>
      </div>
      {miniOpen ? (
        <div ref={miniRef} data-panel-root="" data-row="" data-live-tv-layer="" style={{ position: 'absolute', left: 0, right: 0, bottom: dp(200), padding: `0 ${dp(48)}px`, display: 'flex', gap: dp(14), overflowX: 'auto', zIndex: 31 }}>
          {miniCards.map((c, cardIndex) => {
            const n = tv.nowFor(c)
            const current = channelKey(c) === channelKey(channel)
            // Exakt EN data-init i mini-guiden: den spelande kanalens kort,
            // eller första kortet när den kanalen inte ligger i listan
            // (`index` −1).
            const cardInit = index < 0 ? cardIndex === 0 : current
            return (
              <div key={channelKey(c)} data-testid="mini-card" {...station(() => { closeMini(); tv.onSwitchChannel(c) }, (el) => setMenu({ title: c.name, element: el, actions: [{ key: 'multi', label: tt('menuAddMultiview'), run: () => tv.onAddToMultiview(c) }] }), cardInit ? { 'data-init': '' } : undefined)} style={{ width: dp(330), height: dp(118), flexShrink: 0, borderRadius: dp(14), padding: `${dp(14)}px ${dp(16)}px`, background: current ? TV.s16 : 'rgba(20,22,30,0.85)', display: 'flex', flexDirection: 'column', gap: dp(6), cursor: 'pointer', boxSizing: 'border-box' }}>
                <div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.55)' }}>{c.name}</div>
                <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.now?.title ?? tt('noProgramme')}</div>
                {n.next ? <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tt('nextLabel')}: {n.next.title}</div> : null}
                {n.now ? <Progress value={progressOf(n.now.start, n.now.stop, tv.nowMs)} height={dp(4)} /> : null}
              </div>
            )
          })}
        </div>
      ) : null}
      {TvGlassMenu && menu ? <TvGlassMenu target={menu} onClose={() => { setMenu(null); reveal() }} /> : null}
    </>
  )
}
