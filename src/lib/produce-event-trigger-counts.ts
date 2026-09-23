import type { DeckCard } from '@/types/card'
import type { ProduceSkillCardState } from '@/types/calculator'
import type { HifLessonConfig, ProduceConfig } from '@/types/produce'
import type { HifSkillCardSelection } from '@/types/hif-schedule'
import type { AbilityActivationEvent } from '@/types/support-ability'
import { HIF_LESSON_SCHEDULE } from '@/data/hif'
import { HIF_SCHEDULE } from '@/data/hif-schedule'
import { findIdolVersion } from '@/data/idols'
import { getHifScheduleProgress, normalizeHifSchedule } from '@/lib/hif-schedule'
import { getCustomPItemEffect, matchesCustomPItemAction } from '@/lib/calculator/hif-custom-p-item'
import { getHifConsultationSkillTags } from '@/lib/hif-consultation'
import {
  createCarryoverSkillCard,
  createClassSelectedCard,
  createScheduledSkillCard,
  createSleepyCard,
  inferRewardSkillCard,
} from '@/lib/calculator/hif-simulation-state'
import { getSupportAfterEventActivation, getSupportAfterEventOptions } from '@/lib/support-event-selection'
import {
  PARAMETER_SORT_TRIGGER_SETTINGS,
  SKILL_CARD_GAIN_TRIGGER_SETTINGS,
  type ParameterSortTriggerCounts,
} from '@/lib/support-card-parameter-total'

const ACTION_EVENT: Partial<Record<string, AbilityActivationEvent>> = {
  lesson: 'lesson_end',
  class: 'class_end',
  outing: 'outing_end',
  consultation: 'consultation_selected',
  supply: 'activity_supply_selected',
  training: 'special_training_started',
  rest: 'rest_selected',
  exam: 'exam_end',
  round1: 'exam_end',
  round2: 'exam_end',
}

function matchesSkillCardSetting(card: ProduceSkillCardState, key: string): boolean {
  const suffix = key.slice('skill_card_gained:'.length)
  if (suffix === 'active' || suffix === 'mental') return card.category === suffix
  if (suffix === 'R' || suffix === 'SR' || suffix === 'SSR') return card.rarity === suffix
  return card.effectTags.includes(suffix as ProduceSkillCardState['effectTags'][number])
}

/** Public-lesson rows confirmed in the schedule. Unconfirmed rows intentionally remain disabled and blank. */
export function getScheduleSortLessons(config: ProduceConfig): HifLessonConfig[] {
  const schedule = normalizeHifSchedule(config.hif.schedule)
  const progress = getHifScheduleProgress(schedule)
  const lessons: HifLessonConfig[] = HIF_LESSON_SCHEDULE.map(() => ({
    enabled: false,
    type: 'normal',
    param: null,
    subParam: null,
  }))
  HIF_SCHEDULE.slice(0, progress).forEach((day, index) => {
    if (day.lessonIndex === undefined || schedule.steps[index].action !== 'lesson') return
    const step = schedule.steps[index]
    lessons[day.lessonIndex] = {
      enabled: true,
      type: step.lessonType,
      param: step.param,
      subParam: step.subParam,
    }
  })
  return lessons
}

