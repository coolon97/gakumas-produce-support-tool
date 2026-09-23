import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CardSkill, CardType, SkillEffectType, SupportCard } from '@/types/card'
import type { LessonParameter, ProduceConfig, StatValues } from '@/types/produce'
import type {
  AbilityCondition,
  AbilityStat,
  SupportAbilityOperation,
  SupportAbilitySpec,
} from '@/types/support-ability'
import {
  getAbilityConditions,
  getLessonActivationContext,
  getPrimaryAbilityValue,
  resolveOperationValue,
} from '@/lib/support-ability'
import { getParameterSortTriggerSetting } from '@/lib/support-card-parameter-total'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** カードタイプの日本語ラベル */
export const CARD_TYPE_LABELS = {
  vocal: 'ボーカル',
  dance: 'ダンス',
  visual: 'ビジュアル',
  assist: 'アシスト',
} as const

export const CARD_TYPE_SHORT_LABELS = {
  vocal: 'Vo',
  dance: 'Da',
  visual: 'Vi',
  assist: 'As',
} as const

/** カードタイプの色クラス */
export const CARD_TYPE_COLORS = {
  vocal: 'bg-vocal text-white',
  dance: 'bg-dance text-white',
  visual: 'bg-visual text-white',
  assist: 'bg-assist text-white',
} as const

export const CARD_TYPE_SOFT_COLORS = {
  vocal: 'bg-pink-200 text-pink-500 border border-pink-300',
  dance: 'bg-blue-200 text-blue-500 border border-blue-300',
  visual: 'bg-yellow-200 text-yellow-600 border border-yellow-300',
  assist: 'bg-emerald-100 text-emerald-600 border border-emerald-200',
} as const

export function getCardTypeBadgeClass(cardType: CardType): string {
  switch (cardType) {
    case 'vocal':
      return 'bg-pink-50 text-pink-700'
    case 'dance':
      return 'bg-blue-50 text-blue-700'
    case 'visual':
      return 'bg-yellow-50 text-yellow-700'
    case 'assist':
      return 'bg-emerald-50 text-emerald-700'
  }
}

const EFFECT_TYPE_LABELS: Record<SkillEffectType, string> = {
  sp_rate: 'SP率',
  lesson_bonus: 'LB',
  vo_bonus: 'Vo',
  da_bonus: 'Da',
  vi_bonus: 'Vi',
  initial_vo: '初期Vo',
  initial_da: '初期Da',
  initial_vi: '初期Vi',
  stamina_recovery: '回復',
  good_impression: '好印象',
  motivation: 'やる気',
  mental_recovery: 'メンタル',
  fan_bonus: 'ファン',
  other: 'その他',
}

const EFFECT_TYPE_BADGE_CLASSES: Record<SkillEffectType, string> = {
  sp_rate: 'bg-sky-50 text-sky-700 border border-sky-200',
  lesson_bonus: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  vo_bonus: 'bg-rose-50 text-rose-700 border border-rose-200',
  da_bonus: 'bg-blue-50 text-blue-700 border border-blue-200',
  vi_bonus: 'bg-amber-50 text-amber-700 border border-amber-200',
  initial_vo: 'bg-pink-50 text-pink-700 border border-pink-200',
  initial_da: 'bg-blue-50 text-blue-700 border border-blue-200',
  initial_vi: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  stamina_recovery: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  good_impression: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
  motivation: 'bg-orange-50 text-orange-700 border border-orange-200',
  mental_recovery: 'bg-teal-50 text-teal-700 border border-teal-200',
  fan_bonus: 'bg-violet-50 text-violet-700 border border-violet-200',
  other: 'bg-slate-100 text-slate-600 border border-slate-200',
}

const EFFECT_TYPE_PRIORITY: Record<SkillEffectType, number> = {
  sp_rate: 0,
  lesson_bonus: 1,
  initial_vo: 2,
  initial_da: 3,
  initial_vi: 4,
  vo_bonus: 5,
  da_bonus: 6,
  vi_bonus: 7,
  stamina_recovery: 8,
  good_impression: 9,
  motivation: 10,
  mental_recovery: 11,
  fan_bonus: 12,
  other: 13,
}

