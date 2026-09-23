import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DeckCard } from '@/types/card'
import { CardSkillBadges } from './CardSkillBadges'
import { cn } from '@/lib/utils'

function formatRewardEffect(effect: string, kind: 'p_item' | 'skill_card'): string {
  if (kind !== 'skill_card') return effect
  const upgradedEffect = effect.split(' / ').find((part) => part.trimStart().startsWith('+('))
  return (upgradedEffect ?? effect).replace(/^\s*\+\([^)]*\):\s*/, '')
}

export function DeckAbilityPopover({
  card,
  anchor,
  onClose,
  id = 'deck-ability-details',
}: {
  card: DeckCard
  anchor: HTMLButtonElement
  onClose: () => void
  id?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 260,
    maxHeight: 400,
    above: false,
    arrow: 20,
    ready: false,
  })
  useLayoutEffect(() => {
    const update = () => {
      const rect = anchor.getBoundingClientRect()
      const width = Math.min(260, window.innerWidth - 24)
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
      const below = Math.max(0, window.innerHeight - rect.bottom - 22)
      const aboveSpace = Math.max(0, rect.top - 22)
      const height = panel.current?.scrollHeight ?? 300
      const above = below < Math.min(height, 260) && aboveSpace > below
      const maxHeight = Math.max(1, Math.min(420, above ? aboveSpace : below))
      const top = above ? rect.top - 10 - Math.min(height, maxHeight) : rect.bottom + 10
      setPosition({
        left,
        top,
        width,
        maxHeight,
        above,
        arrow: Math.max(16, Math.min(width - 16, rect.left + rect.width / 2 - left)),
        ready: true,
      })
    }
    update()
    const observer = new ResizeObserver(update)
    if (panel.current) observer.observe(panel.current)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor, card])
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !anchor.contains(event.target)
      )
        onClose()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        anchor.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [anchor, onClose])
  return createPortal(
    <div
      id={id}
      role="dialog"
      aria-label={`${card.card.name}のアビリティ詳細`}
      data-scroll-lock-overlay
      onClick={(event) => event.stopPropagation()}
      className="fixed z-[120]"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        visibility: position.ready ? 'visible' : 'hidden',
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute h-3 w-3 rotate-45 border-gray-200 bg-white',
          position.above ? '-bottom-1.5 border-b border-r' : '-top-1.5 border-l border-t',
        )}
        style={{ left: position.arrow - 6 }}
      />
      <div
        ref={panel}
        className="overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
        style={{ maxHeight: position.maxHeight }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-gray-700">
            {card.card.name}
            <span className="block text-[10px] font-normal text-gray-500">
              アビリティ詳細 · Lv{card.level}
            </span>
          </p>
          <button
            type="button"
            aria-label="アビリティ詳細を閉じる"
            onClick={() => {
              onClose()
              anchor.focus()
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"
          >
            ×
          </button>
        </div>
        <CardSkillBadges skills={card.card.skills} level={card.level} cardType={card.card.type} showDetails />
        {!card.card.skills.some((skill) => skill.unlockLevel <= card.level) && (
          <p className="text-xs text-gray-500">このレベルで有効なアビリティはありません。</p>
        )}
        <section className="mt-3 border-t border-gray-100 pt-3">
          <h4 className="mb-2 text-xs font-semibold text-gray-700">入手できるカード・アイテム</h4>
          {card.card.supportEventRewards?.length ? (
            <div className="space-y-2">
              {card.card.supportEventRewards.map((reward, index) => (
                <div
                  key={`${reward.kind}-${index}`}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs"
                >
                  <p className="text-[10px] font-semibold text-amber-700">
                    {reward.kind === 'p_item' ? 'Pアイテム' : 'スキルカード'}
                  </p>
                  <p className="mt-0.5 font-semibold text-gray-800">{reward.name}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-gray-600">
                    {formatRewardEffect(reward.effect, reward.kind) || '効果情報は未登録です。'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">入手報酬の情報は未登録です。</p>
          )}
        </section>
      </div>
    </div>,
    document.body,
  )
}
