import type { HifScheduleAction, HifScheduleConfig } from '@/types/hif-schedule'

/** Public Wiki, verified 2026-09-18: https://seesaawiki.jp/gakumasu/d/H.I.F#schedule_com */
export interface HifScheduleDay {
  id: string
  phase: 'selection' | 'final'
  day: number
  label: string
  actions: readonly HifScheduleAction[]
  lessonIndex?: number
  classIndex?: number
  examIndex?: number
}
const selection = (
  day: number,
  actions: HifScheduleAction[],
  indexes: Partial<HifScheduleDay> = {},
): HifScheduleDay => ({
  id: `selection-${day}`,
  phase: 'selection',
  day,
  label: `選抜${day}日目`,
  actions: [...actions, ...(actions[0] === 'exam' ? [] : ['rest' as const])],
  ...indexes,
})
const final = (
  day: number,
  actions: HifScheduleAction[],
  indexes: Partial<HifScheduleDay> = {},
): HifScheduleDay => ({
  id: `final-${day}`,
  phase: 'final',
  day,
  label: `本戦${day}日目`,
  actions: [...actions, 'rest'],
  ...indexes,
})
export const HIF_SCHEDULE: readonly HifScheduleDay[] = [
  selection(1, ['consultation', 'supply', 'training']),
  selection(2, ['lesson'], { lessonIndex: 0 }),
  selection(3, ['class'], { classIndex: 0 }),
  selection(4, ['lesson'], { lessonIndex: 1 }),
  selection(5, ['outing', 'consultation']),
  selection(6, ['class'], { classIndex: 1 }),
  selection(7, ['exam'], { examIndex: 0 }),
  selection(8, ['outing', 'supply']),
  selection(9, ['lesson'], { lessonIndex: 2 }),
  selection(10, ['class'], { classIndex: 2 }),
  selection(11, ['lesson'], { lessonIndex: 3 }),
  selection(12, ['consultation', 'training']),
  selection(13, ['exam'], { examIndex: 1 }),
  selection(14, ['outing', 'supply']),
  selection(15, ['lesson'], { lessonIndex: 4 }),
  selection(16, ['outing', 'consultation', 'supply']),
  selection(17, ['class'], { classIndex: 3 }),
  selection(18, ['lesson'], { lessonIndex: 5 }),
  selection(19, ['consultation', 'training']),
  selection(20, ['exam'], { examIndex: 2 }),
  final(1, ['class'], { classIndex: 4 }),
  final(2, ['lesson'], { lessonIndex: 6 }),
  final(3, ['outing', 'supply']),
  final(4, ['class'], { classIndex: 5 }),
  final(5, ['lesson'], { lessonIndex: 7 }),
  final(6, ['consultation']),
  { id: 'round1', phase: 'final', day: 7, label: '本戦当日 ラウンド1', actions: ['round1'] },
  { id: 'interval', phase: 'final', day: 7, label: '本戦当日 インターバル', actions: ['interval'] },
  { id: 'round2', phase: 'final', day: 7, label: '本戦当日 ラウンド2', actions: ['round2'] },
]
export const HIF_SCHEDULE_COLUMNS = [
  { label: '選抜 1〜7日', from: 0, to: 7 },
  { label: '選抜 8〜13日', from: 7, to: 13 },
  { label: '選抜 14〜20日', from: 13, to: 20 },
  { label: '本戦', from: 20, to: 29 },
] as const
export const HIF_ACTION_LABELS: Record<HifScheduleAction, string> = {
  lesson: '公開レッスン',
  class: '授業',
  outing: 'おでかけ',
  consultation: '相談',
  supply: '差し入れ',
  training: '特別指導',
  rest: '休む',
  exam: '選抜試験',
  round1: 'ラウンド1',
  interval: 'インターバル',
  round2: 'ラウンド2',
}
export function createDefaultHifSchedule(): HifScheduleConfig {
  return {
    eventMode: 'detailed',
    supportEventSkillCardsUpgraded: true,
    simpleEvents: { frontSlots: [], afterSelections: [] },
    customPItem: { color: null, mascot: null, decoration: null },
    steps: HIF_SCHEDULE.map((day) => ({
      action: null,
      param: 'vocal',
      subParam: 'dance',
      lessonType: 'normal',
      pItemSlots: [],
      postEventSelection: null,
      consultation: { pDrinkCount: 0, skillActions: [], resetUsed: false },
      supplySkillCard: {
        category: 'active',
        skillKind: 'other',
        preservation: false,
        energy: false,
        rarity: 'R',
      },
      customPItemCard: { targetCardId: null, resultCard: null },
      classSettings: {
        action: (day.classIndex ?? Infinity) < 2 ? 'gain' : 'change',
        selection: {
          category: 'active',
          skillKind: 'other',
          preservation: false,
          energy: false,
          rarity: 'R',
        },
      },
      trainingCustomCount: 0,
      interval: { pDrinkCount: 0, skillActions: [], skillCardCustomCount: 0 },
      outing: { reward: 'two_cards', skillCards: [null, null] },
    })),
  }
}
