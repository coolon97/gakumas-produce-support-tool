import type { ProduceSkillCardState } from '@/types/calculator'
import { HifSkillCardDeletionDialog } from './HifSkillCardDeletionDialog'

export function HifBasicCardDeletionDialog({
  cards,
  selectedIds,
  onCancel,
  onConfirm,
}: {
  cards: ProduceSkillCardState[]
  selectedIds: string[]
  onCancel: () => void
  onConfirm: (ids: string[]) => void
}) {
  return (
    <HifSkillCardDeletionDialog
      cards={cards}
      selectedIds={selectedIds}
      requiredCount={2}
      basic
      context="exam"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
