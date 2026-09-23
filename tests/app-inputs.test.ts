import assert from 'node:assert/strict'
import { test } from 'node:test'
import cardsData from '../data/cards.json'
import type { SupportCard } from '../src/types/card.ts'
import { APP_INPUTS_KEY, loadAppInputs, saveAppInputs } from '../src/store/app-inputs.ts'
import { DEFAULT_PRODUCE_CONFIG } from '../src/store/produce-config.ts'
import { readStoredInput, writeStoredInput } from '../src/lib/input-storage.ts'
import {
  getInitialParameterSortTriggerCounts,
  getProduceEventTriggerCounts,
  getScheduleSortLessons,
} from '../src/lib/produce-event-trigger-counts.ts'
import { PARAMETER_SORT_TRIGGER_SETTINGS } from '../src/lib/support-card-parameter-total.ts'
import { HIF_SCHEDULE } from '../src/data/hif-schedule.ts'
import { normalizeHifSchedule } from '../src/lib/hif-schedule.ts'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}
const catalog = cardsData as SupportCard[]

test('all HIF Produce inputs, deck levels and post events survive a storage round trip', () => {
  const storage = memoryStorage()
  const config = structuredClone(DEFAULT_PRODUCE_CONFIG)
  config.memoryBaseStats = { vo: 12, da: 34, vi: 56 }
  config.memoryLessonBonus = { vo: 2.5, da: 0, vi: 4 }
  config.hif.carryoverSkillCards[0] = {
    enabled: true,
    acquireOnDayOne: false,
    rarity: 'SR',
    category: 'active',
    skillKind: 'type_b',
    preservation: false,
    energy: true,
    upgraded: true,
  }
  config.hif.selectionExams[1] = {
    useScoreCap: false,
    totalScore: 72000,
    vocalBoundary: 50,
    visualBoundary: 87.5,
    deletedBasicCardIds: ['basic:2', 'basic:5'],
  }
  config.hif.lessons[2].enabled = false
  config.hif.classes[1].param = 'visual'
  config.hif.parameterBonusLevels.vi = 5
  config.hif.starPowerAffinityBonus = false
  config.hif.includePItems = true
  config.hif.schedule!.customPItem = { color: 'yellow', mascot: 'robo', decoration: 'flower' }
  config.hif.schedule!.steps[0].supplySkillCard.upgraded = true
  config.postEventEnabledSlots = [true, false, false, false, false, false]
  config.eventTriggerCounts = { outing_end: 3, drink_gained: 0 }
  const inputs = {
    deck: [{ card: catalog.find(({ id }) => id === 'gkm_0202')!, level: 55, isRental: false }],
    produceConfig: config,
  }
  saveAppInputs(inputs, storage)
  // Loading normalizes schedule selections.
  assert.deepEqual(loadAppInputs(storage), {
    ...inputs,
    produceConfig: {
      ...config,
      hif: { ...config.hif, schedule: normalizeHifSchedule(config.hif.schedule) },
    },
  })
  assert.ok(!storage.getItem(APP_INPUTS_KEY)!.includes('schemaVersion'))
  assert.strictEqual(loadAppInputs(storage).deck[0].card, inputs.deck[0].card)
})
test('custom P item drinks are included in schedule-derived support-sort conditions', () => {
  const red = structuredClone(DEFAULT_PRODUCE_CONFIG)
  const yellow = structuredClone(DEFAULT_PRODUCE_CONFIG)
  for (const config of [red, yellow])
    config.hif.schedule!.steps.forEach((step, index) => {
      step.action = HIF_SCHEDULE[index].actions[0]
      if (step.action === 'outing') {
        step.outing.skillCards = [
          { category: 'active', skillKind: 'other', preservation: false, energy: false, rarity: 'R' },
          { category: 'active', skillKind: 'other', preservation: false, energy: false, rarity: 'R' },
        ]
      }
    })
  red.hif.schedule!.customPItem = { color: 'red', mascot: 'girl', decoration: 'flower' }
  yellow.hif.schedule!.customPItem = { color: 'yellow', mascot: 'robo', decoration: 'flower' }
  const redCounts = getProduceEventTriggerCounts(red)
  const yellowCounts = getProduceEventTriggerCounts(yellow)
  assert.equal(yellowCounts.drink_gained - redCounts.drink_gained, 10)
  assert.equal(yellowCounts.item_gained, 3)
})
test('consultation drink sort conditions use the four or eight exchange limit', () => {
  const config = structuredClone(DEFAULT_PRODUCE_CONFIG)
  config.hif.schedule!.steps[0].action = 'consultation'
  config.hif.schedule!.steps[0].consultation.pDrinkCount = 12
  assert.equal(getProduceEventTriggerCounts(config).consultation_after_drink_trade, 4)
  config.hif.schedule!.steps[0].consultation.resetUsed = true
  assert.equal(getProduceEventTriggerCounts(config).consultation_after_drink_trade, 8)
})

