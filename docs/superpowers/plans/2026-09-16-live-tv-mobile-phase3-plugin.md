# Live TV fas 3 — telefonen i riktiga pixlar

> **För agenter:** OBLIGATORISK UNDERSKILL: `superpowers:subagent-driven-development` (rekommenderas) eller `superpowers:executing-plans`. Stegen använder kryssrutor (`- [ ]`).

**Mål:** Telefonen (< 640 css-px) får en egen, touch-anpassad gren i samma TV-komponenter — flik-rad, bottenark, en kolumn, riktiga px — enligt handoffen `Moviefinder/design_handoff_live_tv_mobile/`.

**Arkitektur:** Appens scenlåda slutar skala telefonen (skala 1). Pluginets skal läser `phone` en gång och skickar den som prop; varje vy grenar tidigt till en telefonkomponent som delar hooks/modell med TV-grenen men ritar handoffens layout med tokens ur `runtime/tv/mobile/mobile-tokens.ts`. Fas 2:ans skalade telefongren (låda, golv) tas bort.

**Teknik:** React 19, TypeScript strict, vitest + happy-dom + @testing-library/react. Inline-stilar (inga CSS-moduler). `@/lib/plugin-sdk` löses i test mot `src/__test-stubs__/plugin-sdk.ts`.

**Spec:** `docs/superpowers/specs/2026-09-16-live-tv-mobile-phase3-design.md` (kodmappning) + `Moviefinder/design_handoff_live_tv_mobile/README.md` (normativa mått, läs sektionen för din vy innan du kodar) + `Live TV - mobil.dc.html` (öppna i webbläsare för utseendet).

## Globala villkor

- Plugin: gren `feature/live-tv-mobile-phase3`, arbetsträd `/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/mobile-phase3`. Alla plugin-kommandon körs från `plugins/live-tv/` där. Baslinje: 616 gröna tester.
- App: gren `feature/live-tv-mobile-phase3-app`, arbetsträd `/Users/jerry/Local Sites/Moviefinder/.worktrees/mobile-phase3-app`.
- `plugin.json`: version `0.9.0`, `minAppVersion` `0.1.600` — bumpas i SISTA tasken, EFTER att `dist/runtime.js` byggts om mot fas 3-appträdet. `plugins/live-tv/package.json` i lockstep. App: `0.1.600` i `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml`, samma sista task.
- Telefon = `data-tv-scene-phone="1"` på scenlådan (appen skriver den; tester sätter den själva). Saknas attributet → pluginet beter sig som skrivbord/TV, oförändrat.
- **Riktiga px i telefongrenen.** `dp()` är identitet — skriv talen ur handoffen rakt av. Inga `phoneTextFloor`/`phoneHitFloor`/`PHONE_HIT_MIN_DP` (de tas bort i Task P2).
- Handoffens touch-regler är review-krav: (1) textblock i rad = `flex: 1; minWidth: 0` + ellips; (2) `minHeight`, aldrig `height`, på rader med text; (3) träffytor ≥ 44 px; (4) text ≥ 13 px, `<input>` ≥ 16 px; (5) sidhuvud `padding-left: 60px`; (6) inga fjärrkontrollsord ("OK", "håll") i telefon-UI; (7) `env(safe-area-inset-*)` i flik-rad, ark och liggande spelare.
- Telefongrenen får inte ändra en rad i TV/skrivbordsgrenen. Befintliga tester körs oförändrade (utom de golvtester som tas bort i P2 tillsammans med golvet).
- Teststubbens `useLang()` står på `'en'`. Nya strängar läggs i BÅDE `EN` och `SV` i `tv-strings.ts`.
- `plugins/twitch/dist/runtime.js` får aldrig med i en commit (den ligger modifierad i huvudträdet, inte här — men kontrollera `git status` före varje commit). Svenska kommentarer i koden, ingen AI-attribution i commits.
- Commit-mönster: `live-tv: <vad>` i pluginrepot, `tv-scene: <vad>` i appen.

---

### Task P0: Appen — telefongrenen slutar skala (skala 1, tröskel 640, kortaste sidan)

**Arbetsträd:** `/Users/jerry/Local Sites/Moviefinder/.worktrees/mobile-phase3-app`

**Filer:**
- Ändra: `lib/tv-scene.ts` (`TV_SCENE_PHONE_PX`, `TV_SCENE_PHONE_WIDTH`, `tvSceneBox()`)
- Test: `lib/__tests__/tv-scene-box.test.ts`

**Gränssnitt (producerar):** `tvSceneBox(w, h)` returnerar `{ scale: 1, width: w, height: h, phone: true, narrow: true, viewportWidth: w, viewportHeight: h }` när `Math.min(w, h) < 640`. `TV_SCENE_PHONE_PX = 640`. `TV_SCENE_PHONE_WIDTH` finns inte längre.

- [ ] **Steg 1: Läs** `lib/tv-scene.ts` rad 70–150 och 340–370 samt befintliga telefontester i `lib/__tests__/tv-scene-box.test.ts` (`grep -n "phone\|PHONE" lib/__tests__/tv-scene-box.test.ts`).

- [ ] **Steg 2: Skriv de fallerande testerna** (ersätt de befintliga telefonfallen som antar 780/0,5):

```ts
describe('tvSceneBox — telefon (fas 3: riktiga pixlar)', () => {
  it('390×844: skala 1, lagret = lådan, phone + narrow', () => {
    const v = tvSceneBox(390, 844)
    expect(v.phone).toBe(true)
    expect(v.narrow).toBe(true)
    expect(v.scale).toBe(1)
    expect(v.width).toBe(390)
    expect(v.height).toBe(844)
  })
  it('844×390 (telefon i liggande): phone via kortaste sidan', () => {
    const v = tvSceneBox(844, 390)
    expect(v.phone).toBe(true)
    expect(v.scale).toBe(1)
    expect(v.width).toBe(844)
    expect(v.height).toBe(390)
  })
  it('639×900 är telefon, 640×900 är det inte', () => {
    expect(tvSceneBox(639, 900).phone).toBe(true)
    expect(tvSceneBox(640, 900).phone).toBe(false)
  })
  it('768×1024 (iPad porträtt): inte telefon, smal, skalad mot 1280', () => {
    const v = tvSceneBox(768, 1024)
    expect(v.phone).toBe(false)
    expect(v.narrow).toBe(true)
    expect(v.scale).toBeCloseTo(768 / 1280, 5)
  })
  it('TV_SCENE_PHONE_PX är 640', () => { expect(TV_SCENE_PHONE_PX).toBe(640) })
})
```

- [ ] **Steg 3: Kör och se dem falla.** `npx vitest run lib/__tests__/tv-scene-box.test.ts`

- [ ] **Steg 4: Implementera.** I `tv-scene.ts`: `TV_SCENE_PHONE_PX = 640`; ta bort `TV_SCENE_PHONE_WIDTH` och dess kommentar (uppdatera kommentaren vid `TV_SCENE_PHONE_PX` till: telefonen mäts mot LÅDANS KORTASTE SIDA så att liggande läge på en telefon också är telefon, och telefongrenen SKALAR INTE — pluginets mobilgren ritar i enhetens egna px). I `tvSceneBox()`:

```ts
const narrow = contentWidth < TV_SCENE_NARROW_PX
const phone = Math.min(contentWidth, contentHeight) < TV_SCENE_PHONE_PX
if (contentWidth <= 0 || contentHeight <= 0) { /* oförändrat skyddsvärde */ }
if (phone) {
  // Fas 3: telefonen ritas i riktiga px. Lagret är lådan, skalan 1.
  return { scale: 1, width: contentWidth, height: contentHeight, viewportWidth: contentWidth, viewportHeight: contentHeight, narrow, phone }
}
const floorWidth = TV_SCENE_MIN_WIDTH_PX
// resten oförändrat
```

Sök resten av filen efter `TV_SCENE_PHONE_WIDTH` (`grep -rn TV_SCENE_PHONE_WIDTH lib src spa/src`) och ta bort/ändra varje referens (typkommentaren i `TvSceneBoxVars`, ev. test i `tv-scene.test.ts`).

- [ ] **Steg 5: Kör** `npx vitest run lib/__tests__/tv-scene-box.test.ts lib/__tests__/tv-scene.test.ts lib/__tests__/plugin-sdk-tv.test.ts` → grönt. `npx tsc --noEmit -p tsconfig.json` → inga fel.

- [ ] **Steg 6: Commit** (i appträdet): `tv-scene: telefongrenen ritar i riktiga px — skala 1, tröskel 640 mot kortaste sidan`

---

### Task P1: Mobila byggstenar — tokens, ikoner, sidhuvud, flik-rad, bottenark

**Arbetsträd:** pluginet.

**Filer:**
- Skapa: `runtime/tv/mobile/mobile-tokens.ts`, `runtime/tv/mobile/mobile-icons.tsx`, `runtime/tv/mobile/mobile-header.tsx`, `runtime/tv/mobile/mobile-tab-bar.tsx`, `runtime/tv/mobile/mobile-sheet.tsx`
- Ändra: `runtime/tv/tv-strings.ts` (nya nycklar i EN + SV)
- Test: `runtime/tv/mobile/mobile-tab-bar.test.tsx`, `runtime/tv/mobile/mobile-sheet.test.tsx`

**Gränssnitt (producerar):**

```ts
// mobile-tokens.ts
export const MT = {
  bg: '#000', text: '#f3f4f8',
  muted: 'rgba(243,244,248,0.62)', dim: 'rgba(243,244,248,0.45)', faint: 'rgba(243,244,248,0.4)',
  s05: 'rgba(252,252,255,0.05)', s06: 'rgba(252,252,255,0.06)', s07: 'rgba(252,252,255,0.07)', s08: 'rgba(252,252,255,0.08)',
  s10: 'rgba(252,252,255,0.10)', s12: 'rgba(252,252,255,0.12)', s14: 'rgba(252,252,255,0.14)', s16: 'rgba(252,252,255,0.16)',
  line07: 'rgba(255,255,255,0.07)', line08: 'rgba(255,255,255,0.08)', line10: 'rgba(255,255,255,0.10)', line14: 'rgba(255,255,255,0.14)', line20: 'rgba(255,255,255,0.2)',
  sheet: 'rgba(38,39,45,0.98)', scrim: 'rgba(0,0,0,0.6)',
  acc: 'rgb(var(--accent-500))', accMix: (pct: number) => `color-mix(in srgb, rgb(var(--accent-500)) ${pct}%, transparent)`, onAcc: '#fff',
  live: '#fb7185', liveSoft: 'rgba(251,113,133,0.22)', liveText: '#fecdd3',
  warnSoft: 'rgba(244,132,95,0.2)', warnText: '#f9c3ad',
  font: "'Avenir Next', 'Trebuchet MS', sans-serif",
  HIT: 44, PAD: 16, HEADER_H: 52, HEADER_LEFT: 60, TAB_BAR: 52,
  SAFE_BOTTOM: 'env(safe-area-inset-bottom, 18px)', SAFE_TOP: 'env(safe-area-inset-top, 0px)',
  /** Innehållets bottenluft så att sista raden inte hamnar under flik-raden. */
  SCROLL_PAD_BOTTOM: 96,
} as const
/** Ett textblock i en rad: krymper, klipps med ellips, tar aldrig fast bredd. */
export const ellipsis: CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
export const clamp2: CSSProperties = { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }
export const sectionLabel: CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: MT.dim }

// mobile-icons.tsx — Phosphor regular, 24-rutnät, stroke 1.8. Signatur per ikon: ({ size = 22, filled = false }: { size?: number; filled?: boolean })
export const MIcons: { House, List, Heart, MagnifyingGlass, Gear, CaretLeft, CaretRight, CaretDown, Play, SpeakerHigh, SpeakerSlash, Bell, Lock, SquaresFour, ArrowsOut, DotsThree, ListHandle, Plus, X }

// mobile-header.tsx
export function MobileHeader({ title, right, back, onBack, testId }: { title: ReactNode; right?: ReactNode; back?: boolean; onBack?: () => void; testId?: string }): JSX.Element
// 52 px hög, padding `0 16px 0 60px` (60 = värdens menychip; med `back` läggs en 40 px CaretLeft-knapp FÖRE titeln, inom samma 60-px-vänsterluft räknas den INTE — den ligger efter). Titel 21/600 `ellipsis`, `right` högerställt (flexShrink 0).

// mobile-tab-bar.tsx
export type MobileTab = 'hub' | 'guide' | 'favs' | 'search' | 'more'
export function tabForView(view: TvView): MobileTab   // channel → 'guide', multi/settings → 'more'
export function MobileTabBar({ view, onGo, onMore }: { view: TvView; onGo: (view: 'hub' | 'guide' | 'favs' | 'search') => void; onMore: () => void }): JSX.Element

// mobile-sheet.tsx
export interface MobileSheetProps {
  title: ReactNode
  subtitle?: ReactNode
  art?: ReactNode                       // t.ex. <MobileLogo …/> 56×38
  items: TvGlassMenuAction[]            // { key, label, run } — SAMMA typ som värdens glasmeny
  onClose: () => void
  pushLayer: (close: () => void) => () => void
  testId?: string
}
export function MobileSheet(props: MobileSheetProps): JSX.Element
```

