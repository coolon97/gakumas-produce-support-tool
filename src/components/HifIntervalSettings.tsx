import { useState } from 'react'
import type { IdolPlan } from '@/types/produce'
import type {
  HifIntervalSettings as IntervalSettings,
  HifIntervalSkillAction,
  HifIntervalSkillActionKind,
} from '@/types/hif-schedule'
import { getHifConsultationSkillKindLabel } from '@/lib/hif-consultation'
import { HifSkillCardSelectionFields } from './HifSkillCardSelectionFields'
import { HifOwnedSkillCardPicker } from './HifOwnedSkillCardPicker'
import type { ProduceSkillCardState } from '@/types/calculator'
import { createChangedSkillCard, createScheduledSkillCard } from '@/lib/calculator/hif-simulation-state'

const ACTION_LABELS: Record<HifIntervalSkillActionKind, string> = {
  gain: 'スキルカードを獲得',
  upgrade: 'スキルカードを強化',
  change: 'スキルカードをチェンジ',
}

const normalizeCount = (value: string) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

export function getIntervalCardsBeforeAction(
  initial: readonly ProduceSkillCardState[],
  actions: readonly HifIntervalSkillAction[],
  count: number,
  plan: IdolPlan,
  dayIndex: number,
): ProduceSkillCardState[] {
  const cards = initial.map((card) => ({ ...card, effectTags: [...card.effectTags] }))
  actions.slice(0, count).forEach((action, index) => {
    const selected = createScheduledSkillCard(action, plan, 'interval', dayIndex, index)
    if (action.kind === 'gain') cards.push(selected)
    else if (action.kind === 'upgrade') {
      const target = cards.find((card) => card.id === action.targetCardId && !card.upgraded)
      if (target) target.upgraded = true
    } else {
      const targetIndex = cards.findIndex((card) => card.id === action.targetCardId && card.source !== 'idol')
      if (targetIndex >= 0 && action.resultCard)
        cards[targetIndex] = createChangedSkillCard(
          cards[targetIndex],
          `interval-changed:${dayIndex}:${index}`,
          action.resultCard,
          plan,
        )
    }
  })
  return cards
}

