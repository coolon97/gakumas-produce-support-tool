import type { SupportEventReward } from '@/types/card'
import type { ProduceConfig } from '@/types/produce'
import type { SupportAbilitySpec, AbilityActivationEvent } from '@/types/support-ability'
import type { ProduceSkillCardState, ProduceStateSnapshot } from '@/types/calculator'
import type {
  HifCarryoverSkillCard,
  HifClassSkillCardSelection,
  HifSkillCardSelection,
} from '@/types/hif-schedule'
import type { SupportAfterEventKind } from '@/lib/support-event-selection'
import { findIdolVersion } from '@/data/idols'
import { getHifConsultationSkillTags } from '@/lib/hif-consultation'
import { getHifAdjustedStarPower } from '@/data/hif'
import { getHifBasicSkillCards } from '@/data/hif-basic-skill-cards'
import { getSupportEventSkillCard } from '@/data/skill-cards'

export type AbilityEventContext = {
  event: AbilityActivationEvent
  lessonKind?: 'normal' | 'sp'
  lessonParam?: 'vocal' | 'dance' | 'visual'
  skillCard?: ProduceSkillCardState
}

export type OwnedPItem = {
  name: string
  ability?: SupportAbilitySpec
  ownerSlot?: number
  ownerLevel?: number
}

type SkillCardTag = ProduceSkillCardState['effectTags'][number]

const TAG_WORDS: Array<[string, SkillCardTag]> = [
  ['元気', 'energy'],
  ['やる気', 'motivation'],
  ['好印象', 'goodImpression'],
  ['好調', 'goodCondition'],
  ['温存', 'preservation'],
  ['集中', 'concentration'],
  ['全力', 'fullPower'],
  ['強気', 'aggressive'],
]
export const HIF_BADGE_STAR_POWER = 10
export const HIF_BADGE_TRIGGER_LIMIT = 20

export function createScheduledSkillCard(
  selection: HifSkillCardSelection,
  plan: 'sense' | 'logic' | 'anomaly',
  source: 'consultation' | 'supply' | 'outing' | 'interval',
  dayIndex: number,
  actionIndex = 0,
): ProduceSkillCardState {
  return {
    id: `${source}:${dayIndex}:${actionIndex}`,
    name:
      source === 'consultation'
        ? '相談で指定したスキルカード'
        : source === 'interval'
          ? 'インターバルで指定したスキルカード'
          : source === 'outing'
            ? 'おでかけで獲得したスキルカード'
            : '差し入れ・活動支給で獲得したスキルカード',
    source,
    rarity: selection.rarity,
    category: selection.category,
    effectTags: getHifConsultationSkillTags(
      plan,
      selection.skillKind,
      selection.energy,
      selection.preservation,
    ),
    upgraded: selection.upgraded === true || ('kind' in selection && selection.kind === 'upgrade'),
  }
}

export function createChangedSkillCard(
  target: ProduceSkillCardState,
  id: string,
  resultCard: HifSkillCardSelection,
  plan: 'sense' | 'logic' | 'anomaly',
): ProduceSkillCardState {
  return {
    id,
    name: 'チェンジ後のスキルカード',
    source: 'changed',
    effectTags: getHifConsultationSkillTags(
      plan,
      resultCard.skillKind,
      resultCard.energy,
      resultCard.preservation,
    ),
    upgraded: target.upgraded,
    rarity: resultCard.rarity,
    category: resultCard.category,
  }
}

export function createClassSelectedCard(
  selection: HifClassSkillCardSelection,
  plan: 'sense' | 'logic' | 'anomaly',
  dayIndex: number,
): ProduceSkillCardState {
  return {
    id: `class-selection:${dayIndex}`,
    name: selection.rarity === 'basic_name' ? '基本カード' : '授業で指定したスキルカード',
    source: 'class',
    ...(selection.rarity === 'basic_name' ? {} : { rarity: selection.rarity }),
    category: selection.category,
    effectTags: getHifConsultationSkillTags(
      plan,
      selection.skillKind,
      selection.energy,
      selection.preservation,
    ),
    upgraded: false,
  }
}

export function createCarryoverSkillCard(
  selection: HifCarryoverSkillCard,
  plan: 'sense' | 'logic' | 'anomaly',
  slot: number,
): ProduceSkillCardState {
  return {
    id: `memory:${slot}`,
    name: `持ち込みスキルカード${slot + 1}`,
    source: 'memory',
    rarity: selection.rarity,
    category: selection.category,
    effectTags: getHifConsultationSkillTags(
      plan,
      selection.skillKind,
      selection.energy === true,
      selection.preservation,
    ),
    upgraded: selection.upgraded === true,
  }
}

export function createSleepyCard(
  dayIndex: number,
  source: 'class' | 'outing' = 'class',
): ProduceSkillCardState {
  return { id: `sleepy:${source}:${dayIndex}`, name: '眠気', source, effectTags: [], upgraded: false }
}

export function matchesConsultationSelection(
  card: ProduceSkillCardState,
  selected: ProduceSkillCardState,
): boolean {
  if (card.category !== selected.category || card.rarity !== selected.rarity) return false
  if (selected.effectTags.length === 0) return card.effectTags.length === 0
  return selected.effectTags.every((tag) => card.effectTags.includes(tag))
}

export function findLastSkillCardIndex(
  cards: readonly ProduceSkillCardState[],
  predicate: (card: ProduceSkillCardState) => boolean,
): number {
  for (let index = cards.length - 1; index >= 0; index--) if (predicate(cards[index])) return index
  return -1
}

export function matchesClassSelection(
  card: ProduceSkillCardState,
  selection: HifClassSkillCardSelection,
  selected: ProduceSkillCardState,
): boolean {
  return selection.rarity === 'basic_name'
    ? card.name.includes('基本')
    : matchesConsultationSelection(card, selected)
}