Nya strängar (`tv-strings.ts`, EN / SV): `tabHome: 'Home' / 'Hem'`, `tabGuide: 'Guide' / 'Guide'`, `tabFavourites: 'Favourites' / 'Favoriter'`, `tabSearch: 'Search' / 'Sök'`, `tabMore: 'More' / 'Mer'`, `sheetMultiview: 'Multiview' / 'Multivy'`, `sheetSettings: 'Settings' / 'Inställningar'`.

- [ ] **Steg 1: Skriv de fallerande testerna.**

`mobile-tab-bar.test.tsx`:
```tsx
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileTabBar, tabForView } from './mobile-tab-bar'

afterEach(cleanup)

describe('MobileTabBar', () => {
  it('ritar fem flikar med etiketter och markerar den aktiva', () => {
    render(<MobileTabBar view="guide" onGo={vi.fn()} onMore={vi.fn()} />)
    for (const label of ['Home', 'Guide', 'Favourites', 'Search', 'More']) expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByTestId('tab-guide')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('tab-hub')).not.toHaveAttribute('aria-current')
  })
  it('kanaldetalj räknas som Guide, multivy och inställningar som More', () => {
    expect(tabForView('channel')).toBe('guide')
    expect(tabForView('multi')).toBe('more')
    expect(tabForView('settings')).toBe('more')
    expect(tabForView('hub')).toBe('hub')
  })
  it('tryck går till vyn, More ropar onMore', () => {
    const onGo = vi.fn(); const onMore = vi.fn()
    render(<MobileTabBar view="hub" onGo={onGo} onMore={onMore} />)
    fireEvent.click(screen.getByTestId('tab-favs'))
    expect(onGo).toHaveBeenCalledWith('favs')
    fireEvent.click(screen.getByTestId('tab-more'))
    expect(onMore).toHaveBeenCalled()
  })
  it('varje flik är minst 44 px hög', () => {
    render(<MobileTabBar view="hub" onGo={vi.fn()} onMore={vi.fn()} />)
    for (const id of ['hub', 'guide', 'favs', 'search', 'more']) expect(parseFloat(screen.getByTestId(`tab-${id}`).style.minHeight)).toBeGreaterThanOrEqual(44)
  })
})
```

`mobile-sheet.test.tsx`:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileSheet } from './mobile-sheet'

afterEach(cleanup)
const items = [{ key: 'play', label: 'Watch now', run: vi.fn() }, { key: 'pin', label: 'Add to favourites', run: vi.fn() }]

