#!/usr/bin/env node
/**
 * Fejkad Xtream Codes-panel för lokal testning av Live TV.
 *
 * Varför den finns: det finns ingen laglig publik Xtream-panel att testa mot,
 * och Xtream-stödet i appen är i praktiken två URL-transformationer som
 * triggas på URL:ens FORM, inte på servern bakom den:
 *
 *   1. src-tauri/src/m3u.rs  browser_friendly_playlist_url()
 *      känner igen get.php + username + password + type=m3u_plus och byter
 *      output=ts -> output=m3u8 INNAN spellistan hämtas.
 *   2. src-tauri/src/m3u.rs  derive_xtream_xmltv_url()
 *      härleder xmltv.php?username=..&password=.. ur samma inloggning och
 *      returnerar den som urlTvg.
 *
 * Den här panelen svarar på samma endpoints som en riktig, loggar VAD som
 * efterfrågades, och pekar kanalerna på publika HLS-testströmmar. Då kan hela
 * kedjan köras utan konto: igenkänning, output-bytet, EPG-härledningen,
 * parsningen av m3u_plus-attributen, EPG-matchningen mot tvg-id, och
 * av-knappen för den auto-härledda källan.
 *
 * Kör:
 *   node plugins/live-tv/tools/fake-xtream-panel.mjs
 *
 * Klistra sedan in den URL skriptet skriver ut i M3U-fältet i Live TV:s
 * inställningar. EPG-fältet ska du INTE fylla i — poängen är att se att den
 * härleds. Använd output=ts i URL:en: då syns det i panelens logg om appen
 * verkligen bytte till m3u8.
 *
 * Inga beroenden, bara node:http.
 */

import { createServer } from 'node:http'

const PORT = Number(process.env.PORT ?? 8987)
const USER = process.env.XTREAM_USER ?? 'lumio'
const PASS = process.env.XTREAM_PASS ?? 'test'

/**
 * Publika HLS-testresurser, inte sändningsinnehåll. Poängen är att träna
 * uppspelningskedjan, inte att titta på tv. Byt fritt — allt som är en
 * spelbar HLS-URL fungerar.
 */
const CHANNELS = [
  {
    id: 1,
    tvgId: 'lumio.test.bipbop',
    name: 'Lumio Test 1 (Apple BipBop)',
    group: 'Test',
    logo: null,
    stream: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  },
  {
    id: 2,
    tvgId: 'lumio.test.sintel',
    name: 'Lumio Test 2 (Sintel)',
    group: 'Test',
    logo: null,
    stream: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    // Med vilje trasig: felhanteringen ska bli ett synligt fel, inte en
    // spinner som står kvar. Det var precis den buggen på fjärren.
    id: 3,
    tvgId: 'lumio.test.broken',
    name: 'Lumio Test 3 (avsiktligt trasig)',
    group: 'Test',
    logo: null,
    stream: 'https://127.0.0.1:9/nope.m3u8',
  },
]

function credentialsOk(query) {
  return query.get('username') === USER && query.get('password') === PASS
}

