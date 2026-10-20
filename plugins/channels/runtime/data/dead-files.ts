/**
 * Döda filer i molnet: en upplåsning som tjänsten besvarar med "finns inte"
 * (torrenten borttagen, filen spärrad). Utan minnet stod filen kvar i tablån
 * och gav Ingen signal i hela sin programplats, varje gång den kom tillbaka
 * (TorBox 2026-10-20, "Chapter 1" på Serier i ordning). Med minnet faller
 * filen ur poolen; tablån fyller platsen med nästa post av sig själv.
 *
 * Bara ett tydligt svar räknas som dött: 404/410 eller tjänstens egen kod för
 * en fil som inte finns. Nyckelfel (401/403), för många anrop (429),
 * serverfel och nätverksfel är tillfälliga — filen provas igen. Minnet
 * gäller ett dygn (en fil kan läggas tillbaka i molnet). Ren logik.
 */
import type { DebridVersion, PoolItem } from './pool'

export const DEAD_TTL_MS = 24 * 60 * 60 * 1000
export const MAX_DEAD = 300

export const deadKey = (v: { provider: string; fileRef: string }) => `${v.provider}:${v.fileRef}`

/** RD:s felkoder för en fil som inte finns eller inte får hämtas (7 okänd resurs, 24 otillgänglig fil, 35 spärrad). */
const RD_DEAD_CODES = new Set([7, 24, 35])
const DEAD_TEXT = /not[\s_-]?found|no[\s_-]?such|does[\s_-]?not[\s_-]?exist|deleted|removed|unavailable[\s_-]?file|infringing/i

/** Är svaret på en upplåsning ett tydligt "filen finns inte"? */
export function isDeadUnlock(status: number, body: unknown): boolean {
  if (status === 404 || status === 410) return true
  if (status === 0 || status === 401 || status === 403 || status === 429 || status >= 500) return false
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  if (typeof b.error_code === 'number' && RD_DEAD_CODES.has(b.error_code)) return true
  const text = [b.error, b.detail, (b.error as Record<string, unknown> | undefined)?.code, (b.error as Record<string, unknown> | undefined)?.message]
    .filter((x): x is string => typeof x === 'string').join(' ')
  return DEAD_TEXT.test(text)
}

/** Minnet utan utgångna poster, högst MAX_DEAD (de nyaste). */
export function pruneDead(dead: Record<string, number>, now: number): Record<string, number> {
  const live = Object.entries(dead).filter(([, at]) => now - at < DEAD_TTL_MS)
  live.sort((a, b) => b[1] - a[1])
  return Object.fromEntries(live.slice(0, MAX_DEAD))
}

/**
 * Poolen utan döda filer. En debridpost med en död huvudfil men levande
 * versioner behåller sin plats (samma ref, tablån rubbas inte) med nästa
 * version som huvudfil; utan levande version faller posten bort.
 */
export function dropDeadFiles(items: PoolItem[], dead: Record<string, number>): PoolItem[] {
  if (Object.keys(dead).length === 0) return items
  let changed = false
  const out: PoolItem[] = []
  for (const item of items) {
    if (item.play.type !== 'debrid') { out.push(item); continue }
    const { alts, type: _type, ...main } = item.play
    const versions: DebridVersion[] = [main, ...(alts ?? [])]
    const alive = versions.filter((v) => !(deadKey(v) in dead))
    if (alive.length === versions.length) { out.push(item); continue }
    changed = true
    if (alive.length === 0) continue
    const [first, ...rest] = alive
    out.push({ ...item, play: { type: 'debrid', ...first!, ...(rest.length > 0 ? { alts: rest } : {}) } })
  }
  return changed ? out : items
}
