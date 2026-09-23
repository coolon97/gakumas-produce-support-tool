import { getSupportEventStatGain } from '@/lib/support-event-stat-gain'
import type { DeckCard } from '@/types/card'
import type { CardContribution, SkillContribution } from '@/types/calculator'
import type { ProduceConfig, StatValues } from '@/types/produce'
import { addStatValues, ZERO_STAT_VALUES } from '@/lib/stats'
import {
  formatSkillValue,
  getCardContributionBadgeBreakdowns,
  getDefaultEventTriggerCount,
  getSkillTriggerContext,
} from '@/lib/utils'
import { getAbilityConditions, getAbilityLimit, resolveOperationValue } from '@/lib/support-ability'
import type { SupportAbilitySpec } from '@/types/support-ability'

function getPostEventBreakdowns(deckCard: DeckCard, enabled: boolean): CardContribution['effectBreakdowns'] {
  if (!enabled) {
    return []
  }

  const supportEventGain = getSupportEventStatGain(deckCard)
  const breakdowns: CardContribution['effectBreakdowns'] = []

  if (supportEventGain.vo > 0) {
    breakdowns.push({
      key: `post-event-${deckCard.card.id}-vo`,
      label: `後イベVo+${formatSkillValue(supportEventGain.vo)}`,
      className: 'bg-rose-50 text-rose-700 border border-rose-200',
      stat: 'vo',
      triggerCount: 1,
      totalValueText: formatSkillValue(supportEventGain.vo),
    })
  }
  if (supportEventGain.da > 0) {
    breakdowns.push({
      key: `post-event-${deckCard.card.id}-da`,
      label: `後イベDa+${formatSkillValue(supportEventGain.da)}`,
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
      stat: 'da',
      triggerCount: 1,
      totalValueText: formatSkillValue(supportEventGain.da),
    })
  }
  if (supportEventGain.vi > 0) {
    breakdowns.push({
      key: `post-event-${deckCard.card.id}-vi`,
      label: `後イベVi+${formatSkillValue(supportEventGain.vi)}`,
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      stat: 'vi',
      triggerCount: 1,
      totalValueText: formatSkillValue(supportEventGain.vi),
    })
  }

  return breakdowns
}

