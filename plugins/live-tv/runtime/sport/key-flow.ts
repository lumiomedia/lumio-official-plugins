'use client'

import { Budget, type BudgetDeps } from './budget'
import { providerFor } from './providers'
import { getSportSettings, removeProviderKey, setProviderKey } from './sport-store'
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
  // sportapi.ai skickar ingen plan; gratisnivån känns igen på dygnsgränsen 2 000 (Budget fyller i planen när den vet).
  if (provider === 'sportapi') return !!plan && plan.toLowerCase() !== 'free'
  return !!plan && plan.toLowerCase() !== 'free'
}

/** Kontrollerar nyckeln GENOM kvothanteraren (API-Sports `status` kostar inget). Sparar ingenting. */
export async function validateKey(provider: ProviderId, raw: string, deps: { fetch?: BudgetDeps['fetch'] } = {}): Promise<KeyFlowResult> {
  const key = cleanKey(raw)
  if (!key) return { ok: false, reason: 'empty' }
  const budget = new Budget(providerFor(provider), key, { fetch: deps.fetch })
  const result = await budget.validate()
  if (result.ok && result.data.ok) {
    // Källor utan statusväg (sportapi.ai): dagens förbrukning ur svarets kvotheaders.
    const q = budget.quota(budget.provider.bucket('football'))
    const check = result.data.used == null && q.limit != null && q.remaining != null
      ? { ...result.data, used: Math.max(0, q.limit - q.remaining), limit: q.limit, plan: result.data.plan ?? q.plan }
      : result.data
    return { ok: true, key, check }
  }
  if (!result.ok && result.reason === 'network') return { ok: false, reason: 'network' }
  return { ok: false, reason: 'rejected' }
}

/**
 * Sparar BARA efter godkänd validering. En underkänd nyckel rör aldrig en fungerande.
 * EN nyckel per källa: en ny nyckel för en källa som redan har en ERSÄTTER den
 * (flera gratisnycklar för samma källa vore att kringgå källans gräns).
 */
export async function saveValidatedKey(provider: ProviderId, raw: string, deps: { fetch?: BudgetDeps['fetch'] } = {}): Promise<KeyFlowResult> {
  const result = await validateKey(provider, raw, deps)
  if (result.ok) setProviderKey(provider, result.key, result.check.plan)
  return result
}

/** Tar bort källans nyckel (utan källa: den primära). Andra källors nycklar står kvar. */
export function removeKey(provider?: ProviderId): void {
  removeProviderKey(provider ?? getSportSettings().provider)
}
