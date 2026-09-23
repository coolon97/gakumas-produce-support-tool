import cardsData from '@data/cards.json'
import { IDOLS } from '@/data/idols'
import type { DeckCard, SupportCard } from '@/types/card'
import type { EventTriggerCounts, ProduceConfig } from '@/types/produce'
import { getInputStorage, type InputStorage } from '@/lib/input-storage'
import { normalizeTalentStage } from '@/lib/idol-progression'
import { normalizeHifSchedule } from '@/lib/hif-schedule'
import { DEFAULT_PRODUCE_CONFIG, normalizeDeckCardLevel, normalizeHifConfig } from './produce-config'

export const APP_INPUTS_KEY = 'gakumas-app-inputs'
export interface AppInputs {
  deck: DeckCard[]
  produceConfig: ProduceConfig
}

function record(value: unknown): Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/** Merge only fields with the expected shape, retaining defaults for newly added fields. */
function mergeInput(template: unknown, saved: unknown): unknown {
  if (Array.isArray(template))
    return template.map((item, index) => mergeInput(item, Array.isArray(saved) ? saved[index] : undefined))
  if (template != null && typeof template === 'object') {
    const values = record(saved)
    return Object.fromEntries(
      Object.entries(template).map(([key, value]) => [key, mergeInput(value, values[key])]),
    )
  }
  if (typeof template === 'number')
    return typeof saved === 'number' && Number.isFinite(saved) ? Math.max(0, saved) : template
  return typeof saved === typeof template ? saved : template
}

function counts(value: unknown): EventTriggerCounts {
  return Object.fromEntries(
    Object.entries(record(value))
      .filter(([, count]) => typeof count === 'number' && Number.isFinite(count))
      .map(([key, count]) => [key, Math.max(0, Math.floor(count as number))]),
  )
}

export function loadAppInputs(
  storage: InputStorage | undefined = getInputStorage(),
  catalog = cardsData as SupportCard[],
): AppInputs {
  const defaults: AppInputs = { deck: [], produceConfig: structuredClone(DEFAULT_PRODUCE_CONFIG) }
  try {
    const raw = storage?.getItem(APP_INPUTS_KEY)
    if (!raw) return defaults
    const saved = record(JSON.parse(raw))
    if (saved.version !== 2) return defaults
    const input = record(saved.produceConfig)
    const config = mergeInput(defaults.produceConfig, input) as ProduceConfig
    const idol = IDOLS.find(({ id }) => id === config.idolId) ?? IDOLS[0]
    config.idolId = idol.id
    config.idolVersionId =
      idol.versions.find(({ id }) => id === config.idolVersionId)?.id ?? idol.versions[0].id
    config.idolTalentStage = normalizeTalentStage(config.idolTalentStage)
    const savedHif = record(input.hif)
    const savedCarryoverSkillCards = savedHif.carryoverSkillCards
    if (Array.isArray(savedCarryoverSkillCards)) {
      config.hif.carryoverSkillCards.forEach((card, index) => {
        const upgraded = record(savedCarryoverSkillCards[index]).upgraded
        if (typeof upgraded === 'boolean') card.upgraded = upgraded
      })
    }
    config.eventTriggerCounts = counts(input.eventTriggerCounts)

    config.hif.schedule = normalizeHifSchedule(savedHif.schedule)
    if (Array.isArray(savedHif.selectionExams)) {
      const savedSelectionExams = savedHif.selectionExams
      config.hif.selectionExams.forEach((exam, index) => {
        const savedExam = record(savedSelectionExams[index])
        if (Array.isArray(savedExam.deletedBasicCardIds))
          exam.deletedBasicCardIds = savedExam.deletedBasicCardIds.filter(
            (id): id is string => typeof id === 'string',
          )
      })
    }
    const savedLessons = savedHif.lessons
    if (Array.isArray(savedLessons))
      config.hif.lessons.forEach((lesson, index) => {
        const savedLesson = record(savedLessons[index])
        if (savedLesson.param === null) lesson.param = null
        if (savedLesson.subParam === null) lesson.subParam = null
      })
    config.hif = normalizeHifConfig(config.hif)

    const previousPostEvents = config.postEventEnabledSlots ?? []
    config.postEventEnabledSlots = Array(6).fill(false)
    const deck: DeckCard[] = []
    if (Array.isArray(saved.deck))
      saved.deck.slice(0, 6).forEach((entry, index) => {
        const item = record(entry)
        const card = catalog.find(({ id }) => id === item.cardId)
        if (!card || deck.some((dc) => dc.card.id === card.id)) return
        const level =
          typeof item.level === 'number' && Number.isFinite(item.level) ? item.level : card.maxLevel
        config.postEventEnabledSlots![deck.length] = previousPostEvents[index] ?? false
        deck.push({
          card,
          level: normalizeDeckCardLevel(level, card.maxLevel, card.availableLevels),
          isRental: item.isRental === true,
        })
      })
    return { deck, produceConfig: config }
  } catch {
    return defaults
  }
}

export function saveAppInputs(
  inputs: AppInputs,
  storage: InputStorage | undefined = getInputStorage(),
): void {
  try {
    storage?.setItem(
      APP_INPUTS_KEY,
      JSON.stringify({
        version: 2,
        deck: inputs.deck.map((dc) =>
          dc ? { cardId: dc.card.id, level: dc.level, isRental: dc.isRental } : null,
        ),
        produceConfig: inputs.produceConfig,
      }),
    )
  } catch {
    // Continue using the in-memory settings if browser storage is unavailable.
  }
}
