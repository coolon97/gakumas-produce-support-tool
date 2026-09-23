import type { SupportCard } from '@/types/card'
import { getAbilityLimit, resolveOperationValue } from '@/lib/support-ability'
import type {
  AbilityActivationEvent,
  AbilityCondition,
  AbilityPredicate,
  SupportAbilitySpec,
} from '@/types/support-ability'
import cardsData from '@data/cards.json'
import { HIF_LESSON_SCHEDULE } from '@/data/hif'
import { getSupportEventStatGain } from '@/lib/support-event-stat-gain'
import type { HifLessonConfig } from '@/types/produce'
import { isHifLessonReady } from '@/lib/hif-lesson-selection'

/**
 * H.I.F. のSP公開レッスンで得られるメインパラメータ。
 * 選抜1〜6は2, 4, 9, 11, 15, 18日目、本戦1〜2は2, 5日目に対応する。
 */
export const HIF_PUBLIC_LESSONS = [
  { id: 'selection-1', label: '選抜1', mainParameter: HIF_LESSON_SCHEDULE[0].sp.main },
  { id: 'selection-2', label: '選抜2', mainParameter: HIF_LESSON_SCHEDULE[1].sp.main },
  { id: 'selection-3', label: '選抜3', mainParameter: HIF_LESSON_SCHEDULE[2].sp.main },
  { id: 'selection-4', label: '選抜4', mainParameter: HIF_LESSON_SCHEDULE[3].sp.main },
  { id: 'selection-5', label: '選抜5', mainParameter: HIF_LESSON_SCHEDULE[4].sp.main },
  { id: 'selection-6', label: '選抜6', mainParameter: HIF_LESSON_SCHEDULE[5].sp.main },
  { id: 'final-1', label: '本戦1', mainParameter: HIF_LESSON_SCHEDULE[6].sp.main },
  { id: 'final-2', label: '本戦2', mainParameter: HIF_LESSON_SCHEDULE[7].sp.main },
] as const

export type HifPublicLessonId = (typeof HIF_PUBLIC_LESSONS)[number]['id']

export const ALL_HIF_PUBLIC_LESSON_IDS: HifPublicLessonId[] = HIF_PUBLIC_LESSONS.map((lesson) => lesson.id)

/** パラメータ合計の発生回数入力として表示する条件。 */
const EVENT_TRIGGER_SETTINGS = [
  { event: 'lesson_end', label: 'レッスン', defaultCount: 8 },
  { event: 'class_end', label: '授業', defaultCount: 6 },
  { event: 'consultation_selected', label: '相談', defaultCount: 6 },
  { event: 'activity_supply_selected', label: '活動支給・差し入れ', defaultCount: 5 },
  { event: 'outing_end', label: 'おでかけ', defaultCount: 5 },
  { event: 'rest_selected', label: '休む', defaultCount: 4 },
  { event: 'skill_card_gained', label: 'スキルカード獲得（効果指定なし）', defaultCount: 9 },
  { event: 'skill_card_upgraded', label: 'スキルカード強化', defaultCount: 5 },
  { event: 'skill_card_deleted', label: 'スキルカード削除', defaultCount: 5 },
  { event: 'drink_gained', label: 'Pドリンク獲得', defaultCount: 30 },
  { event: 'consultation_after_drink_trade', label: '相談でPドリンク獲得', defaultCount: 16 },
] as const satisfies ReadonlyArray<{ event: AbilityActivationEvent; label: string; defaultCount: number }>

type SkillCardGainCondition = Extract<
  AbilityCondition,
  { type: 'effect_tag_is' | 'card_category_is' | 'card_rarity_is' }
>

