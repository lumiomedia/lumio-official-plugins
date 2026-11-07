import { beforeEach, describe, expect, it } from 'vitest'
import { __resetPluginStorageForTests } from '@/lib/plugin-sdk'
import {
  addEpgWatch,
  getEpgWatches,
  keywordReminders,
  removeEpgWatch,
  syncEpgWatches,
  updateWatchSeen,
  type EpgWatchSyncDeps,
} from './epg-watches'
import { getReminders, replaceSportReminders, toggleReminder } from './reminders'

const NOW = Date.now()
const H = 60 * 60_000
const svt = { key: 'k-svt', name: 'SVT1', url: 'http://x/svt1', group: 'SE', logo: null, tvgId: 'svt1' }
const svtHd = { key: 'k-svthd', name: 'SVT1 HD', url: 'http://x/svt1hd', group: 'SE', logo: null, tvgId: 'svt1' }
const tv6 = { key: 'k-tv6', name: 'TV6', url: 'http://x/tv6', group: 'SE', logo: null, tvgId: 'tv6' }

function deps(items: { key: string; programme: { title: string; start: number; stop: number } }[]): EpgWatchSyncDeps {
  const channels = [svt, svtHd, tv6]
  return {
    search: async () => items,
    resolve: async (keys) => channels.filter((c) => keys.includes(c.key)),
  }
}

describe('bevaka i tablån', () => {
  beforeEach(() => __resetPluginStorageForTests())

  it('lägger till sökord en gång, oavsett skiftläge, och kräver två tecken', () => {
    addEpgWatch('Allsvenskan', NOW)
    addEpgWatch('  allsvenskan ', NOW)
    addEpgWatch('A', NOW)
    expect(getEpgWatches().map((w) => w.query)).toEqual(['Allsvenskan'])
    removeEpgWatch(getEpgWatches()[0].id)
    expect(getEpgWatches()).toEqual([])
  })

  it('samma program på flera kanaler blir en påminnelse, och bara kommande', () => {
    const watch = { id: 'w', query: 'bond', createdAt: 0 }
    const programme = { title: 'Goldfinger', start: NOW + 2 * H, stop: NOW + 4 * H }
    const reminders = keywordReminders([
      { watch, channel: svt, programme },
      { watch, channel: svtHd, programme },
      { watch, channel: tv6, programme: { title: 'Dr. No', start: NOW - H, stop: NOW + H } },
    ], NOW)
    expect(reminders).toHaveLength(1)
    expect(reminders[0]).toMatchObject({ title: 'Goldfinger', channelName: 'SVT1', origin: 'keyword' })
  })

  it('första synken är tyst, nya träffar därefter upptäcks', () => {
    const r = (h: number) => ({ id: `k@${NOW + h * H}` } as never)
    const first = updateWatchSeen({ id: 'w', query: 'bond', createdAt: 0 }, [r(2), r(3)], NOW)
    expect(first.discovered).toEqual([])
    const second = updateWatchSeen(first.watch, [r(2), r(3), r(4)], NOW)
    expect(second.discovered.map((x) => (x as { id: string }).id)).toEqual([`k@${NOW + 4 * H}`])
  })

  it('en träff som redan setts är inte ny igen, inte ens efter en tom guide', () => {
    const r = (h: number) => ({ id: `k@${NOW + h * H}` } as never)
    const primed = updateWatchSeen({ id: 'w', query: 'bond', createdAt: 0 }, [r(2), r(3)], NOW).watch
    const empty = updateWatchSeen(primed, [], NOW)
    expect(empty.discovered).toEqual([])
    const back = updateWatchSeen(empty.watch, [r(2), r(3)], NOW)
    expect(back.discovered).toEqual([])
    // Det som börjat rensas ur minnet.
    expect(updateWatchSeen(back.watch, [], NOW + 2.5 * H).watch.seen).toEqual([`k@${NOW + 3 * H}`])
  })

  it('avsparken går före en bevakad påminnelse på samma program', async () => {
    addEpgWatch('Allsvenskan', NOW)
    await syncEpgWatches(NOW, deps([{ key: 'k-tv6', programme: { title: 'Allsvenskan: AIK', start: NOW + 3 * H, stop: NOW + 5 * H } }]))
    const keyword = getReminders(NOW).find((r) => r.origin === 'keyword')!
    replaceSportReminders([{ ...keyword, origin: 'sport', leadMs: 15 * 60_000 }], NOW)
    const all = getReminders(NOW)
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ origin: 'sport', leadMs: 15 * 60_000 })
  })

  it('synken skriver påminnelser och rör inte egna eller avsparkens', async () => {
    toggleReminder(svt, { title: 'Rapport', start: NOW + H, stop: NOW + 2 * H }, NOW)
    replaceSportReminders([{
      id: 'sport-1', channelKey: 'x', channelName: 'TV4', channelUrl: 'http://x/tv4', channelLogo: null, channelGroup: 'SE',
      channelTvgId: null, title: 'AIK – Hammarby', start: NOW + 3 * H, stop: NOW + 5 * H, createdAt: NOW, origin: 'sport',
    }], NOW)
    addEpgWatch('Goldfinger', NOW)
    await syncEpgWatches(NOW, deps([{ key: 'k-tv6', programme: { title: 'Goldfinger', start: NOW + 6 * H, stop: NOW + 8 * H } }]))
    const origins = getReminders(NOW).map((r) => r.origin ?? 'manual').sort()
    expect(origins).toEqual(['keyword', 'manual', 'sport'])
    // Sökordet borta: dess påminnelser försvinner, de andra står kvar.
    removeEpgWatch(getEpgWatches()[0].id)
    await syncEpgWatches(NOW, deps([]))
    expect(getReminders(NOW).map((r) => r.origin ?? 'manual').sort()).toEqual(['manual', 'sport'])
  })

  it('upptäcker en ny träff andra gången', async () => {
    addEpgWatch('Bond', NOW)
    const first = await syncEpgWatches(NOW, deps([{ key: 'k-svt', programme: { title: 'Goldfinger', start: NOW + H, stop: NOW + 2 * H } }]))
    expect(first).toEqual([])
    const second = await syncEpgWatches(NOW, deps([
      { key: 'k-svt', programme: { title: 'Goldfinger', start: NOW + H, stop: NOW + 2 * H } },
      { key: 'k-tv6', programme: { title: 'Skyfall', start: NOW + 5 * H, stop: NOW + 7 * H } },
    ]))
    expect(second.flatMap((d) => d.reminders.map((r) => r.title))).toEqual(['Skyfall'])
  })

  it('ett sökfel tar inte bort befintliga påminnelser', async () => {
    addEpgWatch('Bond', NOW)
    await syncEpgWatches(NOW, deps([{ key: 'k-svt', programme: { title: 'Goldfinger', start: NOW + H, stop: NOW + 2 * H } }]))
    await syncEpgWatches(NOW, { search: async () => { throw new Error('busy') }, resolve: async () => [] })
    // Felet hoppas över för sökordet; listan som skrivs är den tomma för just det — påminnelsen
    // ska ändå inte försvinna förrän en lyckad sökning säger det.
    expect(getReminders(NOW).filter((r) => r.origin === 'keyword')).toHaveLength(1)
  })
})
