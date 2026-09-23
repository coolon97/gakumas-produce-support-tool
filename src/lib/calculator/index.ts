import type { DeckCard } from '@/types/card'
import type { ProduceConfig } from '@/types/produce'
import type { CalculatorResult } from '@/types/calculator'
import { simulateHifSchedule } from './hif-simulation'

export {
  calcCardSkillValueByStat,
  calcDeckLessonBonus,
  calcDeckLessonBonusByStat,
  calcDeckSpRate,
  calcDeckSpRateByStat,
} from './event-counts'
/** H.I.F.のメイン計算エントリポイント。 */
export function calculate(deck: DeckCard[], config: ProduceConfig): CalculatorResult {
  return simulateHifSchedule(deck, config)
}