export const SKILL_CARD_GAIN_TRIGGER_SETTINGS = [
  {
    key: 'skill_card_gained:goodCondition',
    label: 'スキルカード獲得（好調）',
    condition: { type: 'effect_tag_is', value: 'goodCondition' },
  },
  {
    key: 'skill_card_gained:concentration',
    label: 'スキルカード獲得（集中）',
    condition: { type: 'effect_tag_is', value: 'concentration' },
  },
  {
    key: 'skill_card_gained:energy',
    label: 'スキルカード獲得（元気）',
    condition: { type: 'effect_tag_is', value: 'energy' },
  },
  {
    key: 'skill_card_gained:motivation',
    label: 'スキルカード獲得（やる気）',
    condition: { type: 'effect_tag_is', value: 'motivation' },
  },
  {
    key: 'skill_card_gained:goodImpression',
    label: 'スキルカード獲得（好印象）',
    condition: { type: 'effect_tag_is', value: 'goodImpression' },
  },
  {
    key: 'skill_card_gained:preservation',
    label: 'スキルカード獲得（温存）',
    condition: { type: 'effect_tag_is', value: 'preservation' },
  },
  {
    key: 'skill_card_gained:active',
    label: 'スキルカード獲得（アクティブ）',
    condition: { type: 'card_category_is', value: 'active' },
  },
  {
    key: 'skill_card_gained:mental',
    label: 'スキルカード獲得（メンタル）',
    condition: { type: 'card_category_is', value: 'mental' },
  },
  {
    key: 'skill_card_gained:SSR',
    label: 'スキルカード獲得（SSR）',
    condition: { type: 'card_rarity_is', value: 'SSR' },
  },
  {
    key: 'skill_card_gained:SR',
    label: 'スキルカード獲得（SR）',
    condition: { type: 'card_rarity_is', value: 'SR' },
  },
  {
    key: 'skill_card_gained:R',
    label: 'スキルカード獲得（R）',
    condition: { type: 'card_rarity_is', value: 'R' },
  },
  {
    key: 'skill_card_gained:fullPower',
    label: 'スキルカード獲得（全力）',
    condition: { type: 'effect_tag_is', value: 'fullPower' },
  },
  {
    key: 'skill_card_gained:aggressive',
    label: 'スキルカード獲得（強気）',
    condition: { type: 'effect_tag_is', value: 'aggressive' },
  },
] as const satisfies ReadonlyArray<{ key: string; label: string; condition: SkillCardGainCondition }>

const EVENT_LABELS: Record<AbilityActivationEvent, string> = {
  static: '常時効果',
  lesson_end: 'レッスン',
  exam_end: '試験・オーディション',
  outing_end: 'おでかけ',
  rest_selected: '休む',
  class_end: '授業・営業',
  activity_supply_selected: '活動支給・差し入れ',
  special_training_started: '特別指導開始',
  consultation_selected: '相談',
  consultation_after_drink_trade: '相談でPドリンク獲得',
  consultation_after_card_trade: '相談でスキルカード獲得',
  item_gained: 'Pアイテム獲得',
  drink_gained: 'Pドリンク獲得',
  skill_card_gained: 'スキルカード獲得',
  skill_card_deleted: 'スキルカード削除',
  skill_card_upgraded: 'スキルカード強化',
  skill_card_customized: 'スキルカードカスタム',
  skill_card_changed: 'スキルカードチェンジ',
  turn_start: 'ターン開始',
  other: 'その他の発動',
}
const TAG_LABELS = {
  goodCondition: '好調',
  concentration: '集中',
  energy: '元気',
  motivation: 'やる気',
  goodImpression: '好印象',
  preservation: '温存',
  fullPower: '全力',
  aggressive: '強気',
}
const STAT_LABELS = { vo: 'Vo', da: 'Da', vi: 'Vi' }

function conditionLabel(condition: AbilityCondition): string {
  switch (condition.type) {
    case 'owned_effect_tag_cards_gte':
      return `${TAG_LABELS[condition.tag]}効果のカードを${condition.value}枚以上所持`
    case 'owned_skill_cards_gte':
      return `スキルカードを${condition.value}枚以上所持`
    case 'stat_gte':
      return `${STAT_LABELS[condition.stat]}≥${condition.value}`
    case 'stat_lte':
      return `${STAT_LABELS[condition.stat]}≤${condition.value}`
    case 'stamina_gte_ratio':
      return `体力≥${condition.value * 100}%`
    case 'effect_tag_is':
      return `${TAG_LABELS[condition.value]}効果`
    case 'card_category_is':
      return condition.value === 'active' ? 'アクティブ' : 'メンタル'
    case 'card_rarity_is':
      return condition.value
    case 'card_name_contains':
      return `名前に「${condition.value}」を含むカード`
    case 'lesson_turn_only':
      return 'レッスン中のみ'
  }
}

