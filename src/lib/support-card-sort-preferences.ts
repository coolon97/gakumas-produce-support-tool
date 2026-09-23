import { HIF_LESSON_SCHEDULE } from '@/data/hif'
import type { HifLessonConfig } from '@/types/produce'
import {
  PARAMETER_SORT_TRIGGER_SETTINGS,
  type ParameterSortTriggerCounts,
} from './support-card-parameter-total'

export const SUPPORT_CARD_SORT_PREFERENCES_KEY = 'gakumas-support-card-sort-preferences'

interface PreferenceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface SupportCardSortPreferences {
  lessons: HifLessonConfig[]
  triggerCounts: ParameterSortTriggerCounts
  useCurrentSchedule: boolean
}

export function createEmptySupportSortLessons(): HifLessonConfig[] {
  return HIF_LESSON_SCHEDULE.map(() => ({ enabled: false, type: 'normal', param: null, subParam: null }))
}

export function createDefaultSupportCardSortPreferences(): SupportCardSortPreferences {
  return {
    lessons: createEmptySupportSortLessons(),
    triggerCounts: Object.fromEntries(PARAMETER_SORT_TRIGGER_SETTINGS.map(({ key }) => [key, 0])),
    useCurrentSchedule: false,
  }
}

export function loadSupportCardSortPreferences(storage?: PreferenceStorage): SupportCardSortPreferences {
  const defaults = createDefaultSupportCardSortPreferences()
  try {
    const raw = storage?.getItem(SUPPORT_CARD_SORT_PREFERENCES_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw)
    if (!saved || saved.version !== 2) return defaults
    defaults.useCurrentSchedule = saved.useCurrentSchedule === true
    if (Array.isArray(saved.lessons)) {
      defaults.lessons = defaults.lessons.map((lesson, index) => {
        const value = saved.lessons[index]
        const validParam = (param: unknown) => param === 'vocal' || param === 'dance' || param === 'visual'
        return value && typeof value === 'object'
          ? {
              enabled: value.enabled === true,
              type: value.type === 'sp' ? 'sp' : 'normal',
              param: validParam(value.param) ? value.param : null,
              subParam: validParam(value.subParam) && value.subParam !== value.param ? value.subParam : null,
            }
          : lesson
      })
    }
    for (const { key } of PARAMETER_SORT_TRIGGER_SETTINGS) {
      const value = saved.triggerCounts?.[key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        defaults.triggerCounts[key] = Math.max(0, Math.floor(value))
      }
    }
    return defaults
  } catch {
    return defaults
  }
}

export function saveSupportCardSortPreferences(
  storage: PreferenceStorage | undefined,
  preferences: SupportCardSortPreferences,
): void {
  try {
    storage?.setItem(SUPPORT_CARD_SORT_PREFERENCES_KEY, JSON.stringify({ version: 2, ...preferences }))
  } catch {
    // Storage can be unavailable or full; calculations remain usable in memory.
  }
}
