import { afterEach, describe, expect, it } from 'vitest'
import { markRowNeighbours } from './row-nav'

/*
  Radordningen på TV (Jerry 2026-10-12) mot en uppbyggd Flöde-sida i
  1080-scenens mått: "Visa som" uppe till höger, dagstegaren och sportchipsen,
  Dina lag-cirklarna, Just nu-raderna — och ett rutnät som undantag.
*/

afterEach(() => { document.body.innerHTML = '' })

function station(parent: HTMLElement, id: string, x: number, y: number, w = 100, h = 50): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-f', '')
  el.setAttribute('data-testid', id)
  el.getBoundingClientRect = () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) }) as DOMRect
  parent.appendChild(el)
  return el
}
const by = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!
const down = (id: string) => document.querySelector(by(id).getAttribute('data-f-down') ?? '')?.getAttribute('data-testid') ?? null
const up = (id: string) => document.querySelector(by(id).getAttribute('data-f-up') ?? '')?.getAttribute('data-testid') ?? null

function feed(): HTMLElement {
  const root = document.createElement('div')
  document.body.appendChild(root)
  station(root, 'tab-foryou', 48, 80, 160, 50)
  station(root, 'tab-results', 230, 80, 160, 50)
  station(root, 'view-matchday', 1500, 84, 160, 44)
  station(root, 'view-feed', 1680, 84, 160, 44)
  station(root, 'day-prev', 48, 170, 56, 64)
  station(root, 'day-next', 280, 170, 56, 64)
  station(root, 'chip-all', 360, 176, 90, 52)
  station(root, 'chip-tennis', 1200, 176, 120, 52)
  station(root, 'team-1', 72, 300, 150, 160)
  station(root, 'team-2', 246, 300, 150, 160)
  station(root, 'add', 420, 300, 150, 160)
  station(root, 'now-1', 300, 540, 1300, 70)
  station(root, 'now-1-play', 1780, 547, 56, 56)
  station(root, 'now-2', 300, 630, 1300, 70)
  return root
}

describe('▾/▴ i radordning', () => {
  it('Visa som ▾ → nästa rad, första stoppet (dagstegaren ‹), inte det som står rakt under', () => {
    markRowNeighbours(feed())
    expect(down('view-feed')).toBe('day-prev')
    expect(down('tab-results')).toBe('day-prev')
  })
  it('sportchipsen ▾ → första Dina lag-cirkeln; sista Dina lag ▾ → första Just nu-raden', () => {
    markRowNeighbours(feed())
    expect(down('chip-tennis')).toBe('team-1')
    expect(down('add')).toBe('now-1')
    expect(down('now-1-play')).toBe('now-2')
  })
  it('▴ speglar: föregående rad, första stoppet', () => {
    markRowNeighbours(feed())
    expect(up('add')).toBe('day-prev')
    expect(up('now-1-play')).toBe('team-1')
    expect(up('day-next')).toBe('tab-foryou')
  })
  it('grannar som någon annan satt står kvar; de egna räknas om', () => {
    const root = feed()
    by('chip-all').setAttribute('data-f-down', '[data-testid="now-2"]')
    markRowNeighbours(root)
    expect(down('chip-all')).toBe('now-2')
    expect(by('chip-tennis').getAttribute('data-f-down-auto')).toBe('row')
  })
  it('i ett rutnät går ▾ rakt ner (motorns geometri): inga radgrannar där', () => {
    const root = feed()
    const grid = document.createElement('section')
    grid.setAttribute('data-grid', '')
    root.appendChild(grid)
    station(grid, 'card-1', 48, 760, 440, 110)
    station(grid, 'card-2', 504, 760, 440, 110)
    station(grid, 'card-5', 504, 886, 440, 110)
    markRowNeighbours(root)
    expect(by('card-2').hasAttribute('data-f-down')).toBe(false)
    expect(by('card-5').hasAttribute('data-f-up')).toBe(false)
  })
  it('kolumner är egna rum: en rad i högerkolumnen leder inte ner i vänsterkolumnen', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const left = document.createElement('div'); left.setAttribute('data-col', 'left'); root.appendChild(left)
    const right = document.createElement('div'); right.setAttribute('data-col', 'right'); root.appendChild(right)
    station(left, 'form-1', 48, 300, 800, 70)
    station(left, 'form-2', 48, 390, 800, 70)
    station(right, 'table-1', 940, 300, 900, 60)
    station(right, 'table-2', 940, 380, 900, 60)
    markRowNeighbours(root)
    expect(down('table-1')).toBe('table-2')
    expect(down('form-1')).toBe('form-2')
  })
})
