import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SportMatchCenter } from './sport-match-center'
import { fakeCtx, fxMatch } from '../__sport-fixture'

describe('Matchcentret på skrivbordet', () => {
  it('lådan går hela vägen upp; innehållet går fri från mac-titelraden (--tv-scene-top-inset)', () => {
    // Serverrendering: happy-dom kastar stilvärden med var() i calc().
    const markup = renderToStaticMarkup(<SportMatchCenter ctx={fakeCtx()} match={fxMatch()} onClose={() => {}} />)
    const host = document.createElement('div')
    host.innerHTML = markup
    const style = host.querySelector('[data-testid="match-center"]')?.outerHTML.match(/style="([^"]*)"/)?.[1] ?? ''
    expect(style).toContain('var(--tv-scene-top-inset, 0px)')
  })
})
