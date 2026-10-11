'use client'

import { Budget, type BudgetDeps } from './budget'
import { providerFor } from './providers'
import { setSportSettings } from './sport-store'
import type { KeyCheck, ProviderId } from './provider'

export type KeyFlowResult = { ok: true; key: string; check: KeyCheck } | { ok: false; reason: 'empty' | 'rejected' | 'network' }

/** Mellanslag och radbrytningar bort (inklistrat från mejl eller telefon). Samma teckenregel som appen. */
export function cleanKey(raw: string): string | null {
  const key = raw.replace(/\s+/g, '')
  return /^[A-Za-z0-9_-]{3,128}$/.test(key) ? key : null
}

export function maskKey(key: string): string {
  return `••••${key.slice(-4)}`
}

export function isPaidPlan(plan: string | null, provider: ProviderId): boolean {
  if (provider === 'thesportsdb') return true
  return !!plan && plan.toLowerCase() !== 'free'
}

/** Kontrollerar nyckeln GENOM kvothanteraren (API-Sports `status` kostar inget). Sparar ingenting. */
export async function validateKey(provider: ProviderId, raw: string, deps: { fetch?: BudgetDeps['fetch'] } = {}): Promise<KeyFlowResult> {
  const key = cleanKey(raw)
  if (!key) return { ok: false, reason: 'empty' }
  const result = await new Budget(providerFor(provider), key, { fetch: deps.fetch }).validate()
  if (result.ok && result.data.ok) return { ok: true, key, check: result.data }
  if (!result.ok && result.reason === 'network') return { ok: false, reason: 'network' }
  return { ok: false, reason: 'rejected' }
}

/** Sparar BARA efter godkänd validering. En underkänd nyckel rör aldrig en fungerande. */
export async function saveValidatedKey(provider: ProviderId, raw: string, deps: { fetch?: BudgetDeps['fetch'] } = {}): Promise<KeyFlowResult> {
  const result = await validateKey(provider, raw, deps)
  if (result.ok) setSportSettings({ apiKey: result.key, provider, keyPlan: result.check.plan })
  return result
}

export function removeKey(): void {
  setSportSettings({ apiKey: null, keyPlan: null })
}
