import { useEffect, useState } from 'react'
import {
  cn,
  CARD_TYPE_SHORT_LABELS,
  CARD_TYPE_SOFT_COLORS,
  RARITY_COLORS,
  RARITY_PANEL_COLORS,
} from '@/lib/utils'
import { IDOLS } from '@/data/idols'
import { StatusSettingsPanel } from '@/components/StatusSettings'
import { DeckAbilityPopover } from '@/components/DeckAbilityPopover'
import { resolveLocalAssetUrl } from '@/lib/local-asset-urls'
import { useDeckBuilderStore } from '@/store/selectors'
import { getNextDeckCardLevel } from '@/store/produce-config'
import breakIcon from '@assets/game/Break.webp'
import limitedIcon from '@assets/game/limited.webp'

const DECK_CARD_BORDER = {
  vocal: 'border-pink-400',
  dance: 'border-blue-400',
  visual: 'border-amber-500',
  assist: 'border-emerald-500',
} as const

function getBreakCountFromLevel(level: number, maxLevel: number): number {
  const minimumLevel = Math.max(maxLevel - 20, 1)
  const normalizedLevel = Math.max(minimumLevel, Math.min(maxLevel, level))
  return Math.max(0, Math.min(4, 4 - Math.round((maxLevel - normalizedLevel) / 5)))
}

function getSupportCardImageUrl(imageUrl?: string): string | undefined {
  return resolveLocalAssetUrl(imageUrl)
}

