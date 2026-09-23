import type { DeckCard } from '@/types/card'
import type { EventCounts, ProduceConfig, StatValues } from '@/types/produce'
import type { CalculatorResult, EvaluationBreakdown } from '@/types/calculator'
import type { SupportAbilitySpec } from '@/types/support-ability'
import { HIF_CAP_BONUSES, HIF_CLASS_SCHEDULE, HIF_LESSON_SCHEDULE } from '@/data/hif'
import { addStatValues, floorAndCapStatValues, ZERO_STAT_VALUES } from '@/lib/stats'
import { getAbilityLimit, resolveOperationValue } from '@/lib/support-ability'
import { getParameterSortTriggerSetting } from '@/lib/support-card-parameter-total'
import { getProduceStats } from './produce-stats'
import { getCardContributions, getDeckSkillContributionGain } from './support-card-contributions'
import { getAbilityCoverage } from './ability-coverage'
import { getHifSelectionExamConfiguredReward } from './hif-selection-exams'
import { isHifLessonReady } from '@/lib/hif-lesson-selection'

const AXES = { vocal: 'vo', dance: 'da', visual: 'vi' } as const
const STATS = ['vo', 'da', 'vi'] as const

export function getHifLessonBaseTotals(config: ProduceConfig) {
  const normalBaseTotal = { ...ZERO_STAT_VALUES }
  const spBaseTotal = { ...ZERO_STAT_VALUES }
  config.hif.lessons.forEach((lesson, index) => {
    const schedule = HIF_LESSON_SCHEDULE[index]
    if (!lesson.enabled || !isHifLessonReady(lesson) || !schedule) return
    const total = lesson.type === 'sp' ? spBaseTotal : normalBaseTotal
    const gain = schedule[lesson.type]
    total[AXES[lesson.param]] += gain.main
    if (lesson.subParam !== lesson.param) total[AXES[lesson.subParam]] += gain.sub
  })
  return { normalBaseTotal, spBaseTotal }
}

/** 条件付きの発動は、実際に条件を満たした回数を入力する。 */
export function getHifDefaultTriggerCount(ability: SupportAbilitySpec, config: ProduceConfig): number {
  const event = ability.activation.event
  if (event === 'static') return 1
  if (event === 'lesson_end') {
    if (ability.predicate) return 0
    return config.hif.lessons.filter(
      (lesson) =>
        lesson.enabled &&
        isHifLessonReady(lesson) &&
        (!ability.activation.lessonKind ||
          ability.activation.lessonKind === 'any' ||
          lesson.type === ability.activation.lessonKind) &&
        (!ability.activation.lessonParam ||
          ability.activation.lessonParam === 'any' ||
          lesson.param === ability.activation.lessonParam),
    ).length
  }
  if (ability.predicate) return 0
  if (event === 'class_end') return config.hif.classes.filter((entry) => entry.enabled).length
  if (event === 'exam_end') return 5
  return 0
}

export function getHifTriggerCount(ability: SupportAbilitySpec, config: ProduceConfig): number {
  const key = getParameterSortTriggerSetting(ability).key
  const supplied = config.eventTriggerCounts?.[key]
  let count = Math.max(0, Math.floor(supplied ?? getHifDefaultTriggerCount(ability, config)))
  // 属性違いをまとめた入力でも、指定属性のレッスン回数は超えない。
  if (ability.activation.event === 'lesson_end') {
    const available = config.hif.lessons.filter(
      (lesson) =>
        lesson.enabled &&
        isHifLessonReady(lesson) &&
        (!ability.activation.lessonKind ||
          ability.activation.lessonKind === 'any' ||
          lesson.type === ability.activation.lessonKind) &&
        (!ability.activation.lessonParam ||
          ability.activation.lessonParam === 'any' ||
          lesson.param === ability.activation.lessonParam),
    ).length
    count = Math.min(count, available)
  }
  if (ability.activation.event === 'class_end')
    count = Math.min(count, config.hif.classes.filter((entry) => entry.enabled).length)
  if (ability.activation.event === 'exam_end') count = Math.min(count, 5)
  return Math.min(count, getAbilityLimit(ability, 'produce') ?? Infinity)
}

export function getHifEventCounts(config: ProduceConfig): EventCounts {
  return {
    normalLessons: config.hif.lessons.filter(
      (lesson) => lesson.enabled && isHifLessonReady(lesson) && lesson.type === 'normal',
    ).length,
    spLessons: config.hif.lessons.filter(
      (lesson) => lesson.enabled && isHifLessonReady(lesson) && lesson.type === 'sp',
    ).length,
    supportEvents: config.postEventEnabledSlots?.filter(Boolean).length ?? 0,
    exams: 5,
  }
}

export function getHifRound1Evaluation(score: number): number {
  if (score <= 300000) return 0
  if (score <= 700000) return Math.floor(score / 100 - 3000)
  if (score <= 1000000) return Math.floor((score * 3) / 1000 + 1900)
  if (score <= 1200000) return Math.floor(score / 500 + 2900)
  if (score <= 1400000) return Math.floor(score / 1000 + 4100)
  return 5500
}

