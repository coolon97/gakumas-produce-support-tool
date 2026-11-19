import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import cardsData from '../data/cards.json'
import pendingImages from '../data/pending-card-images.json'
import { IDOLS, findIdolVersion } from '../src/data/idols.ts'
import type { SupportCard } from '../src/types/card.ts'
import { getAbilityConditions, getAbilityLimit, getPrimaryAbilityValue } from '../src/lib/support-ability.ts'
import { evaluateHifPredicate } from '../src/lib/calculator/hif-simulation-abilities.ts'
import { createInitialProduceState } from '../src/lib/calculator/hif-simulation-state.ts'
import { DEFAULT_PRODUCE_CONFIG, getNextDeckCardLevel } from '../src/store/produce-config.ts'
import { getParameterSortTriggerSetting } from '../src/lib/support-card-parameter-total.ts'

const cards = cardsData as SupportCard[]
test('November Wiki delta adds five costumes and five supports with bundled user images', () => {
  assert.ok(IDOLS.flatMap((i) => i.versions).length >= 160)
  assert.ok(cards.length >= 211)
  const addedIdols = [
    'saki-ssr-logic5',
    'sena-ssr-sense3',
    'tsubame-ssr-anomaly2',
    'china-ssr-anomaly2',
    'misuzu-ssr-logic4',
  ]
  const addedSupports = ['gkm_0207', 'gkm_0208', 'gkm_0209', 'gkm_0210', 'gkm_0211']
  assert.ok(addedIdols.every((id) => !pendingImages.idols.includes(id)))
  assert.ok(addedSupports.every((id) => !pendingImages.supportCards.includes(id)))
  for (const id of addedIdols) {
    const version = IDOLS.flatMap((i) => i.versions).find((v) => v.id === id)!
    assert.ok(version)
    assert.ok(existsSync(`assets/game/PIdol/converted/${version.rarity}/${id}.webp`))
  }
  for (const id of addedSupports) {
    const card = cards.find((c) => c.id === id)!
    assert.ok(card)
    assert.equal(card.skills.length, 6)
    assert.ok(existsSync(`assets/game/${card.imageUrl!.slice(6)}`))
    const levels = card.availableLevels ?? [
      card.maxLevel - 20,
      card.maxLevel - 15,
      card.maxLevel - 10,
      card.maxLevel - 5,
      card.maxLevel,
    ]
    for (const skill of card.skills)
      for (const level of levels)
        assert.ok(
          skill.ability.curves?.primary.points.some((p) => p.lv === level),
          `${id} ${skill.id} ${level}`,
        )
  }
  assert.equal(findIdolVersion('saki', 'saki-ssr-logic5')!.recommendedEffect, 'motivation')
  assert.equal(findIdolVersion('sena', 'sena-ssr-sense3')!.recommendedEffect, 'concentration')
  assert.equal(findIdolVersion('misuzu', 'misuzu-ssr-logic4')!.recommendedEffect, 'goodImpression')
})

test('provisional missing-level values follow matching unlock-level curves and enable all five levels', () => {
  const sr = cards.find((c) => c.id === 'gkm_0207')!
  const ssr = cards.find((c) => c.id === 'gkm_0208')!
  const existing = cards.find((c) => c.id === 'gkm_0121')!
  assert.deepEqual(
    existing.skills.map((s) => getPrimaryAbilityValue(s.ability, 50)),
    [59, 28, 83.1, 3, 15, 75],
  )
  assert.equal(sr.availableLevels, undefined)
  assert.equal(ssr.availableLevels, undefined)
  const srLevels = [30, 35, 40, 45, 50]
  const ssrLevels = [40, 45, 50, 55, 60]
  assert.deepEqual(
    srLevels.map((lv) => getNextDeckCardLevel(lv, 50, sr.availableLevels)),
    [35, 40, 45, 50, 30],
  )
  assert.deepEqual(
    ssrLevels.map((lv) => getNextDeckCardLevel(lv, 60, ssr.availableLevels)),
    [45, 50, 55, 60, 40],
  )
  assert.deepEqual(
    srLevels.map((lv) => getPrimaryAbilityValue(sr.skills[3].ability, lv)),
    [13, 13, 13, 13, 26],
  )
  assert.deepEqual(
    srLevels.map((lv) => getPrimaryAbilityValue(sr.skills[4].ability, lv)),
    [8, 8, 8, 16, 16],
  )
  assert.deepEqual(
    ssrLevels.map((lv) => getPrimaryAbilityValue(ssr.skills[4].ability, lv)),
    [17, 17, 17, 17, 24],
  )
})

test('Tsubame HIF True End is included once in every costume, including older pages without its row', () => {
  const tsubame = IDOLS.find((i) => i.id === 'tsubame')!
  assert.equal(tsubame.versions.length, 6)
  for (const v of tsubame.versions) {
    assert.deepEqual(v.hifTrueStats, { vo: 10, da: 10, vi: 10 })
    assert.deepEqual(v.hifTrueLessonBonus, { vo: 1, da: 3, vi: 3 })
  }
  assert.deepEqual(findIdolVersion('tsubame', 'tsubame-r-anomaly1')!.baseStats, { vo: 115, da: 140, vi: 110 })
  assert.deepEqual(findIdolVersion('tsubame', 'tsubame-ssr-anomaly1')!.baseStats, {
    vo: 125,
    da: 150,
    vi: 120,
  })
})

test('new P-item requires a logic card and Vo900; free and unknown plans cannot activate it', () => {
  const card = cards.find((c) => c.id === 'gkm_0211')!
  const ability = card.supportEventRewards!.find((r) => r.name === '過激め？チョイス')!.parameterAbility!
  assert.equal(ability.activation.event, 'skill_card_gained')
  assert.deepEqual(getAbilityConditions(ability), [
    { type: 'card_plan_is', value: 'logic' },
    { type: 'stat_gte', stat: 'vo', value: 900 },
  ])
  assert.equal(getAbilityLimit(ability, 'produce'), 2)
  assert.equal(getPrimaryAbilityValue(ability, 60), 25)
  assert.match(getParameterSortTriggerSetting(ability).label, /ロジックのカード/)
  const state = createInitialProduceState(DEFAULT_PRODUCE_CONFIG).snapshot
  const skill = { id: 'test', name: 'test', source: 'support' as const, effectTags: [], upgraded: false }
  const check = (plan: 'logic' | 'free' | undefined, vo = 900) =>
    evaluateHifPredicate(ability.predicate!, { vo, da: 0, vi: 0 }, state, {
      event: 'skill_card_gained',
      skillCard: { ...skill, plan },
    })
  assert.equal(check('logic'), true)
  assert.equal(check('logic', 899), false)
  assert.equal(check('free'), false)
  assert.equal(check(undefined), undefined)
})
