'use client'

import { useCallback, useEffect, useState } from 'react'
import { LIVE_TV_GLOBAL_EPG_ID, getAllLiveTvEpgUrls, getLiveTvLists, onLiveTvListsChanged } from '../live-tv-data'
import { epgStatus, refreshEpg, waitForJob, type EpgStatus } from '../index-client'

/**
 * Tablåns tillstånd — EN gång för hela ytan, inte per spellista. Delad mellan
 * skrivbordets `EpgStatusCard` (epg-sources-section.tsx) och TV-inställningarnas
 * EPG-flik, så de två ytorna aldrig kan visa olika siffror för samma butik.
 *
 * Butiken är GLOBAL (ett lager för alla list-id). Därför tar hooken INGA
 * argument, och därför ligger diagnostiken på skrivbordet ÖVER listkorten i
 * stället för i varje kort: renderad per lista blev det N statusläsningar av
 * samma sak och N "Hämta om EPG"-knappar som alla gjorde exakt samma globala
 * omhämtning — men med var sitt `refreshing`, så de andra knapparna såg
 * overksamma ut medan en av dem arbetade.
 *
 * Fram till v2 höll pluginet en EGEN XMLTV-cache (`epg/cache.ts`) bara för att
 * kunna skriva "3 kanaler · 812 program" under varje adress: så länge
 * inställningarna var öppna laddade webviewn ner hela tablån en gång till,
 * parallellt med appens hämtning. Siffrorna kommer nu ur appens butik
 * (`/api/live-tv/epg/status`), som ändå är den vyerna får sin tablå ifrån.
 */
export function useEpgStatus(): {
  status: EpgStatus | null
  urls: string[]
  refreshing: boolean
  refresh: () => Promise<void>
  reload: () => Promise<void>
} {
  const [status, setStatus] = useState<EpgStatus | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lists, setLists] = useState(() => getLiveTvLists())
  const urls = getAllLiveTvEpgUrls(lists)
  const urlsKey = urls.join('|')

  const readStatus = useCallback(async (): Promise<EpgStatus | null> => {
    try {
      return await epgStatus(LIVE_TV_GLOBAL_EPG_ID)
    } catch {
      // Äldre app utan endpointen, eller ett övergående fel: resten av
      // inställningarna ska fortsätta fungera utan siffror.
      return null
    }
  }, [])

  // Adresserna redigeras i samma vy som läser det här; utan prenumerationen
  // visade hooken den uppsättning som råkade gälla vid monteringen.
  useEffect(() => onLiveTvListsChanged(() => setLists(getLiveTvLists())), [])

  const reload = useCallback(async () => {
    setStatus(await readStatus())
  }, [readStatus])

  useEffect(() => {
    // Utan EPG-adresser finns ingen butik att fråga om — och blocket ritas
    // inte heller ut hos anroparen.
    if (urlsKey.length === 0) return
    let cancelled = false
    void readStatus().then((next) => { if (!cancelled) setStatus(next) })
    return () => { cancelled = true }
  }, [urlsKey, readStatus])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const current = getLiveTvLists()
      setLists(current)
      const sources = current.map((list) => list.source).filter((source): source is string => Boolean(source))
      const job = await refreshEpg(LIVE_TV_GLOBAL_EPG_ID, getAllLiveTvEpgUrls(current), sources, true)
      await waitForJob(job)
    } catch {
      // Utfallet syns i statusen (failedAt / per-adress `error`), som läses om
      // oavsett.
    } finally {
      setStatus(await readStatus())
      setRefreshing(false)
    }
  }, [readStatus])

  return { status, urls, refreshing, refresh, reload }
}
