import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { __resetForTests, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import {
  SPORT_FOLLOWS_KEY, SPORT_KEYS_KEY, SPORT_SETTINGS_KEY, cardOpacity, migrateSportKeys, useSportSettings, withCardOpacity, getFollows, getOverrides, getSportSettings, isFollowing, setOverride,
  hasAnyKey, removeProviderKey, setFollowAlert, setFollowProviderId, setProviderKey, setSportOrder, setSportSettings, sportsCompatible, teamKeysMatch, toggleFollow, useFollows,
} from './sport-store'
import { backfillFollowCrests, useBackfillFollowCrests } from './follow-crest'

beforeEach(() => __resetForTests())

describe('sportinställningar', () => {
  it('standard och sanering av skräp', () => {
    expect(getSportSettings()).toMatchObject({ view: 'matchday', alert: '15' })
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { view: 'grid', alert: 5 })
    expect(getSportSettings()).toMatchObject({ view: 'matchday', alert: '15' })
    expect(setSportSettings({ view: 'feed' })).toMatchObject({ view: 'feed', alert: '15' })
    expect(setSportSettings({ alert: 'kickoff' })).toMatchObject({ view: 'feed', alert: 'kickoff' })
  })
})

describe('följda lag och turneringar', () => {
  const gais = { sport: 'football' as const, kind: 'team' as const, key: 'gais', name: 'GAIS' }
  it('växlar och lagrar på normaliserad nyckel', () => {
    expect(toggleFollow(gais)).toEqual([gais])
    expect(isFollowing(getFollows(), { sport: 'football', kind: 'team', key: 'gais' })).toBe(true)
    expect(toggleFollow(gais)).toEqual([])
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [gais, { sport: 'curling', kind: 'team', key: 'x', name: 'X' }, null])
    expect(getFollows()).toEqual([gais])
  })
  it('ett följt lag känns igen i kort och lång form, och i en sport som klassats som övrigt', () => {
    toggleFollow({ sport: 'hockey', kind: 'team', key: 'djurgarden', name: 'Djurgården' })
    expect(isFollowing(getFollows(), { sport: 'hockey', kind: 'team', key: 'djurgardens' })).toBe(true)
    expect(isFollowing(getFollows(), { sport: 'other', kind: 'team', key: 'djurgarden' })).toBe(true)
    expect(isFollowing(getFollows(), { sport: 'football', kind: 'team', key: 'djurgarden' })).toBe(false)
    expect(isFollowing(getFollows(), { sport: 'hockey', kind: 'league', key: 'djurgarden' })).toBe(false)
  })
  it('useFollows följer lagringen', () => {
    const { result } = renderHook(() => useFollows())
    expect(result.current).toEqual([])
    act(() => { toggleFollow(gais) })
    expect(result.current).toEqual([gais])
  })
})

describe('klockan per lag', () => {
  it('sparas på den följda posten, Av inräknat; skräp släpps; okänd post ändrar ingenting', () => {
    const aik = { sport: 'football' as const, kind: 'team' as const, key: 'aik', name: 'AIK' }
    toggleFollow(aik)
    setFollowAlert(aik, 'kickoff')
    expect(getFollows()).toEqual([{ ...aik, alert: 'kickoff' }])
    setFollowAlert(aik, 'off')
    expect(getFollows()[0]!.alert).toBe('off')
    setFollowAlert({ ...aik, key: 'okand' }, '15')
    expect(getFollows()).toEqual([{ ...aik, alert: 'off' }])
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [{ ...aik, alert: 'snart' }])
    expect(getFollows()).toEqual([aik])
  })
})

describe('källans id på den följda posten (lagsidans uppslag)', () => {
  it('skrivs bara på en följd post som saknar källans id; befintligt id och oföljda lag rörs inte', () => {
    const ham = { sport: 'football' as const, kind: 'team' as const, key: 'hammarby', name: 'Hammarby', providerIds: { sportapi: '5' } }
    toggleFollow(ham)
    expect(setFollowProviderId({ ...ham, key: 'hammarby ff' }, 'api-sports', '363')).toBe(true)
    expect(getFollows()[0]!.providerIds).toEqual({ sportapi: '5', 'api-sports': '363' })
    expect(setFollowProviderId(ham, 'api-sports', '999')).toBe(false)
    expect(setFollowProviderId({ ...ham, key: 'aik' }, 'api-sports', '377')).toBe(false)
    expect(getFollows()).toHaveLength(1)
  })
})

