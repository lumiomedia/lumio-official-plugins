/**
 * Best-effort name-to-tvg-id matching for M3U sources that don't include
 * `tvg-id="..."` per channel. The Rust XMLTV endpoint indexes programmes
 * by the XMLTV channel id (e.g. "SVT1.se"). We compare channel names
 * against those ids after aggressive normalization.
 *
 * This is a heuristic — it WILL miss-match obscure channels. Prefer an
 * explicit `tvg-id` only when it resolves to something present in the cache;
 * otherwise fall back to the display name.
 */

const COUNTRY_TAG_RE = /\[[a-z]{2,4}\]/g
const BRACKET_PREFIX_RE = /^\[[^\]]+\][._\s-]*/g
const COUNTRY_BARE_RE = /\b(se|uk|us|dk|no|fi|de|fr|es|it|pl|nl|hr|gr|tr|ie|ca|au|nz)\b/g
const QUALITY_RE = /\b(hd|sd|fhd|uhd|4k|raw|original|backup|alt|alternative|opt|opt\d)\b/g
const REGION_HINTS_RE = /\b(skane|skåne|stockholm|göteborg|goteborg|malmö|malmo|öst|ost|väst|vast|nord|syd|riks|rikstv|sverige|sweden)\b/g
const NON_ALNUM_RE = /[^a-z0-9]/g
const TVG_ID_SEPARATOR_RE = /[._/@()[\]-]+/g
const TVG_ID_QUALITY_SUFFIX_RE = /\b([a-z0-9]+?)(?:fhd|uhd|hd|sd|4k)\b/g

/** Normalize a free-form channel name to its likely tvg-id stem. */
export function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(COUNTRY_TAG_RE, ' ')
    .replace(COUNTRY_BARE_RE, ' ')
    .replace(QUALITY_RE, ' ')
    .replace(REGION_HINTS_RE, ' ')
    .replace(NON_ALNUM_RE, '')
    .trim()
}

/** Normalize a tvg-id (e.g. "SVT1.se") to a comparable stem. */
export function normalizeTvgId(id: string): string {
  const source = id
    .toLowerCase()
    .replace(BRACKET_PREFIX_RE, '')
    .replace(TVG_ID_SEPARATOR_RE, ' ')
    .replace(TVG_ID_QUALITY_SUFFIX_RE, '$1')

  return normalizeChannelName(source)
}

function addAlias(index: Map<string, string>, alias: string, id: string): void {
  const trimmed = alias.trim()
  if (!trimmed || index.has(trimmed)) return
  index.set(trimmed, id)
}

/**
 * Build a reverse index from normalized name stems to tvg-ids present in
 * the cache. When multiple tvg-ids normalize to the same stem (e.g.
 * "SVT1.se" and "SVT1.uk"), the first wins. Callers can layer extra
 * region hints to disambiguate.
 */
export function buildNameToTvgIdIndex(tvgIds: string[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const id of tvgIds) {
    addAlias(out, id, id)
    addAlias(out, id.toLowerCase(), id)

    const tvgStem = normalizeTvgId(id)
    if (tvgStem.length >= 3) addAlias(out, tvgStem, id)

    const nameStem = normalizeChannelName(id)
    if (nameStem.length >= 3) addAlias(out, nameStem, id)
  }
  return out
}

/**
 * Resolve a channel's tvg-id, preferring the explicit attribute and
 * falling back to a name-based lookup against the cache index. Returns
 * null when no match can be made with reasonable confidence (stem
 * length < 3 chars is rejected to avoid garbage matches).
 */
export function resolveTvgId(
  explicitTvgId: string | null,
  channelName: string,
  nameIndex: Map<string, string>,
): string | null {
  const explicit = explicitTvgId?.trim()
  if (explicit) {
    const exact = nameIndex.get(explicit) ?? nameIndex.get(explicit.toLowerCase())
    if (exact) return exact

    const explicitStem = normalizeTvgId(explicit)
    if (explicitStem.length >= 3) {
      const resolved = nameIndex.get(explicitStem)
      if (resolved) return resolved
    }
  }

  const stem = normalizeChannelName(channelName)
  if (stem.length < 3) return null
  return nameIndex.get(stem) ?? null
}