function predicateLabel(predicate: AbilityPredicate): string {
  switch (predicate.type) {
    case 'condition':
      return conditionLabel(predicate.condition)
    case 'all':
      return predicate.predicates.map(predicateLabel).join(' かつ ')
    case 'any':
      return `(${predicate.predicates.map(predicateLabel).join(' または ')})`
    case 'not':
      return `「${predicateLabel(predicate.predicate)}」以外`
  }
}

/** Stable across source ordering, while preserving all/any/not semantics. */
function predicateKey(predicate: AbilityPredicate): string {
  switch (predicate.type) {
    case 'condition': {
      return JSON.stringify(
        Object.fromEntries(Object.entries(predicate.condition).sort(([a], [b]) => a.localeCompare(b))),
      )
    }
    case 'all':
    case 'any':
      return `${predicate.type}(${predicate.predicates.map(predicateKey).sort().join(',')})`
    case 'not':
      return `not(${predicateKey(predicate.predicate)})`
  }
}

export interface ParameterSortTriggerSetting {
  key: string
  label: string
  event: AbilityActivationEvent
  fallbackKey: string
  defaultCount: number
}

export function getParameterSortTriggerSetting(ability: SupportAbilitySpec): ParameterSortTriggerSetting {
  const event = ability.activation.event
  const base = EVENT_TRIGGER_SETTINGS.find((setting) => setting.event === event)
  const defaultCount = base?.defaultCount ?? getAbilityLimit(ability, 'produce') ?? 1
  const gainSetting =
    event === 'skill_card_gained' && ability.predicate?.type === 'condition'
      ? SKILL_CARD_GAIN_TRIGGER_SETTINGS.find(
          ({ condition }) =>
            predicateKey({ type: 'condition', condition }) === predicateKey(ability.predicate!),
        )
      : undefined
  if (gainSetting) return { ...gainSetting, event, fallbackKey: event, defaultCount }

  const lessonKind = ability.activation.lessonKind ?? 'any'
  const variant = event === 'lesson_end' && lessonKind !== 'any' ? `:${lessonKind}` : ''
  const key = `${event}${variant}${ability.predicate ? `:condition:${predicateKey(ability.predicate)}` : ''}`
  const lessonLabel =
    event === 'lesson_end'
      ? `${lessonKind === 'sp' ? 'SP' : lessonKind === 'normal' ? '通常' : ''}レッスン`
      : undefined
  const label = ability.predicate
    ? `${lessonLabel ?? EVENT_LABELS[event]}（${predicateLabel(ability.predicate)}）`
    : (lessonLabel ?? base?.label ?? EVENT_LABELS[event])
  return {
    key,
    label,
    event,
    fallbackKey: event,
    defaultCount,
  }
}

export function getParameterSortTriggerSettings(
  cards: readonly SupportCard[],
): ParameterSortTriggerSetting[] {
  const settings = new Map<string, ParameterSortTriggerSetting>(
    EVENT_TRIGGER_SETTINGS.map((setting) => [
      setting.event,
      {
        key: setting.event,
        label: setting.label,
        event: setting.event,
        fallbackKey: setting.event,
        defaultCount: setting.defaultCount,
      },
    ]),
  )
  SKILL_CARD_GAIN_TRIGGER_SETTINGS.forEach((setting) =>
    settings.set(setting.key, {
      ...setting,
      event: 'skill_card_gained',
      fallbackKey: 'skill_card_gained',
      defaultCount: 9,
    }),
  )
  cards.forEach((card) =>
    [
      ...card.skills.map(({ ability }) => ability),
      ...(card.supportEventRewards ?? []).flatMap((reward) =>
        reward.kind === 'p_item' && reward.parameterAbility ? [reward.parameterAbility] : [],
      ),
    ].forEach((ability) => {
      if (ability.activation.event === 'static') return
      const setting = getParameterSortTriggerSetting(ability)
      const previous = settings.get(setting.key)
      settings.set(setting.key, {
        ...setting,
        defaultCount: Math.max(setting.defaultCount, previous?.defaultCount ?? 0),
      })
    }),
  )
  const eventOrder = Object.keys(EVENT_LABELS)
  return [...settings.values()].sort((a, b) => eventOrder.indexOf(a.event) - eventOrder.indexOf(b.event))
}

