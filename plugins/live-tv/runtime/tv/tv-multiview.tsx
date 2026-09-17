'use client'

import { useEffect, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Icons, Segment, Tag, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { useNarrowSurface } from '../hooks/useNarrowSurface'
import { assignTile, enlargeTile, removeTile, setLayout, setMultiviewState, useMultiviewState, type MultiviewLayout, type MultiviewState } from './tv-multiview-store'
import { narrowVisibleIndices } from './multiview-slots'
import { useVideoSurface, videoSurfaceCapabilities } from './video-surface'
import { TvChannelPicker } from './tv-channel-picker'
import { TvMultiviewPhone } from './mobile/multiview-phone'

const GRID: Record<MultiviewLayout, { columns: string; rows: string }> = {
  2: { columns: '1fr 1fr', rows: '1fr' },
  3: { columns: '2fr 1fr', rows: '1fr 1fr' },
  4: { columns: '1fr 1fr', rows: '1fr 1fr' },
}
/** Smal yta (spec §8.5 / plan P10): två rutor staplade lodrätt i stället för sida vid sida. */
const NARROW_GRID = { columns: '1fr', rows: '1fr 1fr' }

export function TvMultiview(props: TvViewProps) {
  if (props.phone) return <TvMultiviewPhone {...props} />
  const { model, nav } = props
  const { tt } = useTvText()
  const state = useMultiviewState()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const narrow = useNarrowSurface(rootRef)
  /**
   * FORCERAD SMAL LAYOUT — REN VISNING, INGEN MUTATION. På en smal yta visas
   * bara två rutor (audiorutan + en till, se `narrowVisibleIndices`), rakt
   * av utan kompaktering — så en tilldelning som görs härifrån (`onOk`,
   * `onHold`, kanalväljaren) kan gå direkt mot `state` med samma VERKLIGA
   * index och ändra EXAKT den rutan, utan att röra `state.layout` (Jerrys
   * beslut: "det sparade valet rörs inte" gäller även vid tilldelning, inte
   * bara vid mätning). Just därför bygger `update(...)`-anropen nedan alltid
   * på `state` och det verkliga indexet (`realIndex`), ALDRIG på ett index i
   * `slots` — annars hade en tilldelning på en smal yta av misstag sparat
   * layout 2 och ätit upp de rutor som inte syns. `state.layout` (2/3/4)
   * kommer tillbaka av sig självt så fort `useNarrowSurface()` blir falskt
   * igen (telefon i landskap, fönster som breddas).
   */
  const slots = narrow
    ? narrowVisibleIndices(state).map((realIndex) => ({ realIndex, key: state.tiles[realIndex] ?? null }))
    : state.tiles.map((key, realIndex) => ({ realIndex, key }))
  const [pickerTile, setPickerTile] = useState<number | null>(null)
  const caps = videoSurfaceCapabilities()
  const update = (next: MultiviewState) => setMultiviewState(next)
  const audioChannel = state.tiles[state.audioIndex] ? model.byKey.get(state.tiles[state.audioIndex]!) ?? model.allChannels.find((c) => channelKey(c) === state.tiles[state.audioIndex]) ?? null : null

  /**
   * FOKUS VID SMALNING (granskningsfynd): skalets montingsfokus (`[data-init]`
   * vid sidbyte) körs bara vid navigering, inte när ytan smalnar av under
   * pågående multivy. Två rutor unmountas då tyst, och om fokus stod där
   * hoppar webbläsaren tillbaka till `<body>` — osynligt, men fjärren/tabben
   * "tappar bort sig". Effekten kör bara vid övergången TILL smalt (inte vid
   * varje rendering) och bara om fokus verkligen lämnat vyn.
   */
  useEffect(() => {
    if (!narrow) return
    const root = rootRef.current
    if (!root) return
    const active = document.activeElement
    if (active && root.contains(active)) return
    root.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true })
  }, [narrow])

  // Ljudrutan är alltid levande (den konsumerar ingen budget här); övriga
  // rutor får levande ytor i rutordning tills kapaciteten (maxLive - 1) tar slut.
  //
  // INVARIANT: `liveLeft` är en renderlokal räknare som MINSKAS INNE i
  // `state.tiles.map()` nedan (`liveLeft-- > 0`). Den fungerar bara så länge
  // tre saker gäller:
  //
  //  1. Den nollställs vid VARJE rendering — den deklareras därför här i
  //     komponentkroppen, aldrig i en `useRef`/modulvariabel. En räknare som
  //     överlevde renderingen hade tömts på första omritningen och alla rutor
  //     utom ljudrutan blivit svarta stillbilder för alltid.
  //  2. Rutorna gås igenom i rutordning, exakt en gång per rendering. Lägg
  //     aldrig in ett andra `map` över samma rutor (t.ex. en förberäkning),
  //     då dubbelräknas budgeten.
  //  3. Inget villkor kortsluter förbi `liveLeft--` för en ruta som ändå
  //     visas: `hasAudio ||` står först just för att ljudrutan INTE ska dra
  //     från budgeten, och det är den enda tillåtna kortslutningen.
  const liveBudget = Math.max(0, caps.maxLive - 1)
  let liveLeft = liveBudget

  return (
    <div ref={rootRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `${dp(34)}px ${dp(48)}px ${dp(32)}px`, gap: dp(18) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(20) }}>
        <span style={{ fontSize: dp(34), fontWeight: 600 }}>{tt('multiview')}</span>
        {/* Segment<K extends string> tar bara strängnycklar — layout (2|3|4) är
            numerisk, så vi växlar via strängar och tolkar tillbaka i onChange.
            Döljs på en smal yta: bara två rutor visas där (se `slots` ovan),
            och växeln ska inte kunna skriva över det sparade valet medan
            ytan är smal. */}
        {narrow ? null : (
          <Segment<string>
            options={[{ key: '2', label: tt('layout2') }, { key: '3', label: tt('layout3') }, { key: '4', label: tt('layout4') }]}
            value={String(state.layout)}
            onChange={(key) => update(setLayout(state, Number(key) as MultiviewLayout))}
          />
        )}
        {/* Fjärrhjälpen ("OK on a tile = ...") är borttagen helt (Jerrys
            uppföljning): bara ljudetiketten är innehåll och blir kvar. */}
        <span data-testid="mv-audio-help" style={{ marginLeft: 'auto', fontSize: dp(18), color: 'rgba(243,244,248,0.6)', textAlign: 'right' }}>
          {audioChannel ? <><span>{tt('audioLabel')}: </span><strong style={{ color: TV.text }}>{audioChannel.name}</strong></> : null}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: (narrow ? NARROW_GRID : GRID[state.layout]).columns, gridTemplateRows: (narrow ? NARROW_GRID : GRID[state.layout]).rows, gap: dp(16) }}>
        {slots.map(({ realIndex, key }) => {
          const channel = key ? model.byKey.get(key) ?? model.allChannels.find((c) => channelKey(c) === key) ?? null : null
          const hasAudio = realIndex === state.audioIndex && channel !== null
          const live = hasAudio || (channel !== null && liveLeft-- > 0)
          return (
            <Tile
              key={`${realIndex}:${key ?? 'empty'}`}
              index={realIndex}
              channel={channel}
              hasAudio={hasAudio}
              live={live}
              isInit={realIndex === state.audioIndex}
              span={!narrow && state.layout === 3 && realIndex === 0}
              nowTitle={channel ? model.nowFor(channel).now?.title ?? null : null}
              number={channel ? model.channelNumber(channel) : null}
              onOk={() => {
                if (!channel) { setPickerTile(realIndex); return }
                update({ ...state, audioIndex: realIndex })
              }}
              onHold={(el) => {
                if (!channel) { setPickerTile(realIndex); return }
                nav.openMenu({
                  title: channel.name,
                  element: el,
                  actions: [
                    { key: 'audio', label: tt('menuAudioHere'), run: () => update({ ...state, audioIndex: realIndex }) },
                    { key: 'switch', label: tt('menuSwitchChannel'), run: () => setPickerTile(realIndex) },
                    // "Förstora" byter layout till 1+2 (`enlargeTile`) — en
                    // riktig skrivning av det sparade valet, så den döljs på
                    // en smal yta (samma regel som kapacitetsväxeln ovan).
                    ...(narrow ? [] : [{ key: 'enlarge', label: tt('menuEnlarge'), run: () => update(enlargeTile(state, realIndex)) }]),
                    { key: 'full', label: tt('menuFullscreen'), run: () => nav.play({ channel }) },
                    { key: 'remove', label: tt('menuRemoveTile'), run: () => update(removeTile(state, realIndex)) },
                  ],
                })
              }}
            />
          )
        })}
      </div>
      {pickerTile !== null ? (
        <TvChannelPicker model={model} nav={nav} title={tt('pickChannelFor', { n: pickerTile + 1 })} onPick={(channel: M3uChannel) => update(assignTile(state, pickerTile, channelKey(channel)))} onClose={() => setPickerTile(null)} />
      ) : null}
    </div>
  )
}

