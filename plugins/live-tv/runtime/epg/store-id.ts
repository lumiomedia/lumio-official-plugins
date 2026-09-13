'use client'

import { LIVE_TV_GLOBAL_EPG_ID } from '../live-tv-data'

/**
 * ETT EPG-lager, oavsett vilket list-id anroparen råkar ha.
 *
 * Pluginet skriver bara en enda EPG-store i appen (`LIVE_TV_GLOBAL_EPG_ID`) —
 * alla källors tablåer slås ihop där. Men flera anropare bär fortfarande ett
 * RIKTIGT list-id: startsideöverstyrningen skickar listans id, och appens
 * hemrad går genom bryggan `window.__LumioLiveTvEpg` med vad den nu har. De
 * id:na skickades rakt till Rust, som svarade tomt för en store som aldrig
 * skrivits — märkena blev tomma och `useEpgLoadStatus` fastnade i `loading`
 * för alltid (det finns inget "hämtat men tomt" att landa på).
 *
 * Därför översätts varje icke-null list-id till den globala store:n här, på ETT
 * ställe, i stället för i varje hook. `null` betyder fortfarande "ingen lista
 * alls" och lämnas som null, så `useEpgLoadStatus` kan skilja på `idle` och
 * `empty`.
 */
export function epgStoreId(listId: string): string
export function epgStoreId(listId: string | null): string | null
export function epgStoreId(listId: string | null): string | null {
  return listId === null ? null : LIVE_TV_GLOBAL_EPG_ID
}