export function getHifRound2Evaluation(score: number): number {
  if (score <= 600000) return -2000
  if (score <= 900000) return Math.floor(score / 250 - 4400)
  if (score <= 1500000) return Math.floor(score / 125 - 8000)
  if (score <= 2000000) return Math.floor(score / 500 + 1000)
  // Wikiの固定値欄(+4000)と合計欄(5000〜5400)が矛盾するため、合計欄から+3000と推定。
  if (score <= 2400000) return Math.floor(score / 1000 + 3000)
  return 5400
}

export function getHifEvaluation(
  stats: StatValues,
  config: ProduceConfig,
  starPower = config.hif.starPower,
): EvaluationBreakdown {
  const statsScore = (stats.vo + stats.da + stats.vi) * 2
  const starPowerScore = Math.floor(starPower * 7.5)
  const round1Score = getHifRound1Evaluation(config.hif.round1Score)
  const round2Score = getHifRound2Evaluation(config.hif.round2Score)
  return {
    statsScore,
    starPowerScore,
    round1Score,
    round2Score,
    total: statsScore + starPowerScore + round1Score + round2Score,
  }
}

export function calcHif(deck: DeckCard[], config: ProduceConfig): CalculatorResult {
  const {
    calculationDeck,
    supportLessonBonus: supportBonus,
    otherLessonBonus: otherBonus,
    totalLessonBonus: totalBonus,
    totalSpRate: spRate,
    totalInitialStats: initialGain,
  } = getProduceStats(deck, config)
  deck = calculationDeck
  const base = getHifLessonBaseTotals(config)
  const examBase = addStatValues(
    ...config.hif.selectionExams.map((exam, index) => getHifSelectionExamConfiguredReward(index, exam)),
  )
  const applyBonus = (values: StatValues) =>
    Object.fromEntries(
      STATS.map((stat) => [stat, values[stat] * (1 + otherBonus[stat] / 100)]),
    ) as unknown as StatValues
  const lessonGain = applyBonus(addStatValues(base.normalBaseTotal, base.spBaseTotal))
  const examGain = applyBonus(examBase)
  const classGain = { ...ZERO_STAT_VALUES }
  config.hif.classes.forEach((entry, index) => {
    if (entry.enabled && HIF_CLASS_SCHEDULE[index])
      classGain[AXES[entry.param]] += HIF_CLASS_SCHEDULE[index].gain
  })
  // サポカのボーナス分はカード寄与に一度だけ計上する。
  const contributions = getCardContributions(
    deck,
    config,
    {
      normalBaseTotal: addStatValues(base.normalBaseTotal, examBase),
      spBaseTotal: base.spBaseTotal,
    },
    getHifTriggerCount,
  )
  if (config.hif.includePItems) {
    deck.forEach((deckCard, index) => {
      deckCard.card.supportEventRewards?.forEach((reward) => {
        if (reward.kind !== 'p_item' || !reward.parameterAbility) return
        const ability = reward.parameterAbility
        const count = getHifTriggerCount(ability, config)
        const gain = { ...ZERO_STAT_VALUES }
        ability.operations.forEach((operation) => {
          if (operation.op === 'add_stat')
            gain[operation.stat] += resolveOperationValue(ability, operation, deckCard.level) * count
        })
        const total = gain.vo + gain.da + gain.vi
        if (!total) return
        contributions[index].skillContributions.push({
          skillId: `p-item:${reward.name}`,
          skillName: reward.name,
          skillDescription: `Pアイテム：${reward.name}`,
          gain,
          total,
        })
        contributions[index].total = addStatValues(contributions[index].total, gain)
        STATS.forEach((stat) => {
          if (gain[stat] <= 0) return
          contributions[index].effectBreakdowns.push({
            key: `p-item:${reward.name}:${stat}`,
            label: `Pアイテム：${reward.name}`,
            stat,
            triggerCount: count,
            totalValueText: String(gain[stat]),
          })
        })
      })
    })
  }
  const statCap = 3000 + (HIF_CAP_BONUSES[config.hif.capBonusLevel] ?? 0)
  const finalStats = floorAndCapStatValues(
    addStatValues(initialGain, lessonGain, classGain, examGain, getDeckSkillContributionGain(contributions)),
    statCap,
  )
  return {
    statCap,
    finalStats,
    contributions,
    abilityCoverage: getAbilityCoverage(deck),
    totalSpRateByStat: spRate,
    totalSupportLessonBonusByStat: supportBonus,
    totalLessonBonusByStat: totalBonus,
    statSourceBreakdown: { initial: initialGain, lesson: lessonGain, class: classGain, exam: examGain },
    eventCounts: getHifEventCounts(config),
    evaluation: getHifEvaluation(finalStats, config),
  }
}
