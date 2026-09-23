import type { CardType } from './card'

export type AbilityStat = 'vo' | 'da' | 'vi'
export type AbilityLessonKind = 'normal' | 'sp' | 'any'
export type AbilityLessonParam = 'vocal' | 'dance' | 'visual' | 'any'

/** Import-only text template identifier. Runtime calculation must not branch on this value. */
export type SupportAbilityTextTemplateId =
  | 'static.initial_resource'
  | 'static.initial_stat'
  | 'static.max_stamina'
  | 'static.sp_rate'
  | 'static.lesson_bonus'
  | 'static.param_bonus'
  | 'static.support_rate_bonus'
  | 'static.event_bonus'
  | 'static.drink_discount'
  | 'lesson_end.add_stat'
  | 'lesson_end.normal_add_stat'
  | 'lesson_end.ppoint_rate'
  | 'sp_lesson_end.stamina_recovery'
  | 'sp_lesson_end.add_stat'
  | 'sp_lesson_end.conditional_add_stat'
  | 'sp_lesson_end.ppoint_rate'
  | 'exam_end.add_stat'
  | 'exam_end.stamina_recovery'
  | 'action_choice.add_stat'
  | 'action_choice.stamina_recovery'
  | 'item_or_drink_gain.add_stat'
  | 'skill_card_event.add_stat'
  | 'skill_card_event.mutate_card'
  | 'turn_start.skill_card_usage'
  | 'turn_start.lesson_only_param_boost'
  | 'other.sp_after_stamina'
  | 'p_item.add_stat'
  | 'p_item.add_resource'

export type AbilityActivationEvent =
  | 'static'
  | 'lesson_end'
  | 'exam_end'
  | 'outing_end'
  | 'rest_selected'
  | 'class_end'
  | 'activity_supply_selected'
  | 'special_training_started'
  | 'consultation_selected'
  | 'consultation_after_drink_trade'
  | 'consultation_after_card_trade'
  | 'item_gained'
  | 'drink_gained'
  | 'skill_card_gained'
  | 'skill_card_deleted'
  | 'skill_card_upgraded'
  | 'skill_card_customized'
  | 'skill_card_changed'
  | 'turn_start'
  | 'other'

export interface AbilityActivation {
  event: AbilityActivationEvent
  lessonKind?: AbilityLessonKind
  lessonParam?: AbilityLessonParam
}

export type AbilityCondition =
  | {
      type: 'owned_effect_tag_cards_gte'
      tag: 'goodImpression' | 'goodCondition' | 'preservation' | 'concentration' | 'fullPower' | 'aggressive' | 'motivation' | 'energy'
      value: number
    }
  | { type: 'owned_skill_cards_gte'; value: number }
  | { type: 'stat_gte'; stat: AbilityStat; value: number }
  | { type: 'stat_lte'; stat: AbilityStat; value: number }
  | { type: 'stamina_gte_ratio'; value: number }
  | {
      type: 'effect_tag_is'
      value: 'energy' | 'motivation' | 'goodImpression' | 'goodCondition' | 'preservation' | 'concentration' | 'fullPower' | 'aggressive'
    }
  | { type: 'card_category_is'; value: 'active' | 'mental' }
  | { type: 'card_rarity_is'; value: 'SSR' | 'SR' | 'R' }
  | { type: 'card_name_contains'; value: string }
  | { type: 'lesson_turn_only' }

export type AbilityPredicate =
  | { type: 'condition'; condition: AbilityCondition }
  | { type: 'all'; predicates: AbilityPredicate[] }
  | { type: 'any'; predicates: AbilityPredicate[] }
  | { type: 'not'; predicate: AbilityPredicate }

export interface AbilityLevelPoint {
  lv: number
  value: number
}

export interface AbilityValueCurve {
  points: AbilityLevelPoint[]
  fallback?: number
}

export type AbilityValueOperand = { kind: 'literal'; value: number } | { kind: 'curve'; curveId: string }

interface ValuedOperation {
  amount: AbilityValueOperand
}

export type SupportAbilityOperation =
  | ({ op: 'discount_p_drink' } & ValuedOperation)
  | ({ op: 'add_stat'; stat: AbilityStat; timing: 'initial' | 'activation' } & ValuedOperation)
  | ({ op: 'add_sp_rate'; target: CardType | 'all' } & ValuedOperation)
  | ({ op: 'add_lesson_bonus'; target: CardType | 'all' } & ValuedOperation)
  | ({ op: 'add_p_point' } & ValuedOperation)
  | ({ op: 'add_max_stamina' } & ValuedOperation)
  | ({ op: 'add_stamina' } & ValuedOperation)
  | ({ op: 'add_param_bonus'; target: CardType | 'all' } & ValuedOperation)
  | ({ op: 'add_support_rate'; supportKind: 'skill_card' | 'lesson' } & ValuedOperation)
  | ({
      op: 'modify_support_event_reward'
      rewardKind: 'stat_gain' | 'stamina_recovery' | 'p_point'
      operation: 'add_percent' | 'add_flat'
    } & ValuedOperation)
  | ({ op: 'add_p_point_rate' } & ValuedOperation)
  | ({ op: 'add_p_drink' } & ValuedOperation)
  | { op: 'mutate_skill_card'; mutation: 'change_selected' | 'upgrade_random' }
  | ({ op: 'add_card_usage_count' } & ValuedOperation)
  | ({ op: 'add_param_gain_rate'; durationTurns?: number } & ValuedOperation)

export interface AbilityActivationLimit {
  scope: 'produce' | 'lesson'
  max: number
}

export interface SupportAbilitySpec {
  schemaVersion: 2
  /** 更新スクリプトの解析情報。公開用データからは取り除く。 */
  source?: {
    templateId: SupportAbilityTextTemplateId
    parserVersion: 2
  }
  activation: AbilityActivation
  predicate?: AbilityPredicate
  operations: SupportAbilityOperation[]
  limits?: AbilityActivationLimit[]
  curves?: Record<string, AbilityValueCurve>
}
