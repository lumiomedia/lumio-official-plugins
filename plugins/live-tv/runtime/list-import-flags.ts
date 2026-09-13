'use client'

import { getLiveTvLists, replaceLiveTvLists } from './live-tv-data'

/**
 * `needsReimport`/`lastImportError` efter en import som INSTÄLLNINGARNA
 * startade.
 *
 * `importMissingSources` (den automatiska mottagarsidan av enhets-
 * överföringen) sätter flaggorna själv, men en manuell "Hämta om" gick
 * tidigare förbi dem helt: en lista som en gång misslyckats behöll sitt
 * "Behöver hämtas om"-märke även efter att användaren hämtat om den med
 * lyckat resultat, och ett nytt fel syntes inte alls förrän nästa omstart.
 *
 * Ligger utanför `live-tv-data.ts` för att inte ändra `importList`s kontrakt:
 * den ska fortsätta lämna listan orörd vid fel (spec §5) — det är UI:t som
 * avgör om utfallet ska bokföras på posten.
 */
export function recordListImportOutcome(listId: string, error?: string): void {
  replaceLiveTvLists(getLiveTvLists().map((list) => (list.id === listId
    ? { ...list, needsReimport: Boolean(error), lastImportError: error }
    : list)))
}
