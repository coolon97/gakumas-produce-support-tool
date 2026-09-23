import { HifSchedulePanel } from './HifSchedulePanel'
import type { TutorialProgress } from '@/types/tutorial'

export function HifConfigPanel({ tutorialProgress }: { tutorialProgress?: TutorialProgress | null }) {
  return <HifSchedulePanel tutorialProgress={tutorialProgress} />
}