const TRIGGER_BADGE_LABELS = {
  exam_end: '試験終了時',
  outing_end: 'お出かけ終了時',
  rest_selected: '休む選択時',
  class_end: '授業・営業終了時',
  activity_supply_selected: '活動支給・差し入れ選択時',
  special_training_started: '特別指導開始時',
  consultation_selected: '相談選択時',
  consultation_after_drink_trade: '相談でPドリンク交換後',
  consultation_after_card_trade: '相談でスキルカード交換後',
  item_gained: 'Pアイテム獲得時',
  drink_gained: 'Pドリンク獲得時',
  skill_card_gained: 'スキルカード獲得時',
  skill_card_deleted: 'スキルカード削除時',
  skill_card_upgraded: 'スキルカード強化時',
  skill_card_customized: 'スキルカードカスタマイズ時',
  skill_card_changed: 'スキルカードチェンジ時',
  turn_start: 'ターン開始時',
  other: 'その他',
} as const

export const CARD_TYPE_BORDER = {
  vocal: 'border-vocal',
  dance: 'border-dance',
  visual: 'border-visual',
  assist: 'border-assist',
} as const

/** レアリティの色クラス */
export const RARITY_COLORS = {
  SSR: 'bg-gradient-to-r from-sky-200 via-rose-200 to-amber-200 text-gray-700 border border-amber-300 font-bold',
  SR: 'bg-yellow-200 text-gray-700 border border-yellow-300 font-semibold',
  R: 'bg-slate-200 text-gray-700 border border-slate-300 font-medium',
} as const

export const RARITY_PANEL_COLORS = {
  SSR: 'bg-white',
  SR: 'bg-white',
  R: 'bg-white',
} as const

export function getSkillValueAtLevel(skill: CardSkill, level: number): number {
  return getPrimaryAbilityValue(skill.ability, level)
}

function doesEffectTargetCardType(target: CardType | 'all', cardType: CardType): boolean {
  return target === 'all' || target === cardType
}

function sumAbilityOperationValues(
  skills: CardSkill[],
  level: number,
  predicate: (operation: SupportAbilityOperation) => boolean,
): number {
  return skills.reduce((sum, skill) => {
    const operationTotal = skill.ability.operations
      .filter(predicate)
      .reduce(
        (operationSum, operation) => operationSum + resolveOperationValue(skill.ability, operation, level),
        0,
      )
    return sum + operationTotal
  }, 0)
}

function getInitialStatValue(skills: CardSkill[], level: number, stat: AbilityStat): number {
  return sumAbilityOperationValues(
    skills,
    level,
    (operation): operation is Extract<SupportAbilityOperation, { op: 'add_stat' }> =>
      operation.op === 'add_stat' && operation.timing === 'initial' && operation.stat === stat,
  )
}

export function getCardInitialStatsFromSkills(skills: CardSkill[], level: number, _cardType: CardType) {
  return {
    vo: getInitialStatValue(skills, level, 'vo'),
    da: getInitialStatValue(skills, level, 'da'),
    vi: getInitialStatValue(skills, level, 'vi'),
  }
}

export function getCardInitialStatsTotalFromSkills(
  skills: CardSkill[],
  level: number,
  cardType: CardType,
): number {
  const initialStats = getCardInitialStatsFromSkills(skills, level, cardType)
  return initialStats.vo + initialStats.da + initialStats.vi
}

export function formatSkillValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export interface CardSkillBadge {
  key: string
  label: string
  className?: string
  variant?: 'static' | 'detail'
  triggerKey?: string
  triggerLabel?: string
}

export interface CardContributionBadgeBreakdown extends CardSkillBadge {
  stat: AbilityStat
  triggerCount: number
  totalValueText: string
}

function getEffectTypeStat(effectType: SkillEffectType): AbilityStat | null {
  switch (effectType) {
    case 'vo_bonus':
    case 'initial_vo':
      return 'vo'
    case 'da_bonus':
    case 'initial_da':
      return 'da'
    case 'vi_bonus':
    case 'initial_vi':
      return 'vi'
    default:
      return null
  }
}

type TriggerCountResolver = (ability: SupportAbilitySpec) => number

export interface LessonTriggeredSkillBonus {
  affectedStat: keyof StatValues
  lessonType: 'sp' | 'normal' | 'all'
  lessonParam?: LessonParameter
  value: number
}