describe('åsidosättningar', () => {
  it('sätter och tar bort en kanal per match', () => {
    const ch = { key: 'A::http://x/A', name: 'A', url: 'http://x/A', logo: null, group: 'Sport', tvgId: null }
    expect(setOverride('m1', ch)).toEqual({ m1: ch })
    expect(getOverrides().m1?.name).toBe('A')
    expect(setOverride('m1', null)).toEqual({})
  })
})

describe('teamKeysMatch (samma regel som Rust)', () => {
  it.each([
    ['djurgarden', 'djurgarden', true],
    ['djurgarden', 'djurgardens', true],
    ['nybro', 'nybro vikings', true],
    ['karlskoga', 'bik karlskoga', true],
    ['aik', 'hammarby', false],
    ['', '', false],
    [null, 'aik', false],
  ] as const)('%s ~ %s = %s', (a, b, expected) => {
    expect(teamKeysMatch(a, b)).toBe(expected)
  })
  it('sportsCompatible', () => {
    expect(sportsCompatible('hockey', 'other')).toBe(true)
    expect(sportsCompatible('hockey', 'football')).toBe(false)
  })
})

describe('fas 2-fälten', () => {
  it('standardvärden, och providerIds bevaras på följda lag', () => {
    expect(getSportSettings()).toMatchObject({ apiKey: null, goalAlerts: true, provider: 'api-sports', keyPlan: null, goalAlertMatches: {} })
    const f = { sport: 'football' as const, kind: 'team' as const, key: 'malmo', name: 'Malmö FF', providerIds: { 'api-sports': '375' } }
    toggleFollow(f)
    expect(getFollows()).toEqual([f])
  })
})

const OWN = { football: 'standard', hockey: 'standard', basketball: 'standard', motorsport: 'standard', tennis: 'standard', other: 'standard' } as const

describe('Bakgrund i Sport', () => {
  it('standard: Alla sporter, varje sport och Övrigt har Standard; korten tonas ur bilden, ingen opacitet vald', () => {
    expect(getSportSettings()).toMatchObject({ backdrops: { all: 'standard', sports: OWN }, cards: { opacity: null, tvOpacity: null, tone: 'image' } })
    expect(getSportSettings().backdrops.sports.other).toBe('standard')
    expect(setSportSettings({ backdrops: { all: 'bogus' as never, sports: { football: 'nope' as never, cricket: 'off' } as never } })).toMatchObject({ backdrops: { all: 'standard', sports: OWN } })
  })
  it('flytt: bakgrundsval från före Standard-överallt nollställs en gång (Jerry 2026-10-11)', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { backdrops: { all: 'custom', sports: { hockey: 'image:tennis', tennis: 'off' } } })
    expect(getSportSettings().backdrops).toEqual({ all: 'standard', sports: OWN })
  })
  it('val sparade efter flytten står kvar vid omläsning', () => {
    setSportSettings({ backdrops: { all: 'custom', sports: { hockey: 'image:tennis', tennis: 'off' } } })
    expect(getSportSettings().backdrops).toEqual({ all: 'custom', sports: { ...OWN, hockey: 'image:tennis', tennis: 'off' } })
  })
  it('"Som Alla sporter" sparas uttryckligen och överlever en omläsning', () => {
    setSportSettings({ backdrops: { all: 'auto', sports: { football: 'inherit', other: 'inherit' } } })
    expect(getSportSettings().backdrops).toEqual({ all: 'auto', sports: { ...OWN, football: 'inherit', other: 'inherit' } })
  })
  it('handboll har ingen egen rad: ett gammalt handbollsval släpps', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { backdrops: { all: 'standard', sports: { handball: 'off' } } })
    expect(getSportSettings().backdrops.sports.handball).toBeUndefined()
  })
  it('per sport med arv; Egen bild, Automatisk och Av sparas', () => {
    const s = setSportSettings({ backdrops: { all: 'auto', sports: { football: 'custom', hockey: 'off', tennis: 'standard' } } })
    expect(s.backdrops).toEqual({ all: 'auto', sports: { ...OWN, football: 'custom', hockey: 'off', tennis: 'standard' } })
  })
  it('en vald medföljande bild sparas per plats; okända bilder släpps', () => {
    const s = setSportSettings({ backdrops: { all: 'image:tennis', sports: { hockey: 'image:football', football: 'image:cricket' as never } } })
    expect(s.backdrops).toEqual({ all: 'image:tennis', sports: { ...OWN, hockey: 'image:football' } })
  })
  it('kortens bakgrund: opacitet 0–100 i heltal, tre färger', () => {
    expect(setSportSettings({ cards: { opacity: 140, tone: 'gray' } }).cards).toEqual({ opacity: 100, tvOpacity: null, tone: 'gray' })
    expect(setSportSettings({ cards: { opacity: -3.4, tone: 'image' } }).cards).toEqual({ opacity: 0, tvOpacity: null, tone: 'image' })
    expect(setSportSettings({ cards: { opacity: 42.6, tvOpacity: 90.2, tone: 'pink' as never } }).cards).toEqual({ opacity: 43, tvOpacity: 90, tone: 'image' })
  })
  /* Jerry 2026-10-11: "50 på desktop, 85 på TV-mode". */
  it('opaciteten per plattform: standard 50 / 85, ett eget val vinner bara på sin plattform', () => {
    const cards = getSportSettings().cards
    expect([cardOpacity(cards, false), cardOpacity(cards, true)]).toEqual([50, 85])
    const tv = setSportSettings({ cards: withCardOpacity(cards, true, 70) }).cards
    expect([cardOpacity(tv, false), cardOpacity(tv, true)]).toEqual([50, 70])
    const desk = setSportSettings({ cards: withCardOpacity(tv, false, 25) }).cards
    expect([cardOpacity(desk, false), cardOpacity(desk, true)]).toEqual([25, 70])
  })
  it('flytten: ett gammalt sparat 50 (bieffekt av andra sparningar) räknas som inte valt; ett annat värde gäller båda', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { cards: { opacity: 50, tone: 'gray' } })
    expect(getSportSettings().cards).toEqual({ opacity: null, tvOpacity: null, tone: 'gray' })
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { cards: { opacity: 70, tone: 'black' } })
    expect(getSportSettings().cards).toEqual({ opacity: 70, tvOpacity: 70, tone: 'black' })
    // En gång: efter flytten är 50 ett riktigt val.
    const chosen = setSportSettings({ cards: withCardOpacity(getSportSettings().cards, false, 50) })
    expect(chosen.cards.opacity).toBe(50)
    expect(getSportSettings().cards.opacity).toBe(50)
  })
  it('gamla inställningar läses ofarligt: Av följer med, länken och startsidans bild glöms', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { backdrop: 'off', backdropCustom: { from: 'url', url: 'https://x/y.jpg' } })
    expect(getSportSettings().backdrops).toEqual({ all: 'off', sports: OWN })
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { backdrop: 'custom', backdropCustom: { from: 'home', index: 1 } })
    expect(getSportSettings().backdrops).toEqual({ all: 'standard', sports: OWN })
    expect(getSportSettings()).not.toHaveProperty('backdropCustom')
  })
})

