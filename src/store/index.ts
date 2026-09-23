import { create } from 'zustand'
import type { AppState } from './state'
import { loadAppInputs, saveAppInputs } from './app-inputs'
import { createDeckSlice } from './deck-slice'
import { createProduceSlice } from './produce-slice'
import { createResultSlice } from './result-slice'
export type { AppState } from './state'

export const useAppStore = create<AppState>((...args) => ({
  ...createDeckSlice(...args),
  ...createProduceSlice(...args),
  ...createResultSlice(...args),
  ...loadAppInputs(),
}))

useAppStore.subscribe((state, previous) => {
  if (state.deck !== previous.deck || state.produceConfig !== previous.produceConfig) {
    saveAppInputs(state)
  }
})