export interface SkillTriggerContext {
  key: string
  label: string
}

const LESSON_PARAM_LABELS: Record<NonNullable<SupportAbilitySpec['activation']['lessonParam']>, string> = {
  vocal: 'ボーカル',
  dance: 'ダンス',
  visual: 'ビジュアル',
  any: '',
}

const LESSON_PARAM_SHORT_LABELS: Record<
  NonNullable<SupportAbilitySpec['activation']['lessonParam']>,
  string
> = {
  vocal: 'Vo',
  dance: 'Da',
  visual: 'Vi',
  any: '',
}

const EFFECT_TAG_LABELS: Record<Extract<AbilityCondition, { type: 'effect_tag_is' }>['value'], string> = {
  energy: '元気',
  motivation: 'やる気',
  goodImpression: '好印象',
  goodCondition: '好調',
  preservation: '温存',
  concentration: '集中',
  fullPower: '全力',
  aggressive: '強気',
}

function isOwnedSkillCardsGte20Condition(ability: SupportAbilitySpec): boolean {
  return getAbilityConditions(ability).some(
    (condition): condition is Extract<AbilityCondition, { type: 'owned_skill_cards_gte' }> =>
      condition.type === 'owned_skill_cards_gte' && condition.value >= 20,
  )
}

export function getSkillTriggerContext(ability: SupportAbilitySpec): SkillTriggerContext {
  const conditions = getAbilityConditions(ability)
  if (
    conditions.some((condition) => condition.type === 'card_name_contains') ||
    (ability.activation.event === 'exam_end' &&
      conditions.some((condition) => condition.type === 'owned_skill_cards_gte'))
  ) {
    const setting = getParameterSortTriggerSetting(ability)
    return { key: setting.key, label: setting.label }
  }
  const ownedEffectCondition = conditions.find((condition) => condition.type === 'owned_effect_tag_cards_gte')
  const cardCategoryCondition = conditions.find(
    (condition): condition is Extract<AbilityCondition, { type: 'card_category_is' }> =>
      condition.type === 'card_category_is',
  )
  const cardRarityCondition = conditions.find(
    (condition): condition is Extract<AbilityCondition, { type: 'card_rarity_is' }> =>
      condition.type === 'card_rarity_is',
  )
  const effectTagCondition = conditions.find(
    (condition): condition is Extract<AbilityCondition, { type: 'effect_tag_is' }> =>
      condition.type === 'effect_tag_is',
  )

  const getSkillCardTriggerLabel = (
    triggerType:
      | 'skill_card_gained'
      | 'skill_card_deleted'
      | 'skill_card_upgraded'
      | 'skill_card_customized'
      | 'skill_card_changed',
    defaultLabel: string,
  ): { key: string; label: string } => {
    if (ownedEffectCondition) {
      return {
        key: `${triggerType}:owned_effect_tag:${ownedEffectCondition.tag}:${ownedEffectCondition.value}`,
        label: `${EFFECT_TAG_LABELS[ownedEffectCondition.tag]}効果のカードを${ownedEffectCondition.value}枚以上所持して${defaultLabel}`,
      }
    }
    if (effectTagCondition) {
      const effectTagLabel = EFFECT_TAG_LABELS[effectTagCondition.value]
      return {
        key: `${triggerType}:effect_tag:${effectTagCondition.value}`,
        label: `${effectTagLabel}効果の${defaultLabel}`,
      }
    }

    if (cardRarityCondition) {
      return {
        key: `${triggerType}:rarity:${cardRarityCondition.value}`,
        label: `スキルカード(${cardRarityCondition.value})${defaultLabel.replace(/^スキルカード/, '')}`,
      }
    }

    if (cardCategoryCondition?.value === 'active') {
      return {
        key: `${triggerType}:active`,
        label: `A${defaultLabel}`,
      }
    }

    if (cardCategoryCondition?.value === 'mental') {
      return {
        key: `${triggerType}:mental`,
        label: `M${defaultLabel}`,
      }
    }

    return {
      key: `${triggerType}:any`,
      label: defaultLabel,
    }
  }

  if (ability.activation.event === 'static') {
    return { key: 'static', label: '' }
  }

  if (ability.activation.event === 'lesson_end') {
    const lessonKind = ability.activation.lessonKind ?? 'any'
    const lessonParam = ability.activation.lessonParam ?? 'any'

    if (lessonKind === 'sp' && isOwnedSkillCardsGte20Condition(ability)) {
      return {
        key: 'lesson_end:sp:owned_skill_cards_gte_20',
        label: '20枚以上でSPレッスン終了時',
      }
    }

    if (lessonParam !== 'any') {
      const lessonParamLabel =
        lessonKind === 'sp' ? LESSON_PARAM_SHORT_LABELS[lessonParam] : LESSON_PARAM_LABELS[lessonParam]
      const lessonKindLabel =
        lessonKind === 'sp'
          ? 'SPレッスン終了時'
          : lessonKind === 'normal'
            ? '通常レッスン終了時'
            : 'レッスン終了時'

      return {
        key: `lesson_end:${lessonKind}:${lessonParam}`,
        label: `${lessonParamLabel}${lessonKindLabel}`,
      }
    }

    return {
      key: `lesson_end:${lessonKind}`,
      label:
        lessonKind === 'sp'
          ? 'SPレッスン終了時'
          : lessonKind === 'normal'
            ? '通常レッスン終了時'
            : 'レッスン終了時',
    }
  }

  if (ability.activation.event === 'skill_card_gained') {
    return getSkillCardTriggerLabel('skill_card_gained', 'スキルカード獲得時')
  }

  if (ability.activation.event === 'skill_card_deleted') {
    return getSkillCardTriggerLabel('skill_card_deleted', 'スキルカード削除時')
  }

  if (ability.activation.event === 'skill_card_upgraded') {
    return getSkillCardTriggerLabel('skill_card_upgraded', 'スキルカード強化時')
  }

  if (ability.activation.event === 'skill_card_customized') {
    return getSkillCardTriggerLabel('skill_card_customized', 'スキルカードカスタマイズ時')
  }

  if (ability.activation.event === 'skill_card_changed') {
    return getSkillCardTriggerLabel('skill_card_changed', 'スキルカードチェンジ時')
  }

  return {
    key: ability.activation.event,
    label: TRIGGER_BADGE_LABELS[ability.activation.event],
  }
}