export const PARAMETER_SORT_TRIGGER_SETTINGS = getParameterSortTriggerSettings(cardsData as SupportCard[])
function triggerGroupKey(event: AbilityActivationEvent): string {
  return event === 'consultation_after_drink_trade' || event === 'consultation_after_card_trade'
    ? 'consultation_gain'
    : event
}
export const PARAMETER_SORT_TRIGGER_GROUPS = [
  ...new Set(PARAMETER_SORT_TRIGGER_SETTINGS.map(({ event }) => triggerGroupKey(event))),
].map((key) => {
  const settings = PARAMETER_SORT_TRIGGER_SETTINGS.filter((setting) => triggerGroupKey(setting.event) === key)
  return {
    key,
    label: key === 'consultation_gain' ? '相談で獲得' : EVENT_LABELS[settings[0].event],
    settings,
  }
})

export type ParameterSortTriggerKey = string
export type ParameterSortTriggerCounts = Record<ParameterSortTriggerKey, number>

export const DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS = Object.fromEntries(
  PARAMETER_SORT_TRIGGER_SETTINGS.map(({ key, defaultCount }) => [key, defaultCount]),
) as ParameterSortTriggerCounts

export function getLessonTriggerCountsForSelection(
  counts: ParameterSortTriggerCounts,
  selectedLessonIds: ReadonlySet<HifPublicLessonId>,
): ParameterSortTriggerCounts {
  const next = { ...counts }
  PARAMETER_SORT_TRIGGER_SETTINGS.forEach(({ key, event }) => {
    if (event === 'lesson_end') next[key] = selectedLessonIds.size
  })
  return next
}

/** Main and sub gains by attribute; disabled or incomplete lessons do not contribute. */
export function getHifSortLessonParameters(lessons: readonly HifLessonConfig[]) {
  const totals = { vocal: 0, dance: 0, visual: 0 }
  lessons.forEach((lesson, index) => {
    if (lesson.enabled && isHifLessonReady(lesson) && HIF_LESSON_SCHEDULE[index]) {
      const gain = HIF_LESSON_SCHEDULE[index][lesson.type]
      totals[lesson.param] += gain.main
      totals[lesson.subParam] += gain.sub
    }
  })
  return totals
}

export function getLessonTriggerCountsForConfig(
  counts: ParameterSortTriggerCounts,
  lessons: readonly HifLessonConfig[],
): ParameterSortTriggerCounts {
  const active = lessons.filter((lesson) => lesson.enabled && isHifLessonReady(lesson))
  return {
    ...counts,
    ...Object.fromEntries(
      PARAMETER_SORT_TRIGGER_SETTINGS.filter(({ event }) => event === 'lesson_end').map(({ key }) => {
        if (key.includes(':condition:')) return [key, 0]
        const kind = key.split(':')[1]
        return [
          key,
          kind === 'sp' || kind === 'normal'
            ? active.filter((lesson) => lesson.type === kind).length
            : active.length,
        ]
      }),
    ),
  }
}

function getConfiguredTriggerCount(ability: SupportAbilitySpec, counts: ParameterSortTriggerCounts): number {
  const setting = getParameterSortTriggerSetting(ability)
  return counts[setting.key] ?? counts[setting.fallbackKey] ?? setting.defaultCount
}

export interface SupportCardParameterTotal {
  directParameter: number
  lessonBaseParameter: number
  lessonBonusRate: number
  lessonBonusParameter: number
  pItemParameter: number
  eventParameter: number
  total: number
}

