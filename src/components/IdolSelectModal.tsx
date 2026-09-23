import { usePersistentInput } from '@/lib/use-persistent-input'
import {
  IDOL_SORT_OPTIONS,
  compareIdolEntries,
  getIdolVersionRarity,
  normalizeIdolSortKey,
  type IdolRarity,
  type IdolSortKey,
} from '@/lib/idol-sort'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { IdolData, IdolVersion } from '@/types/idol'
import type { IdolPlan } from '@/types/produce'
import { IDOLS } from '@/data/idols'
import { getIdolImageUrl } from '@/lib/idol-images'
import { cn, RARITY_COLORS } from '@/lib/utils'
import idolChinaIcon from '@assets/game/idol-china.webp'
import idolHiroIcon from '@assets/game/idol-hiro.webp'
import idolKotoneIcon from '@assets/game/idol-kotone.webp'
import idolMaoIcon from '@assets/game/idol-mao.webp'
import idolMisuzuIcon from '@assets/game/idol-misuzu.webp'
import idolRiiriyaIcon from '@assets/game/idol-riiriya.webp'
import idolRinamiIcon from '@assets/game/idol-rinami.webp'
import idolSakiIcon from '@assets/game/idol-saki.webp'
import idolSenaIcon from '@assets/game/idol-sena.webp'
import idolSumikaIcon from '@assets/game/idol-sumika.webp'
import idolTemariIcon from '@assets/game/idol-temari.webp'
import idolTsubameIcon from '@assets/game/idol-tsubame.webp'
import idolUmeIcon from '@assets/game/idol-ume.webp'
import planAnomalyIcon from '@assets/game/plan-anomaly.webp'
import planLogicIcon from '@assets/game/plan-logic.webp'
import planSenseIcon from '@assets/game/plan-sense.webp'

const PLAN_LABELS: Record<IdolPlan, string> = {
  sense: 'センス',
  logic: 'ロジック',
  anomaly: 'アノマリー',
}

const PLAN_ICON_URLS: Record<IdolPlan, string> = {
  sense: planSenseIcon,
  logic: planLogicIcon,
  anomaly: planAnomalyIcon,
}

const IDOL_ICON_URLS: Record<string, string> = {
  saki: idolSakiIcon,
  temari: idolTemariIcon,
  kotone: idolKotoneIcon,
  mao: idolMaoIcon,
  riiriya: idolRiiriyaIcon,
  china: idolChinaIcon,
  sumika: idolSumikaIcon,
  hiro: idolHiroIcon,
  rinami: idolRinamiIcon,
  ume: idolUmeIcon,
  sena: idolSenaIcon,
  misuzu: idolMisuzuIcon,
  tsubame: idolTsubameIcon,
}

const DUMMY_IMAGE_STYLES = [
  'from-rose-300 via-orange-200 to-amber-100',
  'from-sky-300 via-cyan-200 to-blue-100',
  'from-emerald-300 via-lime-200 to-green-100',
  'from-yellow-300 via-amber-200 to-orange-100',
  'from-yellow-200 via-amber-100 to-sky-100',
  'from-amber-300 via-yellow-200 to-orange-100',
] as const

interface IdolSelectModalProps {
  isOpen: boolean
  selectedVersionId: string
  onClose: () => void
  onSelect: (selection: IdolVersionEntry) => void
}

interface IdolVersionEntry {
  idol: IdolData
  version: IdolVersion
}

