import type { IdolPlan } from '@/types/produce'
import type {
  HifClassSkillCardSelection,
  HifConsultationSkillRarity,
  HifSkillCardSelection,
} from '@/types/hif-schedule'
import { HIF_CONSULTATION_PLAN_TYPES } from '@/lib/hif-consultation'
import { cn } from '@/lib/utils'

const RARITIES: HifConsultationSkillRarity[] = ['R', 'SR', 'SSR']

type SelectableSkillCard = HifSkillCardSelection | HifClassSkillCardSelection

export function HifSkillCardSelectionFields<T extends SelectableSkillCard>({
  value,
  plan,
  namePrefix,
  allowBasicName = false,
  compact = false,
  showEnergy = true,
  showUpgraded = false,
  onChange,
}: {
  value: T
  plan: IdolPlan
  namePrefix: string
  allowBasicName?: boolean
  compact?: boolean
  showEnergy?: boolean
  showUpgraded?: boolean
  onChange: (value: T) => void
}) {
  const rarities: Array<HifConsultationSkillRarity | 'basic_name'> = allowBasicName
    ? [...RARITIES, 'basic_name']
    : RARITIES
  const typeA = value.skillKind === 'type_a' || value.skillKind === 'type_a_b'
  const typeB = value.skillKind === 'type_b' || value.skillKind === 'type_a_b'
  const updateType = (target: 'type_a' | 'type_b', checked: boolean) => {
    const nextA = target === 'type_a' ? checked : typeA
    const nextB = target === 'type_b' ? checked : typeB
    const skillKind = nextA && nextB ? 'type_a_b' : nextA ? 'type_a' : nextB ? 'type_b' : 'other'
    onChange({ ...value, skillKind } as T)
  }
  const kindOptions = [
    {
      key: 'type_a' as const,
      label: HIF_CONSULTATION_PLAN_TYPES[plan].typeA.label,
      checked: typeA,
      onChange: (checked: boolean) => updateType('type_a', checked),
    },
    ...(plan === 'anomaly'
      ? [
          {
            key: 'preservation' as const,
            label: '温存',
            checked: value.preservation,
            onChange: (checked: boolean) => onChange({ ...value, preservation: checked } as T),
          },
        ]
      : []),
    {
      key: 'type_b' as const,
      label: HIF_CONSULTATION_PLAN_TYPES[plan].typeB.label,
      checked: typeB,
      onChange: (checked: boolean) => updateType('type_b', checked),
    },
    ...(showEnergy
      ? [
          {
            key: 'energy' as const,
            label: '元気',
            checked: value.energy,
            onChange: (checked: boolean) => onChange({ ...value, energy: checked } as T),
          },
        ]
      : []),
  ]
  return (
    <>
      <fieldset className={compact ? 'mt-1' : 'mt-4'}>
        <legend
          className={
            compact
              ? 'mb-1 text-[10px] font-semibold text-gray-500'
              : 'mb-2 text-xs font-semibold text-gray-500'
          }
        >
          レアリティ
        </legend>
        <div className={cn('grid gap-1.5', allowBasicName ? 'grid-cols-2' : 'grid-cols-3')}>
          {rarities.map((rarity) => (
            <label
              key={rarity}
              className={cn(
                'flex items-center justify-center gap-1 rounded-lg border',
                compact ? 'px-1.5 py-1.5 text-[10px]' : 'px-2 py-2 text-xs',
                value.rarity === rarity
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600',
              )}
            >
              <input
                type="radio"
                name={`${namePrefix}-skill-rarity`}
                checked={value.rarity === rarity}
                onChange={() => onChange({ ...value, rarity } as T)}
              />
              {rarity === 'basic_name' ? '名前に「基本」を含む' : rarity}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={compact ? 'mt-2' : 'mt-4'}>
        <legend
          className={
            compact
              ? 'mb-1 text-[10px] font-semibold text-gray-500'
              : 'mb-2 text-xs font-semibold text-gray-500'
          }
        >
          タイプ
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {(['active', 'mental'] as const).map((category) => (
            <label
              key={category}
              className={cn(
                'flex items-center rounded-lg border',
                compact ? 'gap-1 px-1.5 py-1.5 text-[10px]' : 'gap-1.5 px-2 py-2 text-xs',
                value.category === category
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600',
              )}
            >
              <input
                type="radio"
                name={`${namePrefix}-skill-category`}
                checked={value.category === category}
                onChange={() => onChange({ ...value, category } as T)}
              />
              {category === 'active' ? 'アクティブ' : 'メンタル'}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={compact ? 'mt-2' : 'mt-4'}>
        <legend
          className={
            compact
              ? 'mb-1 text-[10px] font-semibold text-gray-500'
              : 'mb-2 text-xs font-semibold text-gray-500'
          }
        >
          効果
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {kindOptions.map((option) => (
            <label
              key={option.key}
              className={cn(
                'flex items-center rounded-lg border',
                compact ? 'gap-1 px-1.5 py-1.5 text-[10px]' : 'gap-1.5 px-2 py-2 text-xs',
                option.checked ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600',
              )}
            >
              <input
                type="checkbox"
                name={`${namePrefix}-skill-kind-${option.key}`}
                checked={option.checked}
                onChange={(event) => option.onChange(event.target.checked)}
              />
              {option.label}
            </label>
          ))}
        </div>
        <p className={compact ? 'mt-1 text-[9px] text-gray-400' : 'mt-1.5 text-[10px] text-gray-400'}>
          未選択の場合は「その他」として扱います
        </p>
      </fieldset>
      {showUpgraded && (
        <label
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-600',
            compact ? 'mt-2 px-2 py-1.5 text-[10px]' : 'mt-4 px-2 py-2 text-xs',
          )}
        >
          <input
            type="checkbox"
            name={`${namePrefix}-skill-upgraded`}
            checked={value.upgraded === true}
            onChange={(event) => onChange({ ...value, upgraded: event.target.checked } as T)}
          />
          強化済みで獲得
        </label>
      )}
    </>
  )
}