test('restoration uses current catalog, drops removed cards and aligns post events with retained entries', () => {
  const storage = memoryStorage()
  storage.setItem(
    APP_INPUTS_KEY,
    JSON.stringify({
      version: 2,
      deck: [
        { cardId: 'removed', level: 60 },
        { cardId: 'gkm_0202', level: 53 },
      ],
      produceConfig: { postEventEnabledSlots: [false, true] },
    }),
  )
  const restored = loadAppInputs(storage)
  assert.equal(restored.deck.length, 1)
  assert.equal(restored.deck[0].card.id, 'gkm_0202')
  assert.equal(restored.deck[0].level, 55)
  assert.equal(restored.produceConfig.postEventEnabledSlots![0], true)
  assert.equal(restored.produceConfig.hif.selectionExams.length, 3)
})

test('an incomplete lesson selection remains incomplete after site revisit', () => {
  const storage = memoryStorage()
  const inputs = loadAppInputs(storage)
  inputs.produceConfig.hif.lessons[0].param = null
  inputs.produceConfig.hif.lessons[0].subParam = null
  inputs.produceConfig.hif.lessons[1].param = 'visual'
  inputs.produceConfig.hif.lessons[1].subParam = null
  saveAppInputs(inputs, storage)
  const restored = loadAppInputs(storage)
  assert.equal(restored.produceConfig.hif.lessons[0].param, null)
  assert.equal(restored.produceConfig.hif.lessons[0].subParam, null)
  assert.equal(restored.produceConfig.hif.lessons[1].param, 'visual')
  assert.equal(restored.produceConfig.hif.lessons[1].subParam, null)
})

test('invalid, incompatible and blocked storage fall back safely while partial settings retain new defaults', () => {
  const storage = memoryStorage()
  for (const raw of ['bad json', 'null', JSON.stringify({ version: 1 }), JSON.stringify({ version: 99 })]) {
    storage.setItem(APP_INPUTS_KEY, raw)
    assert.deepEqual(loadAppInputs(storage).produceConfig, DEFAULT_PRODUCE_CONFIG)
  }
  storage.setItem(
    APP_INPUTS_KEY,
    JSON.stringify({
      version: 2,
      produceConfig: {
        idolId: 'removed',
        memoryBaseStats: { vo: 42, da: 'bad' },
        eventTriggerCounts: { drink_gained: 0, outing_end: -2, bad: 'oops' },
        hif: { starPower: 9999, classes: [{ param: 'bad' }] },
      },
    }),
  )
  const restored = loadAppInputs(storage).produceConfig
  assert.deepEqual(restored.memoryBaseStats, { vo: 42, da: 0, vi: 0 })
  assert.deepEqual(restored.eventTriggerCounts, { drink_gained: 0, outing_end: 0 })
  assert.equal(restored.hif.starPower, 1335)
  assert.equal(restored.hif.starPowerAffinityBonus, true)
  assert.equal(restored.hif.classes[0].param, 'vocal')
  const blocked = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('full')
    },
  }
  assert.deepEqual(loadAppInputs(blocked).produceConfig, DEFAULT_PRODUCE_CONFIG)
  assert.doesNotThrow(() => saveAppInputs(loadAppInputs(storage), blocked))
})