export function IdolSelectModal({ isOpen, selectedVersionId, onClose, onSelect }: IdolSelectModalProps) {
  const [searchQuery, setSearchQuery] = usePersistentInput('idol.search', '')
  const [selectedIdolFilter, setSelectedIdolFilter] = usePersistentInput<string | null>(
    'idol.selected-filter',
    null,
  )
  const [filterPlans, setFilterPlans] = usePersistentInput<Set<IdolPlan>>('idol.plans', new Set())
  const [filterRarities, setFilterRarities] = usePersistentInput<Set<IdolRarity>>('idol.rarities', new Set())
  const [storedSort, setSort] = usePersistentInput<IdolSortKey>('idol.sort', 'release')
  const sort = normalizeIdolSortKey(storedSort)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !isFilterOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterPanelRef.current?.contains(event.target as Node)) setIsFilterOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [isOpen, isFilterOpen])

  const filteredIdols = useMemo(() => {
    const query = searchQuery.trim()

    return IDOLS.filter((idol) => {
      const fullName = `${idol.lastName}${idol.firstName}`
      return (
        !query || fullName.includes(query) || idol.firstName.includes(query) || idol.lastName.includes(query)
      )
    })
  }, [searchQuery])

  const filteredVersions = useMemo(() => {
    return filteredIdols
      .flatMap((idol) => {
        if (selectedIdolFilter && idol.id !== selectedIdolFilter) {
          return []
        }

        return idol.versions
          .filter((version) => {
            const rarity = getIdolVersionRarity(version)
            if (filterPlans.size > 0 && !filterPlans.has(version.plan)) {
              return false
            }
            if (filterRarities.size > 0 && !filterRarities.has(rarity)) {
              return false
            }
            return true
          })
          .map((version) => ({ idol, version }))
      })
      .sort((left, right) => compareIdolEntries(left, right, sort))
  }, [filteredIdols, selectedIdolFilter, filterPlans, filterRarities, sort])

  const activeFilterCount = (selectedIdolFilter ? 1 : 0) + filterPlans.size + filterRarities.size
  const activeFilterSummary = [
    selectedIdolFilter ? IDOLS.find((idol) => idol.id === selectedIdolFilter) : undefined,
    ...Array.from(filterPlans, (plan) => PLAN_LABELS[plan]),
    ...filterRarities,
  ]
    .flatMap((value) =>
      value == null ? [] : typeof value === 'string' ? [value] : [`${value.lastName} ${value.firstName}`],
    )
    .join('・')
  const clearFilters = () => {
    setSelectedIdolFilter(null)
    setFilterPlans(new Set())
    setFilterRarities(new Set())
  }

  if (!isOpen) return null

  return createPortal(
    <div
      data-scroll-lock-overlay
      className="fixed inset-0 z-[100] isolate flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative z-[101] bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700">アイドル選択</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <div data-tutorial="idol-list" className="flex flex-col gap-3 h-full min-h-0">
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
                  aria-label="アイドル名で検索"
                  placeholder="アイドル名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <button
                type="button"
                aria-label="絞り込み条件"
                aria-expanded={isFilterOpen}
                aria-controls="idol-filters"
                onClick={() => setIsFilterOpen((open) => !open)}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300',
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

            <div
              id="idol-filters"
              className={cn(
                'absolute right-0 top-12 z-30 max-h-[min(60vh,32rem)] w-[min(38rem,calc(100vw-3rem))] flex-col gap-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl',
                isFilterOpen ? 'flex' : 'hidden',
              )}
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <p className="text-sm font-bold text-gray-700">絞り込み条件</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">選択した条件でPアイドルを絞り込みます</p>
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

              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-gray-500">アイドル</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedIdolFilter(null)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs transition-colors',
                      selectedIdolFilter === null
                        ? 'border-gray-700 bg-gray-700 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    すべて
                  </button>
                  {filteredIdols.map((idol) => {
                    const active = selectedIdolFilter === idol.id
                    return (
                      <button
                        type="button"
                        key={idol.id}
                        onClick={() =>
                          setSelectedIdolFilter((current) => (current === idol.id ? null : idol.id))
                        }
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors border',
                          active
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                        )}
                      >
                        <IdolFilterIcon idol={idol} />
                        {idol.lastName} {idol.firstName}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-gray-500">プラン</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['sense', 'logic', 'anomaly'] as const).map((plan) => {
                      const active = filterPlans.has(plan)
                      return (
                        <button
                          type="button"
                          key={plan}
                          onClick={() =>
                            setFilterPlans((current) => {
                              const next = new Set(current)
                              next.has(plan) ? next.delete(plan) : next.add(plan)
                              return next
                            })
                          }
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors border',
                            active
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                          )}
                        >
                          <PlanFilterIcon plan={plan} />
                          {PLAN_LABELS[plan]}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-gray-500">レアリティ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['SSR', 'SR', 'R'] as const).map((rarity) => {
                      const active = filterRarities.has(rarity)
                      return (
                        <button
                          type="button"
                          key={rarity}
                          onClick={() =>
                            setFilterRarities((current) => {
                              const next = new Set(current)
                              next.has(rarity) ? next.delete(rarity) : next.add(rarity)
                              return next
                            })
                          }
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs transition-colors',
                            active
                              ? RARITY_COLORS[rarity]
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                          )}
                        >
                          {rarity}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-5 flex-wrap items-center gap-2 text-xs">
            <p className="shrink-0 font-medium text-gray-500">{filteredVersions.length} 件</p>
            {activeFilterSummary && (
              <p className="truncate text-[11px] text-gray-400" title={activeFilterSummary}>
                {activeFilterSummary}
              </p>
            )}
            <label className="ml-auto flex items-center gap-1.5 text-gray-500">
              <span>並び順</span>
              <select
                aria-label="アイドルの並び順"
                value={sort}
                onChange={(event) => setSort(normalizeIdolSortKey(event.target.value))}
                className="min-h-9 max-w-[13rem] rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {IDOL_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-[repeat(auto-fill,calc(27.5%_-_0.309375rem))] md:grid-cols-[repeat(auto-fill,calc(18.333333%_-_0.34375rem))] lg:grid-cols-[repeat(auto-fill,calc(13.75%_-_0.3609375rem))] gap-1.5">
              {filteredVersions.map((entry) => {
                const { idol, version } = entry
                const isSelected = version.id === selectedVersionId
                const rarity = getIdolVersionRarity(version)

                return (
                  <button
                    key={version.id}
                    data-tutorial-idol-choice
                    title={`${version.name} · ${rarity} · ${PLAN_LABELS[version.plan]}`}
                    aria-label={`${version.name} · ${rarity} · ${PLAN_LABELS[version.plan]}`}
                    onClick={() => {
                      onSelect(entry)
                      onClose()
                    }}
                    className={cn(
                      'min-w-0 text-left border overflow-hidden transition-colors bg-white',
                      'rounded-tr-xl',
                      isSelected
                        ? 'border-blue-400 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm',
                    )}
                  >
                    <IdolCardImage idol={idol} version={version} className="aspect-[3/4] rounded-tr-xl" />
                    <div className="px-1.5 py-1">
                      <div className="mb-1 flex h-4 items-center justify-between gap-1">
                        <span
                          className={cn(
                            'py-0.5 leading-none',
                            'rounded px-1 text-[9px]',
                            RARITY_COLORS[rarity],
                          )}
                        >
                          {rarity}
                        </span>
                        <span title={PLAN_LABELS[version.plan]} className="inline-flex shrink-0 items-center">
                          <PlanFilterIcon plan={version.plan} />
                        </span>
                      </div>
                      <p title={version.name} className="font-medium text-gray-800 text-[10px] leading-4">
                        <span className="block truncate">
                          {version.name.match(/^【[^】]*】/)?.[0] ?? version.name}
                        </span>
                        <span className="block truncate text-gray-500">
                          {idol.lastName} {idol.firstName}
                        </span>
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function IdolDummyImage({ idol, className }: { idol: IdolData; className?: string }) {
  const styleIndex =
    idol.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % DUMMY_IMAGE_STYLES.length
  const initials = idol.firstName.slice(0, 1) || idol.lastName.slice(0, 1)

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-gradient-to-br',
        DUMMY_IMAGE_STYLES[styleIndex],
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.75),transparent_45%)]" />
      <div className="absolute -right-4 -bottom-8 text-[96px] font-black text-white/50 leading-none">
        {initials}
      </div>
      <div className="absolute left-3 bottom-3 text-white drop-shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] opacity-80">Idol</p>
        <p className="text-lg font-black leading-none">{idol.firstName}</p>
      </div>
    </div>
  )
}

function IdolCardImage({
  idol,
  version,
  className,
}: {
  idol: IdolData
  version: IdolVersion
  className?: string
}) {
  const imageUrl = getIdolImageUrl(version.id)

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={version.name}
        className={cn('w-full object-cover object-top', className)}
        loading="lazy"
      />
    )
  }

  return <IdolDummyImage idol={idol} className={className} />
}

function PlanFilterIcon({ plan }: { plan: IdolPlan }) {
  return (
    <img
      src={PLAN_ICON_URLS[plan]}
      alt=""
      className="h-4 w-4 object-contain"
      loading="lazy"
      aria-hidden="true"
    />
  )
}

function IdolFilterIcon({ idol }: { idol: IdolData }) {
  return (
    <img
      src={IDOL_ICON_URLS[idol.id]}
      alt=""
      className="h-4 w-4 rounded-full object-cover"
      loading="lazy"
      aria-hidden="true"
    />
  )
}