function getEffectTypeValueFromSkill(
  skill: CardSkill,
  level: number,
  cardType: CardType,
  effectType: SkillEffectType,
): number {
  const operations = skill.ability.operations
  const sum = (predicate: (operation: SupportAbilityOperation) => boolean) =>
    operations
      .filter(predicate)
      .reduce((total, operation) => total + resolveOperationValue(skill.ability, operation, level), 0)
  switch (effectType) {
    case 'sp_rate':
      return sum(
        (operation) => operation.op === 'add_sp_rate' && doesEffectTargetCardType(operation.target, cardType),
      )
    case 'lesson_bonus':
      return sum(
        (operation) =>
          (operation.op === 'add_lesson_bonus' || operation.op === 'add_param_bonus') &&
          doesEffectTargetCardType(operation.target, cardType),
      )
    case 'initial_vo':
      return sum(
        (operation) =>
          operation.op === 'add_stat' && operation.timing === 'initial' && operation.stat === 'vo',
      )
    case 'initial_da':
      return sum(
        (operation) =>
          operation.op === 'add_stat' && operation.timing === 'initial' && operation.stat === 'da',
      )
    case 'initial_vi':
      return sum(
        (operation) =>
          operation.op === 'add_stat' && operation.timing === 'initial' && operation.stat === 'vi',
      )
    case 'vo_bonus':
      return sum(
        (operation) =>
          operation.op === 'add_stat' && operation.timing === 'activation' && operation.stat === 'vo',
      )
    case 'da_bonus':
      return sum(
        (operation) =>
          operation.op === 'add_stat' && operation.timing === 'activation' && operation.stat === 'da',
      )
    case 'vi_bonus':
      return sum(
        (operation) =>
          operation.op === 'add_stat' && operation.timing === 'activation' && operation.stat === 'vi',
      )
    case 'stamina_recovery':
      return sum((operation) => operation.op === 'add_stamina')
    case 'good_impression':
    case 'motivation':
    case 'mental_recovery':
    case 'fan_bonus':
      return getSkillValueAtLevel(skill, level)
    case 'other':
      return 0
  }
}

