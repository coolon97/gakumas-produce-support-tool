import { HifConfigPanel } from '@/components/HifConfig'
import type { TutorialProgress } from '@/types/tutorial'

export { IdolSelectPanel } from './IdolSelectPanel'

export function ProduceConfigPanel({ tutorialProgress }: { tutorialProgress?: TutorialProgress | null }) {
  return <HifConfigPanel tutorialProgress={tutorialProgress} />
}
