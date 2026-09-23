import type { HifScheduleConfig, HifScheduleStep } from '@/types/hif-schedule'

/** Keep a support event on the earliest day where it was selected. */
export function confirmHifScheduleStep(
  schedule: HifScheduleConfig,
  index: number,
  step: HifScheduleStep,
  mode: 'schedule' | 'event',
): HifScheduleConfig {
  const selectedFront = step.pItemSlots[0]
  const selectedAfter = step.postEventSelection

  return {
    ...schedule,
    steps: schedule.steps.map((item, dayIndex) => {
      if (dayIndex === index) return step
      if (mode !== 'event' || dayIndex < index) return item

      const clearsFront = selectedFront !== undefined && item.pItemSlots.includes(selectedFront)
      const clearsAfter =
        selectedAfter &&
        item.postEventSelection?.slot === selectedAfter.slot &&
        item.postEventSelection.eventIndex === selectedAfter.eventIndex

      if (!clearsFront && !clearsAfter) return item
      return {
        ...item,
        pItemSlots: clearsFront ? item.pItemSlots.filter((slot) => slot !== selectedFront) : item.pItemSlots,
        ...(clearsFront ? { frontSkillCard: null } : {}),
        ...(clearsAfter ? { postEventSelection: null } : {}),
      }
    }),
  }
}
