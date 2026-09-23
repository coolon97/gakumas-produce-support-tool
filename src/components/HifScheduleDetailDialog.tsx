import { useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CalculatorResult, ProduceSkillCardState } from '@/types/calculator'
import { cn } from '@/lib/utils'
import { CardContributionDetails } from './CardContributionDetails'
import { HifOwnedSkillCardDisplay } from './HifOwnedSkillCardOption'
import { HIF_BADGE_TRIGGER_LIMIT } from '@/lib/calculator/hif-simulation-state'
import { useHifPopoverDismiss, useHifPopoverPosition } from './useHifPopover'

type SimulationStep = NonNullable<CalculatorResult['simulation']>['steps'][number]

const STAT_META = {
  vo: { label: 'Vo', className: 'bg-pink-50 text-pink-600' },
  da: { label: 'Da', className: 'bg-blue-50 text-blue-600' },
  vi: { label: 'Vi', className: 'bg-amber-50 text-amber-600' },
} as const

const SOURCE_LABELS: Record<ProduceSkillCardState['source'], string> = {
  idol: 'Pアイドル固有',
  basic: '基本',
  memory: '持ち込み',
  support: 'サポートイベント',
  consultation: '相談',
  supply: '差し入れ・活動支給',
  outing: 'おでかけ',
  interval: 'インターバル',
  class: '授業',
  changed: 'チェンジ後',
  custom_item: 'カスタムPアイテム',
}
function groupSkillCards(cards: ProduceSkillCardState[]) {
  const grouped = new Map<string, { card: ProduceSkillCardState; count: number }>()
  cards.forEach((card) => {
    const key = JSON.stringify([
      card.name,
      card.source,
      card.rarity,
      card.category,
      card.effectTags,
      card.upgraded,
    ])
    const current = grouped.get(key)
    if (current) current.count++
    else grouped.set(key, { card, count: 1 })
  })
  return [...grouped.values()]
}

export function HifScheduleDetailDialog({
  step,
  anchorElement,
  onClose,
}: {
  step: SimulationStep
  anchorElement: HTMLButtonElement
  onClose: () => void
}) {
  const bubble = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const position = useHifPopoverPosition(anchorElement, panel, {
    preferredWidth: 340,
    fallbackHeight: 520,
    mode: 'scrollable',
    fitThreshold: 340,
    minVisibleHeight: 200,
  })
  useHifPopoverDismiss(bubble, onClose, '[data-hif-detail-trigger]')

  if (typeof document === 'undefined') return null
  const skillCards = groupSkillCards(step.state.skillCards)

  return createPortal(
    <div
      ref={bubble}
      role="dialog"
      data-scroll-lock-overlay
      aria-modal="false"
      aria-labelledby="hif-detail-title"
      style={
        position
          ? { left: position.left, top: position.top, width: position.width }
          : { left: 12, top: 12, width: 'calc(100vw - 24px)', visibility: 'hidden' }
      }
      className="fixed z-50"
    >
      {position && (
        <span
          aria-hidden="true"
          style={{ left: position.arrowLeft - 7 }}
          className={cn(
            'absolute z-20 h-3.5 w-3.5 rotate-45 bg-white',
            position.placement === 'bottom'
              ? '-top-[7px] border-l border-t border-gray-200'
              : '-bottom-[7px] border-b border-r border-gray-200',
          )}
        />
      )}
      <div
        ref={panel}
        data-hif-dialog-scroll
        style={position ? { maxHeight: position.maxHeight } : undefined}
        className="overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <div>
            <h3 id="hif-detail-title" className="text-sm font-bold text-gray-800">
              {step.label} · 詳細
            </h3>
            <p className="mt-0.5 text-[10px] text-gray-400">
              {step.action}
              {step.lessonType ? `（${step.lessonType === 'sp' ? 'SP' : '通常'}）` : ''}終了時点
            </p>
          </div>
          <button
            type="button"
            aria-label="日程詳細を閉じる"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500"
          >
            ×
          </button>
        </header>
        <div className="space-y-4 p-4">
          <section>
            <h4 className="mb-2 text-xs font-semibold text-gray-600">パラメータ</h4>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(STAT_META) as Array<keyof typeof STAT_META>).map((stat) => (
                <div key={stat} className={cn('rounded-lg px-2 py-2 text-center', STAT_META[stat].className)}>
                  <p className="text-[10px] font-semibold">{STAT_META[stat].label}</p>
                  <p className="text-base font-bold">{step.stats[stat].toLocaleString()}</p>
                  <p className="text-[10px]">
                    {step.gain[stat] >= 0 ? '+' : ''}
                    {step.gain[stat].toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold text-gray-600">現在の所持状況</h4>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700">
                スター性 {step.state.starPower}
              </div>
              <div className="rounded-lg bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700">
                ワッペン {step.state.hifBadgeTriggerCount}/{HIF_BADGE_TRIGGER_LIMIT}回
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                Pドリンク {step.state.pDrinkCount}本
              </div>
              <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                チェンジ {step.state.skillCardChangeCount}回
              </div>
              <div className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                カスタム {step.state.skillCardCustomCount}回
              </div>
              {step.state.customPItemStaminaRecovery > 0 && (
                <div className="col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  カスタムPアイテムの体力回復 記載値累計 +{step.state.customPItemStaminaRecovery}
                  <span className="block text-[10px] font-normal">
                    消費・上限を反映した現在体力ではありません
                  </span>
                </div>
              )}
            </div>
            <details className="group/items rounded-xl border border-gray-200 bg-gray-50" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700">
                <span>Pアイテム · {step.state.pItems.length}個</span>
                <span
                  aria-hidden="true"
                  className="text-xs text-gray-400 transition-transform group-open/items:rotate-180"
                >
                  ▼
                </span>
              </summary>
              <ul className="space-y-1 border-t border-gray-200 px-3 py-2 text-[11px] text-gray-600">
                {step.state.pItems.map((item, index) => (
                  <li key={`${item}-${index}`}>・{item}</li>
                ))}
              </ul>
            </details>
            <details className="group/cards mt-2 rounded-xl border border-gray-200 bg-gray-50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700">
                <span>スキルカード · {step.state.skillCards.length}枚</span>
                <span
                  aria-hidden="true"
                  className="text-xs text-gray-400 transition-transform group-open/cards:rotate-180"
                >
                  ▼
                </span>
              </summary>
              <ul className="space-y-2 border-t border-gray-200 p-3">
                {skillCards.map(({ card, count }) => (
                  <HifOwnedSkillCardDisplay
                    key={card.id}
                    card={card}
                    count={count}
                    sourceLabel={SOURCE_LABELS[card.source]}
                  />
                ))}
              </ul>
            </details>
          </section>

          <section>
            <h4 className="mb-1 text-xs font-semibold text-gray-600">この日程のカード別寄与</h4>
            <p className="mb-2 text-[10px] text-gray-400">切り捨て・パラメータ上限適用前の理論寄与です。</p>
            <div className="space-y-2">
              {(['vo', 'da', 'vi'] as const).map((stat) => (
                <CardContributionDetails
                  key={stat}
                  contributions={step.contributions}
                  stat={stat}
                  label={`${STAT_META[stat].label} カード別寄与内訳`}
                  emptyMessage={`この日程では${STAT_META[stat].label}に寄与するカードはありません`}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
