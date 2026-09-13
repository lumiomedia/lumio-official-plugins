#!/usr/bin/env node
/**
 * Fejkad Lumio-app för Live TV:s v2-kontrakt (`/api/live-tv/…`).
 *
 * VARFÖR DEN FINNS
 * ----------------
 * Pluginets kanaler, import och EPG ligger sedan 0.5.0 i APPEN, inte i
 * webbläsarlagringen. Vyerna går därför bara att prova mot en app som svarar
 * på de nya endpointsen — och appens axum-server är hårdkodad till port 3011,
 * som på den här maskinen ägs av den INSTALLERADE (gamla) Lumio-appen. Att
 * starta worktreets app hade dessutom delat Jerrys riktiga `storage.json` och
 * migrerat hans skarpa listor.
 *
 * Den här servern svarar i stället på exakt samma former som Rust-sidan
 * (`src-tauri/src/live_tv_index.rs`, `live_tv_import.rs`, `live_tv_epg.rs`)
 * mot ett index i minnet. Peka dev-serverns `/api`-proxy hit, så kör hela
 * pluginet — hubb, guide, favoriter, sök, inställningar, migrering — utan att
 * appen behöver byggas eller startas.
 *
 * DEN ÄR INTE APPEN. Den bevisar att KLIENTEN talar rätt protokoll och att
 * vyerna håller måttet vid 17 000 kanaler. Rust-sidans egen riktighet bevisas
 * av dess 481 enhetstester och av Jerrys manuella runda på en riktig box.
 *
 * KÖR
 * ---
 *   # 17 000 kanaler genererade internt (inget beroende på panelen):
 *   node plugins/live-tv/tools/fake-live-tv-api.mjs
 *
 *   # importjobbet hämtar på riktigt från fejkpanelen:
 *   XTREAM_BASE=http://127.0.0.1:8987 node plugins/live-tv/tools/fake-live-tv-api.mjs
 *
 *   # servera en lokalt byggd pluginruntime som dev-override:
 *   DEV_RUNTIME=plugins/live-tv/dist/runtime.js node plugins/live-tv/tools/fake-live-tv-api.mjs
 *
 * Peka sedan dev-serverns proxy hit (PORT, standard 8990).
 *
 * EXTRA (inte appens kontrakt): `/api/__mock/state` visar vad servern tagit
 * emot — antal batch-anrop, källor, jobb. Det är BEVISET i verifieringen:
 * migreringen ska synas som `batch`-anrop med `replace: true`, inte som en
 * skärmdump av en lista.
 *
 * Inga beroenden, bara node:http.
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const PORT = Number(process.env.PORT ?? 8990)
/** Fejkpanelen att hämta på riktigt från i importjobbet. Tom = generera internt. */
const XTREAM_BASE = process.env.XTREAM_BASE ?? ''
/** Hur många kanaler en intern generering ger. */
const GENERATED_CHANNELS = Number(process.env.STREAMS ?? 17000)
const GENERATED_CATEGORIES = Math.max(1, Number(process.env.CATEGORIES ?? 60))
/** Sökvägen till en lokalt byggd `dist/runtime.js` som ska vinna över den bundlade. */
const DEV_RUNTIME = process.env.DEV_RUNTIME ?? ''
/**
 * Hur länge ett importjobb låtsas hålla på. Riktiga jobb tar sekunder; ett
 * jobb som är klart på 20 ms hade gjort framstegstexten omöjlig att se, och
 * det är precis den texten som ska verifieras.
 */
const IMPORT_FETCH_MS = Number(process.env.IMPORT_FETCH_MS ?? 1400)
const IMPORT_PARSE_MS = Number(process.env.IMPORT_PARSE_MS ?? 700)
const IMPORT_WRITE_MS = Number(process.env.IMPORT_WRITE_MS ?? 600)

/* ── Indexet i minnet ────────────────────────────────────────────────────── */

/** id → { id, updatedAt, channels[] } */
const sources = new Map()
/** listId → { listId, urls, sources, fetchedAt, failedAt, sourceStats, programmes: Map<tvgId, Programme[]> } */
const epgStores = new Map()
/** job → status */
const jobs = new Map()

