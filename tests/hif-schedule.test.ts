import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HIF_SCHEDULE, createDefaultHifSchedule } from '../src/data/hif-schedule.ts'
import cardsData from '../data/cards.json'
import {
  syncHifSchedule,
  normalizeHifSchedule,
  getHifScheduleColumnIndex,
  getHifScheduleProgress,
  getHifScheduleWindowStart,
  getPendingHifCustomPItemStage,
  setHifEventMode,
} from '../src/lib/hif-schedule.ts'
import { DEFAULT_PRODUCE_CONFIG } from '../src/store/produce-config.ts'
import { simulateHifSchedule } from '../src/lib/calculator/hif-simulation.ts'
import { calculate } from '../src/lib/calculator/index.ts'
import { getParameterSortTriggerSetting } from '../src/lib/support-card-parameter-total.ts'
import { getProduceEventTriggerCounts } from '../src/lib/produce-event-trigger-counts.ts'
import { useAppStore } from '../src/store/index.ts'
import { loadAppInputs, saveAppInputs } from '../src/store/app-inputs.ts'
import { getHifConsultationSkillKindLabel, getHifConsultationSkillTags } from '../src/lib/hif-consultation.ts'
import { HIF_BADGE_STAR_POWER } from '../src/lib/calculator/hif-simulation-state.ts'
import { applyCustomPItemEffect, getCustomPItemEffect } from '../src/lib/calculator/hif-custom-p-item.ts'
import { createInitialProduceState } from '../src/lib/calculator/hif-simulation-state.ts'
import { fillTutorialScheduleRange } from '../src/lib/tutorial-schedule.ts'
import { confirmHifScheduleStep } from '../src/lib/hif-schedule-editor.ts'
import { capHifFinalStarPower } from '../src/lib/calculator/hif-final-rounds.ts'
import type { SupportAbilitySpec } from '../src/types/support-ability.ts'
import type { DeckCard, SupportCard } from '../src/types/card.ts'

function config() {
  const config = structuredClone(DEFAULT_PRODUCE_CONFIG)
  config.idolId = 'test'
  config.idolVersionId = 'test'
  config.idolBaseStats = { vo: 0, da: 0, vi: 0 }
  config.idolLessonBonus = { vo: 0, da: 0, vi: 0 }
  config.hif.parameterBonusLevels = { vo: 0, da: 0, vi: 0 }
  const schedule = createDefaultHifSchedule()
  schedule.customPItem = { color: 'red', mascot: 'girl', decoration: 'flower' }
  schedule.steps.forEach((step, index) => {
    step.action = HIF_SCHEDULE[index].actions[0]
    step.lessonType = 'sp'
    if (step.action === 'outing')
      step.outing.skillCards = [
        { category: 'active', skillKind: 'other', preservation: false, energy: false, rarity: 'R' },
        { category: 'active', skillKind: 'other', preservation: false, energy: false, rarity: 'R' },
      ]
  })
  config.hif = syncHifSchedule(config.hif, schedule)
  return config
}
function ability(event: SupportAbilitySpec['activation']['event'] = 'lesson_end'): SupportAbilitySpec {
  return {
    schemaVersion: 2,
    source: { templateId: 'lesson_end.add_stat', parserVersion: 2 },
    activation: { event, lessonKind: 'sp' },
    operations: [
      { op: 'add_stat', stat: 'vo', timing: 'activation', amount: { kind: 'literal', value: 10 } },
    ],
  }
}
function deck(spec: SupportAbilitySpec): DeckCard[] {
  return [
    {
      card: {
        id: 'test-card',
        name: 'テスト',
        rarity: 'SSR',
        type: 'vocal',
        maxLevel: 60,
        plan: 'free',
        source: 'manual',
        updatedAt: '2026-09-18',
        skills: [{ id: 'test-skill', name: 'test', description: 'test', unlockLevel: 1, ability: spec }],
      },
      level: 60,
      isRental: false,
    },
  ]
}

test('tutorial autofill preserves the selected custom-item color and touches only its requested days', () => {
  const schedule = createDefaultHifSchedule()
  schedule.customPItem.color = 'red'
  const first = fillTutorialScheduleRange(schedule, 1, 6, () => 0)
  assert.equal(first.steps[0].action, null)
  assert.equal(first.steps[6].action, null)
  assert.ok(first.steps.slice(1, 6).every((step) => step.action !== null))
  assert.equal(first.customPItem.color, 'red')
  const second = fillTutorialScheduleRange(first, 7, 13, () => 0)
  assert.equal(second.customPItem.color, 'red')
  assert.ok(second.customPItem.mascot)
  assert.equal(schedule.customPItem.mascot, null)
  const later = fillTutorialScheduleRange(second, 13, 26, () => 0)
  assert.equal(later.customPItem.color, 'red')
  assert.equal(later.customPItem.mascot, second.customPItem.mascot)
  assert.ok(later.customPItem.decoration)
})
test('tutorial autofill never chooses rest', () => {
  const filled = fillTutorialScheduleRange(createDefaultHifSchedule(), 0, HIF_SCHEDULE.length, () => 0.999999)
  assert.ok(filled.steps.every((step) => step.action !== 'rest'))
  assert.ok(
    filled.steps
      .filter((step) => step.action === 'outing')
      .every((step) => step.outing.skillCards.every(Boolean)),
  )
})

test('tutorial fills days 3–6 without replacing the manually configured day 2 lesson', () => {
  const schedule = createDefaultHifSchedule()
  schedule.steps[0].action = 'consultation'
  schedule.steps[1].action = 'lesson'
  schedule.steps[1].param = 'visual'
  schedule.steps[1].subParam = 'vocal'
  schedule.steps[1].lessonType = 'sp'
  const filled = fillTutorialScheduleRange(schedule, 2, 6, () => 0)
  assert.deepEqual(filled.steps.slice(0, 2), schedule.steps.slice(0, 2))
  assert.ok(filled.steps.slice(2, 6).every((step) => step.action !== null))
  assert.equal(filled.steps[6].action, null)
})

test('outing remains unconfirmed until every card in the selected reward is configured', () => {
  const schedule = createDefaultHifSchedule()
  schedule.steps.slice(0, 4).forEach((step, index) => {
    step.action = HIF_SCHEDULE[index].actions[0]
  })
  schedule.steps[4].action = 'outing'
  assert.equal(getHifScheduleProgress(schedule), 4)
  assert.deepEqual(normalizeHifSchedule(schedule).steps[4].outing.skillCards, [null, null])
  schedule.steps[4].outing.skillCards[0] = {
    category: 'active',
    skillKind: 'other',
    preservation: false,
    energy: false,
    rarity: 'R',
  }
  assert.equal(getHifScheduleProgress(schedule), 4)
  schedule.steps[4].outing.reward = 'one_card'
  assert.equal(getHifScheduleProgress(schedule), 5)
  schedule.steps[4].outing.reward = 'two_cards'
  assert.equal(getHifScheduleProgress(schedule), 4)
  schedule.steps[4].outing.skillCards[1] = {
    category: 'mental',
    skillKind: 'type_a',
    preservation: false,
    energy: false,
    rarity: 'SR',
  }
  assert.equal(getHifScheduleProgress(schedule), 5)
})

test('confirming a support event clears later duplicates but keeps earlier selections', () => {
  const schedule = createDefaultHifSchedule()
  schedule.steps[0].pItemSlots = [1]
  schedule.steps[0].postEventSelection = { slot: 2, eventIndex: 1 }
  schedule.steps[1].pItemSlots = [1]
  schedule.steps[1].postEventSelection = { slot: 2, eventIndex: 1 }
  schedule.steps[2].pItemSlots = [1, 3]
  schedule.steps[2].postEventSelection = { slot: 2, eventIndex: 1 }
  const next = confirmHifScheduleStep(schedule, 1, schedule.steps[1], 'event')
  assert.deepEqual(next.steps[0].pItemSlots, [1])
  assert.deepEqual(next.steps[2].pItemSlots, [3])
  assert.equal(next.steps[2].postEventSelection, null)
  assert.deepEqual(schedule.steps[2].pItemSlots, [1, 3])
})