function formatEffectTypeBadgeLabel(effectType: SkillEffectType, value: number): string {
  if (value <= 0 || effectType === 'other') {
    return EFFECT_TYPE_LABELS[effectType]
  }

  const suffix =
    effectType === 'sp_rate' || effectType === 'lesson_bonus' || effectType === 'fan_bonus' ? '%' : ''
  return `${EFFECT_TYPE_LABELS[effectType]}+${formatSkillValue(value)}${suffix}`
}

function formatTriggeredEffectTypeBadgeLabel(
  triggerLabel: string,
  effectType: SkillEffectType,
  value: number,
): string {
  const baseLabel = formatEffectTypeBadgeLabel(effectType, value)
  return triggerLabel ? `${triggerLabel}${baseLabel}` : baseLabel
}

function getStaticFilterMeta(effectType: SkillEffectType): { key: string; label: string } {
  switch (effectType) {
    case 'sp_rate':
      return { key: 'static:sp_rate', label: 'SP率' }
    case 'lesson_bonus':
      return { key: 'static:lesson_bonus', label: 'LB' }
    case 'initial_vo':
    case 'initial_da':
    case 'initial_vi':
      return { key: 'static:initial', label: '初期値' }
    default:
      return { key: `static:${effectType}`, label: EFFECT_TYPE_LABELS[effectType] }
  }
}

function deriveSkillEffectType(skill: CardSkill): SkillEffectType | null {
  const primaryOperation = skill.ability.operations[0]

  if (!primaryOperation) {
    return null
  }

  switch (primaryOperation.op) {
    case 'add_sp_rate':
      return 'sp_rate'
    case 'add_lesson_bonus':
    case 'add_param_bonus':
      return 'lesson_bonus'
    case 'add_stamina':
      return 'stamina_recovery'
    case 'add_stat':
      if (primaryOperation.timing === 'initial') {
        return primaryOperation.stat === 'vo'
          ? 'initial_vo'
          : primaryOperation.stat === 'da'
            ? 'initial_da'
            : 'initial_vi'
      }
      return primaryOperation.stat === 'vo'
        ? 'vo_bonus'
        : primaryOperation.stat === 'da'
          ? 'da_bonus'
          : 'vi_bonus'
    default:
      return 'other'
  }
}

function isTypeBonusEffectType(effectType: SkillEffectType): boolean {
  return (
    effectType === 'vo_bonus' ||
    effectType === 'da_bonus' ||
    effectType === 'vi_bonus' ||
    effectType === 'initial_vo' ||
    effectType === 'initial_da' ||
    effectType === 'initial_vi'
  )
}

function getCardEffectTypeBadges(
  skills: CardSkill[],
  level: number,
  cardType: CardType,
  resolveTriggerCount?: TriggerCountResolver,
): CardSkillBadge[] {
  const groupedBadges = new Map<
    string,
    { effectType: SkillEffectType; triggerKey: string; triggerLabel: string; value: number }
  >()

  skills.forEach((skill) => {
    const effectType = deriveSkillEffectType(skill)
    if (!effectType) {
      return
    }

    const ability = skill.ability
    const trigger = getSkillTriggerContext(ability)
    const triggerCount =
      ability.activation.event === 'static' ? 1 : Math.max(0, resolveTriggerCount?.(ability) ?? 1)
    if (triggerCount <= 0) {
      return
    }

    const groupKey = `${effectType}:${trigger.key}`
    const value = getEffectTypeValueFromSkill(skill, level, cardType, effectType) * triggerCount
    if (value <= 0) {
      return
    }

    const existing = groupedBadges.get(groupKey)

    if (existing) {
      existing.value += value
      return
    }

    groupedBadges.set(groupKey, {
      effectType,
      triggerKey: trigger.key,
      triggerLabel: trigger.label,
      value,
    })
  })

  return Array.from(groupedBadges.entries())
    .sort((left, right) => {
      const priorityDiff =
        EFFECT_TYPE_PRIORITY[left[1].effectType] - EFFECT_TYPE_PRIORITY[right[1].effectType]
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      return left[0].localeCompare(right[0], 'ja')
    })
    .map(([key, badge]) => {
      const staticFilterMeta = badge.triggerKey === 'static' ? getStaticFilterMeta(badge.effectType) : null

      return {
        key: `effect-type-${key}`,
        label: formatTriggeredEffectTypeBadgeLabel(badge.triggerLabel, badge.effectType, badge.value),
        className: EFFECT_TYPE_BADGE_CLASSES[badge.effectType],
        variant: (badge.triggerLabel ? 'detail' : 'static') as CardSkillBadge['variant'],
        triggerKey: staticFilterMeta?.key ?? badge.triggerKey,
        triggerLabel: staticFilterMeta?.label ?? (badge.triggerLabel || undefined),
      }
    })
    .filter((badge) => !badge.key.startsWith('effect-type-other:'))
}