export function getSelectedHifMainParameterTotal(selectedLessonIds: ReadonlySet<HifPublicLessonId>): number {
  return HIF_PUBLIC_LESSONS.reduce(
    (sum, lesson) => sum + (selectedLessonIds.has(lesson.id) ? lesson.mainParameter : 0),
    0,
  )
}

/**
 * カードの全条件を満たした場合の比較用パラメータ合計。
 * 固定値効果は入力された発生回数分を使い、カードに発動上限があればその値で制限する。
 */
export function getSupportCardParameterTotal(
  card: SupportCard,
  lessonSelection: ReadonlySet<HifPublicLessonId> | readonly HifLessonConfig[],
  triggerCounts: ParameterSortTriggerCounts = DEFAULT_PARAMETER_SORT_TRIGGER_COUNTS,
  includePItems = false,
): SupportCardParameterTotal {
  let directParameter = 0
  let lessonBonusRate = 0
  let lessonBonusParameter = 0
  const lessonTotals = Array.isArray(lessonSelection) ? getHifSortLessonParameters(lessonSelection) : null
  const totalLesson = lessonTotals
    ? lessonTotals.vocal + lessonTotals.dance + lessonTotals.visual
    : getSelectedHifMainParameterTotal(lessonSelection as ReadonlySet<HifPublicLessonId>)
  const lessonBaseParameter = lessonTotals && card.type !== 'assist' ? lessonTotals[card.type] : totalLesson

  card.skills.forEach((skill) => {
    if (skill.unlockLevel > card.maxLevel) return

    const produceLimit = getAbilityLimit(skill.ability, 'produce')

    skill.ability.operations.forEach((operation) => {
      const value = resolveOperationValue(skill.ability, operation, card.maxLevel)

      if (operation.op === 'add_stat') {
        const configuredCount = getConfiguredTriggerCount(skill.ability, triggerCounts)
        const normalizedCount = Math.max(0, Math.floor(configuredCount))
        const triggerCount =
          operation.timing === 'initial'
            ? 1
            : produceLimit == null
              ? normalizedCount
              : Math.min(normalizedCount, produceLimit)
        // 実際の計算と同様、カード内の各効果を切り捨ててから合計する。
        directParameter += Math.floor(value * triggerCount)
        return
      }

      if (
        (operation.op === 'add_lesson_bonus' || operation.op === 'add_param_bonus') &&
        (lessonTotals || operation.target === 'all' || operation.target === card.type)
      ) {
        lessonBonusRate += value
        const base = lessonTotals
          ? operation.target === 'all'
            ? totalLesson
            : operation.target === 'assist'
              ? 0
              : lessonTotals[operation.target]
          : lessonBaseParameter
        lessonBonusParameter += Math.floor((base * value) / 100)
      }
    })
  })

  let pItemParameter = 0
  if (includePItems) {
    card.supportEventRewards?.forEach((reward) => {
      if (reward.kind !== 'p_item' || !reward.parameterAbility) return
      const ability = reward.parameterAbility
      const configuredCount = getConfiguredTriggerCount(ability, triggerCounts)
      const normalizedCount = Number.isFinite(configuredCount) ? Math.max(0, Math.floor(configuredCount)) : 0
      const limit = getAbilityLimit(ability, 'produce')
      const count = limit == null ? normalizedCount : Math.min(normalizedCount, limit)
      ability.operations.forEach((operation) => {
        if (operation.op === 'add_stat')
          pItemParameter += Math.floor(resolveOperationValue(ability, operation, card.maxLevel) * count)
      })
    })
  }

  const eventGain = getSupportEventStatGain(
    { card, level: card.maxLevel, isRental: false },
    'all',
    'per-effect',
  )
  const eventParameter = eventGain.vo + eventGain.da + eventGain.vi

  return {
    directParameter,
    lessonBaseParameter,
    lessonBonusRate,
    lessonBonusParameter,
    pItemParameter,
    eventParameter,
    total: directParameter + lessonBonusParameter + pItemParameter + eventParameter,
  }
}
