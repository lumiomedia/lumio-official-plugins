'use client'

import type { HomeOverrideProps } from '@/lib/plugin-sdk'
import { LiveTvGrid } from './live-tv-grid'

export function LiveTvHomeOverride(_props: HomeOverrideProps) {
  return <LiveTvGrid />
}
