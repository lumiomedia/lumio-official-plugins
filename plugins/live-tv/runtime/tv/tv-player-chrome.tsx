'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTvGlassMenu, useTvMode, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvPlayerControls, LiveTvPlayerTvProps } from './tv-player-types'
import { TvFocusStyle, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvPlayerChromePhone } from './mobile/player-chrome-phone'
import { PlayerControlRow, PlayerFavouritesRow, PlayerScheduleOverlay, PlayerTopBar, playerScale } from './player-chrome-parts'

export interface TvPlayerChromeProps {
  channel: M3uChannel
  tv: LiveTvPlayerTvProps
  controls?: LiveTvPlayerControls
  paused: boolean
  onTogglePause: () => void
  onClose: () => void
  /** Telefon i liggande läge med `fullscreenOnRotate` — räknas av `live-tv-player.tsx`. */
  phoneLandscape?: boolean
}

/**
 * Tidig gren för telefonen (fas 3): ett EGET komponentträd, inte en `if` inne
 * i skrivbordskromet. `tv.phone` läses ur lådans bredd och kan slå om under
 * spelningen (rotation); två separata komponenter monteras om rent, medan en
 * villkorlig retur före krokarna hade gett "rendered more hooks"-kraschen.
 * Envägsimport: telefonkromet vet ingenting om den här filen.
 */
export function TvPlayerChrome(props: TvPlayerChromeProps) {
  if (props.tv.phone) {
    const { phoneLandscape, ...rest } = props
    return <TvPlayerChromePhone {...rest} landscape={phoneLandscape ?? false} />
  }
  return <TvPlayerChromeDesktop {...props} />
}

/**
 * Skrivbords- och TV-kromet: den gamla layouten (före 2026-09-14) tillbaka.
 *
 * Toppfält (logotyp · namn · nu-rad · Sen-kort · LIVE/kvalitet/klocka · Stäng),
 * bottenfält (programförlopp → kontrollrad med 44 px-knappar → favoritrad)
 * och ett EPG-överlägg på Guide. Delarna bor i `player-chrome-parts.tsx`;
 * den här filen äger tillståndet: synlighet, överlägget, glasmenyn, fokus
 * och tangentbordet.
 *
 * Spelaren är en portal på `document.body`, utanför skalets
 * `[data-live-tv-tv-root]`. Roten här bär därför samma attribut (+
 * `data-live-tv-desktop` utanför TV-läget) och monterar `TvFocusStyle` själv,
 * så att TV får den grå fokuskanten via `data-guide-row` och skrivbordet
 * ingen accentkant alls — även när spelaren öppnas utan skalet (startsidan,
 * rutnätet).
 */
