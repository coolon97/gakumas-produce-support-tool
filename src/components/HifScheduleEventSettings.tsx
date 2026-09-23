import { useState } from 'react'
import type { DeckCard } from '@/types/card'
import type { HifScheduleStep, HifSupportEventSelection } from '@/types/hif-schedule'
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
import { HifSupportEventCardEditor } from './HifSupportEventCardEditor'

export function HifScheduleEventSettings({
  deck,
  step,
  ownedSkillCards,
  plan,
  wasFrontUsedBefore,
  wasAfterUsedBefore,
  onSelectFront,
  onSelectAfter,
}: {
  deck: DeckCard[]
  step: HifScheduleStep
  ownedSkillCards: readonly ProduceSkillCardState[]
  plan: IdolPlan
  wasFrontUsedBefore: (slot: number) => boolean
  wasAfterUsedBefore: (slot: number, eventIndex: number) => boolean
  onSelectFront: (slot: number) => void
  onSelectAfter: (selection: HifSupportEventSelection | null) => void
}) {
  const [editor, setEditor] = useState<{
    selection: HifSupportEventSelection
    kind: Exclude<SupportAfterEventKind, 'parameter'>
    effectText: string
  } | null>(null)
  return (
    <section className="space-y-2">
      <details className="group/front-event rounded-xl border border-gray-200 bg-gray-50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700">
          <span>サポートイベント・前</span>
          <span className="ml-auto text-[10px] font-medium text-blue-600">
            {step.pItemSlots.length ? '1件選択' : '未選択'}
          </span>
          <span
            aria-hidden="true"
            className="text-xs text-gray-400 transition-transform group-open/front-event:rotate-180"
          >
            ▼
          </span>
        </summary>
        <div className="border-t border-gray-200 p-3">
          <p className="text-[11px] leading-relaxed text-gray-500">
            Pアイテムまたはスキルカードの入手を1つ選択できます。入手したPアイテムは次の日程から有効です。
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {deck.flatMap((deckCard, slot) =>
              (deckCard.card.supportEventRewards ?? []).slice(0, 1).map((reward) => {
                const used = wasFrontUsedBefore(slot)
                const locked = deckCard.level < 10
                const selected = step.pItemSlots[0] === slot
                const artwork = resolveLocalAssetUrl(deckCard.card.imageUrl)
                return (
                  <div
                    key={`${deckCard.card.id}-front`}
                    className="min-w-0 overflow-hidden rounded-xl border border-gray-300 bg-white"
                  >
                    <EventCardHeader artwork={artwork} cardName={deckCard.card.name} />
                    <div className="border-t border-gray-200 bg-white p-2">
                      <label
                        className={cn(
                          'flex gap-2 rounded-lg border border-gray-200 bg-white p-2 text-xs',
                          used || locked ? 'text-gray-400 grayscale' : 'text-gray-700',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={used || locked}
                          onChange={() => onSelectFront(slot)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-[11px]">
                            {reward.kind === 'p_item' ? 'Pアイテム' : 'スキルカード'}：{reward.name}
                          </span>
                          {(locked || used) && (
                            <span className="block text-[10px]">
                              {locked ? 'Lv10で解放' : '以前の日程で設定済み'}
                            </span>
                          )}
                        </span>
                      </label>
                    </div>
                  </div>
                )
              }),
            )}
          </div>
          {!deck.some((deckCard) => deckCard.card.supportEventRewards?.length) && (
            <p className="text-xs text-gray-400">選択できる入手イベントがありません。</p>
          )}
        </div>
      </details>

      <details className="group/after-event rounded-xl border border-gray-200 bg-gray-50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700">
          <span>サポートイベント・後</span>
          <span className="ml-auto text-[10px] font-medium text-blue-600">
            {step.postEventSelection ? '1件選択' : '未選択'}
          </span>
          <span
            aria-hidden="true"
            className="text-xs text-gray-400 transition-transform group-open/after-event:rotate-180"
          >
            ▼
          </span>
        </summary>
        <div className="border-t border-gray-200 p-3">
          <p className="text-[11px] leading-relaxed text-gray-500">
            パラメータ上昇・強化・チェンジ・削除から1つ選択できます。
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {deck.map((deckCard, slot) => {
              const afterOptions = getSupportAfterEventOptions(deckCard)
              if (!afterOptions.length) return null
              const artwork = resolveLocalAssetUrl(deckCard.card.imageUrl)
              return (
                <div
                  key={`${deckCard.card.id}-after`}
                  className="min-w-0 overflow-hidden rounded-xl border border-gray-300 bg-white"
                >
                  <EventCardHeader artwork={artwork} cardName={deckCard.card.name} />
                  <div className="space-y-1.5 border-t border-gray-200 bg-white p-2">
                    {afterOptions.map((option) => {
                      const used = wasAfterUsedBefore(slot, option.eventIndex)
                      const locked = deckCard.level < option.requiredLevel
                      const selected =
                        step.postEventSelection?.slot === slot &&
                        step.postEventSelection.eventIndex === option.eventIndex
                      const gain =
                        option.kind === 'parameter'
                          ? getSelectedSupportEventStatGain(deckCard, option.eventIndex)
                          : null
                      const gainText = gain
                        ? [
                            ['Vo', gain.vo],
                            ['Da', gain.da],
                            ['Vi', gain.vi],
                          ]
                            .filter(([, value]) => Number(value) > 0)
                            .map(([label, value]) => `${label}+${formatSkillValue(Number(value))}`)
                            .join(' / ')
                        : ''
                      return (
                        <div key={`${deckCard.card.id}-after-${option.eventIndex}`}>
                          <label
                            className={cn(
                              'flex gap-2 rounded-lg border border-gray-200 bg-white p-2 text-xs',
                              used || locked ? 'text-gray-400 grayscale' : 'text-gray-700 hover:bg-gray-50',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={used || locked}
                              onChange={() => {
                                if (selected) onSelectAfter(null)
                                else if (option.kind === 'parameter')
                                  onSelectAfter({ slot, eventIndex: option.eventIndex })
                                else
                                  setEditor({
                                    selection: { slot, eventIndex: option.eventIndex },
                                    kind: option.kind,
                                    effectText: option.event.effect,
                                  })
                              }}
                              className="mt-0.5"
                            />
                            <span className="min-w-0">
                              <span className="block text-[11px] font-medium">
                                {SUPPORT_AFTER_EVENT_LABELS[option.kind]}
                                {gainText ? `：${gainText}` : ''}
                              </span>
                              {(locked || used) && (
                                <span className="block text-[10px]">
                                  {locked ? `Lv${option.requiredLevel}で解放` : '以前の日程で設定済み'}
                                </span>
                              )}
                            </span>
                          </label>
                          {selected && option.kind !== 'parameter' && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditor({
                                  selection: step.postEventSelection!,
                                  kind: option.kind as Exclude<SupportAfterEventKind, 'parameter'>,
                                  effectText: option.event.effect,
                                })
                              }
                              className="mt-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700"
                            >
                              {ownedSkillCards.find(
                                (card) => card.id === step.postEventSelection?.targetCardId,
                              )?.name ?? '対象未指定'}{' '}
                              · 変更
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          {!deck.some((deckCard) => getSupportAfterEventOptions(deckCard).length) && (
            <p className="text-xs text-gray-400">選択できる後イベントがありません。</p>
          )}
        </div>
      </details>
      {editor && (
        <HifSupportEventCardEditor
          key={`${editor.selection.slot}-${editor.selection.eventIndex}`}
          selection={editor.selection}
          kind={editor.kind}
          effectText={editor.effectText}
          cards={ownedSkillCards}
          plan={plan}
          onCancel={() => setEditor(null)}
          onConfirm={(selection) => {
            onSelectAfter(selection)
            setEditor(null)
          }}
        />
      )}
    </section>
  )
}

function EventCardHeader({ artwork, cardName }: { artwork?: string; cardName: string }) {
  return (
    <div className="relative h-20 overflow-hidden bg-gray-100">
      {artwork && (
        <img
          src={artwork}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
        />
      )}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white/10" />
      <span className="absolute left-2 top-2 rounded-md bg-white/80 px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur-[1px]">
        {cardName}
      </span>
    </div>
  )
}
