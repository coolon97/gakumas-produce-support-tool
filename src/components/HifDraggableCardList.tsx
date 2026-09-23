import { useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DragState = {
  pointerId: number
  startY: number
  scrollTop: number
  dragging: boolean
}

export function HifDraggableCardList({ children, className }: { children: ReactNode; className?: string }) {
  const drag = useRef<DragState | null>(null)
  const suppressClick = useRef(false)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    suppressClick.current = false
    if (event.pointerType === 'touch' || event.button !== 0) return
    const list = event.currentTarget
    if (list.scrollHeight <= list.clientHeight) return
    const scrollbarWidth = list.offsetWidth - list.clientWidth
    if (scrollbarWidth > 0 && event.clientX >= list.getBoundingClientRect().right - scrollbarWidth) return
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: list.scrollTop,
      dragging: false,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId || !(event.buttons & 1)) return
    const distance = event.clientY - current.startY
    if (!current.dragging && Math.abs(distance) < 5) return
    if (!current.dragging) {
      current.dragging = true
      suppressClick.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    event.currentTarget.scrollTop = current.scrollTop - distance
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      data-hif-dialog-scroll
      className={cn(
        'select-none rounded-xl border border-gray-400 cursor-grab active:cursor-grabbing',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  )
}