test('Wiki timeline has 20 selection days, 6 final days and round1 -> interval -> round2, with actual choices', () => {
  assert.equal(HIF_SCHEDULE.length, 29)
  assert.deepEqual(
    HIF_SCHEDULE.filter((d) => d.phase === 'selection').map((d) => d.day),
    Array.from({ length: 20 }, (_, i) => i + 1),
  )
  assert.deepEqual(
    HIF_SCHEDULE.slice(-3).map((d) => d.id),
    ['round1', 'interval', 'round2'],
  )
  assert.deepEqual(
    HIF_SCHEDULE.filter((d) => d.examIndex !== undefined).map((d) => d.day),
    [7, 13, 20],
  )
  assert.deepEqual(
    HIF_SCHEDULE.filter((d) => d.lessonIndex !== undefined).map((d) => d.label),
    [
      '選抜2日目',
      '選抜4日目',
      '選抜9日目',
      '選抜11日目',
      '選抜15日目',
      '選抜18日目',
      '本戦2日目',
      '本戦5日目',
    ],
  )
  assert.ok(HIF_SCHEDULE[18].actions.includes('training'))
  assert.deepEqual(HIF_SCHEDULE[22].actions, ['outing', 'supply', 'rest'])
})
test('schedule viewport shows two columns and follows the active column by complete pages', () => {
  assert.deepEqual(
    [0, 6, 7, 12, 13, 19, 20, 28, 29].map(getHifScheduleColumnIndex),
    [0, 0, 1, 1, 2, 2, 3, 3, 3],
  )
  assert.equal(getHifScheduleWindowStart(0, 0), 0)
  assert.equal(getHifScheduleWindowStart(1, 0), 0)
  assert.equal(getHifScheduleWindowStart(2, 0), 2)
  assert.equal(getHifScheduleWindowStart(3, 1), 2)
  assert.equal(getHifScheduleWindowStart(1, 2), 0)
  assert.equal(getHifScheduleWindowStart(2, 1), 2)
})
test('progress accepts only a valid confirmed prefix and rejects impossible actions and incomplete lesson axes', () => {
  const schedule = createDefaultHifSchedule()
  schedule.steps[1].action = 'lesson'
  assert.equal(getHifScheduleProgress(schedule), 0)
  schedule.steps[0].action = 'consultation'
  assert.equal(getHifScheduleProgress(schedule), 2)
  schedule.steps[1].subParam = null
  assert.equal(getHifScheduleProgress(schedule), 1)
  assert.equal(normalizeHifSchedule({ steps: [{ action: 'lesson' }] }).steps[0].action, null)
  const partial = simulateHifSchedule([], { ...config(), hif: { ...config().hif, schedule } })
  assert.equal(partial.simulation!.steps.length, 1)
  assert.equal(partial.simulation!.complete, false)
  assert.equal(partial.evaluation, undefined)
  assert.equal(partial.simulation!.finalState.pDrinkCount, 0)
  assert.equal(partial.simulation!.finalState.starPower, 0)
  assert.equal(partial.simulation!.finalState.hifBadgeTriggerCount, 0)
  assert.deepEqual(partial.simulation!.finalState.pItems, ['H.I.Fワッペン'])
  assert.equal(partial.simulation!.finalState.skillCards.length, 8)
})
test('custom P item choices gate the next real day without adding days to the schedule', () => {
  const schedule = createDefaultHifSchedule()
  schedule.steps.forEach((step, index) => {
    step.action = HIF_SCHEDULE[index].actions[0]
    if (step.action === 'outing')
      step.outing.skillCards = [
        { category: 'active', skillKind: 'other', preservation: false, energy: false, rarity: 'R' },
        { category: 'active', skillKind: 'other', preservation: false, energy: false, rarity: 'R' },
      ]
  })
  assert.equal(getHifScheduleProgress(schedule), 7)
  assert.equal(getPendingHifCustomPItemStage(schedule), 1)
  assert.equal(getHifScheduleColumnIndex(getHifScheduleProgress(schedule) - 1), 0)
  schedule.customPItem.color = 'yellow'
  assert.equal(getHifScheduleProgress(schedule), 13)
  assert.equal(getPendingHifCustomPItemStage(schedule), 2)
  assert.equal(getHifScheduleColumnIndex(getHifScheduleProgress(schedule) - 1), 1)
  schedule.customPItem.mascot = 'robo'
  assert.equal(getHifScheduleProgress(schedule), 20)
  assert.equal(getPendingHifCustomPItemStage(schedule), 3)
  assert.equal(getHifScheduleColumnIndex(getHifScheduleProgress(schedule) - 1), 2)
  schedule.customPItem.decoration = 'flower'
  assert.equal(getHifScheduleProgress(schedule), 29)
  assert.equal(getPendingHifCustomPItemStage(schedule), null)
  assert.equal(schedule.steps.length, 29)
  assert.deepEqual(
    normalizeHifSchedule({
      ...schedule,
      customPItem: { color: 'red', mascot: 'rabbit', decoration: 'medal' },
    }).customPItem,
    { color: 'red', mascot: null, decoration: null },
  )
  assert.deepEqual(
    normalizeHifSchedule({
      ...schedule,
      customPItem: { color: 'yellow', mascot: 'robo', decoration: 'medal' },
    }).customPItem,
    { color: 'yellow', mascot: 'robo', decoration: null },
  )
})
test('custom P item upgrades replace the owned item and later lesson drinks follow each stage limit', () => {
  const baseline = config()
  const yellow = config()
  yellow.hif.schedule!.customPItem = { color: 'yellow', mascot: 'robo', decoration: 'flower' }
  const baseResult = simulateHifSchedule([], baseline)
  const result = simulateHifSchedule([], yellow)
  assert.equal(result.simulation!.steps.length, 29)
  assert.equal(result.simulation!.finalState.pDrinkCount - baseResult.simulation!.finalState.pDrinkCount, 10)
  assert.equal(result.simulation!.steps[6].state.pItems.length, 2)
  assert.match(result.simulation!.steps[6].state.pItems[1], /ポーチ（黄）/)
  assert.match(result.simulation!.steps[12].state.pItems[1], /ロボ/)
  assert.match(result.simulation!.steps[19].state.pItems[1], /花ロボ/)
  assert.equal(result.simulation!.finalState.pItems.length, 2)
})
test('a wing lesson item gains one card only once after the third selection exam', () => {
  const flower = config()
  flower.hif.schedule!.customPItem = { color: 'red', mascot: 'bear', decoration: 'flower' }
  const wing = config()
  wing.hif.schedule!.customPItem = { color: 'red', mascot: 'bear', decoration: 'wing' }
  const before = simulateHifSchedule([], flower).simulation!.finalState
  const after = simulateHifSchedule([], wing).simulation!.finalState
  assert.equal(after.skillCards.length - before.skillCards.length, 1)
  assert.equal(after.hifBadgeTriggerCount - before.hifBadgeTriggerCount, 1)
})
test('red custom P items record recovery only when their route and limit trigger', () => {
  const red = { color: 'red', mascot: 'bear', decoration: 'wing' } as const
  assert.equal(getCustomPItemEffect(red, 1)?.staminaRecovery, 6)
  assert.equal(getCustomPItemEffect(red, 2)?.staminaRecovery, 6)
  assert.equal(getCustomPItemEffect(red, 3)?.staminaRecovery, 12)
  assert.equal(
    getCustomPItemEffect({ color: 'red', mascot: 'girl', decoration: 'flower' }, 2)?.staminaRecovery,
    12,
  )
  assert.equal(
    getCustomPItemEffect({ color: 'red', mascot: 'robo', decoration: 'medal' }, 3)?.staminaRecovery,
    6,
  )
  assert.equal(
    getCustomPItemEffect({ color: 'red', mascot: 'robo', decoration: 'flower' }, 3)?.staminaRecovery,
    12,
  )
  assert.equal(
    getCustomPItemEffect({ color: 'yellow', mascot: 'robo', decoration: 'flower' }, 3)?.staminaRecovery,
    0,
  )
  const state = createInitialProduceState(config()).snapshot
  assert.equal(applyCustomPItemEffect(red, 1, 'lesson', state, 7, 0).triggered, true)
  assert.equal(applyCustomPItemEffect(red, 1, 'rest', state, 8, 1).triggered, false)
  assert.equal(applyCustomPItemEffect(red, 1, 'lesson', state, 9, 1).triggered, true)
  assert.equal(applyCustomPItemEffect(red, 1, 'lesson', state, 10, 2).triggered, false)
  assert.equal(applyCustomPItemEffect(red, 3, 'lesson', state, 21, 0).triggered, true)
  assert.equal(applyCustomPItemEffect(red, 3, 'lesson', state, 22, 1).triggered, false)
  assert.equal(state.customPItemStaminaRecovery, 24)
})
test('custom P item card choices preserve a selected target and gained-card properties', () => {
  const settings = {
    targetCardId: 'basic:2',
    resultCard: {
      category: 'mental' as const,
      rarity: 'SSR' as const,
      skillKind: 'type_a_b' as const,
      energy: true,
      preservation: true,
    },
  }
  const state = createInitialProduceState(config()).snapshot
  const gained = applyCustomPItemEffect(
    { color: 'red', mascot: 'bear', decoration: 'wing' },
    3,
    'lesson',
    state,
    21,
    0,
    settings,
    'anomaly',
  )
  assert.equal(gained.triggered, true)
  assert.equal(gained.contexts[0].event, 'skill_card_gained')
  assert.equal(state.skillCards.at(-1)?.rarity, 'SSR')
  assert.equal(state.skillCards.at(-1)?.category, 'mental')
  assert.deepEqual(state.skillCards.at(-1)?.effectTags, ['aggressive', 'fullPower', 'preservation', 'energy'])
  const deleted = applyCustomPItemEffect(
    { color: 'red', mascot: 'moja', decoration: 'wing' },
    3,
    'outing',
    state,
    22,
    0,
    settings,
    'anomaly',
  )
  assert.equal(deleted.triggered, true)
  assert.equal(deleted.contexts[0].skillCard?.id, 'basic:2')
  assert.equal(
    state.skillCards.some((card) => card.id === 'basic:2'),
    false,
  )
  const saved = normalizeHifSchedule({ steps: [{ customPItemCard: settings }] })
  assert.deepEqual(saved.steps[0].customPItemCard, settings)
})
test('a specified custom-item reward triggers matching SSR support effects and sort counts', () => {
  const c = config()
  c.hif.schedule!.customPItem = { color: 'red', mascot: 'bear', decoration: 'wing' }
  const spec = ability('skill_card_gained')
  spec.activation = { event: 'skill_card_gained' }
  spec.predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } }
  const baseline = simulateHifSchedule(deck(spec), c)
  const initialCounts = getProduceEventTriggerCounts(c)
  c.hif.schedule!.steps[21].customPItemCard.resultCard = {
    category: 'mental',
    rarity: 'SSR',
    skillKind: 'type_a',
    energy: false,
    preservation: false,
  }
  const specified = simulateHifSchedule(deck(spec), c)
  const specifiedCounts = getProduceEventTriggerCounts(c)
  assert.equal(specified.contributions[0].total.vo - baseline.contributions[0].total.vo, 10)
  assert.equal(specifiedCounts['skill_card_gained:SSR'] - initialCounts['skill_card_gained:SSR'], 1)
})
test('a custom item can change the skill card gained by the same supply action', () => {
  const c = config()
  c.hif.schedule!.customPItem = { color: 'red', mascot: 'robo', decoration: 'medal' }
  c.hif.schedule!.steps[22].action = 'supply'
  c.hif.schedule!.steps[22].supplySkillCard.upgraded = true
  c.hif.schedule!.steps[22].customPItemCard = {
    targetCardId: 'supply:22:0',
    resultCard: {
      category: 'mental',
      rarity: 'SSR',
      skillKind: 'type_a',
      energy: false,
      preservation: false,
    },
  }
  const cards = simulateHifSchedule([], c).simulation!.steps[22].state.skillCards
  assert.equal(
    cards.some((card) => card.id === 'supply:22:0'),
    false,
  )
  assert.equal(cards.filter((card) => card.id === 'custom-item-changed:22').length, 1)
  assert.equal(cards.find((card) => card.id === 'custom-item-changed:22')?.rarity, 'SSR')
  assert.equal(cards.find((card) => card.id === 'custom-item-changed:22')?.upgraded, true)
})
test('acquisition choices retain their upgraded state and change inherits its source state', () => {
  const c = config()
  c.hif.carryoverSkillCards[0] = {
    enabled: true,
    acquireOnDayOne: true,
    rarity: 'SR',
    category: 'active',
    skillKind: 'other',
    energy: false,
    upgraded: true,
  }
  c.hif.schedule!.steps[0].consultation.skillActions = [
    { kind: 'gain', category: 'active', skillKind: 'other', energy: false, rarity: 'R', upgraded: true },
  ]
  c.hif.schedule!.steps[2].classSettings.selection.upgraded = true
  c.hif.schedule!.steps[5].classSettings.selection.upgraded = true
  c.hif.schedule!.steps[4].outing.skillCards[0]!.upgraded = true
  c.hif.schedule!.steps[7].action = 'supply'
  c.hif.schedule!.steps[7].supplySkillCard.upgraded = true
  c.hif.schedule!.steps[27].interval.skillActions = [
    { kind: 'gain', category: 'active', skillKind: 'other', energy: false, rarity: 'R', upgraded: true },
    {
      kind: 'change',
      category: 'active',
      skillKind: 'other',
      energy: false,
      rarity: 'R',
      targetCardId: 'interval:27:0',
      resultCard: { category: 'mental', skillKind: 'other', energy: false, rarity: 'SR', upgraded: false },
    },
  ]
  const result = simulateHifSchedule([], c)
  for (const [step, id] of [
    [0, 'memory:0'],
    [0, 'consultation:0:0'],
    [4, 'outing:4:0'],
    [7, 'supply:7:0'],
    [27, 'interval-changed:27:1'],
  ] as const) {
    assert.equal(
      result.simulation!.steps[step].state.skillCards.find((card) => card.id === id)?.upgraded,
      true,
      id,
    )
  }
  assert.equal(
    result.simulation!.steps[2].state.skillCards.find((card) => card.id === 'class-selection:2')?.upgraded,
    false,
  )
  assert.equal(
    result.simulation!.steps[5].state.skillCards.find((card) => card.id === 'class-selection:5')?.upgraded,
    false,
  )
  assert.equal(
    result.simulation!.steps[4].state.skillCards.find((card) => card.id === 'outing:4:1')?.upgraded,
    false,
  )
  const saved = normalizeHifSchedule(c.hif.schedule)
  assert.equal(saved.steps[0].consultation.skillActions[0].upgraded, true)
  assert.equal(saved.steps[2].classSettings.selection.upgraded, false)
  assert.equal(saved.steps[5].classSettings.selection.upgraded, false)
  assert.equal(saved.steps[4].outing.skillCards[0]!.upgraded, true)
  assert.equal(saved.steps[7].supplySkillCard.upgraded, true)
  assert.equal(saved.steps[27].interval.skillActions[0].upgraded, true)
})
test('a normal custom-item card gain can be marked upgraded', () => {
  const state = createInitialProduceState(config()).snapshot
  const result = applyCustomPItemEffect(
    { color: 'red', mascot: 'robo', decoration: 'ribbon' },
    3,
    'supply',
    state,
    22,
    0,
    {
      targetCardId: null,
      resultCard: { category: 'mental', rarity: 'SR', skillKind: 'other', energy: false, upgraded: true },
    },
    'sense',
  )
  assert.equal(result.triggered, true)
  assert.equal(state.skillCards.at(-1)?.upgraded, true)
})
test('carryover cards are gained on day 1 or selection day 7 according to their setting', () => {
  const c = config()
  c.hif.carryoverSkillCards[0] = {
    enabled: true,
    acquireOnDayOne: true,
    rarity: 'SR',
    category: 'active',
    skillKind: 'type_b',
    energy: true,
  }
  c.hif.carryoverSkillCards[1] = {
    enabled: true,
    acquireOnDayOne: false,
    rarity: 'SSR',
    category: 'mental',
    skillKind: 'type_a',
    energy: false,
  }
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  for (let index = 0; index < 6; index++) c.hif.schedule!.steps[index].action = 'rest'
  c.hif.schedule!.steps[6].action = 'exam'
  const result = simulateHifSchedule([], c)
  assert.deepEqual(
    result.simulation!.steps[0].state.skillCards.find((card) => card.id === 'memory:0'),
    {
      id: 'memory:0',
      name: '持ち込みスキルカード1',
      source: 'memory',
      rarity: 'SR',
      category: 'active',
      effectTags: ['concentration', 'energy'],
      upgraded: false,
    },
  )
  assert.equal(result.simulation!.steps[0].state.skillCards.length, 9)
  assert.equal(result.simulation!.steps[5].state.skillCards.length, 9)
  assert.deepEqual(
    result.simulation!.steps[6].state.skillCards.find((card) => card.id === 'memory:1'),
    {
      id: 'memory:1',
      name: '持ち込みスキルカード2',
      source: 'memory',
      rarity: 'SSR',
      category: 'mental',
      effectTags: ['goodCondition'],
      upgraded: false,
    },
  )
  assert.equal(result.simulation!.finalState.skillCards.length, 10)
  assert.equal(result.simulation!.finalState.hifBadgeTriggerCount, 2)
})
test('only selection exams 1 and 2 remove the selected basic cards', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step, index) => {
    step.action = index < 20 ? (HIF_SCHEDULE[index].actions[0] === 'exam' ? 'exam' : 'rest') : null
  })
  c.hif.selectionExams[0].deletedBasicCardIds = ['basic:0', 'basic:1']
  c.hif.selectionExams[1].deletedBasicCardIds = ['basic:2', 'basic:3']
  c.hif.selectionExams[2].deletedBasicCardIds = ['basic:4', 'basic:5']
  const result = simulateHifSchedule([], c)
  const basicIdsAt = (index: number) =>
    result
      .simulation!.steps[index].state.skillCards.filter((card) => card.source === 'basic')
      .map((card) => card.id)
  assert.deepEqual(basicIdsAt(6), ['basic:2', 'basic:3', 'basic:4', 'basic:5', 'basic:6'])
  assert.deepEqual(basicIdsAt(12), ['basic:4', 'basic:5', 'basic:6'])
  assert.deepEqual(basicIdsAt(19), ['basic:4', 'basic:5', 'basic:6'])
})
test('manual SP route executes exactly 29 steps and only selected lessons/classes contribute to final evaluation', () => {
  const c = config()
  const result = simulateHifSchedule([], c)
  assert.equal(result.simulation!.steps.length, 29)
  assert.deepEqual(result.eventCounts, { normalLessons: 0, spLessons: 8, supportEvents: 0, exams: 5 })
  assert.equal(result.finalStats.vo + result.finalStats.da + result.finalStats.vi, 1140 + 900 + 1100)
  assert.equal(result.evaluation!.statsScore, 2 * (1140 + 900 + 1100))
  assert.equal(result.simulation!.finalState.starPower, 1213)
  assert.equal(result.simulation!.finalState.hifBadgeTriggerCount, 12)
  assert.equal(result.evaluation!.starPowerScore, 9097)
  assert.deepEqual(calculate([], c), result)
  c.hif.schedule!.steps[1].action = 'rest'
  c.hif.schedule!.steps[2].action = 'rest'
  const reduced = simulateHifSchedule([], c)
  assert.equal(reduced.eventCounts.spLessons, 7)
  assert.equal(
    reduced.finalStats.vo + reduced.finalStats.da + reduced.finalStats.vi,
    1140 + 900 + 1100 - 80 - 120,
  )
})
test('H.I.F badge has a base gain of 10, applies the affinity bonus per card, and stops after 20 activations', () => {
  assert.equal(HIF_BADGE_STAR_POWER, 10)
  const c = config()
  c.hif.carryoverSkillCards[0] = {
    enabled: true,
    acquireOnDayOne: true,
    rarity: 'R',
    category: 'active',
    skillKind: 'other',
    energy: false,
  }
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'consultation'
  c.hif.schedule!.steps[0].consultation.skillActions = Array.from({ length: 25 }, () => ({
    kind: 'gain' as const,
    category: 'active' as const,
    skillKind: 'other' as const,
    energy: false,
    rarity: 'R' as const,
  }))
  const result = simulateHifSchedule([], c)
  assert.equal(result.simulation!.finalState.hifBadgeTriggerCount, 20)
  assert.equal(result.simulation!.finalState.starPower, 300)
  assert.equal(result.simulation!.finalState.skillCards.length, 34)
  c.hif.starPowerAffinityBonus = false
  const withoutAffinityBonus = simulateHifSchedule([], c)
  assert.equal(withoutAffinityBonus.simulation!.finalState.starPower, 200)
})

