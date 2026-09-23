import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ALL_HIF_PUBLIC_LESSON_IDS,
  DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS,
  SKILL_CARD_GAIN_TRIGGER_SETTINGS,
  PARAMETER_SORT_TRIGGER_SETTINGS,
  PARAMETER_SORT_TRIGGER_GROUPS,
  getLessonTriggerCountsForSelection,
  getLessonTriggerCountsForConfig,
  getHifSortLessonParameters,
  getParameterSortTriggerSetting,
  getParameterSortTriggerSettings,
  getSelectedHifMainParameterTotal,
  getSupportCardParameterTotal,
  type HifPublicLessonId,
} from '../src/lib/support-card-parameter-total.ts'
import type { SupportCard } from '../src/types/card.ts'
import type { AbilityCondition, AbilityActivation, AbilityPredicate } from '../src/types/support-ability.ts'
import cardsData from '../data/cards.json'
import { createDefaultHifConfig } from '../src/data/hif.ts'

const testCard: SupportCard = {
  id: 'test-card',
  name: 'テストカード',
  rarity: 'SSR',
  type: 'vocal',
  plan: 'free',
  maxLevel: 60,
  source: 'manual',
  updatedAt: '2026-09-16',
  skills: [
    {
      id: 'initial',
      name: '初期値',
      description: '初期ボーカル上昇+65',
      unlockLevel: 1,
      ability: {
        schemaVersion: 2,
        source: { templateId: 'static.initial_stat', parserVersion: 2 },
        activation: { event: 'static' },
        operations: [
          { op: 'add_stat', stat: 'vo', timing: 'initial', amount: { kind: 'literal', value: 65 } },
        ],
      },
    },
    {
      id: 'conditional',
      name: '条件効果',
      description: '条件達成時、ボーカル上昇+22（プロデュース中4回）',
      unlockLevel: 1,
      ability: {
        schemaVersion: 2,
        source: { templateId: 'skill_card_event.add_stat', parserVersion: 2 },
        activation: { event: 'skill_card_gained' },
        operations: [
          { op: 'add_stat', stat: 'vo', timing: 'activation', amount: { kind: 'literal', value: 22 } },
        ],
        limits: [{ scope: 'produce', max: 4 }],
      },
    },
    {
      id: 'lesson-bonus',
      name: 'レッスンボーナス',
      description: 'ボーカルパラメータボーナス+8.5%',
      unlockLevel: 1,
      ability: {
        schemaVersion: 2,
        source: { templateId: 'static.param_bonus', parserVersion: 2 },
        activation: { event: 'static' },
        operations: [{ op: 'add_param_bonus', target: 'vocal', amount: { kind: 'literal', value: 8.5 } }],
      },
    },
  ],
}

test('H.I.F SP public lesson main parameters total 800 when all rounds are selected', () => {
  assert.equal(getSelectedHifMainParameterTotal(new Set(ALL_HIF_PUBLIC_LESSON_IDS)), 800)
})

test('sort lesson bonus respects normal/SP, main and sub axes, participation and incomplete selections', () => {
  const lessons = createDefaultHifConfig().lessons
  lessons.forEach((lesson) => {
    lesson.enabled = false
  })
  lessons[0] = { ...lessons[0], enabled: true }
  lessons[1] = { ...lessons[1], enabled: true, type: 'sp', param: 'dance', subParam: 'visual' }
  lessons[2] = { ...lessons[2], enabled: true, param: 'visual', subParam: null }
  assert.deepEqual(getHifSortLessonParameters(lessons), { vocal: 50, dance: 90, visual: 50 })
  const vocal = getSupportCardParameterTotal(testCard, lessons)
  assert.equal(vocal.lessonBaseParameter, 50)
  assert.equal(vocal.lessonBonusParameter, 4)
  const all = { ...testCard, skills: [structuredClone(testCard.skills[2])] }
  const operation = all.skills[0].ability.operations[0]
  if (operation.op !== 'add_param_bonus') throw new Error('Expected parameter bonus')
  operation.target = 'visual'
  assert.equal(getSupportCardParameterTotal(all, lessons).lessonBonusParameter, 4)
  operation.target = 'dance'
  assert.equal(getSupportCardParameterTotal(all, lessons).lessonBonusParameter, 7)
  operation.target = 'all'
  assert.equal(getSupportCardParameterTotal(all, lessons).lessonBonusParameter, 16)
  lessons[0].type = 'sp'
  assert.equal(getSupportCardParameterTotal(testCard, lessons).lessonBonusParameter, 5)
  assert.equal(getSupportCardParameterTotal(all, lessons).lessonBonusParameter, 17)
})

