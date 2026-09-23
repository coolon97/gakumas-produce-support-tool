import { useState } from 'react'
import type { ProduceSkillCardState } from '@/types/calculator'
import { cn } from '@/lib/utils'
import { HifDraggableCardList } from './HifDraggableCardList'
import { HifOwnedSkillCardOption } from './HifOwnedSkillCardOption'

export function HifSkillCardDeletionDialog({
  cards,
  selectedIds,
  requiredCount,
  basic = false,
  context,
  onCancel,
  onConfirm,
}: {
  cards: readonly ProduceSkillCardState[]
  selectedIds: readonly string[]
  requiredCount: 1 | 2
  basic?: boolean
  context: 'exam' | 'consultation' | 'support-event'
  onCancel: () => void
  onConfirm: (ids: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>(() =>
    selectedIds.filter((id) => cards.some((card) => card.id === id)).slice(0, requiredCount),
  )
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : current.length < requiredCount
          ? [...current, id]
          : current,
    )

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center bg-black/30 p-4',
        context === 'exam' ? 'z-[80]' : context === 'support-event' ? 'z-[70]' : 'z-[60]',
      )}
      data-scroll-lock-overlay
      data-hif-consultation-editor={context === 'consultation' ? '' : undefined}
      data-hif-after-event-editor={context === 'support-event' ? '' : undefined}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-card-deletion-title"
        data-tutorial-basic-card-deletion={context === 'exam' ? '' : undefined}
        className="flex max-h-[min(560px,calc(100dvh-32px))] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="border-b border-gray-100 px-4 py-3">
          <h4 id="skill-card-deletion-title" className="text-sm font-bold text-gray-800">
            削除する{basic ? '基本カード' : 'スキルカード'}
          </h4>
          <p className="mt-1 text-[11px] text-gray-500">
            現在所持している{basic ? '基本カード' : 'スキルカード'}から{requiredCount}枚選択してください。
          </p>
        </div>
        <HifDraggableCardList className="m-3 min-h-0 space-y-2 overflow-y-auto p-2">
          {cards.map((card, index) => {
            const checked = selected.includes(card.id)
            const disabled = !checked && selected.length >= requiredCount
            return (
              <HifOwnedSkillCardOption
                key={card.id}
                card={card}
                index={index}
                selected={checked}
                disabled={disabled}
                inputType="checkbox"
                tone="red"
                hideRarity={basic}
                onChange={() => toggle(card.id)}
              />
            )
          })}
          {cards.length < requiredCount && (
            <p className="rounded-lg bg-amber-50 p-2 text-[10px] text-amber-700">
              選択できるカードが{requiredCount}枚未満のため、削除を確定できません。
            </p>
          )}
        </HifDraggableCardList>
        <div className="flex gap-2 border-t border-gray-100 p-3">
          <button
            type="button"
            data-tutorial-basic-card-deletion-cancel={context === 'exam' ? '' : undefined}
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500"
          >
            キャンセル
          </button>
          <button
            type="button"
            data-tutorial-basic-card-deletion-confirm={context === 'exam' ? '' : undefined}
            disabled={selected.length !== requiredCount}
            onClick={() => onConfirm(selected)}
            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            OK（{selected.length}/{requiredCount}）
          </button>
        </div>
      </div>
    </div>
  )
}