export function getCardSkillBadges(skills: CardSkill[], level: number, cardType: CardType): CardSkillBadge[] {
  return getCardEffectTypeBadges(skills, level, cardType)
}

export function getCardContributionBadges(
  skills: CardSkill[],
  level: number,
  cardType: CardType,
  resolveTriggerCount: TriggerCountResolver,
): CardSkillBadge[] {
  return getCardEffectTypeBadges(skills, level, cardType, resolveTriggerCount)
}

export function getCardContributionBadgeBreakdowns(
  skills: CardSkill[],
  level: number,
  cardType: CardType,
  resolveTriggerCount: TriggerCountResolver,
): CardContributionBadgeBreakdown[] {
  const groupedBadges = new Map<
    string,
    {
      effectType: SkillEffectType
      triggerKey: string
      triggerLabel: string
      oneTimeValue: number
      triggerCount: number
    }
  >()

  skills.forEach((skill) => {
    const effectType = deriveSkillEffectType(skill)
    if (!effectType || !isTypeBonusEffectType(effectType)) {
      return
    }

    const ability = skill.ability
    const trigger = getSkillTriggerContext(ability)
    const triggerCount = ability.activation.event === 'static' ? 1 : Math.max(0, resolveTriggerCount(ability))
    if (triggerCount <= 0) {
      return
    }

    const oneTimeValue = getEffectTypeValueFromSkill(skill, level, cardType, effectType)
    if (oneTimeValue <= 0) {
      return
    }

    const groupKey = `${effectType}:${trigger.key}`
    const existing = groupedBadges.get(groupKey)
    if (existing) {
      existing.oneTimeValue += oneTimeValue
      return
    }

    groupedBadges.set(groupKey, {
      effectType,
      triggerKey: trigger.key,
      triggerLabel: trigger.label,
      oneTimeValue,
      triggerCount,
    })
  })

  const sortedEntries = Array.from(groupedBadges.entries()).sort((left, right) => {
    const priorityDiff = EFFECT_TYPE_PRIORITY[left[1].effectType] - EFFECT_TYPE_PRIORITY[right[1].effectType]
    if (priorityDiff !== 0) {
      return priorityDiff
    }
    return left[0].localeCompare(right[0], 'ja')
  })

  const breakdowns: CardContributionBadgeBreakdown[] = []

  sortedEntries.forEach(([key, badge]) => {
    const staticFilterMeta = badge.triggerKey === 'static' ? getStaticFilterMeta(badge.effectType) : null
    const totalValue = badge.oneTimeValue * badge.triggerCount
    const stat = getEffectTypeStat(badge.effectType)

    if (!stat) {
      return
    }

    breakdowns.push({
      key: `effect-type-${key}`,
      label: formatTriggeredEffectTypeBadgeLabel(badge.triggerLabel, badge.effectType, badge.oneTimeValue),
      stat,
      totalValueText: formatSkillValue(totalValue),
      className: EFFECT_TYPE_BADGE_CLASSES[badge.effectType],
      variant: (badge.triggerLabel ? 'detail' : 'static') as CardSkillBadge['variant'],
      triggerKey: staticFilterMeta?.key ?? badge.triggerKey,
      triggerLabel: staticFilterMeta?.label ?? (badge.triggerLabel || undefined),
      triggerCount: badge.triggerCount,
    })
  })

  return breakdowns.filter((badge) => !badge.key.startsWith('effect-type-other:'))
}