describe('nycklar per källa (flera källor samtidigt, EN nyckel per källa)', () => {
  it('flytt: en äldre enkel nyckel + källa blir en post i nyckelkartan, med planen', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { apiKey: 'old12345', provider: 'thesportsdb', keyPlan: 'Premium', view: 'feed' })
    const s = getSportSettings()
    expect(s.keys).toEqual({ thesportsdb: { key: 'old12345', plan: 'Premium' } })
    expect(s).toMatchObject({ view: 'feed', apiKey: 'old12345', provider: 'thesportsdb', keyPlan: 'Premium' })
    expect(hasAnyKey(s)).toBe(true)
  })
  it('flytt: äldre post utan källa var API-Sports; utan nyckel blir kartan tom', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { apiKey: 'old12345' })
    expect(getSportSettings().keys).toEqual({ 'api-sports': { key: 'old12345', plan: null } })
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { apiKey: null, provider: 'thesportsdb' })
    expect(getSportSettings().keys).toEqual({})
    expect(hasAnyKey(getSportSettings())).toBe(false)
  })
  it('en ny post med nyckelkarta flyttas aldrig igen (kartan vinner över de härledda fälten)', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { keys: { sportapi: { key: 'sk_live_1', plan: null } }, apiKey: 'stale999', provider: 'api-sports' })
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_1', plan: null } })
    expect(getSportSettings()).toMatchObject({ apiKey: 'sk_live_1', provider: 'sportapi' })
  })
  it('flera källor samtidigt; en andra nyckel för SAMMA källa ersätter den första', () => {
    setProviderKey('api-sports', 'aaaa1111', 'Free')
    setProviderKey('sportapi', 'sk_live_1', null)
    setProviderKey('thesportsdb', '123456', 'Premium')
    expect(Object.keys(getSportSettings().keys).sort()).toEqual(['api-sports', 'sportapi', 'thesportsdb'])
    setProviderKey('api-sports', 'bbbb2222', 'Pro')
    expect(getSportSettings().keys['api-sports']).toEqual({ key: 'bbbb2222', plan: 'Pro' })
    expect(Object.keys(getSportSettings().keys)).toHaveLength(3)
  })
  it('ta bort en källas nyckel rör inte de andra', () => {
    setProviderKey('api-sports', 'aaaa1111', 'Free')
    setProviderKey('sportapi', 'sk_live_1', null)
    removeProviderKey('api-sports')
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_1', plan: null } })
  })
  it('skräp i kartan släpps (okänd källa, ogiltig nyckel)', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { keys: { bogus: { key: 'x1234' }, 'api-sports': { key: '' }, sportapi: 'sk_live_1', thesportsdb: { key: '123456', plan: 7 } } })
    expect(getSportSettings().keys).toEqual({ thesportsdb: { key: '123456', plan: null } })
  })
  it('en äldre skrivning ({ apiKey }) sätter den primära källans nyckel och lämnar andra källor', () => {
    setProviderKey('sportapi', 'sk_live_1', null)
    setSportSettings({ apiKey: 'aaaa1111', provider: 'api-sports' })
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_1', plan: null }, 'api-sports': { key: 'aaaa1111', plan: null } })
  })
  it('källordning per sport: bara kända källor, inga dubbletter', () => {
    setSportOrder('football', ['api-sports', 'sportapi', 'api-sports', 'bogus' as never])
    expect(getSportSettings().order).toEqual({ football: ['api-sports', 'sportapi'] })
  })
})