export function DeckBuilder() {
  const {
    deck,
    removeFromDeck,
    setCardLevel,
    clearDeck,
    clearCalculationResult,
    runCalculation,
    produceConfig,
    openCardSelect,
  } = useDeckBuilderStore()
  const [deckOpen, setDeckOpen] = useState(true)
  const [details, setDetails] = useState<{ cardId: string; anchor: HTMLButtonElement } | null>(null)
  const detailCard = details ? deck.find((entry) => entry.card.id === details.cardId) : undefined

  const selectedIdol = IDOLS.find((i) => i.id === produceConfig.idolId) || IDOLS[0]
  const selectedVersion =
    selectedIdol?.versions.find((v) => v.id === produceConfig.idolVersionId) || selectedIdol?.versions[0]
  const currentPlan = selectedVersion?.plan || 'sense'

  const hasMismatch = deck.some(
    (dc) => dc.card.plan && dc.card.plan !== 'free' && dc.card.plan !== currentPlan,
  )

  // デッキ内容 (カード追加/削除/レベル変更) があるたびに自動計算
  useEffect(() => {
    if (hasMismatch) {
      clearCalculationResult()
      return
    }

    runCalculation()
  }, [deck, hasMismatch, produceConfig, clearCalculationResult, runCalculation])

  const slots = Array.from({ length: 6 }, (_, i) => deck[i] ?? null)

  return (
    <div className="flex flex-col gap-4">
      <details
        data-tutorial="deck-accordion"
        className="group rounded-xl border border-gray-200 bg-gray-50"
        open={deckOpen}
        onToggle={(event) => setDeckOpen(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-gray-700">
          <span className="flex items-center gap-2">
            サポートカード編成
            {deck.length < 6 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                未設定
              </span>
            )}
          </span>
          <span
            aria-hidden="true"
            className="text-xs text-gray-400 transition-transform group-open:rotate-180"
          >
            ▼
          </span>
        </summary>
        <div className="space-y-3 border-t border-gray-200 p-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setDetails(null)
                clearDeck()
              }}
              className="text-xs text-gray-400 transition-colors hover:text-red-500"
            >
              クリア
            </button>
          </div>
          <div data-tutorial="deck" className="grid grid-cols-3 gap-2">
            {slots.map((dc, i) => {
              return (
                <div
                  key={i}
                  data-tutorial-deck-slot={i}
                  data-tutorial-deck-filled={dc ? 'true' : 'false'}
                  onClick={() => {
                    if (!dc) {
                      openCardSelect(i, [currentPlan, 'free'])
                    }
                  }}
                  className={cn(
                    'relative rounded-xl border-2 overflow-hidden',
                    dc
                      ? cn('bg-white', DECK_CARD_BORDER[dc.card.type])
                      : 'border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors',
                  )}
                >
                  {dc ? (
                    <>
                      <button
                        onClick={() => {
                          setDetails(null)
                          removeFromDeck(i)
                        }}
                        aria-label={`${dc.card.name}を編成から外す`}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 text-gray-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-xs transition-colors z-10"
                        title="外す"
                      >
                        ×
                      </button>

                      <button
                        type="button"
                        aria-label={`${dc.card.name}を入れ替え`}
                        onClick={() => {
                          setDetails(null)
                          openCardSelect(i, [currentPlan, 'free'])
                        }}
                        className="relative block w-full cursor-pointer group/replace"
                      >
                        {getSupportCardImageUrl(dc.card.imageUrl) ? (
                          <img
                            src={getSupportCardImageUrl(dc.card.imageUrl)}
                            alt={dc.card.name}
                            className="w-full aspect-[8/3] object-cover object-top"
                          />
                        ) : (
                          <div className="w-full aspect-[8/3] bg-gray-100" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover/replace:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="text-white text-xs font-bold opacity-0 group-hover/replace:opacity-100 transition-opacity">
                            入れ替え
                          </span>
                        </div>
                      </button>

                      <div className={cn('px-2 py-1.5', RARITY_PANEL_COLORS[dc.card.rarity])}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-xs leading-none',
                              RARITY_COLORS[dc.card.rarity],
                            )}
                          >
                            {dc.card.rarity}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-md leading-none font-bold',
                              CARD_TYPE_SOFT_COLORS[dc.card.type],
                            )}
                          >
                            {CARD_TYPE_SHORT_LABELS[dc.card.type]}
                          </span>
                        </div>
                        <p
                          title={dc.card.name}
                          className="text-xs font-medium leading-tight line-clamp-1 mb-1 text-gray-700"
                        >
                          {dc.card.name}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <button
                            type="button"
                            disabled={dc.card.availableLevels?.length === 1}
                            aria-label={`${dc.card.name} 凸状況${getBreakCountFromLevel(dc.level, dc.card.maxLevel)}、レベル切替（現在Lv${dc.level}）`}
                            onClick={() => {
                              setCardLevel(
                                i,
                                getNextDeckCardLevel(dc.level, dc.card.maxLevel, dc.card.availableLevels),
                              )
                            }}
                            className="flex min-h-6 items-center gap-0.5"
                            title={
                              dc.card.availableLevels
                                ? `確認済みレベル：${dc.card.availableLevels.join(' / ')}。クリックで切り替え`
                                : 'クリックで上限解放数を切り替え'
                            }
                          >
                            {Array.from({ length: 4 }, (_, iconIndex) => {
                              const breakCount = getBreakCountFromLevel(dc.level, dc.card.maxLevel)
                              const iconSrc = iconIndex < breakCount ? breakIcon : limitedIcon
                              const iconAlt = iconIndex < breakCount ? 'Break' : 'limited'

                              return (
                                <img
                                  key={iconIndex}
                                  src={iconSrc}
                                  alt={iconAlt}
                                  className="h-4 w-4 object-contain"
                                  loading="lazy"
                                />
                              )
                            })}
                          </button>
                          <button
                            type="button"
                            aria-label={`${dc.card.name}のアビリティ詳細`}
                            aria-expanded={details?.cardId === dc.card.id}
                            aria-controls={
                              details?.cardId === dc.card.id ? 'deck-ability-details' : undefined
                            }
                            onClick={(event) => {
                              const anchor = event.currentTarget
                              setDetails((current) =>
                                current?.cardId === dc.card.id ? null : { cardId: dc.card.id, anchor },
                              )
                            }}
                            className="ml-auto min-h-6 rounded border border-gray-300 bg-gray-100 px-1.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-200"
                          >
                            詳細
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center gap-1">
                      <span className="text-lg text-gray-300">+</span>
                      <span className="text-xs text-gray-300">スロット {i + 1}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </details>
      {details && detailCard && details.anchor.isConnected && (
        <DeckAbilityPopover card={detailCard} anchor={details.anchor} onClose={() => setDetails(null)} />
      )}
      <StatusSettingsPanel />
      {hasMismatch && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium leading-relaxed">
          ⚠️ アイドルのプラン (
          {currentPlan === 'sense' ? 'センス' : currentPlan === 'logic' ? 'ロジック' : 'アノマリー'})
          と一致しないサポートカードが含まれています。サポートカードを見直してください。
        </div>
      )}
    </div>
  )
}
