/**
 * Genrer är källornas egna strängar: biblioteket säger "Sci-Fi", TMDb:s
 * filmer "Science Fiction" och TMDb:s serier "Sci-Fi & Fantasy". Allt som
 * jämför genrer går därför via kanoniska tokens: gemener, delade på & och /,
 * med alias för de vanliga stavningarna. Två genrelistor matchar när deras
 * tokenmängder överlappar. Ren logik.
 */
const ALIAS: Record<string, string> = {
  'sci-fi': 'science fiction',
  'sci fi': 'science fiction',
  scifi: 'science fiction',
  'science-fiction': 'science fiction',
  sf: 'science fiction',
  animated: 'animation',
  'tv-movie': 'tv movie',
  doc: 'documentary',
  documentaries: 'documentary',
  kid: 'kids',
  children: 'kids',
}

export function canonGenre(name: string): string[] {
  const out: string[] = []
  for (const part of name.toLowerCase().split(/[&/]/)) {
    const token = part.trim().replace(/\s+/g, ' ')
    if (!token) continue
    const canon = ALIAS[token] ?? token
    if (!out.includes(canon)) out.push(canon)
  }
  return out
}

export function canonGenres(names: readonly string[]): string[] {
  const set = new Set<string>()
  for (const name of names) for (const token of canonGenre(name)) set.add(token)
  return [...set]
}

/** Sant när någon av `have` delar token med någon av `wanted`. */
export function genresMatch(have: readonly string[], wanted: readonly string[]): boolean {
  const want = new Set(canonGenres(wanted))
  return canonGenres(have).some((token) => want.has(token))
}
