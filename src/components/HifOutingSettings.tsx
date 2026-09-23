import { useState } from 'react'
import type { IdolPlan } from '@/types/produce'
import type {
  HifOutingReward,
  HifOutingSettings as OutingSettings,
  HifSkillCardSelection,
} from '@/types/hif-schedule'
import { getHifConsultationSkillKindLabel } from '@/lib/hif-consultation'
import { cn } from '@/lib/utils'
import { HifSkillCardSelectionFields } from './HifSkillCardSelectionFields'

const REWARD_OPTIONS: Array<{ value: HifOutingReward; label: string }> = [
  { value: 'two_cards', label: 'Pドリンク1本、スキルカード2枚獲得' },
  { value: 'two_cards_sleepy', label: 'Pドリンク1本、スキルカード2枚獲得、眠気1枚獲得' },
  { value: 'one_card', label: 'Pドリンク1本、スキルカード1枚獲得' },
]
const DEFAULT_CARD: HifSkillCardSelection = {
  category: 'active',
  skillKind: 'other',
  preservation: false,
  energy: false,
  rarity: 'R',
}

export function HifOutingSettings({
  value,
  plan,
  onChange,
}: {
  value: OutingSettings
  plan: IdolPlan
  onChange: (value: OutingSettings) => void
}) {
  const [editing, setEditing] = useState<{ index: 0 | 1; selection: HifSkillCardSelection } | null>(null)
  const cardCount = value.reward === 'one_card' ? 1 : 2
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-semibold text-gray-500">報酬を選択してください</p>
      <div className="space-y-1.5" role="group" aria-label="おでかけの報酬">
        {REWARD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value.reward === option.value}
            onClick={() => onChange({ ...value, reward: option.value })}
            className={cn(
              'w-full rounded-lg border px-2 py-2 text-left text-[10px] font-semibold leading-tight',
              value.reward === option.value
                ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-cyan-300',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-500">獲得カード</p>
        {value.skillCards.slice(0, cardCount).map((selection, index) => (
          <button
            key={index}
            type="button"
            onClick={() =>
              setEditing({ index: index as 0 | 1, selection: { ...(selection ?? DEFAULT_CARD) } })
            }
            className={cn(
              'w-full rounded-lg border px-2 py-2 text-left text-[10px] hover:border-cyan-300',
              selection
                ? 'border-gray-200 bg-gray-50 text-gray-700'
                : 'border-dashed border-gray-300 bg-white text-gray-500',
            )}
          >
            <span className="font-semibold">カード{index + 1}</span>
            <span className="ml-1 text-gray-500">
              {selection
                ? `${selection.category === 'active' ? 'アクティブ' : 'メンタル'} · ${getHifConsultationSkillKindLabel(plan, selection.skillKind, selection.preservation, selection.energy)} · ${selection.rarity}${selection.upgraded ? ' · 強化済み' : ''}`
                : '未設定 · タップして指定'}
            </span>
          </button>
        ))}
      </div>
      {editing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 p-4"
          data-hif-outing-card-editor
          data-scroll-lock-overlay
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="outing-card-title"
            className="w-full max-w-xs rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
          >
            <h4 id="outing-card-title" className="text-sm font-bold text-gray-800">
              獲得するスキルカード {editing.index + 1}
            </h4>
            <HifSkillCardSelectionFields
              value={editing.selection}
              plan={plan}
              namePrefix={`outing-${editing.index}`}
              showUpgraded
              onChange={(selection) => setEditing({ ...editing, selection })}
            />
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
                onClick={() => {
                  const skillCards = [...value.skillCards] as OutingSettings['skillCards']
                  skillCards[editing.index] = editing.selection
                  onChange({ ...value, skillCards })
                  setEditing(null)
                }}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
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
