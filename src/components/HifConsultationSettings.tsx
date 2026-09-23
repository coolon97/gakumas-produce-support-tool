import { useState } from 'react'
import type { IdolPlan } from '@/types/produce'
import type {
  HifConsultationSettings as ConsultationSettings,
  HifConsultationSkillAction,
  HifConsultationSkillActionKind,
} from '@/types/hif-schedule'
import { getHifConsultationSkillKindLabel } from '@/lib/hif-consultation'
import { getHifConsultationDrinkLimit, normalizeHifConsultationDrinkCount } from '@/lib/hif-schedule'
import { HifSkillCardSelectionFields } from './HifSkillCardSelectionFields'
import { HifOwnedSkillCardPicker } from './HifOwnedSkillCardPicker'
import { HifSkillCardDeletionDialog } from './HifSkillCardDeletionDialog'
import type { ProduceSkillCardState } from '@/types/calculator'
import { createScheduledSkillCard } from '@/lib/calculator/hif-simulation-state'

const ACTION_LABELS: Record<HifConsultationSkillActionKind, string> = {
  gain: 'スキルカードを獲得',
  upgrade: 'スキルカードを強化',
  delete: 'スキルカードを削除',
}
export function getConsultationCardsBeforeAction(
  initial: readonly ProduceSkillCardState[],
  actions: readonly HifConsultationSkillAction[],
  count: number,
  plan: IdolPlan,
  dayIndex: number,
): ProduceSkillCardState[] {
  const cards = initial.map((card) => ({ ...card, effectTags: [...card.effectTags] }))
  actions.slice(0, count).forEach((action, index) => {
    const selected = createScheduledSkillCard(action, plan, 'consultation', dayIndex, index)
    if (action.kind === 'gain') cards.push(selected)
    else if (action.kind === 'upgrade') {
      const target = cards.find((card) => card.id === action.targetCardId && !card.upgraded)
      if (target) target.upgraded = true
    } else {
      const targetIndex = cards.findIndex((card) => card.id === action.targetCardId && card.source !== 'idol')
      if (targetIndex >= 0) cards.splice(targetIndex, 1)
    }
  })
  return cards
}
export function HifConsultationSettings({
  value,
  plan,
  ownedSkillCards,
  dayIndex,
  resetAvailable,
  compact = false,
  onChange,
}: {
  value: ConsultationSettings
  plan: IdolPlan
  ownedSkillCards: readonly ProduceSkillCardState[]
  dayIndex: number
  resetAvailable: boolean
  compact?: boolean
  onChange: (value: ConsultationSettings) => void
}) {
  const [editing, setEditing] = useState<{ index: number | null; action: HifConsultationSkillAction } | null>(
    null,
  )
  const count = (kind: HifConsultationSkillActionKind) =>
    value.skillActions.filter((action) => action.kind === kind).length
  const limit = (kind: HifConsultationSkillActionKind) =>
    kind === 'gain' ? Infinity : value.resetUsed ? 2 : 1
  const drinkLimit = getHifConsultationDrinkLimit(value.resetUsed)
  const openNew = (kind: HifConsultationSkillActionKind) =>
    setEditing({
      index: null,
      action: {
        kind,
        category: 'active',
        skillKind: 'other',
        preservation: false,
        energy: false,
        rarity: 'R',
      },
    })
  const save = (action = editing?.action) => {
    if (!editing || !action) return
    if (action.kind !== 'gain') {
      const eligible = getConsultationCardsBeforeAction(
        ownedSkillCards,
        value.skillActions,
        editing.index ?? value.skillActions.length,
        plan,
        dayIndex,
      ).filter((card) => (action.kind === 'upgrade' ? !card.upgraded : card.source !== 'idol'))
      if (!eligible.some((card) => card.id === action.targetCardId)) return
    }
    const skillActions =
      editing.index === null
        ? [...value.skillActions, action]
        : value.skillActions.map((item, index) => (index === editing.index ? action : item))
    onChange({ ...value, skillActions })
    setEditing(null)
  }
  const cardsAtEdit = editing
    ? getConsultationCardsBeforeAction(
        ownedSkillCards,
        value.skillActions,
        editing.index ?? value.skillActions.length,
        plan,
        dayIndex,
      ).filter((card) =>
        editing.action.kind === 'upgrade'
          ? !card.upgraded
          : editing.action.kind === 'delete'
            ? card.source !== 'idol'
            : true,
      )
    : []
  return (
    <section className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="grid grid-cols-3 gap-1.5">
        {(['gain', 'upgrade', 'delete'] as const).map((kind) => {
          const disabled = count(kind) >= limit(kind)
          return (
            <button
              key={kind}
              type="button"
              disabled={disabled}
              onClick={() => openNew(kind)}
              className={
                compact
                  ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-[9px] font-semibold leading-tight text-emerald-700 disabled:cursor-default disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400'
                  : 'rounded-lg border border-emerald-200 bg-emerald-50 px-1.5 py-2 text-[10px] font-semibold leading-tight text-emerald-700 disabled:cursor-default disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400'
              }
            >
              {ACTION_LABELS[kind]}
              {kind !== 'gain' && (
                <span className="mt-1 block text-[9px] font-normal">
                  {count(kind)}/{limit(kind)}回
                </span>
              )}
            </button>
          )
        })}
      </div>
      <label
        className={
          compact
            ? 'flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[10px] font-semibold text-gray-600'
            : 'flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600'
        }
      >
        Pドリンク交換
        <span className="flex items-center gap-1">
          <input
            aria-label="相談で交換するPドリンク数"
            type="number"
            min={0}
            max={drinkLimit}
            value={value.pDrinkCount}
            onChange={(event) =>
              onChange({
                ...value,
                pDrinkCount: normalizeHifConsultationDrinkCount(event.target.value, value.resetUsed),
              })
            }
            className={
              compact
                ? 'w-12 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-right text-xs'
                : 'w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-right text-sm'
            }
          />
          <span className="whitespace-nowrap">/ {drinkLimit}本</span>
        </span>
      </label>
      <div
        className={
          compact
            ? 'min-h-10 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-1.5'
            : 'min-h-14 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-2'
        }
      >
        <p className="mb-1 text-[9px] font-semibold text-gray-500">アクション</p>
        {value.skillActions.length ? (
          <div className="space-y-1">
            {value.skillActions.map((action, index) => (
              <div key={index} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing({ index, action: { ...action } })}
                  className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-[10px] text-gray-700 hover:border-blue-300"
                >
                  <span className="font-semibold">{ACTION_LABELS[action.kind]}</span>
                  <span className="ml-1 text-gray-500">
                    {action.kind === 'gain'
                      ? `${action.category === 'active' ? 'アクティブ' : 'メンタル'} · ${getHifConsultationSkillKindLabel(plan, action.skillKind, action.preservation, action.energy)} · ${action.rarity}${action.upgraded ? ' · 強化済み' : ''}`
                      : (getConsultationCardsBeforeAction(
                          ownedSkillCards,
                          value.skillActions,
                          index,
                          plan,
                          dayIndex,
                        ).find((card) => card.id === action.targetCardId)?.name ??
                        '対象カードを選択してください')}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${ACTION_LABELS[action.kind]}の記録を削除`}
                  onClick={() =>
                    onChange({
                      ...value,
                      skillActions: value.skillActions.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                  className="h-6 w-6 shrink-0 rounded-full text-xs text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-2 text-center text-[10px] text-gray-400">まだアクションはありません</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] leading-relaxed text-gray-400">強化・削除を各+1回 / ドリンク上限8本</p>
        <button
          type="button"
          disabled={value.resetUsed || !resetAvailable}
          onClick={() => onChange({ ...value, resetUsed: true })}
          className="shrink-0 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-600 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
        >
          {value.resetUsed ? 'リフレッシュ済み' : resetAvailable ? 'リフレッシュ' : '使用済み'}
        </button>
      </div>
      {editing?.action.kind === 'delete' && (
        <HifSkillCardDeletionDialog
          cards={cardsAtEdit}
          selectedIds={editing.action.targetCardId ? [editing.action.targetCardId] : []}
          requiredCount={1}
          context="consultation"
          onCancel={() => setEditing(null)}
          onConfirm={(ids) => save({ ...editing.action, targetCardId: ids[0] })}
        />
      )}
      {editing && editing.action.kind !== 'delete' && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 p-4"
          data-hif-consultation-editor
          data-scroll-lock-overlay
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consultation-card-action-title"
            className={`max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl ${editing.action.kind === 'gain' ? 'max-w-xs' : 'max-w-sm'}`}
          >
            <h4 id="consultation-card-action-title" className="text-sm font-bold text-gray-800">
              {ACTION_LABELS[editing.action.kind]}
            </h4>
            {editing.action.kind === 'gain' ? (
              <HifSkillCardSelectionFields
                value={editing.action}
                plan={plan}
                namePrefix="consultation"
                showUpgraded
                onChange={(selection) =>
                  setEditing({ ...editing, action: { ...editing.action, ...selection } })
                }
              />
            ) : (
              <HifOwnedSkillCardPicker
                cards={cardsAtEdit}
                value={editing.action.targetCardId}
                name={`consultation-${editing.action.kind}-${dayIndex}-${editing.index ?? 'new'}`}
                label={
                  editing.action.kind === 'upgrade'
                    ? '強化する所持カードを1枚選択'
                    : '削除する所持カードを1枚選択'
                }
                onChange={(targetCardId) =>
                  setEditing({ ...editing, action: { ...editing.action, targetCardId } })
                }
              />
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={
                  editing.action.kind !== 'gain' &&
                  !cardsAtEdit.some((card) => card.id === editing.action.targetCardId)
                }
                onClick={() => save()}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
