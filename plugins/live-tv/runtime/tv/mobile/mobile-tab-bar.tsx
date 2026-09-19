import type { ComponentType } from 'react'
import { station } from '../tv-ui'
import { useTvText, type TvStringKey } from '../tv-strings'
import type { TvView } from '../tv-shell'
import { MT } from './mobile-tokens'
import { MIcons } from './mobile-icons'

export type MobileTab = 'hub' | 'guide' | 'favs' | 'search' | 'library' | 'more'

type TabDef = { key: MobileTab; icon: ComponentType<{ size?: number }>; label: TvStringKey }

const BASE_TABS: TabDef[] = [
  { key: 'hub', icon: MIcons.House, label: 'tabHome' },
  { key: 'guide', icon: MIcons.List, label: 'tabGuide' },
  { key: 'favs', icon: MIcons.Heart, label: 'tabFavourites' },
  { key: 'search', icon: MIcons.MagnifyingGlass, label: 'tabSearch' },
]

const LIBRARY_TAB: TabDef = { key: 'library', icon: MIcons.FilmStrip, label: 'tabLibrary' }
const MORE_TAB: TabDef = { key: 'more', icon: MIcons.DotsThree, label: 'tabMore' }

/**
 * Biblioteket är en SJÄTTE flik, och bara när spellistan har film eller
 * serier.
 *
 * Fem flikar på 360 px ger 72 px styck; sex ger 60, vilket fortfarande är över
 * Androids 48 dp. Men en tom flik är värre än en saknad: den som bara har
 * kanaler ska inte betala bredd för en vy utan innehåll. Därför villkoret —
 * inte en permanent sjätte plats.
 */
function tabsFor(showLibrary: boolean): TabDef[] {
  return showLibrary ? [...BASE_TABS, LIBRARY_TAB, MORE_TAB] : [...BASE_TABS, MORE_TAB]
}

/** Kanaldetalj hör till Guide-fliken; multivy och inställningar saknar egen flik och landar under More. */
export function tabForView(view: TvView): MobileTab {
  if (view === 'channel') return 'guide'
  // Detaljvyn och rollistan nås BARA ur Biblioteket, så fliken ska lysa där.
  if (view === 'title' || view === 'cast') return 'library'
  if (view === 'multi' || view === 'settings') return 'more'
  return view
}

export function MobileTabBar({ view, onGo, onMore, showLibrary = false }: { view: TvView; onGo: (view: 'hub' | 'guide' | 'favs' | 'search' | 'library') => void; onMore: () => void; showLibrary?: boolean }) {
  const { tt } = useTvText()
  const active = tabForView(view)
  const tabs = tabsFor(showLibrary)
  return (
    <nav
      data-testid="mobile-tab-bar"
      aria-label={tt('liveTv')}
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box',
        height: `calc(${MT.TAB_BAR}px + ${MT.SAFE_BOTTOM})`, paddingBottom: MT.SAFE_BOTTOM,
        borderTop: `1px solid ${MT.line08}`,
        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.92) 45%)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
      }}
    >
      {tabs.map(({ key, icon: Icon, label }) => {
        const isActive = key === active
        return (
          <div
            key={key}
            data-testid={`tab-${key}`}
            {...station(() => (key === 'more' ? onMore() : onGo(key as 'hub' | 'guide' | 'favs' | 'search' | 'library')), undefined, { ...(isActive ? { 'aria-current': 'page' } : {}), 'aria-label': tt(label) })}
            style={{
              flex: 1, minHeight: MT.TAB_BAR, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              color: isActive ? MT.acc : 'rgba(243,244,248,0.55)', fontSize: 11, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
            }}
          >
            <Icon size={22} />
            <span>{tt(label)}</span>
          </div>
        )
      })}
    </nav>
  )
}
