/**
 * Best-effort name-to-tvg-id matching for M3U sources that don't include
 * `tvg-id="..."` per channel. The Rust XMLTV endpoint indexes programmes
 * by the XMLTV channel id (e.g. "SVT1.se"). We compare channel names
 * against those ids after aggressive normalization.
 *
 * This is a heuristic — it WILL miss-match obscure channels. Always prefer
 * the explicit `tvg-id` attribute when the M3U provides one.
 */

const COUNTRY_TAG_RE = /\[[a-z]{2,4}\]/g
const COUNTRY_BARE_RE = /\b(se|uk|us|dk|no|fi|de|fr|es|it|pl|nl|hr|gr|tr|ie|ca|au|nz)\b/g
const QUALITY_RE = /\b(hd|sd|fhd|uhd|4k|raw|original|backup|alt|alternative|opt|opt\d)\b/g
const REGION_HINTS_RE = /\b(skane|skåne|stockholm|göteborg|goteborg|malmö|malmo|öst|ost|väst|vast|nord|syd|riks|rikstv|sverige|sweden)\b/g
const NON_ALNUM_RE = /[^a-z0-9]/g

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
  return id
    .toLowerCase()
    .split(/[._@]/)[0]
    .replace(NON_ALNUM_RE, '')
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
    const stem = normalizeTvgId(id)
    if (!stem || out.has(stem)) continue
    out.set(stem, id)
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
  if (explicitTvgId) return explicitTvgId
  const stem = normalizeChannelName(channelName)
  if (stem.length < 3) return null
  return nameIndex.get(stem) ?? null
}
