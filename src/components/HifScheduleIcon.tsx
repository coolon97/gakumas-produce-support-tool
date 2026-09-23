import type { HifScheduleAction } from '@/types/hif-schedule'
import type { LessonParameter } from '@/types/produce'
import vocalLessonIcon from '@assets/game/HifSchedule/lesson-vocal.webp'
import danceLessonIcon from '@assets/game/HifSchedule/lesson-dance.webp'
import visualLessonIcon from '@assets/game/HifSchedule/lesson-visual.webp'
import classIcon from '@assets/game/HifSchedule/class.webp'
import outingIcon from '@assets/game/HifSchedule/outing.webp'
import consultationIcon from '@assets/game/HifSchedule/consultation.webp'
import supplyIcon from '@assets/game/HifSchedule/supply.webp'
import trainingIcon from '@assets/game/HifSchedule/training.webp'
import restIcon from '@assets/game/HifSchedule/rest.webp'
import examIcon from '@assets/game/HifSchedule/exam.webp'
import roundIcon from '@assets/game/HifSchedule/round.webp'
import intervalIcon from '@assets/game/HifSchedule/interval.webp'

const IMAGES: Record<Exclude<HifScheduleAction, 'lesson'>, string> = {
  class: classIcon,
  outing: outingIcon,
  consultation: consultationIcon,
  supply: supplyIcon,
  training: trainingIcon,
  rest: restIcon,
  exam: examIcon,
  round1: roundIcon,
  interval: intervalIcon,
  round2: roundIcon,
}

const LESSON_IMAGES: Record<LessonParameter, string> = {
  vocal: vocalLessonIcon,
  dance: danceLessonIcon,
  visual: visualLessonIcon,
}

export function HifScheduleIcon({
  action,
  param,
  className = 'h-5 w-5',
}: {
  action: HifScheduleAction
  param?: LessonParameter
  className?: string
}) {
  const image = action === 'lesson' ? LESSON_IMAGES[param ?? 'vocal'] : IMAGES[action]
  return <img aria-hidden="true" src={image} alt="" className={`${className} object-contain`} />
}
