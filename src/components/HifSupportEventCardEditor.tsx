import { useState } from 'react'
import type { ProduceSkillCardState } from '@/types/calculator'
import type { HifSkillCardSelection, HifSupportEventSelection } from '@/types/hif-schedule'
import type { IdolPlan } from '@/types/produce'
import type { SupportAfterEventKind } from '@/lib/support-event-selection'
import { HifOwnedSkillCardPicker } from './HifOwnedSkillCardPicker'
import { HifSkillCardDeletionDialog } from './HifSkillCardDeletionDialog'
import { HifSkillCardSelectionFields } from './HifSkillCardSelectionFields'

const DEFAULT_RESULT_CARD: HifSkillCardSelection = {
  category: 'active',
  rarity: 'R',
  skillKind: 'other',
  preservation: false,
  energy: false,
}
const KIND_LABELS = { upgrade: '強化', delete: '削除', change: 'チェンジ' } as const

export function HifSupportEventCardEditor({
  selection,
  kind,
  effectText,
  cards,
  plan,
  onCancel,
  onConfirm,
}: {
  selection: HifSupportEventSelection
  kind: Exclude<SupportAfterEventKind, 'parameter'>
  effectText: string
  cards: readonly ProduceSkillCardState[]
  plan: IdolPlan
  onCancel: () => void
  onConfirm: (selection: HifSupportEventSelection) => void
}) {
  const [targetCardId, setTargetCardId] = useState(selection.targetCardId ?? null)
  const [resultCard, setResultCard] = useState<HifSkillCardSelection>(
    selection.resultCard ?? DEFAULT_RESULT_CARD,
  )
  const eligible = cards.filter((card) =>
    kind === 'upgrade'
      ? !card.upgraded
      : card.source !== 'idol' &&
        (kind !== 'change' || !effectText.includes('名前に「基本」を含む') || card.name.includes('基本')),
  )
  const selected = eligible.some((card) => card.id === targetCardId)
  if (kind === 'delete')
    return (
      <HifSkillCardDeletionDialog
        cards={eligible}
        selectedIds={targetCardId ? [targetCardId] : []}
        requiredCount={1}
        context="support-event"
        onCancel={onCancel}
        onConfirm={(ids) => onConfirm({ ...selection, targetCardId: ids[0] })}
      />
    )
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4"
      data-hif-after-event-editor
      data-scroll-lock-overlay
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="after-event-card-editor-title"
        data-hif-dialog-scroll
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
      >
        <h4 id="after-event-card-editor-title" className="text-sm font-bold text-gray-800">
          後イベント：スキルカード{KIND_LABELS[kind]}
        </h4>
        <HifOwnedSkillCardPicker
          cards={eligible}
          value={targetCardId}
          name={`after-event-${selection.slot}-${selection.eventIndex}`}
          label={`${KIND_LABELS[kind]}する所持カードを1枚選択`}
          onChange={setTargetCardId}
        />
        {kind === 'change' && (
          <>
            <h5 className="mt-4 border-t border-gray-100 pt-3 text-xs font-bold text-gray-700">
              チェンジ後のカード
            </h5>
            <HifSkillCardSelectionFields
              value={resultCard}
              plan={plan}
              namePrefix={`after-event-result-${selection.slot}-${selection.eventIndex}`}
              compact
              onChange={setResultCard}
            />
          </>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() =>
              onConfirm({ ...selection, targetCardId, ...(kind === 'change' ? { resultCard } : {}) })
            }
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