export interface CardTriggerFilterOption {
  key: string
  label: string
  className?: string
}

export interface CardTriggerFilterGroup {
  key: string
  label: string
  options: CardTriggerFilterOption[]
}

function getCardTriggerGroupKey(option: CardTriggerFilterOption): string {
  if (option.key.startsWith('static:')) return 'static'
  if (option.key.startsWith('lesson_end:')) return 'lesson'
  if (
    option.key === 'exam_end' ||
    option.key === 'outing_end' ||
    option.key === 'rest_selected' ||
    option.key === 'class_end' ||
    option.key === 'activity_supply_selected' ||
    option.key === 'special_training_started' ||
    option.key === 'consultation_selected' ||
    option.key === 'consultation_after_drink_trade' ||
    option.key === 'consultation_after_card_trade'
  ) {
    return 'action'
  }
  if (option.key === 'item_gained' || option.key === 'drink_gained') return 'item'
  if (option.key.startsWith('skill_card_')) return 'skill-card'
  if (option.key === 'turn_start') return 'turn-start'
  return 'other'
}

export function groupCardTriggerOptions(options: CardTriggerFilterOption[]): CardTriggerFilterGroup[] {
  const groupLabels: Record<string, string> = {
    static: '固定値系',
    lesson: 'レッスン系',
    action: '行動系',
    item: 'アイテム・ドリンク系',
    'skill-card': 'スキルカード系',
    'turn-start': 'ターン開始系',
    other: 'その他',
  }

  const groupOrder = ['static', 'lesson', 'action', 'item', 'skill-card', 'turn-start', 'other']
  const grouped = new Map<string, CardTriggerFilterOption[]>()

  options.forEach((option) => {
    const groupKey = getCardTriggerGroupKey(option)
    const current = grouped.get(groupKey) ?? []
    current.push(option)
    grouped.set(groupKey, current)
  })

  return groupOrder
    .map((groupKey) => ({
      key: groupKey,
      label: groupLabels[groupKey],
      options: grouped.get(groupKey) ?? [],
    }))
    .filter((group) => group.options.length > 0)
}

function getSkillCardTriggerBaseLabel(baseKey: string): string | null {
  switch (baseKey) {
    case 'skill_card_gained':
      return 'スキルカード獲得時'
    case 'skill_card_deleted':
      return 'スキルカード削除時'
    case 'skill_card_upgraded':
      return 'スキルカード強化時'
    case 'skill_card_customized':
      return 'スキルカードカスタマイズ時'
    case 'skill_card_changed':
      return 'スキルカードチェンジ時'
    default:
      return null
  }
}

function getSkillCardTriggerInputOption(triggerKey: string): CardTriggerFilterOption | null {
  const [baseKey, variant, detail, threshold] = triggerKey.split(':')
  const baseLabel = getSkillCardTriggerBaseLabel(baseKey)

  if (!baseLabel) {
    return null
  }

  if (variant === 'owned_effect_tag' && detail && threshold) {
    const effectTagLabel = EFFECT_TAG_LABELS[detail as keyof typeof EFFECT_TAG_LABELS]
    if (effectTagLabel)
      return {
        key: triggerKey,
        label: `${effectTagLabel}効果のカードを${threshold}枚以上所持して${baseLabel}`,
      }
  }

  if (variant === 'effect_tag' && detail) {
    const effectTagLabel = EFFECT_TAG_LABELS[detail as keyof typeof EFFECT_TAG_LABELS]
    if (effectTagLabel) {
      return { key: triggerKey, label: `${effectTagLabel}効果の${baseLabel}` }
    }
  }

  if (variant === 'rarity' && detail) {
    return {
      key: triggerKey,
      label: `スキルカード(${detail})${baseLabel.replace(/^スキルカード/, '')}`,
    }
  }

  if (variant === 'active') {
    return { key: triggerKey, label: `A${baseLabel}` }
  }

  if (variant === 'mental') {
    return { key: triggerKey, label: `M${baseLabel}` }
  }

  return { key: triggerKey, label: baseLabel }
}

