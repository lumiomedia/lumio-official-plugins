'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getTvKeyboardPanel, useTvMode } from '@/lib/plugin-sdk'
import { TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvKeyboard } from './tv-keyboard'

/**
 * Fälttypen styr BARA det riktiga fältet utanför TV-läget: värdens
 * tangentbordspanel har en egen inmatning och tar inget typargument, så
 * TV-grenen ignorerar `kind` medvetet.
 */
export type TextPromptKind = 'text' | 'password' | 'url' | 'username'

/**
 * Enter mitt i en IME-komposition (japanska, kinesiska, koreanska) bekräftar
 * kandidatlistan — inte formuläret. `isComposing` finns på den nativa
 * händelsen; `keyCode === 229` är samma sak från äldre webviews som inte
 * sätter flaggan.
 */
function isComposing(event: { nativeEvent: KeyboardEvent; keyCode: number }): boolean {
  return event.nativeEvent.isComposing === true || event.keyCode === 229
}

/**
 * EN textinmatning, tre inmatningsvägar.
 * TV-läge: värdens TvKeyboardPanel (som useKeyboardPrompt gjorde tidigare i
 *   tv-settings.tsx, flyttad hit ordagrant — se kommentarerna nedan om
 *   fällorna: id-nyckeln mot återanvänd useState, öppnaren fångad en gång,
 *   data-live-tv-host-ui, onDone+onClose-fällan, ingen pushLayer).
 * Utanför TV: en rad med ett riktigt <input> i en liten dialog — inget
 *   skärmtangentbord på skrivbord.
 */
export function useTextPrompt(options?: {
  /**
   * Skalets lagerstack (`nav.pushLayer`). Bara icke-TV-dialogen registreras:
   * den äger INTE Back själv, så utan lagret stängde skalets Bakåt (Esc eller
   * Bakåt-posten i ikonraden) vyn BAKOM den öppna dialogen.
   *
   * Värdens TV-panel registreras aldrig — den är VÄRDENS UI
   * (`data-live-tv-host-ui`), äger Back själv och stänger sig själv. Två
   * stängare på samma Back hade stängt både panelen och vyn bakom.
   */
  pushLayer?: (close: () => void) => () => void
}): {
  available: boolean
  ask: (title: string, initial: string, onDone: (value: string) => void, kind?: TextPromptKind) => void
  node: ReactNode
} {
  const tvMode = useTvMode()
  const Panel = getTvKeyboardPanel()
  /**
   * `id` finns för `key` på panelen/dialogen nedan: två prompts i rad ligger
   * på SAMMA plats i trädet, så React återanvänder komponenten och dess
   * `useState` behåller förra stegets text. Xtream-guidens andra steg
   * öppnades då med serveradressen redan i fältet och användarnamnet blev
   * "http://panel:8080jerry". Ett nytt id per öppning tvingar en ommontering.
   */
  const [prompt, setPrompt] = useState<{ id: number; title: string; initial: string; kind: TextPromptKind; onDone: (value: string) => void } | null>(null)
  const promptId = useRef(0)
  /**
   * Öppnaren fångas EN gång per öppning — samma regel som de andra lagren
   * (tv-channel-picker.tsx, hubbens spellistmeny).
   *
   * Effekten beror bara på om prompten är öppen. Läste den i stället
   * `document.activeElement` vid varje omrender (minuttick, lagringsändring)
   * hade den skrivit över öppnaren med prompthans egen knapp, och fokus efter
   * stängning landat på en nod som just tagits bort — i praktiken på `body`,
   * där fjärrkontrollen (eller Tab) inte har någon station att gå vidare
   * från.
   */
  const open = prompt !== null
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement as HTMLElement | null
    return () => { const opener = openerRef.current; window.setTimeout(() => opener?.focus({ preventScroll: true }), 0) }
  }, [open])

  const ask = (title: string, initial: string, onDone: (value: string) => void, kind: TextPromptKind = 'text') => {
    promptId.current += 1
    setPrompt({ id: promptId.current, title, initial, kind, onDone })
  }

  let node: ReactNode = null
  if (tvMode) {
    // TvKeyboardPanel positionerar sig `inset: 0` mot närmaste positionerade
    // förälder, därför omslutningen här. `data-live-tv-host-ui` gör att
    // skalets Back-hantering (tv-shell.tsx) står tillbaka medan panelen är
    // öppen — den stänger sig själv.
    node = Panel && prompt ? (
      <div data-live-tv-host-ui="" style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
        <Panel
          key={prompt.id}
          title={prompt.title}
          initial={prompt.initial}
          onDone={(value: string) => { setPrompt(null); prompt.onDone(value) }}
          /*
            VÄRDENS panel anropar `onDone` OCH `onClose` på samma tryck (Klar
            och Enter i systemtangentbordet gör båda, se components/tv/
            tv-settings-rows.tsx). Ett `setPrompt(null)` rakt av stängde
            därför den prompt som `onDone` just hade öppnat: Xtream-guiden
            (server → användarnamn → lösenord) tog ALDRIG sig förbi första
            steget på en riktig TV. Stäng bara om det fortfarande är DEN HÄR
            prompten som står öppen; har onDone kedjat vidare är `current` en
            annan och lämnas i fred. Back (som bara ropar onClose) fungerar
            som förut.
          */
          onClose={() => setPrompt((current) => (current === prompt ? null : current))}
        />
      </div>
    ) : null
  } else if (prompt) {
    node = (
      <TextPromptDialog
        key={prompt.id}
        title={prompt.title}
        initial={prompt.initial}
        kind={prompt.kind}
        pushLayer={options?.pushLayer}
        onDone={(value) => { setPrompt(null); prompt.onDone(value) }}
        onCancel={() => setPrompt((current) => (current === prompt ? null : current))}
      />
    )
  }

  return { available: tvMode ? Panel !== null : true, ask, node }
}

