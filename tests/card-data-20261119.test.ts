import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import cardsData from '../data/cards.json'
import pending from '../data/pending-card-images.json'
import { IDOLS, findIdolVersion } from '../src/data/idols.ts'
import type { SupportCard } from '../src/types/card.ts'
import { getPrimaryAbilityValue, getAbilityConditions, getAbilityLimit } from '../src/lib/support-ability.ts'
import { getIdolProgression } from '../src/lib/idol-progression.ts'
import { useAppStore } from '../src/store/index.ts'

const cards = cardsData as SupportCard[]

test('Kanae R SR SSR costumes retain Wiki maxima and can be selected as the new character', () => {
  const kanae = IDOLS.find((i) => i.id === 'kanae')!
  assert.ok(kanae)
  assert.equal(kanae.lastName + kanae.firstName, '氷渡香名江')
  for (const [rarity, stats, bonus, effect] of [
    ['r', { vo: 85, da: 85, vi: 95 }, { vo: 20, da: 8, vi: 22 }, 'concentration'],
    ['sr', { vo: 90, da: 90, vi: 100 }, { vo: 22, da: 9, vi: 25 }, 'goodCondition'],
    ['ssr', { vo: 95, da: 95, vi: 105 }, { vo: 22, da: 12, vi: 25 }, 'concentration'],
  ] as const) {
    const version = findIdolVersion('kanae', `kanae-${rarity}-sense1`)!
    assert.equal(version.plan, 'sense')
    assert.equal(version.recommendedEffect, effect)
    assert.equal(version.releaseDate, '2026/11/16')
    assert.deepEqual(version.baseStats, stats)
    assert.deepEqual(version.lessonBonus, bonus)
    assert.deepEqual(version.hifTrueStats, { vo: 0, da: 0, vi: 0 })
    assert.deepEqual(version.hifTrueLessonBonus, { vo: 0, da: 0, vi: 0 })
    const lower = getIdolProgression(version, 2)
    assert.deepEqual(lower.idolLessonBonus, { vo: bonus.vo - 3, da: bonus.da, vi: bonus.vi - 5 })
  }
  const previous = useAppStore.getState()
  try {
    useAppStore.getState().setIdol('kanae', 'kanae-r-sense1')
    useAppStore.getState().setVersion('kanae-ssr-sense1')
    assert.equal(useAppStore.getState().produceConfig.idolId, 'kanae')
    assert.equal(useAppStore.getState().produceConfig.idolVersionId, 'kanae-ssr-sense1')
  } finally {
    useAppStore.setState(previous, true)
  }
})

test('three new supports retain every Wiki level value including the lower SP rate of the album card', () => {
  const expected: Record<string, number[][]> = {
    gkm_0212: [
      [52, 55, 59, 62, 65],
      [14, 14, 21, 21, 21],
      [66.1, 74.6, 83.1, 91.5, 100],
      [9, 9, 9, 9, 12],
      [3, 3, 3, 5, 5],
      [50, 75, 75, 75, 100],
    ],
    gkm_0213: [
      [4.4, 4.9, 5.4, 5.9, 6.4],
      [3, 5, 5, 5, 5],
      [59.2, 69.4, 79.6, 89.8, 100],
      [7, 7, 7, 7, 13],
      [8, 8, 8, 16, 16],
      [50, 50, 75, 75, 100],
    ],
    gkm_0214: [
      [52, 55, 59, 62, 65],
      [21, 21, 28, 28, 28],
      [66.1, 74.6, 83.1, 91.5, 100],
      [13, 13, 13, 17, 17],
      [16, 16, 16, 16, 22],
      [50, 75, 75, 75, 100],
    ],
  }
  for (const [id, values] of Object.entries(expected)) {
    const card = cards.find((c) => c.id === id)!
    assert.ok(card)
    assert.equal(card.skills.length, 6)
    assert.equal(card.plan, 'sense')
    const levels = Array.from({ length: 5 }, (_, i) => card.maxLevel - 20 + i * 5)
    assert.deepEqual(
      card.skills.map((s) => levels.map((lv) => getPrimaryAbilityValue(s.ability, lv))),
      values,
    )
  }
})

