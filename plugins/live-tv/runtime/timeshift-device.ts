import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'

/*
  TIMESHIFT PÅ DEN HÄR ENHETEN (Android/media3).

  Bufferten är en ffmpeg-process och en HLS-mapp på boxens egen disk, så om
  den ska vara på avgörs per enhet: ja på en Shield, nej på en svag box. Egen
  nyckel — `TvSettings` synkas som en blob — och appens `DEVICE_LOCAL_KEYS`
  känner nyckeln så den varken synkas eller följer med vid enhetsöverföring.
  Av som standard tills funktionen mätts på Shield och EVOLVEO H4.
*/

export const TIMESHIFT_DEVICE_KEY = 'live_tv_timeshift_device_v1'

export function getTimeshiftOnDevice(): boolean {
  return readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, TIMESHIFT_DEVICE_KEY, false) === true
}

export function setTimeshiftOnDevice(on: boolean): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, TIMESHIFT_DEVICE_KEY, on)
}

export function useTimeshiftOnDevice(): boolean {
  const [value, setValue] = useState(getTimeshiftOnDevice)
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, TIMESHIFT_DEVICE_KEY, () => setValue(getTimeshiftOnDevice())), [])
  return value
}
