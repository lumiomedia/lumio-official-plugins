'use client'

/**
 * Huvudlös uppstart: standardkanalerna skapas när pluginet laddas (inte först
 * när Kanaler öppnas), så hemraden "Sänds nu på dina kanaler" har kanaler från
 * början. Samma regel som på sidan: en gång per profil, inga regeldubbletter.
 * Vid profilbyte sås den nya profilen om den inte redan är sådd. Ren
 * lagringsskrivning — inget nätverk; poolerna laddas först när något visas.
 */
import { useEffect } from 'react'
import { onProfileChanged, readStoredLang } from '@/lib/plugin-sdk'
import { seedDefaultChannels } from '../state/store'

export function seedForActiveProfile(): void {
  try {
    seedDefaultChannels(readStoredLang() === 'sv' ? 'sv' : 'en')
  } catch {
    // Lagringen full eller otillgänglig: sidan försöker igen när den öppnas.
  }
}

export function ChannelsBootstrap() {
  useEffect(() => {
    seedForActiveProfile()
    return onProfileChanged(seedForActiveProfile)
  }, [])
  return null
}