/** Build support-sort counts only from facts fixed by the confirmed schedule prefix. */
export function getProduceEventTriggerCounts(
  config: ProduceConfig,
  deck: readonly DeckCard[] = [],
): ParameterSortTriggerCounts {
  const schedule = normalizeHifSchedule(config.hif.schedule)
  const progress = getHifScheduleProgress(schedule)
  const events: Partial<Record<AbilityActivationEvent, number>> = {}
  const lessonKinds = { normal: 0, sp: 0 }
  const gainedCards: ProduceSkillCardState[] = []
  const plan = findIdolVersion(config.idolId, config.idolVersionId)?.plan ?? 'sense'
  const bump = (event: AbilityActivationEvent, count = 1) => {
    events[event] = (events[event] ?? 0) + count
  }
  const gainCard = (card: ProduceSkillCardState) => {
    gainedCards.push(card)
    bump('skill_card_gained')
  }
  const frontEvents = new Set<number>()
  const afterEvents = new Set<string>()
  let customItemUses = 0

  const applyFrontEvent = (slot: number, id: string, selection?: HifSkillCardSelection | null) => {
    if (frontEvents.has(slot)) return
    const card = deck[slot]
    const reward = card?.card.supportEventRewards?.[0]
    if (!card || card.level < 10 || !reward) return
    frontEvents.add(slot)
    if (reward.kind === 'p_item') bump('item_gained')
    else
      gainCard(
        inferRewardSkillCard(
          reward,
          id,
          selection,
          plan,
          card.card.id,
          schedule.supportEventSkillCardsUpgraded,
        ),
      )
  }
  const applyAfterEvent = (slot: number, eventIndex: number) => {
    const key = `${slot}:${eventIndex}`
    if (afterEvents.has(key)) return
    const card = deck[slot]
    const option = card
      ? getSupportAfterEventOptions(card).find((item) => item.eventIndex === eventIndex)
      : undefined
    if (!card || !option || card.level < option.requiredLevel) return
    afterEvents.add(key)
    const activation = getSupportAfterEventActivation(option.kind)
    if (activation) bump(activation)
  }

  if (schedule.eventMode === 'simple') {
    schedule.simpleEvents.frontSlots.forEach((slot) =>
      applyFrontEvent(slot, `support:${slot}:initial`, schedule.simpleEvents.frontSkillCards?.[slot]),
    )
    schedule.simpleEvents.afterSelections.forEach(({ slot, eventIndex }) => applyAfterEvent(slot, eventIndex))
  }

  HIF_SCHEDULE.slice(0, progress).forEach((_, index) => {
    const step = schedule.steps[index]
    const action = step.action!
    const actionEvent = ACTION_EVENT[action]
    if (actionEvent) bump(actionEvent)
    if (action === 'lesson') lessonKinds[step.lessonType]++

    config.hif.carryoverSkillCards.forEach((selection, slot) => {
      if (
        selection.enabled &&
        ((selection.acquireOnDayOne && index === 0) || (!selection.acquireOnDayOne && index === 6))
      ) {
        gainCard(createCarryoverSkillCard(selection, plan, slot))
      }
    })
    if (action === 'consultation') {
      bump('drink_gained', step.consultation.pDrinkCount)
      bump('consultation_after_drink_trade', step.consultation.pDrinkCount)
      step.consultation.skillActions.forEach((selection, actionIndex) => {
        const card = createScheduledSkillCard(selection, plan, 'consultation', index, actionIndex)
        if (selection.kind === 'gain') gainCard(card)
        else bump(selection.kind === 'upgrade' ? 'skill_card_upgraded' : 'skill_card_deleted')
        bump('consultation_after_card_trade')
      })
    }
    if (action === 'interval') {
      bump('drink_gained', step.interval.pDrinkCount)
      step.interval.skillActions.forEach((selection, actionIndex) => {
        const card = createScheduledSkillCard(selection, plan, 'interval', index, actionIndex)
        if (selection.kind === 'gain') gainCard(card)
        else bump(selection.kind === 'upgrade' ? 'skill_card_upgraded' : 'skill_card_changed')
      })
      bump('skill_card_customized', step.interval.skillCardCustomCount)
    }
    if (action === 'outing') {
      bump('drink_gained')
      const count = step.outing.reward === 'one_card' ? 1 : 2
      step.outing.skillCards.slice(0, count).forEach((selection, actionIndex) => {
        if (selection) gainCard(createScheduledSkillCard(selection, plan, 'outing', index, actionIndex))
      })
      if (step.outing.reward === 'two_cards_sleepy') gainCard(createSleepyCard(index, 'outing'))
    }
    if (action === 'supply') {
      bump('drink_gained')
      gainCard(createScheduledSkillCard(step.supplySkillCard, plan, 'supply', index))
    }
    if (action === 'class') {
      const card = createClassSelectedCard(step.classSettings.selection, plan, index)
      if (step.classSettings.action === 'gain') gainCard(card)
      else bump('skill_card_changed')
      if (step.classSettings.action === 'change_sleepy') gainCard(createSleepyCard(index))
    }
    if (action === 'training') bump('skill_card_customized', step.trainingCustomCount)

    if (schedule.eventMode === 'detailed') {
      const frontSlot = step.pItemSlots[0]
      if (frontSlot !== undefined)
        applyFrontEvent(frontSlot, `support:${frontSlot}:${index}`, step.frontSkillCard)
      const after = step.postEventSelection
      if (after) applyAfterEvent(after.slot, after.eventIndex)
    }
    const customStage = index >= 20 ? 3 : index >= 13 ? 2 : index >= 7 ? 1 : 0
    if (customStage) {
      const effect = getCustomPItemEffect(schedule.customPItem, customStage)
      if (effect && customItemUses < effect.limit && matchesCustomPItemAction(effect.route, action)) {
        customItemUses++
        bump('drink_gained', effect.drinks)
        if (effect.card === 'gain' || effect.card === 'gain_upgraded' || effect.card === 'copy') {
          const result = step.customPItemCard.resultCard
          const copied =
            effect.card === 'copy'
              ? gainedCards.find((card) => card.id === step.customPItemCard.targetCardId)
              : undefined
          gainCard({
            id: `custom-item:${index}`,
            name: 'カスタムPアイテムで獲得したスキルカード',
            source: 'custom_item',
            effectTags: [],
            upgraded: effect.card === 'gain_upgraded' || result?.upgraded === true,
            ...(copied
              ? {
                  rarity: copied.rarity,
                  category: copied.category,
                  effectTags: [...copied.effectTags],
                  upgraded: copied.upgraded,
                }
              : {}),
            ...(result && effect.card !== 'copy'
              ? {
                  rarity: result.rarity,
                  category: result.category,
                  effectTags: getHifConsultationSkillTags(
                    plan,
                    result.skillKind,
                    result.energy,
                    result.preservation,
                  ),
                }
              : {}),
          })
        } else if (effect.card === 'change') bump('skill_card_changed')
        else if (effect.card === 'upgrade') bump('skill_card_upgraded')
        else if (effect.card === 'delete') bump('skill_card_deleted')
      }
    }
    const examIndex = HIF_SCHEDULE[index].examIndex
    if (examIndex !== undefined) {
      const selected =
        examIndex === 0
          ? schedule.customPItem.color
          : examIndex === 1
            ? schedule.customPItem.mascot
            : schedule.customPItem.decoration
      if (selected) {
        bump('item_gained')
        customItemUses = 0
      }
    }
  })

  const counts = Object.fromEntries(
    PARAMETER_SORT_TRIGGER_SETTINGS.map(({ key }) => [key, 0]),
  ) as ParameterSortTriggerCounts
  PARAMETER_SORT_TRIGGER_SETTINGS.forEach(({ key, event }) => {
    if (key === event) counts[key] = events[event] ?? 0
    else if (event === 'lesson_end' && !key.includes(':condition:')) {
      if (key === 'lesson_end:normal') counts[key] = lessonKinds.normal
      if (key === 'lesson_end:sp') counts[key] = lessonKinds.sp
    }
  })
  SKILL_CARD_GAIN_TRIGGER_SETTINGS.forEach(({ key }) => {
    counts[key] = gainedCards.filter((card) => matchesSkillCardSetting(card, key)).length
  })
  return counts
}

/** Copy at modal opening; subsequent sort edits never mutate Produce's configuration. */
export function getInitialParameterSortTriggerCounts(
  config: ProduceConfig,
  deck: readonly DeckCard[] = [],
): ParameterSortTriggerCounts {
  return { ...getProduceEventTriggerCounts(config, deck) }
}
