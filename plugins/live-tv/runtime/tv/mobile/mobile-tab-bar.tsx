import type { ComponentType } from 'react'
import { station } from '../tv-ui'
import { useTvText, type TvStringKey } from '../tv-strings'
import type { TvView } from '../tv-shell'
import { MT } from './mobile-tokens'
import { MIcons } from './mobile-icons'

export type MobileTab = 'hub' | 'guide' | 'favs' | 'search' | 'more'

const TABS: { key: MobileTab; icon: ComponentType<{ size?: number }>; label: TvStringKey }[] = [
  { key: 'hub', icon: MIcons.House, label: 'tabHome' },
  { key: 'guide', icon: MIcons.List, label: 'tabGuide' },
  { key: 'favs', icon: MIcons.Heart, label: 'tabFavourites' },
  { key: 'search', icon: MIcons.MagnifyingGlass, label: 'tabSearch' },
  { key: 'more', icon: MIcons.DotsThree, label: 'tabMore' },
]

/** Kanaldetalj hör till Guide-fliken; multivy och inställningar saknar egen flik och landar under More. */
export function tabForView(view: TvView): MobileTab {
  if (view === 'channel') return 'guide'
  if (view === 'multi' || view === 'settings') return 'more'
  return view
}

export function MobileTabBar({ view, onGo, onMore }: { view: TvView; onGo: (view: 'hub' | 'guide' | 'favs' | 'search') => void; onMore: () => void }) {
  const { tt } = useTvText()
  const active = tabForView(view)
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
      {TABS.map(({ key, icon: Icon, label }) => {
        const isActive = key === active
        return (
          <div
            key={key}
            data-testid={`tab-${key}`}
            {...station(() => (key === 'more' ? onMore() : onGo(key)), undefined, { ...(isActive ? { 'aria-current': 'page' } : {}), 'aria-label': tt(label) })}
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