function Tile({ index, channel, hasAudio, live, isInit, span, nowTitle, number, onOk, onHold }: {
  index: number; channel: M3uChannel | null; hasAudio: boolean; live: boolean; isInit: boolean; span: boolean; nowTitle: string | null; number: number | null
  onOk: () => void; onHold: (el: HTMLElement) => void
}) {
  const { tt } = useTvText()
  const ref = useRef<HTMLDivElement | null>(null)
  const surface = useVideoSurface(ref, channel && live ? { channel, url: channel.url } : null, { muted: !hasAudio, audio: hasAudio, enabled: live })
  const showsVideo = live && surface.live && !surface.failed
  return (
    // GENOMSKINLIG MEDAN YTAN LEVER. På mpv/media3 ligger videon i en vy UNDER
    // webbvyn — `#05070d` här målade alltså över bilden och gav ljud utan bild.
    // Skalet klipper samtidigt ett hål i sin egen bakgrund (`surface-cutouts`).
    // Tom eller laddande ruta behåller plattan; ramen, etikettgradienten och
    // fokusringen är överlager inne i rutan och påverkas inte.
    <div ref={ref} data-testid="mv-tile" {...station(onOk, onHold, isInit ? { 'data-init': '' } : undefined)} style={{ position: 'relative', borderRadius: dp(14), border: `1px solid ${TV.lineCard}`, overflow: 'hidden', background: showsVideo ? 'transparent' : '#05070d', gridRow: span ? 'span 2' : undefined, cursor: 'pointer', minHeight: 0 }}>
      {channel && !showsVideo ? <ChannelArt channel={channel} style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /> : null}
      {channel ? (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `${dp(40)}px ${dp(18)}px ${dp(14)}px`, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.8))', display: 'flex', alignItems: 'baseline', gap: dp(10), whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)' }}>{number ?? ''}</span>
            <span style={{ fontSize: dp(19), fontWeight: 600 }}>{channel.name}</span>
            {nowTitle ? <span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.7)', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {nowTitle}</span> : null}
          </div>
          {/* Tag-varianten "audio" sätter versaler via CSS (text-transform), vilket
              inte syns i textContent — DOM-texten uppercasas därför explicit här så
              att den matchar den versala etiketten i design (LJUD/AUDIO). */}
          {hasAudio ? <span style={{ position: 'absolute', top: dp(12), right: dp(14) }}><Tag variant="audio">{tt('audioLabel').toUpperCase()}</Tag></span> : null}
          {!live || !surface.live ? <span style={{ position: 'absolute', top: dp(12), left: dp(14), fontFamily: TV.mono, fontSize: dp(12), letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,244,248,0.55)' }}>{surface.failed ? tt('tileFailed') : tt('frameLabel')}</span> : null}
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: dp(8), color: 'rgba(243,244,248,0.7)' }}>
          <Icons.Plus /><span style={{ fontSize: dp(20) }}>{tt('pickChannel')}</span>
        </div>
      )}
    </div>
  )
}