/**
 * Icke-TV-grenen: en liten dialog i scenlådan. Till skillnad från värdens
 * panel äger den INTE Back själv — den registreras därför som ett lager
 * (`pushLayer`) så att skalets Bakåt stänger dialogen FÖRST och vyn bakom
 * står kvar. `data-panel-root` gör att motorns pilar (om de är aktiva utanför
 * TV också) stannar i den, samma mönster som `tv-channel-picker.tsx`.
 */
function TextPromptDialog({ title, initial, kind, pushLayer, onDone, onCancel }: {
  title: string
  initial: string
  kind: TextPromptKind
  pushLayer?: (close: () => void) => () => void
  onDone: (value: string) => void
  onCancel: () => void
}) {
  const { tt } = useTvText()
  const [value, setValue] = useState(initial)
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  // Lagret registreras EN gång per dialog (den får ny `key` per prompt, så
  // monteringen ÄR öppningen) och avregistreras när den stängs — annars hade
  // nästa Bakåt ätits av en stängare för en dialog som inte finns kvar.
  const cancelRef = useRef(onCancel)
  useEffect(() => { cancelRef.current = onCancel })
  useEffect(() => pushLayer?.(() => cancelRef.current()), [pushLayer])
  const submit = () => onDone(value)
  // `type="password"` maskerar, `url`/`username` stänger av rättstavning och
  // versalisering — ett Xtream-användarnamn som mobilen inledde med versal
  // gav "Could not sign in to the panel" utan något synligt fel i fältet.
  const field: { type: string; inputMode?: 'url' | 'text'; autoCapitalize?: string; autoCorrect?: string; spellCheck?: boolean } =
    kind === 'password' ? { type: 'password', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }
      : kind === 'url' ? { type: 'url', inputMode: 'url', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }
        : kind === 'username' ? { type: 'text', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }
          : { type: 'text' }
  return (
    <div
      data-testid="text-prompt-dialog"
      data-panel-root=""
      style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: TV.scrim }}
    >
      <div style={{ width: dp(420), borderRadius: dp(14), background: TV.panel, border: `1px solid ${TV.line}`, padding: dp(24), display: 'flex', flexDirection: 'column', gap: dp(16) }}>
        <div style={{ fontSize: dp(20), fontWeight: 600 }}>{title}</div>
        <input
          ref={inputRef}
          data-testid="text-prompt-input"
          {...field}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { if (isComposing(event)) return; event.preventDefault(); submit() }
            else if (event.key === 'Escape') { event.preventDefault(); onCancel() }
          }}
          style={{ height: dp(44), borderRadius: dp(8), border: `1px solid ${TV.lineCard}`, background: TV.s08, color: TV.text, padding: `0 ${dp(12)}px`, fontSize: dp(16) }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: dp(10) }}>
          <div {...station(onCancel)} style={{ height: dp(38), minHeight: dp(38), padding: `0 ${dp(16)}px`, borderRadius: 999, background: TV.s12, display: 'inline-flex', alignItems: 'center', fontSize: dp(15), cursor: 'pointer' }}>{tt('cancel')}</div>
          <div {...station(submit)} style={{ height: dp(38), minHeight: dp(38), padding: `0 ${dp(16)}px`, borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', fontSize: dp(15), fontWeight: 600, cursor: 'pointer' }}>{tt('keyDone')}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Sökfältet: TV-tangentbordet eller ett fokuserat <input>.
 * I TV-läge exakt dagens `TvKeyboard` (tv-keyboard.tsx rörs inte). Utanför TV
 * ett `<input>` som får fokus vid montering, med `data-f` så motorns pilar
 * kan lämna det (appens A3 undantar textfält från pilarna, alltså lämnar man
 * fältet med Tab eller musen — det är avsiktligt: pilar ska flytta markören
 * i texten).
 */
export function TvTextField({ value, onChange, onSubmit, placeholder, autoFocus }: {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const tvMode = useTvMode()
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (!tvMode && autoFocus) inputRef.current?.focus()
  }, [tvMode, autoFocus])
  if (tvMode) {
    return <TvKeyboard value={value} onChange={onChange} onDone={onSubmit ?? (() => {})} initFocus={!!autoFocus} />
  }
  return (
    <input
      ref={inputRef}
      data-f=""
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { if (isComposing(event)) return; event.preventDefault(); onSubmit?.() }
      }}
      style={{ height: dp(64), borderRadius: dp(14), background: TV.s10, border: `1px solid ${TV.line}`, color: TV.text, padding: `0 ${dp(20)}px`, fontSize: dp(20) }}
    />
  )
}
