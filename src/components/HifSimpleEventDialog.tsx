import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { DeckCard } from '@/types/card'
import type { HifSimpleEventSettings, HifSupportEventSelection } from '@/types/hif-schedule'
import type { ProduceSkillCardState } from '@/types/calculator'
import type { IdolPlan } from '@/types/produce'
import { getSelectedSupportEventStatGain } from '@/lib/support-event-stat-gain'
import {
  getSupportAfterEventOptions,
  SUPPORT_AFTER_EVENT_LABELS,
  type SupportAfterEventKind,
} from '@/lib/support-event-selection'
import { resolveLocalAssetUrl } from '@/lib/local-asset-urls'
import { cn, formatSkillValue } from '@/lib/utils'
import {
  createChangedSkillCard,
  inferRewardSkillCard,
  resolveSupportAfterEventTarget,
} from '@/lib/calculator/hif-simulation-state'
import { HifSupportEventCardEditor } from './HifSupportEventCardEditor'
import { useHifPopoverDismiss, useHifPopoverPosition } from './useHifPopover'

function cardsBeforeAfterEvent(
  initial: readonly ProduceSkillCardState[],
  deck: readonly DeckCard[],
  value: HifSimpleEventSettings,
  count: number,
  plan: IdolPlan,
  upgraded: boolean,
): ProduceSkillCardState[] {
  const cards = initial.map((card) => ({ ...card, effectTags: [...card.effectTags] }))
  value.frontSlots.forEach((slot) => {
    const dc = deck[slot]
    const reward = dc?.level >= 10 ? dc.card.supportEventRewards?.[0] : undefined
    if (reward?.kind === 'skill_card')
      cards.push(
        inferRewardSkillCard(
          reward,
          `support:${slot}:initial`,
          value.frontSkillCards?.[slot],
          plan,
          dc.card.id,
          upgraded,
        ),
      )
  })
  value.afterSelections.slice(0, count).forEach((selection) => {
    const dc = deck[selection.slot]
    const option = dc
      ? getSupportAfterEventOptions(dc).find((item) => item.eventIndex === selection.eventIndex)
      : undefined
    if (!option || dc.level < option.requiredLevel || option.kind === 'parameter') return
    const target = resolveSupportAfterEventTarget(
      cards,
      option.kind,
      selection.targetCardId,
      option.event.effect,
    )
    if (!target) return
    if (option.kind === 'upgrade') target.upgraded = true
    else {
      const index = cards.indexOf(target)
      if (option.kind === 'delete') cards.splice(index, 1)
      else if (selection.resultCard)
        cards[index] = createChangedSkillCard(
          target,
          `changed:initial:${selection.slot}:${selection.eventIndex}`,
          selection.resultCard,
          plan,
        )
    }
  })
  return cards
}