test('public lessons apply the affinity bonus to each star-power gain', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'rest'
  c.hif.schedule!.steps[1].action = 'lesson'
  c.hif.schedule!.steps[1].lessonType = 'normal'
  c.hif.schedule!.steps[2].action = 'rest'
  c.hif.schedule!.steps[3].action = 'lesson'
  c.hif.schedule!.steps[3].lessonType = 'sp'
  const result = simulateHifSchedule([], c)
  assert.equal(result.simulation!.steps[1].state.starPower, 30)
  assert.equal(result.simulation!.steps[3].state.starPower, 45)
  c.hif.starPowerAffinityBonus = false
  const withoutAffinityBonus = simulateHifSchedule([], c)
  assert.equal(withoutAffinityBonus.simulation!.steps[1].state.starPower, 20)
  assert.equal(withoutAffinityBonus.simulation!.steps[3].state.starPower, 30)
})
test('selection-exam star power receives the affinity bonus and floors a fractional result', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  for (let index = 0; index < 6; index++) c.hif.schedule!.steps[index].action = 'rest'
  c.hif.schedule!.steps[6].action = 'exam'
  c.hif.selectionExams[0] = { ...c.hif.selectionExams[0], useScoreCap: false, totalScore: 3001 }
  assert.equal(simulateHifSchedule([], c).simulation!.finalState.starPower, 31)
  c.hif.starPowerAffinityBonus = false
  assert.equal(simulateHifSchedule([], c).simulation!.finalState.starPower, 21)
})
test('selection exam 3 awards 163 stars at 389,982 score with the affinity bonus', () => {
  const c = config()
  c.hif.selectionExams[2] = { ...c.hif.selectionExams[2], useScoreCap: false, totalScore: 389982 }
  let steps = simulateHifSchedule([], c).simulation!.steps
  assert.equal(steps[19].state.starPower - steps[18].state.starPower, 163)
  c.hif.starPowerAffinityBonus = false
  steps = simulateHifSchedule([], c).simulation!.steps
  assert.equal(steps[19].state.starPower - steps[18].state.starPower, 109)
})
test('final rounds add score-derived star power at their scheduled positions', () => {
  const c = config()
  c.hif.selectionExams = c.hif.selectionExams.map((exam) => ({ ...exam, useScoreCap: false, totalScore: 0 }))
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  for (let index = 0; index <= 26; index++)
    c.hif.schedule!.steps[index].action = HIF_SCHEDULE[index].actions.includes('rest')
      ? 'rest'
      : HIF_SCHEDULE[index].actions[0]
  c.hif.schedule!.steps[26].action = 'round1'
  let result = simulateHifSchedule([], c)
  assert.equal(result.simulation!.finalState.starPower, 180)
  c.hif.schedule!.steps[27].action = 'interval'
  c.hif.schedule!.steps[28].action = 'round2'
  result = simulateHifSchedule([], c)
  assert.equal(result.simulation!.finalState.starPower, 405)
  c.hif.starPowerAffinityBonus = false
  assert.equal(simulateHifSchedule([], c).simulation!.finalState.starPower, 270)
})
test('round 2 caps final star power at 1335 without clipping the preceding state', () => {
  assert.equal(capHifFinalStarPower(1400), 1335)
  assert.equal(capHifFinalStarPower(1200), 1200)
  const c = config()
  c.hif.selectionExams[2] = { ...c.hif.selectionExams[2], useScoreCap: false, totalScore: 390910 }
  c.hif.schedule!.steps[27].interval.skillActions = Array.from({ length: 8 }, () => ({
    kind: 'gain' as const,
    category: 'active' as const,
    skillKind: 'other' as const,
    preservation: false,
    energy: false,
    rarity: 'R' as const,
  }))
  const completed = simulateHifSchedule([], c)
  assert.equal(completed.simulation!.finalState.starPower, 1335)
  assert.equal(completed.evaluation!.starPowerScore, 10012)
})
test('selection overflow is discarded at 3000 and is not recovered by the later final-stage cap increase', () => {
  const c = config()
  c.idolBaseStats = { vo: 2990, da: 0, vi: 0 }
  c.hif.selectionExams = c.hif.selectionExams.map((e) => ({ ...e, useScoreCap: false, totalScore: 0 }))
  c.hif.schedule!.steps.forEach((s, i) => {
    if (HIF_SCHEDULE[i].actions.includes('rest')) s.action = 'rest'
  })
  c.hif.schedule!.steps[1].action = 'lesson'
  c.hif.schedule!.steps[20].action = 'class'
  c.hif.schedule!.steps[20].param = 'dance'
  const result = simulateHifSchedule([], c)
  assert.equal(result.simulation!.steps[1].stats.vo, 3000)
  assert.equal(result.simulation!.steps[1].gain.vo, 10)
  assert.equal(result.finalStats.vo, 3000)
  assert.equal(result.finalStats.da, 20 + 180)
  assert.equal(result.statCap, 3200)
})
test('stat conditions are checked at each event and limits are shared across all days without badge double consumption', () => {
  const c = config()
  const spec = ability()
  spec.predicate = { type: 'condition', condition: { type: 'stat_gte', stat: 'vo', value: 70 } }
  spec.limits = [{ scope: 'produce', max: 3 }]
  const result = simulateHifSchedule(deck(spec), c)
  assert.equal(result.simulation!.steps[1].gain.vo, 60)
  assert.equal(result.simulation!.steps[3].gain.vo, 90)
  assert.equal(result.simulation!.steps[1].contributions[0].total.vo, 0)
  assert.equal(result.simulation!.steps[3].contributions[0].total.vo, 10)
  assert.equal(result.contributions[0].skillContributions[0].gain.vo, 30)
  assert.equal(result.simulation!.triggerCounts[getParameterSortTriggerSetting(spec).key], 3)
  spec.predicate = { type: 'condition', condition: { type: 'stat_gte', stat: 'vi', value: 70 } }
  const visual = simulateHifSchedule(deck(spec), c)
  assert.equal(visual.simulation!.steps[3].gain.vo, 80)
  assert.equal(visual.simulation!.steps[8].gain.vo, 80)
  assert.equal(visual.simulation!.steps[14].gain.vo, 110)
})
test('conditions the simulator cannot evaluate do not activate', () => {
  const c = config()
  const spec = ability()
  spec.predicate = {
    type: 'all',
    predicates: [
      { type: 'condition', condition: { type: 'owned_skill_cards_gte', value: 99 } },
      { type: 'condition', condition: { type: 'stat_gte', stat: 'vo', value: 70 } },
    ],
  }
  assert.equal(simulateHifSchedule(deck(spec), c).contributions[0].total.vo, 0)
  spec.predicate = {
    type: 'not',
    predicate: { type: 'condition', condition: { type: 'card_name_contains', value: '基本' } },
  }
  assert.equal(simulateHifSchedule(deck(spec), config()).contributions[0].total.vo, 0)
})
test('end-of-lesson stat predicates see support lesson bonuses, which are applied exactly once', () => {
  const c = config()
  const spec = ability()
  spec.predicate = { type: 'condition', condition: { type: 'stat_gte', stat: 'vo', value: 70 } }
  spec.limits = [{ scope: 'produce', max: 1 }]
  const dc = deck(spec)
  dc[0].card.skills.push({
    id: 'lesson-bonus',
    name: 'bonus',
    description: 'Vo+20%',
    unlockLevel: 1,
    ability: {
      ...ability('static'),
      operations: [{ op: 'add_lesson_bonus', target: 'vocal', amount: { kind: 'literal', value: 20 } }],
    },
  })
  const result = simulateHifSchedule(dc, c)
  assert.equal(result.simulation!.steps[1].gain.vo, 82)
  assert.equal(
    result.contributions[0].skillContributions.find((s) => s.skillId === 'test-skill')!.gain.vo,
    10,
  )
  assert.equal(
    result.simulation!.steps[1].contributions[0].skillContributions.find((s) => s.skillId === 'lesson-bonus')!
      .lessonBonusGain?.vo,
    12,
  )
  const dayBreakdown = result.simulation!.steps[1].contributions[0].effectBreakdowns.find(
    (item) => item.key === 'lb:lesson-bonus:vo',
  )!
  assert.equal(dayBreakdown.triggerCount, 1)
  assert.equal(Number(dayBreakdown.totalValueText), 12)
  const dailyLessonBonus = result.simulation!.steps.reduce(
    (sum, step) =>
      sum +
      (step.contributions[0].skillContributions.find((s) => s.skillId === 'lesson-bonus')?.lessonBonusGain
        ?.vo ?? 0),
    0,
  )
  assert.equal(
    result.contributions[0].skillContributions.find((s) => s.skillId === 'lesson-bonus')!.lessonBonusGain?.vo,
    dailyLessonBonus,
  )
  const totalBreakdown = result.contributions[0].effectBreakdowns.find(
    (item) => item.key === 'lb:lesson-bonus:vo',
  )!
  assert.ok(Math.abs(Number(totalBreakdown.totalValueText) - dailyLessonBonus) < 1e-8)
  assert.equal(
    totalBreakdown.triggerCount,
    result.simulation!.steps.filter((step) =>
      step.contributions[0].effectBreakdowns.some((item) => item.key === 'lb:lesson-bonus:vo'),
    ).length,
  )
})
test('P items are inactive before acquisition, active on the acquisition day, and respect their produce limit', () => {
  const c = config()
  const spec = ability()
  spec.limits = [{ scope: 'produce', max: 2 }]
  const dc = deck({ ...ability(), operations: [] })
  dc[0].card.supportEventRewards = [
    { kind: 'p_item', name: 'test-item', effect: 'SPレッスン終了時、Vo+10', parameterAbility: spec },
  ]
  c.hif.schedule!.steps[3].pItemSlots = [0]
  c.hif.includePItems = true
  const result = simulateHifSchedule(dc, c)
  assert.equal(result.simulation!.steps[1].gain.vo, 60)
  assert.equal(result.simulation!.steps[3].gain.vo, 90)
  assert.equal(result.simulation!.steps[8].gain.vo, 90)
  assert.equal(result.contributions[0].total.vo, 20)
  const itemBreakdown = result.contributions[0].effectBreakdowns.find(
    (item) => item.key === 'p-item:test-item:vo',
  )!
  assert.equal(itemBreakdown.label, 'Pアイテム：test-item')
  assert.equal(itemBreakdown.triggerCount, 2)
  assert.equal(Number(itemBreakdown.totalValueText), 20)
  assert.equal(
    Number(
      result.simulation!.steps[3].contributions[0].effectBreakdowns.find(
        (item) => item.key === 'p-item:test-item:vo',
      )!.totalValueText,
    ),
    10,
  )
  assert.equal(
    Number(
      result.simulation!.steps[8].contributions[0].effectBreakdowns.find(
        (item) => item.key === 'p-item:test-item:vo',
      )!.totalValueText,
    ),
    10,
  )
  c.hif.includePItems = false
  assert.equal(simulateHifSchedule(dc, c).contributions[0].total.vo, 20)
})
test('an acquired P item adds P drinks on later matching lessons and emits drink-gained events', () => {
  const c = config()
  c.hif.schedule!.steps[2].action = null
  c.hif.schedule!.steps[1].param = 'dance'
  c.hif.schedule!.steps[1].subParam = 'vocal'
  const dc = deck(ability('drink_gained'))
  dc[0].card.supportEventRewards = [
    {
      kind: 'p_item',
      name: 'ふわふわでもこもこ',
      effect: 'ダンスSPレッスン終了時、ランダムなPドリンクを2つ獲得',
      parameterAbility: {
        schemaVersion: 2,
        source: { templateId: 'p_item.add_resource', parserVersion: 2 },
        activation: { event: 'lesson_end', lessonKind: 'sp', lessonParam: 'dance' },
        operations: [{ op: 'add_p_drink', amount: { kind: 'literal', value: 2 } }],
      },
    },
  ]
  c.hif.schedule!.steps[0].pItemSlots = [0]
  const result = simulateHifSchedule(dc, c)
  assert.equal(result.simulation!.steps.length, 2)
  assert.equal(result.simulation!.finalState.pDrinkCount, 2)
  assert.ok(result.simulation!.finalState.pItems.includes('ふわふわでもこもこ'))
  assert.equal(result.contributions[0].total.vo, 20)
  assert.equal(result.simulation!.steps[1].contributions[0].total.vo, 20)
})
test('ほっこりまんぷく grants one drink for a 好調 card at Da 200 or higher', () => {
  const c = config()
  c.idolBaseStats = { vo: 0, da: 200, vi: 0 }
  c.hif.schedule!.steps[0].pItemSlots = [0]
  c.hif.schedule!.steps[2].classSettings.selection.skillKind = 'type_a'
  c.hif.schedule!.steps[3].action = null
  const card = (cardsData as SupportCard[]).find((item) => item.id === 'gkm_0083')!
  const dc: DeckCard[] = [{ card, level: 60, isRental: false }]
  const gained = simulateHifSchedule(dc, c)
  assert.ok(gained.simulation!.finalState.pItems.includes('ほっこりまんぷく'))
  assert.equal(gained.simulation!.finalState.pDrinkCount, 1)
  c.hif.schedule!.steps[2].classSettings.selection.skillKind = 'other'
  assert.equal(simulateHifSchedule(dc, c).simulation!.finalState.pDrinkCount, 0)
  c.hif.schedule!.steps[2].classSettings.selection.skillKind = 'type_a'
  c.idolBaseStats = { vo: 0, da: 0, vi: 0 }
  assert.equal(simulateHifSchedule(dc, c).simulation!.finalState.pDrinkCount, 0)
})
test('a P item acquired through a front event reacts to a skill card gained on the same day', () => {
  const c = config()
  c.idolBaseStats = { vo: 0, da: 200, vi: 0 }
  c.hif.schedule!.steps[0].pItemSlots = [0]
  c.hif.schedule!.steps[0].consultation.skillActions = [
    {
      kind: 'gain',
      category: 'active',
      skillKind: 'type_a',
      preservation: false,
      energy: false,
      rarity: 'R',
    },
  ]
  c.hif.schedule!.steps[1].action = null
  const card = (cardsData as SupportCard[]).find((item) => item.id === 'gkm_0083')!
  const dc: DeckCard[] = [{ card, level: 60, isRental: false }]
  const sameDay = simulateHifSchedule(dc, c).simulation!.finalState
  assert.equal(sameDay.pDrinkCount, 1)
  assert.ok(sameDay.pItems.includes('ほっこりまんぷく'))
  c.hif.schedule!.steps[0].pItemSlots = []
  assert.equal(simulateHifSchedule(dc, c).simulation!.finalState.pDrinkCount, 0)
})
test('simple-mode P items react to cards gained in the same initial event batch', () => {
  const c = config()
  c.idolBaseStats = { vo: 0, da: 200, vi: 0 }
  c.hif.schedule!.eventMode = 'simple'
  c.hif.schedule!.simpleEvents.frontSlots = [0, 1]
  c.hif.schedule!.steps[0].action = null
  const itemCard = (cardsData as SupportCard[]).find((item) => item.id === 'gkm_0083')!
  const gainCard = deck({ ...ability(), operations: [] })[0]
  gainCard.card.id = 'good-condition-card'
  gainCard.card.supportEventRewards = [{ kind: 'skill_card', name: '好調カード', effect: '好調+3' }]
  const result = simulateHifSchedule([{ card: itemCard, level: 60, isRental: false }, gainCard], c)
  assert.equal(result.simulation!.finalState.pDrinkCount, 1)
})
test('an acquired Peak Time Flag reacts to later concentration-card gains at Da 700 or above', () => {
  const c = config()
  c.idolBaseStats = { vo: 0, da: 700, vi: 0 }
  c.hif.schedule!.steps[2].action = null
  const peak = deck({ ...ability(), operations: [] })[0]
  peak.card.id = 'peak'
  peak.card.name = 'peak'
  peak.card.supportEventRewards = [
    {
      kind: 'p_item',
      name: 'ピークタイムフラッグ',
      effect: '集中効果のスキルカード獲得時、ダンスが700以上の場合、ダンス上昇+20',
      parameterAbility: {
        schemaVersion: 2,
        source: { templateId: 'p_item.add_stat', parserVersion: 2 },
        activation: { event: 'skill_card_gained' },
        predicate: {
          type: 'all',
          predicates: [
            { type: 'condition', condition: { type: 'effect_tag_is', value: 'concentration' } },
            { type: 'condition', condition: { type: 'stat_gte', stat: 'da', value: 700 } },
          ],
        },
        operations: [
          { op: 'add_stat', stat: 'da', timing: 'activation', amount: { kind: 'literal', value: 20 } },
        ],
        limits: [{ scope: 'produce', max: 3 }],
      },
    },
  ]
  const gainCard = deck({ ...ability(), operations: [] })[0]
  gainCard.card.id = 'gain'
  gainCard.card.name = 'gain'
  gainCard.card.supportEventRewards = [
    { kind: 'skill_card', name: '集中カード', effect: '集中+3', rarity: 'SR' },
  ]
  c.hif.schedule!.steps[0].pItemSlots = [0]
  c.hif.schedule!.steps[1].pItemSlots = [1]
  const result = simulateHifSchedule([peak, gainCard], c)
  assert.equal(result.contributions[0].total.da, 20)
  assert.ok(
    result.simulation!.finalState.skillCards.some(
      (card) => card.name === '集中カード' && card.effectTags.includes('concentration'),
    ),
  )
})
test('front and after support-event selections apply one exact event and trigger matching card events', () => {
  const c = config()
  const upgraded = ability('skill_card_upgraded')
  const dc = deck(upgraded)
  dc[0].card.supportEventRewards = [{ kind: 'skill_card', name: 'テストカード', effect: 'テスト' }]
  dc[0].card.supportEvents = [
    { unlock: '初期', effect: 'スキルカード' },
    { unlock: 'Lv20', effect: 'ボーカル上昇+20' },
    { unlock: 'Lv40', effect: 'ランダムなスキルカードを強化' },
  ]
  c.hif.schedule!.steps[0].pItemSlots = [0]
  c.hif.schedule!.steps[0].postEventSelection = { slot: 0, eventIndex: 1 }
  c.hif.schedule!.steps[1].postEventSelection = { slot: 0, eventIndex: 2, targetCardId: 'basic:0' }
  const result = simulateHifSchedule(dc, c)
  assert.equal(result.simulation!.steps[0].gain.vo, 20)
  assert.equal(result.simulation!.steps[1].gain.vo, 70)
  assert.equal(result.eventCounts.supportEvents, 3)
  assert.equal(result.simulation!.triggerCounts[getParameterSortTriggerSetting(upgraded).key], 1)
  const afterBreakdown = result.contributions[0].effectBreakdowns.find(
    (item) => item.key === 'support-after:1:vo',
  )!
  assert.equal(afterBreakdown.label, 'サポートイベント・後（Lv20）')
  assert.equal(afterBreakdown.triggerCount, 1)
  assert.equal(Number(afterBreakdown.totalValueText), 20)
  assert.deepEqual(
    result.simulation!.steps[0].contributions[0].effectBreakdowns.find(
      (item) => item.key === 'support-after:1:vo',
    ),
    afterBreakdown,
  )
})

