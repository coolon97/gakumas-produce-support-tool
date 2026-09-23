import type { DeckCard } from '@/types/card'
import type { ProduceConfig } from '@/types/produce'
import { findIdolVersion } from '@/data/idols'
import { getIdolProgression } from '@/lib/idol-progression'
import { addStatValues, ZERO_STAT_VALUES } from '@/lib/stats'
import { getCardInitialStatsFromSkills } from '@/lib/utils'
import { calcDeckLessonBonusByStat, calcDeckSpRateByStat } from './event-counts'

/** UIと計算エンジンが同じ集計を使用し、H.I.F.ボーナスを一度だけ適用する。 */
export function getProduceStats(deck: DeckCard[], config: ProduceConfig) {
  const calculationDeck = deck.map((dc) => ({
    ...dc,
    card: { ...dc.card, skills: dc.card.skills.filter((skill) => skill.unlockLevel <= dc.level) },
  }))
  const supportInitialStats = addStatValues(
    ...calculationDeck.map(({ card, level }) => getCardInitialStatsFromSkills(card.skills, level, card.type)),
  )
  const totalInitialStats = addStatValues(supportInitialStats, config.idolBaseStats, config.memoryBaseStats)
  const supportLessonBonus = calcDeckLessonBonusByStat(calculationDeck)
  const otherLessonBonus = addStatValues(config.idolLessonBonus, config.memoryLessonBonus)
  const version = findIdolVersion(config.idolId, config.idolVersionId)
  const idolSpRate = version
    ? getIdolProgression(version, config.idolTalentStage).idolSpRate
    : ZERO_STAT_VALUES
  const totalSpRate = addStatValues(calcDeckSpRateByStat(calculationDeck), idolSpRate)
  for (const stat of ['vo', 'da', 'vi'] as const) {
    totalInitialStats[stat] += config.hif.parameterBonusLevels[stat] * 20
    otherLessonBonus[stat] += config.hif.parameterBonusLevels[stat] * 2
    totalSpRate[stat] += config.hif.spBonusLevel
    totalSpRate[stat] = Math.min(100, totalSpRate[stat])
  }
  return {
    calculationDeck,
    totalInitialStats,
    supportLessonBonus,
    otherLessonBonus,
    totalLessonBonus: addStatValues(supportLessonBonus, otherLessonBonus),
    totalSpRate,
  }
}
