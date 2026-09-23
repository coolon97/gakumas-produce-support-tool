import type { ProduceSkillCardState, ProduceStateSnapshot } from '@/types/calculator'
import type {
  HifCustomPItemCardSettings,
  HifCustomPItemColor,
  HifCustomPItemMascot,
  HifCustomPItemSelection,
  HifScheduleAction,
} from '@/types/hif-schedule'
import type { IdolPlan } from '@/types/produce'
import { isLessonCustomPItem } from '@/data/hif-custom-p-items'
import { getHifConsultationSkillTags } from '@/lib/hif-consultation'
import type { AbilityEventContext } from './hif-simulation-state'

type Route = 'lesson' | 'consultation' | 'supply' | 'outing'
type CardEffect = 'gain' | 'gain_upgraded' | 'change' | 'copy' | 'upgrade' | 'delete'
interface ItemEffect {
  route: Route
  limit: number
  drinks: number
  staminaRecovery: number
  card?: CardEffect
}

function getRoute(color: HifCustomPItemColor, mascot: HifCustomPItemMascot): Route {
  if (isLessonCustomPItem(color, mascot)) return 'lesson'
  if (
    (color === 'red' && mascot === 'girl') ||
    (color === 'green' && mascot === 'rabbit') ||
    (color === 'yellow' && mascot === 'moja')
  )
    return 'consultation'
  if (
    (color === 'red' && mascot === 'robo') ||
    (color === 'green' && mascot === 'bear') ||
    (color === 'yellow' && mascot === 'bird')
  )
    return 'supply'
  return 'outing'
}

/** Track the recovery printed on red items; the simulator still cannot apply health caps or consumption. */
export function getCustomPItemEffect(
  selection: HifCustomPItemSelection,
  stage: 1 | 2 | 3,
): ItemEffect | null {
  const { color, mascot, decoration } = selection
  if (!color) return null
  if (stage === 1)
    return {
      route: 'lesson',
      limit: 2,
      drinks: color === 'yellow' ? 1 : 0,
      staminaRecovery: color === 'red' ? 6 : 0,
    }
  if (!mascot) return null
  const route = getRoute(color, mascot)
  if (stage === 2)
    return {
      route,
      limit: route === 'lesson' ? 2 : 1,
      drinks:
        color === 'yellow'
          ? route === 'lesson'
            ? 2
            : route === 'supply' || route === 'outing' || route === 'consultation'
              ? 2
              : 0
          : route === 'lesson'
            ? 1
            : 0,
      staminaRecovery: color === 'red' ? (route === 'consultation' || route === 'supply' ? 12 : 6) : 0,
      card: route === 'supply' ? 'change' : route === 'outing' ? 'upgrade' : undefined,
    }
  if (!decoration) return null
  if (route === 'lesson')
    return {
      route,
      limit: decoration === 'wing' ? 1 : 2,
      drinks:
        decoration === 'flower'
          ? color === 'yellow'
            ? 2
            : 1
          : color === 'yellow'
            ? decoration === 'wing'
              ? 2
              : 1
            : 0,
      staminaRecovery: color === 'red' ? (decoration === 'wing' ? 12 : 6) : 0,
      card: decoration === 'ribbon' ? 'change' : decoration === 'wing' ? 'gain' : undefined,
    }
  if (route === 'consultation')
    return { route, limit: 1, drinks: color === 'yellow' ? 2 : 0, staminaRecovery: color === 'red' ? 12 : 0 }
  if (route === 'supply')
    return {
      route,
      limit: 1,
      drinks: color === 'yellow' ? (decoration === 'flower' || decoration === 'ribbon' ? 2 : 1) : 0,
      staminaRecovery: color === 'red' ? (decoration === 'medal' || decoration === 'wing' ? 6 : 12) : 0,
      card: decoration === 'ribbon' ? 'gain' : decoration === 'wing' ? 'gain_upgraded' : 'change',
    }
  return {
    route,
    limit: 1,
    drinks: color === 'yellow' ? 2 : 0,
    staminaRecovery: color === 'red' ? 6 : 0,
    card:
      decoration === 'flower'
        ? 'change'
        : decoration === 'ribbon'
          ? 'copy'
          : decoration === 'medal'
            ? 'upgrade'
            : 'delete',
  }
}