test('front-event skill card settings survive normalization and drive owned cards and sort conditions in both modes', () => {
  const c = config()
  const dc = deck({ ...ability(), operations: [] })
  dc[0].card.supportEventRewards = [
    { kind: 'skill_card', name: '前イベントのカード', effect: 'スキルカードを獲得', rarity: 'SR' },
  ]
  const trigger = ability('skill_card_gained')
  trigger.activation = { event: 'skill_card_gained' }
  trigger.predicate = {
    type: 'all',
    predicates: [
      { type: 'condition', condition: { type: 'card_category_is', value: 'mental' } },
      { type: 'condition', condition: { type: 'effect_tag_is', value: 'goodCondition' } },
      { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } },
    ],
  }
  dc[0].card.skills.push({
    id: 'front-trigger',
    name: '前イベント条件',
    description: '条件に一致したカード獲得時Vo+10',
    unlockLevel: 1,
    ability: trigger,
  })
  const selected = {
    category: 'mental' as const,
    skillKind: 'type_a_b' as const,
    preservation: false,
    energy: true,
    rarity: 'SSR' as const,
    upgraded: true,
  }
  c.hif.schedule!.steps[0].pItemSlots = [0]
  c.hif.schedule!.steps[0].frontSkillCard = selected
  const detailed = simulateHifSchedule(dc, c)
  const detailedCard = detailed.simulation!.finalState.skillCards.find((card) => card.id === 'support:0:0')!
  assert.equal(detailedCard.category, 'mental')
  assert.equal(detailedCard.rarity, 'SSR')
  assert.equal(detailedCard.upgraded, true)
  assert.deepEqual(detailedCard.effectTags, ['goodCondition', 'concentration', 'energy'])
  assert.equal(detailed.contributions[0].total.vo, 10)
  const detailedCounts = getProduceEventTriggerCounts(c, dc)
  assert.equal(detailedCounts['skill_card_gained:mental'], 1)
  assert.equal(detailedCounts['skill_card_gained:SSR'], 1)
  assert.equal(detailedCounts['skill_card_gained:goodCondition'], 1)
  assert.equal(detailedCounts['skill_card_gained:concentration'], 1)
  const simple = setHifEventMode(c.hif.schedule!, 'simple')
  assert.deepEqual(simple.simpleEvents.frontSkillCards?.[0], selected)
  c.hif.schedule = normalizeHifSchedule(simple)
  const simpleCard = simulateHifSchedule(dc, c).simulation!.finalState.skillCards.find(
    (card) => card.id === 'support:0:initial',
  )!
  assert.deepEqual({ ...simpleCard, id: detailedCard.id }, detailedCard)
  assert.equal(simulateHifSchedule(dc, c).contributions[0].total.vo, 10)
  assert.equal(getProduceEventTriggerCounts(c, dc)['skill_card_gained:energy'], 1)
  c.hif.schedule!.supportEventSkillCardsUpgraded = false
  assert.equal(
    simulateHifSchedule(dc, c).simulation!.finalState.skillCards.find(
      (card) => card.id === 'support:0:initial',
    )?.upgraded,
    false,
  )
  c.hif.schedule!.eventMode = 'detailed'
  assert.equal(
    simulateHifSchedule(dc, c).simulation!.finalState.skillCards.find((card) => card.id === 'support:0:0')
      ?.upgraded,
    false,
  )
  c.hif.schedule!.steps[0].frontSkillCard = { ...selected, upgraded: false }
  c.hif.schedule!.supportEventSkillCardsUpgraded = true
  assert.equal(
    simulateHifSchedule(dc, c).simulation!.finalState.skillCards.find((card) => card.id === 'support:0:0')
      ?.upgraded,
    true,
  )
})
test('detailed after events mutate selected cards and retain the chosen change result', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'consultation'
  c.hif.schedule!.steps[1].action = 'lesson'
  c.hif.schedule!.steps[2].action = 'class'
  const dc = deck(ability('skill_card_changed'))
  dc[0].card.supportEvents = [
    { unlock: '初期', effect: 'スキルカード' },
    { unlock: 'Lv20', effect: 'ランダムなスキルカードを強化' },
    { unlock: 'Lv40', effect: 'ランダムなスキルカードを削除' },
    { unlock: 'Lv50', effect: 'ランダムな名前に「基本」を含むスキルカードを異なるカードにチェンジ' },
  ]
  c.hif.schedule!.steps[0].postEventSelection = { slot: 0, eventIndex: 1, targetCardId: 'basic:0' }
  c.hif.schedule!.steps[1].postEventSelection = { slot: 0, eventIndex: 2, targetCardId: 'basic:1' }
  c.hif.schedule!.steps[2].postEventSelection = {
    slot: 0,
    eventIndex: 3,
    targetCardId: 'basic:2',
    resultCard: { category: 'mental', skillKind: 'type_a', preservation: false, energy: true, rarity: 'SSR' },
  }
  const result = simulateHifSchedule(dc, c).simulation!.finalState
  assert.equal(result.skillCards.find((card) => card.id === 'basic:0')?.upgraded, true)
  assert.equal(
    result.skillCards.some((card) => card.id === 'basic:1' || card.id === 'basic:2'),
    false,
  )
  assert.ok(
    result.skillCards.some(
      (card) =>
        card.id === 'changed:2' &&
        card.rarity === 'SSR' &&
        card.category === 'mental' &&
        card.effectTags.includes('goodCondition') &&
        card.effectTags.includes('energy'),
    ),
  )
  assert.equal(result.skillCardChangeCount, 1)
  c.hif.schedule!.steps[2].postEventSelection!.targetCardId = 'missing-card'
  const stale = simulateHifSchedule(dc, c).simulation!.finalState
  assert.equal(
    stale.skillCards.some((card) => card.id === 'basic:2'),
    true,
  )
  assert.equal(stale.skillCardChangeCount, 0)
  c.hif.schedule!.steps[2].postEventSelection!.targetCardId = 'class-selection:2'
  assert.equal(simulateHifSchedule(dc, c).simulation!.finalState.skillCardChangeCount, 0)
})
test('detailed after event can strengthen a card gained by the front event on the same day', () => {
  const c = config()
  c.hif.schedule!.supportEventSkillCardsUpgraded = false
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'consultation'
  c.hif.schedule!.steps[0].pItemSlots = [0]
  c.hif.schedule!.steps[0].postEventSelection = { slot: 0, eventIndex: 1, targetCardId: 'support:0:0' }
  const spec = ability('skill_card_upgraded')
  spec.predicate = {
    type: 'condition',
    condition: { type: 'card_name_contains', value: '前イベントのカード' },
  }
  const dc = deck(spec)
  dc[0].card.supportEventRewards = [{ kind: 'skill_card', name: '前イベントのカード', effect: '獲得' }]
  dc[0].card.supportEvents = [
    { unlock: '初期', effect: 'スキルカード' },
    { unlock: 'Lv20', effect: 'ランダムなスキルカードを強化' },
  ]
  const result = simulateHifSchedule(dc, c)
  assert.equal(
    result.simulation!.finalState.skillCards.find((card) => card.id === 'support:0:0')?.upgraded,
    true,
  )
  assert.equal(result.contributions[0].total.vo, 10)
})
test('switching to simple event mode imports detailed selections without changing the detailed days', () => {
  const schedule = createDefaultHifSchedule()
  schedule.steps[0].pItemSlots = [1]
  schedule.steps[1].postEventSelection = {
    slot: 2,
    eventIndex: 3,
    targetCardId: 'basic:1',
    resultCard: {
      category: 'mental',
      skillKind: 'type_a',
      preservation: false,
      energy: false,
      rarity: 'SSR',
    },
  }
  schedule.simpleEvents = { frontSlots: [4], afterSelections: [{ slot: 5, eventIndex: 2 }] }
  const simple = setHifEventMode(schedule, 'simple')
  assert.equal(simple.eventMode, 'simple')
  assert.deepEqual(simple.simpleEvents, {
    frontSlots: [4, 1],
    afterSelections: [{ slot: 5, eventIndex: 2 }, schedule.steps[1].postEventSelection],
  })
  assert.deepEqual(simple.steps[0].pItemSlots, [1])
  assert.deepEqual(simple.steps[1].postEventSelection, schedule.steps[1].postEventSelection)
  const detailed = setHifEventMode(simple, 'detailed')
  assert.deepEqual(detailed.steps, schedule.steps)
  assert.deepEqual(detailed.simpleEvents, simple.simpleEvents)
})
test('simple event mode owns front rewards and applies parameter events before the first day', () => {
  const c = config()
  c.hif.schedule!.eventMode = 'simple'
  c.hif.schedule!.simpleEvents = {
    frontSlots: [0],
    afterSelections: [
      { slot: 0, eventIndex: 1 },
      {
        slot: 0,
        eventIndex: 2,
        targetCardId: 'basic:2',
        resultCard: { category: 'active', skillKind: 'other', energy: false, rarity: 'R' },
      },
    ],
  }
  const itemAbility: SupportAbilitySpec = {
    schemaVersion: 2,
    source: { templateId: 'p_item.add_stat', parserVersion: 2 },
    activation: { event: 'lesson_end', lessonKind: 'sp' },
    operations: [
      { op: 'add_stat', stat: 'vo', timing: 'activation', amount: { kind: 'literal', value: 10 } },
    ],
  }
  const dc = deck({ ...ability(), operations: [] })
  const changeAbility = ability('skill_card_changed')
  changeAbility.predicate = { type: 'condition', condition: { type: 'card_name_contains', value: '基本' } }
  dc[0].card.skills.push({
    id: 'change-trigger',
    name: 'チェンジ時上昇',
    description: '基本カードチェンジ時Vo+10',
    unlockLevel: 1,
    ability: changeAbility,
  })
  dc[0].card.supportEventRewards = [
    {
      kind: 'p_item',
      name: '開始時アイテム',
      effect: 'SPレッスン終了時、ボーカル上昇+10',
      parameterAbility: itemAbility,
    },
  ]
  dc[0].card.supportEvents = [
    { unlock: '初期', effect: 'Pアイテムを獲得' },
    { unlock: 'Lv20', effect: 'ボーカル上昇+20' },
    { unlock: 'Lv40', effect: 'ランダムな名前に「基本」を含むスキルカードを異なるカードにチェンジ' },
  ]
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  const beforeSchedule = simulateHifSchedule(dc, c)
  assert.equal(beforeSchedule.simulation!.steps.length, 0)
  assert.ok(beforeSchedule.simulation!.finalState.pItems.includes('開始時アイテム'))
  assert.equal(beforeSchedule.finalStats.vo, 30)
  const initialAfterBreakdown = beforeSchedule.contributions[0].effectBreakdowns.find(
    (item) => item.key === 'support-after:1:vo',
  )!
  assert.equal(initialAfterBreakdown.label, 'サポートイベント・後（Lv20）')
  assert.equal(initialAfterBreakdown.triggerCount, 1)
  assert.equal(Number(initialAfterBreakdown.totalValueText), 20)
  c.hif.schedule!.steps[0].action = HIF_SCHEDULE[0].actions[0]
  c.hif.schedule!.steps[1].action = 'lesson'
  c.hif.schedule!.steps[1].lessonType = 'sp'
  const result = simulateHifSchedule(dc, c)
  assert.equal(result.simulation!.steps.length, 2)
  assert.ok(result.simulation!.steps[0].state.pItems.includes('開始時アイテム'))
  assert.equal(result.statSourceBreakdown.initial.vo, 30)
  assert.equal(result.simulation!.steps[1].contributions[0].total.vo, 10)
  assert.equal(result.contributions[0].total.vo, 40)
  const itemBreakdown = result.contributions[0].effectBreakdowns.find(
    (item) => item.key === 'p-item:開始時アイテム:vo',
  )!
  assert.equal(itemBreakdown.triggerCount, 1)
  assert.equal(Number(itemBreakdown.totalValueText), 10)
  assert.equal(result.eventCounts.supportEvents, 3)
  assert.ok(result.simulation!.steps[0].state.skillCards.some((card) => card.source === 'changed'))
})
test('simple after events can target front reward and previous change result in sequence', () => {
  const c = config()
  c.hif.schedule!.eventMode = 'simple'
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.simpleEvents = {
    frontSlots: [0],
    afterSelections: [
      { slot: 0, eventIndex: 1, targetCardId: 'support:0:initial' },
      {
        slot: 0,
        eventIndex: 2,
        targetCardId: 'basic:2',
        resultCard: {
          category: 'mental',
          skillKind: 'type_b',
          preservation: false,
          energy: false,
          rarity: 'SR',
        },
      },
      { slot: 0, eventIndex: 3, targetCardId: 'changed:initial:0:2' },
    ],
  }
  const dc = deck(ability('skill_card_changed'))
  const deletedSr = ability('skill_card_deleted')
  deletedSr.predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SR' } }
  dc[0].card.skills.push({
    id: 'deleted-changed-sr',
    name: 'SR削除',
    description: 'SR削除',
    unlockLevel: 1,
    ability: deletedSr,
  })
  dc[0].card.supportEventRewards = [{ kind: 'skill_card', name: '前イベントのカード', effect: '獲得' }]
  dc[0].card.supportEvents = [
    { unlock: '初期', effect: 'スキルカード' },
    { unlock: 'Lv20', effect: 'ランダムなスキルカードを強化' },
    { unlock: 'Lv40', effect: 'ランダムなスキルカードをチェンジ' },
    { unlock: 'Lv50', effect: 'ランダムなスキルカードを削除' },
  ]
  const result = simulateHifSchedule(dc, c)
  assert.equal(result.simulation!.steps.length, 0)
  assert.equal(result.eventCounts.supportEvents, 4)
  assert.equal(
    result.simulation!.finalState.skillCards.find((card) => card.id === 'support:0:initial')?.upgraded,
    true,
  )
  assert.equal(
    result.simulation!.finalState.skillCards.some(
      (card) => card.id === 'basic:2' || card.id === 'changed:initial:0:2',
    ),
    false,
  )
  assert.equal(result.simulation!.finalState.skillCardChangeCount, 1)
  assert.equal(result.contributions[0].total.vo, 20)
})
test('normalization supplies defaults and validates simple event selections', () => {
  const old = normalizeHifSchedule({ steps: [] })
  assert.equal(old.eventMode, 'detailed')
  assert.equal(old.supportEventSkillCardsUpgraded, true)
  assert.equal(
    normalizeHifSchedule({ supportEventSkillCardsUpgraded: false }).supportEventSkillCardsUpgraded,
    false,
  )
  assert.deepEqual(old.simpleEvents, { frontSlots: [], afterSelections: [] })
  assert.deepEqual(old.steps[0].consultation, { pDrinkCount: 0, skillActions: [], resetUsed: false })
  assert.deepEqual(old.steps[0].supplySkillCard, {
    category: 'active',
    skillKind: 'other',
    preservation: false,
    energy: false,
    rarity: 'R',
  })
  assert.equal(old.steps[2].classSettings.action, 'gain')
  assert.equal(old.steps[5].classSettings.action, 'gain')
  assert.equal(old.steps[9].classSettings.action, 'change')
  assert.equal(old.steps[16].classSettings.action, 'change')
  assert.equal(old.steps[0].trainingCustomCount, 0)
  assert.deepEqual(old.steps[27].interval, { pDrinkCount: 0, skillActions: [], skillCardCustomCount: 0 })
  assert.deepEqual(old.steps[0].outing, { reward: 'two_cards', skillCards: [null, null] })
  const normalized = normalizeHifSchedule({
    eventMode: 'simple',
    simpleEvents: {
      frontSlots: [0, 0, 7],
      afterSelections: [
        { slot: 1, eventIndex: 2 },
        { slot: 1, eventIndex: 2 },
        { slot: 8, eventIndex: 1 },
      ],
    },
  })
  assert.equal(normalized.eventMode, 'simple')
  assert.deepEqual(normalized.simpleEvents, {
    frontSlots: [0],
    afterSelections: [{ slot: 1, eventIndex: 2 }],
  })
})
test('interval settings normalize non-negative counts and keep card actions without per-action limits', () => {
  const steps: Array<Record<string, unknown>> = []
  steps[27] = {
    action: 'interval',
    interval: {
      pDrinkCount: 120,
      skillCardCustomCount: 35,
      skillActions: [
        { kind: 'gain', category: 'mental', skillKind: 'type_a', energy: true, rarity: 'SSR' },
        { kind: 'upgrade', category: 'active', skillKind: 'type_b', energy: false, rarity: 'SR' },
        { kind: 'change', category: 'active', skillKind: 'other', energy: false, rarity: 'R' },
        { kind: 'upgrade', category: 'mental', skillKind: 'type_a_b', energy: false, rarity: 'SSR' },
      ],
    },
  }
  const normalized = normalizeHifSchedule({ steps })
  assert.equal(normalized.steps[27].interval.pDrinkCount, 120)
  assert.equal(normalized.steps[27].interval.skillCardCustomCount, 35)
  assert.deepEqual(
    normalized.steps[27].interval.skillActions.map((action) => action.kind),
    ['gain', 'upgrade', 'change', 'upgrade'],
  )
  const invalidSteps: Array<Record<string, unknown>> = []
  invalidSteps[27] = {
    action: 'interval',
    interval: {
      pDrinkCount: -1,
      skillCardCustomCount: Infinity,
      skillActions: [{ kind: 'delete', rarity: 'R' }],
    },
  }
  assert.deepEqual(normalizeHifSchedule({ steps: invalidSteps }).steps[27].interval, {
    pDrinkCount: 0,
    skillActions: [],
    skillCardCustomCount: 0,
  })
})
test('early classes gain a selected card while later classes change without increasing the owned-card count', () => {
  const gained = config()
  gained.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  gained.hif.schedule!.steps[0].action = 'rest'
  gained.hif.schedule!.steps[1].action = 'rest'
  gained.hif.schedule!.steps[2].action = 'class'
  gained.hif.schedule!.steps[2].classSettings = {
    action: 'gain',
    selection: { category: 'mental', skillKind: 'type_a', energy: false, rarity: 'SSR' },
  }
  const gainSpecs = [ability('skill_card_gained'), ability('skill_card_gained'), ability('skill_card_gained')]
  gainSpecs[0].predicate = { type: 'condition', condition: { type: 'card_category_is', value: 'mental' } }
  gainSpecs[1].predicate = { type: 'condition', condition: { type: 'effect_tag_is', value: 'goodCondition' } }
  gainSpecs[2].predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } }
  const gainDeck = deck(gainSpecs[0])
  gainSpecs.slice(1).forEach((spec, index) =>
    gainDeck[0].card.skills.push({
      id: `class-gain-${index}`,
      name: '授業獲得テスト',
      description: '授業獲得テスト',
      unlockLevel: 1,
      ability: spec,
    }),
  )
  const gainedResult = simulateHifSchedule(gainDeck, gained)
  assert.equal(gainedResult.simulation!.finalState.skillCards.length, 9)
  assert.equal(gainedResult.simulation!.finalState.skillCardChangeCount, 0)
  assert.ok(
    gainedResult.simulation!.finalState.skillCards.some(
      (card) =>
        card.source === 'class' &&
        card.category === 'mental' &&
        card.rarity === 'SSR' &&
        card.effectTags.includes('goodCondition'),
    ),
  )
  assert.equal(gainedResult.contributions[0].total.vo, 30)

  const changed = config()
  changed.hif.schedule!.steps.forEach((step, index) => {
    if (index > 9) step.action = null
  })
  changed.hif.schedule!.steps[2].action = 'rest'
  changed.hif.schedule!.steps[4].action = 'rest'
  changed.hif.schedule!.steps[5].action = 'rest'
  changed.hif.schedule!.steps[7].action = 'rest'
  changed.hif.schedule!.steps[9].classSettings = {
    action: 'change',
    selection: { category: 'mental', skillKind: 'type_a', energy: false, rarity: 'basic_name' },
    targetCardId: 'basic:2',
    resultCard: { category: 'mental', skillKind: 'type_b', energy: true, rarity: 'SSR' },
  }
  const changeSpecs = [
    ability('skill_card_changed'),
    ability('skill_card_changed'),
    ability('skill_card_changed'),
  ]
  changeSpecs[0].predicate = { type: 'condition', condition: { type: 'card_name_contains', value: '基本' } }
  changeSpecs[1].predicate = { type: 'condition', condition: { type: 'card_category_is', value: 'mental' } }
  changeSpecs[2].predicate = {
    type: 'condition',
    condition: { type: 'effect_tag_is', value: 'goodCondition' },
  }
  const changeDeck = deck(changeSpecs[0])
  changeSpecs.slice(1).forEach((spec, index) =>
    changeDeck[0].card.skills.push({
      id: `class-change-${index}`,
      name: '授業チェンジテスト',
      description: '授業チェンジテスト',
      unlockLevel: 1,
      ability: spec,
    }),
  )
  const changedResult = simulateHifSchedule(changeDeck, changed)
  assert.equal(changedResult.simulation!.finalState.skillCards.length, 8)
  assert.equal(changedResult.simulation!.finalState.skillCardChangeCount, 1)
  assert.equal(changedResult.contributions[0].total.vo, 10)
  assert.equal(
    changedResult.simulation!.finalState.skillCards.some((card) => card.id === 'basic:2'),
    false,
  )
  assert.ok(
    changedResult.simulation!.finalState.skillCards.some(
      (card) =>
        card.id === 'class-changed:9' &&
        card.rarity === 'SSR' &&
        card.category === 'mental' &&
        card.effectTags.includes('concentration') &&
        card.effectTags.includes('energy'),
    ),
  )
})
test('class change with sleepy keeps the changed-card count stable and gains sleepy exactly once', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'rest'
  c.hif.schedule!.steps[1].action = 'rest'
  c.hif.schedule!.steps[2].action = 'class'
  c.hif.schedule!.steps[2].classSettings = {
    action: 'change_sleepy',
    selection: { category: 'active', skillKind: 'other', energy: false, rarity: 'basic_name' },
    targetCardId: 'basic:0',
    resultCard: { category: 'active', skillKind: 'other', energy: false, rarity: 'R' },
  }
  const specs = [ability('skill_card_changed'), ability('skill_card_gained')]
  specs[0].predicate = { type: 'condition', condition: { type: 'card_name_contains', value: '基本' } }
  const dc = deck(specs[0])
  dc[0].card.skills.push({
    id: 'sleepy-gain',
    name: '眠気獲得テスト',
    description: '眠気獲得テスト',
    unlockLevel: 1,
    ability: specs[1],
  })
  const result = simulateHifSchedule(dc, c)
  assert.equal(result.simulation!.finalState.skillCardChangeCount, 1)
  assert.equal(result.simulation!.finalState.skillCards.length, 9)
  assert.equal(result.simulation!.finalState.skillCards.filter((card) => card.name === '眠気').length, 1)
  assert.equal(result.contributions[0].total.vo, 20)
})
test('class change can target the owned idol card and does not change a stale target', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'rest'
  c.hif.schedule!.steps[1].action = 'rest'
  c.hif.schedule!.steps[2].action = 'class'
  c.hif.schedule!.steps[2].classSettings = {
    action: 'change_sleepy',
    selection: { category: 'active', skillKind: 'other', energy: false, rarity: 'R' },
    targetCardId: 'idol:test',
    resultCard: { category: 'active', skillKind: 'other', energy: false, rarity: 'R' },
  }
  const changed = simulateHifSchedule([], c).simulation!.finalState
  assert.equal(
    changed.skillCards.some((card) => card.id === 'idol:test'),
    false,
  )
  assert.equal(
    changed.skillCards.some((card) => card.id === 'class-changed:2'),
    true,
  )
  assert.equal(
    changed.skillCards.some((card) => card.name === '眠気'),
    true,
  )
  c.hif.schedule!.steps[2].classSettings.targetCardId = 'missing-card'
  const stale = simulateHifSchedule([], c).simulation!.finalState
  assert.equal(
    stale.skillCards.some((card) => card.id === 'idol:test'),
    true,
  )
  assert.equal(
    stale.skillCards.some((card) => card.name === '眠気'),
    false,
  )
  assert.equal(stale.skillCardChangeCount, 0)
})
test('consultation settings normalize action limits and consume the reset only once per produce', () => {
  const skillActions = [
    { kind: 'upgrade', category: 'active', skillKind: 'other', energy: false, rarity: 'R' },
    { kind: 'upgrade', category: 'mental', skillKind: 'type_a', energy: false, rarity: 'SSR' },
    { kind: 'upgrade', category: 'active', skillKind: 'type_b', energy: false, rarity: 'SR' },
    { kind: 'delete', category: 'active', skillKind: 'other', energy: false, rarity: 'R' },
    { kind: 'delete', category: 'mental', skillKind: 'type_a_b', energy: true, rarity: 'SSR' },
    { kind: 'delete', category: 'active', skillKind: 'other', energy: true, rarity: 'SR' },
  ]
  const steps: Array<Record<string, unknown>> = []
  steps[0] = { action: 'consultation', consultation: { pDrinkCount: 120, resetUsed: true, skillActions } }
  steps[4] = { action: 'consultation', consultation: { pDrinkCount: 120, resetUsed: true, skillActions } }
  const normalized = normalizeHifSchedule({ steps })
  assert.equal(normalized.steps[0].consultation.pDrinkCount, 8)
  assert.equal(normalized.steps[0].consultation.resetUsed, true)
  assert.deepEqual(
    normalized.steps[0].consultation.skillActions.map((action) => action.kind),
    ['upgrade', 'upgrade', 'delete', 'delete'],
  )
  assert.equal(normalized.steps[4].consultation.resetUsed, false)
  assert.equal(normalized.steps[4].consultation.pDrinkCount, 4)
  assert.deepEqual(
    normalized.steps[4].consultation.skillActions.map((action) => action.kind),
    ['upgrade', 'delete'],
  )
  assert.equal(
    normalizeHifSchedule({
      steps: [{ action: 'consultation', consultation: { pDrinkCount: 120, resetUsed: false } }],
    }).steps[0].consultation.pDrinkCount,
    4,
  )
})
test('consultation exchanges at most four drinks, or eight with its one-time refresh', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'consultation'
  c.hif.schedule!.steps[0].consultation.pDrinkCount = 12
  assert.equal(simulateHifSchedule([], c).simulation!.finalState.pDrinkCount, 4)
  c.hif.schedule!.steps[0].consultation.resetUsed = true
  assert.equal(simulateHifSchedule([], c).simulation!.finalState.pDrinkCount, 8)
})
test('consultation skill types follow each idol plan', () => {
  assert.equal(getHifConsultationSkillKindLabel('sense', 'type_a_b'), '好調&集中')
  assert.equal(getHifConsultationSkillKindLabel('logic', 'type_a_b'), '好印象&やる気')
  assert.equal(getHifConsultationSkillKindLabel('anomaly', 'type_a_b'), '強気&全力')
  assert.deepEqual(getHifConsultationSkillTags('sense', 'type_a_b'), ['goodCondition', 'concentration'])
  assert.deepEqual(getHifConsultationSkillTags('logic', 'type_a_b'), ['goodImpression', 'motivation'])
  assert.deepEqual(getHifConsultationSkillTags('anomaly', 'type_a_b'), ['aggressive', 'fullPower'])
  assert.deepEqual(getHifConsultationSkillTags('sense', 'type_a', true), ['goodCondition', 'energy'])
  assert.equal(getHifConsultationSkillKindLabel('anomaly', 'type_a_b', true, true), '強気&温存&全力&元気')
  assert.deepEqual(getHifConsultationSkillTags('anomaly', 'type_a_b', true, true), [
    'aggressive',
    'fullPower',
    'preservation',
    'energy',
  ])
})
test('one gained card can trigger every selected skill-kind condition', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'consultation'
  c.hif.schedule!.steps[0].consultation.skillActions = [
    {
      kind: 'gain',
      category: 'active',
      skillKind: 'type_a_b',
      preservation: false,
      energy: false,
      rarity: 'R',
    },
  ]
  const goodCondition = ability('skill_card_gained')
  goodCondition.predicate = {
    type: 'condition',
    condition: { type: 'effect_tag_is', value: 'goodCondition' },
  }
  const concentration = ability('skill_card_gained')
  concentration.predicate = {
    type: 'condition',
    condition: { type: 'effect_tag_is', value: 'concentration' },
  }
  const dc = deck(goodCondition)
  dc[0].card.skills.push({
    id: 'multi-kind',
    name: '複数効果',
    description: '複数効果',
    unlockLevel: 1,
    ability: concentration,
  })
  const result = simulateHifSchedule(dc, c)
  assert.equal(result.contributions[0].total.vo, 20)
})
test('consultation card and drink actions update owned state and emit exact card conditions', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'consultation'
  c.hif.schedule!.steps[0].consultation = {
    pDrinkCount: 2,
    resetUsed: false,
    skillActions: [
      { kind: 'gain', category: 'mental', skillKind: 'type_a', energy: true, rarity: 'SSR' },
      {
        kind: 'upgrade',
        category: 'active',
        skillKind: 'type_b',
        energy: false,
        rarity: 'SR',
        targetCardId: 'consultation:0:0',
      },
      {
        kind: 'delete',
        category: 'active',
        skillKind: 'other',
        energy: false,
        rarity: 'R',
        targetCardId: 'consultation:0:0',
      },
    ],
  }
  const specs = [
    ability('drink_gained'),
    ability('consultation_after_drink_trade'),
    ability('skill_card_gained'),
    ability('skill_card_gained'),
    ability('skill_card_gained'),
    ability('skill_card_gained'),
    ability('skill_card_upgraded'),
    ability('skill_card_deleted'),
  ]
  specs[2].predicate = { type: 'condition', condition: { type: 'effect_tag_is', value: 'goodCondition' } }
  specs[3].predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } }
  specs[4].predicate = { type: 'condition', condition: { type: 'effect_tag_is', value: 'energy' } }
  specs[5].predicate = { type: 'condition', condition: { type: 'card_category_is', value: 'mental' } }
  specs[6].predicate = { type: 'condition', condition: { type: 'effect_tag_is', value: 'goodCondition' } }
  specs[7].predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } }
  const dc = deck(specs[0])
  specs.slice(1).forEach((spec, index) =>
    dc[0].card.skills.push({
      id: `consultation-${index}`,
      name: '相談テスト',
      description: '相談テスト',
      unlockLevel: 1,
      ability: spec,
    }),
  )
  const result = simulateHifSchedule(dc, c)
  const state = result.simulation!.steps[0].state
  assert.equal(state.pDrinkCount, 2)
  assert.equal(state.skillCards.length, 8)
  assert.ok(
    !state.skillCards.some((card) => card.id === 'consultation:0:0'),
    JSON.stringify(state.skillCards),
  )
  assert.equal(result.contributions[0].total.vo, 100)
})
test('consultation upgrade and delete use the selected owned cards, including an earlier gain', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'consultation'
  c.hif.schedule!.steps[0].consultation.skillActions = [
    { kind: 'gain', category: 'mental', skillKind: 'type_a', energy: false, rarity: 'SSR' },
    {
      kind: 'upgrade',
      category: 'active',
      skillKind: 'other',
      energy: false,
      rarity: 'R',
      targetCardId: 'consultation:0:0',
    },
    {
      kind: 'delete',
      category: 'active',
      skillKind: 'other',
      energy: false,
      rarity: 'R',
      targetCardId: 'basic:2',
    },
  ]
  const upgrade = ability('skill_card_upgraded')
  upgrade.predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } }
  const deletion = ability('skill_card_deleted')
  deletion.predicate = { type: 'condition', condition: { type: 'card_name_contains', value: '基本' } }
  const dc = deck(upgrade)
  dc[0].card.skills.push({
    id: 'selected-deletion',
    name: '対象削除',
    description: '対象削除',
    unlockLevel: 1,
    ability: deletion,
  })
  const result = simulateHifSchedule(dc, c)
  assert.equal(result.contributions[0].total.vo, 20)
  assert.equal(
    result.simulation!.finalState.skillCards.find((card) => card.id === 'consultation:0:0')?.upgraded,
    true,
  )
  assert.equal(
    result.simulation!.finalState.skillCards.some((card) => card.id === 'basic:2'),
    false,
  )
  c.hif.schedule!.steps[0].consultation.skillActions[1].targetCardId = 'missing-card'
  c.hif.schedule!.steps[0].consultation.skillActions[2].targetCardId = 'missing-card'
  const stale = simulateHifSchedule(dc, c)
  assert.equal(stale.contributions[0].total.vo, 0)
  assert.equal(
    stale.simulation!.finalState.skillCards.find((card) => card.id === 'consultation:0:0')?.upgraded,
    false,
  )
  assert.equal(
    stale.simulation!.finalState.skillCards.some((card) => card.id === 'basic:2'),
    true,
  )
})
test('consultation trade abilities do not trigger without a configured support event', () => {
  const spec = ability('consultation_after_drink_trade')
  const c = config()
  assert.equal(simulateHifSchedule(deck(spec), c).contributions[0].total.vo, 0)
})
test('supply grants one drink and the selected card exactly once after confirmation or later edits', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'supply'
  c.hif.schedule!.steps[0].supplySkillCard = {
    category: 'mental',
    skillKind: 'type_a_b',
    energy: true,
    rarity: 'SSR',
  }
  const specs = [ability('drink_gained'), ability('skill_card_gained'), ability('skill_card_gained')]
  specs[1].predicate = { type: 'condition', condition: { type: 'effect_tag_is', value: 'goodCondition' } }
  specs[2].predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } }
  const dc = deck(specs[0])
  specs.slice(1).forEach((spec, index) =>
    dc[0].card.skills.push({
      id: `supply-${index}`,
      name: '支給テスト',
      description: '支給テスト',
      unlockLevel: 1,
      ability: spec,
    }),
  )
  const first = simulateHifSchedule(dc, c)
  assert.equal(first.simulation!.finalState.pDrinkCount, 1)
  assert.ok(
    first.simulation!.finalState.skillCards.some(
      (card) =>
        card.source === 'supply' &&
        card.category === 'mental' &&
        card.rarity === 'SSR' &&
        card.effectTags.includes('goodCondition') &&
        card.effectTags.includes('concentration') &&
        card.effectTags.includes('energy'),
    ),
  )
  assert.equal(first.contributions[0].total.vo, 30)
  c.hif.schedule!.steps[0].supplySkillCard = {
    category: 'active',
    skillKind: 'other',
    energy: false,
    rarity: 'R',
  }
  const edited = simulateHifSchedule(dc, c)
  assert.equal(edited.simulation!.finalState.pDrinkCount, 1)
  assert.equal(edited.simulation!.finalState.skillCards.filter((card) => card.source === 'supply').length, 1)
})
test('outing always grants one drink and applies each of its three card reward choices exactly once', () => {
  const run = (reward: 'two_cards' | 'two_cards_sleepy' | 'one_card') => {
    const c = config()
    c.hif.schedule!.steps.forEach((step) => {
      step.action = null
    })
    for (let index = 0; index < 4; index++) c.hif.schedule!.steps[index].action = 'rest'
    c.hif.schedule!.steps[4].action = 'outing'
    c.hif.schedule!.steps[4].outing = {
      reward,
      skillCards: [
        { category: 'mental', skillKind: 'type_a', energy: true, rarity: 'SSR' },
        { category: 'active', skillKind: 'type_b', energy: false, rarity: 'SR' },
      ],
    }
    const specs = [
      ability('outing_end'),
      ability('drink_gained'),
      ability('skill_card_gained'),
      ability('consultation_after_drink_trade'),
    ]
    const dc = deck(specs[0])
    specs.slice(1).forEach((spec, index) =>
      dc[0].card.skills.push({
        id: `outing-${index}`,
        name: 'おでかけテスト',
        description: 'おでかけテスト',
        unlockLevel: 1,
        ability: spec,
      }),
    )
    return { result: simulateHifSchedule(dc, c), consultationSpec: specs[3] }
  }
  const two = run('two_cards')
  assert.equal(two.result.simulation!.finalState.pDrinkCount, 1)
  assert.equal(two.result.simulation!.finalState.skillCards.length, 10)
  assert.equal(two.result.simulation!.finalState.hifBadgeTriggerCount, 2)
  assert.equal(
    two.result.simulation!.finalState.skillCards.filter((card) => card.source === 'outing').length,
    2,
  )
  assert.equal(two.result.contributions[0].total.vo, 40)
  assert.equal(
    two.result.simulation!.triggerCounts[getParameterSortTriggerSetting(two.consultationSpec).key] ?? 0,
    0,
  )
  assert.ok(
    two.result.simulation!.finalState.skillCards.some(
      (card) =>
        card.source === 'outing' &&
        card.category === 'mental' &&
        card.rarity === 'SSR' &&
        card.effectTags.includes('goodCondition') &&
        card.effectTags.includes('energy'),
    ),
  )

  const sleepy = run('two_cards_sleepy').result
  assert.equal(sleepy.simulation!.finalState.pDrinkCount, 1)
  assert.equal(sleepy.simulation!.finalState.skillCards.length, 11)
  assert.equal(sleepy.simulation!.finalState.hifBadgeTriggerCount, 3)
  assert.equal(
    sleepy.simulation!.finalState.skillCards.filter(
      (card) => card.name === '眠気' && card.source === 'outing',
    ).length,
    1,
  )
  assert.equal(sleepy.contributions[0].total.vo, 50)

  const one = run('one_card').result
  assert.equal(one.simulation!.finalState.pDrinkCount, 1)
  assert.equal(one.simulation!.finalState.skillCards.length, 9)
  assert.equal(one.simulation!.finalState.hifBadgeTriggerCount, 1)
  assert.equal(one.simulation!.finalState.skillCards.filter((card) => card.source === 'outing').length, 1)
  assert.equal(one.contributions[0].total.vo, 30)
})
test('special training counts each selected customization and recalculates edits without duplication', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step) => {
    step.action = null
  })
  c.hif.schedule!.steps[0].action = 'training'
  c.hif.schedule!.steps[0].trainingCustomCount = 2
  const dc = deck(ability('special_training_started'))
  dc[0].card.skills.push({
    id: 'customized',
    name: 'カスタム時',
    description: 'カスタム時',
    unlockLevel: 1,
    ability: ability('skill_card_customized'),
  })
  const first = simulateHifSchedule(dc, c)
  assert.equal(first.simulation!.finalState.skillCardCustomCount, 2)
  assert.equal(first.contributions[0].total.vo, 30)
  c.hif.schedule!.steps[0].trainingCustomCount = 1
  const edited = simulateHifSchedule(dc, c)
  assert.equal(edited.simulation!.finalState.skillCardCustomCount, 1)
  assert.equal(edited.contributions[0].total.vo, 20)
})
test('interval applies unlimited card operations, drinks and customization without consultation-trade events', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step, index) => {
    step.action =
      index < 27
        ? HIF_SCHEDULE[index].actions.includes('rest')
          ? 'rest'
          : HIF_SCHEDULE[index].actions[0]
        : null
  })
  c.hif.schedule!.steps[27].action = 'interval'
  c.hif.schedule!.steps[27].interval = {
    pDrinkCount: 2,
    skillCardCustomCount: 3,
    skillActions: [
      { kind: 'gain', category: 'mental', skillKind: 'type_a', energy: true, rarity: 'SSR' },
      { kind: 'gain', category: 'active', skillKind: 'type_b', energy: false, rarity: 'SR' },
      {
        kind: 'upgrade',
        category: 'active',
        skillKind: 'other',
        energy: false,
        rarity: 'R',
        targetCardId: 'basic:0',
      },
      {
        kind: 'change',
        category: 'active',
        skillKind: 'other',
        energy: false,
        rarity: 'R',
        targetCardId: 'basic:1',
        resultCard: { category: 'active', skillKind: 'other', energy: false, rarity: 'R' },
      },
    ],
  }
  const specs = [
    ability('drink_gained'),
    ability('consultation_after_drink_trade'),
    ability('consultation_after_card_trade'),
    ability('skill_card_gained'),
    ability('skill_card_upgraded'),
    ability('skill_card_changed'),
    ability('skill_card_customized'),
  ]
  const dc = deck(specs[0])
  specs.slice(1).forEach((spec, index) =>
    dc[0].card.skills.push({
      id: `interval-${index}`,
      name: 'インターバルテスト',
      description: 'インターバルテスト',
      unlockLevel: 1,
      ability: spec,
    }),
  )
  const result = simulateHifSchedule(dc, c)
  const state = result.simulation!.finalState
  assert.equal(result.simulation!.steps.length, 28)
  assert.equal(state.pDrinkCount, 2)
  assert.equal(state.skillCardCustomCount, 3)
  assert.equal(state.skillCardChangeCount, 1)
  assert.equal(state.hifBadgeTriggerCount, 2)
  assert.equal(state.skillCards.length, 10)
  assert.equal(state.skillCards.filter((card) => card.source === 'interval').length, 2)
  assert.equal(result.contributions[0].total.vo, 90)
  assert.equal(result.simulation!.triggerCounts[getParameterSortTriggerSetting(specs[1]).key] ?? 0, 0)
  assert.equal(result.simulation!.triggerCounts[getParameterSortTriggerSetting(specs[2]).key] ?? 0, 0)
})
test('interval change can select a card gained earlier in the same interval', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step, index) => {
    step.action =
      index < 27
        ? HIF_SCHEDULE[index].actions.includes('rest')
          ? 'rest'
          : HIF_SCHEDULE[index].actions[0]
        : null
  })
  c.hif.schedule!.steps[27].action = 'interval'
  c.hif.schedule!.steps[27].interval.skillActions = [
    { kind: 'gain', category: 'mental', skillKind: 'type_a', energy: false, rarity: 'SSR' },
    {
      kind: 'change',
      category: 'active',
      skillKind: 'other',
      energy: false,
      rarity: 'R',
      targetCardId: 'interval:27:0',
      resultCard: { category: 'active', skillKind: 'type_b', energy: false, rarity: 'SR' },
    },
    {
      kind: 'change',
      category: 'active',
      skillKind: 'other',
      energy: false,
      rarity: 'R',
      targetCardId: 'interval-changed:27:1',
      resultCard: { category: 'mental', skillKind: 'other', energy: true, rarity: 'R' },
    },
  ]
  const spec = ability('skill_card_changed')
  spec.activation = { event: 'skill_card_changed' }
  spec.predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } }
  const changedDeck = deck(spec)
  const secondSpec = ability('skill_card_changed')
  secondSpec.activation = { event: 'skill_card_changed' }
  secondSpec.predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SR' } }
  changedDeck[0].card.skills.push({
    id: 'changed-result-sr',
    name: 'チェンジ後SR',
    description: 'チェンジ後SR',
    unlockLevel: 1,
    ability: secondSpec,
  })
  const changed = simulateHifSchedule(changedDeck, c)
  assert.equal(changed.contributions[0].total.vo, 20)
  assert.equal(changed.simulation!.finalState.skillCardChangeCount, 2)
  assert.equal(
    changed.simulation!.finalState.skillCards.some((card) => card.id === 'interval:27:0'),
    false,
  )
  assert.ok(
    changed.simulation!.finalState.skillCards.some(
      (card) =>
        card.id === 'interval-changed:27:2' &&
        card.rarity === 'R' &&
        card.category === 'mental' &&
        card.effectTags.includes('energy'),
    ),
  )
  c.hif.schedule!.steps[27].interval.skillActions[1].targetCardId = 'missing-card'
  const stale = simulateHifSchedule(changedDeck, c)
  assert.equal(stale.contributions[0].total.vo, 0)
  assert.equal(stale.simulation!.finalState.skillCardChangeCount, 0)
  assert.equal(
    stale.simulation!.finalState.skillCards.some((card) => card.id === 'interval:27:0'),
    true,
  )
})
test('interval upgrade selects an exact owned card and does not fall back for a stale selection', () => {
  const c = config()
  c.hif.schedule!.steps.forEach((step, index) => {
    step.action =
      index < 27
        ? HIF_SCHEDULE[index].actions.includes('rest')
          ? 'rest'
          : HIF_SCHEDULE[index].actions[0]
        : null
  })
  c.hif.schedule!.steps[27].action = 'interval'
  c.hif.schedule!.steps[27].interval.skillActions = [
    { kind: 'gain', category: 'mental', skillKind: 'type_a', energy: false, rarity: 'SSR' },
    {
      kind: 'upgrade',
      category: 'active',
      skillKind: 'other',
      energy: false,
      rarity: 'R',
      targetCardId: 'interval:27:0',
    },
  ]
  const spec = ability('skill_card_upgraded')
  spec.predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } }
  const changed = simulateHifSchedule(deck(spec), c)
  assert.equal(changed.contributions[0].total.vo, 10)
  assert.equal(
    changed.simulation!.finalState.skillCards.find((card) => card.id === 'interval:27:0')?.upgraded,
    true,
  )
  c.hif.schedule!.steps[27].interval.skillActions[1].targetCardId = 'missing-card'
  const stale = simulateHifSchedule(deck(spec), c)
  assert.equal(stale.contributions[0].total.vo, 0)
  assert.equal(
    stale.simulation!.finalState.skillCards.find((card) => card.id === 'interval:27:0')?.upgraded,
    false,
  )
})
test('schedule edits sync shared lesson/class values and survive a site revisit', () => {
  const c = config()
  c.hif.schedule = createDefaultHifSchedule()
  const initialized = normalizeHifSchedule(c.hif.schedule)
  assert.equal(getHifScheduleProgress(initialized), 0)
  initialized.steps[1] = {
    ...initialized.steps[1],
    action: 'lesson',
    param: 'dance',
    subParam: 'visual',
    lessonType: 'sp',
  }
  initialized.supportEventSkillCardsUpgraded = false
  initialized.steps[9].classSettings.targetCardId = 'basic:1'
  initialized.steps[9].classSettings.resultCard = {
    category: 'mental',
    skillKind: 'type_a',
    preservation: false,
    energy: false,
    rarity: 'SSR',
  }
  initialized.steps[1].postEventSelection = {
    slot: 1,
    eventIndex: 2,
    targetCardId: 'basic:0',
    resultCard: { category: 'mental', skillKind: 'type_b', preservation: false, energy: false, rarity: 'SR' },
  }
  initialized.simpleEvents.afterSelections = [{ slot: 2, eventIndex: 3, targetCardId: 'basic:1' }]
  initialized.steps[0].consultation.skillActions = [
    {
      kind: 'delete',
      category: 'active',
      skillKind: 'other',
      preservation: false,
      energy: false,
      rarity: 'R',
      targetCardId: 'basic:0',
    },
  ]
  initialized.steps[27].interval.skillActions = [
    {
      kind: 'change',
      category: 'active',
      skillKind: 'other',
      preservation: false,
      energy: false,
      rarity: 'R',
      targetCardId: 'basic:2',
      resultCard: {
        category: 'active',
        skillKind: 'type_b',
        preservation: false,
        energy: true,
        rarity: 'SR',
      },
    },
    {
      kind: 'upgrade',
      category: 'active',
      skillKind: 'other',
      preservation: false,
      energy: false,
      rarity: 'R',
      targetCardId: 'basic:3',
    },
  ]
  c.hif = syncHifSchedule(c.hif, initialized)
  assert.deepEqual(c.hif.lessons[0], { enabled: true, type: 'sp', param: 'dance', subParam: 'visual' })
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  saveAppInputs({ deck: [], produceConfig: c }, storage)
  assert.deepEqual(loadAppInputs(storage).produceConfig.hif.schedule, c.hif.schedule)
  assert.equal(loadAppInputs(storage).produceConfig.hif.schedule?.supportEventSkillCardsUpgraded, false)
  assert.equal(
    loadAppInputs(storage).produceConfig.hif.schedule?.steps[9].classSettings.targetCardId,
    'basic:1',
  )
  assert.equal(
    loadAppInputs(storage).produceConfig.hif.schedule?.steps[27].interval.skillActions[0].targetCardId,
    'basic:2',
  )
  assert.equal(
    loadAppInputs(storage).produceConfig.hif.schedule?.steps[9].classSettings.resultCard?.rarity,
    'SSR',
  )
  assert.equal(
    loadAppInputs(storage).produceConfig.hif.schedule?.steps[27].interval.skillActions[0].resultCard?.rarity,
    'SR',
  )
  assert.equal(
    loadAppInputs(storage).produceConfig.hif.schedule?.steps[0].consultation.skillActions[0].targetCardId,
    'basic:0',
  )
  assert.equal(
    loadAppInputs(storage).produceConfig.hif.schedule?.steps[27].interval.skillActions[1].targetCardId,
    'basic:3',
  )
  assert.equal(
    loadAppInputs(storage).produceConfig.hif.schedule?.steps[1].postEventSelection?.resultCard?.rarity,
    'SR',
  )
  assert.equal(
    loadAppInputs(storage).produceConfig.hif.schedule?.simpleEvents.afterSelections[0].targetCardId,
    'basic:1',
  )
})
test('store publishes a partial simulation without evaluation, then evaluates a completed schedule without support cards', () => {
  const original = useAppStore.getState()
  try {
    const c = config()
    c.hif.schedule!.steps[28].action = null
    useAppStore.setState({ produceConfig: c, deck: [], result: null })
    useAppStore.getState().runCalculation()
    assert.equal(useAppStore.getState().result!.simulation!.complete, false)
    assert.equal(useAppStore.getState().result!.evaluation, undefined)
    useAppStore.getState().setHifConfig({ schedule: config().hif.schedule })
    useAppStore.getState().runCalculation()
    assert.equal(useAppStore.getState().result!.simulation!.steps.length, 29)
  } finally {
    useAppStore.setState(original)
  }
})
