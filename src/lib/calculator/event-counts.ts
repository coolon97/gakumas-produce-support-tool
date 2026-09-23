import type { DeckCard, CardType } from '@/types/card'
import type { StatValues } from '@/types/produce'
import { averageStatValues, ZERO_STAT_VALUES } from '@/lib/stats'
import { resolveOperationValue } from '@/lib/support-ability'

function getAffectedStats(target: CardType | 'all'): Array<keyof StatValues> {
  switch (target) {
    case 'vocal':
      return ['vo']
    case 'dance':
      return ['da']
    case 'visual':
      return ['vi']
    case 'assist':
    case 'all':
      return ['vo', 'da', 'vi']
  }
}

function calcDeckRateValueByStat(
  deck: DeckCard[],
  rateType: 'sp_rate' | 'lesson_bonus',
  capAt100 = false,
): StatValues {
  const totals = deck.reduce<StatValues>((sum, dc) => {
    const next = { ...sum }
    dc.card.skills.forEach((skill) => {
      skill.ability.operations.forEach((operation) => {
        const matches =
          rateType === 'sp_rate'
            ? operation.op === 'add_sp_rate'
            : operation.op === 'add_lesson_bonus' || operation.op === 'add_param_bonus'
        if (!matches || !('target' in operation)) return
        const value = resolveOperationValue(skill.ability, operation, dc.level)
        getAffectedStats(operation.target).forEach((statKey) => {
          next[statKey] += value
        })
      })
    })
    return next
  }, ZERO_STAT_VALUES)

  if (!capAt100) {
    return totals
  }

  return {
    vo: Math.min(totals.vo, 100),
    da: Math.min(totals.da, 100),
    vi: Math.min(totals.vi, 100),
  }
}

export function calcCardSkillValueByStat(
  deckCard: DeckCard,
  rateType: 'sp_rate' | 'lesson_bonus',
): StatValues {
  return calcDeckRateValueByStat([deckCard], rateType)
}

/**
 * デッキのSP発生率合計を計算する
 * - 各カードの sp_rate スキルを現在レベルで評価して合計
 * - 上限は 100%
 */
export function calcDeckSpRate(deck: DeckCard[]): number {
  return averageStatValues(calcDeckSpRateByStat(deck))
}

export function calcDeckSpRateByStat(deck: DeckCard[]): StatValues {
  return calcDeckRateValueByStat(deck, 'sp_rate', true)
}

/**
 * デッキのレッスンボーナス合計を計算する
 * - 各カードの lesson_bonus スキルを現在レベルで評価して合計 (%)
 */
export function calcDeckLessonBonus(deck: DeckCard[]): number {
  return averageStatValues(calcDeckLessonBonusByStat(deck))
}

export function calcDeckLessonBonusByStat(deck: DeckCard[]): StatValues {
  return calcDeckRateValueByStat(deck, 'lesson_bonus')
}
