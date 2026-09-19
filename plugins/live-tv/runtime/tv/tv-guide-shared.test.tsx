import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { M3uChannel } from '../live-tv-data'
import { GUIDE_CELL_WIDTH, GuideChannelCell, guideCellStyle } from './tv-guide-shared'
import { gp } from './guide-view-shared'

const ch = (name: string, group = 'Sport'): M3uChannel => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })

afterEach(cleanup)

describe('guideCellStyle', () => {
  it("'grid' ger exakt flex/width/minWidth/boxSizing för 240 px i scenens skala", () => {
    expect(guideCellStyle('grid')).toEqual({ flex: `0 0 ${gp(240)}px`, width: gp(240), minWidth: 0, boxSizing: 'border-box' })
  })

  it("'nownext' är 340 px, 'timeline' är 240 px i scenens skala (GUIDE_CELL_WIDTH)", () => {
    expect(GUIDE_CELL_WIDTH).toEqual({ grid: gp(240), nownext: gp(340), timeline: gp(240) })
    expect(guideCellStyle('nownext').width).toBe(gp(340))
    expect(guideCellStyle('timeline').width).toBe(gp(240))
  })
})

describe('GuideChannelCell', () => {
  it('kort och långt kanalnamn ger samma style.flex (kanalcellen är en fast layoutkontext, inte innehållsstyrd)', () => {
    const { container: shortC } = render(<GuideChannelCell channel={ch('A')} number={1} pinned={false} locked={false} variant="grid" />)
    const { container: longC } = render(
      <GuideChannelCell channel={ch('A Very Long Channel Name That Would Overflow The Cell')} number={2} pinned={false} locked={false} variant="grid" />,
    )
    const shortStyle = (shortC.firstChild as HTMLElement).style
    const longStyle = (longC.firstChild as HTMLElement).style
    expect(shortStyle.flex).toBe(longStyle.flex)
    expect(shortStyle.flex).toBe(`0 0 ${gp(240)}px`)
  })

  it('visar kanalnummer, namn och grupp · kvalitet i Grid', () => {
    render(<GuideChannelCell channel={ch('4K Sky Sports', 'Sport')} number={7} pinned={false} locked={false} variant="grid" />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('4K Sky Sports')).toBeInTheDocument()
    expect(screen.getByText('Sport · 4K')).toBeInTheDocument()
  })

  it('Timeline utelämnar grupp/kvalitet-raden (bara nummer + namn)', () => {
    render(<GuideChannelCell channel={ch('Sky Sports', 'Sport')} number={7} pinned={false} locked={false} variant="timeline" />)
    expect(screen.getByText('Sky Sports')).toBeInTheDocument()
    expect(screen.queryByText('Sport')).not.toBeInTheDocument()
  })

  it('pinned visar hjärtat, locked visar låset', () => {
    const { rerender } = render(<GuideChannelCell channel={ch('A')} number={null} pinned={true} locked={false} variant="grid" />)
    expect(screen.getByTestId('guide-cell-pinned')).toBeInTheDocument()
    expect(screen.queryByTestId('guide-cell-locked')).not.toBeInTheDocument()
    rerender(<GuideChannelCell channel={ch('A')} number={null} pinned={false} locked={true} variant="grid" />)
    expect(screen.queryByTestId('guide-cell-pinned')).not.toBeInTheDocument()
    expect(screen.getByTestId('guide-cell-locked')).toBeInTheDocument()
  })
})
