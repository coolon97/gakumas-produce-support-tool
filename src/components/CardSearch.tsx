import { useEffect, useMemo, useRef, useState } from 'react'
import type { SupportCard } from '@/types/card'
import type { HifLessonConfig } from '@/types/produce'
import { HifPublicLessons } from '@/components/HifPublicLessons'
import {
  cn,
  CARD_TYPE_SOFT_COLORS,
  CARD_TYPE_SHORT_LABELS,
  RARITY_COLORS,
  RARITY_PANEL_COLORS,
  getCardSkillBadges,
  getCardTriggerFilterOptions,
  groupCardTriggerOptions,
  formatSkillValue,
  type CardTriggerFilterOption,
} from '@/lib/utils'
import {
  PARAMETER_SORT_TRIGGER_GROUPS,
  getHifSortLessonParameters,
  getLessonTriggerCountsForConfig,
  getSupportCardParameterTotal,
  type ParameterSortTriggerCounts,
  type ParameterSortTriggerKey,
} from '@/lib/support-card-parameter-total'
import {
  createDefaultSupportCardSortPreferences,
  loadSupportCardSortPreferences,
  saveSupportCardSortPreferences,
} from '@/lib/support-card-sort-preferences'
import { usePersistentInput } from '@/lib/use-persistent-input'
import { compareSupportCards, type CardSortMode } from '@/lib/support-card-sort'
import { getScheduledSupportCardTotals } from '@/lib/support-card-schedule-sort'
import { DeckAbilityPopover } from '@/components/DeckAbilityPopover'
import cardsData from '@data/cards.json'
import { resolveLocalAssetUrl } from '@/lib/local-asset-urls'
import { useCardSearchStore } from '@/store/selectors'
import planAnomalyIcon from '@assets/game/plan-anomaly.webp'
import planFreeIcon from '@assets/game/plan-free.webp'
import planLogicIcon from '@assets/game/plan-logic.webp'
import planSenseIcon from '@assets/game/plan-sense.webp'

const ALL_CARDS = cardsData as SupportCard[]
const PLAN_BADGE_LABELS: Record<SupportCard['plan'], string> = {
  sense: 'センス',
  logic: 'ロジック',
  anomaly: 'アノマリー',
  free: 'フリー',
}
const PLAN_ICON_URLS: Partial<Record<SupportCard['plan'], string>> = {
  sense: planSenseIcon,
  logic: planLogicIcon,
  anomaly: planAnomalyIcon,
  free: planFreeIcon,
}

const LOCAL_SUPPORT_IMAGE_MODULES = import.meta.glob(
  '../../assets/game/Support/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
  {
    eager: true,
    import: 'default',
  },
) as Record<string, string>

const LOCAL_SUPPORT_IMAGE_URLS = Object.fromEntries(
  Object.entries(LOCAL_SUPPORT_IMAGE_MODULES).map(([path, url]) => {
    const fileName = path.split('/').pop() ?? path
    const key = fileName.replace(/\.[^.]+$/, '')
    return [key, url]
  }),
) as Record<string, string>

interface CardSearchProps {
  targetSlot?: number
  initialPlans?: Array<SupportCard['plan']>
  onCardSelected?: () => void
}

type TriggerFilterOption = CardTriggerFilterOption

type TriggerFilterGroup = {
  key: string
  label: string
  options: TriggerFilterOption[]
}

type StoredCardSortMode = CardSortMode | 'default'

function toggleSetValue<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current)
  next.has(value) ? next.delete(value) : next.add(value)
  return next
}

