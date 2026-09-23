import { test } from 'node:test'
import assert from 'node:assert/strict'
import cardsData from '../data/cards.json' with { type: 'json' }
import type { SupportCard } from '../src/types/card.ts'
import { SKILL_CARDS, getSupportEventSkillCard } from '../src/data/skill-cards.ts'
import {
  inferRewardSkillCard,
} from '../src/lib/calculator/hif-simulation-state.ts'

const cards = cardsData as SupportCard[]

test('the skill-card catalog covers every support-event skill reward with usable card metadata', () => {
  const rewards = cards.flatMap((card) =>
    (card.supportEventRewards ?? []).flatMap((reward, index) =>
      reward.kind === 'skill_card' ? [{ card, reward, index }] : [],
    ),
  )
  assert.equal(SKILL_CARDS.filter((card) => card.source.kind === 'support_event').length, rewards.length)
  assert.equal(new Set(SKILL_CARDS.map((card) => card.id)).size, SKILL_CARDS.length)
  for (const { card, reward, index } of rewards) {
    const item = getSupportEventSkillCard(card.id, index)!
    assert.equal(item.id, `support:${card.id}:${index}`)
    assert.equal(item.name, reward.name)
    assert.equal(item.effect, reward.effect)
    assert.equal(item.rarity, reward.rarity)
    assert.equal(item.plan, card.plan)
    assert.ok(item.category === 'active' || item.category === 'mental')
    const owned = inferRewardSkillCard(
      reward,
      `support:0:0`,
      null,
      card.plan === 'free' ? 'sense' : card.plan,
      card.id,
    )
    assert.equal(owned.category, item.category)
    assert.deepEqual(owned.effectTags, item.effectTags)
  }
})

test('front-event card settings override catalog defaults without changing the catalog', () => {
  const card = cards.find((item) => item.id === 'gkm_0002')!
  const reward = card.supportEventRewards!.find((item) => item.kind === 'skill_card')!
  const selected = {
    category: 'mental' as const,
    skillKind: 'type_a_b' as const,
    energy: true,
    preservation: false,
    rarity: 'SSR' as const,
    upgraded: true,
  }
  const owned = inferRewardSkillCard(reward, 'support:0:0', selected, 'logic', card.id)
  assert.equal(owned.name, reward.name)
  assert.equal(owned.category, 'mental')
  assert.equal(owned.upgraded, true)
  assert.deepEqual(owned.effectTags, ['goodImpression', 'motivation', 'energy'])
  assert.equal(getSupportEventSkillCard(card.id)?.category, 'active')
})

test('base effects that grant several turns of good condition are tagged as goodCondition', () => {
  assert.deepEqual(
    SKILL_CARDS.filter((card) => card.effectTags?.includes('goodCondition')).map((card) => card.name),
    ['練習再開！', '喧嘩するほど仲がいい', '光の夜', 'キメ顔で自撮り', '切れた鼻緒が結んだ絆'],
  )
})