export function HifSimpleEventDialog({
  anchorElement,
  deck,
  value,
  initialOwnedSkillCards,
  plan,
  supportEventSkillCardsUpgraded,
  onChange,
  onClose,
}: {
  anchorElement: HTMLElement
  deck: DeckCard[]
  value: HifSimpleEventSettings
  initialOwnedSkillCards: readonly ProduceSkillCardState[]
  plan: IdolPlan
  supportEventSkillCardsUpgraded: boolean
  onChange: (value: HifSimpleEventSettings) => void
  onClose: () => void
}) {
  const bubble = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<{
    selection: HifSupportEventSelection
    kind: Exclude<SupportAfterEventKind, 'parameter'>
    effectText: string
    index: number
  } | null>(null)
  const position = useHifPopoverPosition(anchorElement, panel, {
    preferredWidth: 720,
    fallbackHeight: 520,
    mode: 'floating',
  })
  useHifPopoverDismiss(bubble, onClose, '[data-hif-simple-event-trigger]')
  const toggleFront = (slot: number) => {
    const selected = value.frontSlots.includes(slot)
    const frontSkillCards = { ...value.frontSkillCards }
    if (selected) delete frontSkillCards[slot]
    onChange({
      ...value,
      frontSlots: selected ? value.frontSlots.filter((item) => item !== slot) : [...value.frontSlots, slot],
      ...(Object.keys(frontSkillCards).length ? { frontSkillCards } : { frontSkillCards: undefined }),
    })
  }
  const toggleAfter = (slot: number, eventIndex: number, kind: SupportAfterEventKind) => {
    const selected = value.afterSelections.some(
      (item) => item.slot === slot && item.eventIndex === eventIndex,
    )
    if (selected)
      onChange({
        ...value,
        afterSelections: value.afterSelections.filter(
          (item) => item.slot !== slot || item.eventIndex !== eventIndex,
        ),
      })
    else if (kind === 'parameter')
      onChange({ ...value, afterSelections: [...value.afterSelections, { slot, eventIndex }] })
    else {
      const effectText =
        getSupportAfterEventOptions(deck[slot]).find((option) => option.eventIndex === eventIndex)?.event
          .effect ?? ''
      setEditor({ selection: { slot, eventIndex }, kind, effectText, index: value.afterSelections.length })
    }
  }
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={bubble}
      role="dialog"
      aria-modal="false"
      aria-labelledby="hif-simple-event-title"
      data-scroll-lock-overlay
      style={
        position
          ? { left: position.left, top: position.top, width: position.width }
          : { left: 12, top: 12, width: 'calc(100vw - 24px)', visibility: 'hidden' }
      }
      className="fixed z-50"
    >
      {position?.showArrow && (
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
        className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5"
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2.5">
          <div>
            <h3 id="hif-simple-event-title" className="text-sm font-bold text-gray-800">
              イベント一括設定
            </h3>
            <p className="mt-0.5 text-[10px] text-gray-500">選択した結果を育成開始時から反映します</p>
          </div>
          <button
            type="button"
            aria-label="イベント一括設定を閉じる"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500"
          >
            ×
          </button>
        </div>
        <div className="p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-gray-500">
            <span>カードごとに前・後イベントをまとめて選択できます。</span>
            <span className="shrink-0 font-semibold text-blue-600">
              {value.frontSlots.length + value.afterSelections.length}件選択
            </span>
          </div>
          {deck.length ? (
            <div className="grid grid-cols-3 gap-2">
              {deck.map((dc, slot) => {
                const reward = dc.card.supportEventRewards?.[0]
                const options = getSupportAfterEventOptions(dc)
                return (
                  <EventCard key={`${dc.card.id}-${slot}`} card={dc}>
                    <div className="space-y-1">
                      {reward && (
                        <EventOption
                          kind="前"
                          selected={value.frontSlots.includes(slot)}
                          locked={dc.level < 10}
                          lockedText="Lv10で解放"
                          onToggle={() => toggleFront(slot)}
                        >
                          {reward.kind === 'p_item' ? 'Pアイテム' : 'スキルカード'}：{reward.name}
                        </EventOption>
                      )}
                      {options.map((option) => {
                        const selected = value.afterSelections.some(
                          (item) => item.slot === slot && item.eventIndex === option.eventIndex,
                        )
                        const locked = dc.level < option.requiredLevel
                        const gain =
                          option.kind === 'parameter'
                            ? getSelectedSupportEventStatGain(dc, option.eventIndex)
                            : null
                        const gainText = gain
                          ? [
                              ['Vo', gain.vo],
                              ['Da', gain.da],
                              ['Vi', gain.vi],
                            ]
                              .filter(([, amount]) => Number(amount) > 0)
                              .map(([label, amount]) => `${label}+${formatSkillValue(Number(amount))}`)
                              .join(' / ')
                          : ''
                        return (
                          <div key={option.eventIndex}>
                            <EventOption
                              kind="後"
                              selected={selected}
                              locked={locked}
                              lockedText={`Lv${option.requiredLevel}で解放`}
                              onToggle={() => toggleAfter(slot, option.eventIndex, option.kind)}
                            >
                              {SUPPORT_AFTER_EVENT_LABELS[option.kind]}
                              {gainText ? `：${gainText}` : ''}
                            </EventOption>
                            {selected && option.kind !== 'parameter' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const index = value.afterSelections.findIndex(
                                    (item) => item.slot === slot && item.eventIndex === option.eventIndex,
                                  )
                                  setEditor({
                                    selection: value.afterSelections[index],
                                    kind: option.kind as Exclude<SupportAfterEventKind, 'parameter'>,
                                    effectText: option.event.effect,
                                    index,
                                  })
                                }}
                                className="mt-0.5 rounded border border-blue-200 bg-blue-50 px-1 py-0.5 text-[8px] font-semibold text-blue-700"
                              >
                                {cardsBeforeAfterEvent(
                                  initialOwnedSkillCards,
                                  deck,
                                  value,
                                  value.afterSelections.findIndex(
                                    (item) => item.slot === slot && item.eventIndex === option.eventIndex,
                                  ),
                                  plan,
                                  supportEventSkillCardsUpgraded,
                                ).find(
                                  (card) =>
                                    card.id ===
                                    value.afterSelections.find(
                                      (item) => item.slot === slot && item.eventIndex === option.eventIndex,
                                    )?.targetCardId,
                                )?.name ?? '対象未指定'}{' '}
                                · 変更
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {!reward && !options.length && (
                        <p className="py-2 text-center text-[9px] text-gray-400">選択できるイベントなし</p>
                      )}
                    </div>
                  </EventCard>
                )
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
              サポートカードを編成するとイベントを選択できます。
            </p>
          )}
        </div>
      </div>
      {editor && (
        <HifSupportEventCardEditor
          key={`${editor.selection.slot}-${editor.selection.eventIndex}`}
          selection={editor.selection}
          kind={editor.kind}
          effectText={editor.effectText}
          cards={cardsBeforeAfterEvent(
            initialOwnedSkillCards,
            deck,
            value,
            editor.index,
            plan,
            supportEventSkillCardsUpgraded,
          )}
          plan={plan}
          onCancel={() => setEditor(null)}
          onConfirm={(selection) => {
            const afterSelections =
              editor.index < value.afterSelections.length
                ? value.afterSelections.map((item, index) => (index === editor.index ? selection : item))
                : [...value.afterSelections, selection]
            onChange({ ...value, afterSelections })
            setEditor(null)
          }}
        />
      )}
    </div>,
    document.body,
  )
}

function EventCard({ card, children }: { card: DeckCard; children: ReactNode }) {
  const artwork = resolveLocalAssetUrl(card.card.imageUrl)
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-gray-300 bg-white">
      <div className="relative h-16 overflow-hidden bg-gray-100">
        {artwork && (
          <img
            src={artwork}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
          />
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white/10" />
        <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-gray-800 shadow-sm backdrop-blur-[1px]">
          {card.card.name}
        </span>
      </div>
      <div className="border-t border-gray-200 bg-white p-1.5">{children}</div>
    </div>
  )
}

function EventOption({
  kind,
  selected,
  locked,
  lockedText,
  onToggle,
  children,
}: {
  kind: '前' | '後'
  selected: boolean
  locked: boolean
  lockedText: string
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <label
      className={cn(
        'flex min-w-0 gap-1 rounded-md border border-gray-200 bg-white p-1.5 text-[9px] leading-tight',
        locked ? 'text-gray-400 grayscale' : 'text-gray-700 hover:bg-gray-50',
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={locked}
        onChange={onToggle}
        className="mt-px h-3 w-3 shrink-0"
      />
      <span className="min-w-0">
        <span
          className={cn(
            'mr-1 inline rounded px-1 py-px text-[8px] font-bold',
            kind === '前' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700',
          )}
        >
          {kind}
        </span>
        {children}
        {locked && <span className="mt-0.5 block text-[8px]">{lockedText}</span>}
      </span>
    </label>
  )
}