/**
 * Så som en sportbyggnad från enkelnyckeltiden (live-tv 0.15.0 före
 * flerkällsbytet, 2026-10-11 11–13) skrev om posten: okända fält släpps,
 * okänd källa blir API-Sports. Den skrivningen kom via WebDAV-synken och
 * lade sportapi.ai-nyckeln under API-Sports (Jerry 2026-10-12).
 */
function rewriteAsSingleKeyRuntime(): void {
  const r = readPluginJson<Record<string, unknown>>(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, {})
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, {
    view: r.view, alert: r.alert, apiKey: typeof r.apiKey === 'string' && r.apiKey ? r.apiKey : null, goalAlerts: true,
    provider: r.provider === 'thesportsdb' ? 'thesportsdb' : 'api-sports', keyPlan: typeof r.keyPlan === 'string' ? r.keyPlan : null,
    keyCardDismissed: false, goalAlertMatches: {}, backdrop: 'auto', backdropCustom: null,
  })
}

describe('nyckelintegritet (äldre byggen som skriver samma synkade post)', () => {
  it('en äldre byggnads omskrivning flyttar aldrig sportapi.ai-nyckeln till API-Sports', () => {
    setProviderKey('sportapi', 'sk_live_d4da', null)
    rewriteAsSingleKeyRuntime()
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_d4da', plan: null } })
  })
  it('en äldre byggnads omskrivning tappar inte nyckelkartan', () => {
    setProviderKey('sportapi', 'sk_live_d4da', null)
    setProviderKey('api-sports', 'apis_d191', 'Free')
    rewriteAsSingleKeyRuntime()
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_d4da', plan: null }, 'api-sports': { key: 'apis_d191', plan: 'Free' } })
    expect(getSportSettings()).toMatchObject({ apiKey: 'sk_live_d4da', provider: 'sportapi' })
  })
  it('nycklarna bor i en egen post som äldre byggen aldrig rör', () => {
    setProviderKey('sportapi', 'sk_live_d4da', null)
    expect(readPluginJson<{ keys: unknown }>(LIVE_TV_PLUGIN_ID, SPORT_KEYS_KEY, null as never)).toEqual({ keys: { sportapi: { key: 'sk_live_d4da', plan: null } } })
  })
  it('den sparade spegeln (apiKey/provider) nämner bara källor som äldre byggen förstår', () => {
    setProviderKey('sportapi', 'sk_live_d4da', null)
    let raw = readPluginJson<Record<string, unknown>>(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, {})
    expect(raw).toMatchObject({ apiKey: null, provider: 'api-sports', keyPlan: null })
    setProviderKey('api-sports', 'apis_d191', 'Free')
    raw = readPluginJson<Record<string, unknown>>(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, {})
    expect(raw).toMatchObject({ apiKey: 'apis_d191', provider: 'api-sports', keyPlan: 'Free' })
    // Nuvarande 0.15.0-byggen läser kartan i posten; den skrivs fortfarande med.
    expect(raw.keys).toEqual({ sportapi: { key: 'sk_live_d4da', plan: null }, 'api-sports': { key: 'apis_d191', plan: 'Free' } })
  })
  it('när nyckelposten finns vinner den över allt i inställningsposten', () => {
    setProviderKey('api-sports', 'apis_d191', 'Free')
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { apiKey: 'stale1234', provider: 'api-sports' })
    expect(getSportSettings().keys).toEqual({ 'api-sports': { key: 'apis_d191', plan: 'Free' } })
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { keys: { 'api-sports': { key: 'sk_live_d4da', plan: null } } })
    expect(getSportSettings().keys).toEqual({ 'api-sports': { key: 'apis_d191', plan: 'Free' } })
  })
  it('alla nycklar borttagna stannar borttagna, även om en äldre post bär en nyckel', () => {
    setProviderKey('api-sports', 'apis_d191', 'Free')
    removeProviderKey('api-sports')
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { apiKey: 'apis_d191', provider: 'api-sports' })
    expect(getSportSettings().keys).toEqual({})
  })
  it('flytt utan nyckelpost: en spegel med en känd källa hamnar hos den källan, inte hos API-Sports', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { apiKey: 'sk_live_d4da', provider: 'sportapi', keyPlan: null })
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_d4da', plan: null } })
  })
  it('flytt: nyckelkartan i en nuvarande post sparas i nyckelposten när Sport öppnas', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { keys: { sportapi: { key: 'sk_live_d4da', plan: null } }, apiKey: 'sk_live_d4da', provider: 'sportapi' })
    renderHook(() => useSportSettings())
    rewriteAsSingleKeyRuntime()
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_d4da', plan: null } })
  })
  it('flytten skriver ingenting när det inte finns något att flytta, och bara en gång', () => {
    expect(migrateSportKeys()).toBe(false)
    expect(readPluginJson(LIVE_TV_PLUGIN_ID, SPORT_KEYS_KEY, null)).toBeNull()
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { apiKey: 'apis_d191', provider: 'api-sports' })
    expect(migrateSportKeys()).toBe(true)
    expect(migrateSportKeys()).toBe(false)
  })
  it('en äldre skrivning ({ apiKey }) utan källa gäller API-Sports, aldrig den primära källan', () => {
    setProviderKey('sportapi', 'sk_live_d4da', null)
    setSportSettings({ apiKey: 'apis_d191' })
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_d4da', plan: null }, 'api-sports': { key: 'apis_d191', plan: null } })
  })
  it('useSportSettings följer nyckelposten (t.ex. när synken ändrar den)', () => {
    const { result } = renderHook(() => useSportSettings())
    expect(result.current.keys).toEqual({})
    act(() => { writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_KEYS_KEY, { keys: { thesportsdb: { key: '123456', plan: 'Premium' } } }) })
    expect(result.current.keys).toEqual({ thesportsdb: { key: '123456', plan: 'Premium' } })
  })
})

