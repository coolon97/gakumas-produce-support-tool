import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import type { AppState } from '@/store'

export function useDeckBuilderStore() {
  return useAppStore(
    useShallow((state: AppState) => ({
      deck: state.deck,
      produceConfig: state.produceConfig,
      removeFromDeck: state.removeFromDeck,
      setCardLevel: state.setCardLevel,
      clearDeck: state.clearDeck,
      clearCalculationResult: state.clearCalculationResult,
      runCalculation: state.runCalculation,
      openCardSelect: state.openCardSelect,
    })),
  )
}

export function useProduceConfigStore() {
  return useAppStore(
    useShallow((state: AppState) => ({
      produceConfig: state.produceConfig,
      setIdol: state.setIdol,
      setIdolTalentStage: state.setIdolTalentStage,
      setHifConfig: state.setHifConfig,
    })),
  )
}

export function useCardSearchStore() {
  return useAppStore(
    useShallow((state: AppState) => ({
      deck: state.deck,
      addToDeck: state.addToDeck,
      produceConfig: state.produceConfig,
    })),
  )
}

export function useHifScheduleStore() {
  return useAppStore(
    useShallow((state: AppState) => ({
      deck: state.deck,
      produceConfig: state.produceConfig,
      result: state.result,
      setHifConfig: state.setHifConfig,
      runCalculation: state.runCalculation,
    })),
  )
}

export function useCardSelectModalStore() {
  return useAppStore(
    useShallow((state: AppState) => ({
      selectingSlot: state.selectingSlot,
      cardSearchInitialPlans: state.cardSearchInitialPlans,
      closeCardSelect: state.closeCardSelect,
    })),
  )
}

export function useResultPanelStore() {
  return useAppStore(
    useShallow((state: AppState) => ({
      result: state.result,
    })),
  )
}

export function useStatusSettingsStore() {
  return useAppStore(
    useShallow((state: AppState) => ({
      deck: state.deck,
      produceConfig: state.produceConfig,
      setIdolBaseStats: state.setIdolBaseStats,
      setIdolLessonBonus: state.setIdolLessonBonus,
      setMemoryBaseStats: state.setMemoryBaseStats,
      setMemoryLessonBonus: state.setMemoryLessonBonus,
    })),
  )
}
