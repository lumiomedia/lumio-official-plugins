/**
 * HEMRADERNA I UPPLEVELSE (Jerry 2026-10-31: "möjlighet att sätta en playlist-rad
 * … settings … sortera"). Användaren styr sidan: de inbyggda raderna kan döljas
 * och flyttas, och egna kanallistor (`kind: 'custom'`) blir egna rader med
 * listans kanaler. Sparas som en ordnad lista i TV-inställningarna
 * (`hubRows`); en lista som tagits bort hoppas över när raderna byggs.
 */
export type BuiltinHubRow = 'onNow' | 'sport' | 'continue' | 'yours' | 'soon' | 'explore'
export interface HubRowPref { id: string; hidden: boolean }

/** Dagens ordning (hub-experience-data.ts `homeRows`). */
export const BUILTIN_HUB_ROWS: readonly BuiltinHubRow[] = ['onNow', 'sport', 'continue', 'yours', 'soon', 'explore']

const LIST_PREFIX = 'list:'
export const listRowId = (listId: string): string => `${LIST_PREFIX}${listId}`
export const listIdOf = (rowId: string): string | null => (rowId.startsWith(LIST_PREFIX) && rowId.length > LIST_PREFIX.length ? rowId.slice(LIST_PREFIX.length) : null)
export const isBuiltinHubRow = (id: string): id is BuiltinHubRow => (BUILTIN_HUB_ROWS as readonly string[]).includes(id)

/** Giltiga rader i sparad ordning; inbyggda som saknas (nya rader i en uppdatering) läggs sist, synliga. */
export function sanitizeHubRows(raw: unknown): HubRowPref[] {
  const out: HubRowPref[] = []
  const seen = new Set<string>()
  for (const entry of Array.isArray(raw) ? raw : []) {
    const id = entry && typeof entry === 'object' ? (entry as { id?: unknown }).id : undefined
    if (typeof id !== 'string' || seen.has(id) || !(isBuiltinHubRow(id) || listIdOf(id))) continue
    seen.add(id)
    out.push({ id, hidden: (entry as { hidden?: unknown }).hidden === true })
  }
  for (const id of BUILTIN_HUB_ROWS) if (!seen.has(id)) out.push({ id, hidden: false })
  return out
}

export function toggleHubRow(rows: readonly HubRowPref[], id: string): HubRowPref[] {
  return rows.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
}

export function moveHubRow(rows: readonly HubRowPref[], id: string, dir: -1 | 1): HubRowPref[] {
  const i = rows.findIndex((r) => r.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= rows.length) return [...rows]
  const out = [...rows]
  ;[out[i], out[j]] = [out[j]!, out[i]!]
  return out
}

/** Listan läggs direkt efter Dina kanaler (närmast favoriterna); finns den redan händer inget. */
export function addListRow(rows: readonly HubRowPref[], listId: string): HubRowPref[] {
  const id = listRowId(listId)
  if (rows.some((r) => r.id === id)) return [...rows]
  const at = rows.findIndex((r) => r.id === 'yours')
  const out = [...rows]
  out.splice(at < 0 ? out.length : at + 1, 0, { id, hidden: false })
  return out
}

/** Bara listrader tas bort; en inbyggd rad döljs i stället (`toggleHubRow`). */
export function removeHubRow(rows: readonly HubRowPref[], id: string): HubRowPref[] {
  return listIdOf(id) ? rows.filter((r) => r.id !== id) : [...rows]
}
