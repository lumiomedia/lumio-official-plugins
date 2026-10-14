/**
 * Titlar för poster som källan inte kunnat matcha (filnamn som titel):
 * "03 Star Wars Episode VI Return of the Jedi", "Avatar 4Kreescalado2160
 * pctmix1 com". Kärnans filnamnstolk har redan klippt vid år/kvalitet; här
 * tas det den lämnar: spårnummer först och skräpord sist. Försiktigt — en
 * riktig titel ("21 Jump Street", "Blade Runner 2049", "Se7en") ska stå kvar.
 * Ren logik.
 */
const JUNK_WORDS = new Set(['com', 'net', 'org', 'www', 'mkv', 'mp4', 'avi', 'rip', 'dual', 'multi', 'latino', 'castellano', 'subs', 'sub'])

/** Ord med både bokstäver och siffror ("pctmix1", "4Kreescalado2160") — inte rena tal ("2049"). */
const mixed = (w: string) => /[a-z]/i.test(w) && /\d/.test(w)

export function cleanTitle(raw: string): string {
  let words = raw.replace(/[._]+/g, ' ').replace(/[[\]{}]/g, ' ').replace(/\s+/g, ' ').trim().split(' ')
  // Spårnummer först: nollutfyllt ("03 ", "007 ") eller med bindestreck ("3 - ").
  // "12 Angry Men" står kvar — ett tal utan nolla eller streck är titel.
  if (words.length > 1 && /^0\d{1,2}$/.test(words[0]!)) words = words.slice(1)
  else if (words.length > 2 && /^\d{1,3}$/.test(words[0]!) && words[1] === '-') words = words.slice(2)
  // Skräp sist (domäner, sajttaggar, blandord), men aldrig hela titeln.
  while (words.length > 1) {
    const last = words[words.length - 1]!
    const lower = last.toLowerCase()
    if (JUNK_WORDS.has(lower) || (mixed(last) && last.length > 4) || last === '-') words = words.slice(0, -1)
    else break
  }
  const out = words.join(' ').trim()
  return out || raw.trim()
}

/** Ser ut som ett avsnitt ("S1 - 01", "1X1", "S01E02") — matchas inte som film. */
export function looksLikeEpisode(raw: string): boolean {
  return /\bs\d{1,2}\s*[-e]\s*\d{1,3}\b|\b\d{1,2}x\d{1,3}\b|\bs\d{1,2}e\d{1,3}/i.test(raw)
}