export function inferRewardSkillCard(
  reward: SupportEventReward,
  id: string,
  selection?: HifSkillCardSelection | null,
  plan?: 'sense' | 'logic' | 'anomaly',
  supportCardId?: string,
  upgraded?: boolean,
): ProduceSkillCardState {
  const catalogCard = supportCardId ? getSupportEventSkillCard(supportCardId) : undefined
  const rarity =
    catalogCard?.rarity ??
    (reward.rarity === 'SSR' || reward.rarity === 'SR' || reward.rarity === 'R' ? reward.rarity : undefined)
  const effectTags = catalogCard
    ? (catalogCard.effectTags ?? reward.skillCard?.effectTags ?? [])
    : (reward.skillCard?.effectTags ??
      TAG_WORDS.filter(([word]) => reward.effect.includes(word)).map(([, tag]) => tag))
  return {
    id,
    name: reward.name,
    source: 'support',
    effectTags:
      selection && plan
        ? getHifConsultationSkillTags(plan, selection.skillKind, selection.energy, selection.preservation)
        : [...new Set(effectTags)],
    upgraded: upgraded ?? selection?.upgraded === true,
    ...(selection
      ? { rarity: selection.rarity, category: selection.category }
      : {
          ...(rarity ? { rarity } : {}),
          ...((catalogCard?.category ?? reward.skillCard?.category)
            ? { category: (catalogCard?.category ?? reward.skillCard?.category)! }
            : {}),
        }),
  }
}

export function applyHifBadgeSkillCardGains(
  state: ProduceStateSnapshot,
  contexts: readonly AbilityEventContext[],
  affinityBonusEnabled: boolean,
): void {
  if (!state.pItems.includes('H.I.Fワッペン')) return
  const gained = contexts.filter((context) => context.event === 'skill_card_gained').length
  const triggerCount = Math.min(gained, HIF_BADGE_TRIGGER_LIMIT - state.hifBadgeTriggerCount)
  if (triggerCount <= 0) return
  state.hifBadgeTriggerCount += triggerCount
  state.starPower += triggerCount * getHifAdjustedStarPower(HIF_BADGE_STAR_POWER, affinityBonusEnabled)
}

export function createInitialProduceState(config: ProduceConfig): {
  snapshot: ProduceStateSnapshot
  items: OwnedPItem[]
} {
  const version = findIdolVersion(config.idolId, config.idolVersionId)
  const skillCards: ProduceSkillCardState[] = [
    {
      id: `idol:${config.idolVersionId}`,
      name: version ? `【${version.name}】固有スキルカード` : 'Pアイドル固有スキルカード',
      source: 'idol',
      effectTags: [],
      upgraded: false,
    },
  ]
  const basicCards = version
    ? getHifBasicSkillCards(version.recommendedEffect)
    : Array.from({ length: 7 }, () => ({
        name: '基本カード',
        effectTags: [] as ProduceSkillCardState['effectTags'],
      }))
  basicCards.forEach((basicCard, index) => {
    skillCards.push({ id: `basic:${index}`, source: 'basic', upgraded: false, ...basicCard })
  })
  return {
    snapshot: {
      starPower: 0,
      hifBadgeTriggerCount: 0,
      pDrinkCount: 0,
      customPItemStaminaRecovery: 0,
      skillCardCustomCount: 0,
      skillCardChangeCount: 0,
      pItems: ['H.I.Fワッペン'],
      skillCards,
    },
    items: [{ name: 'H.I.Fワッペン' }],
  }
}

export function cloneProduceState(state: ProduceStateSnapshot): ProduceStateSnapshot {
  return {
    starPower: state.starPower,
    hifBadgeTriggerCount: state.hifBadgeTriggerCount,
    pDrinkCount: state.pDrinkCount,
    customPItemStaminaRecovery: state.customPItemStaminaRecovery,
    skillCardCustomCount: state.skillCardCustomCount,
    skillCardChangeCount: state.skillCardChangeCount,
    pItems: [...state.pItems],
    skillCards: state.skillCards.map((card) => ({ ...card, effectTags: [...card.effectTags] })),
  }
}

export function resolveSupportAfterEventTarget(
  cards: readonly ProduceSkillCardState[],
  kind: SupportAfterEventKind,
  targetCardId?: string | null,
  effectText?: string,
): ProduceSkillCardState | undefined {
  const eligible = (card: ProduceSkillCardState) =>
    kind === 'upgrade'
      ? !card.upgraded
      : kind === 'delete' || kind === 'change'
        ? card.source !== 'idol' &&
          (kind !== 'change' || !effectText?.includes('名前に「基本」を含む') || card.name.includes('基本'))
        : false
  return targetCardId ? cards.find((card) => card.id === targetCardId && eligible(card)) : undefined
}

/** Apply the owned-card part of an after event in both simple and detailed modes. */
export function applySupportAfterEventCardMutation(
  state: ProduceStateSnapshot,
  kind: SupportAfterEventKind,
  target: ProduceSkillCardState | undefined,
  changedCardId: string,
  resultCard: HifSkillCardSelection | null | undefined,
  plan: 'sense' | 'logic' | 'anomaly',
): void {
  if (!target) return
  if (kind === 'upgrade') {
    target.upgraded = true
    return
  }
  const targetIndex = state.skillCards.indexOf(target)
  if (targetIndex < 0) return
  if (kind === 'delete') state.skillCards.splice(targetIndex, 1)
  else if (kind === 'change' && resultCard) {
    state.skillCards[targetIndex] = createChangedSkillCard(target, changedCardId, resultCard, plan)
    state.skillCardChangeCount++
  }
}