export function matchesCustomPItemAction(route: Route, action: HifScheduleAction): boolean {
  return route === 'lesson'
    ? action === 'lesson'
    : route === 'supply'
      ? action === 'supply'
      : route === action
}

export function applyCustomPItemEffect(
  selection: HifCustomPItemSelection,
  stage: 1 | 2 | 3,
  action: HifScheduleAction,
  state: ProduceStateSnapshot,
  dayIndex: number,
  used: number,
  cardSettings?: HifCustomPItemCardSettings,
  plan: IdolPlan = 'sense',
): { triggered: boolean; contexts: AbilityEventContext[] } {
  const effect = getCustomPItemEffect(selection, stage)
  if (!effect || used >= effect.limit || !matchesCustomPItemAction(effect.route, action))
    return { triggered: false, contexts: [] }
  const contexts: AbilityEventContext[] = []
  state.pDrinkCount += effect.drinks
  state.customPItemStaminaRecovery += effect.staminaRecovery
  for (let i = 0; i < effect.drinks; i++) contexts.push({ event: 'drink_gained' })
  const operation = effect.card
  if (!operation) return { triggered: true, contexts }
  const troubleAllowed =
    stage === 3 &&
    (effect.route === 'outing' || (effect.route === 'supply' && selection.decoration === 'medal'))
  const eligible = state.skillCards.filter(
    (card) =>
      card.source !== 'idol' &&
      (troubleAllowed || card.name !== '眠気') &&
      (operation !== 'upgrade' || !card.upgraded),
  )
  const target = eligible.find((card) => card.id === cardSettings?.targetCardId) ?? eligible[0]
  const result = cardSettings?.resultCard
  const resultFields = result
    ? {
        rarity: result.rarity,
        category: result.category,
        effectTags: getHifConsultationSkillTags(plan, result.skillKind, result.energy, result.preservation),
      }
    : {}
  if (operation === 'gain' || operation === 'gain_upgraded') {
    const card: ProduceSkillCardState = {
      id: `custom-item:${dayIndex}`,
      name: 'カスタムPアイテムで獲得したスキルカード',
      source: 'custom_item',
      effectTags: [],
      upgraded: operation === 'gain_upgraded' || result?.upgraded === true,
      ...resultFields,
    }
    state.skillCards.push(card)
    contexts.push({ event: 'skill_card_gained', skillCard: card })
  } else if (operation === 'copy' && target) {
    const card: ProduceSkillCardState = {
      ...target,
      id: `custom-item-copy:${dayIndex}`,
      source: 'custom_item',
      effectTags: [...target.effectTags],
    }
    state.skillCards.push(card)
    contexts.push({ event: 'skill_card_gained', skillCard: card })
  } else if (operation === 'change' && target) {
    const targetIndex = state.skillCards.indexOf(target)
    state.skillCards[targetIndex] = {
      id: `custom-item-changed:${dayIndex}`,
      name: 'チェンジ後のスキルカード',
      source: 'changed',
      effectTags: [],
      upgraded: target.upgraded,
      ...resultFields,
    }
    state.skillCardChangeCount++
    contexts.push({ event: 'skill_card_changed', skillCard: target })
  } else if (operation === 'upgrade' && target) {
    target.upgraded = true
    contexts.push({ event: 'skill_card_upgraded', skillCard: target })
  } else if (operation === 'delete' && target) {
    state.skillCards.splice(state.skillCards.indexOf(target), 1)
    contexts.push({ event: 'skill_card_deleted', skillCard: target })
  }
  return { triggered: true, contexts }
}