test('UI inputs preserve search strings, filters, selected cards and explicit false values', () => {
  const storage = memoryStorage()
  for (const [key, value] of [
    ['search', 'もうすぐ'],
    ['details', false],
    ['cards', ['id1', 'id1']],
  ] as const) {
    writeStoredInput(key, value, storage)
    assert.deepEqual(readStoredInput(key, value, storage), value)
  }
  writeStoredInput('plans', new Set(['sense', 'free']), storage)
  assert.deepEqual(readStoredInput('plans', new Set<string>(), storage), new Set(['sense', 'free']))
  storage.setItem('gakumas-input:plans', '{bad')
  assert.deepEqual(readStoredInput('plans', new Set<string>(), storage), new Set())
})

test('empty schedules initialize every support-sort condition to zero without writing back', () => {
  const config = structuredClone(DEFAULT_PRODUCE_CONFIG)
  config.eventTriggerCounts = { outing_end: 4, 'skill_card_gained:SSR': 0, drink_gained: 12 }
  const initial = getInitialParameterSortTriggerCounts(config)
  assert.equal(initial.outing_end, 0)
  assert.equal(initial['skill_card_gained:SSR'], 0)
  assert.equal(initial.drink_gained, 0)
  assert.ok(Object.values(initial).every((count) => count === 0))
  initial.drink_gained = 30
  assert.equal(config.eventTriggerCounts.drink_gained, 12)
  assert.equal(getInitialParameterSortTriggerCounts(config).drink_gained, 0)
})

test('HIF sort initial values come from the confirmed schedule and unknown conditions remain zero', () => {
  const config = structuredClone(DEFAULT_PRODUCE_CONFIG)
  const steps = config.hif.schedule!.steps
  steps[0].action = 'consultation'
  steps[0].consultation.pDrinkCount = 2
  steps[0].consultation.skillActions = [
    {
      kind: 'gain',
      category: 'active',
      skillKind: 'type_a',
      energy: false,
      preservation: false,
      rarity: 'SSR',
    },
    {
      kind: 'upgrade',
      category: 'mental',
      skillKind: 'other',
      energy: false,
      preservation: false,
      rarity: 'R',
    },
  ]
  steps[1] = { ...steps[1], action: 'lesson', lessonType: 'sp', param: 'dance', subParam: 'visual' }
  steps[2].action = 'class'
  steps[2].classSettings.action = 'gain'
  steps[3] = { ...steps[3], action: 'lesson', lessonType: 'normal', param: 'vocal', subParam: 'dance' }
  steps[4].action = 'outing'
  steps[4].outing.skillCards = [
    { category: 'active', skillKind: 'other', preservation: false, energy: false, rarity: 'R' },
    { category: 'active', skillKind: 'other', preservation: false, energy: false, rarity: 'R' },
  ]
  const counts = getInitialParameterSortTriggerCounts(config)
  assert.equal(counts.lesson_end, 2)
  assert.equal(counts['lesson_end:sp'], 1)
  assert.equal(counts['lesson_end:normal'], 1)
  assert.equal(counts.class_end, 1)
  assert.equal(counts.consultation_selected, 1)
  assert.equal(counts.outing_end, 1)
  assert.equal(counts.exam_end, 0)
  assert.equal(counts.drink_gained, 3)
  assert.equal(counts.consultation_after_drink_trade, 2)
  assert.equal(counts.consultation_after_card_trade, 2)
  assert.equal(counts.skill_card_gained, 4)
  assert.equal(counts['skill_card_gained:SSR'], 1)
  assert.equal(counts['skill_card_gained:active'], 4)
  PARAMETER_SORT_TRIGGER_SETTINGS.filter(({ key }) => key.includes(':condition:')).forEach(({ key }) =>
    assert.equal(counts[key], 0, key),
  )
  assert.deepEqual(
    getScheduleSortLessons(config)
      .map(({ enabled, type, param, subParam }) => ({ enabled, type, param, subParam }))
      .slice(0, 3),
    [
      { enabled: true, type: 'sp', param: 'dance', subParam: 'visual' },
      { enabled: true, type: 'normal', param: 'vocal', subParam: 'dance' },
      { enabled: false, type: 'normal', param: null, subParam: null },
    ],
  )
  assert.deepEqual(counts, getProduceEventTriggerCounts(config))
})
