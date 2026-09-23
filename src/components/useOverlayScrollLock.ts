import { useEffect } from 'react'

const OVERLAY_SELECTOR = '[data-scroll-lock-overlay]'
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

function canScrollWithinOverlay(
  target: EventTarget | null,
  overlay: Element,
  deltaX: number,
  deltaY: number,
): boolean {
  let element = target instanceof Element ? target : null
  while (element && overlay.contains(element)) {
    if (element instanceof HTMLElement) {
      const style = getComputedStyle(element)
      const canScrollY =
        /^(auto|scroll)$/.test(style.overflowY) &&
        (deltaY < 0
          ? element.scrollTop > 1
          : deltaY > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1)
      const canScrollX =
        /^(auto|scroll)$/.test(style.overflowX) &&
        (deltaX < 0
          ? element.scrollLeft > 1
          : deltaX > 0 && element.scrollLeft + element.clientWidth < element.scrollWidth - 1)
      if (canScrollY || canScrollX) return true
    }
    if (element === overlay) break
    element = element.parentElement
  }
  return false
}

function activeOverlay(target: EventTarget | null): Element | null {
  if (!document.querySelector(OVERLAY_SELECTOR)) return null
  return target instanceof Element ? target.closest(OVERLAY_SELECTOR) : null
}

export function useOverlayScrollLock(): void {
  useEffect(() => {
    let lastTouchY: number | null = null

    const preventBackgroundWheel = (event: WheelEvent) => {
      const overlay = activeOverlay(event.target)
      if (overlay && canScrollWithinOverlay(event.target, overlay, event.deltaX, event.deltaY)) return
      if (document.querySelector(OVERLAY_SELECTOR)) event.preventDefault()
    }
    const onTouchStart = (event: TouchEvent) => {
      lastTouchY = event.touches.length === 1 ? event.touches[0].clientY : null
    }
    const preventBackgroundTouch = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      if (event.target instanceof Element && event.target.closest('input[type="range"]')) return
      const currentY = event.touches[0]?.clientY
      if (currentY === undefined || lastTouchY === null) return
      const deltaY = lastTouchY - currentY
      lastTouchY = currentY
      const overlay = activeOverlay(event.target)
      if (overlay && canScrollWithinOverlay(event.target, overlay, 0, deltaY)) return
      if (document.querySelector(OVERLAY_SELECTOR)) event.preventDefault()
    }
    const preventBackgroundKeys = (event: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
      if (!document.querySelector(OVERLAY_SELECTOR)) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return
      const overlay = activeOverlay(target)
      if (
        event.key === ' ' &&
        overlay &&
        target instanceof HTMLElement &&
        target.closest('button, a, [role="button"]')
      )
        return
      const deltaY =
        event.key === 'ArrowUp' ||
        event.key === 'PageUp' ||
        event.key === 'Home' ||
        (event.shiftKey && event.key === ' ')
          ? -1
          : 1
      if (!overlay || !canScrollWithinOverlay(target, overlay, 0, deltaY)) event.preventDefault()
    }

    document.addEventListener('wheel', preventBackgroundWheel, { passive: false })
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', preventBackgroundTouch, { passive: false })
    document.addEventListener('keydown', preventBackgroundKeys)
    return () => {
      document.removeEventListener('wheel', preventBackgroundWheel)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', preventBackgroundTouch)
      document.removeEventListener('keydown', preventBackgroundKeys)
    }
  }, [])
}
