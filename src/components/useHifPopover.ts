import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

export type HifPopoverPosition = {
  left: number
  top: number
  width: number
  placement: 'top' | 'bottom'
  arrowLeft: number
  maxHeight?: number
  showArrow?: boolean
}

type PositionOptions = {
  preferredWidth: number
  fallbackHeight: number
  mode: 'scrollable' | 'floating'
  fitThreshold?: number
  minVisibleHeight?: number
}

/** Keep the three H.I.F. schedule popovers anchored to their trigger. */
export function useHifPopoverPosition(
  anchorElement: HTMLElement,
  panel: RefObject<HTMLDivElement | null>,
  options: PositionOptions,
): HifPopoverPosition | null {
  const { preferredWidth, fallbackHeight, mode, fitThreshold = 320, minVisibleHeight = 180 } = options
  const [position, setPosition] = useState<HifPopoverPosition | null>(null)
  const updatePosition = useCallback(() => {
    const anchor = anchorElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const width = Math.min(preferredWidth, viewportWidth - 24)
    const left = Math.max(
      12,
      Math.min(anchor.left + anchor.width / 2 - width / 2, viewportWidth - width - 12),
    )
    const below = viewportHeight - anchor.bottom - 12
    const above = anchor.top - 12
    const measured = panel.current?.scrollHeight ?? fallbackHeight
    const arrowLeft = Math.max(18, Math.min(anchor.left + anchor.width / 2 - left, width - 18))

    if (mode === 'floating') {
      const fitsBelow = below >= measured
      const fitsAbove = above >= measured
      const placement = fitsBelow || (!fitsAbove && below >= above) ? 'bottom' : 'top'
      const idealTop = placement === 'bottom' ? anchor.bottom + 10 : anchor.top - 10 - measured
      const top = Math.max(12, Math.min(idealTop, viewportHeight - measured - 12))
      const showArrow = placement === 'bottom' ? top >= anchor.bottom : top + measured <= anchor.top
      setPosition({ left, top, width, placement, arrowLeft, showArrow })
      return
    }

    const measuredHeight = Math.min(measured, viewportHeight - 24)
    const placement = below >= Math.min(measuredHeight, fitThreshold) || below >= above ? 'bottom' : 'top'
    const availableSpace = Math.max(minVisibleHeight, (placement === 'bottom' ? below : above) - 8)
    const maxHeight = Math.min(viewportHeight - 24, availableSpace)
    const renderedHeight = Math.min(measuredHeight, maxHeight)
    const top = placement === 'bottom' ? anchor.bottom + 10 : Math.max(12, anchor.top - 10 - renderedHeight)
    setPosition({ left, top, width, maxHeight, placement, arrowLeft })
  }, [anchorElement, panel, preferredWidth, fallbackHeight, mode, fitThreshold, minVisibleHeight])

  useLayoutEffect(() => {
    updatePosition()
    const frame = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [updatePosition])

  return position
}

export function useHifPopoverDismiss(
  bubble: RefObject<HTMLDivElement | null>,
  onClose: () => void,
  triggerSelector: string,
): void {
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (
        !target ||
        bubble.current?.contains(target) ||
        target.closest(`${triggerSelector}, [data-tutorial-overlay]`)
      )
        return
      onClose()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [bubble, onClose, triggerSelector])
}
