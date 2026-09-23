import type { DeckCard } from '@/types/card'
import type { ProduceConfig, StatValues } from '@/types/produce'
import type { SupportAbilitySpec, AbilityActivationEvent } from '@/types/support-ability'
import type {
  CalculatorResult,
  CardContribution,
  ProduceSkillCardState,
  ProduceStateSnapshot,
  SkillContribution,
} from '@/types/calculator'
import { HIF_SCHEDULE, HIF_ACTION_LABELS } from '@/data/hif-schedule'
import {
  HIF_LESSON_SCHEDULE,
  HIF_CLASS_SCHEDULE,
  HIF_CAP_BONUSES,
  getHifAdjustedStarPower,
  getHifLessonStarPower,
} from '@/data/hif'
import { getHifScheduleProgress, normalizeHifConsultationDrinkCount } from '@/lib/hif-schedule'
import { getCustomPItemName } from '@/data/hif-custom-p-items'
import { getProduceStats } from './produce-stats'
import { addStatValues, floorAndCapStatValues, ZERO_STAT_VALUES } from '@/lib/stats'
import { getCardContributions, getDeckSkillContributionGain } from './support-card-contributions'
import { getAbilityCoverage } from './ability-coverage'
import { getHifEvaluation } from './hif'
import {
  getHifSelectionExamConfiguredReward,
  getHifSelectionExamConfiguredStarPower,
} from './hif-selection-exams'
import { capHifFinalStarPower, getHifFinalRoundStarPower } from './hif-final-rounds'
import { getParameterSortTriggerSetting } from '@/lib/support-card-parameter-total'
import { getAbilityLimit, resolveOperationValue } from '@/lib/support-ability'
import { getSelectedSupportEventStatGain } from '@/lib/support-event-stat-gain'
import { getSupportAfterEventActivation, getSupportAfterEventOptions } from '@/lib/support-event-selection'
import { findIdolVersion } from '@/data/idols'
import {
  applyHifBadgeSkillCardGains,
  applySupportAfterEventCardMutation,
  cloneProduceState,
  createChangedSkillCard,
  createCarryoverSkillCard,
  createClassSelectedCard,
  createInitialProduceState,
  createScheduledSkillCard,
  createSleepyCard,
  inferRewardSkillCard,
  resolveSupportAfterEventTarget,
  type AbilityEventContext,
  type OwnedPItem,
} from './hif-simulation-state'
import { evaluateHifPredicate, matchesHifActivation } from './hif-simulation-abilities'
import { applyCustomPItemEffect } from './hif-custom-p-item'

const AXES = { vocal: 'vo', dance: 'da', visual: 'vi' } as const
const STATS = ['vo', 'da', 'vi'] as const
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

function mergeSkillContribution(totals: SkillContribution[], incoming: SkillContribution): void {
  const existing = totals.find((item) => item.skillId === incoming.skillId)
  if (!existing) {
    totals.push({
      ...incoming,
      gain: { ...incoming.gain },
      ...(incoming.lessonBonusGain ? { lessonBonusGain: { ...incoming.lessonBonusGain } } : {}),
    })
    return
  }
  existing.gain = addStatValues(existing.gain, incoming.gain)
  existing.total += incoming.total
  if (incoming.lessonBonusGain)
    existing.lessonBonusGain = addStatValues(
      existing.lessonBonusGain ?? ZERO_STAT_VALUES,
      incoming.lessonBonusGain,
    )
}

function addEventGainBreakdowns(
  contribution: CardContribution,
  key: string,
  label: string,
  gain: StatValues,
  triggerCount = 1,
): void {
  STATS.forEach((stat) => {
    if (gain[stat] <= 0) return
    contribution.effectBreakdowns.push({
      key: `${key}:${stat}`,
      label,
      stat,
      triggerCount,
      totalValueText: String(gain[stat]),
    })
  })
}