test('new P-item rewards retain stat thresholds, effect tags and produce limits', () => {
  for (const [id, name, event, value, limit] of [
    ['gkm_0212', '仲良しアルバム', 'activity_supply_selected', 20, 2],
    ['gkm_0213', 'お掃除の成果', 'class_end', 15, 1],
    ['gkm_0214', 'お嬢様おでかけセット', 'skill_card_gained', 20, 3],
  ] as const) {
    const reward = cards.find((c) => c.id === id)!.supportEventRewards!.find((r) => r.name === name)!
    assert.equal(reward.kind, 'p_item')
    assert.equal(reward.parameterAbility!.activation.event, event)
    assert.equal(getPrimaryAbilityValue(reward.parameterAbility!, 60), value)
    assert.equal(getAbilityLimit(reward.parameterAbility!, 'produce'), limit)
  }
  const reward = cards.find((c) => c.id === 'gkm_0214')!.supportEventRewards![0]
  assert.deepEqual(getAbilityConditions(reward.parameterAbility!), [
    { type: 'effect_tag_is', value: 'concentration' },
    { type: 'stat_gte', stat: 'vo', value: 900 },
  ])
})

test('all seven new user images are bundled and no images remain pending', () => {
  assert.deepEqual(pending, { idols: [], supportCards: [] })
  for (const id of ['kanae-r-sense1', 'kanae-sr-sense1', 'kanae-ssr-sense1']) {
    const version = findIdolVersion('kanae', id)!
    assert.ok(existsSync(`assets/game/PIdol/converted/${version.rarity}/${id}.webp`))
  }
  for (const id of ['gkm_0212', 'gkm_0213', 'gkm_0214', 'gkm_0215']) {
    const card = cards.find((c) => c.id === id)!
    assert.ok(existsSync('assets/game/' + card.imageUrl!.slice(6)))
  }
})

test('Otsukae support exactly matches all six confirmed Lv40 screenshot values and event rewards', () => {
  const card = cards.find((c) => c.id === 'gkm_0215')!
  assert.equal(card.name, 'お仕え前の準備運動')
  assert.equal(card.rarity, 'R')
  assert.equal(card.type, 'visual')
  assert.equal(card.plan, 'free')
  assert.equal(card.maxLevel, 40)
  assert.equal(card.releaseDate, undefined)
  assert.deepEqual(
    card.skills.map((s) => getPrimaryAbilityValue(s.ability, 40)),
    [4.3, 20, 100, 3, 9, 100],
  )
  assert.deepEqual(card.skills[2].ability.operations[0], {
    op: 'add_support_rate',
    supportKind: 'skill_card',
    amount: { kind: 'curve', curveId: 'primary' },
  })
  assert.deepEqual(card.skills[3].ability.activation, {
    event: 'lesson_end',
    lessonKind: 'any',
    lessonParam: 'visual',
  })
  assert.deepEqual(card.skills[4].ability.activation, { event: 'consultation_selected' })
  assert.deepEqual(card.supportEvents, [
    { unlock: '初期', effect: 'ビジュアル上昇+10' },
    { unlock: 'Lv20', effect: 'Pポイント+10' },
  ])
  assert.deepEqual(card.supportEventRewards, [])
})

test('Otsukae lower-level provisional curves use R progression and keep event bonus locked at Lv20', () => {
  const card = cards.find((c) => c.id === 'gkm_0215')!
  const levels = [20, 25, 30, 35, 40]
  assert.deepEqual(
    levels.map((lv) => getPrimaryAbilityValue(card.skills[0].ability, lv)),
    [2.8, 3.2, 3.6, 4, 4.3],
  )
  assert.deepEqual(
    levels.map((lv) => getPrimaryAbilityValue(card.skills[1].ability, lv)),
    [20, 20, 20, 20, 20],
  )
  assert.deepEqual(
    levels.map((lv) => getPrimaryAbilityValue(card.skills[2].ability, lv)),
    [48.7, 61.5, 74.4, 87.2, 100],
  )
  assert.deepEqual(
    levels.map((lv) => getPrimaryAbilityValue(card.skills[3].ability, lv)),
    [1, 1, 1, 1, 3],
  )
  assert.deepEqual(
    levels.map((lv) => getPrimaryAbilityValue(card.skills[4].ability, lv)),
    [5, 5, 9, 9, 9],
  )
  assert.equal(card.skills[5].unlockLevel, 21)
  assert.deepEqual(
    [25, 30, 35, 40].map((lv) => getPrimaryAbilityValue(card.skills[5].ability, lv)),
    [50, 50, 75, 100],
  )
})