describe('MobileSheet', () => {
  it('ritar rubrik, poster och Avbryt som dialog', () => {
    render(<MobileSheet title="SVT1" subtitle="1 · Sport" items={items} onClose={vi.fn()} pushLayer={() => () => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('SVT1')
    expect(screen.getByText('Watch now')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
  it('en post kör run och stänger', () => {
    const onClose = vi.fn()
    render(<MobileSheet title="SVT1" items={items} onClose={onClose} pushLayer={() => () => {}} />)
    fireEvent.click(screen.getByText('Watch now'))
    expect(items[0].run).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
  it('scrim och Avbryt stänger utan att köra något', () => {
    const onClose = vi.fn()
    render(<MobileSheet title="SVT1" items={items} onClose={onClose} pushLayer={() => () => {}} />)
    fireEvent.click(screen.getByTestId('sheet-scrim'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it('registrerar sig som lager så Bakåt stänger, och avregistrerar vid unmount', () => {
    const off = vi.fn()
    const pushLayer = vi.fn(() => off)
    const onClose = vi.fn()
    const { unmount } = render(<MobileSheet title="SVT1" items={items} onClose={onClose} pushLayer={pushLayer} />)
    expect(pushLayer).toHaveBeenCalledTimes(1)
    pushLayer.mock.calls[0][0]()       // skalets back() ropar lagrets close
    expect(onClose).toHaveBeenCalled()
    unmount()
    expect(off).toHaveBeenCalled()
  })
  it('posterna är minst 44 px och texten ligger hel i DOM', () => {
    render(<MobileSheet title="SVT1" items={[{ key: 'x', label: 'A very long channel name that must not be truncated in DOM', run: vi.fn() }]} onClose={vi.fn()} pushLayer={() => () => {}} />)
    const item = screen.getByText('A very long channel name that must not be truncated in DOM')
    expect(parseFloat((item.closest('[data-sheet-item]') as HTMLElement).style.minHeight)).toBeGreaterThanOrEqual(44)
  })
})
```

- [ ] **Steg 2: Kör och se dem falla.** `npx vitest run runtime/tv/mobile`

- [ ] **Steg 3: Implementera.**

`mobile-tokens.ts`: exakt som i gränssnittet ovan.

`mobile-icons.tsx`: en `svg(size, children, filled)`-hjälpare som i `tv-ui.tsx` (`viewBox="0 0 24 24"`, `fill={filled ? 'currentColor' : 'none'}`, `stroke="currentColor"`, `strokeWidth={1.8}`, `strokeLinecap="round"`, `strokeLinejoin="round"`). Rita Phosphor-regular-formerna (house, list, heart, magnifying-glass, gear, caret-left/right/down, play, speaker-high, speaker-slash, bell, lock, squares-four, arrows-out, dots-three, list-handle = tre korta horisontella streck, plus, x). Formerna får vara förenklade så länge de är igenkännbara — det finns inga bildtester.

`mobile-header.tsx`:
```tsx
export function MobileHeader({ title, right, back, onBack, testId }: …) {
  const { tt } = useTvText()
  return (
    <div data-testid={testId} style={{ height: MT.HEADER_H, minHeight: MT.HEADER_H, flexShrink: 0, padding: `0 ${MT.PAD}px 0 ${MT.HEADER_LEFT}px`, display: 'flex', alignItems: 'center', gap: 10 }}>
      {back ? <div {...station(onBack ?? (() => {}), undefined, { 'aria-label': tt('back'), 'data-testid': 'header-back' })} style={{ width: 40, height: 40, minHeight: 40, borderRadius: 999, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}><MIcons.CaretLeft /></div> : null}
      <div style={{ flex: 1, fontSize: 21, fontWeight: 600, ...ellipsis }}>{title}</div>
      {right ? <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div> : null}
    </div>
  )
}
```
`station` importeras från `../tv-ui` (den är ren och skalfri).

`mobile-tab-bar.tsx`:
```tsx
const TABS: { key: MobileTab; icon: ComponentType<{ size?: number }>; label: TvStringKey }[] = [
  { key: 'hub', icon: MIcons.House, label: 'tabHome' }, { key: 'guide', icon: MIcons.List, label: 'tabGuide' },
  { key: 'favs', icon: MIcons.Heart, label: 'tabFavourites' }, { key: 'search', icon: MIcons.MagnifyingGlass, label: 'tabSearch' },
  { key: 'more', icon: MIcons.DotsThree, label: 'tabMore' },
]
export function tabForView(view: TvView): MobileTab {
  if (view === 'channel') return 'guide'
  if (view === 'multi' || view === 'settings') return 'more'
  return view
}
export function MobileTabBar({ view, onGo, onMore }: …) {
  const { tt } = useTvText()
  const active = tabForView(view)
  return (
    <nav data-testid="mobile-tab-bar" aria-label={tt('liveTv')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, height: `calc(${MT.TAB_BAR}px + ${MT.SAFE_BOTTOM})`, paddingBottom: MT.SAFE_BOTTOM, borderTop: `1px solid ${MT.line08}`, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.92) 45%)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex' }}>
      {TABS.map(({ key, icon: Icon, label }) => {
        const isActive = key === active
        return (
          <div key={key} data-testid={`tab-${key}`} {...station(() => (key === 'more' ? onMore() : onGo(key)), undefined, { ...(isActive ? { 'aria-current': 'page' } : {}), 'aria-label': tt(label) })}
            style={{ flex: 1, minHeight: MT.TAB_BAR, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: isActive ? MT.acc : 'rgba(243,244,248,0.55)', fontSize: 11, fontWeight: isActive ? 600 : 400, cursor: 'pointer' }}>
            <Icon size={22} />
            <span>{tt(label)}</span>
          </div>
        )
      })}
    </nav>
  )
}
```

`mobile-sheet.tsx`:
```tsx
export function MobileSheet({ title, subtitle, art, items, onClose, pushLayer, testId }: MobileSheetProps) {
  const { tt } = useTvText()
  const onCloseRef = useRef(onClose); useEffect(() => { onCloseRef.current = onClose })
  useEffect(() => pushLayer(() => onCloseRef.current()), [pushLayer])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCloseRef.current() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  return (
    <>
      <div data-testid="sheet-scrim" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: MT.scrim }} />
      <div role="dialog" aria-modal="true" data-testid={testId ?? 'mobile-sheet'} data-live-tv-layer="" data-panel-root=""
        style={{ position: 'fixed', left: 8, right: 8, bottom: 8, zIndex: 71, borderRadius: 26, background: MT.sheet, border: `1px solid ${MT.line10}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.6)', color: MT.text, fontFamily: MT.font, overflow: 'hidden', paddingBottom: MT.SAFE_BOTTOM }}>
        <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${MT.line08}` }}>
          {art ? <div style={{ flexShrink: 0 }}>{art}</div> : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, ...ellipsis }}>{title}</div>
            {subtitle ? <div style={{ fontSize: 13, color: MT.muted, ...ellipsis }}>{subtitle}</div> : null}
          </div>
        </div>
        <div data-scroll="" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {items.map((item, index) => (
            <div key={item.key} data-sheet-item="" {...station(() => { item.run(); onClose() }, undefined, index === 0 ? { 'data-init': '' } : undefined)}
              style={{ minHeight: 56, padding: '0 20px', display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: index === 0 ? 600 : 400, borderBottom: `1px solid ${MT.line07}`, cursor: 'pointer' }}>
              <span style={{ flex: 1, ...ellipsis }}>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 8 }}>
          <div {...station(onClose)} style={{ minHeight: 50, borderRadius: 16, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>{tt('cancel')}</div>
        </div>
      </div>
    </>
  )
}
```
Lägg till i `tv-ui.tsx`:s `TvFocusStyle` (fokusstil, se P2) inget ännu — arket får sin fade via `data-live-tv-layer` som redan animeras (`lumio-livetv-fade` 160 ms).

- [ ] **Steg 4: Kör** `npx vitest run runtime/tv/mobile` → grönt. `npx tsc --noEmit -p tsconfig.json` → inga fel.

- [ ] **Steg 5: Commit** `live-tv: mobila byggstenar — tokens, ikoner, sidhuvud, flik-rad, bottenark`

---

### Task P2: Skalet — `phone` som prop, flik-rad + ark i stället för låda, golven bort

**Filer:**
- Ändra: `runtime/tv/tv-shell.tsx`, `runtime/tv/tv-ui.tsx`, `runtime/tv/tv-guide-shared.tsx`, `runtime/tv/tv-player-props.ts`, `runtime/tv/tv-player-types.ts`, alla `runtime/tv/tv-*.tsx` som anropar `usePhoneSurface`/`phoneTextFloor`/`phoneHitFloor`/`PHONE_HIT_MIN_DP` (lista: `grep -ln "usePhoneSurface\|phoneTextFloor\|phoneHitFloor\|PHONE_HIT_MIN_DP\|CHANNEL_COLUMN_PHONE_MIN_DP" runtime/tv/*.tsx runtime/*.tsx`)
- Ta bort: fas 2:ans golvtester (sök `PHONE_HIT_MIN_DP\|PHONE_TEXT_MIN_DP\|phoneTextFloor\|phoneHitFloor` i `runtime/tv/*.test.tsx` och `runtime/hooks/*.test.ts*`; hela `describe`-block som bara testar golvet tas bort, enskilda `expect` på golv tas bort ur blandade tester)
- Test: `runtime/tv/tv-shell-phone.test.tsx` (skrivs om)

**Gränssnitt (producerar):**
```ts
// tv-shell.tsx
export interface TvViewProps { model: LiveTvModel; nav: TvNav; params: Record<string, string>; settings: TvSettings; phone: boolean }
// tv-player-types.ts
export interface LiveTvPlayerTvProps { …befintligt…; phone: boolean; fullscreenOnRotate: boolean; keepAwake: boolean }
// fullscreenOnRotate/keepAwake läses ur TvSettings. Fälten läggs i tv-settings-store.ts REDAN I DENNA TASK (steg 4), default true; P12 bygger bara UI:t för dem.
```

Underkomponenter som idag ropar `usePhoneSurface()` själva (`Row`/`Heading`/`ListRow` i tv-settings, `ChannelCell` i tv-guide-shared, `TvTextField` i tv-text-entry, `TvChannelPicker`, `TvListPicker`, `TvPreview`, `Tag`/`Chip`/`Segment`/`RoundBtn`/`useTvClockNode` i tv-ui) får `phone` som prop (default `false`) från sin förälder. `Tag`/`Chip`/`Segment`/`RoundBtn` har redan `phone`-prop — behåll propen men ta bort golv-räkningen (propen används inte längre i TV-grenen; låt den stå kvar som `phone = false` utan effekt tills vyerna byts, eller ta bort den helt om ingen anropare kvarstår efter denna task — kontrollera med grep).

- [ ] **Steg 1: Skriv om `tv-shell-phone.test.tsx`.** Behåll `mount()`-hjälparen (lådan med `TV_SCENE_PHONE_ATTR`). Ersätt alla `describe`-block med:

```tsx
describe('Live TV-skalet på telefon (fas 3)', () => {
  it('visar flik-raden, ingen ikonrad, ingen låda och ingen öppningsknapp', () => {
    mount({ phone: true })
    expect(screen.getByTestId('mobile-tab-bar')).toBeInTheDocument()
    expect(screen.queryByTestId('tv-rail')).toBeNull()
    expect(screen.queryByTestId('tv-rail-open')).toBeNull()
  })
  it('märker roten med data-lt-phone', () => {
    const { box } = mount({ phone: true })
    expect(box.querySelector('[data-live-tv-tv-root]')).toHaveAttribute('data-lt-phone', '1')
  })
  it('utan telefonattribut: ikonraden som förut, ingen flik-rad, ingen märkning', () => {
    const { box } = mount({ phone: false })
    expect(screen.getByTestId('tv-rail')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-tab-bar')).toBeNull()
    expect(box.querySelector('[data-live-tv-tv-root]')).not.toHaveAttribute('data-lt-phone')
  })
  it('flikarna navigerar', () => {
    const { onNavigate } = mount({ phone: true })
    fireEvent.click(screen.getByTestId('tab-search'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'search' } })
  })
  it('More öppnar ett ark med Multiview och Settings; Settings navigerar och stänger arket', async () => {
    const { onNavigate } = mount({ phone: true })
    fireEvent.click(screen.getByTestId('tab-more'))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('Multiview')).toBeInTheDocument()
    fireEvent.click(within(sheet).getByText('Settings'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'settings' } })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('Bakåt (Escape) stänger More-arket innan något annat händer', async () => {
    const { onNavigate } = mount({ phone: true })
    fireEvent.click(screen.getByTestId('tab-more'))
    await screen.findByRole('dialog')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('kanalmenyn (håll på ett kort) landar i ett bottenark, inte i värdens glasmeny', async () => {
    vi.useFakeTimers()
    mount({ phone: true })
    const card = await screen.findByText('A')
    fireEvent.pointerDown(card.closest('[data-f]') as HTMLElement, { pointerType: 'touch', button: 0 })
    vi.advanceTimersByTime(700)
    vi.useRealTimers()
    expect(await screen.findByRole('dialog')).toHaveTextContent('Watch now')
    expect(screen.queryByTestId('tv-glass-menu')).toBeNull()
  })
  it('hold-affordansen ("…"-knappen) finns inte på telefon', () => {
    const { box } = mount({ phone: true })
    expect(box.querySelector('[data-live-tv-hold-affordance]')).toBeNull()
  })
  it('flik-raden döljs när spelaren är öppen', async () => {
    mount({ phone: true })
    // Simulera uppspelning: klicka första kanalkortet i hubben (fixturen har A och B).
    fireEvent.click(await screen.findByText('A'))
    await waitFor(() => expect(screen.queryByTestId('mobile-tab-bar')).toBeNull())
  })
})
```
Håll-mönstret (pointerDown + 700 ms under fake timers) finns i `tv-shell-pointer.test.tsx` — kopiera därifrån om `findByText('A')` inte träffar stationen direkt (hubben på telefon byggs först i P4; i P2 renderar hubben fortfarande fas 2-layouten, där kortet `A` finns som station). Kontrollera hur `TvHoldAffordance` markerar sig (grep `data-` i `tv-hold-affordance.tsx`) och använd rätt attribut i affordanstestet.

- [ ] **Steg 2: Kör och se dem falla.** `npx vitest run runtime/tv/tv-shell-phone.test.tsx`

- [ ] **Steg 3: Implementera i `tv-shell.tsx`.**
  1. Ta bort: `railOpen`, `railRef`, `railOpenerRef`, `layerOffRef`, `closeRail`, båda `useEffect` som rör `railOpen`, `backFromRail`, `drawerItem`, öppningsknappen och lådan i JSX, `Icons.Menu`-användningen. Importerna `PHONE_HIT_MIN_DP`, `phoneTextFloor` bort.
  2. `const phone = usePhoneSurface(rootRef) && !isTv` står kvar (enda anropet i skalet). Lägg `phone` i `TvViewProps` och skicka `phone={phone}` till `<View …/>`.
  3. `const [moreOpen, setMoreOpen] = useState(false)`. JSX på telefon, efter `<main>`: `{phone && active === null ? <MobileTabBar view={view} onGo={(v) => go(v)} onMore={() => setMoreOpen(true)} /> : null}` och `{phone && moreOpen ? <MobileSheet title={tt('moreActions')} items={[{ key: 'multi', label: tt('sheetMultiview'), run: () => go('multi') }, { key: 'settings', label: tt('sheetSettings'), run: () => go('settings') }]} onClose={() => setMoreOpen(false)} pushLayer={pushLayer} testId="more-sheet" /> : null}`.
  4. Glasmenyn: `{menu ? (phone ? <MobileSheet title={menu.title} items={menu.actions} onClose={() => setMenu(null)} pushLayer={pushLayer} testId="channel-sheet" /> : TvGlassMenu ? <TvGlassMenu target={menu} onClose={() => setMenu(null)} /> : null) : null}`. OBS: `back()` läser `menu` FÖRST och stänger den — arket registrerar sig dessutom som lager via `pushLayer`; det är ofarligt (samma `setMenu(null)`), men se till att `back()` inte kör både `setMenu(null)` OCH lagrets close i samma anrop (det gör den inte: den returnerar efter `setMenu(null)`).
  5. `<TvHoldAffordance … enabled={!isTv && !phone} />`. `zapDigits`-rutan renderas bara `!phone`.
  6. Roten: `{...(phone ? { 'data-lt-phone': '1' } : {})}`, `fontSize: phone ? 15 : dp(22)`, `lineHeight: phone ? 1.4 : 1.3`. `<main>` får `paddingBottom: phone ? \`calc(${MT.TAB_BAR}px + ${MT.SAFE_BOTTOM})\` : 0` — nej, vyerna scrollar själva och använder `MT.SCROLL_PAD_BOTTOM`; låt `<main>` vara. Ikonraden renderas bara `!phone` (ta bort ternären, gör `{phone ? null : <nav …/>}`).
  7. `tvPlayerProps`: lägg till `phone`, och i `buildTvPlayerProps` (tv-player-props.ts) `phone: boolean` som inparameter → utparameter, plus `fullscreenOnRotate: settings.fullscreenOnRotate`, `keepAwake: settings.keepAwake`.

- [ ] **Steg 4: `tv-settings-store.ts`.** Lägg `keepAwake: boolean` och `fullscreenOnRotate: boolean` i `TvSettings`, `DEFAULTS` (båda `true`), `sanitize` (`typeof r.x === 'boolean' ? r.x : DEFAULTS.x`). Lägg ett test i `tv-settings-store.test.ts`: `expect(getTvSettings().keepAwake).toBe(true)`; `setTvSettings({ keepAwake: false })` → `false`; okänt värde `{ keepAwake: 'x' }` skrivet direkt via `writePluginJson` → sanitize ger `true`.

- [ ] **Steg 5: `tv-ui.tsx`.** Ta bort `PHONE_HIT_MIN_DP`, `PHONE_TEXT_MIN_DP`, `phoneTextFloor`, `phoneHitFloor`. I `TvFocusStyle` lägg till:
```css
[data-live-tv-tv-root][data-lt-phone="1"] [data-f]:focus,
[data-live-tv-tv-root][data-lt-phone="1"] [data-f][data-fcur="1"] { outline: none !important; box-shadow: none !important; }
[data-live-tv-tv-root][data-lt-phone="1"] [data-f]:hover { background-image: none !important; }
```
`Tag`, `Chip`, `Segment`, `RoundBtn`, `useTvClockNode`: ersätt `dp(phoneTextFloor(N, phone))` med `dp(N)` och `dp(phoneHitFloor(N, phone))` med `dp(N)`. Behåll `phone`-propen bara där den fortfarande gör något (t.ex. `useTvClockNode` väljer kompakt klocka) — annars ta bort den och alla `phone={phone}` vid anropen. `Icons.Menu` tas bort.

- [ ] **Steg 6: `tv-guide-shared.tsx`.** Ta bort `CHANNEL_COLUMN_PHONE_MIN_DP`, gör `channelColumnStyle()` parameterlös (returnera skrivbordsstilen) och `ChannelCell` utan `phone`-prop.

- [ ] **Steg 7: Vyerna — mekanisk städning.** I varje fil från grep-listan: `const phone = usePhoneSurface(…)` → läs `phone` ur props (`TvViewProps`) eller ta emot som prop; `phoneTextFloor(N, phone)` → `N`; `phoneHitFloor(N, phone)` → `N`; `minHeight: phone ? dp(PHONE_HIT_MIN_DP) : …` → ta bort raden/uttrycket. Fas 2:ans telefonlayouter (`outerStyle = phone ? … : …` i tv-channel/tv-search, `SPOTLIGHT_COUNT_PHONE`, `ALL_CHANNELS_COLUMNS_PHONE`, `narrow`-hanteringen i multivyn är FAS 1 och rörs INTE) får stå kvar tills respektive vy-task ersätter dem — men de ska kompilera utan golv-hjälparna. Underkomponenter (`Row`, `Heading`, `ListRow`, `ChannelCell`, `TvTextField`, `TvChannelPicker`, `TvListPicker`, `TvPreview`) tar `phone?: boolean` som prop där de fortfarande behöver den, annars ingen.
  Slutkontroll: `grep -rn "usePhoneSurface" runtime/ --include=*.tsx --include=*.ts | grep -v "hooks/usePhoneSurface\|tv-shell.tsx\|\.test\."` ska vara tom. `grep -rn "phoneTextFloor\|phoneHitFloor\|PHONE_HIT_MIN_DP\|PHONE_TEXT_MIN_DP\|CHANNEL_COLUMN_PHONE_MIN_DP" runtime/` ska vara tom.

- [ ] **Steg 8: Golvtesterna.** Hitta dem: `grep -ln "PHONE_HIT_MIN_DP\|PHONE_TEXT_MIN_DP\|golv\|floor" runtime/tv/*.test.tsx runtime/hooks/*.test.ts*`. Ta bort `describe`-block som mäter golv (M-P4-testerna, "träffytor och text får ett golv"). Ta bort `runtime/tv/tv-shell-phone.test.tsx`-rester om något blev kvar (filen är helt omskriven i steg 1). `usePhoneSurface.test.ts` behålls (hooken finns kvar).

- [ ] **Steg 9: Kör hela sviten.** `npx vitest run` → grönt (antalet sjunker med de borttagna golvtesterna; inga andra ska falla). `npx tsc --noEmit -p tsconfig.json` → inga fel. `node ../../scripts/check-runtime-boundaries.mjs` (från `plugins/live-tv/`; kontrollera i `scripts/check-runtime-boundaries.mjs` hur den vill anropas) → ok.

- [ ] **Steg 10: Commit** `live-tv: telefonen får flik-rad och bottenark i skalet, fas 2:ans låda och golv bort`

---

### Task P3: Delade rader — `MobileChannelRow`, `MobileLogo`, `MobileSegment`, `MobileChips`

**Filer:**
- Skapa: `runtime/tv/mobile/mobile-logo.tsx`, `runtime/tv/mobile/mobile-channel-row.tsx`, `runtime/tv/mobile/mobile-segment.tsx`, `runtime/tv/mobile/mobile-chips.tsx`
- Test: `runtime/tv/mobile/mobile-channel-row.test.tsx`, `runtime/tv/mobile/mobile-chips.test.tsx`

**Gränssnitt (producerar):**
```ts
// mobile-logo.tsx — kanalbild: sparad bildruta → logotyp → initialer (samma kedja som ChannelArt i tv-ui.tsx, men i px och utan barn)
export function MobileLogo({ channel, width, height, radius = 8, frame = true }: { channel: Pick<M3uChannel, 'name' | 'logo' | 'logoFallback' | 'url'>; width: number; height: number; radius?: number; frame?: boolean }): JSX.Element

// mobile-channel-row.tsx
export type MobileRowVariant = 'guide' | 'zap' | 'search' | 'sheet'
export interface MobileChannelRowProps {
  channel: M3uChannel
  number: number | null
  now: NowNextLater                    // model.nowFor(channel)
  nowMs: number
  locale: string
  pinned?: boolean
  locked?: boolean
  variant?: MobileRowVariant           // default 'guide'
  noProgrammeLabel: string             // tt('noProgramme') eller tt('loadingGuide')
  onPress: () => void
  onLongPress?: (element: HTMLElement) => void
  init?: boolean                       // data-init
  testId?: string                      // default 'mobile-channel-row'
}
export function MobileChannelRow(props: MobileChannelRowProps): JSX.Element

// mobile-segment.tsx
export function MobileSegment<K extends string>({ options, value, onChange, height = 36, testId }: { options: { key: K; label: string }[]; value: K; onChange: (key: K) => void; height?: number; testId?: string }): JSX.Element

// mobile-chips.tsx
export function MobileChips<K>({ items, value, onChange, testId }: { items: { key: K; label: string; id: string }[]; value: K; onChange: (key: K) => void; testId?: string }): JSX.Element
// Raden är minst 44 px hög (padding 5px 0), chips 34 px, sidoscroll, `data-row` (döljer scrollbar via TvFocusStyle).
```

Variantmått (handoffen §2, §7, §10): `guide` — logotyp 56×38, rader: namn 15/600 (+ hjärta 14 px accent om pinned, lås 14 px om locked) · nu-titel 14 px 85 % · [förlopp 4 px + `N min` 12 px] · `Next HH:MM Titel` 13 px 50 %; utan tablå: `noProgrammeLabel` 14 px 50 % + `grupp · kvalitet` 13 px 40 % (kvalitet via `qualityFromName(channel.name)` ur `../live-tv-model`). `search` — som guide men nu-raden lyder `Now: titel` (`tt('colNow')` finns som versal "NOW"; använd `Now:`-etiketten genom en ny sträng `nowPrefix: 'Now' / 'Nu'`) och ingen Next-rad, `minHeight: 68`. `zap` — logotyp 48×32, nr 22 px, namn 14/600 + nu-titel 12 px, `minHeight: 56`. `sheet` — som guide utan Next-rad, `minHeight: 68`.

- [ ] **Steg 1: Skriv de fallerande testerna.**

`mobile-channel-row.test.tsx`:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileChannelRow } from './mobile-channel-row'

afterEach(cleanup)
const channel = { name: 'EN| Development Channel International HD', logo: null, group: 'Sport', url: 'http://x/a', tvgId: null }
const nowMs = Date.UTC(2026, 8, 16, 12, 0)
const now = { now: { title: 'Grand Prix qualifying', start: nowMs - 30 * 60_000, stop: nowMs + 30 * 60_000 }, next: { title: 'News', start: nowMs + 30 * 60_000, stop: nowMs + 60 * 60_000 }, later: null }

describe('MobileChannelRow', () => {
  it('lägger hela kanalnamnet i DOM och klipper bara med CSS', () => {
    render(<MobileChannelRow channel={channel} number={12} now={now} nowMs={nowMs} locale="en-GB" noProgrammeLabel="No programme information" onPress={vi.fn()} />)
    const name = screen.getByText('EN| Development Channel International HD')
    expect(name.style.textOverflow).toBe('ellipsis')
    expect(name.style.minWidth).toBe('0px')
    const stack = name.parentElement as HTMLElement
    expect(stack.style.flex).toContain('1')
    expect(stack.style.minWidth).toBe('0px')
  })
  it('visar nr, nu-titel, minuter kvar och Next', () => {
    render(<MobileChannelRow channel={channel} number={12} now={now} nowMs={nowMs} locale="en-GB" noProgrammeLabel="No programme information" onPress={vi.fn()} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Grand Prix qualifying')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByText(/Next/)).toHaveTextContent('News')
  })
  it('utan tablå: platshållare + grupp · kvalitet', () => {
    render(<MobileChannelRow channel={{ ...channel, name: 'Foo 4K' }} number={null} now={{ now: null, next: null, later: null }} nowMs={nowMs} locale="en-GB" noProgrammeLabel="No programme information" onPress={vi.fn()} />)
    expect(screen.getByText('No programme information')).toBeInTheDocument()
    expect(screen.getByText('Sport · 4K')).toBeInTheDocument()
  })
  it('tryck = onPress, håll = onLongPress med elementet', () => {
    vi.useFakeTimers()
    const onPress = vi.fn(); const onLongPress = vi.fn()
    render(<MobileChannelRow channel={channel} number={1} now={now} nowMs={nowMs} locale="en-GB" noProgrammeLabel="x" onPress={onPress} onLongPress={onLongPress} />)
    const row = screen.getByTestId('mobile-channel-row')
    fireEvent.click(row)
    expect(onPress).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(row, { pointerType: 'touch', button: 0 })
    vi.advanceTimersByTime(700)
    expect(onLongPress).toHaveBeenCalledWith(row)
    vi.useRealTimers()
  })
  it('raden är minst 44 px (minHeight, inte height) och hjärtat syns när pinned', () => {
    render(<MobileChannelRow channel={channel} number={1} now={now} nowMs={nowMs} locale="en-GB" noProgrammeLabel="x" onPress={vi.fn()} pinned />)
    const row = screen.getByTestId('mobile-channel-row')
    expect(parseFloat(row.style.minHeight)).toBeGreaterThanOrEqual(44)
    expect(row.style.height).toBe('')
    expect(row.querySelector('[data-pinned]')).not.toBeNull()
  })
})
```

`mobile-chips.test.tsx`: renderar tre chips, aktiv har `aria-pressed="true"` och `fontWeight 600`, klick ropar `onChange(key)`, raden har `minHeight ≥ 44`.

- [ ] **Steg 2: Kör och se dem falla.** `npx vitest run runtime/tv/mobile`

- [ ] **Steg 3: Implementera.**

`mobile-logo.tsx`: kopiera kedjan ur `ChannelArt` (`sdk.playerFrameUrl(channelKey(channel), null)` när `frame && channel.url`; `getLiveTvLogoSrc(channel.logo)` / `logoFallback` via `LiveTvLogoImage` med `className="lumio-tv-logo-img"`; annars `initialsOf(channel.name)` 13/600 `MT.dim`). Yta `MT.s06`, `borderRadius: radius`, `overflow: hidden`, fasta `width`/`height`, `flexShrink: 0`.

`mobile-channel-row.tsx`:
```tsx
export function MobileChannelRow({ channel, number, now, nowMs, locale, pinned = false, locked = false, variant = 'guide', noProgrammeLabel, onPress, onLongPress, init, testId = 'mobile-channel-row' }: MobileChannelRowProps) {
  const { tt } = useTvText()
  const logo = variant === 'zap' ? { w: 48, h: 32 } : { w: 56, h: 38 }
  const minHeight = variant === 'zap' ? 56 : 68
  const minutes = now.now ? Math.max(0, Math.round((now.now.stop - nowMs) / 60_000)) : 0
  return (
    <div data-testid={testId} {...station(onPress, onLongPress, init ? { 'data-init': '' } : undefined)}
      style={{ minHeight, padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${MT.line07}`, cursor: 'pointer' }}>
      <span style={{ width: variant === 'zap' ? 22 : 26, flexShrink: 0, textAlign: 'right', fontSize: 14, color: MT.dim, fontVariantNumeric: 'tabular-nums' }}>{number ?? ''}</span>
      <MobileLogo channel={channel} width={logo.w} height={logo.h} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: variant === 'zap' ? 14 : 15, fontWeight: 600, ...ellipsis }}>{channel.name}</span>
          {pinned ? <span data-pinned="" style={{ color: MT.acc, flexShrink: 0, display: 'inline-flex' }}><MIcons.Heart size={14} filled /></span> : null}
          {locked ? <span data-locked="" style={{ color: MT.dim, flexShrink: 0, display: 'inline-flex' }}><MIcons.Lock size={14} /></span> : null}
        </div>
        {now.now ? (
          <>
            <div style={{ fontSize: variant === 'zap' ? 12 : 14, color: 'rgba(243,244,248,0.85)', ...ellipsis }}>{variant === 'search' ? `${tt('nowPrefix')}: ${now.now.title}` : now.now.title}</div>
            {variant === 'guide' || variant === 'sheet' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 4, background: MT.s14, overflow: 'hidden' }}><div style={{ width: `${Math.round(progressOf(now.now.start, now.now.stop, nowMs) * 100)}%`, height: '100%', background: MT.acc }} /></div>
                <span style={{ fontSize: 12, color: MT.dim, flexShrink: 0 }}>{tt('minutesShort', { min: minutes })}</span>
              </div>
            ) : null}
            {variant === 'guide' && now.next ? <div style={{ fontSize: 13, color: MT.dim, ...ellipsis }}>{tt('nextLabel')} {formatClock(now.next.start, locale)} {now.next.title}</div> : null}
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: MT.dim, ...ellipsis }}>{noProgrammeLabel}</div>
            <div style={{ fontSize: 13, color: MT.faint, ...ellipsis }}>{[channel.group, qualityFromName(channel.name)].filter(Boolean).join(' · ')}</div>
          </>
        )}
      </div>
    </div>
  )
}
```
Nya strängar: `minutesShort: '{min} min' / '{min} min'`, `nowPrefix: 'Now' / 'Nu'`. `progressOf`, `formatClock` ur `../../live-tv-ui`; `qualityFromName` ur `../../live-tv-model`.

`mobile-segment.tsx`: yttre `display: flex; padding: 3; borderRadius: 999; background: MT.s08`; varje segment `flex: 1; minHeight: height; borderRadius: 999; fontSize: 14; fontWeight: aktiv 600; background: aktiv MT.s16; color: aktiv MT.text annars MT.muted`, `station(() => onChange(key))`, `aria-pressed`.

`mobile-chips.tsx`: yttre `data-row="" style={{ display: 'flex', gap: 8, overflowX: 'auto', minHeight: 44, padding: '5px 0', alignItems: 'center' }}`; chip `minHeight: 34; padding: '0 14px'; borderRadius: 999; fontSize: 14; whiteSpace: nowrap; flexShrink: 0; background: aktiv MT.s16 annars MT.s05; border: aktiv 1px MT.line20 annars 1px transparent; color: aktiv MT.text annars muted 70 %; fontWeight aktiv 600`, `data-testid={\`chip-${id}\`}`, `aria-pressed`.

- [ ] **Steg 4: Kör** `npx vitest run runtime/tv/mobile` + `npx tsc --noEmit -p tsconfig.json`.

- [ ] **Steg 5: Commit** `live-tv: MobileChannelRow, MobileLogo, MobileSegment och MobileChips`

---

### Task P4: Hubben på telefon

**Filer:**
- Skapa: `runtime/tv/mobile/hub-phone.tsx`
- Ändra: `runtime/tv/tv-hub.tsx` (tidig gren), `runtime/tv/tv-strings.ts`
- Test: `runtime/tv/mobile/hub-phone.test.tsx`

**Gränssnitt:** `export function TvHubPhone(props: TvViewProps): JSX.Element`. `tv-hub.tsx`: `export function TvHub(props: TvViewProps) { if (props.phone) return <TvHubPhone {...props} />; … }` — flytta dagens kropp till `TvHubDesktop` i samma fil (oförändrad).

Data (delas med skrivbordsgrenen — extrahera till en hook `useHubData(model)` i `tv-hub.tsx` som returnerar `{ favourites, recent, spotlight, replays, chips, filtered, shown, group, setGroup, visible, setVisible, epgStatus }` och använd den i båda grenarna; `spotlightCount` är parameter: 3 på skrivbord, 1 på telefon).

Layout (handoffen §1), allt inne i `<div data-scroll style={{ flex: 1, overflowY: 'auto', padding: '0 16px', paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 14 }}>`:
1. `<MobileHeader title={tt('liveTv')} right={<spellistpill>} />` — pillen: `minHeight 36, padding 0 12, borderRadius 999, background MT.s12, fontSize 14/600, CaretDown 16`, `data-testid="playlist-pill"`; tryck öppnar ett `MobileSheet` med `title=tt('allPlaylists')`-listan: en post per `[{ id: null, name: tt('allPlaylists') }, ...model.playlists]` (`run: () => { model.setActivePlaylist(id); setGroup(null); setVisible(ALL_STEP) }`) + sist `tt('addPlaylist')` → `nav.go('settings', { tab: 'playlists' })`.
2. Sökfält: `station(() => nav.go('search'))`, `minHeight 44, borderRadius 14, background MT.s10, padding 0 14, gap 10`, `MIcons.MagnifyingGlass size=18` + `tt('searchPlaceholder')` 15 px `rgba(243,244,248,0.55)`. `data-testid="hub-search"`.
3. Spotlight (ett kort, `spotlight[0]`): `borderRadius 18, background MT.s07, border 1px MT.line08, overflow hidden`, `station(play, channelMenu, { 'data-init': '' })`. Bild: `MobileLogo`-kedjan får INTE användas här (ingen initialer-ruta i 186 px); rendera i stället `<ChannelArt channel height={186} radius={0}>` ur `../tv-ui` (den är skalfri — `dp(22)` för initialerna = 22 px, ok) med gradient `linear-gradient(180deg, transparent 42%, rgba(0,0,0,0.78))`, LIVE-tagg uppe vänster (11 px, `.14em`, `0 10px`, höjd 24, radius 8, `MT.liveSoft`/`MT.liveText` + 7 px punkt `MT.live`), orsakstagg uppe höger (11 px `.06em`, `rgba(0,0,0,0.5)`, radius 7, höjd 22), `nr · namn` 13 px nere vänster. Under: titel 18/600 `ellipsis`, `tid · N min kvar` 13 px muted, förlopp 5 px. `data-testid="hub-spotlight"`.
4. Favourites: rubrikrad 17/600 + `channelsCount` 13 px dim; `data-row` sidoscroll `gap 10, scrollSnapType: 'x mandatory'`; kort 156×72 `scrollSnapAlign: 'start'`, radius 14, `MT.s08`, `padding 0 10`, `MobileLogo 44×30` + textstack (namn 14/600 `clamp2`, nu-titel 12 px muted `ellipsis`). `station(openChannel, channelMenu)`.
5. Continue watching: sidoscroll, kort 170 px, `ChannelArt height={96}` med Replay-tagg (11 px, `MT.accMix(22)`, `#ffd9c9`) och `MIcons.Play size=22` nere vänster; titel 14/600 `ellipsis`, meta 12 px. Källor: `replays` (`nav.play({ channel, url, label })`) + `recent` som idag.
6. All channels: rubrik `allChannelsCount` 17/600; `<MobileChips items={chipItems} value={group} onChange={(k) => { setGroup(k); setVisible(ALL_STEP) }} testId="all-channels-filter-row" />`; rutnät `gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap 10`; kort: `ChannelArt aspect="16 / 10" radius={12}` (nr uppe vänster 12 px, hjärta uppe höger om pinned, lås nere höger om locked, 3 px förlopp i botten) + `padding 8 10` namn 14/600 `ellipsis` + nu-titel 12 px muted `ellipsis`. `data-testid="all-channels"`. Om `filtered.length > visible`: knapp `tt('showMore')` 44 px full bredd `MT.s08` radius 12 → `setVisible(v => v + ALL_STEP)` (`data-testid="show-more"`).
7. Tomt läge (`model.allChannels.length === 0`): centrerat i ytan (`flex 1, alignItems center, justifyContent center, textAlign center, padding 32`): titel 18/600, brödtext 15 px muted, knapp `tt('openSettings')` 48 px accent radius 999.

Inga `OK`/`håll`-texter. Ingen klocka.

- [ ] **Steg 1: Skriv de fallerande testerna** (`hub-phone.test.tsx`, samma `mount({ phone: true })`-hjälpare som i `tv-shell-phone.test.tsx` — kopiera den till en delad fil `runtime/tv/mobile/__phone-mount.tsx` med `export function mountPhone(params?, opts?)` och använd den i alla vy-tester från och med nu; fixtur med tre kanaler i två grupper + en pin):

```tsx
describe('Hubben på telefon', () => {
  it('ett spotlight-kort, sökfält, flik-rad, ingen klocka och ingen ikonrad', async () => {
    mountPhone({ view: 'hub' })
    expect(await screen.findByTestId('hub-spotlight')).toBeInTheDocument()
    expect(screen.getAllByTestId('hub-spotlight')).toHaveLength(1)
    expect(screen.getByTestId('hub-search')).toBeInTheDocument()
    expect(screen.queryByTestId('hub-clock')).toBeNull()
    expect(screen.queryByTestId('tv-rail')).toBeNull()
  })
  it('sökfältet går till sökvyn', async () => {
    const { onNavigate } = mountPhone({ view: 'hub' })
    fireEvent.click(await screen.findByTestId('hub-search'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'search' } })
  })
  it('Alla kanaler i två kolumner med chips; Visa fler laddar nästa steg', async () => {
    mountPhone({ view: 'hub' })
    const grid = await screen.findByTestId('all-channels')
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
    expect(screen.getByTestId('chip-Sport')).toBeInTheDocument()
  })
  it('spellistpillen öppnar ett ark och valet byter aktiv lista', async () => {
    mountPhone({ view: 'hub' })
    fireEvent.click(await screen.findByTestId('playlist-pill'))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('All playlists')).toBeInTheDocument()
  })
  it('renderar inga fjärrkontrollstexter', async () => {
    const { box } = mountPhone({ view: 'hub' })
    await screen.findByTestId('hub-spotlight')
    expect(box.textContent).not.toMatch(/\bOK\b|håll|hold OK/)
  })
})
```

- [ ] **Steg 2: Kör och se dem falla.** `npx vitest run runtime/tv/mobile/hub-phone.test.tsx`
- [ ] **Steg 3: Implementera** enligt layouten ovan.
- [ ] **Steg 4: Kör** `npx vitest run runtime/tv/tv-hub.test.tsx runtime/tv/mobile` (skrivbordstesterna ska vara orörda) + `npx tsc --noEmit -p tsconfig.json`.
- [ ] **Steg 5: Commit** `live-tv: hubben på telefon — ett spotlight-kort, sidoscroll, två kolumner`

---

### Task P5: Guiden · Now på telefon (+ segmentväxeln Now/Timeline/Lists)

**Filer:**
- Skapa: `runtime/tv/mobile/guide-phone.tsx`
- Ändra: `runtime/tv/tv-guide.tsx`, `runtime/tv/tv-strings.ts`
- Test: `runtime/tv/mobile/guide-phone.test.tsx`

**Gränssnitt:**
```ts
// guide-phone.tsx
export type PhoneGuideMode = 'now' | 'grid' | 'playlists'
export function phoneGuideMode(stored: GuideMode): PhoneGuideMode   // 'tl' → 'now', annars samma
export function PhoneGuideModeBar({ mode, onChange }: { mode: PhoneGuideMode; onChange: (mode: PhoneGuideMode) => void }): JSX.Element  // MobileSegment med tt('phoneModeNow')/tt('phoneModeTimeline')/tt('phoneModeLists')
export function TvGuideNowPhone(props: TvViewProps & { mode: PhoneGuideMode; onModeChange: (mode: PhoneGuideMode) => void }): JSX.Element
```
Nya strängar: `phoneModeNow: 'Now' / 'Nu'`, `phoneModeTimeline: 'Timeline' / 'Tablå'`, `phoneModeLists: 'Lists' / 'Listor'`, `guideTitle: 'Guide' / 'Guide'`.

I `tv-guide.tsx` `TvGuide`: när `props.phone` — `const pm = phoneGuideMode(mode)`; `const changePhone = (next: PhoneGuideMode) => changeMode(next)` (lagringen skriver `'now' | 'grid' | 'playlists'`, aldrig `'tl'` från telefon); `if (pm === 'playlists') return <TvGuidePlaylists …/>` (P7 ger den en telefongren), `if (pm === 'grid') return <TvGuideGrid …/>` (P6), annars `<TvGuideNowPhone {...props} mode="now" onModeChange={changePhone} />`. `modeStack`/`popMode`/`claimBack` fungerar oförändrat.

Layout (handoffen §2): kolumn `padding 0 16px`, `paddingBottom: MT.SCROLL_PAD_BOTTOM`, `overflowY: auto`, `data-scroll`, `data-testid="guide-phone"`:
1. `<MobileHeader title={tt('guideTitle')} />`
2. `<PhoneGuideModeBar />`
3. `<MobileChips items={groups} value={group} onChange={setGroup} testId="guide-groups" />` (`useGuideGroups(model, tt)` ger `{ key, label, id }`).
4. Lista: `visibleRows.map((channel, i) => <MobileChannelRow key channel number={model.channelNumber(channel)} now={model.nowFor(channel)} nowMs={model.nowMs} locale={locale} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} noProgrammeLabel={model.epgLoading ? tt('loadingGuide') : tt('noProgramme')} onPress={() => nav.play({ channel })} onLongPress={(el) => nav.channelMenu(channel, el)} init={i === 0} testId="guide-row" />)`.
5. `Visa fler` (44 px) när `rows.length > visible`.
6. Tomt läge (`rows.length === 0`): `tt('guideEmpty')` centrerat 15 px muted.

Ingen `TvPreview`, ingen `selectedKey`, ingen `useDebouncedChannel`, ingen `stepCategory`, ingen klocka, ingen tablårad (`tl`).

- [ ] **Steg 1: Tester** (`guide-phone.test.tsx`, `mountPhone({ view: 'guide' })`):
```tsx
it('segment Now/Timeline/Lists, chips, kanalrader; ingen förhandsvisning', async () => {
  mountPhone({ view: 'guide' })
  expect(await screen.findByText('Timeline')).toBeInTheDocument()
  expect(screen.getByText('Lists')).toBeInTheDocument()
  expect(screen.getAllByTestId('guide-row').length).toBeGreaterThan(0)
  expect(document.querySelector('[data-testid="tv-preview"]')).toBeNull()   // kontrollera TvPreview:s testid i tv-preview.tsx
})
it('ett lagrat "tl" visas som Now', async () => {
  writePluginJson(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, 'tl')
  mountPhone({ view: 'guide' })
  expect((await screen.findByText('Now')).closest('[aria-pressed]')).toHaveAttribute('aria-pressed', 'true')
})
it('tryck på rad spelar', async () => {
  mountPhone({ view: 'guide' })
  fireEvent.click((await screen.findAllByTestId('guide-row'))[0])
  expect(await screen.findByTestId('player')).toBeInTheDocument()
})
it('håll på rad öppnar bottenark', async () => {
  vi.useFakeTimers()
  mountPhone({ view: 'guide' })
  const row = (await screen.findAllByTestId('guide-row'))[0]
  fireEvent.pointerDown(row, { pointerType: 'touch', button: 0 })
  vi.advanceTimersByTime(700)
  vi.useRealTimers()
  expect(await screen.findByRole('dialog')).toHaveTextContent('Watch now')
})
it('chip filtrerar', async () => {
  mountPhone({ view: 'guide' })
  fireEvent.click(await screen.findByTestId('chip-News'))
  const rows = screen.getAllByTestId('guide-row')
  expect(rows).toHaveLength(1)
  expect(rows[0]).toHaveTextContent('B')
})
it('inga fjärrkontrollstexter', async () => {
  const { box } = mountPhone({ view: 'guide' })
  await screen.findAllByTestId('guide-row')
  expect(box.textContent).not.toMatch(/\bOK\b|håll|hold OK/)
})
```
- [ ] **Steg 2: Kör och se dem falla.**
- [ ] **Steg 3: Implementera.**
- [ ] **Steg 4: Kör** `npx vitest run runtime/tv/tv-guide.test.tsx runtime/tv/mobile` + tsc.
- [ ] **Steg 5: Commit** `live-tv: guidens Nu-vy på telefon — segment, chips, kanalrader utan förhandsvisning`

---

### Task P6: Guiden · Timeline på telefon

**Filer:**
- Ändra: `runtime/tv/epg-grid-geometry.ts` (px/min som parameter), `runtime/tv/tv-guide-grid.tsx` (tidig gren)
- Skapa: `runtime/tv/mobile/guide-grid-phone.tsx`
- Test: `runtime/tv/epg-grid-geometry.test.ts` (nya fall), `runtime/tv/mobile/guide-grid-phone.test.tsx`

**Gränssnitt:**
```ts
// epg-grid-geometry.ts — bakåtkompatibelt: sista parametern är valfri
export function epgBlockBox(programme, windowStart, windowEnd, pxPerMin = PX_PER_MIN): EpgBlockBox | null
export function epgRowBoxes<P>(programmes, windowStart, windowEnd, pxPerMin = PX_PER_MIN): EpgRowEntry<P>[]
export function nowLinePx(nowMs, windowStart, pxPerMin = PX_PER_MIN): number
export const PHONE_PX_PER_MIN = 260 / 90       // 90 min i ~260 px
export const PHONE_CHANNEL_COL_PX = 112
export const PHONE_ROW_H_PX = 64
// guide-grid-phone.tsx
export function TvGuideGridPhone(props: TvViewProps & { mode: PhoneGuideMode; onModeChange: (mode: PhoneGuideMode) => void }): JSX.Element
```
`tv-guide-grid.tsx`: `export function TvGuideGrid(props) { if (props.phone) return <TvGuideGridPhone {...props} mode={phoneGuideMode(props.mode)} onModeChange={props.onModeChange as …} />; … }` — typa om så att `TvGuide` (P5) skickar rätt callback (enklast: låt `TvGuideGrid`/`TvGuidePlaylists` ta `onModeChange: (mode: GuideMode) => void` som idag; `PhoneGuideMode ⊂ GuideMode`, så telefonens segment kan ropa samma callback).

Datapipeline: samma som skrivbordet (`ordered`, `eligible`, `candidates`, `useSchedules`, `selectEpgRows`) — bryt ut den till `useGridRows(model, group, visibleRows, windowStart, windowEnd)` i `tv-guide-grid.tsx` och använd i båda grenarna. Fönster på telefon: `windowStart = Math.floor((nowMs - 30 * 60_000) / (30 * 60_000)) * (30 * 60_000)` (30 min före nu, avrundat nedåt till halvtimme), `windowEnd = startOfLocalDay(nowMs, 1) + 6 * 3_600_000` (resten av dygnet + morgonen), så "hela dygnet nåbart genom att dra". Dagväljaren (`dayOffset`) finns inte på telefon.

Layout (handoffen §3): header + segment (`PhoneGuideModeBar`) + `<MobileChips>` + datumrad (`Tue 15 Sep` via `new Date(nowMs).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })`, 13 px dim, med **Nu-knappen** höger: 30 px pill `MT.accMix(18)` 13 px `tt('gridNow')`, `data-testid="grid-now-btn"`) + scrollytan:
```tsx
<div ref={scrollRef} data-scroll="" data-testid="grid-phone-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: MT.SCROLL_PAD_BOTTOM }}>
  <div style={{ position: 'relative', minWidth: PHONE_CHANNEL_COL_PX + gridWidth }}>
    {/* tidsrad, sticky top, paddingLeft 112, 30-min-etiketter 11 px faint var 30:e min (width = 30 * PHONE_PX_PER_MIN) */}
    {/* nu-linje: position absolute, left: 112 + nowLeft, top 0 bottom 0, width 2, MT.acc, boxShadow 0 0 12px accMix(60) */}
    {rows.map((row) => (
      <div key style={{ display: 'flex', height: PHONE_ROW_H_PX, borderBottom: `1px solid ${MT.line07}` }}>
        <div style={{ position: 'sticky', left: 0, zIndex: 2, width: PHONE_CHANNEL_COL_PX, flexShrink: 0, background: MT.bg, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
          <MobileLogo channel width={40} height={28} /><span style={{ fontSize: 12, fontWeight: 600, ...clamp2 }}>{row.channel.name}</span>
        </div>
        <div style={{ position: 'relative', width: gridWidth, flexShrink: 0 }}>
          {entries.map(({ box, programme }) => <div key data-testid="grid-block" {...station(() => nav.openChannel(row.channel, programme.start))} style={{ position: 'absolute', top: 8, left: box.left, width: Math.max(box.width - 4, 4), height: 48, borderRadius: 10, padding: box.shape === 'marker' ? 0 : '8px 10px', background: live ? MT.accMix(18) : MT.s05, border: `1px solid ${live ? MT.accMix(45) : 'transparent'}`, overflow: 'hidden' }}>{box.shape !== 'marker' ? <><div style={{ fontSize: 12, fontWeight: 600, ...ellipsis }}>{programme.title}</div>{box.shape === 'full' ? <div style={{ fontSize: 11, color: MT.dim }}>{formatClock(programme.start, locale)}</div> : null}</> : null}</div>)}
        </div>
      </div>
    ))}
  </div>
</div>
```
`gridWidth = ((windowEnd - windowStart) / 60_000) * PHONE_PX_PER_MIN`; `entries = epgRowBoxes(row.programmes, windowStart, windowEnd, PHONE_PX_PER_MIN)`; `nowLeft = nowLinePx(nowMs, windowStart, PHONE_PX_PER_MIN)`. `scrollToNow()`: `scrollLeft = max(0, nowLeft - 40)` vid montering och på Nu-knappen. `Visa fler` under listan när `hasMore`.

- [ ] **Steg 1: Tester.** Geometri: `epgBlockBox({ start: t, stop: t + 90*60_000 }, t, t + 12h, PHONE_PX_PER_MIN).width` ≈ 260; `nowLinePx(t + 45*60_000, t, PHONE_PX_PER_MIN)` ≈ 130; utan parametern oförändrat (`PX_PER_MIN`). Vy: `mountPhone({ view: 'guide' })` + `writePluginJson(…, GUIDE_MODE_KEY, 'grid')` → `grid-phone-scroll` finns, `grid-now-line` finns, kanalkolumnens bredd 112, blocken har `top 8` och `height 48`, tidsetiketterna kommer var 30:e minut, `grid-now-btn` ändrar `scrollLeft`.
- [ ] **Steg 2: Kör och se dem falla.**
- [ ] **Steg 3: Implementera.**
- [ ] **Steg 4: Kör** `npx vitest run runtime/tv/epg-grid-geometry.test.ts runtime/tv/tv-guide-grid.test.ts runtime/tv/mobile` + tsc.
- [ ] **Steg 5: Commit** `live-tv: tablån på telefon — sticky kanalkolumn, 90-minutersfönster, Nu-knapp`

---

### Task P7: Guiden · Lists på telefon (drill-down)

**Filer:**
- Skapa: `runtime/tv/mobile/guide-lists-phone.tsx`
- Ändra: `runtime/tv/tv-guide-playlists.tsx` (tidig gren), `tv-strings.ts`
- Test: `runtime/tv/mobile/guide-lists-phone.test.tsx`

**Gränssnitt:** `export function TvGuideListsPhone(props: TvViewProps & { mode: GuideMode; onModeChange: (mode: GuideMode) => void }): JSX.Element`. State: `const [path, setPath] = useState<{ listId: string; group: string | null; title: string } | null>(null)`; `const [filter, setFilter] = useState('')`. När `path !== null`: `useEffect(() => nav.pushLayer(() => setPath(null)), [path !== null])` (så svep höger/Bakåt poppar nivån — `useSwipeBack` i skalet ropar `back()` som tar lagret först).

Nya strängar: `filterCategories: 'Filter categories' / 'Filtrera kategorier'`, `showAllCategories: 'Show all {count} categories' / 'Visa alla {count} kategorier'`.

Nivå 1 (handoffen §4): header `tt('guideTitle')` + `PhoneGuideModeBar` + filterfält (`<input>` 44 px, radius 14, `MT.s10`, `fontSize: 16`, placeholder `tt('filterCategories')`, `data-testid="lists-filter"`) + sektioner:
- Favourites först (om `model.favouriteChannels.length`): rubrik `sectionLabel` + antal högerställt; kort `background MT.accMix(14), border 1px MT.accMix(40), borderRadius 14` med EN rad (hjärtikon + `tt('favourites')` + antal + CaretRight) → `setPath({ listId: FAVS_GROUP, group: null, title: tt('favourites') })`.
- Per lista i `tree` (samma `useMemo` som skrivbordet — bryt ut `useListTree(model)` i `tv-guide-playlists.tsx`): rubrik = listnamn (`sectionLabel`) + `count` högerställt 12 px; kort `MT.s06` + `MT.line08`, radius 14; rader `minHeight 52, padding 0 14, fontSize 15`, namn `flex 1 ellipsis`, antal (kanaler i gruppen — finns bara när `list.channels` är laddade; annars utelämna) + `›` 13 px dim högerställt; grupper filtrerade på `filter` (case-insensitive `includes`); visar de 6 första + rad `tt('showAllCategories', { count })` som expanderar (lokalt `Set<string>` av expanderade list-id).
- Rad → `setPath({ listId, group, title: group })`. Hela listan → `setPath({ listId, group: null, title: list.name })`.

Nivå 2: `<MobileHeader title={path.title} back onBack={() => setPath(null)} />` + `MobileChannelRow`-lista över `rows` (samma `useListChannels(selectedLists)` + `isPlayableChannel` + gruppfilter som skrivbordet; `sel` ersätts av `path`) + `Visa fler`.

- [ ] **Steg 1: Tester.** `mountPhone({ view: 'guide' })` med `GUIDE_MODE_KEY = 'playlists'`: nivå 1 visar listans namn som sektionsrubrik och kategorirader; klick på en kategori → header med kategorinamn + `guide-row`-rader; `fireEvent.keyDown(window, { key: 'Escape' })` → tillbaka till nivå 1 (inte till hubben: `onNavigate` inte anropad); filterfältet har `fontSize 16px`; Favourites-sektionen visas när pins finns.
- [ ] **Steg 2: Kör och se dem falla.**
- [ ] **Steg 3: Implementera.**
- [ ] **Steg 4: Kör** `npx vitest run runtime/tv/tv-guide-playlists.test.tsx runtime/tv/mobile` + tsc.
- [ ] **Steg 5: Commit** `live-tv: spellistvyn på telefon — lista → kategori som drill-down`

---

### Task P8: Kanaldetalj på telefon

**Filer:**
- Skapa: `runtime/tv/mobile/channel-phone.tsx`
- Ändra: `runtime/tv/tv-channel.tsx` (tidig gren; fas 2:ans `phone ? … : …`-stilar tas bort ur skrivbordsgrenen), `tv-strings.ts`
- Test: `runtime/tv/mobile/channel-phone.test.tsx`

**Gränssnitt:** `export function TvChannelPhone(props: TvViewProps): JSX.Element`. Bryt ut datalagret ur `TvChannel` till `useChannelDetail(model, params)` i `tv-channel.tsx` som returnerar `{ channel, dayOffset, setDayOffset, rows, selected, setSelectedStart, kind, canReplaySelected, reminded, pinned, locked, lockAvailable, scheduleLoading, catchUpByStart, primary, primaryLabel, dayLabel }` — exakt den logik som redan finns, oförändrad — och använd i båda grenarna.

Nya strängar: `programmeSheetInfo: 'Channel info' / 'Kanalinfo'`, `replayDaysShort: 'Replay available {days} days' / 'Repris {days} dagar'`.

Layout (handoffen §5), kolumn `padding 0 16px`, `paddingBottom: MT.SCROLL_PAD_BOTTOM`, `overflowY auto`, `gap 14`:
1. `<MobileHeader title={channel.name} back onBack={nav.back} right={<hjärtknapp 44×44 (ikon 22, filled om pinned, accent) onOk=model.togglePin(channel)>} />`
2. Kanalrad: `MobileLogo 72×46` + textstack (`nr · grupp · kvalitet` 14 px `MT.muted`, `tt('replayDaysShort', { days })` 13 px dim när `archive.days > 0`).
3. Primärknapp: `minHeight 48, borderRadius 999, background MT.acc, color #fff, fontSize 16/600`, `MIcons.Play size=18`, text `primaryLabel`, `station(primary, undefined, { 'data-init': '', 'data-testid': 'channel-primary' })`.
4. Dagchips: `<MobileChips items={DAY_OFFSETS.map(o => ({ key: o, id: String(o), label: dayLabel(o).top }))} value={dayOffset} onChange={setDayOffset} />` — anpassa `MobileChips` så att `Today` (key 0) ritas vit (`background #f3f4f8, color #111`) via en valfri `emphasisKey`-prop; passerade (`o < 0`) 65 % opacitet.
5. Programlista: rad `minHeight 60, padding 10 12, borderRadius 12, gap 12`, tid 46 px tabular 14 px, titel 15 px (`flex 1`, `clamp2`), höger: LIVE-tagg (`kind === 'now'`), `Replay`-tagg (`catchUpByStart.has(start)` och past) eller `MIcons.Bell size=18` (framtida; filled om `isReminded`). Pågående rad `background MT.s06`, titel 600, 4 px förlopp under. Passerade `opacity 0.6`. Tryck → `setSelectedStart(p.start)` + öppna programark.
6. Programark (`MobileSheet` — `title=programme.title`, `subtitle=\`${formatClock(start)}–${formatClock(stop)}\``, items: `[{ key: 'primary', label: primaryLabel, run: primary }, { key: 'info', label: tt('programmeSheetInfo'), run: () => setInfoOpen(true) }]`). Beskrivningen: `MobileSheet` får en valfri `body?: ReactNode`-prop (renderas under huvudet, `padding 12 20, fontSize 14, color muted, maxHeight 30vh, overflow auto`) — lägg till den i `mobile-sheet.tsx` i denna task.
7. Kanalinfo-ark: `body` = rader `tt('quality')`, `tt('source')` (list-namnet via `model.listFor(channel)?.name`), `tt('replayDays')`; items: lås/lås upp (`lockAvailable` → `PinGate`-flödet som idag: `setLockGate(true)`), `menuAddMultiview`.

- [ ] **Steg 1: Tester.** `mountPhone({ view: 'channel', url: 'http://x/A', name: 'A', group: 'Sport' })`: header visar `A` och en tillbaka-knapp; `channel-primary` finns med `Watch now`; programlistan är tom-tålig (fixturen saknar EPG → ingen rad, ingen krasch); hjärtknappen togglar `getPinnedLiveTvKeys()`; `header-back` ropar `onNavigate` mot guiden (skalets `back()` för `view === 'channel'` → `go('guide')`); dagchipsen finns (`chip-0`, `chip--1`, `chip-1`); inga `OK`-texter.
- [ ] **Steg 2: Kör och se dem falla.**
- [ ] **Steg 3: Implementera.**
- [ ] **Steg 4: Kör** `npx vitest run runtime/tv/tv-channel.test.tsx runtime/tv/mobile` + tsc.
- [ ] **Steg 5: Commit** `live-tv: kanaldetalj på telefon — en kolumn, primärknapp, dagchips, programark`

---

### Task P9: Favoriter på telefon (lista + dra-omordning)

**Filer:**
- Skapa: `runtime/tv/mobile/favourites-phone.tsx`, `runtime/tv/mobile/use-drag-reorder.ts`
- Ändra: `runtime/tv/tv-favourites.tsx` (tidig gren), `runtime/live-tv-data.ts` (om `setPinnedLiveTvKeys` inte är exporterad: exportera den), `tv-strings.ts`
- Test: `runtime/tv/mobile/use-drag-reorder.test.ts`, `runtime/tv/mobile/favourites-phone.test.tsx`

**Gränssnitt:**
```ts
// use-drag-reorder.ts — ren pointer-logik, ingen extern lib
export function reorder<T>(items: readonly T[], from: number, to: number): T[]
export function useDragReorder(opts: { count: number; rowHeight: number; onCommit: (from: number, to: number) => void }): {
  dragging: number | null
  offsetY: number                       // aktuell förskjutning för raden som dras
  handleProps: (index: number) => { onPointerDown: (e: React.PointerEvent) => void }
}
// Vid pointerdown på handtaget: setPointerCapture, lyssna pointermove/pointerup på window; to = clamp(round(from + dy / rowHeight)); vid pointerup: om to !== from → onCommit(from, to).
```
Nya strängar: `edit: 'Edit' / 'Redigera'`, `done: 'Done' / 'Klar'`.

Layout (handoffen §6): `<MobileHeader title={tt('favourites')} right={<pill 36 px: editing ? tt('done') : tt('edit')>} />`, underrad `tt('channelsCount', { count })` 13 px dim; rader `minHeight 74, borderRadius 14, background MT.s07, border 1px MT.line08, padding 0 12, gap 12, marginBottom 8`: ordningsnummer 18/600 dim (`index + 1`), `MobileLogo 64×42`, textstack (namn 15/600 `ellipsis`, nu-titel 13 px 80 % `ellipsis`, 3 px förlopp + `N min` 11 px), höger: i redigeringsläge ett dra-handtag 44×44 (`MIcons.ListHandle size=20`, `MT.faint`, `touchAction: 'none'`, `data-testid="fav-handle"`), annars inget. Raden som dras: `transform: translateY(offsetY)`, `zIndex 2`, `boxShadow`. Tryck (ej i redigeringsläge) = `nav.play({ channel })`, håll = `nav.channelMenu(channel, el)` (utan Flytta upp/ner — dra ersätter dem). Sist `+ Add from the guide` (`tt('addFromGuide')`, 48 px, radius 999, `border 1px MT.line14`). `onCommit(from, to)` → `setPinnedLiveTvKeys(reorder(model.pinnedKeys, from, to))`. Tomt läge: `tt('favouritesEmpty')` centrerat.

- [ ] **Steg 1: Tester.** `reorder(['a','b','c'], 0, 2)` → `['b','c','a']`; `reorder(x, 1, 1)` → samma innehåll. `useDragReorder` via `renderHook`: pointerdown på index 0, `fireEvent.pointerMove(window, { clientY: start + 2.2 * rowHeight })`, pointerup → `onCommit(0, 2)`. Vy: `mountPhone({ view: 'favs' })` med två pins: rader `fav-row` i ordning `1`/`2`; `Edit` visar handtag; klick på rad spelar (player-mocken); `+ Add from the guide` navigerar till guiden med `group: 'all'`.
- [ ] **Steg 2: Kör och se dem falla.**
- [ ] **Steg 3: Implementera.**
- [ ] **Steg 4: Kör** `npx vitest run runtime/tv/tv-favourites.test.tsx runtime/tv/mobile` + tsc.
- [ ] **Steg 5: Commit** `live-tv: favoriter på telefon — lista med dra-omordning`

---

### Task P10: Sök på telefon

**Filer:**
- Skapa: `runtime/tv/mobile/search-phone.tsx`
- Ändra: `runtime/tv/tv-search.tsx` (tidig gren; ta bort fas 2:ans `phone ? … : …`-stilar), `tv-strings.ts`
- Test: `runtime/tv/mobile/search-phone.test.tsx`

**Gränssnitt:** `export function TvSearchPhone(props: TvViewProps): JSX.Element`. Data som idag (`searchChannels`, `useProgrammeSearch`, `suggestions`).

Nya strängar: `searchEmptyHint: 'Search channels and today's programmes' / 'Sök kanaler och dagens program'`.

Layout (handoffen §7): kolumn `padding 0 16px`, `paddingBottom: MT.SCROLL_PAD_BOTTOM`:
1. `<MobileHeader title={tt('tabSearch')} />` först (så fältet inte hamnar under värdens menychip), sedan fältraden (`display flex, gap 10, alignItems center`): `<input data-testid="search-input" autoFocus value onChange placeholder={tt('searchPlaceholder')} style={{ flex: 1, minHeight: 44, borderRadius: 14, background: MT.s10, border: `1px solid ${focused ? MT.accMix(50) : 'transparent'}`, padding: '0 14px', fontSize: 16, color: MT.text, caretColor: MT.acc, outline: 'none' }} />` + `Cancel` 15 px (`station(() => nav.back())`, `minHeight 44`).
2. `<MobileChips items={hints.map(h => ({ key: h, label: h, id: h }))} value={query} onChange={setQuery} />` (visas när `hints.length`).
3. Resultat: sektion `tt('searchChannels')` 16/600 + `tt('hits', { count })` 13 px dim; rader `MobileChannelRow variant="search"` (`onPress: nav.openChannel(channel)`, `onLongPress: nav.channelMenu`). Sektion `tt('searchProgrammes')`: rader `minHeight 56` — tid 46 px tabular 14, titel 15 px `flex 1 ellipsis`, kanal 12 px dim `ellipsis` (max 40 %); `station(() => nav.openChannel(hit.channel, hit.programme.start))`.
4. Tomt läge (ingen `query`): centrerat i ytan — `MIcons.MagnifyingGlass size=32` faint + `tt('searchEmptyHint')` 15 px muted. Query utan träffar: `tt('noResults')` centrerat (eller `loadingChannels`/`loadingGuide` under laddning).

- [ ] **Steg 1: Tester.** `mountPhone({ view: 'search' })`: `search-input` har `fontSize 16px`; ingen `tv-keyboard-panel`; tomt läge visar hinten; skriva `A` → `mobile-channel-row` med `A`; `Cancel` ropar skalets back (→ `onNavigate` mot hub).
- [ ] **Steg 2–5:** kör/falla, implementera, `npx vitest run runtime/tv/tv-search.test.tsx runtime/tv/mobile` + tsc, commit `live-tv: sök på telefon — systemtangentbord, två resultatgrupper, centrerat tomt läge`.

---

### Task P11: Multivy på telefon

**Filer:**
- Skapa: `runtime/tv/mobile/multiview-phone.tsx`
- Ändra: `runtime/tv/tv-multiview.tsx` (tidig gren), `tv-strings.ts`
- Test: `runtime/tv/mobile/multiview-phone.test.tsx`

**Gränssnitt:** `export function TvMultiviewPhone(props: TvViewProps): JSX.Element`. Rutor: `narrowVisibleIndices(state)` (exportera den ur `tv-multiview.tsx`) ger `[audioIdx, second]` — exakt två, oavsett `layout`. `Tile`-komponenten återanvänds INTE (den är TV-mått); telefonen får en egen `PhoneTile` i samma fil med `useVideoSurface(ref, …)` på samma sätt (kopiera de tre raderna: `useVideoSurface`, `showsVideo`, `ChannelArt`-fallback).

Nya strängar: `swap: 'Swap' / 'Byt plats'`, `changeChannel: 'Change channel' / 'Byt kanal'`, `selectChannel: 'Select channel' / 'Välj kanal'`.

Layout (handoffen §8): `<MobileHeader title={tt('multiview')} right={<pill 36: tt('swap') → update({ ...state, tiles: swapped, audioIndex: … })>} />`; underrad `tt('audioLabel')` 13 px dim + aktiv kanal 13/600 `ellipsis`; två rutor `height 220, borderRadius 16, gap 12, border 1px (hasAudio ? MT.accMix(55) : MT.line10)`; AUDIO-tagg uppe höger (24 px, `MT.acc`, `#fff`, 11 px `.12em`), tyst ruta: rund knapp 34 px `MIcons.SpeakerSlash` uppe höger; nederkant gradient + `nr · namn · nu-titel` (13/15/13, namnet `flex 1 ellipsis`); tom ruta `rgba(0,0,0,0.55)` + `MIcons.Plus size=32` + `tt('selectChannel')` 15 px → kanalark. Tryck på ruta = ljud hit; håll = `nav.openMenu({ title, element, actions: [audio, switch, full, remove] })` (samma poster som idag minus `enlarge`). Knapprad 2×2-grid (`gridTemplateColumns: '1fr 1fr'`, 46 px, radius 12, `MT.s08`): `tt('changeChannel')` (byter kanal på ljudrutan) / `tt('menuFullscreen')` (spelar ljudrutan). Kanalväljaren: `MobileSheet` med `body` = `<MobileChips>` (grupper) + `MobileChannelRow variant="sheet"`-lista (max 200, `onPress: pick`) och `items=[]` (arket får en Avbryt ändå) — `data-testid="mv-picker-sheet"`. Ingen `Segment`, ingen `TvChannelPicker`.

Byt plats: `tiles[a] ↔ tiles[b]` för de två synliga indexen och `audioIndex` följer med sin kanal.

- [ ] **Steg 1: Tester.** `mountPhone({ view: 'multi' })` med `writePluginJson(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, { layout: 4, tiles: [keyA, keyB, keyC, null], audioIndex: 0 })`: exakt 2 `mv-tile`; ingen layoutväxel (`queryByText('2×2')`-motsv. saknas — kontrollera etiketterna `layout2/3/4`); tom ruta öppnar `mv-picker-sheet`; Swap byter ordningen i `getMultiviewState().tiles` för de två synliga; tryck på andra rutan flyttar ljudet (`audioIndex`).
- [ ] **Steg 2–5:** kör/falla, implementera, `npx vitest run runtime/tv/tv-multiview.test.tsx runtime/tv/tv-multiview-store.test.ts runtime/tv/mobile` + tsc, commit `live-tv: multivy på telefon — två staplade rutor, Swap, kanalark`.

---

### Task P12: Inställningar på telefon

**Filer:**
- Skapa: `runtime/tv/mobile/settings-phone.tsx`
- Ändra: `runtime/tv/tv-settings.tsx` (tidig gren; `Row`/`Heading`/`ListRow`/`Action` får `phone`-prop som byter mått), `tv-strings.ts`
- Test: `runtime/tv/mobile/settings-phone.test.tsx`

**Gränssnitt:** `export function TvSettingsPhone(props: TvViewProps): JSX.Element`. Återanvänd `PlaylistsTab`, `EpgTab`, `ParentalTab` (exportera dem ur `tv-settings.tsx`) med en ny prop `phone: boolean` som de skickar vidare till `Row`/`Heading`/`ListRow`/`Action`/`XtreamAccountCard`. Telefonvarianten av `Row`: `minHeight 52, padding 10 14, fontSize 15, borderRadius 0, background transparent, borderBottom 1px MT.line07` (raderna ligger i ett kort); toggle-rad `minHeight 56`. `Heading` på telefon: `sectionLabel`. `ListRow` på telefon: namn 15/600 `ellipsis` + statustagg på samma rad (`Needs refetch`: `MT.warnSoft`/`MT.warnText`, 11 px, höjd 22), meta 13 px dim på nästa rad, **knapparna i en egen rad under** (`display flex, gap 8, flexWrap wrap, marginTop 8`): `Refetch` 36 px pill, `Logos`-toggle, `Remove`. `Action` på telefon: `minHeight 36, padding 0 12, borderRadius 999, fontSize 14`.

Nya strängar: `settingKeepAwake: 'Keep screen awake while playing' / 'Håll skärmen tänd vid uppspelning'`, `settingFullscreenOnRotate: 'Autoplay in fullscreen on rotate' / 'Helskärm automatiskt vid rotation'`, `sectionPlaylists: 'Playlists' / 'Spellistor'`, `sectionGuide: 'Guide default' / 'Guidens standardvy'`, `sectionBehaviour: 'Behaviour' / 'Beteende'`, `sectionMore: 'More' / 'Mer'`.

Layout (handoffen §9): `<MobileHeader title={tt('railSettings')} />` + kolumn `padding 0 16px`, gap 22, `paddingBottom: MT.SCROLL_PAD_BOTTOM`:
1. **Playlists**: `sectionLabel` + kort (`MT.s06`, `MT.line08`, radius 14, `overflow hidden`) med `<PlaylistsTab … phone />`-innehållet (`ListRow` per lista + `Add M3U URL` / `Add Xtream login` / `Create list` som 52 px rader med `›`).
2. **Guide default**: `<MobileSegment height={38} options={[now, grid, playlists]} value={phoneGuideMode(useGuideMode())} onChange={setGuideMode} />`.
3. **Behaviour**: kort med toggle-rader: `settingStartLast`, `settingKeepAwake`, `settingFullscreenOnRotate` (toggle 44×26, knopp 20, `MT.acc` när på). `previewEnabled`/`numericZap`/`bannerHideMs` renderas INTE.
4. **More**: kort med `tabEpg` → `nav.go('settings', { tab: 'epg' })` och `tabParental` → `{ tab: 'parental' }` som 52 px rader med `›`. När `params.tab === 'epg' | 'parental'` renderas i stället `<MobileHeader title back onBack={() => nav.go('settings')} />` + `<EpgTab … phone />` / `<ParentalTab … phone />` i ett kort. (Accentfärgen ligger inte här.)

- [ ] **Steg 1: Tester.** `mountPhone({ view: 'settings' })`: `setting-previewEnabled`/`setting-numericZap`/`setting-bannerHideMs` saknas; `setting-keepAwake` och `setting-fullscreenOnRotate` finns och togglar `getTvSettings()`; ingen flikkolumn (`tab-appearance` saknas); spellistekortet: `ListRow`:s knapprad ligger i ett annat element än namnet (`refetch`-knappens `closest('[data-list-actions]')` finns); `EPG sources`-raden navigerar till `{ view: 'settings', tab: 'epg' }`; med `tab: 'epg'` visas tillbaka-knappen.
- [ ] **Steg 2–5:** kör/falla, implementera, `npx vitest run runtime/tv/tv-settings.test.tsx runtime/tv/tv-settings-store.test.ts runtime/tv/mobile` + tsc, commit `live-tv: inställningar på telefon — sektionslista, knappar under texten, nya beteendeval`.

---

### Task P13: Spelaren på telefon — porträtt, liggande, rotation, wake lock

**Filer:**
- Skapa: `runtime/tv/mobile/player-chrome-phone.tsx`, `runtime/hooks/useOrientation.ts`, `runtime/hooks/useWakeLock.ts`
- Ändra: `runtime/tv/tv-player-chrome.tsx` (tidig gren), `runtime/live-tv-player.tsx` (scenens mått i porträtt, ingen `tryEnterMobileFullscreen` när `tv?.phone`), `tv-strings.ts`
- Test: `runtime/hooks/useOrientation.test.ts`, `runtime/hooks/useWakeLock.test.ts`, `runtime/tv/mobile/player-chrome-phone.test.tsx`

**Gränssnitt:**
```ts
export function useOrientation(): 'portrait' | 'landscape'      // matchMedia('(orientation: landscape)'); 'portrait' utan matchMedia
export function useWakeLock(active: boolean): void               // navigator.wakeLock?.request('screen') när active; release vid !active/unmount; återta på visibilitychange → visible
export function TvPlayerChromePhone(props: { channel: M3uChannel; tv: LiveTvPlayerTvProps; controls?: LiveTvPlayerControls; paused: boolean; onTogglePause: () => void; onClose: () => void; landscape: boolean }): JSX.Element
// live-tv-player.tsx: exporterar ingenting nytt; scenen får `data-player-stage` och i porträtt på telefon stilen { position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: '16 / 9', maxHeight: '45vh' } i stället för inset 0. `landscape = tv.phone && orientation === 'landscape' && tv.fullscreenOnRotate`.
```
`tv-player-chrome.tsx`: `if (tv.phone) return <TvPlayerChromePhone … landscape={landscape} />` — `landscape` räknas i `live-tv-player.tsx` och skickas ned som ny valfri prop `phoneLandscape?: boolean` på `TvPlayerChrome`. `useWakeLock(tv.phone && tv.keepAwake)` anropas i `live-tv-player.tsx`. `tryEnterMobileFullscreen`: `if (tvChrome?.phone) return` först i funktionen.

Nya strängar: `audioSubs: 'Audio & subs' / 'Ljud & text'`, `autoQuality: 'Auto' / 'Auto'`, `zapList: 'Channels' / 'Kanaler'`.

**Porträtt** (handoffen §10) — kromet renderas som en kolumn UNDER scenen: `position absolute, top: <scenens höjd>` — enklast: hela innehållet i `live-tv-player.tsx` blir på telefon-porträtt en flex-kolumn (`display flex, flexDirection column`) där scenen är första barnet (`position relative, aspectRatio 16/9, flexShrink 0`) och kromets underdel `flex 1, overflowY auto`. Överlägg i videon (absolut i scenen, `opacity` med samma 4 s-timer som idag, `data-testid="phone-overlay"`): Back 40 px rund uppe vänster (`rgba(0,0,0,0.55)`), LIVE-tagg + kvalitet uppe höger, bottenrad volym 40 px (`SpeakerHigh/Slash`, `controls.onToggleMute`) · 4 px förlopp · helskärm 40 px (`ArrowsOut`, `controls.onToggleFullscreen`). Under videon (`padding 16, gap 14`): kanalrad (`MobileLogo 52×34` · `nr · namn` 14 px 70 % `ellipsis` · hjärta 22 px `tv.onToggleFavourite`) → titel 22/600 `clamp2` → `tid · N min kvar` 14 px → `Next Titel · HH:MM` 14 px → knapprutnät 2×2 (46 px, radius 12, `MT.s08`): `audioSubs` (öppnar ett `MobileSheet` med posterna `{ key: 'aspect', label: \`${tt('playerAspect')}: ${controls.aspectLabel}\`, run: controls.onCycleAspect }` och `{ key: 'mute', label: controls.muted ? tt('playerUnmute') : tt('playerMute'), run: controls.onToggleMute }` — det är de ljud/bild-val som finns idag), `autoQuality` (visar `tv.quality ?? 'Auto'`, ingen åtgärd — `aria-disabled`), `menuChannelDetails` (`tv.onOpenChannelDetails`), `menuGuide` (`tv.onOpenGuide`) → **Zap-lista** rubrik `zapList` 15/600 + `MobileChannelRow variant="zap"` för `tv.neighbours` med favoriter först (`tv.neighbours` är redan favoriter först? kontrollera `buildTvPlayerProps`; annars sortera: `[...pinned, ...rest]` med `model.pinnedSet` via en ny prop `pinnedKeys: string[]` i `LiveTvPlayerTvProps`), `onPress: tv.onSwitchChannel(channel)`. Ingen `PlayerScheduleOverlay`/mini-guide, ingen klocka, ingen `TvGlassMenu` (håll på zap-rad → inget).

**Liggande** (handoffen §11): scenen `inset 0`; topprad `padding: 44px 60px 0` (safe area): Back 40 + `nr · namn` 15 px 78 % `ellipsis` vänster, LIVE + `HD · HH:MM` höger; banner nere `padding: 0 60px 22px`, gradient `linear-gradient(180deg, transparent, rgba(0,0,0,0.9) 55%)`: rad 1 = infoblock (`flex 1, minWidth 0`: titel 26/600 `ellipsis`, meta 14 px 70 % `ellipsis`) + kontroller (`flex: '0 0 auto'`, gap 10: volym 44 rund, `Auto` pill 44, `Guide` pill 44 → `tv.onOpenGuide`, `···` 44 rund → `MobileSheet` med dagens `openMenu`-poster utom `guide`), rad 2 = förlopp 5 px full bredd. Tryck på videon visar/döljer överlägget (samma timer). `data-testid="phone-landscape"`.

- [ ] **Steg 1: Tester.** `useOrientation`: mocka `window.matchMedia` (`vi.stubGlobal`) med `matches: true` → `'landscape'`; `change`-lyssnare vänder. `useWakeLock`: stubba `navigator.wakeLock = { request: vi.fn().mockResolvedValue({ release: vi.fn() }) }`; `active` → `request('screen')`; `!active` → `release`; utan `wakeLock` → ingen krasch. Krom: rendera `TvPlayerChromePhone` direkt med en `tv`-fixtur (`phone: true`, `neighbours: [A,B]`, `nowFor`, `onSwitchChannel: vi.fn()`): porträtt → `phone-overlay` + zap-rader (`mobile-channel-row` × 2) + `Channel info`-knapp; klick på zap-rad → `onSwitchChannel(B)`; titeln har `WebkitLineClamp 2`; `landscape` → `phone-landscape`, infoblocket har `flex 1 / minWidth 0`, kontrollernas låda `flex: 0 0 auto`, förloppet ligger i ett syskon efter (`nextElementSibling`). `live-tv-player.test`-svit: befintliga `live-tv-player-chrome.test.tsx` körs oförändrade (`tv.phone` saknas i deras fixtur → skrivbordskrom; lägg `phone: false, fullscreenOnRotate: true, keepAwake: true` i fixturen om typen kräver det).
- [ ] **Steg 2–5:** kör/falla, implementera, `npx vitest run runtime/hooks runtime/tv/tv-player-chrome.test.tsx runtime/tv/tv-player-chrome-controls.test.tsx runtime/live-tv-player-chrome.test.tsx runtime/live-tv-player-controls.test.tsx runtime/tv/mobile` + tsc, commit `live-tv: spelaren på telefon — video överst i porträtt, liggande banner utan överlapp, rotation och wake lock`.

---

### Task P14: Strängvakt, död kod, runtime-bygge, versioner

**Filer:**
- Ändra: `runtime/tv/tv-strings.ts` (ta bort oanvända hjälpsträngar `okWatch`, `okRemind`, `previewLabel`… — bara de som ingen anropare har kvar: `grep -rn "tt('okWatch')"` etc.), `plugins/live-tv/plugin.json`, `plugins/live-tv/package.json`, `plugins/live-tv/CHANGELOG.md`, `plugins/live-tv/dist/runtime.js`, appen: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `lib/generated/bundled-plugin-runtimes/com-lumio-live-tv.js`
- Test: `runtime/tv/mobile/phone-no-remote-vocabulary.test.tsx`

- [ ] **Steg 1: Strängvakten.** Ett test som monterar var och en av `hub`, `guide` (tre lägen), `favs`, `search`, `multi`, `settings`, `channel` med `mountPhone` och asserterar `expect(box.textContent).not.toMatch(/\bOK\b|håll OK|hold OK|◂|▸/)`. Kör: allt grönt.
- [ ] **Steg 2: Död kod.** `grep -rn "usePhoneSurface" runtime | grep -v hooks/ | grep -v tv-shell.tsx | grep -v test` → tom. `grep -rn "PHONE_" runtime/tv/tv-ui.tsx` → tom. `TvChannelPicker`/`TvListPicker`/`TvTextField`/`TvPreview`: ingen `phone`-prop kvar om ingen skickar den. `Icons.Menu` borta. Kör `npx vitest run` → allt grönt; `npx tsc --noEmit -p tsconfig.json` → rent; `node ../../scripts/check-runtime-boundaries.mjs` → ok.
- [ ] **Steg 3: Bygg runtime mot fas 3-appträdet.** Från `/Users/jerry/Local Sites/Moviefinder/.worktrees/mobile-phase3-app`: `node scripts/build-plugin-runtime.mjs "/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/mobile-phase3/plugins/live-tv"` → skriver `plugins/live-tv/dist/runtime.js` och kör typgrinden (TS2304 fäller). Verifiera `git -C "/Users/jerry/Local Sites/lumio-official-plugins/.worktrees/mobile-phase3" status --short` visar bara `plugins/live-tv/dist/runtime.js` (inte twitch).
- [ ] **Steg 4: Bundla i appen.** I appträdet: `node scripts/generate-bundled-plugin-runtimes.mjs` (läs skriptets huvud för argument — det tar pluginkatalogen; peka på fas 3-pluginträdet). Efteråt: `git -C <appträdet> status --short` — bara `lib/generated/bundled-plugin-runtimes/com-lumio-live-tv.js` ska vara ändrad; är andra plugins `dist/` ändrade i pluginträdet, återställ dem med `git checkout -- plugins/<x>/dist`.
- [ ] **Steg 5: Versioner.** Plugin: `plugin.json` `"version": "0.9.0"`, `"minAppVersion": "0.1.600"`; `package.json` `"version": "0.9.0"`; `CHANGELOG.md` överst: `## 0.9.0 — Telefonen i riktiga pixlar` + punktlista (flik-rad, bottenark, en kolumn i alla vyer, tablå med sticky kanalkolumn, favoriter med dra-omordning, systemtangentbord i sök, två rutor i multivy, spelare med video överst / liggande banner, rotation + skärm tänd; kräver app 0.1.600). Sök `0.8.0` i `runtime/index.ts` och rätta efterhalkande strängar. App: `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml` → `0.1.600` (Cargo.lock uppdateras vid bygge; om `cargo` finns: `cargo update -p lumio --offline` eller motsvarande paketnamn — annars låt DMG-bygget uppdatera den).
- [ ] **Steg 6: Commits.** Plugin: `live-tv 0.9.0: telefonen i riktiga pixlar — bygg om dist/runtime.js mot mobile-phase3-app`. App: `live-tv: bundla plugin 0.9.0, app 0.1.600`.
- [ ] **Steg 7: Rapport till Jerry.** Vad som är byggt, vad som INTE är verifierat (riktig telefon iOS/Android, 320 px, liggande, wake lock på Android-webview), och att inget släpps utan klartecken. Test-DMG/APK byggs först på Jerrys ord (memory: `lumio-release-approval`).

---

## Visuell verifiering (efter P14, före Jerrys test)

Starta dev-servern från fas 3-appträdet (`npm run dev` → Vite :5173; kontrollera med `ps` att ingen annan vite kör från ett annat träd — memory `lumio-dev-server-worktree`) och den lokala appen/servern på 3011 om pluginet ska laddas som dev-override (debug-bygge krävs — memory `lumio-dev-plugin-override-debug-only`). Playwright: `browser_resize` till 390×844, 320×568, 430×932, 844×390; navigera till Live TV-sidan; skärmdump av varje vy; kontrollera `document.documentElement.scrollWidth <= innerWidth` i varje vy (`browser_evaluate`). Spara dumparna i scratchpad, inte i repot.