/** Allt servern tagit emot, för verifieringen. */
const log = {
  batchCalls: [],
  imports: [],
  epgRefreshes: [],
  unknownPaths: new Map(),
  requestCounts: new Map(),
}

const CATEGORY_WORDS = [
  'Sverige', 'Norge', 'Danmark', 'Finland', 'Island', 'Storbritannien', 'Irland',
  'Tyskland', 'Frankrike', 'Spanien', 'Italien', 'Portugal', 'Nederländerna',
  'Belgien', 'Polen', 'Tjeckien', 'Österrike', 'Schweiz', 'Grekland', 'Turkiet',
  'USA', 'Kanada', 'Mexiko', 'Brasilien', 'Argentina', 'Chile', 'Australien',
  'Nya Zeeland', 'Japan', 'Sydkorea', 'Indien', 'Pakistan', 'Kina', 'Thailand',
  'Vietnam', 'Filippinerna', 'Egypten', 'Marocko', 'Sydafrika', 'Nigeria',
]
const CATEGORY_KINDS = ['Sport', 'Film', 'Serier', 'Nyheter', 'Barn', 'Musik', 'Dokumentär', 'Underhållning']

function categoryName(index) {
  if (index === 0) return 'Test'
  const i = index - 1
  return `${CATEGORY_WORDS[i % CATEGORY_WORDS.length]} ${CATEGORY_KINDS[Math.floor(i / CATEGORY_WORDS.length) % CATEGORY_KINDS.length]}`
}

const channelKey = (name, url) => `${name}::${url}`

/**
 * Samma kanaler som `fake-xtream-panel.mjs` genererar, utan att gå över
 * nätet. Appen räknar `key` och `number` själv vid en import — här gör
 * servern det, precis som `assign_keys_and_numbers` i Rust.
 */
function generateChannels(count, categories) {
  const out = []
  const generatedCategories = Math.max(1, categories - 1)
  for (let n = 1; n <= count; n += 1) {
    const catIndex = n <= 3 ? 0 : 1 + ((n - 1) % generatedCategories)
    const group = categoryName(catIndex)
    const name = n <= 3 ? `Lumio Test ${n}` : `${group} ${String(n).padStart(5, '0')}`
    const url = `http://127.0.0.1:8987/live/lumio/test/${n}.ts`
    out.push({
      name,
      logo: null,
      group,
      url,
      tvgId: n % 3 === 0 ? `lumio.gen.${n}` : null,
      key: channelKey(name, url),
      number: n,
    })
  }
  return out
}

/** Nyckel och nummer sätts av appen, aldrig av avsändaren (Rust: assign_keys_and_numbers). */
function assignKeysAndNumbers(channels) {
  channels.forEach((channel, i) => {
    if (!channel.key) channel.key = channelKey(channel.name ?? '', channel.url ?? '')
    channel.number = i + 1
  })
  return channels
}

function writeSource(id, channels, replace) {
  const existing = sources.get(id)
  const next = replace || !existing ? [] : existing.channels.slice()
  next.push(...channels)
  assignKeysAndNumbers(next)
  sources.set(id, { id, updatedAt: Date.now(), channels: next })
  // Namnmatchningen appen kör vid replace: tvg-id direkt, annars namnmatch mot
  // EPG:ts display-names. Här räcker tvg-id — genererade EPG-kanaler använder
  // samma id, och namnmatchningens riktighet bevisas av Rusts enhetstester.
  for (const channel of next) channel.tvgIdResolved = channel.tvgId ?? null
  return next.length
}

function allChannels(source) {
  if (source) return sources.get(source)?.channels ?? []
  const out = []
  for (const id of [...sources.keys()].sort()) out.push(...(sources.get(id)?.channels ?? []))
  return out
}

function normalise(text) {
  return String(text ?? '').toLowerCase()
}

/* ── EPG ─────────────────────────────────────────────────────────────────── */

const SLOT_MS = 30 * 60_000

