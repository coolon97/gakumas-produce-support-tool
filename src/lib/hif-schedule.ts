import { HIF_SCHEDULE, HIF_SCHEDULE_COLUMNS, createDefaultHifSchedule } from '@/data/hif-schedule'
import type { HifConfig } from '@/types/produce'
import type {
  HifClassSkillCardSelection,
  HifConsultationSkillAction,
  HifCustomPItemColor,
  HifCustomPItemDecoration,
  HifCustomPItemMascot,
  HifIntervalSkillAction,
  HifOutingSettings,
  HifScheduleConfig,
  HifScheduleStep,
  HifSkillCardSelection,
  HifSupportEventSelection,
} from '@/types/hif-schedule'
import {
  CUSTOM_P_ITEM_COLORS,
  CUSTOM_P_ITEM_DECORATIONS,
  CUSTOM_P_ITEM_MASCOTS,
  getCustomPItemDecorations,
} from '@/data/hif-custom-p-items'

const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const param = (v: unknown) => v === 'vocal' || v === 'dance' || v === 'visual'
const skillCardSelection = (value: unknown): HifSkillCardSelection | null => {
  const action = record(value)
  const skillKind =
    action.skillKind === 'type_a' ||
    action.skillKind === 'type_b' ||
    action.skillKind === 'type_a_b' ||
    action.skillKind === 'other'
      ? action.skillKind
      : null
  const rarity =
    action.rarity === 'R' || action.rarity === 'SR' || action.rarity === 'SSR' ? action.rarity : null
  const category = action.category === 'mental' ? 'mental' : 'active'
  return skillKind && rarity
    ? {
        category,
        skillKind,
        preservation: action.preservation === true,
        energy: action.energy === true,
        rarity,
        ...(typeof action.upgraded === 'boolean' ? { upgraded: action.upgraded } : {}),
      }
    : null
}
const consultationAction = (value: unknown): HifConsultationSkillAction | null => {
  const action = record(value)
  const kind =
    action.kind === 'gain' || action.kind === 'upgrade' || action.kind === 'delete' ? action.kind : null
  const selection = skillCardSelection(action)
  return kind && selection
    ? {
        kind,
        ...selection,
        ...(kind !== 'gain' && typeof action.targetCardId === 'string' && action.targetCardId.length < 200
          ? { targetCardId: action.targetCardId }
          : {}),
      }
    : null
}
const intervalAction = (value: unknown): HifIntervalSkillAction | null => {
  const action = record(value)
  const kind =
    action.kind === 'gain' || action.kind === 'upgrade' || action.kind === 'change' ? action.kind : null
  const selection = skillCardSelection(action)
  return kind && selection
    ? {
        kind,
        ...selection,
        ...(kind !== 'gain' && typeof action.targetCardId === 'string' && action.targetCardId.length < 200
          ? { targetCardId: action.targetCardId }
          : {}),
        ...(kind === 'change' && action.resultCard !== undefined
          ? { resultCard: skillCardSelection(action.resultCard) }
          : {}),
      }
    : null
}
const nonNegativeInteger = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}
export const getHifConsultationDrinkLimit = (resetUsed: boolean): number => (resetUsed ? 8 : 4)
export function normalizeHifConsultationDrinkCount(value: unknown, resetUsed: boolean): number {
  return Math.min(getHifConsultationDrinkLimit(resetUsed), nonNegativeInteger(value))
}
const classSkillCardSelection = (value: unknown): HifClassSkillCardSelection | null => {
  const selection = record(value)
  const base = skillCardSelection({
    ...selection,
    rarity: selection.rarity === 'basic_name' ? 'R' : selection.rarity,
  })
  if (!base) return null
  return { ...base, rarity: selection.rarity === 'basic_name' ? 'basic_name' : base.rarity }
}
const supportEventSelection = (value: unknown): HifSupportEventSelection | null => {
  const selection = record(value)
  if (
    !Number.isInteger(selection.slot) ||
    Number(selection.slot) < 0 ||
    Number(selection.slot) >= 6 ||
    !Number.isInteger(selection.eventIndex) ||
    Number(selection.eventIndex) < 0 ||
    Number(selection.eventIndex) >= 10
  )
    return null
  return {
    slot: Number(selection.slot),
    eventIndex: Number(selection.eventIndex),
    ...(typeof selection.targetCardId === 'string' && selection.targetCardId.length < 200
      ? { targetCardId: selection.targetCardId }
      : {}),
    ...(selection.resultCard !== undefined ? { resultCard: skillCardSelection(selection.resultCard) } : {}),
  }
}
/** 入力を現行のスケジュール形式に正規化する。 */
export function normalizeHifSchedule(input: unknown): HifScheduleConfig {
  const defaults = createDefaultHifSchedule()
  const value = record(input)
  const saved = Array.isArray(value.steps) ? value.steps : []
  const slots = (v: unknown) =>
    Array.isArray(v)
      ? ([...new Set(v.filter((n) => Number.isInteger(n) && n >= 0 && n < 6))] as number[])
      : []
  const simpleValue = record(value.simpleEvents)
  const simpleFrontSlots = slots(simpleValue.frontSlots)
  const savedFrontCards = record(simpleValue.frontSkillCards)
  const frontSkillCards = Object.fromEntries(
    simpleFrontSlots.flatMap((slot) => {
      const selection = skillCardSelection(savedFrontCards[slot])
      return selection ? [[slot, selection]] : []
    }),
  ) as Record<number, HifSkillCardSelection>
  const customValue = record(value.customPItem)
  const color = CUSTOM_P_ITEM_COLORS.includes(customValue.color as HifCustomPItemColor)
    ? (customValue.color as HifCustomPItemColor)
    : null
  const mascot =
    color && CUSTOM_P_ITEM_MASCOTS[color].includes(customValue.mascot as HifCustomPItemMascot)
      ? (customValue.mascot as HifCustomPItemMascot)
      : null
  const decoration =
    color &&
    mascot &&
    CUSTOM_P_ITEM_DECORATIONS.includes(customValue.decoration as HifCustomPItemDecoration) &&
    getCustomPItemDecorations(color, mascot).includes(customValue.decoration as HifCustomPItemDecoration)
      ? (customValue.decoration as HifCustomPItemDecoration)
      : null
  const simpleAfter = (Array.isArray(simpleValue.afterSelections) ? simpleValue.afterSelections : [])
    .flatMap((item) => {
      const selection = supportEventSelection(item)
      return selection ? [selection] : []
    })
    .filter(
      (selection, index, all) =>
        all.findIndex((item) => item.slot === selection.slot && item.eventIndex === selection.eventIndex) ===
        index,
    )
  let resetSeen = false
  const steps: HifScheduleStep[] = defaults.steps.map((fallback, index): HifScheduleStep => {
    const step = record(saved[index])
    const action = HIF_SCHEDULE[index].actions.find((a) => a === step.action) ?? null
    const main = param(step.param) ? (step.param as HifScheduleStep['param']) : fallback.param
    const sub =
      step.subParam === null
        ? null
        : param(step.subParam) && step.subParam !== main
          ? (step.subParam as HifScheduleStep['param'])
          : main === 'vocal'
            ? 'dance'
            : 'vocal'
    const postEventSelection = supportEventSelection(step.postEventSelection)
    const frontSlots = slots(step.pItemSlots).slice(0, 1)
    const frontSkillCard = frontSlots.length ? skillCardSelection(step.frontSkillCard) : null
    const consultation = record(step.consultation)
    const requestedReset = consultation.resetUsed === true
    const resetUsed = requestedReset && !resetSeen
    if (resetUsed) resetSeen = true
    const actionLimits = { upgrade: resetUsed ? 2 : 1, delete: resetUsed ? 2 : 1 }
    const actionCounts = { upgrade: 0, delete: 0 }
    const skillActions = (Array.isArray(consultation.skillActions) ? consultation.skillActions : [])
      .flatMap((item) => {
        const normalized = consultationAction(item)
        if (!normalized) return []
        if (normalized.kind === 'upgrade' || normalized.kind === 'delete') {
          if (actionCounts[normalized.kind] >= actionLimits[normalized.kind]) return []
          actionCounts[normalized.kind]++
        }
        return [normalized]
      })
      .slice(0, 100)
    const supplySkillCard = skillCardSelection(step.supplySkillCard) ?? fallback.supplySkillCard
    const customCard = record(step.customPItemCard)
    const customPItemCard = {
      targetCardId:
        typeof customCard.targetCardId === 'string' && customCard.targetCardId.length < 200
          ? customCard.targetCardId
          : null,
      resultCard: skillCardSelection(customCard.resultCard),
    }
    const classValue = record(step.classSettings)
    const classIndex = HIF_SCHEDULE[index].classIndex
    const allowedClassActions =
      classIndex !== undefined && classIndex < 2 ? ['gain', 'change_sleepy'] : ['change', 'change_sleepy']
    const classAction = allowedClassActions.includes(String(classValue.action))
      ? (classValue.action as HifScheduleStep['classSettings']['action'])
      : fallback.classSettings.action
    const normalizedClassSelection =
      classSkillCardSelection(classValue.selection) ?? fallback.classSettings.selection
    const classSettings = {
      action: classAction,
      selection:
        classAction === 'gain'
          ? {
              ...normalizedClassSelection,
              rarity:
                normalizedClassSelection.rarity === 'basic_name'
                  ? ('R' as const)
                  : normalizedClassSelection.rarity,
              upgraded: false,
            }
          : normalizedClassSelection,
      ...(classAction !== 'gain' &&
      typeof classValue.targetCardId === 'string' &&
      classValue.targetCardId.length < 200
        ? { targetCardId: classValue.targetCardId }
        : {}),
      ...(classAction !== 'gain' && classValue.resultCard !== undefined
        ? { resultCard: skillCardSelection(classValue.resultCard) }
        : {}),
    }
    const trainingCustomCount =
      step.trainingCustomCount === 1 || step.trainingCustomCount === 2 ? step.trainingCustomCount : 0
    const intervalValue = record(step.interval)
    const intervalSkillActions = (
      Array.isArray(intervalValue.skillActions) ? intervalValue.skillActions : []
    ).flatMap((item) => {
      const normalized = intervalAction(item)
      return normalized ? [normalized] : []
    })
    const interval = {
      pDrinkCount: nonNegativeInteger(intervalValue.pDrinkCount),
      skillActions: intervalSkillActions,
      skillCardCustomCount: nonNegativeInteger(intervalValue.skillCardCustomCount),
    }
    const outingValue = record(step.outing)
    const outingCards = Array.isArray(outingValue.skillCards) ? outingValue.skillCards : []
    const outing: HifOutingSettings = {
      reward:
        outingValue.reward === 'two_cards_sleepy' || outingValue.reward === 'one_card'
          ? outingValue.reward
          : 'two_cards',
      skillCards: [skillCardSelection(outingCards[0]), skillCardSelection(outingCards[1])],
    }
    return {
      action,
      param: main,
      subParam: sub,
      lessonType: step.lessonType === 'sp' ? 'sp' : 'normal',
      pItemSlots: frontSlots,
      postEventSelection,
      ...(frontSkillCard ? { frontSkillCard } : {}),
      consultation: {
        pDrinkCount: normalizeHifConsultationDrinkCount(consultation.pDrinkCount, resetUsed),
        skillActions,
        resetUsed,
      },
      supplySkillCard,
      customPItemCard,
      classSettings,
      trainingCustomCount,
      interval,
      outing,
    }
  })
  return {
    eventMode: value.eventMode === 'simple' ? 'simple' : 'detailed',
    supportEventSkillCardsUpgraded: value.supportEventSkillCardsUpgraded !== false,
    simpleEvents: {
      frontSlots: simpleFrontSlots,
      afterSelections: simpleAfter,
      ...(Object.keys(frontSkillCards).length ? { frontSkillCards } : {}),
    },
    customPItem: { color, mascot, decoration },
    steps,
  }
}

