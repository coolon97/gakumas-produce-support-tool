import { IDOLS, findIdolVersion } from '@/data/idols'
import { createDefaultHifConfig, HIF_STAR_POWER_CAP } from '@/data/hif'
import type { DeckCard } from '@/types/card'
import type { ProduceConfig, StatValues, HifConfig } from '@/types/produce'
import { normalizeHifSelectionExamConfig } from '@/lib/calculator/hif-selection-exams'
import { getIdolProgression, MAX_TALENT_STAGE } from '@/lib/idol-progression'
import { normalizeHifSchedule } from '@/lib/hif-schedule'

export const MAX_DECK_SIZE = 6

const defaultVersion = IDOLS[0].versions[0]

export const DEFAULT_PRODUCE_CONFIG: ProduceConfig = {
  hif: createDefaultHifConfig(),
  idolId: 'saki',
  idolVersionId: defaultVersion.id,
  idolTalentStage: MAX_TALENT_STAGE,
  idolBaseStats: { ...defaultVersion.baseStats },
  memoryBaseStats: { vo: 0, da: 0, vi: 0 },
  idolLessonBonus: { ...defaultVersion.lessonBonus },
  memoryLessonBonus: { vo: 0, da: 0, vi: 0 },
  eventTriggerCounts: {},
  postEventEnabledSlots: [false, false, false, false, false, false],
}

export function normalizeDeckCardLevel(level: number, maxLevel: number, availableLevels?: number[]): number {
  if (availableLevels?.length) {
    return availableLevels.reduce(
      (closest, candidate) => (Math.abs(candidate - level) < Math.abs(closest - level) ? candidate : closest),
      availableLevels[0],
    )
  }
  const minimumLevel = Math.max(maxLevel - 20, 1)
  const clamped = Math.max(minimumLevel, Math.min(maxLevel, Number(level) || maxLevel))
  const stepIndex = Math.round((maxLevel - clamped) / 5)
  return maxLevel - stepIndex * 5
}

/** 未確認のレベルを飛ばして上限解放数を順に切り替える。 */
export function getNextDeckCardLevel(level: number, maxLevel: number, availableLevels?: number[]): number {
  const levels = availableLevels?.length
    ? [...new Set(availableLevels)].sort((a, b) => a - b)
    : Array.from({ length: 5 }, (_, index) => Math.max(1, maxLevel - 20 + index * 5))
  return levels[(levels.indexOf(level) + 1) % levels.length]
}

export function normalizeStatValues(values: Partial<StatValues>): StatValues {
  return {
    vo: Math.max(0, Number(values.vo) || 0),
    da: Math.max(0, Number(values.da) || 0),
    vi: Math.max(0, Number(values.vi) || 0),
  }
}

export function normalizeHifConfig(input: HifConfig): HifConfig {
  const defaults = createDefaultHifConfig()
  const bounded = (value: number, max: number) =>
    Number.isFinite(Number(value)) ? Math.min(max, Math.max(0, Math.floor(Number(value)))) : 0
  const isParam = (value: string | null) => value === 'vocal' || value === 'dance' || value === 'visual'
  return {
    ...input,
    schedule: normalizeHifSchedule(input.schedule),
    starPowerAffinityBonus: input.starPowerAffinityBonus !== false,
    starPower: bounded(input.starPower, HIF_STAR_POWER_CAP),
    spBonusLevel: bounded(input.spBonusLevel, 5),
    capBonusLevel: bounded(input.capBonusLevel, 6),
    round1Score: Number.isFinite(Number(input.round1Score))
      ? bounded(input.round1Score, 1400000)
      : defaults.round1Score,
    round2Score: Number.isFinite(Number(input.round2Score))
      ? bounded(input.round2Score, 2400000)
      : defaults.round2Score,
    parameterBonusLevels: {
      vo: bounded(input.parameterBonusLevels.vo, 5),
      da: bounded(input.parameterBonusLevels.da, 5),
      vi: bounded(input.parameterBonusLevels.vi, 5),
    },
    selectionExams: defaults.selectionExams.map((fallback, i) => {
      const exam = normalizeHifSelectionExamConfig(input.selectionExams[i] ?? fallback)
      if (i === 2) exam.deletedBasicCardIds = []
      return exam
    }),
    carryoverSkillCards: defaults.carryoverSkillCards.map((fallback, i) => {
      const card = input.carryoverSkillCards?.[i] ?? fallback
      return {
        enabled: card.enabled === true,
        acquireOnDayOne: card.acquireOnDayOne !== false,
        category: card.category === 'mental' ? 'mental' : 'active',
        skillKind:
          card.skillKind === 'type_a' || card.skillKind === 'type_b' || card.skillKind === 'type_a_b'
            ? card.skillKind
            : 'other',
        preservation: card.preservation === true,
        energy: card.energy === true,
        rarity: card.rarity === 'SR' || card.rarity === 'SSR' ? card.rarity : 'R',
        ...(typeof card.upgraded === 'boolean' ? { upgraded: card.upgraded } : {}),
      }
    }),
    lessons: defaults.lessons.map((fallback, i) => {
      const lesson = input.lessons[i] ?? fallback
      let param = lesson.param === null || isParam(lesson.param) ? lesson.param : fallback.param
      let subParam =
        lesson.subParam === null || isParam(lesson.subParam) ? lesson.subParam : fallback.subParam
      if (param === null && subParam !== null) {
        param = subParam
        subParam = null
      }
      if (param !== null && subParam === param) subParam = param === 'vocal' ? 'dance' : 'vocal'
      return { ...lesson, param, subParam, type: lesson.type === 'sp' ? 'sp' : 'normal' }
    }),
    classes: defaults.classes.map((fallback, i) => {
      const entry = input.classes[i] ?? fallback
      return { ...entry, param: isParam(entry.param) ? entry.param : fallback.param }
    }),
  }
}

export function getVersionDefaults(idolId: string, versionId: string, stage = MAX_TALENT_STAGE) {
  const fallbackIdol = IDOLS[0]
  const fallbackVersion = fallbackIdol.versions[0]
  const version = findIdolVersion(idolId, versionId) ?? fallbackVersion

  const { idolBaseStats, idolLessonBonus } = getIdolProgression(version, stage)
  return { idolBaseStats, idolLessonBonus }
}

export function replaceDeckCard(deck: DeckCard[], slot: number, deckCard: DeckCard): DeckCard[] {
  const nextDeck = [...deck]
  nextDeck[slot] = deckCard
  return nextDeck
}
