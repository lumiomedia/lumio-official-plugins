import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { CategoriesDialog, CategoryCurationPanel } from './category-curation-panel'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, type LiveTvList } from './live-tv-data'

const SOURCE = 'http://panel.test/p.m3u'
const list: LiveTvList = {
  id: 'l1', name: 'panel.test', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
  kind: 'm3u', source: SOURCE, url: SOURCE,
  groups: [{ name: 'Sport', count: 5 }, { name: 'News', count: 3 }, { name: 'Kids', count: 1 }],
}

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ groups: list.groups }) })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const rowOf = (name: string) => screen.getByRole('checkbox', { name }).closest('[data-cat-row]') as HTMLElement
const markBtn = (name: string) => within(rowOf(name)).getByRole('button', { name: /^Mark(ed)?$/ })
const stored = () => getLiveTvLists()[0]

describe('CategoriesDialog (handoff §4.1)', () => {
  it('rubrik "Categories · värd", brödtext, sammanfattning och wireframens ram', async () => {
    render(<CategoriesDialog list={list} mode="settings" onClose={() => {}} />)
    expect(await screen.findByRole('checkbox', { name: 'Sport' })).toBeInTheDocument()
    expect(screen.getByText('Categories · panel.test')).toBeInTheDocument()
    expect(screen.getByText('Hide the ones you never watch and merge the ones that belong together.')).toBeInTheDocument()
    expect(screen.getByText('3 categories · 0 hidden · 0 merged')).toBeInTheDocument()
    expect(screen.getByTestId('categories-dialog').style.maxWidth).toBe('620px')
    expect(screen.getByRole('button', { name: 'Show all' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide all' })).toBeInTheDocument()
    expect(screen.getByText('To merge categories: press Mark on two or more rows, then give the merged category a name.')).toBeInTheDocument()
  })
  it('kryssrutan döljer/visar; dolt namn blir grått och antalet står i mono', async () => {
    render(<CategoriesDialog list={list} mode="settings" onClose={() => {}} />)
    const news = await screen.findByRole('checkbox', { name: 'News' })
    expect(news).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(news)
    expect(screen.getByRole('checkbox', { name: 'News' })).toHaveAttribute('aria-checked', 'false')
    expect(within(rowOf('News')).getByText('News').style.color).toBe('#8b8e99')
    expect(within(rowOf('News')).getByText('3').style.fontFamily).toContain('monospace')
    expect(screen.getByText('3 categories · 1 hidden · 0 merged')).toBeInTheDocument()
  })
  it('Spara skriver dolda grupper, curationSeen och toastar "Categories saved"', async () => {
    const onClose = vi.fn()
    render(<CategoriesDialog list={list} mode="settings" onClose={onClose} />)
    fireEvent.click(await screen.findByRole('checkbox', { name: 'News' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(stored().curation).toEqual({ hidden: ['News'], merges: [] })
    expect(stored().curationSeen).toBe(true)
  })
  it('Cancel kastar utkastet och Escape är samma sak', async () => {
    const onClose = vi.fn()
    render(<CategoriesDialog list={list} mode="settings" onClose={onClose} />)
    fireEvent.click(await screen.findByRole('checkbox', { name: 'News' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(stored().curation).toBeUndefined()
    cleanup()
    render(<CategoriesDialog list={list} mode="settings" onClose={onClose} />)
    await screen.findByRole('checkbox', { name: 'News' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it('Skip (efter import) skriver bara curationSeen', async () => {
    const onClose = vi.fn()
    render(<CategoriesDialog list={list} mode="after-import" onClose={onClose} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(stored().curationSeen).toBe(true)
    expect(stored().curation).toBeUndefined()
  })
  it('Mark → Marked; två markerade ger ihopslagningsrutan; tomt namn toastar; ihopslagen kategori hamnar under MERGED', async () => {
    render(<CategoriesDialog list={list} mode="settings" onClose={() => {}} />)
    await screen.findByRole('checkbox', { name: 'Sport' })
    fireEvent.click(markBtn('Sport'))
    expect(markBtn('Sport')).toHaveTextContent('Marked')
    expect(markBtn('Sport').style.background).toBe('var(--color-accent-900)')
    expect(screen.queryByRole('button', { name: /^Merge \d/ })).toBeNull()
    fireEvent.click(markBtn('News'))
    expect(screen.getByText('Sport · News')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Merge 2' }))
    expect(screen.getByRole('status')).toHaveTextContent('Give the merged category a name')
    fireEvent.change(screen.getByPlaceholderText('Name the merged category'), { target: { value: 'Kids' } })
    fireEvent.click(screen.getByRole('button', { name: 'Merge 2' }))
    expect(screen.getByRole('status')).toHaveTextContent(/already a visible category/i)
    fireEvent.change(screen.getByPlaceholderText('Name the merged category'), { target: { value: 'Mix' } })
    fireEvent.click(screen.getByRole('button', { name: 'Merge 2' }))
    expect(screen.getByText('Merged')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mix')).toBeInTheDocument()
    expect(screen.getByText('Sport · News · 8 channels')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Sport' })).toBeNull()
    expect(screen.getByText('3 categories · 0 hidden · 1 merged')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(stored().curation?.merges).toEqual([{ name: 'Mix', groups: ['Sport', 'News'] }]))
  })
  it('namnet ändras direkt i MERGED-raden; tomt namn återställs', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, curation: { hidden: [], merges: [{ name: 'Mix', groups: ['Sport', 'News'] }] } }])
    render(<CategoriesDialog list={getLiveTvLists()[0]} mode="settings" onClose={() => {}} />)
    const name = await screen.findByDisplayValue('Mix')
    fireEvent.change(name, { target: { value: 'Nordic' } })
    fireEvent.blur(name)
    expect(screen.getByDisplayValue('Nordic')).toBeInTheDocument()
    const field = screen.getByDisplayValue('Nordic')
    fireEvent.change(field, { target: { value: '  ' } })
    fireEvent.blur(field)
    expect(screen.getByDisplayValue('Nordic')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Give the merged category a name')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(stored().curation?.merges[0].name).toBe('Nordic'))
  })
  it('Split lägger tillbaka medlemmarna med sitt tidigare dolda läge', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, curation: { hidden: ['News'], merges: [{ name: 'Mix', groups: ['Sport', 'News'] }] } }])
    render(<CategoriesDialog list={getLiveTvLists()[0]} mode="settings" onClose={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Split' }))
    expect(screen.getByRole('checkbox', { name: 'Sport' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: 'News' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByText('Merged')).toBeNull()
  })
  it('sökningen filtrerar bara kategorilistan, inte MERGED', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, curation: { hidden: [], merges: [{ name: 'Mix', groups: ['Sport', 'News'] }] } }])
    render(<CategoriesDialog list={getLiveTvLists()[0]} mode="settings" onClose={() => {}} />)
    await screen.findByRole('checkbox', { name: 'Kids' })
    fireEvent.change(screen.getByPlaceholderText('Search categories'), { target: { value: 'zzz' } })
    expect(screen.queryByRole('checkbox', { name: 'Kids' })).toBeNull()
    expect(screen.getByDisplayValue('Mix')).toBeInTheDocument()
  })
  it('Show all / Hide all', async () => {
    render(<CategoriesDialog list={list} mode="settings" onClose={() => {}} />)
    await screen.findByRole('checkbox', { name: 'Kids' })
    fireEvent.click(screen.getByRole('button', { name: 'Hide all' }))
    expect(screen.getByText('3 categories · 3 hidden · 0 merged')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByText('3 categories · 0 hidden · 0 merged')).toBeInTheDocument()
  })
  it('en merge med en grupp leverantören tagit bort visas med de grupper som finns', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, curation: { hidden: [], merges: [{ name: 'Mix', groups: ['Sport', 'Gone'] }] } }])
    render(<CategoriesDialog list={getLiveTvLists()[0]} mode="settings" onClose={() => {}} />)
    expect(await screen.findByDisplayValue('Mix')).toBeInTheDocument()
    expect(screen.getByText('Sport · 5 channels')).toBeInTheDocument()
  })
  it('CategoryCurationPanel är samma komponent (rutnätets tomma läge)', async () => {
    render(<CategoryCurationPanel list={list} mode="settings" onClose={() => {}} />)
    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})
