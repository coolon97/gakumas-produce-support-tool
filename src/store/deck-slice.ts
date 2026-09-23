import type { StateCreator } from 'zustand'
import type { AppState } from './state'
import { MAX_DECK_SIZE, normalizeDeckCardLevel } from './produce-config'
type Slice = Pick<
  AppState,
  | 'deck'
  | 'addToDeck'
  | 'removeFromDeck'
  | 'setCardLevel'
  | 'clearDeck'
  | 'selectingSlot'
  | 'cardSearchInitialPlans'
  | 'openCardSelect'
  | 'closeCardSelect'
>

export const createDeckSlice: StateCreator<AppState, [], [], Slice> = (set) => ({
  // ---- デッキ ----
  deck: [],

  addToDeck: (card, slot) => {
    set((state) => {
      const newDeck = [...state.deck]
      const initialLevel = card.maxLevel
      const postEventEnabledSlots = [
        ...(state.produceConfig.postEventEnabledSlots ?? [false, false, false, false, false, false]),
      ]

      if (slot !== undefined) {
        // 指定スロットに上書き
        newDeck[slot] = { card, level: initialLevel, isRental: false }
        postEventEnabledSlots[slot] = false
      } else {
        // 空きスロットを探して追加
        if (newDeck.length >= MAX_DECK_SIZE) return state // デッキ満杯
        postEventEnabledSlots[newDeck.length] = false
        newDeck.push({ card, level: initialLevel, isRental: false })
      }

      return {
        deck: newDeck,
        produceConfig: {
          ...state.produceConfig,
          postEventEnabledSlots,
        },
      }
    })
  },

  removeFromDeck: (slot) => {
    set((state) => {
      const newDeck = state.deck.filter((_, i) => i !== slot)
      const previousSlots = state.produceConfig.postEventEnabledSlots ?? [
        false,
        false,
        false,
        false,
        false,
        false,
      ]
      const nextPostEventEnabledSlots = previousSlots.filter((_, i) => i !== slot)
      while (nextPostEventEnabledSlots.length < 6) {
        nextPostEventEnabledSlots.push(false)
      }

      return {
        deck: newDeck,
        produceConfig: {
          ...state.produceConfig,
          postEventEnabledSlots: nextPostEventEnabledSlots,
        },
      }
    })
  },

  setCardLevel: (slot, level) => {
    set((state) => {
      const newDeck = state.deck.map((dc, i) =>
        i === slot
          ? { ...dc, level: normalizeDeckCardLevel(level, dc.card.maxLevel, dc.card.availableLevels) }
          : dc,
      )
      return { deck: newDeck }
    })
  },

  clearDeck: () =>
    set((state) => ({
      deck: [],
      produceConfig: {
        ...state.produceConfig,
        postEventEnabledSlots: [false, false, false, false, false, false],
      },
    })),

  // ---- カード選択モーダル ----
  selectingSlot: null,
  cardSearchInitialPlans: [],
  openCardSelect: (slot, preferredPlans = []) =>
    set({ selectingSlot: slot, cardSearchInitialPlans: preferredPlans }),
  closeCardSelect: () => set({ selectingSlot: null, cardSearchInitialPlans: [] }),
})
