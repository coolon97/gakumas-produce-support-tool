import type { ProduceSkillCardState } from '@/types/calculator'
import { HifDraggableCardList } from './HifDraggableCardList'
import { HifOwnedSkillCardOption } from './HifOwnedSkillCardOption'

export function HifOwnedSkillCardPicker({
  cards,
  value,
  name,
  label = 'チェンジ元を所持カードから1枚選択',
  onChange,
}: {
  cards: readonly ProduceSkillCardState[]
  value: string | null | undefined
  name: string
  label?: string
  onChange: (id: string) => void
}) {
  return (
    <fieldset className="mt-2">
      <legend className="text-[11px] font-semibold text-gray-600">{label}</legend>
      {cards.length ? (
        <HifDraggableCardList className="mt-2 max-h-[min(320px,45dvh)] space-y-2 overflow-y-auto p-2">
          {cards.map((card, index) => (
            <HifOwnedSkillCardOption
              key={card.id}
              card={card}
              index={index}
              selected={value === card.id}
              inputType="radio"
              name={name}
              onChange={() => onChange(card.id)}
            />
          ))}
        </HifDraggableCardList>
      ) : (
        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-[10px] text-gray-500">
          選択できる所持カードがありません。
        </p>
      )}
      {value && !cards.some((card) => card.id === value) && (
        <p role="alert" className="mt-2 text-[10px] text-red-600">
          選択したカードは現在所持していません。選び直してください。
        </p>
      )}
    </fieldset>
  )
}
