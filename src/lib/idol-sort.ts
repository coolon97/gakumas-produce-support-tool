import { IDOLS } from '../data/idols'
import type { IdolData, IdolVersion } from '../types/idol'

export const IDOL_SORT_OPTIONS = [
  { value: 'release', label: 'リリース日（新しい順）' },
  { value: 'plan', label: 'プラン順' },
  { value: 'idol', label: 'アイドル順' },
  { value: 'rarity', label: 'レアリティ（SSR→SR→R）' },
] as const
export type IdolSortKey = (typeof IDOL_SORT_OPTIONS)[number]['value']
export type IdolRarity = 'SSR' | 'SR' | 'R'
interface Entry {
  idol: IdolData
  version: IdolVersion
}
const idolOrder = new Map(IDOLS.map((idol, index) => [idol.id, index]))
const planOrder = { sense: 0, logic: 1, anomaly: 2 }
const rarityOrder = { SSR: 0, SR: 1, R: 2 }
const sortPriorities: Record<IdolSortKey, readonly IdolSortKey[]> = {
  release: ['release', 'idol', 'rarity', 'plan'],
  plan: ['plan', 'rarity', 'idol', 'release'],
  idol: ['idol', 'rarity', 'release'],
  rarity: ['rarity', 'idol', 'release'],
}

export function normalizeIdolSortKey(value: string): IdolSortKey {
  return IDOL_SORT_OPTIONS.find((option) => option.value === value)?.value ?? 'release'
}

export function getIdolVersionRarity(version: IdolVersion): IdolRarity {
  if (version.rarity) return version.rarity
  if (version.id.includes('-ssr-')) return 'SSR'
  if (version.id.includes('-sr-')) return 'SR'
  return 'R'
}

function releaseDate(version: IdolVersion): number {
  const parts = version.releaseDate?.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  return parts ? Number(parts[1]) * 10000 + Number(parts[2]) * 100 + Number(parts[3]) : 0
}

export function compareIdolEntries(left: Entry, right: Entry, sort: IdolSortKey): number {
  const differences = {
    release: releaseDate(right.version) - releaseDate(left.version),
    plan: planOrder[left.version.plan] - planOrder[right.version.plan],
    idol:
      (idolOrder.get(left.idol.id) ?? Number.MAX_SAFE_INTEGER) -
      (idolOrder.get(right.idol.id) ?? Number.MAX_SAFE_INTEGER),
    rarity:
      rarityOrder[getIdolVersionRarity(left.version)] - rarityOrder[getIdolVersionRarity(right.version)],
  }
  for (const key of sortPriorities[sort]) {
    if (differences[key] !== 0) return differences[key]
  }
  return left.version.id.localeCompare(right.version.id)
}