export function HifIntervalSettings({
  value,
  plan,
  ownedSkillCards,
  dayIndex,
  onChange,
}: {
  value: IntervalSettings
  plan: IdolPlan
  ownedSkillCards: readonly ProduceSkillCardState[]
  dayIndex: number
  onChange: (value: IntervalSettings) => void
}) {
  const [editing, setEditing] = useState<{ index: number | null; action: HifIntervalSkillAction } | null>(
    null,
  )
  const openNew = (kind: HifIntervalSkillActionKind) =>
    setEditing({
      index: null,
      action: {
        kind,
        category: 'active',
        skillKind: 'other',
        preservation: false,
        energy: false,
        rarity: 'R',
        ...(kind === 'change'
          ? {
              resultCard: {
                category: 'active' as const,
                skillKind: 'other' as const,
                preservation: false,
                energy: false,
                rarity: 'R' as const,
              },
            }
          : {}),
      },
    })
  const save = () => {
    if (!editing) return
    if (editing.action.kind === 'change' || editing.action.kind === 'upgrade') {
      const available = getIntervalCardsBeforeAction(
        ownedSkillCards,
        value.skillActions,
        editing.index ?? value.skillActions.length,
        plan,
        dayIndex,
      ).filter((card) => editing.action.kind === 'change' || !card.upgraded)
      if (!available.some((card) => card.id === editing.action.targetCardId)) return
    }
    const skillActions =
      editing.index === null
        ? [...value.skillActions, editing.action]
        : value.skillActions.map((action, index) => (index === editing.index ? editing.action : action))
    onChange({ ...value, skillActions })
    setEditing(null)
  }
  const cardsAtEdit = editing
    ? getIntervalCardsBeforeAction(
        ownedSkillCards,
        value.skillActions,
        editing.index ?? value.skillActions.length,
        plan,
        dayIndex,
      ).filter((card) => editing.action.kind !== 'upgrade' || !card.upgraded)
    : []
  return (
    <section className="space-y-2">
      <p className="text-[10px] leading-relaxed text-gray-500">
        各操作は回数制限なく追加できます。Pドリンクは相談での交換には数えません。
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {(['gain', 'upgrade', 'change'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => openNew(kind)}
            className="rounded-lg border border-violet-200 bg-violet-50 px-1 py-1.5 text-[9px] font-semibold leading-tight text-violet-700 hover:border-violet-400"
          >
            {ACTION_LABELS[kind]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <label className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[10px] font-semibold text-gray-600">
          <span className="block">Pドリンク獲得</span>
          <span className="mt-1 flex items-center justify-end gap-1">
            <input
              aria-label="インターバルで獲得するPドリンク数"
              type="number"
              min={0}
              value={value.pDrinkCount}
              onChange={(event) => onChange({ ...value, pDrinkCount: normalizeCount(event.target.value) })}
              className="w-16 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-right text-xs"
            />
            本
          </span>
        </label>
        <label className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[10px] font-semibold text-gray-600">
          <span className="block">カスタマイズ</span>
          <span className="mt-1 flex items-center justify-end gap-1">
            <input
              aria-label="インターバルのスキルカードカスタマイズ回数"
              type="number"
              min={0}
              value={value.skillCardCustomCount}
              onChange={(event) =>
                onChange({ ...value, skillCardCustomCount: normalizeCount(event.target.value) })
              }
              className="w-16 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-right text-xs"
            />
            回
          </span>
        </label>
      </div>
      <div className="min-h-10 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-1.5">
        <p className="mb-1 text-[9px] font-semibold text-gray-500">アクション</p>
        {value.skillActions.length ? (
          <div className="space-y-1">
            {value.skillActions.map((action, index) => (
              <div key={index} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      index,
                      action: {
                        ...action,
                        ...(action.kind === 'change'
                          ? {
                              resultCard: action.resultCard ?? {
                                category: 'active',
                                skillKind: 'other',
                                preservation: false,
                                energy: false,
                                rarity: 'R',
                              },
                            }
                          : {}),
                      },
                    })
                  }
                  className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-[10px] text-gray-700 hover:border-violet-300"
                >
                  <span className="font-semibold">{ACTION_LABELS[action.kind]}</span>
                  <span className="ml-1 text-gray-500">
                    {action.kind === 'upgrade'
                      ? (getIntervalCardsBeforeAction(
                          ownedSkillCards,
                          value.skillActions,
                          index,
                          plan,
                          dayIndex,
                        ).find((card) => card.id === action.targetCardId)?.name ??
                        '強化するカードを選択してください')
                      : action.kind === 'change'
                        ? `${getIntervalCardsBeforeAction(ownedSkillCards, value.skillActions, index, plan, dayIndex).find((card) => card.id === action.targetCardId)?.name ?? 'チェンジ元を選択してください'}${action.resultCard ? ` → ${action.resultCard.rarity} · ${action.resultCard.category === 'active' ? 'アクティブ' : 'メンタル'} · ${getHifConsultationSkillKindLabel(plan, action.resultCard.skillKind, action.resultCard.preservation, action.resultCard.energy)}` : ''}`
                        : `${action.category === 'active' ? 'アクティブ' : 'メンタル'} · ${getHifConsultationSkillKindLabel(plan, action.skillKind, action.preservation, action.energy)} · ${action.rarity}${action.upgraded ? ' · 強化済み' : ''}`}
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
      {editing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 p-4"
          data-hif-interval-editor
          data-scroll-lock-overlay
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="interval-card-action-title"
            className={`max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl ${editing.action.kind === 'gain' ? 'max-w-xs' : 'max-w-sm'}`}
          >
            <h4 id="interval-card-action-title" className="text-sm font-bold text-gray-800">
              {ACTION_LABELS[editing.action.kind]}
            </h4>
            {editing.action.kind === 'change' ? (
              <>
                <HifOwnedSkillCardPicker
                  cards={cardsAtEdit}
                  value={editing.action.targetCardId}
                  name={`interval-change-${dayIndex}-${editing.index ?? 'new'}`}
                  onChange={(targetCardId) =>
                    setEditing({ ...editing, action: { ...editing.action, targetCardId } })
                  }
                />
                <h5 className="mt-4 border-t border-gray-100 pt-3 text-xs font-bold text-gray-700">
                  チェンジ後のカード
                </h5>
                <HifSkillCardSelectionFields
                  value={
                    editing.action.resultCard ?? {
                      category: 'active',
                      skillKind: 'other',
                      preservation: false,
                      energy: false,
                      rarity: 'R',
                    }
                  }
                  plan={plan}
                  namePrefix={`interval-result-${dayIndex}-${editing.index ?? 'new'}`}
                  compact
                  onChange={(resultCard) =>
                    setEditing({ ...editing, action: { ...editing.action, resultCard } })
                  }
                />
              </>
            ) : editing.action.kind === 'upgrade' ? (
              <HifOwnedSkillCardPicker
                cards={cardsAtEdit}
                value={editing.action.targetCardId}
                name={`interval-upgrade-${dayIndex}-${editing.index ?? 'new'}`}
                label="強化する所持カードを1枚選択"
                onChange={(targetCardId) =>
                  setEditing({ ...editing, action: { ...editing.action, targetCardId } })
                }
              />
            ) : (
              <HifSkillCardSelectionFields
                value={editing.action}
                plan={plan}
                namePrefix="interval"
                showUpgraded
                onChange={(selection) =>
                  setEditing({ ...editing, action: { ...editing.action, ...selection } })
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
                onClick={save}
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