/** Program i 30-minutersblock runt nuet, härledda ur tvg-id — ingen lagring behövs. */
function programmesFor(tvgId, from, to) {
  const out = []
  const first = Math.floor(from / SLOT_MS) * SLOT_MS
  for (let start = first; start < to; start += SLOT_MS) {
    const index = Math.floor(start / SLOT_MS)
    out.push({
      title: `${tvgId} — block ${index % 48}`,
      description: `Testprogram för ${tvgId}, genererat av fake-live-tv-api.`,
      start,
      stop: start + SLOT_MS,
    })
  }
  return out
}

function nowNextLater(tvgId, at) {
  const [now, next, later] = programmesFor(tvgId, at - SLOT_MS, at + 3 * SLOT_MS)
    .filter((p) => p.stop > at)
    .slice(0, 3)
  return { now: now ?? null, next: next ?? null, later: later ?? null }
}

function epgScopedChannels(store, sourceHint) {
  const scope = sourceHint ? [sourceHint] : (store?.sources?.length ? store.sources : [...sources.keys()])
  const out = []
  for (const id of scope) out.push(...(sources.get(id)?.channels ?? []))
  return out
}

/* ── Importjobb ──────────────────────────────────────────────────────────── */

let jobCounter = 0
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchFromPanel(base) {
  const auth = `username=${process.env.XTREAM_USER ?? 'lumio'}&password=${process.env.XTREAM_PASS ?? 'test'}`
  const cats = await fetch(`${base}/player_api.php?${auth}&action=get_live_categories`).then((r) => r.json())
  const streams = await fetch(`${base}/player_api.php?${auth}&action=get_live_streams`).then((r) => r.json())
  const names = new Map(cats.map((c) => [String(c.category_id), c.category_name]))
  return streams.map((s) => {
    const name = s.name
    const url = `${base}/live/lumio/test/${s.stream_id}.ts`
    return {
      name,
      logo: s.stream_icon || null,
      group: names.get(String(s.category_id)) ?? '',
      url,
      tvgId: s.epg_channel_id || null,
      key: channelKey(name, url),
      number: 0,
    }
  })
}

/**
 * Jobbet med samma tillståndsmaskin som Rust: fetching → parsing → writing →
 * done, `received`/`total` räknade i kanaler. Stegen tar sekunder med flit
 * (se IMPORT_*_MS) — det är den enda vägen att se framstegstexten i vyn.
 */
async function runImport(job, source, body) {
  const status = jobs.get(job)
  try {
    status.state = 'fetching'
    const started = Date.now()
    const channels = XTREAM_BASE && body.xtream
      ? await fetchFromPanel(XTREAM_BASE)
      : generateChannels(GENERATED_CHANNELS, GENERATED_CATEGORIES)
    const total = channels.length
    // Hämtningen räknar upp mot totalen, som en riktig strömmande hämtning.
    const steps = 8
    for (let i = 1; i <= steps; i += 1) {
      await sleep(Math.max(0, IMPORT_FETCH_MS - (Date.now() - started)) / (steps - i + 1))
      status.received = Math.round((total * i) / steps)
      status.total = total
    }
    status.state = 'parsing'
    status.received = total
    status.total = total
    await sleep(IMPORT_PARSE_MS)
    status.state = 'writing'
    await sleep(IMPORT_WRITE_MS)
    if (total === 0) throw new Error('spellistan gav 0 kanaler')
    writeSource(source, channels, true)
    const counts = new Map()
    for (const channel of channels) counts.set(channel.group, (counts.get(channel.group) ?? 0) + 1)
    status.state = 'done'
    status.result = {
      total,
      groups: [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count })),
      urlTvg: body.xtream
        ? `${body.xtream.base}/xmltv.php?username=${body.xtream.username}&password=${body.xtream.password}`
        : null,
      truncated: false,
    }
    console.log(`[import] ${source}: ${total} kanaler på ${Date.now() - started} ms`)
  } catch (error) {
    status.state = 'error'
    status.error = String(error?.message ?? error)
    console.log(`[import] ${source}: FEL ${status.error}`)
  }
}

