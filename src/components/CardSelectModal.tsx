import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CardSearch } from '@/components/CardSearch'
import { useCardSelectModalStore } from '@/store/selectors'

export function CardSelectModal() {
  const { selectingSlot, cardSearchInitialPlans, closeCardSelect } = useCardSelectModalStore()

  const isOpen = selectingSlot !== null

  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCardSelect()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, closeCardSelect])

  if (!isOpen) return null

  return createPortal(
    <div
      data-scroll-lock-overlay
      className="fixed inset-0 z-[100] isolate flex items-center justify-center p-4"
      onClick={closeCardSelect}
    >
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/40" />

      {/* モーダル本体 */}
      <div
        className="relative z-[101] bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700">
            サポートカード選択
            <span className="ml-2 text-sm font-normal text-gray-400">スロット {selectingSlot! + 1}</span>
          </h2>
          <button
            onClick={closeCardSelect}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>
        <div data-tutorial="support-list" className="flex-1 min-h-0">
          <CardSearch
            targetSlot={selectingSlot!}
            initialPlans={cardSearchInitialPlans}
            onCardSelected={closeCardSelect}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
