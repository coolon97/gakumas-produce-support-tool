import type { StateCreator } from 'zustand'
import type { AppState } from './state'
import { calculate } from '@/lib/calculator'
type Slice = Pick<AppState, 'result' | 'clearCalculationResult' | 'runCalculation'>

export const createResultSlice: StateCreator<AppState, [], [], Slice> = (set, get) => ({
  // ---- 計算結果 ----
  result: null,

  clearCalculationResult: () => set({ result: null }),

  runCalculation: () => {
    const { deck, produceConfig } = get()
    const result = calculate(deck, produceConfig)
    set({ result })
  },
})
