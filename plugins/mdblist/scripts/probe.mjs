// scripts/probe.mjs — BARA läsanrop. Kör: MDBLIST_API_KEY=… node scripts/probe.mjs
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const key = process.env.MDBLIST_API_KEY
if (!key) { console.error('MDBLIST_API_KEY saknas'); process.exit(1) }
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../runtime/__fixtures__')
await mkdir(out, { recursive: true })

async function get(p, query = {}) {
  const url = new URL(`https://api.mdblist.com${p}`)
  url.searchParams.set('apikey', key)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v))
  const res = await fetch(url)
  const body = await res.json().catch(() => null)
  console.log(res.status, p)
  await new Promise((r) => setTimeout(r, 400))
  return body
}

/** Tar bort allt som kan identifiera kontot innan det hamnar i git (alla typer, även tal). */
const SECRET = new Set(['apikey', 'api_key', 'email', 'user_id', 'patreon_id', 'username', 'user_name', 'avatar_url', 'store_account_token', 'date_joined', 'trakt_user'])
function scrub(value, isUser = false) {
  if (Array.isArray(value)) return value.map((v) => scrub(v))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) =>
      [k, SECRET.has(k) || (isUser && k === 'name') ? '<scrubbed>' : scrub(v)]))
  }
  return value
}

const save = (name, data) => writeFile(path.join(out, name), JSON.stringify(scrub(data, name === 'user.json'), null, 2) + '\n')

await save('user.json', await get('/user'))
await save('last-activities.json', await get('/sync/last_activities'))
await save('watched.json', await get('/sync/watched', { limit: 5 }))
await save('watchlist.json', await get('/watchlist/items', { limit: 5 }))
const lists = await get('/lists/user')
await save('lists-user.json', Array.isArray(lists) ? lists.slice(0, 3) : lists)
let first = Array.isArray(lists) && lists[0] ? lists[0].id : null
if (!first) {
  const pub = await get('/lists/linaspurinis/top-watched-movies-of-the-week')
  await save('list-by-slug.json', pub)
  first = Array.isArray(pub) && pub[0] ? pub[0].id : null
}
if (first) await save('list-items.json', await get(`/lists/${first}/items`, { limit: 5 }))