function TvPlayerChromeDesktop({ channel, tv, controls, paused, onTogglePause, onClose }: TvPlayerChromeProps) {
  const { tt } = useTvText()
  const isTv = useTvMode()
  const ps = useMemo(() => playerScale(isTv), [isTv])
  const clock = useTvClockNode(tv.locale)
  const [visible, setVisible] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const timerRef = useRef<number | null>(null)
  const dotsRef = useRef<HTMLDivElement | null>(null)
  const volumeRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  /** Musen vilar på ett fält: ingen göm-timer så länge den är kvar där. */
  const hoverRef = useRef(false)
  const TvGlassMenu = getTvGlassMenu()
  const info = tv.nowFor(channel)
  // 0 = dölj aldrig (LiveTvPlayerTvProps-kommentaren). Ingen egen tröskel
  // ovanpå inställningen — README §9 anger just "4 s (inställning)", inget
  // golv.
  const hideMs = tv.bannerHideMs

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])
  const reveal = useCallback(() => {
    setVisible(true)
    clearTimer()
    if (hideMs > 0 && !guideOpen && !menu && !hoverRef.current) timerRef.current = window.setTimeout(() => setVisible(false), hideMs)
  }, [hideMs, guideOpen, menu, clearTimer])
  /**
   * Fälten stannar kvar medan musen vilar på dem (gamla `keepControlsVisible`).
   * Flaggan och inte bara en rensad timer: fönstrets pointermove-lyssnare
   * nedan kallar `reveal` vid varje rörelse INNE i fältet också, och hade
   * annars satt om timern under musen.
   */
  const keep = useCallback(() => { hoverRef.current = true; setVisible(true); clearTimer() }, [clearTimer])
  const release = useCallback(() => { hoverRef.current = false; reveal() }, [reveal])
  useEffect(() => { reveal(); return clearTimer }, [reveal, clearTimer, channel])

  /**
   * Musen visar fälten igen — utanför TV-läget. På TV finns bara fjärren
   * (varje tangent väcker nedan); på skrivbordet leder musen (spec §4.5).
   */
  useEffect(() => {
    if (isTv) return
    const onPointer = () => reveal()
    window.addEventListener('pointermove', onPointer)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [isTv, reveal])

  const index = tv.neighbours.findIndex((c) => channelKey(c) === channelKey(channel))
  const step = useCallback((delta: 1 | -1) => {
    if (tv.neighbours.length === 0) return
    const next = tv.neighbours[(index + delta + tv.neighbours.length) % tv.neighbours.length]
    if (next) tv.onSwitchChannel(next)
  }, [tv, index])

  /**
   * Var kromets lager står just nu, läst av fokusslingan nedan.
   *
   * Slingan får inte läsa `menu`/`guideOpen` direkt: den lever i en effekt som
   * bara ska starta om när KANALEN byts, annars börjar den om varje gång ett
   * lager öppnas och stjäl då fokus från just det lagret.
   */
  const layerRef = useRef({ menuOpen: false, guideOpen: false, gateOpen: false })
  useEffect(() => { layerRef.current = { menuOpen: menu !== null, guideOpen, gateOpen: tv.gateOpen } })

  /**
   * ⋯ tar fokus när spelaren öppnas — kromets enda `data-init`.
   *
   * Skalet hoppar över sin fokuseffekt medan spelaren är öppen
   * (`tv-shell.tsx`: `if (active) return`), och värdens fokusmotor kallas bara
   * när en SIDA monteras. Fokus blev därför kvar på stationen i vyn BAKOM
   * spelaren (uppmätt i tv-sim: `guide-row`). Självhävdande slinga: fokus
   * sätts om tills det suttit kvar några bildrutor, för spelarens egen
   * uppstart (yta, hls, värdens motor) flyttar fokus sent. Slingan avstår
   * medan glasmenyn, överlägget eller PIN-grinden är öppen och ger upp efter
   * fyra sekunder.
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
      const inLayer = layerRef.current.menuOpen || layerRef.current.guideOpen || layerRef.current.gateOpen
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
   * Stäng överlägget och lämna ALDRIG fokus på `body`.
   *
   * Försvinner raderna medan en av dem har fokus faller fokus till
   * `document.body`, och då har fjärrkontrollen ingen station att gå vidare
   * från. ⋯ är kromets data-init-station och den rätta platsen att landa på.
   * setTimeout 0: fokus måste sättas EFTER att React tagit bort raderna.
   */
  const closeGuide = useCallback(() => {
    setGuideOpen(false)
    window.setTimeout(() => dotsRef.current?.focus({ preventScroll: true }), 0)
  }, [])
  const toggleGuide = useCallback(() => {
    if (guideOpen) closeGuide()
    else { setGuideOpen(true); setVisible(true); clearTimer() }
  }, [guideOpen, closeGuide, clearTimer])
  const switchChannel = useCallback((next: M3uChannel) => {
    if (guideOpen) closeGuide()
    tv.onSwitchChannel(next)
  }, [guideOpen, closeGuide, tv])

  // Tangenter: varje tangent visar fälten, ChannelUp/Down zappar, Back
  // stänger överlägget eller (annars) spelaren.
  //
  // `stopImmediatePropagation` och inte bara `stopPropagation`: tre
  // capture-lyssnare (skal, spelare, kromet) sitter på SAMMA mål (`window`),
  // och `stopPropagation` stoppar bara vidare BUBBLING/CAPTURE till andra
  // MÅL i trädet — inte syskonlyssnare på samma mål, som körs i
  // registreringsordning. Spelarens lyssnare läggs om varje gång dess
  // beroenden ändras, så "kromet monterades före spelaren"-ordningen går inte
  // att lita på. `stopImmediatePropagation` hindrar DOM:en från att kalla
  // några fler lyssnare alls för just den här händelsen, oavsett ordning.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (menu) return // glasmenyn stänger sig själv på Back (host TvGlassMenu)
      if (tv.gateOpen) return // PIN-grinden äger Enter/Back medan den är uppe (tv-shell.tsx)
      if (event.key === 'ChannelUp' || event.key === 'PageUp') { event.preventDefault(); event.stopImmediatePropagation(); step(1); return }
      if (event.key === 'ChannelDown' || event.key === 'PageDown') { event.preventDefault(); event.stopImmediatePropagation(); step(-1); return }
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (guideOpen) {
          closeGuide()
          return
        }
        onClose()
        return
      }
      // ◂ ▸ och OK ÄGS av spelaren när fokus står utanför kromet.
      //
      // Spelaren täcker skärmen men tar inte fokus: `document.activeElement`
      // står kvar på stationen i vyn BAKOM (uppmätt i tv-sim: `guide-row`).
      // Utan det här bytte ▸ kategori i guiden bakom (toppbandet tappade sin
      // kanal), och OK startade om samma kanal. Står fokus INNE i kromet
      // släpps de igenom: där ska OK trycka knappen och sidopilarna flytta
      // fokus mellan stationerna (och styra volymreglaget).
      const target = event.target
      const insideChrome = target instanceof Node && rootRef.current?.contains(target) === true
      if (!insideChrome && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        event.stopImmediatePropagation()
        reveal()
        return
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { if (!insideChrome) event.preventDefault(); reveal(); return }
      reveal()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu, guideOpen, step, reveal, onClose, closeGuide, tv.gateOpen])

  const openMenu = (element: HTMLElement) => {
    setMenu({
      title: `${channel.name}${info.now ? ` · ${info.now.title}` : ''}`,
      element,
      actions: [
        { key: 'guide', label: tt('menuGuide'), run: () => { setGuideOpen(true); setVisible(true); clearTimer() } },
        { key: 'multi', label: tt('menuMultiview'), run: tv.onOpenMultiview },
        { key: 'pause', label: paused ? tt('menuResume') : tt('menuPause'), run: onTogglePause },
        { key: 'fav', label: tv.favourite ? tt('menuRemoveFavourite') : tt('menuAddFavourite'), run: tv.onToggleFavourite },
        { key: 'info', label: tt('menuChannelDetails'), run: tv.onOpenChannelDetails },
      ],
    })
  }
  /** Håll OK / högerklick på ett favoritchip: lägg kanalen i multivyn. */
  const holdChip = (c: M3uChannel, el: HTMLElement) => setMenu({ title: c.name, element: el, actions: [{ key: 'multi', label: tt('menuAddMultiview'), run: () => tv.onAddToMultiview(c) }] })

  return (
    // Roten släpper igenom pekaren till videon; bara fälten tar den.
    <div ref={rootRef} data-live-tv-tv-root="" {...(isTv ? {} : { 'data-live-tv-desktop': '1' })} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}>
      <TvFocusStyle />
      <PlayerTopBar channel={channel} tv={tv} info={info} ps={ps} visible={visible} clock={clock} onClose={onClose} onKeep={keep} onRelease={release} />
      <div
        data-testid="banner"
        onMouseEnter={keep}
        onMouseLeave={release}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, padding: `${ps(48)}px ${ps(20)}px ${ps(20)}px`, background: 'linear-gradient(0deg, rgba(0,0,0,0.85), rgba(0,0,0,0.55) 55%, transparent)', opacity: visible ? 1 : 0, transition: 'opacity 200ms', pointerEvents: visible ? 'auto' : 'none', color: '#f3f4f8' }}
      >
        <PlayerControlRow channel={channel} tv={tv} info={info} ps={ps} isTv={isTv} paused={paused} onTogglePause={onTogglePause} controls={controls} guideOpen={guideOpen} onToggleGuide={toggleGuide} dotsRef={dotsRef} onOpenMenu={openMenu} volumeRef={volumeRef} />
        <PlayerFavouritesRow channel={channel} tv={tv} ps={ps} onSwitch={switchChannel} onHold={holdChip} />
      </div>
      <PlayerScheduleOverlay channel={channel} tv={tv} ps={ps} open={guideOpen} onClose={closeGuide} onSwitch={switchChannel} onHoldChip={holdChip} overlayRef={overlayRef} />
      {/* Roten släpper igenom pekaren; menyn måste ta den själv. */}
      {TvGlassMenu && menu ? <div style={{ pointerEvents: 'auto' }}><TvGlassMenu target={menu} onClose={() => { setMenu(null); reveal() }} /></div> : null}
    </div>
  )
}