test('sort lesson configuration updates total and normal/SP counts while keeping other inputs', () => {
  const lessons = createDefaultHifConfig().lessons
  lessons[0].type = 'sp'
  lessons[1].enabled = false
  lessons[2].subParam = null
  const counts: Record<string, number> = { ...DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS, class_end: 2 }
  const result = getLessonTriggerCountsForConfig(counts, lessons)
  assert.equal(result.lesson_end, 6)
  assert.equal(result['lesson_end:sp'], 1)
  assert.equal(result['lesson_end:normal'], 5)
  assert.equal(result.class_end, 2)
  assert.equal(counts.lesson_end, 8)
})

test('fractional direct, bonus, P-item and event effects are individually floored before summing', () => {
  const card = structuredClone(testCard)
  card.skills[0].ability.operations = [
    { op: 'add_stat', stat: 'vo', timing: 'initial', amount: { kind: 'literal', value: 12.6 } },
    { op: 'add_stat', stat: 'vo', timing: 'initial', amount: { kind: 'literal', value: 12.6 } },
    {
      op: 'modify_support_event_reward',
      rewardKind: 'stat_gain',
      operation: 'add_percent',
      amount: { kind: 'literal', value: 33 },
    },
  ]
  card.skills[1].ability.operations = [
    { op: 'add_stat', stat: 'vo', timing: 'activation', amount: { kind: 'literal', value: 2.6 } },
    { op: 'add_stat', stat: 'vo', timing: 'activation', amount: { kind: 'literal', value: 2.6 } },
  ]
  card.skills[2].ability.operations = [
    { op: 'add_param_bonus', target: 'dance', amount: { kind: 'literal', value: 8.5 } },
    { op: 'add_param_bonus', target: 'dance', amount: { kind: 'literal', value: 9.5 } },
  ]
  card.supportEventRewards = [
    {
      kind: 'p_item',
      name: '小数テスト',
      effect: 'テスト',
      parameterAbility: structuredClone(card.skills[1].ability),
    },
  ]
  card.supportEvents = [
    { unlock: '初期', effect: 'ボーカル上昇+20' },
    { unlock: 'Lv20', effect: 'ボーカル上昇+20' },
  ]
  const lessons = createDefaultHifConfig().lessons
  lessons.forEach((lesson) => {
    lesson.enabled = false
  })
  lessons[0].enabled = true // Da sub +10
  lessons[1] = { ...lessons[1], enabled: true, type: 'sp', param: 'dance', subParam: 'visual' } // Da main +80
  const result = getSupportCardParameterTotal(card, lessons, { skill_card_gained: 3 }, true)
  assert.equal(result.directParameter, 38) // 12 + 12 + floor(2.6*3) + floor(2.6*3)
  assert.equal(result.lessonBonusParameter, 15) // floor(90*8.5%) + floor(90*9.5%)
  assert.equal(result.pItemParameter, 14) // floor(2.6*3) + floor(2.6*3)
  assert.equal(result.eventParameter, 52) // floor(20*1.33) + floor(20*1.33), same axis
  assert.equal(result.total, 119)
})

test('parameter total combines direct effects, explicit trigger limits, and selected H.I.F lesson bonus', () => {
  const selected = new Set<HifPublicLessonId>(['selection-1', 'final-2'])
  const result = getSupportCardParameterTotal(testCard, selected)

  assert.deepEqual(result, {
    directParameter: 153,
    lessonBaseParameter: 200,
    lessonBonusRate: 8.5,
    lessonBonusParameter: 17,
    pItemParameter: 0,
    eventParameter: 0,
    total: 170,
  })
})

test('event parameter includes initial and unlocked event rewards once, excluding non-stat rewards', () => {
  const card: SupportCard = {
    ...testCard,
    skills: [],
    supportEvents: [
      { unlock: '初期', effect: 'ボーカル上昇+10' },
      { unlock: 'Lv20', effect: 'ダンス上昇+20、ビジュアル上昇+5、Pポイント+100、体力回復7' },
      { unlock: 'Lv40', effect: 'スキルカード獲得' },
      { unlock: 'Lv99', effect: 'ボーカル上昇+99' },
    ],
  }
  const result = getSupportCardParameterTotal(card, new Set(), {})
  assert.equal(result.eventParameter, 35)
  assert.equal(result.directParameter, 0)
  assert.equal(result.total, 35)
  assert.equal(getSupportCardParameterTotal(card, new Set(), {}, true).total, 35)
})