/** Keeps detailed day assignments intact and imports their selected events into simple mode. */
export function setHifEventMode(
  schedule: HifScheduleConfig,
  eventMode: 'simple' | 'detailed',
): HifScheduleConfig {
  if (eventMode === 'detailed') return { ...schedule, eventMode }
  const frontSlots = new Set(schedule.simpleEvents.frontSlots)
  const frontSkillCards = { ...schedule.simpleEvents.frontSkillCards }
  const afterSelections: HifSupportEventSelection[] = [...schedule.simpleEvents.afterSelections]
  schedule.steps.forEach((step) => {
    step.pItemSlots.forEach((slot) => {
      if (step.frontSkillCard && !frontSkillCards[slot]) frontSkillCards[slot] = step.frontSkillCard
      frontSlots.add(slot)
    })
    const selection = step.postEventSelection
    if (
      selection &&
      !afterSelections.some(
        (item) => item.slot === selection.slot && item.eventIndex === selection.eventIndex,
      )
    )
      afterSelections.push({ ...selection })
  })
  return {
    ...schedule,
    eventMode,
    simpleEvents: {
      frontSlots: [...frontSlots],
      afterSelections,
      ...(Object.keys(frontSkillCards).length ? { frontSkillCards } : {}),
    },
  }
}
export function getHifScheduleProgress(schedule: HifScheduleConfig): number {
  const next = HIF_SCHEDULE.findIndex((day, index) => {
    const step = schedule.steps[index]
    return (
      !step ||
      !day.actions.includes(step.action!) ||
      (step.action === 'lesson' && (!step.subParam || step.subParam === step.param)) ||
      (step.action === 'outing' &&
        step.outing.skillCards.slice(0, step.outing.reward === 'one_card' ? 1 : 2).some((card) => !card))
    )
  })
  const dayProgress = next < 0 ? HIF_SCHEDULE.length : next
  if (dayProgress >= 7 && !schedule.customPItem.color) return 7
  if (dayProgress >= 13 && !schedule.customPItem.mascot) return 13
  if (dayProgress >= 20 && !schedule.customPItem.decoration) return 20
  return dayProgress
}