function compareTriggerFilterOptions(left: CardTriggerFilterOption, right: CardTriggerFilterOption): number {
  const staticOrder: Record<string, number> = {
    'static:sp_rate': 0,
    'static:lesson_bonus': 1,
    'static:initial': 2,
  }

  const leftStaticOrder = staticOrder[left.key]
  const rightStaticOrder = staticOrder[right.key]

  if (leftStaticOrder != null || rightStaticOrder != null) {
    if (leftStaticOrder == null) return 1
    if (rightStaticOrder == null) return -1
    return leftStaticOrder - rightStaticOrder
  }

  return left.label.localeCompare(right.label, 'ja')
}

export function getCardTriggerFilterOptions(cards: SupportCard[]): CardTriggerFilterOption[] {
  const options = new Map<string, CardTriggerFilterOption>()

  cards.forEach((card) => {
    getCardSkillBadges(card.skills, card.maxLevel, card.type)
      .filter((badge) => badge.triggerKey && badge.triggerLabel)
      .forEach((badge) => {
        options.set(badge.triggerKey!, {
          key: badge.triggerKey!,
          label: badge.triggerLabel!,
          className: badge.className,
        })
      })
  })

  return Array.from(options.values()).sort(compareTriggerFilterOptions)
}

export function getCardEventTriggerOptions(cards: SupportCard[]): CardTriggerFilterOption[] {
  const options = new Map<string, CardTriggerFilterOption>()

  cards.forEach((card) => {
    card.skills.forEach((skill) => {
      const trigger = getSkillTriggerContext(skill.ability)

      if (
        trigger.key === 'static' ||
        trigger.key === 'class_end' ||
        trigger.key === 'exam_end' ||
        trigger.key.startsWith('lesson_end:')
      ) {
        return
      }

      if (trigger.key.startsWith('skill_card_')) {
        if (trigger.key.includes(':condition:')) {
          options.set(trigger.key, { key: trigger.key, label: trigger.label })
          return
        }
        const option = getSkillCardTriggerInputOption(trigger.key)
        if (option) {
          options.set(option.key, option)
        }
        return
      }

      options.set(trigger.key, {
        key: trigger.key,
        label: trigger.label,
      })
    })
  })

  return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label, 'ja'))
}

export function getDefaultEventTriggerCount(key: string, produceConfig: ProduceConfig): number {
  const lessonTriggerMatch = key.match(/^lesson_end:(normal|sp|any)(?::(vocal|dance|visual))?$/)
  if (lessonTriggerMatch) {
    const [, lessonKind, lessonParam] = lessonTriggerMatch
    return produceConfig.hif.lessons.filter((lesson) => {
      if (!lesson.enabled || lesson.param === null || lesson.subParam === null) return false
      const kindMatches = lessonKind === 'any' || lesson.type === lessonKind
      const paramMatches = !lessonParam || lesson.param === lessonParam
      return kindMatches && paramMatches
    }).length
  }

  switch (key) {
    case 'lesson_end:sp:owned_skill_cards_gte_20':
      return 0
    case 'class_end':
      return produceConfig.hif.classes.filter((entry) => entry.enabled).length
    case 'exam_end':
      return 5
    default:
      return 0
  }
}

export function getLessonTriggeredSkillBonuses(
  skills: CardSkill[],
  level: number,
  _cardType: CardType,
): LessonTriggeredSkillBonus[] {
  return skills.flatMap((skill) => {
    const lessonContext = getLessonActivationContext(skill.ability)
    const addStatOperation = skill.ability.operations.find(
      (operation) => operation.op === 'add_stat' && operation.timing === 'activation',
    )

    if (!lessonContext || !addStatOperation || addStatOperation.op !== 'add_stat') {
      return []
    }

    const value = getSkillValueAtLevel(skill, level)
    if (value <= 0) {
      return []
    }

    return [
      {
        affectedStat: addStatOperation.stat,
        lessonType: lessonContext.lessonKind === 'any' ? 'all' : lessonContext.lessonKind,
        lessonParam: lessonContext.lessonParam === 'any' ? undefined : lessonContext.lessonParam,
        value,
      },
    ]
  })
}

/** アイドルプランの日本語ラベル */
export const IDOL_PLAN_LABELS = {
  vocal: 'ボーカルプラン',
  dance: 'ダンスプラン',
  visual: 'ビジュアルプラン',
} as const