test('event parameter applies the maximum-level reward modifier independently of condition counts and P-items', () => {
  const card = (cardsData as SupportCard[]).find(({ id }) => id === 'gkm_0202')!
  const counts = Object.fromEntries(Object.keys(DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS).map((key) => [key, 0]))
  for (const includePItems of [false, true]) {
    const result = getSupportCardParameterTotal(card, new Set(), counts, includePItems)
    assert.equal(result.eventParameter, 40) // Vi20 × (1 + Lv60 event bonus 100%)
    assert.equal(result.total, 40)
    assert.equal(result.pItemParameter, 0)
  }
})

test('configured trigger counts apply to every condition while explicit limits cap them', () => {
  const originalDefaults = {
    lesson_end: 8,
    class_end: 6,
    consultation_selected: 6,
    activity_supply_selected: 5,
    outing_end: 5,
    rest_selected: 4,
    skill_card_gained: 9,
    skill_card_upgraded: 5,
    skill_card_deleted: 5,
    drink_gained: 30,
    consultation_after_drink_trade: 16,
    ...Object.fromEntries(SKILL_CARD_GAIN_TRIGGER_SETTINGS.map(({ key }) => [key, 9])),
  }
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(originalDefaults).map((key) => [key, DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS[key]]),
    ),
    originalDefaults,
  )

  const cardWithUnboundedDrinkGain: SupportCard = {
    ...testCard,
    skills: [
      ...testCard.skills,
      {
        id: 'drink-gain',
        name: 'Pドリンク獲得',
        description: 'Pドリンク獲得時、ボーカル上昇+2',
        unlockLevel: 1,
        ability: {
          schemaVersion: 2,
          source: { templateId: 'item_or_drink_gain.add_stat', parserVersion: 2 },
          activation: { event: 'drink_gained' },
          operations: [
            { op: 'add_stat', stat: 'vo', timing: 'activation', amount: { kind: 'literal', value: 2 } },
          ],
        },
      },
    ],
  }

  const result = getSupportCardParameterTotal(cardWithUnboundedDrinkGain, new Set<HifPublicLessonId>())
  assert.equal(result.directParameter, 213)

  const customCounts = {
    ...DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS,
    skill_card_gained: 2,
    drink_gained: 3,
  }
  const customResult = getSupportCardParameterTotal(
    cardWithUnboundedDrinkGain,
    new Set<HifPublicLessonId>(),
    customCounts,
  )
  assert.equal(customResult.directParameter, 115)
})

test('skill card gain counts are independent for each effect, category, and rarity', () => {
  const cases = [
    ['goodCondition', 'effect_tag_is', 'goodCondition'],
    ['concentration', 'effect_tag_is', 'concentration'],
    ['energy', 'effect_tag_is', 'energy'],
    ['motivation', 'effect_tag_is', 'motivation'],
    ['goodImpression', 'effect_tag_is', 'goodImpression'],
    ['preservation', 'effect_tag_is', 'preservation'],
    ['active', 'card_category_is', 'active'],
    ['mental', 'card_category_is', 'mental'],
    ['SSR', 'card_rarity_is', 'SSR'],
    ['SR', 'card_rarity_is', 'SR'],
    ['R', 'card_rarity_is', 'R'],
  ] as const

  cases.forEach(([suffix, type, value], index) => {
    const key = `skill_card_gained:${suffix}` as const
    const count = index
    const card: SupportCard = {
      ...testCard,
      skills: [
        {
          ...testCard.skills[1],
          ability: {
            ...testCard.skills[1].ability,
            predicate: { type: 'condition', condition: { type, value } as AbilityCondition },
            limits: undefined,
          },
        },
      ],
    }
    const counts = { ...DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS, skill_card_gained: 1, [key]: count }
    assert.equal(getSupportCardParameterTotal(card, new Set(), counts).directParameter, 22 * count, key)

    const cappedCard: SupportCard = {
      ...card,
      skills: [
        { ...card.skills[0], ability: { ...card.skills[0].ability, limits: [{ scope: 'produce', max: 4 }] } },
      ],
    }
    assert.equal(
      getSupportCardParameterTotal(cappedCard, new Set(), counts).directParameter,
      22 * Math.min(count, 4),
      key,
    )
  })
})

