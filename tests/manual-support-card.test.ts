import assert from 'node:assert/strict'
import { test } from 'node:test'
import cardsData from '../data/cards.json'
import type { DeckCard, SupportCard } from '../src/types/card.ts'
import { getAbilityConditions, getAbilityLimit, resolveOperationValue } from '../src/lib/support-ability.ts'
import { getCardEventTriggerOptions, getSkillTriggerContext } from '../src/lib/utils.ts'
import {
  getParameterSortTriggerSetting,
  PARAMETER_SORT_TRIGGER_SETTINGS,
  getSupportCardParameterTotal,
} from '../src/lib/support-card-parameter-total.ts'
import {
  DEFAULT_PRODUCE_CONFIG,
  getNextDeckCardLevel,
  normalizeDeckCardLevel,
} from '../src/store/produce-config.ts'
import { useAppStore } from '../src/store/index.ts'
import { getCardContributions } from '../src/lib/calculator/support-card-contributions.ts'
import { calcHif } from '../src/lib/calculator/hif.ts'

const cards = cardsData as SupportCard[]
const card = cards.find((card) => card.name === 'もうすぐ本番ですね')!
const deck: DeckCard[] = [{ card, level: 60, isRental: false }]
const basic = card.skills.find((skill) => skill.id === 'basic-change')!.ability
const exam = card.skills.find((skill) => skill.id === 'exam-cards-15')!.ability
const pItem = card.supportEventRewards![0].parameterAbility!

test('manual card preserves all six screenshot values at every five-level step from Lv40 to Lv60', () => {
  assert.equal(card.rarity, 'SSR')
  assert.equal(card.type, 'visual')
  assert.equal(card.plan, 'free')
  assert.deepEqual(card.availableLevels, [40, 45, 50, 55, 60])
  for (const [level, expected] of [
    [40, [6, 5, 66.1, 27, 26, 50]],
    [45, [7, 5, 74.6, 27, 26, 75]],
    [50, [8, 7, 83.1, 27, 26, 75]],
    [55, [9, 7, 91.5, 39, 26, 75]],
    [60, [9, 7, 100, 39, 37, 100]],
  ] as const) {
    assert.deepEqual(
      card.skills.map((skill) => resolveOperationValue(skill.ability, skill.ability.operations[0], level)),
      expected,
    )
  }
  card.skills.forEach((skill) => {
    assert.equal(resolveOperationValue(skill.ability, skill.ability.operations[0], 35), 0)
    assert.equal(skill.unlockLevel, 40)
    assert.deepEqual(
      skill.ability.curves?.primary.points.map((point) => point.lv),
      [40, 45, 50, 55, 60],
    )
  })
  assert.equal(new Set(cards.map((card) => card.id)).size, cards.length)
  assert.equal(card.imageUrl, 'local:Support/converted/SSR/gkm_0202.webp')
})

test('basic-name card change and 15-owned-card exam conditions keep distinct complete settings and caps', () => {
  assert.equal(basic.activation.event, 'skill_card_changed')
  assert.deepEqual(getAbilityConditions(basic), [{ type: 'card_name_contains', value: '基本' }])
  assert.equal(getAbilityLimit(basic, 'produce'), 3)
  assert.equal(exam.activation.event, 'exam_end')
  assert.deepEqual(getAbilityConditions(exam), [{ type: 'owned_skill_cards_gte', value: 15 }])
  assert.equal(getAbilityLimit(exam, 'produce'), 5)
  for (const spec of [basic, exam]) {
    const setting = getParameterSortTriggerSetting(spec)
    assert.ok(PARAMETER_SORT_TRIGGER_SETTINGS.some((entry) => entry.key === setting.key))
    assert.ok(getCardEventTriggerOptions([card]).some((entry) => entry.key === setting.key))
    assert.equal(getSkillTriggerContext(spec).key, setting.key)
  }
  assert.notEqual(getParameterSortTriggerSetting(basic).key, getParameterSortTriggerSetting(pItem).key)
})

test('general card changes and unconditional exams never activate the new conditional abilities', () => {
  const config = structuredClone(DEFAULT_PRODUCE_CONFIG)
  config.eventTriggerCounts = { skill_card_changed: 9, 'skill_card_changed:any': 9, exam_end: 5 }
  assert.deepEqual(getCardContributions(deck, config)[0].total, { vo: 0, da: 0, vi: 0 })
  config.eventTriggerCounts[getParameterSortTriggerSetting(basic).key] = 10
  config.eventTriggerCounts[getParameterSortTriggerSetting(exam).key] = 10
  assert.deepEqual(getCardContributions(deck, config)[0].total, { vo: 0, da: 0, vi: 302 })
  assert.equal(getSupportCardParameterTotal(card, new Set(), config.eventTriggerCounts).directParameter, 302)
})

test('HIF separates card gains, screenshot P-item gains and level-specific post-event reward', () => {
  const config = structuredClone(DEFAULT_PRODUCE_CONFIG)
  config.hif.parameterBonusLevels = { vo: 0, da: 0, vi: 0 }
  config.hif.selectionExams.forEach((exam) => {
    exam.useScoreCap = false
  })
  config.idolBaseStats = { vo: 0, da: 0, vi: 0 }
  config.hif.lessons.forEach((entry) => {
    entry.enabled = false
  })
  config.hif.classes.forEach((entry) => {
    entry.enabled = false
  })
  config.eventTriggerCounts = {
    [getParameterSortTriggerSetting(basic).key]: 10,
    [getParameterSortTriggerSetting(exam).key]: 10,
    [getParameterSortTriggerSetting(pItem).key]: 10,
  }
  assert.equal(calcHif(deck, config).finalStats.vi, 302)
  config.hif.includePItems = true
  assert.equal(calcHif(deck, config).finalStats.vi, 377)
  config.postEventEnabledSlots![0] = true
  assert.equal(calcHif(deck, config).finalStats.vi, 417)
  for (const [level, expected] of [
    [40, 316],
    [45, 321],
    [50, 321],
    [55, 357],
    [60, 417],
  ]) {
    assert.equal(calcHif([{ card, level, isRental: false }], config).finalStats.vi, expected, `Lv${level}`)
  }
  assert.equal(pItem.activation.event, 'skill_card_changed')
  assert.deepEqual(getAbilityConditions(pItem), [{ type: 'stat_gte', stat: 'vi', value: 400 }])
  assert.equal(getAbilityLimit(pItem, 'produce'), 3)
})

test('all five verified levels remain selectable and level cycling includes Lv55', () => {
  assert.equal(normalizeDeckCardLevel(40, 60, card.availableLevels), 40)
  assert.equal(normalizeDeckCardLevel(55, 60, card.availableLevels), 55)
  assert.equal(normalizeDeckCardLevel(35, 60, card.availableLevels), 40)
  assert.equal(normalizeDeckCardLevel(40, 60), 40)
  useAppStore.setState({ deck })
  useAppStore.getState().setCardLevel(0, 40)
  assert.equal(useAppStore.getState().deck[0].level, 40)
  useAppStore.getState().setCardLevel(0, 55)
  assert.equal(useAppStore.getState().deck[0].level, 55)
  let current = 60
  const sequence = []
  for (let i = 0; i < 5; i++) {
    current = getNextDeckCardLevel(current, 60, card.availableLevels)
    sequence.push(current)
  }
  assert.deepEqual(sequence, [40, 45, 50, 55, 60])
  assert.equal(getNextDeckCardLevel(50, 60), 55)
  assert.equal(getNextDeckCardLevel(60, 60, [60]), 60)
})
