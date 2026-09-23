import type { DeckCard, SupportCard } from '@/types/card'
import type { ProduceConfig, EventTriggerCounts, StatValues, HifConfig } from '@/types/produce'
import type { CalculatorResult } from '@/types/calculator'
export interface AppState {
  // ---- デッキ ----
  deck: DeckCard[]
  addToDeck: (card: SupportCard, slot?: number) => void
  removeFromDeck: (slot: number) => void
  setCardLevel: (slot: number, level: number) => void
  clearDeck: () => void

  // ---- カード選択モーダル ----
  selectingSlot: number | null
  cardSearchInitialPlans: Array<'sense' | 'logic' | 'anomaly' | 'free'>
  openCardSelect: (slot: number, preferredPlans?: Array<'sense' | 'logic' | 'anomaly' | 'free'>) => void
  closeCardSelect: () => void

  // ---- プロデュース設定 ----
  produceConfig: ProduceConfig
  setHifConfig: (update: Partial<HifConfig>) => void
  setIdol: (idolId: string, versionId: string) => void
  setVersion: (versionId: string) => void
  setIdolTalentStage: (stage: number) => void
  setIdolBaseStats: (stats: StatValues) => void
  setIdolLessonBonus: (bonus: StatValues) => void
  setMemoryBaseStats: (stats: StatValues) => void
  setMemoryLessonBonus: (bonus: StatValues) => void
  setEventTriggerCount: (key: string, count: number) => void
  setEventTriggerCounts: (counts: EventTriggerCounts) => void
  setPostEventSlotEnabled: (index: number, enabled: boolean) => void

  // ---- 計算結果 ----
  result: CalculatorResult | null
  clearCalculationResult: () => void
  runCalculation: () => void
}