test('owned card requirements and combined predicates have independent counts', () => {
  const baseAbility = testCard.skills[1].ability
  const card: SupportCard = {
    ...testCard,
    skills: [
      {
        ...testCard.skills[1],
        ability: {
          ...baseAbility,
          predicate: {
            type: 'condition',
            condition: { type: 'owned_effect_tag_cards_gte', tag: 'concentration', value: 8 },
          },
        },
      },
      {
        ...testCard.skills[1],
        ability: {
          ...baseAbility,
          predicate: {
            type: 'all',
            predicates: [
              { type: 'condition', condition: { type: 'stat_gte', stat: 'vo', value: 400 } },
              { type: 'condition', condition: { type: 'effect_tag_is', value: 'concentration' } },
            ],
          },
        },
      },
    ],
  }
  const counts = {
    ...DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS,
    skill_card_gained: 9,
    'skill_card_gained:concentration': 9,
    [getParameterSortTriggerSetting(card.skills[0].ability).key]: 2,
    [getParameterSortTriggerSetting(card.skills[1].ability).key]: 3,
  }
  assert.equal(getSupportCardParameterTotal(card, new Set(), counts).directParameter, 22 * (2 + 3))
})

test('every non-static activation and complete predicate in current card data has an editable setting', () => {
  const settings = new Map(PARAMETER_SORT_TRIGGER_SETTINGS.map((setting) => [setting.key, setting]))
  assert.equal(settings.size, PARAMETER_SORT_TRIGGER_SETTINGS.length)
  for (const card of cardsData as SupportCard[]) {
    for (const { ability } of card.skills) {
      if (ability.activation.event === 'static') continue
      const { key } = getParameterSortTriggerSetting(ability)
      assert.ok(settings.has(key), `${card.name}: ${key}`)
      assert.ok(Number.isFinite(DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS[key]), key)
      if (ability.operations.some((op) => op.op === 'add_stat' && op.timing === 'activation')) {
        const singleSkillCard = {
          ...card,
          skills: [{ ...card.skills.find((skill) => skill.ability === ability)!, unlockLevel: 1 }],
        }
        assert.equal(
          getSupportCardParameterTotal(singleSkillCard, new Set(), {
            ...DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS,
            [key]: 0,
          }).directParameter,
          0,
          key,
        )
      }
    }
  }
})

test('lesson variants, card mutation events, and other acquisition events use their exact input counts', () => {
  const activations: AbilityActivation[] = [
    { event: 'lesson_end', lessonKind: 'normal', lessonParam: 'vocal' },
    { event: 'lesson_end', lessonKind: 'sp', lessonParam: 'vocal' },
    { event: 'lesson_end', lessonKind: 'sp', lessonParam: 'dance' },
    { event: 'skill_card_customized' },
    { event: 'skill_card_changed' },
    { event: 'exam_end' },
    { event: 'item_gained' },
    { event: 'special_training_started' },
    { event: 'consultation_after_card_trade' },
  ]
  const card: SupportCard = {
    ...testCard,
    skills: activations.map((activation) => ({
      ...testCard.skills[1],
      ability: { ...testCard.skills[1].ability, activation, limits: undefined },
    })),
  }
  const counts = { ...DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS }
  card.skills.forEach(({ ability }, index) => {
    counts[getParameterSortTriggerSetting(ability).key] = index
  })
  assert.equal(
    getParameterSortTriggerSetting(card.skills[1].ability).key,
    getParameterSortTriggerSetting(card.skills[2].ability).key,
  )
  assert.equal(getSupportCardParameterTotal(card, new Set(), counts).directParameter, 22 * 37)
})

