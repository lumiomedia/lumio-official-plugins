import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import { createLiveTvList } from '../live-tv-data'
import { HubRowsSection } from './hub-rows-settings'
import { addListRow, sanitizeHubRows, toggleHubRow } from './hub-rows'
import { tvText } from './tv-strings'

const tt = (key: Parameters<typeof tvText>[1], vars?: Record<string, string | number>) => tvText('en', key, vars)

beforeEach(() => __resetForTests())
afterEach(cleanup)

describe('Rader i Kanaler (inställningarna)', () => {
  it('de inbyggda raderna med Visas/Dold; utan egna listor säger Lägg till vad som behövs', () => {
    render(<HubRowsSection rows={toggleHubRow(sanitizeHubRows(undefined), 'sport')} tt={tt} />)
    expect(screen.getByTestId('hub-row-onNow')).toHaveTextContent('Shown')
    expect(screen.getByTestId('hub-row-sport')).toHaveTextContent('Hidden')
    expect(screen.getByTestId('hub-row-add')).toHaveTextContent('Create a list under Playlists first')
  })
  it('en egen lista som rad visas med listans namn', () => {
    const list = createLiveTvList('Jerrys favoriter')
    render(<HubRowsSection rows={addListRow(sanitizeHubRows(undefined), list.id)} tt={tt} />)
    expect(screen.getByTestId(`hub-row-list:${list.id}`)).toHaveTextContent('Jerrys favoriter')
    expect(screen.getByTestId('hub-row-add')).toHaveTextContent('All your lists are already rows')
  })
})
