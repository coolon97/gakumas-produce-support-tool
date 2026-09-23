import type { DeckCard, SupportEventEntry } from '@/types/card'
import type { StatValues } from '@/types/produce'
import { ZERO_STAT_VALUES } from '@/lib/stats'
import { resolveOperationValue } from '@/lib/support-ability'

function getBaseSupportEventStatGain(
  supportEvents?: SupportEventEntry[],
  multiplier = 1,
  roundEffects = false,
): StatValues {
  if (!supportEvents?.length) {
    return ZERO_STAT_VALUES
  }

  const gain = { ...ZERO_STAT_VALUES }
  const patterns: Array<{ regex: RegExp; stat: 'vo' | 'da' | 'vi' }> = [
    { regex: /ボーカル上昇\+(\d+(?:\.\d+)?)/g, stat: 'vo' },
    { regex: /ダンス上昇\+(\d+(?:\.\d+)?)/g, stat: 'da' },
    { regex: /ビジュアル上昇\+(\d+(?:\.\d+)?)/g, stat: 'vi' },
  ]

  supportEvents.forEach((event) => {
    patterns.forEach(({ regex, stat }) => {
      for (const match of event.effect.matchAll(regex)) {
        const value = Number(match[1] ?? 0) * multiplier
        gain[stat] += roundEffects ? Math.floor(value) : value
      }
    })
  })

  return gain
}

function getSupportEventStatGainBonusPercent(deckCard: DeckCard): number {
  return deckCard.card.skills.reduce((sum, skill) => {
    const supportEventRewardOperation = skill.ability.operations.find(
      (operation) =>
        operation.op === 'modify_support_event_reward' &&
        operation.rewardKind === 'stat_gain' &&
        operation.operation === 'add_percent',
    )

    if (!supportEventRewardOperation) {
      return sum
    }

    return sum + resolveOperationValue(skill.ability, supportEventRewardOperation, deckCard.level)
  }, 0)
}

/** Produce uses the Lv20 post-event; card comparison includes all unlocked events. */
export function getSupportEventStatGain(
  deckCard: DeckCard,
  scope: 'post' | 'all' = 'post',
  rounding: 'none' | 'per-effect' = 'none',
): StatValues {
  const events =
    scope === 'post'
      ? deckCard.card.supportEvents?.filter((event) => event.unlock === 'Lv20').slice(0, 1)
      : deckCard.card.supportEvents?.filter((event) => {
          const level = event.unlock.match(/^Lv(\d+)$/)?.[1]
          return level == null || Number(level) <= deckCard.level
        })
  const baseGain = getBaseSupportEventStatGain(events)
  const bonusPercent = getSupportEventStatGainBonusPercent(deckCard)
  const multiplier = 1 + bonusPercent / 100

  if (rounding === 'per-effect') {
    return getBaseSupportEventStatGain(events, bonusPercent > 0 ? multiplier : 1, true)
  }

  if (bonusPercent <= 0) {
    return baseGain
  }

  return {
    vo: baseGain.vo * multiplier,
    da: baseGain.da * multiplier,
    vi: baseGain.vi * multiplier,
  }
}

/** Returns the gain for one explicitly selected support event. */
export function getSelectedSupportEventStatGain(deckCard: DeckCard, eventIndex: number): StatValues {
  const event = deckCard.card.supportEvents?.[eventIndex]
  if (!event) return ZERO_STAT_VALUES
  const requiredLevel = Number(event.unlock.match(/^Lv(\d+)$/)?.[1] ?? 0)
  if (requiredLevel > deckCard.level) return ZERO_STAT_VALUES
  const baseGain = getBaseSupportEventStatGain([event])
  const bonusPercent = getSupportEventStatGainBonusPercent(deckCard)
  if (bonusPercent <= 0) return baseGain
  const multiplier = 1 + bonusPercent / 100
  return { vo: baseGain.vo * multiplier, da: baseGain.da * multiplier, vi: baseGain.vi * multiplier }
}
