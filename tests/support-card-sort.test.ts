import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SupportCard } from '../src/types/card.ts'
import { compareSupportCards, type CardSortMode } from '../src/lib/support-card-sort.ts'
import { getScheduledSupportCardTotals } from '../src/lib/support-card-schedule-sort.ts'
import { DEFAULT_PRODUCE_CONFIG } from '../src/store/produce-config.ts'

function card(
  id: string,
  rarity: SupportCard['rarity'],
  plan: SupportCard['plan'],
  type: SupportCard['type'],
): SupportCard {
  return {
    id,
    name: id,
    rarity,
    plan,
    type,
    maxLevel: 60,
    skills: [],
    source: 'manual',
    updatedAt: '',
    releaseDate: '2026/01/01',
  }
}

function ids(cards: SupportCard[], mode: CardSortMode) {
  return cards.sort((left, right) => compareSupportCards(left, right, mode)).map(({ id }) => id)
}

const cards = [
  card('logic-ssr-da', 'SSR', 'logic', 'dance'),
  card('sense-r-vo', 'R', 'sense', 'vocal'),
  card('sense-ssr-vi', 'SSR', 'sense', 'visual'),
  card('sense-ssr-vo', 'SSR', 'sense', 'vocal'),
  card('anomaly-sr-vo', 'SR', 'anomaly', 'vocal'),
]

test('plan sort uses rarity then attribute inside each plan', () => {
  assert.deepEqual(ids([...cards], 'plan'), [
    'sense-ssr-vo',
    'sense-ssr-vi',
    'sense-r-vo',
    'logic-ssr-da',
    'anomaly-sr-vo',
  ])
})

test('attribute sort uses rarity then plan inside each attribute', () => {
  assert.deepEqual(ids([...cards], 'attribute'), [
    'sense-ssr-vo',
    'anomaly-sr-vo',
    'sense-r-vo',
    'logic-ssr-da',
    'sense-ssr-vi',
  ])
})

test('rarity sort uses plan then attribute inside each rarity', () => {
  assert.deepEqual(ids([...cards], 'rarity'), [
    'sense-ssr-vo',
    'sense-ssr-vi',
    'logic-ssr-da',
    'anomaly-sr-vo',
    'sense-r-vo',
  ])
})

test('current-schedule totals always include support-event stat gains exactly once', () => {
  const eventCard: SupportCard = {
    ...card('event-card', 'SSR', 'sense', 'vocal'),
    supportEvents: [{ unlock: 'Lv10', effect: 'ボーカル上昇+30' }],
    supportEventRewards: [{ kind: 'p_item', name: 'テストアイテム', effect: '効果なし' }],
  }
  const config = structuredClone(DEFAULT_PRODUCE_CONFIG)
  assert.equal(getScheduledSupportCardTotals([eventCard], [], config, 0).get(eventCard.id), 30)

  config.hif.schedule!.eventMode = 'simple'
  config.hif.schedule!.simpleEvents.frontSlots = [0]
  assert.equal(getScheduledSupportCardTotals([eventCard], [], config, 0).get(eventCard.id), 30)
})