describe('märke på följd post', () => {
  const crestMatch = { homeKey: 'barcelona', homeCrest: 'https://m/bar.png', awayKey: 'real madrid', awayCrest: null } as never
  it('märket sparas och saneras vid läsning (sträng eller bort)', () => {
    toggleFollow({ sport: 'football', kind: 'team', key: 'barcelona', name: 'Barcelona', crest: 'https://m/bar.png' })
    expect(getFollows()[0].crest).toBe('https://m/bar.png')
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [{ sport: 'football', kind: 'team', key: 'a', name: 'A', crest: 5 }])
    expect('crest' in getFollows()[0]).toBe(false)
  })
  it('backfill fyller bara poster utan märke, en gång, och skriver inget om inget ändras', () => {
    const f = [
      { sport: 'football' as const, kind: 'team' as const, key: 'barcelona', name: 'Barcelona' },
      { sport: 'football' as const, kind: 'team' as const, key: 'real madrid', name: 'Real' },
      { sport: 'football' as const, kind: 'team' as const, key: 'x', name: 'X', crest: 'keep' },
    ]
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, f)
    expect(backfillFollowCrests([crestMatch])).toBe(true)
    expect(getFollows().map((x) => x.crest)).toEqual(['https://m/bar.png', undefined, 'keep'])
    expect(backfillFollowCrests([crestMatch])).toBe(false)
  })
  it('useBackfillFollowCrests skriver i en effekt', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [{ sport: 'football', kind: 'team', key: 'barcelona', name: 'Barcelona' }])
    renderHook(() => useBackfillFollowCrests([crestMatch]))
    expect(getFollows()[0].crest).toBe('https://m/bar.png')
  })
})
