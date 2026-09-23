import type { SupportCard } from '@/types/card'

export type CardSortMode = 'release' | 'parameter-total' | 'plan' | 'attribute' | 'rarity'

const RARITY_ORDER: Record<SupportCard['rarity'], number> = { SSR: 0, SR: 1, R: 2 }
const PLAN_ORDER: Record<SupportCard['plan'], number> = { sense: 0, logic: 1, anomaly: 2, free: 3 }
const ATTRIBUTE_ORDER: Record<SupportCard['type'], number> = { vocal: 0, dance: 1, visual: 2, assist: 3 }

export function compareSupportCards(
  left: SupportCard,
  right: SupportCard,
  mode: CardSortMode,
  totals?: ReadonlyMap<string, number>,
): number {
  if (mode === 'parameter-total') {
    const difference = (totals?.get(right.id) ?? 0) - (totals?.get(left.id) ?? 0)
    if (difference) return difference
  }

  const keys =
    mode === 'plan'
      ? (['plan', 'rarity', 'type'] as const)
      : mode === 'attribute'
        ? (['type', 'rarity', 'plan'] as const)
        : mode === 'rarity'
          ? (['rarity', 'plan', 'type'] as const)
          : []
  for (const key of keys) {
    const difference =
      key === 'plan'
        ? PLAN_ORDER[left.plan] - PLAN_ORDER[right.plan]
        : key === 'type'
          ? ATTRIBUTE_ORDER[left.type] - ATTRIBUTE_ORDER[right.type]
          : RARITY_ORDER[left.rarity] - RARITY_ORDER[right.rarity]
    if (difference) return difference
  }

  return (
    (right.releaseDate ?? '').localeCompare(left.releaseDate ?? '') ||
    left.name.localeCompare(right.name, 'ja') ||
    left.id.localeCompare(right.id)
  )
}