/** EPG-refresh är samma jobbmodell; `total` är PROGRAM och kanalantalet ligger i groups[0]. */
async function runEpgRefresh(job, listId, urls, scopeSources) {
  const status = jobs.get(job)
  status.state = 'fetching'
  await sleep(400)
  status.state = 'parsing'
  const channels = epgScopedChannels({ sources: scopeSources }, null).filter((c) => c.tvgId)
  const programmes = channels.length * 48
  status.received = programmes
  status.total = programmes
  await sleep(300)
  status.state = 'writing'
  await sleep(200)
  epgStores.set(listId, {
    listId,
    urls,
    sources: scopeSources,
    fetchedAt: Date.now(),
    failedAt: null,
    sourceStats: urls.map((url) => ({
      url,
      channels: channels.length,
      programmes,
      fetchedAt: Date.now(),
    })),
    channels: channels.length,
    programmes,
  })
  status.state = 'done'
  status.result = {
    total: programmes,
    groups: [{ name: 'channels', count: channels.length }],
    urlTvg: null,
    truncated: false,
  }
  console.log(`[epg] ${listId}: ${channels.length} kanaler / ${programmes} program`)
}

/* ── HTTP ────────────────────────────────────────────────────────────────── */

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

let devRuntimeCode = ''

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`)
  const q = url.searchParams
  const p = url.pathname
  log.requestCounts.set(p, (log.requestCounts.get(p) ?? 0) + 1)

  const send = (status, value, contentType = 'application/json; charset=utf-8') => {
    const body = typeof value === 'string' ? value : JSON.stringify(value)
    res.writeHead(status, {
      'content-type': contentType,
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    })
    res.end(body)
  }

  if (req.method === 'OPTIONS') return send(204, '')

  try {
    /* ---- kanalindexet ---- */

    if (p === '/api/live-tv/status') {
      return send(200, {
        sources: [...sources.values()].map((s) => ({ id: s.id, channels: s.channels.length, updatedAt: s.updatedAt })),
      })
    }

    if (p === '/api/live-tv/batch' && req.method === 'POST') {
      const body = await readBody(req)
      if (!body.source || !String(body.source).trim()) return send(400, { error: 'source saknas' })
      const incoming = Array.isArray(body.channels) ? body.channels : []
      const total = writeSource(String(body.source), incoming, Boolean(body.replace))
      log.batchCalls.push({
        at: Date.now(),
        source: String(body.source),
        replace: Boolean(body.replace),
        channels: incoming.length,
        totalAfter: total,
      })
      console.log(`[batch] ${body.source} replace=${Boolean(body.replace)} +${incoming.length} → ${total}`)
      return send(200, { ok: true, total })
    }

    if (p === '/api/live-tv/query') {
      const source = q.get('source') || null
      if (source && !sources.has(source)) return send(200, { items: [], total: 0, known: false })
      let items = allChannels(source)
      const group = q.get('group')
      const needle = q.get('q')
      if (group) items = items.filter((c) => String(c.group ?? '').split(';').some((g) => g.trim() === group))
      if (needle) items = items.filter((c) => normalise(c.name).includes(normalise(needle)))
      const total = items.length
      const offset = Math.max(0, Number(q.get('offset') ?? 0))
      const limit = Math.min(5000, Math.max(1, Number(q.get('limit') ?? 5000)))
      const page = items.slice(offset, offset + limit)
      return send(200, { items: page, total, known: true, updatedAt: sources.get(source ?? [...sources.keys()][0])?.updatedAt ?? 0 })
    }

    if (p === '/api/live-tv/groups') {
      const counts = new Map()
      for (const channel of allChannels(q.get('source') || null)) {
        for (const part of String(channel.group ?? '').split(';')) {
          const name = part.trim()
          if (!name) continue
          counts.set(name, (counts.get(name) ?? 0) + 1)
        }
      }
      return send(200, {
        groups: [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count })),
      })
    }

    if (p === '/api/live-tv/lookup' && req.method === 'POST') {
      const body = await readBody(req)
      const keys = Array.isArray(body.keys) ? body.keys.map(String) : []
      const byKey = new Map()
      for (const channel of allChannels(null)) if (!byKey.has(channel.key)) byKey.set(channel.key, channel)
      // Frågans ordning, okända hoppas över (Rust: lookup_channels).
      return send(200, { items: keys.map((key) => byKey.get(key)).filter(Boolean) })
    }

    if (p === '/api/live-tv/search') {
      const needle = normalise(q.get('q') ?? '')
      const limit = Math.min(200, Math.max(1, Number(q.get('limit') ?? 60)))
      if (needle.length === 0) return send(200, { items: [], total: 0 })
      const prefix = []
      const substring = []
      for (const channel of allChannels(null)) {
        const name = normalise(channel.name)
        if (name.startsWith(needle)) prefix.push(channel)
        else if (name.includes(needle)) substring.push(channel)
      }
      const items = [...prefix, ...substring]
      return send(200, { items: items.slice(0, limit), total: items.length })
    }

    if (p === '/api/live-tv/reset' && req.method === 'POST') {
      const body = await readBody(req)
      const removed = body.source ? (sources.delete(String(body.source)) ? 1 : 0) : sources.size
      if (!body.source) sources.clear()
      return send(200, { ok: true, removed })
    }

    /* ---- importjobb ---- */

    if (p === '/api/live-tv/import' && req.method === 'POST') {
      const body = await readBody(req)
      if (!body.source || !String(body.source).trim()) return send(400, { error: 'source saknas' })
      if (!body.m3u?.url && !body.xtream) return send(400, { error: 'm3u.url or xtream is required' })
      if (body.xtream && (!body.xtream.base || !body.xtream.username || !body.xtream.password)) {
        return send(400, { error: 'xtream requires base, username and password' })
      }
      jobCounter += 1
      const job = `job-${jobCounter}`
      jobs.set(job, { state: 'fetching', received: 0 })
      log.imports.push({ at: Date.now(), job, source: String(body.source), kind: body.xtream ? 'xtream' : 'm3u' })
      console.log(`[import] start ${job} källa=${body.source} typ=${body.xtream ? 'xtream' : 'm3u'}`)
      void runImport(job, String(body.source), body)
      return send(200, { job })
    }

    if (p === '/api/live-tv/import/status') {
      const status = jobs.get(q.get('job') ?? '')
      if (!status) return send(404, { error: 'unknown job' })
      return send(200, status)
    }

    /* ---- EPG ---- */

    if (p === '/api/live-tv/epg/refresh' && req.method === 'POST') {
      const body = await readBody(req)
      if (!body.listId) return send(400, { error: 'listId is required' })
      jobCounter += 1
      const job = `job-${jobCounter}`
      jobs.set(job, { state: 'fetching', received: 0 })
      log.epgRefreshes.push({ at: Date.now(), job, listId: body.listId, urls: body.urls ?? [], force: Boolean(body.force) })
      void runEpgRefresh(job, String(body.listId), body.urls ?? [], body.sources ?? [])
      return send(200, { job })
    }

    if (p === '/api/live-tv/epg/now') {
      const listId = q.get('listId') ?? ''
      const store = epgStores.get(listId)
      const at = Number(q.get('at') ?? Date.now())
      const items = {}
      for (const channel of epgScopedChannels(store, q.get('source') || null)) {
        const tvgId = channel.tvgIdResolved ?? channel.tvgId
        if (!tvgId) continue
        items[channel.key] = nowNextLater(tvgId, at)
      }
      return send(200, { at, fetchedAt: store?.fetchedAt ?? null, items })
    }

    if (p === '/api/live-tv/epg/schedule' && req.method === 'POST') {
      const body = await readBody(req)
      if (!body.listId) return send(400, { error: 'listId is required' })
      const keys = Array.isArray(body.keys) ? body.keys.map(String) : []
      if (keys.length > 200) return send(400, { error: 'max 200 nycklar per anrop' })
      const byKey = new Map()
      for (const channel of allChannels(null)) if (!byKey.has(channel.key)) byKey.set(channel.key, channel)
      const items = {}
      for (const key of keys) {
        const tvgId = byKey.get(key)?.tvgIdResolved ?? byKey.get(key)?.tvgId
        if (!tvgId) continue
        items[key] = programmesFor(tvgId, Number(body.from ?? 0), Number(body.to ?? 0))
      }
      return send(200, { items })
    }

    if (p === '/api/live-tv/epg/search') {
      const listId = q.get('listId') ?? ''
      const needle = normalise(q.get('q') ?? '')
      const from = Number(q.get('from') ?? Date.now())
      const to = Number(q.get('to') ?? from + 24 * 3600_000)
      const limit = Math.min(200, Math.max(1, Number(q.get('limit') ?? 60)))
      const items = []
      if (needle.length >= 2) {
        for (const channel of epgScopedChannels(epgStores.get(listId), null)) {
          const tvgId = channel.tvgIdResolved ?? channel.tvgId
          if (!tvgId) continue
          for (const programme of programmesFor(tvgId, from, to)) {
            if (!normalise(programme.title).includes(needle)) continue
            items.push({ key: channel.key, programme })
            if (items.length >= limit) break
          }
          if (items.length >= limit) break
        }
      }
      return send(200, { items })
    }

    if (p === '/api/live-tv/epg/status') {
      const listId = q.get('listId') ?? ''
      const store = epgStores.get(listId)
      // En saknad butik är inte ett fel utan "inget hämtat än" — nollor, inte 404.
      return send(200, {
        listId,
        fetchedAt: store?.fetchedAt ?? null,
        failedAt: store?.failedAt ?? null,
        channels: store?.channels ?? 0,
        programmes: store?.programmes ?? 0,
        urls: store?.sourceStats ?? [],
      })
    }

    /* ---- vad verifieringen läser (INTE appens kontrakt) ---- */

    if (p === '/api/__mock/state') {
      return send(200, {
        sources: [...sources.values()].map((s) => ({ id: s.id, channels: s.channels.length })),
        batchCalls: log.batchCalls,
        imports: log.imports,
        epgRefreshes: log.epgRefreshes,
        jobs: [...jobs.entries()].map(([job, status]) => ({ job, state: status.state, received: status.received, total: status.total })),
        requestCounts: [...log.requestCounts.entries()].sort((a, b) => b[1] - a[1]),
        unknownPaths: [...log.unknownPaths.entries()].sort((a, b) => b[1] - a[1]),
      })
    }

    if (p === '/api/__mock/reset' && req.method === 'POST') {
      sources.clear()
      epgStores.clear()
      jobs.clear()
      log.batchCalls.length = 0
      log.imports.length = 0
      log.epgRefreshes.length = 0
      log.unknownPaths.clear()
      log.requestCounts.clear()
      console.log('[mock] nollställd')
      return send(200, { ok: true })
    }

    /**
     * Seedar indexet direkt, utan import. Används för att ställa upp fall som
     * "listan finns redan i indexet" utan att vänta ut ett jobb.
     */
    if (p === '/api/__mock/seed' && req.method === 'POST') {
      const body = await readBody(req)
      const count = Number(body.count ?? GENERATED_CHANNELS)
      const total = writeSource(String(body.source ?? 'seed'), generateChannels(count, GENERATED_CATEGORIES), true)
      console.log(`[mock] seedade ${body.source} med ${total} kanaler`)
      return send(200, { ok: true, total })
    }

    /* ---- appens övriga endpoints ---- */

    // Den lokalt byggda pluginruntimen vinner över den bundlade (version
    // 9999.0.0 i lib/plugin-runtime-cache.ts). Utan den här hade tv-sim kört
    // den runtime som låg i app-worktreet när det checkades ut.
    if (p === '/api/plugins/dev-runtimes') {
      if (!DEV_RUNTIME) return send(200, {})
      if (!devRuntimeCode) devRuntimeCode = await readFile(path.resolve(DEV_RUNTIME), 'utf8')
      return send(200, { 'com.lumio.live-tv': devRuntimeCode })
    }

    /**
     * Appens strömproxy. Pluginet hämtar Xtream-kontot DIREKT först och
     * faller tillbaka hit när webbläsaren stoppar anropet (CORS) — det är den
     * vägen en riktig panel utan CORS-huvuden går, och utan den kan
     * inloggningen aldrig lyckas i en webview.
     */
    if (p === '/api/m3u') {
      const target = q.get('stream')
      if (!target) return send(400, { error: 'stream saknas' })
      const upstream = await fetch(target)
      const text = await upstream.text()
      return send(upstream.status, text, upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8')
    }

    if (p === '/api/debug-log') return send(200, { ok: true })
    if (p === '/api/health') return send(200, { ok: true })
    if (p === '/api/plugins/runtime-store') return send(200, { entries: [] })
    if (p === '/api/plugins/marketplace') return send(200, { plugins: [] })
    if (p === '/api/app-info') return send(200, { version: '0.1.596', platform: 'mock' })

    /**
     * Startsidans två obligatoriska hämtningar. Utan dem kraschar appen före
     * pluginet ens laddas: `HomePage` läser `initialResults.meta.currentPage`
     * rakt av, och en tom kropp ger "Cannot read properties of undefined".
     * Det här är inte filmkatalogen — det är precis så lite som behövs för
     * att skalet ska montera, så att LIVE TV går att prova.
     */
    if (p === '/api/filter-options') {
      const year = new Date().getFullYear()
      return send(200, {
        providers: [],
        genres: [],
        genreGroups: { movie: [], tv: [] },
        keywords: [],
        originalLanguages: [],
        yearRange: { min: 1900, max: year },
      })
    }

    if (p === '/api/media') {
      return send(200, {
        items: [],
        source: 'tmdb',
        meta: {
          mode: 'movie',
          region: 'SE',
          usedFallback: false,
          ratingMode: 'tmdb',
          searchMode: 'discover',
          searchContextLabel: null,
          searchContextPersonId: null,
          totalMatches: 0,
          sourceMatchesTotal: 0,
          sourceMatchesProcessed: 0,
          postProcessedMatches: 0,
          excludedAfterProcessing: 0,
          hiddenByDisplayLimit: 0,
          displayedResults: 0,
          resultDisplayLimit: 100,
          canDisplayResults: true,
          currentPage: 1,
          totalPages: 1,
          pageSize: 20,
          totalMatchesIsEstimate: false,
          resultsLimitedToTopMatches: false,
          ambiguousTitleQuery: false,
          strongTitleMatchesShown: false,
          strongTitleMatchCount: 0,
        },
      })
    }

    if (p === '/api/last-home') return send(200, { exists: false })
    // Biblioteksschemaläggaren itererar `status.sources` rakt av och kastar på
    // en tom kropp — två stackspår per boot som inte har med Live TV att göra.
    if (p === '/api/library/status') return send(200, { sources: [], items: 0 })
    if (p === '/api/release-calendar') return send(200, { items: [] })

    /**
     * Allt annat: 200 med tom kropp och en räknare. Appens boot rör dussintals
     * endpoints som inte har med Live TV att göra; en 404 där hade gett
     * konsolbrus som dränker de fel som faktiskt betyder något. Räknaren i
     * `/api/__mock/state` visar vad som efterfrågades, så det går att stubba
     * rätt om något visar sig blockera.
     */
    log.unknownPaths.set(p, (log.unknownPaths.get(p) ?? 0) + 1)
    return send(200, {})
  } catch (error) {
    console.error('[mock] fel', p, error)
    return send(500, { error: String(error?.message ?? error) })
  }
})

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} är upptagen. Kör med en annan: PORT=8991 node ${process.argv[1]}`)
    process.exit(1)
  }
  throw error
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`fejkad Live TV-app lyssnar på http://127.0.0.1:${PORT}`)
  console.log(`  import: ${XTREAM_BASE ? `hämtar på riktigt från ${XTREAM_BASE}` : `genererar ${GENERATED_CHANNELS} kanaler internt`}`)
  console.log(`  dev-runtime: ${DEV_RUNTIME || '(ingen — den bundlade runtimen används)'}`)
  console.log('\nPeka dev-serverns /api-proxy hit och öppna tv-sim.html.')
  console.log('Bevisen ligger i /api/__mock/state (batch-anrop, jobb, källor).\n')
})