/** XMLTV vill ha YYYYMMDDHHMMSS +0000. */
function xmltvTime(date) {
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return (
    `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
    `${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())} +0000`
  )
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Bygger en guide som täcker -3h..+12h i 30-minutersblock, alltid runt NUET.
 * En statisk fil hade sett tom ut i guiden så fort dagen bytte, och då är det
 * omöjligt att skilja "EPG saknas" från "EPG är gammal".
 */
function buildXmltv() {
  const SLOT_MIN = 30
  const now = Date.now()
  const start = new Date(Math.floor(now / (SLOT_MIN * 60_000)) * (SLOT_MIN * 60_000) - 3 * 3600_000)
  const slots = ((12 + 3) * 60) / SLOT_MIN

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<tv generator-info-name="fake-xtream-panel">',
  ]
  for (const channel of CHANNELS) {
    lines.push(`  <channel id="${escapeXml(channel.tvgId)}">`)
    lines.push(`    <display-name>${escapeXml(channel.name)}</display-name>`)
    lines.push('  </channel>')
  }
  for (const channel of CHANNELS) {
    for (let i = 0; i < slots; i += 1) {
      const from = new Date(start.getTime() + i * SLOT_MIN * 60_000)
      const to = new Date(from.getTime() + SLOT_MIN * 60_000)
      const isNow = from.getTime() <= now && now < to.getTime()
      lines.push(
        `  <programme start="${xmltvTime(from)}" stop="${xmltvTime(to)}" channel="${escapeXml(channel.tvgId)}">`,
      )
      lines.push(
        `    <title lang="sv">${escapeXml(`${channel.name} — block ${i + 1}${isNow ? ' (PÅGÅR NU)' : ''}`)}</title>`,
      )
      lines.push(
        `    <desc lang="sv">${escapeXml(
          `Testprogram ${i + 1} i ${SLOT_MIN}-minutersblock. Genererat runt nuet av fake-xtream-panel.`,
        )}</desc>`,
      )
      lines.push('  </programme>')
    }
  }
  lines.push('</tv>')
  return lines.join('\n')
}

/**
 * m3u_plus med precis de attribut m3u.rs plockar ut: tvg-id, tvg-logo och
 * group-title. `output` styr filändelsen — det är den enda skillnaden, och
 * den gör appens omskrivning synlig i loggen nedan.
 */
function buildPlaylist(origin, output) {
  const ext = output === 'm3u8' ? 'm3u8' : 'ts'
  const lines = ['#EXTM3U']
  for (const channel of CHANNELS) {
    const attrs = [
      `tvg-id="${channel.tvgId}"`,
      channel.logo ? `tvg-logo="${channel.logo}"` : null,
      `group-title="${channel.group}"`,
    ]
      .filter(Boolean)
      .join(' ')
    lines.push(`#EXTINF:-1 ${attrs},${channel.name}`)
    lines.push(`${origin}/live/${USER}/${PASS}/${channel.id}.${ext}`)
  }
  return `${lines.join('\n')}\n`
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `127.0.0.1:${PORT}`}`)
  const query = url.searchParams
  const origin = `http://${req.headers.host ?? `127.0.0.1:${PORT}`}`
  const stamp = new Date().toISOString().slice(11, 19)

  const send = (status, contentType, body) => {
    res.writeHead(status, { 'content-type': contentType, 'cache-control': 'no-store' })
    res.end(body)
  }

  // ---- spellistan ----
  if (url.pathname.endsWith('/get.php')) {
    const output = (query.get('output') ?? '').toLowerCase()
    const type = query.get('type') ?? ''
    // DET HÄR är raden att titta på: bad appen om ts eller m3u8?
    console.log(
      `[${stamp}] get.php  type=${type || '(saknas)'}  output=${output || '(saknas)'}` +
        `  ${output === 'm3u8' ? '<-- appen skrev om till m3u8' : '<-- oskrivet, appen bytte INTE'}`,
    )
    if (!credentialsOk(query)) return send(403, 'text/plain; charset=utf-8', 'bad credentials\n')
    return send(200, 'application/vnd.apple.mpegurl; charset=utf-8', buildPlaylist(origin, output))
  }

  // ---- EPG:n (den appen ska härleda själv) ----
  if (url.pathname.endsWith('/xmltv.php')) {
    console.log(`[${stamp}] xmltv.php  <-- härledd EPG-URL hämtades`)
    if (!credentialsOk(query)) return send(403, 'text/plain; charset=utf-8', 'bad credentials\n')
    return send(200, 'application/xml; charset=utf-8', buildXmltv())
  }

  // ---- strömmarna: riktiga paneler omdirigerar, så det gör vi också ----
  const live = url.pathname.match(/^\/live\/([^/]+)\/([^/]+)\/(\d+)\.(ts|m3u8)$/)
  if (live) {
    const [, user, pass, id, ext] = live
    const channel = CHANNELS.find((c) => String(c.id) === id)
    console.log(`[${stamp}] live     kanal=${id} ext=${ext}`)
    if (user !== USER || pass !== PASS) return send(403, 'text/plain; charset=utf-8', 'bad credentials\n')
    if (!channel) return send(404, 'text/plain; charset=utf-8', 'no such channel\n')
    res.writeHead(302, { location: channel.stream, 'cache-control': 'no-store' })
    return res.end()
  }

  // ---- player_api: finns för framtida katalog-/kontoarbete ----
  if (url.pathname.endsWith('/player_api.php')) {
    const action = query.get('action') ?? ''
    console.log(`[${stamp}] player_api action=${action || '(none)'}`)
    if (!credentialsOk(query)) return send(403, 'application/json', '{}')
    const json = (value) => send(200, 'application/json; charset=utf-8', JSON.stringify(value, null, 1))
    if (action === '' || action === 'get_account_info') {
      return json({
        user_info: {
          username: USER,
          status: 'Active',
          // Ett år fram, så panelen inte "går ut" mitt i en testrunda.
          exp_date: String(Math.floor(Date.now() / 1000) + 365 * 24 * 3600),
          max_connections: '2',
          active_cons: '0',
        },
        server_info: { url: url.hostname, port: String(PORT), https_port: '' },
      })
    }
    if (action === 'get_live_categories') {
      return json([{ category_id: '1', category_name: 'Test', parent_id: 0 }])
    }
    if (action === 'get_live_streams') {
      return json(
        CHANNELS.map((c) => ({
          num: c.id,
          name: c.name,
          stream_id: c.id,
          stream_icon: c.logo ?? '',
          epg_channel_id: c.tvgId,
          category_id: '1',
        })),
      )
    }
    return json([])
  }

  send(404, 'text/plain; charset=utf-8', 'not found\n')
})

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} är upptagen. Kör med en annan: PORT=9123 node ${process.argv[1]}`)
    process.exit(1)
  }
  throw error
})

server.listen(PORT, () => {
  const base = `http://127.0.0.1:${PORT}`
  console.log('fejkad Xtream-panel lyssnar\n')
  console.log('Klistra in DENNA i M3U-fältet (Live TV -> inställningar):')
  console.log(`  ${base}/get.php?username=${USER}&password=${PASS}&type=m3u_plus&output=ts\n`)
  console.log('Lämna EPG-fältet TOMT — den ska härledas till:')
  console.log(`  ${base}/xmltv.php?username=${USER}&password=${PASS}\n`)
  console.log('Att titta efter:')
  console.log('  1. get.php-raden nedan ska säga "appen skrev om till m3u8".')
  console.log('  2. xmltv.php ska hämtas UTAN att du fyllt i något EPG-fält.')
  console.log('  3. Källan visas som "Auto" i EPG-listan och ska gå att stänga av.')
  console.log('  4. Kanal 3 är trasig med vilje: det ska bli ett synligt fel,')
  console.log('     inte en spinner som står kvar.\n')
  console.log(`(PORT, XTREAM_USER, XTREAM_PASS går att sätta via env. Nu: ${USER}/${PASS})\n`)
})