function getSortPreferenceStorage() {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function CardSearch({ targetSlot, initialPlans = [], onCardSelected }: CardSearchProps) {
  const { deck, addToDeck, produceConfig } = useCardSearchStore()
  const [searchQuery, setSearchQuery] = usePersistentInput('support.search', '')
  const [filterTypes, setFilterTypes] = usePersistentInput<Set<SupportCard['type']>>(
    'support.types',
    new Set(),
  )
  const [filterRarities, setFilterRarities] = usePersistentInput<Set<SupportCard['rarity']>>(
    'support.rarities',
    new Set(),
  )
  const [filterPlans, setFilterPlans] = usePersistentInput<Set<SupportCard['plan']>>(
    'support.plans',
    new Set(initialPlans),
  )
  const [filterEffects, setFilterEffects] = usePersistentInput<Set<string>>('support.effects', new Set())
  const [details, setDetails] = useState<{ card: SupportCard; anchor: HTMLButtonElement } | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [storedSortMode, setStoredSortMode] = usePersistentInput<StoredCardSortMode>(
    'support.sort',
    'release',
  )
  const sortMode: CardSortMode = ['release', 'parameter-total', 'plan', 'attribute', 'rarity'].includes(
    storedSortMode,
  )
    ? (storedSortMode as CardSortMode)
    : 'release'
  const [initialSortPreferences] = useState(() => loadSupportCardSortPreferences(getSortPreferenceStorage()))
  const [hifLessons, setHifLessons] = useState<HifLessonConfig[]>(initialSortPreferences.lessons)
  const [useCurrentSchedule, setUseCurrentSchedule] = useState(initialSortPreferences.useCurrentSchedule)
  const [parameterTriggerCounts, setParameterTriggerCounts] = useState<ParameterSortTriggerCounts>(
    initialSortPreferences.triggerCounts,
  )
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const initialPlanKey = initialPlans.join(',')

  useEffect(() => {
    if (initialPlans.length > 0) setFilterPlans(new Set(initialPlans))
  }, [initialPlanKey, setFilterPlans])

  const effectOptions = useMemo(() => getCardTriggerFilterOptions(ALL_CARDS), [])
  const groupedEffectOptions = useMemo<TriggerFilterGroup[]>(
    () => groupCardTriggerOptions(effectOptions),
    [effectOptions],
  )
  const selectedEffectOptions = useMemo(
    () => effectOptions.filter((effect) => filterEffects.has(effect.key)),
    [effectOptions, filterEffects],
  )
  const activeFilterCount = filterPlans.size + filterTypes.size + filterRarities.size + filterEffects.size
  const activeFilterSummary = useMemo(() => {
    const labels = [
      ...Array.from(filterPlans, (plan) => PLAN_BADGE_LABELS[plan]),
      ...Array.from(filterTypes, (type) => CARD_TYPE_SHORT_LABELS[type]),
      ...filterRarities,
      ...selectedEffectOptions.map((effect) => effect.label),
    ]

    return labels.join('・')
  }, [filterPlans, filterTypes, filterRarities, selectedEffectOptions])
  const effectiveManualTriggerCounts = useMemo(() => {
    const derived = getLessonTriggerCountsForConfig(parameterTriggerCounts, hifLessons)
    PARAMETER_SORT_TRIGGER_GROUPS.flatMap((group) => group.settings).forEach((setting) => {
      if (setting.event === 'lesson_end' && setting.key.includes(':condition:')) {
        derived[setting.key] = parameterTriggerCounts[setting.key] ?? 0
      }
    })
    return derived
  }, [parameterTriggerCounts, hifLessons])
  const selectedHifParameter = useMemo(
    () => Object.values(getHifSortLessonParameters(hifLessons)).reduce((sum, value) => sum + value, 0),
    [hifLessons],
  )

  useEffect(() => {
    saveSupportCardSortPreferences(getSortPreferenceStorage(), {
      lessons: hifLessons,
      triggerCounts: parameterTriggerCounts,
      useCurrentSchedule,
    })
  }, [hifLessons, parameterTriggerCounts, useCurrentSchedule])

  useEffect(() => {
    if (storedSortMode === 'default') setStoredSortMode('release')
  }, [storedSortMode, setStoredSortMode])

  useEffect(() => {
    if (!isFilterOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterPanelRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [isFilterOpen])

  const matchingCards = useMemo(() => {
    return ALL_CARDS.filter((card) => {
      if (searchQuery && !card.name.includes(searchQuery)) {
        return false
      }
      if (filterTypes.size > 0 && !filterTypes.has(card.type as any)) return false
      if (filterRarities.size > 0 && !filterRarities.has(card.rarity)) return false
      if (filterPlans.size > 0 && !filterPlans.has(card.plan as any)) return false
      if (filterEffects.size > 0) {
        const cardTriggerKeys = new Set(
          getCardSkillBadges(card.skills, card.maxLevel, card.type)
            .map((badge) => badge.triggerKey)
            .filter((triggerKey): triggerKey is string => Boolean(triggerKey)),
        )

        if (!Array.from(filterEffects).every((effectKey) => cardTriggerKeys.has(effectKey))) {
          return false
        }
      }
      return true
    })
  }, [searchQuery, filterTypes, filterRarities, filterPlans, filterEffects])

  const cardParameterTotals = useMemo(() => {
    if (sortMode !== 'parameter-total') return new Map<string, number>()
    if (useCurrentSchedule) {
      return getScheduledSupportCardTotals(matchingCards, deck, produceConfig, targetSlot)
    }
    return new Map(
      matchingCards.map((card) => [
        card.id,
        getSupportCardParameterTotal(card, hifLessons, effectiveManualTriggerCounts, true).total,
      ]),
    )
  }, [
    sortMode,
    useCurrentSchedule,
    matchingCards,
    deck,
    produceConfig,
    targetSlot,
    hifLessons,
    effectiveManualTriggerCounts,
  ])

  const filtered = useMemo(
    () =>
      [...matchingCards].sort((left, right) =>
        compareSupportCards(left, right, sortMode, cardParameterTotals),
      ),
    [matchingCards, sortMode, cardParameterTotals],
  )

  const deckCardIds = new Set(deck.map((dc) => dc.card.id))

  const clearFilters = () => {
    setFilterTypes(new Set())
    setFilterRarities(new Set())
    setFilterPlans(new Set())
    setFilterEffects(new Set())
  }

  const updateParameterTriggerCount = (key: ParameterSortTriggerKey, value: number) => {
    const normalizedValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
    setParameterTriggerCounts((current) => ({ ...current, [key]: normalizedValue }))
  }

  const updateHifLessons = (next: HifLessonConfig[]) => {
    setHifLessons(next)
  }

  const resetParameterSortConditions = () => {
    const defaults = createDefaultSupportCardSortPreferences()
    setHifLessons(defaults.lessons)
    setParameterTriggerCounts(defaults.triggerCounts)
    setUseCurrentSchedule(false)
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div
        ref={filterPanelRef}
        className="relative"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && isFilterOpen) {
            event.stopPropagation()
            setIsFilterOpen(false)
          }
        }}
      >
        <div className="flex items-center gap-2">
          {/* 検索入力 */}
          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-gray-400"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="m12.5 12.5 4 4" />
            </svg>
            <input
              type="text"
              aria-label="カード名で検索"
              placeholder="カード名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="shrink-0">
            <button
              type="button"
              aria-label="絞り込み条件"
              aria-expanded={isFilterOpen}
              aria-controls="support-card-filters"
              onClick={() => setIsFilterOpen((open) => !open)}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300',
                isFilterOpen
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4 fill-none stroke-current"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path d="M3 5h14M5.5 10h9M8 15h4" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">絞り込み</span>
              {activeFilterCount > 0 && (
                <span className="min-w-5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                  {activeFilterCount}
                </span>
              )}
              <svg
                viewBox="0 0 12 12"
                className={cn(
                  'hidden h-3 w-3 fill-current transition-transform sm:block',
                  isFilterOpen && 'rotate-180',
                )}
                aria-hidden="true"
              >
                <path d="m2.2 4 3.8 4 3.8-4H2.2Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* フィルター */}
        <div
          id="support-card-filters"
          className={cn(
            'absolute right-0 top-12 z-40 max-h-[min(60vh,32rem)] w-[min(38rem,calc(100vw-3rem))] flex-col gap-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl',
            isFilterOpen ? 'flex' : 'hidden',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <p className="text-sm font-bold text-gray-700">絞り込み条件</p>
              <p className="mt-0.5 text-[11px] text-gray-400">選択した条件でカードを絞り込みます</p>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
              className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-default disabled:text-gray-300 disabled:hover:bg-transparent"
            >
              すべて解除
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-gray-500">プラン</p>
              <div className="flex flex-wrap gap-1.5">
                {(['sense', 'logic', 'anomaly', 'free'] as const).map((p) => {
                  const active = filterPlans.has(p)
                  return (
                    <button
                      key={p}
                      onClick={() => setFilterPlans((current) => toggleSetValue(current, p))}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors border',
                        active
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <PlanBadgeIcon plan={p} />
                      {PLAN_BADGE_LABELS[p]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-gray-500">タイプ</p>
              <div className="flex flex-wrap gap-1.5">
                {(['vocal', 'dance', 'visual', 'assist'] as const).map((t) => {
                  const active = filterTypes.has(t)
                  return (
                    <button
                      key={t}
                      onClick={() => setFilterTypes((current) => toggleSetValue(current, t))}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs transition-colors border',
                        active
                          ? CARD_TYPE_SOFT_COLORS[t]
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      {CARD_TYPE_SHORT_LABELS[t]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-gray-500">レアリティ</p>
              <div className="flex flex-wrap gap-1.5">
                {(['SSR', 'SR', 'R'] as const).map((r) => {
                  const active = filterRarities.has(r)
                  return (
                    <button
                      key={r}
                      onClick={() => setFilterRarities((current) => toggleSetValue(current, r))}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs transition-colors border',
                        active ? RARITY_COLORS[r] : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <details className="group/effect-filter rounded-xl border border-gray-200 bg-gray-50">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 text-sm font-semibold text-gray-700">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span>効果選択</span>
                  <span className="text-[11px] font-medium text-gray-400">
                    {filterEffects.size > 0 ? `${filterEffects.size}件選択中` : '未選択'}
                  </span>
                </div>
                {selectedEffectOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedEffectOptions.map((effect) => (
                      <span
                        key={effect.key}
                        className={cn(
                          'rounded px-1.5 py-0.5 border text-[11px]',
                          effect.className ?? 'bg-slate-100 text-slate-600 border-slate-300',
                        )}
                      >
                        {effect.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span
                aria-hidden="true"
                className="pt-0.5 text-xs text-gray-400 transition-transform group-open/effect-filter:rotate-180"
              >
                ▼
              </span>
            </summary>
            <div className="flex flex-col gap-3 border-t border-gray-200 px-3 py-3">
              {groupedEffectOptions.map((group) => (
                <div key={group.key} className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-gray-500">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((effect) => {
                      const active = filterEffects.has(effect.key)
                      return (
                        <button
                          key={effect.key}
                          onClick={() => setFilterEffects((current) => toggleSetValue(current, effect.key))}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs transition-colors border',
                            active
                              ? 'bg-slate-700 text-white border-slate-700'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                          )}
                        >
                          {effect.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* 件数・適用中条件・並び順 */}
      <div className="flex min-h-8 items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 font-medium text-gray-500">{filtered.length} 件</p>
          {activeFilterSummary && (
            <p className="truncate text-[11px] text-gray-400" title={activeFilterSummary}>
              {activeFilterSummary}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <label className="sr-only" htmlFor="support-card-sort">
            並び順
          </label>
          <select
            id="support-card-sort"
            value={sortMode}
            onChange={(event) => setStoredSortMode(event.target.value as CardSortMode)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="release">リリース日（新しい順）</option>
            <option value="plan">プラン順</option>
            <option value="attribute">属性順</option>
            <option value="rarity">レアリティ（SSR→SR→R）</option>
            <option value="parameter-total">パラメータ合計</option>
          </select>

          {sortMode === 'parameter-total' && (
            <details className="group relative">
              <summary className="flex h-8 cursor-pointer list-none items-center justify-between gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-100">
                <span>計算条件</span>
                <span
                  aria-hidden="true"
                  className="text-xs text-gray-400 transition-transform group-open:rotate-180"
                >
                  ▼
                </span>
              </summary>
              <div className="absolute right-0 top-full z-40 mt-2 max-h-[min(65vh,36rem)] w-[min(24rem,calc(100vw-3rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-2 text-xs font-semibold text-indigo-900">
                    <input
                      type="checkbox"
                      checked={useCurrentSchedule}
                      onChange={(event) => setUseCurrentSchedule(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-indigo-300"
                    />
                    <span>
                      現在のスケジュール設定で比較
                      <span className="mt-0.5 block text-[10px] font-normal leading-relaxed text-indigo-600">
                        初日から確定済みの最新日程までを再現
                      </span>
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={resetParameterSortConditions}
                    className="shrink-0 rounded px-1.5 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
                  >
                    全てリセット
                  </button>
                </div>
                <p className="mb-3 text-[10px] leading-relaxed text-gray-500">
                  育成ステータスの上昇分が対象です。Pアイテムとイベント報酬の上昇分も常に加算します。手動条件の初期値はすべて0で、入力内容は次回も復元します。
                </p>
                <fieldset
                  disabled={useCurrentSchedule}
                  className={cn('transition-opacity', useCurrentSchedule && 'opacity-45')}
                >
                  <details className="group/lessons rounded-xl border border-gray-200 bg-gray-50">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700">
                      <span>公開レッスン設定</span>
                      <span className="text-[10px] text-gray-400 transition-transform group-open/lessons:rotate-180">
                        ▼
                      </span>
                    </summary>
                    <div className="border-t border-gray-200 p-2.5">
                      <HifPublicLessons
                        lessons={hifLessons}
                        onChange={updateHifLessons}
                        showHeading={false}
                      />
                      <p className="mt-2 border-t border-gray-100 pt-2 text-right text-[11px] text-gray-500">
                        選択中のメイン＋サブ合計{' '}
                        <strong className="text-indigo-700">{selectedHifParameter}</strong>
                      </p>
                    </div>
                  </details>

                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-gray-700">効果の発生回数</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-gray-400">
                          カードに回数上限がある場合は小さい方を使用
                        </p>
                      </div>
                    </div>
                    <p className="mb-2 text-[10px] leading-relaxed text-gray-400">
                      レッスン回数とSPレッスン回数は上の公開レッスン設定から自動計算します。ここでの変更はソートにのみ使用し、プロデュース設定には反映しません。常時効果は固定で計算します。
                    </p>
                    <p className="mb-2 text-[10px] leading-relaxed text-gray-400">
                      体力回復など、パラメータを直接増やさない効果は合計に加算されません。
                    </p>
                    <div className="grid gap-3">
                      {PARAMETER_SORT_TRIGGER_GROUPS.map((group) => (
                        <div key={group.key}>
                          <p className="mb-1.5 text-[11px] font-bold text-gray-700">{group.label}</p>
                          <div className="grid gap-1.5">
                            {group.settings.map((setting) => (
                              <label
                                key={setting.key}
                                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-2 py-1.5 text-[11px] text-gray-600"
                              >
                                <span className="min-w-0 flex-1 whitespace-normal break-words leading-relaxed">
                                  {setting.label}
                                </span>
                                <span className="inline-flex shrink-0 items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    inputMode="numeric"
                                    aria-label={`${setting.label}の発生回数`}
                                    value={effectiveManualTriggerCounts[setting.key]}
                                    disabled={
                                      setting.event === 'lesson_end' && !setting.key.includes(':condition:')
                                    }
                                    onChange={(event) =>
                                      updateParameterTriggerCount(setting.key, event.target.valueAsNumber)
                                    }
                                    className="h-7 w-14 rounded-md border border-gray-200 bg-white px-1.5 text-right text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                  />
                                  <span className="text-[10px] text-gray-400">回</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </fieldset>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* カードグリッド */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {filtered.map((card) => {
            const inDeck = deckCardIds.has(card.id)
            return (
              <div
                key={card.id}
                className={cn(
                  'relative flex h-full flex-col text-left rounded-xl border overflow-hidden transition-colors',
                  inDeck
                    ? 'border-gray-500 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-400 bg-white hover:border-gray-500 hover:shadow-sm cursor-pointer',
                )}
              >
                {inDeck && (
                  <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-900/15">
                    <span className="rounded-full border border-gray-400 bg-gray-700/90 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      選択済み
                    </span>
                  </span>
                )}
                {sortMode === 'parameter-total' && (
                  <span className="pointer-events-none absolute right-1.5 top-1.5 z-10 rounded-md bg-slate-900/85 px-1.5 py-1 text-[10px] font-bold leading-none text-white shadow-sm">
                    合計 +{formatSkillValue(cardParameterTotals.get(card.id) ?? 0)}
                  </span>
                )}
                <button
                  type="button"
                  data-tutorial-support-card
                  disabled={inDeck}
                  aria-label={`${card.name}を編成に追加`}
                  onClick={() => {
                    setDetails(null)
                    addToDeck(card, targetSlot)
                    onCardSelected?.()
                  }}
                  className="flex w-full flex-1 flex-col text-left disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
                >
                  {/* イラスト上2/3を表示 */}
                  {getSupportCardImageUrl(card) ? (
                    <img
                      src={getSupportCardImageUrl(card)}
                      alt={card.name}
                      className="w-full aspect-[8/3] object-cover object-top"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-[8/3] bg-gray-100 flex items-center justify-center">
                      <span className="text-xs text-gray-400">No Image</span>
                    </div>
                  )}
                  {/* テキスト情報 */}
                  <div
                    className={cn(
                      'flex w-full flex-1 flex-col py-1.5 pl-2 pr-12',
                      RARITY_PANEL_COLORS[card.rarity],
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-1 mb-0.5">
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-1.5 py-0.5 text-xs leading-none',
                          RARITY_COLORS[card.rarity],
                        )}
                      >
                        {card.rarity}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-xs px-1.5 py-0.5 rounded-md leading-none font-bold',
                          CARD_TYPE_SOFT_COLORS[card.type],
                        )}
                      >
                        {CARD_TYPE_SHORT_LABELS[card.type]}
                      </span>
                      <span
                        title={PLAN_BADGE_LABELS[card.plan]}
                        className="inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-none font-medium bg-slate-100 text-slate-600 border border-slate-300"
                      >
                        <PlanBadgeIcon plan={card.plan} />
                        <span className="truncate">{PLAN_BADGE_LABELS[card.plan]}</span>
                      </span>
                    </div>
                    <p title={card.name} className="text-xs font-medium leading-tight truncate text-gray-700">
                      {card.name}
                    </p>
                  </div>
                </button>
                <div className="absolute bottom-2 right-2 z-10">
                  <button
                    type="button"
                    aria-label={`${card.name}のアビリティ・入手報酬の詳細`}
                    aria-expanded={details?.card.id === card.id}
                    aria-controls={details?.card.id === card.id ? 'support-ability-details' : undefined}
                    onClick={(event) => {
                      const anchor = event.currentTarget
                      setDetails((current) => (current?.card.id === card.id ? null : { card, anchor }))
                    }}
                    className="min-h-7 rounded border border-gray-300 bg-gray-100 px-2 text-[11px] font-semibold text-gray-600 hover:bg-gray-200"
                  >
                    詳細
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {details && filtered.some((card) => card.id === details.card.id) && details.anchor.isConnected && (
        <DeckAbilityPopover
          id="support-ability-details"
          card={{ card: details.card, level: details.card.maxLevel, isRental: false }}
          anchor={details.anchor}
          onClose={() => setDetails(null)}
        />
      )}
    </div>
  )
}

function getSupportCardImageUrl(card: SupportCard): string | undefined {
  return resolveLocalAssetUrl(card.imageUrl) ?? LOCAL_SUPPORT_IMAGE_URLS[card.id]
}

function PlanBadgeIcon({ plan }: { plan: SupportCard['plan'] }) {
  const iconUrl = PLAN_ICON_URLS[plan]

  if (iconUrl) {
    return <img src={iconUrl} alt="" className="h-3 w-3 object-contain" loading="lazy" aria-hidden="true" />
  }

  if (plan === 'sense') {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
        <path d="M6 1.2 7.2 4l2.8.2-2.1 1.8.7 2.8L6 7.2 3.4 8.8l.7-2.8L2 4.2 4.8 4 6 1.2Z" />
      </svg>
    )
  }

  if (plan === 'logic') {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
        <path d="M6 1.5 10.5 6 6 10.5 1.5 6 6 1.5Z" />
      </svg>
    )
  }

  if (plan === 'anomaly') {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
        <path d="M6 1.5 10.5 9.8h-9L6 1.5Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
      <circle cx="6" cy="6" r="4" />
    </svg>
  )
}
