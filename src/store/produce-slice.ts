import type { StateCreator } from 'zustand'
import type { AppState } from './state'
import {
  DEFAULT_PRODUCE_CONFIG,
  getVersionDefaults,
  normalizeStatValues,
  normalizeHifConfig,
} from './produce-config'
import { normalizeTalentStage } from '@/lib/idol-progression'
import { findIdolVersion } from '@/data/idols'
import type { HifConfig } from '@/types/produce'

type Slice = Pick<
  AppState,
  | 'produceConfig'
  | 'setHifConfig'
  | 'setIdol'
  | 'setVersion'
  | 'setIdolTalentStage'
  | 'setIdolBaseStats'
  | 'setIdolLessonBonus'
  | 'setMemoryBaseStats'
  | 'setMemoryLessonBonus'
  | 'setEventTriggerCount'
  | 'setEventTriggerCounts'
  | 'setPostEventSlotEnabled'
>

function resetScheduleSettings(hif: HifConfig): HifConfig {
  const defaults = structuredClone(DEFAULT_PRODUCE_CONFIG.hif)
  return {
    ...hif,
    schedule: defaults.schedule,
    lessons: defaults.lessons,
    classes: defaults.classes,
    selectionExams: defaults.selectionExams,
    carryoverSkillCards: defaults.carryoverSkillCards,
    round1Score: defaults.round1Score,
    round2Score: defaults.round2Score,
  }
}

function resetForIdolChange(state: AppState, idolId: string, versionId: string) {
  if (state.produceConfig.idolId === idolId && state.produceConfig.idolVersionId === versionId) return state
  const currentPlan = findIdolVersion(state.produceConfig.idolId, state.produceConfig.idolVersionId)?.plan
  const nextPlan = findIdolVersion(idolId, versionId)?.plan
  const samePlan = currentPlan !== undefined && currentPlan === nextPlan
  return {
    deck: samePlan ? state.deck : [],
    selectingSlot: null,
    cardSearchInitialPlans: [],
    result: null,
    produceConfig: {
      ...state.produceConfig,
      idolId,
      idolVersionId: versionId,
      ...getVersionDefaults(idolId, versionId, state.produceConfig.idolTalentStage),
      memoryBaseStats: samePlan ? state.produceConfig.memoryBaseStats : { vo: 0, da: 0, vi: 0 },
      memoryLessonBonus: samePlan ? state.produceConfig.memoryLessonBonus : { vo: 0, da: 0, vi: 0 },
      eventTriggerCounts: samePlan ? state.produceConfig.eventTriggerCounts : {},
      postEventEnabledSlots: samePlan
        ? state.produceConfig.postEventEnabledSlots
        : [false, false, false, false, false, false],
      hif: samePlan ? state.produceConfig.hif : resetScheduleSettings(state.produceConfig.hif),
    },
  }
}

export const createProduceSlice: StateCreator<AppState, [], [], Slice> = (set) => ({
  produceConfig: structuredClone(DEFAULT_PRODUCE_CONFIG),

  setHifConfig: (update) =>
    set((state) => ({
      produceConfig: {
        ...state.produceConfig,
        hif: normalizeHifConfig({ ...state.produceConfig.hif, ...update }),
      },
    })),

  setIdol: (idolId, versionId) => set((state) => resetForIdolChange(state, idolId, versionId)),

  setVersion: (versionId) => set((state) => resetForIdolChange(state, state.produceConfig.idolId, versionId)),

  setIdolTalentStage: (stage) =>
    set((state) => {
      const idolTalentStage = normalizeTalentStage(stage)
      const { idolLessonBonus } = getVersionDefaults(
        state.produceConfig.idolId,
        state.produceConfig.idolVersionId,
        idolTalentStage,
      )
      return { produceConfig: { ...state.produceConfig, idolTalentStage, idolLessonBonus } }
    }),

  setIdolBaseStats: (idolBaseStats) =>
    set((state) => ({
      produceConfig: { ...state.produceConfig, idolBaseStats: normalizeStatValues(idolBaseStats) },
    })),

  setIdolLessonBonus: (idolLessonBonus) =>
    set((state) => ({
      produceConfig: { ...state.produceConfig, idolLessonBonus: normalizeStatValues(idolLessonBonus) },
    })),

  setMemoryBaseStats: (memoryBaseStats) =>
    set((state) => ({
      produceConfig: { ...state.produceConfig, memoryBaseStats: normalizeStatValues(memoryBaseStats) },
    })),

  setMemoryLessonBonus: (memoryLessonBonus) =>
    set((state) => ({
      produceConfig: { ...state.produceConfig, memoryLessonBonus: normalizeStatValues(memoryLessonBonus) },
    })),

  setEventTriggerCount: (key, count) =>
    set((state) => ({
      produceConfig: {
        ...state.produceConfig,
        eventTriggerCounts: {
          ...(state.produceConfig.eventTriggerCounts ?? {}),
          [key]: Math.max(0, Math.floor(Number(count) || 0)),
        },
      },
    })),

  setEventTriggerCounts: (counts) =>
    set((state) => ({
      produceConfig: {
        ...state.produceConfig,
        eventTriggerCounts: Object.fromEntries(
          Object.entries(counts).map(([key, value]) => [key, Math.max(0, Math.floor(Number(value) || 0))]),
        ),
      },
    })),

  setPostEventSlotEnabled: (index, enabled) =>
    set((state) => {
      const postEventEnabledSlots = [...(state.produceConfig.postEventEnabledSlots ?? Array(6).fill(false))]
      if (index < 0 || index >= 6) return state
      postEventEnabledSlots[index] = enabled
      return { produceConfig: { ...state.produceConfig, postEventEnabledSlots } }
    }),
})
