import { HIF_SCHEDULE } from '@/data/hif-schedule'
import { CUSTOM_P_ITEM_MASCOTS, getCustomPItemDecorations } from '@/data/hif-custom-p-items'
import type { HifScheduleConfig, HifScheduleStep } from '@/types/hif-schedule'

const PARAMS: HifScheduleStep['param'][] = ['vocal', 'dance', 'visual']

function tutorialStep(index: number, current: HifScheduleStep, random: () => number): HifScheduleStep {
  const day = HIF_SCHEDULE[index]
  const actions = day.actions.filter((action) => action !== 'rest')
  const action = actions[Math.floor(random() * actions.length)]
  const step = structuredClone(current)
  step.action = action
  if (action === 'lesson' || action === 'class') {
    step.param = PARAMS[Math.floor(random() * PARAMS.length)]
    if (action === 'lesson') {
      const subParams = PARAMS.filter((param) => param !== step.param)
      step.subParam = subParams[Math.floor(random() * subParams.length)]
    }
  }
  if (action === 'lesson') step.lessonType = random() < 0.5 ? 'normal' : 'sp'
  if (action === 'training') step.trainingCustomCount = Math.floor(random() * 3) as 0 | 1 | 2
  if (action === 'outing')
    step.outing.skillCards = step.outing.skillCards.map(
      (card) => card ?? { category: 'active', skillKind: 'other', preservation: false, energy: false, rarity: 'R' },
    ) as HifScheduleStep['outing']['skillCards']
  return step
}

/** Fill only the tutorial's demonstration days, preserving the user's first custom-item choice. */
export function fillTutorialScheduleRange(
  schedule: HifScheduleConfig,
  from: number,
  to: number,
  random: () => number = Math.random,
): HifScheduleConfig {
  const steps = schedule.steps.map((step, index) =>
    index >= from && index < to ? tutorialStep(index, step, random) : step,
  )
  if (to <= 7) return { ...schedule, steps }

  const color = schedule.customPItem.color ?? 'yellow'
  const mascot = schedule.customPItem.mascot ?? CUSTOM_P_ITEM_MASCOTS[color][0]
  const customPItem =
    to > 13
      ? {
          color,
          mascot,
          decoration: schedule.customPItem.decoration ?? getCustomPItemDecorations(color, mascot)[0] ?? null,
        }
      : { color, mascot, decoration: schedule.customPItem.decoration }
  return { ...schedule, steps, customPItem }
}