/** The pseudo-step after an exam owns focus until its custom P item choice is made. */
export function getPendingHifCustomPItemStage(schedule: HifScheduleConfig): 1 | 2 | 3 | null {
  const progress = getHifScheduleProgress(schedule)
  if (progress === 7 && !schedule.customPItem.color) return 1
  if (progress === 13 && !schedule.customPItem.mascot) return 2
  if (progress === 20 && !schedule.customPItem.decoration) return 3
  return null
}

export function getHifScheduleColumnIndex(progress: number): number {
  if (progress >= HIF_SCHEDULE.length) return HIF_SCHEDULE_COLUMNS.length - 1
  return Math.max(
    0,
    HIF_SCHEDULE_COLUMNS.findIndex((column) => progress >= column.from && progress < column.to),
  )
}

/** Follow the active column in complete pages, matching the two-column arrow buttons. */
export function getHifScheduleWindowStart(
  activeColumn: number,
  currentStart: number,
  visibleColumns = 2,
): number {
  const maxStart = Math.max(0, HIF_SCHEDULE_COLUMNS.length - visibleColumns)
  const start = Math.max(0, Math.min(maxStart, currentStart))
  if (start % visibleColumns === 0 && activeColumn >= start && activeColumn < start + visibleColumns)
    return start
  return Math.min(maxStart, Math.floor(Math.max(0, activeColumn) / visibleColumns) * visibleColumns)
}
/** Keeps shared lesson/class settings (including the card-sort defaults) aligned with the selected route. */
export function syncHifSchedule(hif: HifConfig, schedule: HifScheduleConfig): HifConfig {
  const lessons = hif.lessons.map((l) => ({ ...l }))
  const classes = hif.classes.map((c) => ({ ...c }))
  HIF_SCHEDULE.forEach((day, index) => {
    const step = schedule.steps[index]
    if (day.lessonIndex !== undefined)
      lessons[day.lessonIndex] = {
        enabled: step.action === 'lesson',
        type: step.lessonType,
        param: step.param,
        subParam: step.subParam,
      }
    if (day.classIndex !== undefined)
      classes[day.classIndex] = { enabled: step.action === 'class', param: step.param }
  })
  return { ...hif, lessons, classes, schedule }
}