function applyOwnedPItemEffects(
  items: readonly OwnedPItem[],
  contexts: AbilityEventContext[],
  eventStats: StatValues,
  state: ProduceStateSnapshot,
  used: Map<SupportAbilitySpec, number>,
  counts: Record<string, number>,
): Map<number, { name: string; gain: StatValues; triggerCount: number }> {
  const gains = new Map<number, { name: string; gain: StatValues; triggerCount: number }>()
  let eventCursor = 0
  while (eventCursor < contexts.length && eventCursor < 1000) {
    const context = contexts[eventCursor++]
    items.forEach((item) => {
      const ability = item.ability
      if (!ability || !matchesHifActivation(ability, context)) return
      if (ability.predicate && evaluateHifPredicate(ability.predicate, eventStats, state, context) !== true)
        return
      const remaining = Math.max(
        0,
        (getAbilityLimit(ability, 'produce') ?? Infinity) - (used.get(ability) ?? 0),
      )
      if (remaining < 1) return
      used.set(ability, (used.get(ability) ?? 0) + 1)
      const key = getParameterSortTriggerSetting(ability).key
      counts[key] = (counts[key] ?? 0) + 1
      let gainedStat = false
      ability.operations.forEach((operation) => {
        const value = resolveOperationValue(ability, operation, item.ownerLevel ?? 1)
        if (operation.op === 'add_p_drink') {
          const amount = Math.max(0, Math.floor(value))
          state.pDrinkCount += amount
          for (let drink = 0; drink < amount; drink++) contexts.push({ event: 'drink_gained' })
        }
        if (
          operation.op === 'add_stat' &&
          operation.timing === 'activation' &&
          item.ownerSlot !== undefined
        ) {
          const current = gains.get(item.ownerSlot) ?? {
            name: item.name,
            gain: { ...ZERO_STAT_VALUES },
            triggerCount: 0,
          }
          current.gain[operation.stat] += value
          gains.set(item.ownerSlot, current)
          eventStats[operation.stat] += value
          if (value > 0) gainedStat = true
        }
      })
      if (gainedStat && item.ownerSlot !== undefined) gains.get(item.ownerSlot)!.triggerCount++
    })
  }
  return gains
}

