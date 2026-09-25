'use client'

/**
 * Användarens EGEN Twitch-appregistrering.
 *
 * Twitch nycklar sin kvot (800 poäng/minut) på client_id när ett app-token
 * används, och på användar-id när ett användartoken används. En inbakad nyckel
 * hade därför lagt alla Lumios användare i SAMMA hink — en 429 hos en hade
 * blivit en 429 hos alla. Med en egen registrering per användare får var och en
 * sin egen hink.
 *
 * Bara client_id lagras, aldrig någon hemlighet: appen registreras som *public
 * client*, och då kräver device-flödet ingenting mer. client_id är publik i
 * OAuth och har inget skyddsvärde. Se twitch-auth.ts.
 */

import { getScopedStorageItem, setScopedStorageItem } from '@/lib/plugin-sdk'

const CLIENT_ID_KEY = 'twitch_client_id_v1'

export function getTwitchClientId(): string {
  if (typeof window === 'undefined') return ''
  return getScopedStorageItem(CLIENT_ID_KEY)?.trim() ?? ''
}

export function setTwitchClientId(value: string): void {
  // Trimmas vid skrivning och inte bara vid läsning: klistrar man in från
  // dev.twitch.tv följer blanksteg och radbrytningar ofta med, och Twitch
  // svarar 401 på en client_id med mellanslag utan att säga varför.
  setScopedStorageItem(CLIENT_ID_KEY, value.trim())
}

export function hasTwitchClientId(): boolean {
  return getTwitchClientId().length > 0
}
