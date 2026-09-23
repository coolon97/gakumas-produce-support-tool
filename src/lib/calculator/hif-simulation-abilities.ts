import type { StatValues } from '@/types/produce'
import type { SupportAbilitySpec, AbilityPredicate } from '@/types/support-ability'
import type { ProduceStateSnapshot } from '@/types/calculator'
import type { AbilityEventContext } from './hif-simulation-state'

/** Conditions are evaluated against the state at the activation point. Unsupported conditions do not activate. */
export function evaluateHifPredicate(
  predicate: AbilityPredicate,
  stats: StatValues,
  state: ProduceStateSnapshot,
  context: AbilityEventContext,
): boolean | undefined {
  switch (predicate.type) {
    case 'all': {
      const results = predicate.predicates.map((item) => evaluateHifPredicate(item, stats, state, context))
      return results.includes(false) ? false : results.includes(undefined) ? undefined : true
    }
    case 'any': {
      const results = predicate.predicates.map((item) => evaluateHifPredicate(item, stats, state, context))
      return results.includes(true) ? true : results.includes(undefined) ? undefined : false
    }
    case 'not': {
      const result = evaluateHifPredicate(predicate.predicate, stats, state, context)
      return result === undefined ? undefined : !result
    }
    case 'condition': {
      const condition = predicate.condition
      if (condition.type === 'stat_gte') return stats[condition.stat] >= condition.value
      if (condition.type === 'stat_lte') return stats[condition.stat] <= condition.value
      if (condition.type === 'lesson_turn_only') return false
      const gained = context.event === 'skill_card_gained' ? context.skillCard : undefined
      const cards = gained ? [...state.skillCards, gained] : state.skillCards
      if (condition.type === 'owned_skill_cards_gte') return cards.length >= condition.value
      if (condition.type === 'owned_effect_tag_cards_gte')
        return cards.filter((card) => card.effectTags.includes(condition.tag)).length >= condition.value
      if (condition.type === 'effect_tag_is')
        return context.skillCard ? context.skillCard.effectTags.includes(condition.value) : undefined
      if (condition.type === 'card_category_is')
        return context.skillCard ? context.skillCard.category === condition.value : undefined
      if (condition.type === 'card_rarity_is')
        return context.skillCard ? context.skillCard.rarity === condition.value : undefined
      if (condition.type === 'card_name_contains')
        return context.skillCard ? context.skillCard.name.includes(condition.value) : undefined
      return undefined
    }
  }
}

export function matchesHifActivation(ability: SupportAbilitySpec, context: AbilityEventContext): boolean {
  if (ability.activation.event !== context.event) return false
  if (context.event === 'lesson_end') {
    if (
      ability.activation.lessonKind &&
      ability.activation.lessonKind !== 'any' &&
      ability.activation.lessonKind !== context.lessonKind
    )
      return false
    if (
      ability.activation.lessonParam &&
      ability.activation.lessonParam !== 'any' &&
      ability.activation.lessonParam !== context.lessonParam
    )
      return false
  }
  return true
}