/** Executes the confirmed schedule prefix. Evaluation is produced only after all days are confirmed. */
export function simulateHifSchedule(deck: DeckCard[], config: ProduceConfig): CalculatorResult {
  const schedule = config.hif.schedule
  if (!schedule) throw new Error('HIF schedule is unavailable')
  const progress = getHifScheduleProgress(schedule)
  const complete = progress === HIF_SCHEDULE.length
  const aggregate = getProduceStats(deck, config)
  const idolPlan = findIdolVersion(config.idolId, config.idolVersionId)?.plan ?? 'sense'
  deck = aggregate.calculationDeck
  const finalCap = 3000 + (HIF_CAP_BONUSES[config.hif.capBonusLevel] ?? 0)
  let initial = floorAndCapStatValues(aggregate.totalInitialStats, 3000)
  let stats = { ...initial }
  const sources = {
    initial,
    lesson: { ...ZERO_STAT_VALUES },
    class: { ...ZERO_STAT_VALUES },
    exam: { ...ZERO_STAT_VALUES },
  }
  const totals: CardContribution[] = deck.map((dc) => ({
    cardId: dc.card.id,
    cardName: dc.card.name,
    skillContributions: [],
    effectBreakdowns: [],
    total: { ...ZERO_STAT_VALUES },
  }))
  const used = new Map<SupportAbilitySpec, number>()
  const initialProduceState = createInitialProduceState(config)
  const produceState = initialProduceState.snapshot
  const ownedPItems = initialProduceState.items
  const frontEvents = new Set<number>()
  const afterEvents = new Set<string>()
  const trace: NonNullable<CalculatorResult['simulation']>['steps'] = []
  const eventCounts = { normalLessons: 0, spLessons: 0, supportEvents: 0, exams: 0 }
  const counts: Record<string, number> = {}
  let customItemUses = 0
  let customItemName = ''
  // 簡易モードのイベントは日程に配置せず、育成開始時に一括適用する。
  if (schedule.eventMode === 'simple') {
    const initialContexts: AbilityEventContext[] = []
    const addInitialEventGain = (
      slot: number,
      gain: StatValues,
      skillId: string,
      skillName: string,
      skillDescription: string,
      breakdownLabel = skillName,
      triggerCount = 1,
    ) => {
      const total = gain.vo + gain.da + gain.vi
      if (!totals[slot] || total <= 0) return
      totals[slot].total = addStatValues(totals[slot].total, gain)
      totals[slot].skillContributions.push({ skillId, skillName, skillDescription, gain, total })
      addEventGainBreakdowns(totals[slot], skillId, breakdownLabel, gain, triggerCount)
      stats = addStatValues(stats, gain)
    }
    schedule.simpleEvents.frontSlots.forEach((slot) => {
      const card = deck[slot]
      const reward = card?.card.supportEventRewards?.[0]
      if (!card || card.level < 10 || !reward || frontEvents.has(slot)) return
      frontEvents.add(slot)
      eventCounts.supportEvents++
      const gain = getSelectedSupportEventStatGain(card, 0)
      addInitialEventGain(
        slot,
        gain,
        'support-front',
        'サポートイベント・前',
        `${reward.kind === 'p_item' ? 'Pアイテム' : 'スキルカード'}：${reward.name}`,
      )
      if (reward.kind === 'p_item') {
        initialContexts.push({ event: 'item_gained' })
        produceState.pItems.push(reward.name)
        ownedPItems.push({
          name: reward.name,
          ability: reward.parameterAbility,
          ownerSlot: slot,
          ownerLevel: card.level,
        })
      } else {
        const skillCard = inferRewardSkillCard(
          reward,
          `support:${slot}:initial`,
          schedule.simpleEvents.frontSkillCards?.[slot],
          idolPlan,
          card.card.id,
          schedule.supportEventSkillCardsUpgraded,
        )
        initialContexts.push({ event: 'skill_card_gained', skillCard })
        produceState.skillCards.push(skillCard)
      }
    })
    schedule.simpleEvents.afterSelections.forEach((selection) => {
      const card = deck[selection.slot]
      const option = card
        ? getSupportAfterEventOptions(card).find((item) => item.eventIndex === selection.eventIndex)
        : undefined
      const key = `${selection.slot}:${selection.eventIndex}`
      if (!card || !option || card.level < option.requiredLevel || afterEvents.has(key)) return
      afterEvents.add(key)
      eventCounts.supportEvents++
      const mutationTarget = resolveSupportAfterEventTarget(
        produceState.skillCards,
        option.kind,
        selection.targetCardId,
        option.event.effect,
      )
      const activation = getSupportAfterEventActivation(option.kind)
      if (activation && mutationTarget)
        initialContexts.push({ event: activation, ...(mutationTarget ? { skillCard: mutationTarget } : {}) })
      if (option.kind === 'parameter') {
        const gain = getSelectedSupportEventStatGain(card, selection.eventIndex)
        addInitialEventGain(
          selection.slot,
          gain,
          `support-after:${selection.eventIndex}`,
          'サポートイベント・後',
          option.event.effect,
          `サポートイベント・後（${option.event.unlock}）`,
        )
      } else
        applySupportAfterEventCardMutation(
          produceState,
          option.kind,
          mutationTarget,
          `changed:initial:${selection.slot}:${selection.eventIndex}`,
          selection.resultCard,
          idolPlan,
        )
    })
    applyHifBadgeSkillCardGains(produceState, initialContexts, config.hif.starPowerAffinityBonus)
    const initialPItemStats = { ...stats }
    const initialPItemGains = applyOwnedPItemEffects(
      ownedPItems,
      initialContexts,
      initialPItemStats,
      produceState,
      used,
      counts,
    )
    initialPItemGains.forEach((entry, slot) =>
      addInitialEventGain(
        slot,
        entry.gain,
        `p-item:${entry.name}`,
        entry.name,
        `Pアイテム：${entry.name}`,
        `Pアイテム：${entry.name}`,
        entry.triggerCount,
      ),
    )
    const initialResolver = (ability: SupportAbilitySpec) => {
      if (ability.activation.event === 'static') return 0
      let count = initialContexts.filter(
        (context) =>
          matchesHifActivation(ability, context) &&
          (!ability.predicate ||
            evaluateHifPredicate(ability.predicate, stats, produceState, context) === true),
      ).length
      count = Math.min(
        count,
        Math.max(0, (getAbilityLimit(ability, 'produce') ?? Infinity) - (used.get(ability) ?? 0)),
      )
      if (count > 0) {
        if (
          ability.operations.some(
            (operation) => operation.op === 'add_stat' && operation.timing === 'activation',
          )
        )
          used.set(ability, (used.get(ability) ?? 0) + count)
        const key = getParameterSortTriggerSetting(ability).key
        counts[key] = (counts[key] ?? 0) + count
      }
      return count
    }
    const initialContributions = getCardContributions(
      deck,
      { ...config, postEventEnabledSlots: deck.map(() => false) },
      { normalBaseTotal: { ...ZERO_STAT_VALUES }, spBaseTotal: { ...ZERO_STAT_VALUES } },
      initialResolver,
    )
    const triggeredGain = getDeckSkillContributionGain(initialContributions)
    stats = addStatValues(stats, triggeredGain)
    initialContributions.forEach((contribution, slot) => {
      totals[slot].total = addStatValues(totals[slot].total, contribution.total)
      contribution.skillContributions.forEach((skill) =>
        mergeSkillContribution(totals[slot].skillContributions, skill),
      )
      contribution.effectBreakdowns
        .filter((item) => item.triggerCount > 0)
        .forEach((item) => totals[slot].effectBreakdowns.push({ ...item }))
    })
    stats = floorAndCapStatValues(stats, 3000)
    initial = { ...stats }
    sources.initial = { ...initial }
  }
  HIF_SCHEDULE.slice(0, progress).forEach((day, index) => {
    const step = schedule.steps[index]
    const action = step.action!
    const before = { ...stats }
    const cap = day.phase === 'selection' ? 3000 : finalCap
    const lessonType = step.lessonType
    const normalBaseTotal = { ...ZERO_STAT_VALUES }
    const spBaseTotal = { ...ZERO_STAT_VALUES }
    let baseGain = { ...ZERO_STAT_VALUES }
    if (action === 'lesson' && day.lessonIndex !== undefined) {
      const lesson = HIF_LESSON_SCHEDULE[day.lessonIndex]
      const gain = lesson[lessonType]
      const base = lessonType === 'sp' ? spBaseTotal : normalBaseTotal
      base[AXES[step.param]] += gain.main
      base[AXES[step.subParam!]] += gain.sub
      STATS.forEach((stat) => {
        baseGain[stat] = base[stat] * (1 + aggregate.otherLessonBonus[stat] / 100)
      })
      sources.lesson = addStatValues(sources.lesson, baseGain)
      eventCounts[lessonType === 'sp' ? 'spLessons' : 'normalLessons']++
      produceState.starPower += getHifAdjustedStarPower(
        getHifLessonStarPower(day.lessonIndex, lessonType),
        config.hif.starPowerAffinityBonus,
      )
    } else if (action === 'class' && day.classIndex !== undefined) {
      baseGain[AXES[step.param]] = HIF_CLASS_SCHEDULE[day.classIndex].gain
      sources.class = addStatValues(sources.class, baseGain)
    } else if (action === 'exam' && day.examIndex !== undefined) {
      const gain = getHifSelectionExamConfiguredReward(
        day.examIndex,
        config.hif.selectionExams[day.examIndex],
      )
      Object.assign(normalBaseTotal, gain)
      STATS.forEach((stat) => {
        baseGain[stat] = gain[stat] * (1 + aggregate.otherLessonBonus[stat] / 100)
      })
      sources.exam = addStatValues(sources.exam, baseGain)
      produceState.starPower += getHifAdjustedStarPower(
        getHifSelectionExamConfiguredStarPower(day.examIndex, config.hif.selectionExams[day.examIndex]),
        config.hif.starPowerAffinityBonus,
      )
    } else if (action === 'round1' || action === 'round2') {
      const roundIndex = action === 'round1' ? 0 : 1
      const score = roundIndex === 0 ? config.hif.round1Score : config.hif.round2Score
      produceState.starPower += getHifAdjustedStarPower(
        getHifFinalRoundStarPower(roundIndex, score),
        config.hif.starPowerAffinityBonus,
      )
      if (action === 'round2') produceState.starPower = capHifFinalStarPower(produceState.starPower)
    }
    if (action === 'exam' || action === 'round1' || action === 'round2') eventCounts.exams++
    // Include support lesson bonuses before end-of-action predicates are tested.
    // Contributions still report these bonuses, but they must not be applied twice.
    const supportRateGain = { ...ZERO_STAT_VALUES }
    STATS.forEach((stat) => {
      supportRateGain[stat] =
        ((normalBaseTotal[stat] + spBaseTotal[stat]) * aggregate.supportLessonBonus[stat]) / 100
    })
    stats = floorAndCapStatValues(addStatValues(stats, baseGain, supportRateGain), cap)
    let eventStats = { ...stats }
    const frontSlot = schedule.eventMode === 'detailed' ? step.pItemSlots[0] : undefined
    const frontCard = frontSlot === undefined ? undefined : deck[frontSlot]
    const frontReward = frontCard?.card.supportEventRewards?.[0]
    const hasFrontEvent =
      frontSlot !== undefined &&
      Boolean(frontCard) &&
      frontCard!.level >= 10 &&
      Boolean(frontReward) &&
      !frontEvents.has(frontSlot)
    const afterSelection = schedule.eventMode === 'detailed' ? step.postEventSelection : null
    const afterCard = afterSelection ? deck[afterSelection.slot] : undefined
    const afterOption =
      afterSelection && afterCard
        ? getSupportAfterEventOptions(afterCard).find(
            (option) => option.eventIndex === afterSelection.eventIndex,
          )
        : undefined
    const afterKey = afterSelection ? `${afterSelection.slot}:${afterSelection.eventIndex}` : ''
    const hasAfterEvent = Boolean(
      afterSelection &&
      afterCard &&
      afterOption &&
      afterCard.level >= afterOption.requiredLevel &&
      !afterEvents.has(afterKey),
    )
    const contexts: AbilityEventContext[] = []
    const actionEvent = ACTION_EVENT[action]
    if (actionEvent)
      contexts.push({
        event: actionEvent,
        ...(action === 'lesson' ? { lessonKind: lessonType, lessonParam: step.param } : {}),
      })
    const carryoverCards = config.hif.carryoverSkillCards.flatMap((selection, slot) =>
      selection.enabled &&
      ((selection.acquireOnDayOne && index === 0) || (!selection.acquireOnDayOne && index === 6))
        ? [createCarryoverSkillCard(selection, idolPlan, slot)]
        : [],
    )
    carryoverCards.forEach((skillCard) => contexts.push({ event: 'skill_card_gained', skillCard }))
    const consultationActions = action === 'consultation' ? step.consultation.skillActions : []
    const consultationCards = consultationActions.map((consultationAction, actionIndex) =>
      createScheduledSkillCard(consultationAction, idolPlan, 'consultation', index, actionIndex),
    )
    const intervalActions = action === 'interval' ? step.interval.skillActions : []
    const intervalCards = intervalActions.map((intervalAction, actionIndex) =>
      createScheduledSkillCard(intervalAction, idolPlan, 'interval', index, actionIndex),
    )
    const outingCardCount = action === 'outing' ? (step.outing.reward === 'one_card' ? 1 : 2) : 0
    const outingCards =
      action === 'outing'
        ? step.outing.skillCards
            .slice(0, outingCardCount)
            .flatMap((selection, actionIndex) =>
              selection ? [createScheduledSkillCard(selection, idolPlan, 'outing', index, actionIndex)] : [],
            )
        : []
    const outingSleepy =
      action === 'outing' && step.outing.reward === 'two_cards_sleepy'
        ? createSleepyCard(index, 'outing')
        : undefined
    const supplyCard =
      action === 'supply'
        ? createScheduledSkillCard(step.supplySkillCard, idolPlan, 'supply', index)
        : undefined
    const classSelection = action === 'class' ? step.classSettings.selection : undefined
    const classSelectedCard = classSelection
      ? createClassSelectedCard(classSelection, idolPlan, index)
      : undefined
    const sleepyCard =
      action === 'class' && step.classSettings.action === 'change_sleepy'
        ? createSleepyCard(index)
        : undefined
    const examDeletedBasicCards =
      action === 'exam' && day.examIndex !== undefined && day.examIndex < 2
        ? (config.hif.selectionExams[day.examIndex].deletedBasicCardIds ?? []).flatMap((id) => {
            const card = produceState.skillCards.find(
              (candidate) => candidate.id === id && candidate.source === 'basic',
            )
            return card ? [card] : []
          })
        : []
    if (action === 'consultation') {
      const exchangedDrinks = normalizeHifConsultationDrinkCount(
        step.consultation.pDrinkCount,
        step.consultation.resetUsed,
      )
      produceState.pDrinkCount += exchangedDrinks
      for (let drink = 0; drink < exchangedDrinks; drink++) {
        contexts.push({ event: 'drink_gained' }, { event: 'consultation_after_drink_trade' })
      }
      const previewCards = [
        ...produceState.skillCards.map((card) => ({ ...card, effectTags: [...card.effectTags] })),
        ...carryoverCards.map((card) => ({ ...card, effectTags: [...card.effectTags] })),
      ]
      consultationActions.forEach((consultationAction, actionIndex) => {
        const skillCard = consultationCards[actionIndex]
        if (consultationAction.kind === 'gain') {
          contexts.push(
            { event: 'skill_card_gained', skillCard },
            { event: 'consultation_after_card_trade', skillCard },
          )
          previewCards.push({ ...skillCard, effectTags: [...skillCard.effectTags] })
        } else if (consultationAction.kind === 'upgrade') {
          const target = previewCards.find(
            (card) => card.id === consultationAction.targetCardId && !card.upgraded,
          )
          if (target) {
            target.upgraded = true
            contexts.push(
              { event: 'skill_card_upgraded', skillCard: target },
              { event: 'consultation_after_card_trade', skillCard: target },
            )
          }
        } else {
          const targetIndex = previewCards.findIndex(
            (card) => card.id === consultationAction.targetCardId && card.source !== 'idol',
          )
          const target = targetIndex >= 0 ? previewCards.splice(targetIndex, 1)[0] : undefined
          if (target) {
            contexts.push(
              { event: 'skill_card_deleted', skillCard: target },
              { event: 'consultation_after_card_trade', skillCard: target },
            )
          }
        }
      })
    }
    if (action === 'interval') {
      produceState.pDrinkCount += step.interval.pDrinkCount
      for (let drink = 0; drink < step.interval.pDrinkCount; drink++) contexts.push({ event: 'drink_gained' })
      intervalActions.forEach((intervalAction, actionIndex) => {
        const skillCard = intervalCards[actionIndex]
        if (intervalAction.kind === 'gain') {
          produceState.skillCards.push({ ...skillCard, effectTags: [...skillCard.effectTags] })
          contexts.push({ event: 'skill_card_gained', skillCard })
        } else if (intervalAction.kind === 'upgrade') {
          const target = produceState.skillCards.find(
            (card) => card.id === intervalAction.targetCardId && !card.upgraded,
          )
          if (target) {
            target.upgraded = true
            contexts.push({ event: 'skill_card_upgraded', skillCard: target })
          }
        } else {
          const targetIndex = produceState.skillCards.findIndex(
            (card) => card.id === intervalAction.targetCardId && card.source !== 'idol',
          )
          if (targetIndex >= 0 && intervalAction.resultCard) {
            const target = produceState.skillCards[targetIndex]
            contexts.push({ event: 'skill_card_changed', skillCard: target })
            produceState.skillCards[targetIndex] = createChangedSkillCard(
              target,
              `interval-changed:${index}:${actionIndex}`,
              intervalAction.resultCard,
              idolPlan,
            )
            produceState.skillCardChangeCount++
          }
        }
      })
      produceState.skillCardCustomCount += step.interval.skillCardCustomCount
      for (let custom = 0; custom < step.interval.skillCardCustomCount; custom++)
        contexts.push({ event: 'skill_card_customized' })
    }
    if (action === 'outing') {
      produceState.pDrinkCount++
      contexts.push({ event: 'drink_gained' })
      outingCards.forEach((skillCard) => contexts.push({ event: 'skill_card_gained', skillCard }))
      if (outingSleepy) contexts.push({ event: 'skill_card_gained', skillCard: outingSleepy })
    }
    if (supplyCard) {
      produceState.pDrinkCount++
      contexts.push({ event: 'drink_gained' }, { event: 'skill_card_gained', skillCard: supplyCard })
    }
    if (action === 'class' && classSelectedCard) {
      if (step.classSettings.action === 'gain') {
        contexts.push({ event: 'skill_card_gained', skillCard: classSelectedCard })
        produceState.skillCards.push({ ...classSelectedCard, effectTags: [...classSelectedCard.effectTags] })
      } else {
        const targetId = step.classSettings.targetCardId
        const targetIndex = produceState.skillCards.findIndex((card) => card.id === targetId)
        if (targetIndex >= 0 && step.classSettings.resultCard) {
          const target = produceState.skillCards[targetIndex]
          contexts.push({ event: 'skill_card_changed', skillCard: target })
          produceState.skillCards[targetIndex] = createChangedSkillCard(
            target,
            `class-changed:${index}`,
            step.classSettings.resultCard,
            idolPlan,
          )
          produceState.skillCardChangeCount++
        }
        if (sleepyCard && targetIndex >= 0 && step.classSettings.resultCard) {
          contexts.push({ event: 'skill_card_gained', skillCard: sleepyCard })
          produceState.skillCards.push(sleepyCard)
        }
      }
    }
    if (action === 'training') {
      produceState.skillCardCustomCount += step.trainingCustomCount
      for (let custom = 0; custom < step.trainingCustomCount; custom++)
        contexts.push({ event: 'skill_card_customized' })
    }
    examDeletedBasicCards.forEach((skillCard) => contexts.push({ event: 'skill_card_deleted', skillCard }))
    let frontSkillCard: ProduceSkillCardState | undefined
    if (hasFrontEvent && frontReward) {
      if (frontReward.kind === 'skill_card')
        frontSkillCard = inferRewardSkillCard(
          frontReward,
          `support:${frontSlot}:${index}`,
          step.frontSkillCard,
          idolPlan,
          frontCard?.card.id,
          schedule.supportEventSkillCardsUpgraded,
        )
      contexts.push({
        event: frontReward.kind === 'p_item' ? 'item_gained' : 'skill_card_gained',
        ...(frontSkillCard ? { skillCard: frontSkillCard } : {}),
      })
    }
    examDeletedBasicCards.forEach((card) => {
      const targetIndex = produceState.skillCards.findIndex(
        (candidate) => candidate.id === card.id && candidate.source === 'basic',
      )
      if (targetIndex >= 0) produceState.skillCards.splice(targetIndex, 1)
    })
    // Action rewards are owned by the time an end-of-action custom item activates.
    outingCards.forEach((skillCard) =>
      produceState.skillCards.push({ ...skillCard, effectTags: [...skillCard.effectTags] }),
    )
    if (outingSleepy) produceState.skillCards.push(outingSleepy)
    if (supplyCard) produceState.skillCards.push(supplyCard)
    const customStage = index >= 20 ? 3 : index >= 13 ? 2 : index >= 7 ? 1 : 0
    if (customStage) {
      const outcome = applyCustomPItemEffect(
        schedule.customPItem,
        customStage,
        action,
        produceState,
        index,
        customItemUses,
        step.customPItemCard,
        idolPlan,
      )
      if (outcome.triggered) customItemUses++
      contexts.push(...outcome.contexts)
    }
    if (action === 'exam' && day.examIndex !== undefined) {
      const acquiredStage = (day.examIndex + 1) as 1 | 2 | 3
      const name = getCustomPItemName(schedule.customPItem, acquiredStage)
      if (
        name &&
        (acquiredStage === 1 ||
          (acquiredStage === 2 && schedule.customPItem.mascot) ||
          (acquiredStage === 3 && schedule.customPItem.decoration))
      ) {
        if (customItemName) {
          produceState.pItems = produceState.pItems.filter((item) => item !== customItemName)
          const oldIndex = ownedPItems.findIndex((item) => item.name === customItemName)
          if (oldIndex >= 0) ownedPItems.splice(oldIndex, 1)
        }
        customItemName = name
        produceState.pItems.push(name)
        ownedPItems.push({ name })
        customItemUses = 0
        contexts.push({ event: 'item_gained' })
      }
    }
    carryoverCards.forEach((skillCard) =>
      produceState.skillCards.push({ ...skillCard, effectTags: [...skillCard.effectTags] }),
    )
    consultationActions.forEach((consultationAction, actionIndex) => {
      const selected = consultationCards[actionIndex]
      if (consultationAction.kind === 'gain') {
        produceState.skillCards.push({ ...selected, effectTags: [...selected.effectTags] })
      } else if (consultationAction.kind === 'upgrade') {
        const target = produceState.skillCards.find(
          (card) => card.id === consultationAction.targetCardId && !card.upgraded,
        )
        if (target) target.upgraded = true
      } else {
        const targetIndex = produceState.skillCards.findIndex(
          (card) => card.id === consultationAction.targetCardId && card.source !== 'idol',
        )
        if (targetIndex >= 0) produceState.skillCards.splice(targetIndex, 1)
      }
    })
    if (hasAfterEvent && afterOption) {
      const activation = getSupportAfterEventActivation(afterOption.kind)
      const mutationCards =
        afterSelection?.targetCardId && frontSkillCard
          ? [...produceState.skillCards, frontSkillCard]
          : produceState.skillCards
      const mutationTarget = resolveSupportAfterEventTarget(
        mutationCards,
        afterOption.kind,
        afterSelection?.targetCardId,
        afterOption.event.effect,
      )
      if (activation && mutationTarget)
        contexts.push({ event: activation, ...(mutationTarget ? { skillCard: mutationTarget } : {}) })
    }
    applyHifBadgeSkillCardGains(produceState, contexts, config.hif.starPowerAffinityBonus)
    // Front events are available for the selected day's action and its other events.
    if (hasFrontEvent && frontReward?.kind === 'p_item' && frontSlot !== undefined && frontCard) {
      produceState.pItems.push(frontReward.name)
      ownedPItems.push({
        name: frontReward.name,
        ability: frontReward.parameterAbility,
        ownerSlot: frontSlot,
        ownerLevel: frontCard.level,
      })
    }
    const pItemGains = applyOwnedPItemEffects(ownedPItems, contexts, eventStats, produceState, used, counts)
    const cached = new Map<SupportAbilitySpec, number>()
    const resolver = (ability: SupportAbilitySpec) => {
      if (cached.has(ability)) return cached.get(ability)!
      const key = getParameterSortTriggerSetting(ability).key
      const availableContexts =
        ability.activation.event === 'static'
          ? [{ event: 'static' as const }]
          : contexts.filter((context) => matchesHifActivation(ability, context))
      let count = availableContexts.filter(
        (context) =>
          !ability.predicate || evaluateHifPredicate(ability.predicate, eventStats, produceState, context),
      ).length
      const remaining = Math.max(
        0,
        (getAbilityLimit(ability, 'produce') ?? Infinity) - (used.get(ability) ?? 0),
      )
      count = Math.min(count, remaining)
      cached.set(ability, count)
      // Limits are consumed only for direct gains; irrelevant rate badges must not consume them.
      if (ability.operations.some((op) => op.op === 'add_stat' && op.timing === 'activation'))
        used.set(ability, (used.get(ability) ?? 0) + count)
      if (count > 0) counts[key] = (counts[key] ?? 0) + count
      return count
    }
    const contributions = getCardContributions(
      deck,
      { ...config, postEventEnabledSlots: deck.map(() => false) },
      { normalBaseTotal, spBaseTotal },
      resolver,
    )
    pItemGains.forEach((entry, slot) => {
      const total = entry.gain.vo + entry.gain.da + entry.gain.vi
      if (!contributions[slot] || total <= 0) return
      contributions[slot].total = addStatValues(contributions[slot].total, entry.gain)
      contributions[slot].skillContributions.push({
        skillId: `p-item:${entry.name}`,
        skillName: entry.name,
        skillDescription: `Pアイテム：${entry.name}`,
        gain: entry.gain,
        total,
      })
      addEventGainBreakdowns(
        contributions[slot],
        `p-item:${entry.name}`,
        `Pアイテム：${entry.name}`,
        entry.gain,
        entry.triggerCount,
      )
    })
    if (hasAfterEvent && afterSelection && afterCard && afterOption) {
      afterEvents.add(afterKey)
      eventCounts.supportEvents++
      if (afterOption.kind === 'parameter') {
        const gain = getSelectedSupportEventStatGain(afterCard, afterSelection.eventIndex)
        const total = gain.vo + gain.da + gain.vi
        contributions[afterSelection.slot].total = addStatValues(
          contributions[afterSelection.slot].total,
          gain,
        )
        if (total > 0) {
          contributions[afterSelection.slot].skillContributions.push({
            skillId: `support-after:${afterSelection.eventIndex}`,
            skillName: 'サポートイベント・後',
            skillDescription: afterOption.event.effect,
            gain,
            total,
          })
          addEventGainBreakdowns(
            contributions[afterSelection.slot],
            `support-after:${afterSelection.eventIndex}`,
            `サポートイベント・後（${afterOption.event.unlock}）`,
            gain,
          )
        }
      }
    }
    // Front-event rewards are recorded in this day's contribution and owned state.
    if (hasFrontEvent && frontSlot !== undefined && frontCard && frontReward) {
      frontEvents.add(frontSlot)
      eventCounts.supportEvents++
      const gain = getSelectedSupportEventStatGain(frontCard, 0)
      contributions[frontSlot].total = addStatValues(contributions[frontSlot].total, gain)
      if (gain.vo + gain.da + gain.vi > 0) {
        contributions[frontSlot].skillContributions.push({
          skillId: 'support-front',
          skillName: 'サポートイベント・前',
          skillDescription: `${frontReward.kind === 'p_item' ? 'Pアイテム' : 'スキルカード'}：${frontReward.name}`,
          gain,
          total: gain.vo + gain.da + gain.vi,
        })
        addEventGainBreakdowns(contributions[frontSlot], 'support-front', 'サポートイベント・前', gain)
      }
      if (frontSkillCard) produceState.skillCards.push(frontSkillCard)
    }
    if (hasAfterEvent && afterOption) {
      const target = resolveSupportAfterEventTarget(
        produceState.skillCards,
        afterOption.kind,
        afterSelection?.targetCardId,
        afterOption.event.effect,
      )
      applySupportAfterEventCardMutation(
        produceState,
        afterOption.kind,
        target,
        `changed:${index}`,
        afterSelection?.resultCard,
        idolPlan,
      )
    }
    const directGain = getDeckSkillContributionGain(contributions)
    STATS.forEach((stat) => {
      directGain[stat] = Math.max(0, directGain[stat] - supportRateGain[stat])
    })
    stats = floorAndCapStatValues(addStatValues(stats, directGain), cap)
    contributions.forEach((c, slot) => {
      totals[slot].total = addStatValues(totals[slot].total, c.total)
      c.skillContributions.forEach((skill) => mergeSkillContribution(totals[slot].skillContributions, skill))
      c.effectBreakdowns
        .filter((b) => b.triggerCount > 0)
        .forEach((b) => {
          const existing = totals[slot].effectBreakdowns.find((item) => item.key === b.key)
          if (existing) {
            existing.triggerCount += b.triggerCount
            const previous = Number(existing.totalValueText),
              current = Number(b.totalValueText)
            if (Number.isFinite(previous) && Number.isFinite(current))
              existing.totalValueText = String(previous + current)
          } else totals[slot].effectBreakdowns.push({ ...b })
        })
    })
    const delta = Object.fromEntries(
      STATS.map((stat) => [stat, stats[stat] - before[stat]]),
    ) as unknown as StatValues
    trace.push({
      id: day.id,
      label: day.label,
      action: HIF_ACTION_LABELS[action],
      lessonType: action === 'lesson' ? lessonType : undefined,
      stats: { ...stats },
      gain: delta,
      state: cloneProduceState(produceState),
      contributions,
    })
  })
  const currentCap = progress > 0 && HIF_SCHEDULE[progress - 1].phase === 'final' ? finalCap : 3000
  return {
    statCap: currentCap,
    finalStats: stats,
    contributions: totals,
    abilityCoverage: getAbilityCoverage(deck),
    totalSpRateByStat: aggregate.totalSpRate,
    totalSupportLessonBonusByStat: aggregate.supportLessonBonus,
    totalLessonBonusByStat: aggregate.totalLessonBonus,
    statSourceBreakdown: sources,
    eventCounts,
    ...(complete ? { evaluation: getHifEvaluation(stats, config, produceState.starPower) } : {}),
    simulation: {
      steps: trace,
      triggerCounts: counts,
      complete,
      finalState: cloneProduceState(produceState),
    },
  }
}