test('predicate keys preserve boolean operators and thresholds while ignoring conjunction order', () => {
  const a: AbilityPredicate = { type: 'condition', condition: { type: 'owned_skill_cards_gte', value: 20 } }
  const b: AbilityPredicate = { type: 'condition', condition: { type: 'stat_gte', stat: 'vi', value: 400 } }
  const key = (predicate: AbilityPredicate) =>
    getParameterSortTriggerSetting({ ...testCard.skills[1].ability, predicate }).key
  assert.equal(key({ type: 'all', predicates: [a, b] }), key({ type: 'all', predicates: [b, a] }))
  assert.notEqual(key({ type: 'all', predicates: [a, b] }), key({ type: 'any', predicates: [a, b] }))
  assert.notEqual(key(a), key({ type: 'not', predicate: a }))
  assert.notEqual(key(a), key({ type: 'condition', condition: { type: 'owned_skill_cards_gte', value: 21 } }))
  assert.notEqual(key(b), key({ type: 'condition', condition: { type: 'stat_gte', stat: 'vo', value: 400 } }))
  const synthetic = {
    ...testCard,
    skills: [
      {
        ...testCard.skills[1],
        ability: {
          ...testCard.skills[1].ability,
          predicate: { type: 'any', predicates: [a, b] } as AbilityPredicate,
        },
      },
    ],
  }
  assert.ok(
    getParameterSortTriggerSettings([synthetic]).some(
      (setting) => setting.key === key(synthetic.skills[0].ability.predicate!),
    ),
  )
})

test('lesson inputs combine parameter variants but preserve normal, SP, and additional requirements', () => {
  for (const lessonKind of ['any', 'normal', 'sp'] as const) {
    const keys = ['vocal', 'dance', 'visual', 'any'].map(
      (lessonParam) =>
        getParameterSortTriggerSetting({
          ...testCard.skills[1].ability,
          activation: {
            event: 'lesson_end',
            lessonKind,
            lessonParam: lessonParam as AbilityActivation['lessonParam'],
          },
        }).key,
    )
    assert.equal(new Set(keys).size, 1)
  }
  const lessonSettings = PARAMETER_SORT_TRIGGER_SETTINGS.filter(({ event }) => event === 'lesson_end')
  for (const label of [
    'レッスン',
    'SPレッスン',
    'SPレッスン（スキルカードを20枚以上所持）',
    '通常レッスン',
  ]) {
    assert.ok(lessonSettings.some((setting) => setting.label === label))
  }
  assert.ok(lessonSettings.every(({ label }) => !/ボーカル|ダンス|ビジュアル/.test(label)))
  const consultationGroup = PARAMETER_SORT_TRIGGER_GROUPS.find(({ key }) => key === 'consultation_gain')!
  assert.equal(consultationGroup.label, '相談で獲得')
  assert.deepEqual(
    consultationGroup.settings.map(({ label }) => label),
    ['相談でPドリンク獲得', '相談でスキルカード獲得'],
  )
})

test('stat thresholds use independent axis counts for both support skills and P items', () => {
  for (const type of ['stat_gte', 'stat_lte'] as const) {
    const abilities = (['vo', 'da', 'vi'] as const).map((stat) => ({
      ...testCard.skills[1].ability,
      predicate: { type: 'condition', condition: { type, stat, value: 400 } } as AbilityPredicate,
      limits: undefined,
    }))
    const settings = abilities.map(getParameterSortTriggerSetting)
    assert.equal(new Set(settings.map(({ key }) => key)).size, 3)
    settings.forEach(({ label }, index) =>
      assert.ok(label.includes(`${['Vo', 'Da', 'Vi'][index]}${type === 'stat_gte' ? '≥' : '≤'}400`)),
    )
    const counts = { ...DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS }
    settings.forEach(({ key }, index) => {
      counts[key] = index
    })
    abilities.forEach((ability, index) => {
      const card = {
        ...testCard,
        skills: [{ ...testCard.skills[1], ability }],
        supportEventRewards: [
          { kind: 'p_item' as const, name: 'test item', effect: '', parameterAbility: ability },
        ],
      }
      const result = getSupportCardParameterTotal(card, new Set(), counts, true)
      assert.equal(result.directParameter, 22 * index)
      assert.equal(result.pItemParameter, 22 * index)
    })
  }
})

test('checkbox selection updates every lesson input without changing other manually entered counts', () => {
  const counts = {
    ...DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS,
    lesson_end: 12,
    'lesson_end:sp': 3,
    class_end: 2,
  }
  for (const ids of [[], ['selection-1', 'selection-2', 'final-1'], ALL_HIF_PUBLIC_LESSON_IDS]) {
    const next = getLessonTriggerCountsForSelection(counts, new Set(ids as HifPublicLessonId[]))
    PARAMETER_SORT_TRIGGER_SETTINGS.filter(({ event }) => event === 'lesson_end').forEach(({ key }) =>
      assert.equal(next[key], ids.length),
    )
    assert.equal(next.class_end, 2)
  }
  assert.equal(counts.lesson_end, 12)
})
