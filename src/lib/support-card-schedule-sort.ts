import type { DeckCard, SupportCard } from '@/types/card'
import type { ProduceConfig, StatValues } from '@/types/produce'
import { simulateHifSchedule } from '@/lib/calculator/hif-simulation'
import { getSupportEventStatGain } from '@/lib/support-event-stat-gain'

const EMPTY_CARD: SupportCard = {
  id: '__support_sort_empty__',
  name: '',
  rarity: 'R',
  type: 'assist',
  plan: 'free',
  maxLevel: 1,
  skills: [],
}
const EMPTY_DECK_CARD: DeckCard = { card: EMPTY_CARD, level: 1, isRental: false }
const STATS = ['vo', 'da', 'vi'] as const

function getAppliedSupportEventGain(
  contributions: ReturnType<typeof simulateHifSchedule>['contributions'],
  slot: number,
): StatValues {
  const applied = { vo: 0, da: 0, vi: 0 }
  contributions[slot]?.skillContributions
    .filter((entry) => entry.skillId === 'support-front' || entry.skillId.startsWith('support-after:'))
    .forEach((entry) =>
      STATS.forEach((stat) => {
        applied[stat] += Math.floor(entry.gain[stat])
      }),
    )
  return applied
}

/** Compare a candidate with the same deck slot left empty, through the confirmed schedule prefix. */
export function getScheduledSupportCardTotals(
  cards: readonly SupportCard[],
  deck: readonly DeckCard[],
  config: ProduceConfig,
  targetSlot?: number,
): Map<string, number> {
  if (!config.hif.schedule) return new Map(cards.map((card) => [card.id, 0]))
  const slot = targetSlot ?? Math.min(deck.length, 5)
  const baseDeck = Array.from({ length: Math.max(deck.length, slot + 1) }, (_, index) =>
    index === slot ? EMPTY_DECK_CARD : (deck[index] ?? EMPTY_DECK_CARD),
  )
  const result = new Map<string, number>()
  let baseline: StatValues
  try {
    baseline = simulateHifSchedule(baseDeck, config).finalStats
  } catch {
    return new Map(cards.map((card) => [card.id, 0]))
  }
  for (const card of cards) {
    try {
      const nextDeck = [...baseDeck]
      nextDeck[slot] = { card, level: card.maxLevel, isRental: false }
      const simulation = simulateHifSchedule(nextDeck, config)
      const allEventGain = getSupportEventStatGain(nextDeck[slot], 'all', 'per-effect')
      const appliedEventGain = getAppliedSupportEventGain(simulation.contributions, slot)
      const cap = simulation.statCap ?? Number.POSITIVE_INFINITY
      const actual = Object.fromEntries(
        STATS.map((stat) => [
          stat,
          Math.min(
            cap,
            simulation.finalStats[stat] + Math.max(0, allEventGain[stat] - appliedEventGain[stat]),
          ),
        ]),
      ) as unknown as StatValues
      result.set(
        card.id,
        STATS.reduce((sum, stat) => sum + actual[stat] - baseline[stat], 0),
      )
    } catch {
      result.set(card.id, 0)
    }
  }
  return result
}
