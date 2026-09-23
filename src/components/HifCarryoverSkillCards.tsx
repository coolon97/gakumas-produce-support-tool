import type { HifCarryoverSkillCard } from '@/types/hif-schedule'
import type { IdolPlan } from '@/types/produce'
import { cn } from '@/lib/utils'
import { HifSkillCardSelectionFields } from './HifSkillCardSelectionFields'

export function HifCarryoverSkillCards({
  cards,
  plan,
  onChange,
}: {
  cards: HifCarryoverSkillCard[]
  plan: IdolPlan
  onChange: (cards: HifCarryoverSkillCard[]) => void
}) {
  const enabledCount = cards.filter((card) => card.enabled).length
  const update = (index: number, card: HifCarryoverSkillCard) =>
    onChange(cards.map((item, itemIndex) => (itemIndex === index ? card : item)))
  return (
    <details data-tutorial="carryover" className="group rounded-xl border border-gray-200 bg-gray-50">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700">
        <span className="inline-flex items-center gap-2">
          持ち込みスキルカード設定 <span className="font-normal text-gray-400">{enabledCount}/4</span>
          {enabledCount === 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              未設定
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-xs text-gray-400 transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="border-t border-gray-200 p-3">
        <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
          使用する枠だけ育成へ反映します。開始時獲得は1日目、チェックを外したカードは選抜7日目に獲得します。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card, index) => (
            <section
              key={index}
              data-tutorial-carryover-card={index}
              className={cn(
                'rounded-xl border p-2.5',
                card.enabled ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50',
              )}
            >
              <label className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-700">
                <span>カード {index + 1}</span>
                <span className="flex items-center gap-1.5 font-medium text-gray-500">
                  <input
                    type="checkbox"
                    data-tutorial-carryover-enable={index}
                    aria-label={`持ち込みスキルカード${index + 1}を使用`}
                    checked={card.enabled}
                    onChange={(event) => update(index, { ...card, enabled: event.target.checked })}
                  />
                  使用する
                </span>
              </label>
              {card.enabled && (
                <>
                  <HifSkillCardSelectionFields
                    value={{ ...card, energy: card.energy === true }}
                    plan={plan}
                    namePrefix={`carryover-${index}`}
                    compact
                    showUpgraded
                    onChange={(selection) =>
                      update(index, {
                        ...card,
                        category: selection.category,
                        skillKind: selection.skillKind,
                        preservation: selection.preservation,
                        energy: selection.energy,
                        rarity: selection.rarity,
                        upgraded: selection.upgraded,
                      })
                    }
                  />
                  <label
                    className={cn(
                      'mt-2 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-semibold',
                      card.acquireOnDayOne
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-white text-gray-600',
                    )}
                  >
                    <input
                      type="checkbox"
                      aria-label={`持ち込みスキルカード${index + 1}を開始時に獲得`}
                      checked={card.acquireOnDayOne}
                      onChange={(event) => update(index, { ...card, acquireOnDayOne: event.target.checked })}
                    />
                    開始時に獲得（1日目）
                  </label>
                  {!card.acquireOnDayOne && <p className="mt-1 text-[10px] text-gray-400">選抜7日目に獲得</p>}
                </>
              )}
            </section>
          ))}
        </div>
      </div>
    </details>
  )
}
