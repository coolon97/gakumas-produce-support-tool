import type { ProduceSkillCardState } from '@/types/calculator'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS = { active: 'アクティブ', mental: 'メンタル' } as const
const EFFECT_TAG_LABELS: Record<ProduceSkillCardState['effectTags'][number], string> = {
  energy: '元気',
  motivation: 'やる気',
  goodImpression: '好印象',
  goodCondition: '好調',
  preservation: '温存',
  concentration: '集中',
  fullPower: '全力',
  aggressive: '強気',
}

function CardDetails({
  card,
  index,
  count = 1,
  hideRarity = false,
  sourceLabel,
}: {
  card: ProduceSkillCardState
  index?: number
  count?: number
  hideRarity?: boolean
  sourceLabel?: string
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-gray-800">
          {card.name}
          {count > 1 ? ` ×${count}` : ''}
        </span>
        {index !== undefined && <span className="shrink-0 text-[9px] text-gray-400">{index + 1}</span>}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-gray-400">
        タイプ
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-semibold',
            card.category === 'active' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600',
          )}
        >
          {card.category ? CATEGORY_LABELS[card.category] : '未設定'}
        </span>
        {!hideRarity && card.rarity && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{card.rarity}</span>
        )}
        {card.upgraded && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">強化済み</span>
        )}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-gray-400">
        効果
        {(card.effectTags.length ? card.effectTags.map((tag) => EFFECT_TAG_LABELS[tag]) : ['その他']).map(
          (label) => (
            <span key={label} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
              {label}
            </span>
          ),
        )}
      </span>
      {sourceLabel && <span className="mt-1 block text-[9px] text-gray-400">入手元：{sourceLabel}</span>}
    </span>
  )
}

export function HifOwnedSkillCardDisplay({
  card,
  count,
  sourceLabel,
}: {
  card: ProduceSkillCardState
  count: number
  sourceLabel: string
}) {
  return (
    <li className="flex items-start rounded-xl border border-gray-200 bg-white p-3 text-left">
      <CardDetails card={card} count={count} sourceLabel={sourceLabel} />
    </li>
  )
}

export function HifOwnedSkillCardOption({
  card,
  index,
  selected,
  disabled = false,
  inputType,
  name,
  tone = 'blue',
  hideRarity = false,
  onChange,
}: {
  card: ProduceSkillCardState
  index: number
  selected: boolean
  disabled?: boolean
  inputType: 'checkbox' | 'radio'
  name?: string
  tone?: 'blue' | 'red'
  hideRarity?: boolean
  onChange: () => void
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors',
        selected
          ? tone === 'red'
            ? 'border-red-400 bg-red-50'
            : 'border-blue-400 bg-blue-50'
          : tone === 'red'
            ? 'border-gray-200 bg-white hover:border-red-200'
            : 'border-gray-200 bg-white hover:border-blue-200',
        disabled && 'cursor-default opacity-45',
      )}
    >
      <input
        type={inputType}
        name={name}
        value={card.id}
        checked={selected}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 shrink-0"
      />
      <CardDetails card={card} index={index} hideRarity={hideRarity} />
    </label>
  )
}