function getAffectedStats(target: DeckCard['card']['type'] | 'all'): Array<keyof StatValues> {
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

function getResolvedEventTriggerCount(ability: SupportAbilitySpec, config: ProduceConfig): number {
  const trigger = getSkillTriggerContext(ability)
  const directCount = config.eventTriggerCounts?.[trigger.key]
  const genericFamilyKey = trigger.key.includes(':condition:')
    ? undefined
    : trigger.key.match(/^(skill_card_(?:gained|deleted|upgraded|customized|changed)):/)?.[1]
  const genericFamilyCount =
    genericFamilyKey &&
    !getAbilityConditions(ability).some((condition) => condition.type === 'owned_effect_tag_cards_gte')
      ? config.eventTriggerCounts?.[`${genericFamilyKey}:any`]
      : undefined
  const fallbackFamilyCount = trigger.key.endsWith(':any')
    ? (config.eventTriggerCounts?.[`${trigger.key.replace(/:any$/, '')}:active`] ?? 0) +
      (config.eventTriggerCounts?.[`${trigger.key.replace(/:any$/, '')}:mental`] ?? 0)
    : undefined
  const configuredCount =
    directCount ??
    genericFamilyCount ??
    fallbackFamilyCount ??
    getDefaultEventTriggerCount(trigger.key, config)
  const normalizedCount = Math.max(0, Math.floor(Number(configuredCount) || 0))

  const perProduceLimit = getAbilityLimit(ability, 'produce')
  if (perProduceLimit != null) {
    return Math.min(normalizedCount, perProduceLimit)
  }

  return normalizedCount
}

function getRateBoostContribution(
  target: DeckCard['card']['type'] | 'all',
  value: number,
  lessonBaseTotals: { normalBaseTotal: StatValues; spBaseTotal: StatValues },
): StatValues {
  if (value <= 0) {
    return ZERO_STAT_VALUES
  }

  const lessonTotals = addStatValues(lessonBaseTotals.normalBaseTotal, lessonBaseTotals.spBaseTotal)
  const gain = { ...ZERO_STAT_VALUES }

  getAffectedStats(target).forEach((statKey) => {
    gain[statKey] = lessonTotals[statKey] * (value / 100)
  })

  return gain
}

function addToStatValues(values: StatValues, stat: 'vo' | 'da' | 'vi', amount: number): StatValues {
  return {
    ...values,
    [stat]: values[stat] + amount,
  }
}

function calculateSkillContribution(
  deckCard: DeckCard,
  skill: DeckCard['card']['skills'][number],
  config: ProduceConfig,
  lessonBaseTotals: { normalBaseTotal: StatValues; spBaseTotal: StatValues },
  resolveTriggerCount = getResolvedEventTriggerCount,
): SkillContribution | null {
  const ability = skill.ability
  const triggerCount = ability.activation.event === 'static' ? 1 : resolveTriggerCount(ability, config)
  let gain = { ...ZERO_STAT_VALUES }
  let lessonBonusGain = { ...ZERO_STAT_VALUES }

  ability.operations.forEach((operation) => {
    switch (operation.op) {
      case 'add_stat': {
        if (operation.timing === 'initial') break
        const value = resolveOperationValue(ability, operation, deckCard.level)
        gain = addToStatValues(gain, operation.stat, value * triggerCount)
        break
      }
      case 'add_lesson_bonus':
      case 'add_param_bonus': {
        const value = resolveOperationValue(ability, operation, deckCard.level)
        const rateGain = getRateBoostContribution(operation.target, value, lessonBaseTotals)
        gain = addStatValues(gain, rateGain)
        lessonBonusGain = addStatValues(lessonBonusGain, rateGain)
        break
      }
      default:
        break
    }
  })

  const total = gain.vo + gain.da + gain.vi
  if (total <= 0) {
    return null
  }

  return {
    skillId: skill.id,
    skillName: skill.name,
    skillDescription: skill.description,
    gain,
    total,
    ...(lessonBonusGain.vo + lessonBonusGain.da + lessonBonusGain.vi > 0 ? { lessonBonusGain } : {}),
  }
}

export function getCardContributions(
  deck: DeckCard[],
  config: ProduceConfig,
  lessonBaseTotals = { normalBaseTotal: ZERO_STAT_VALUES, spBaseTotal: ZERO_STAT_VALUES },
  resolveTriggerCount = getResolvedEventTriggerCount,
): CardContribution[] {
  return deck.map((deckCard, index) => {
    const skillContributions = deckCard.card.skills
      .map((skill) =>
        calculateSkillContribution(deckCard, skill, config, lessonBaseTotals, resolveTriggerCount),
      )
      .filter((contribution): contribution is SkillContribution => contribution != null)

    const effectBreakdowns = getCardContributionBadgeBreakdowns(
      deckCard.card.skills,
      deckCard.level,
      deckCard.card.type,
      (ability) => resolveTriggerCount(ability, config),
    ).filter((badge) => !badge.key.startsWith('effect-type-initial_'))
    const lessonBonusBreakdowns: CardContribution['effectBreakdowns'] = skillContributions.flatMap((skill) =>
      (['vo', 'da', 'vi'] as const).flatMap((stat) => {
        const gain = skill.lessonBonusGain?.[stat] ?? 0
        return gain > 0
          ? [
              {
                key: `lb:${skill.skillId}:${stat}`,
                label: `LB寄与：${skill.skillName}`,
                className: 'border-sky-200 bg-sky-50 text-sky-700',
                stat,
                triggerCount: 1,
                totalValueText: String(gain),
              },
            ]
          : []
      }),
    )
    const postEventEnabled = Boolean(config.postEventEnabledSlots?.[index])
    const postEventGain = postEventEnabled ? getSupportEventStatGain(deckCard) : ZERO_STAT_VALUES
    const postEventBreakdowns = getPostEventBreakdowns(deckCard, postEventEnabled)

    const total = skillContributions.reduce(
      (sum, contribution) => addStatValues(sum, contribution.gain),
      ZERO_STAT_VALUES,
    )
    const totalWithPostEvent = addStatValues(total, postEventGain)

    return {
      cardId: deckCard.card.id,
      cardName: deckCard.card.name,
      effectBreakdowns: [
        ...effectBreakdowns.map((badge) => ({
          key: badge.key,
          label: badge.label,
          className: badge.className,
          stat: badge.stat,
          triggerCount: badge.triggerCount,
          totalValueText: badge.totalValueText,
        })),
        ...lessonBonusBreakdowns,
        ...postEventBreakdowns,
      ],
      skillContributions,
      total: totalWithPostEvent,
    }
  })
}

export function getDeckSkillContributionGain(contributions: CardContribution[]): StatValues {
  return contributions.reduce((sum, contribution) => addStatValues(sum, contribution.total), ZERO_STAT_VALUES)
}
