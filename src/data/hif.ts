import type { HifConfig } from '@/types/produce'
import { createDefaultHifSchedule } from './hif-schedule'

/** 公開Wikiの公開レッスン・授業欄。https://seesaawiki.jp/gakumasu/d/H.I.F#schedule_com */
export const HIF_LESSON_SCHEDULE = [
  { label: '選抜2日目', starFocused: true, normal: { main: 50, sub: 10 }, sp: { main: 60, sub: 20 } },
  { label: '選抜4日目', starFocused: false, normal: { main: 60, sub: 20 }, sp: { main: 80, sub: 50 } },
  { label: '選抜9日目', starFocused: true, normal: { main: 70, sub: 10 }, sp: { main: 80, sub: 20 } },
  { label: '選抜11日目', starFocused: false, normal: { main: 80, sub: 30 }, sp: { main: 100, sub: 60 } },
  { label: '選抜15日目', starFocused: true, normal: { main: 90, sub: 10 }, sp: { main: 100, sub: 20 } },
  { label: '選抜18日目', starFocused: false, normal: { main: 100, sub: 40 }, sp: { main: 120, sub: 70 } },
  { label: '本戦2日目', starFocused: true, normal: { main: 110, sub: 10 }, sp: { main: 120, sub: 20 } },
  { label: '本戦5日目', starFocused: false, normal: { main: 120, sub: 50 }, sp: { main: 140, sub: 80 } },
] as const

export function getHifLessonStarPower(index: number, lessonType: 'normal' | 'sp'): number {
  const lesson = HIF_LESSON_SCHEDULE[index]
  if (!lesson) return 0
  if (lesson.starFocused) return lessonType === 'sp' ? 30 : 20
  return lessonType === 'sp' ? 10 : 5
}

export const HIF_STAR_POWER_AFFINITY_MULTIPLIER = 1.5
export const HIF_STAR_POWER_CAP = 1335

/** 親愛度ボーナスを獲得単位で適用し、ゲーム内で扱える整数へ切り捨てる。 */
export function getHifAdjustedStarPower(base: number, affinityBonusEnabled: boolean): number {
  return Math.floor(Math.max(0, base) * (affinityBonusEnabled ? HIF_STAR_POWER_AFFINITY_MULTIPLIER : 1))
}

export const HIF_CLASS_SCHEDULE = [
  { label: '選抜3日目', gain: 120 },
  { label: '選抜6日目', gain: 120 },
  { label: '選抜10日目', gain: 150 },
  { label: '選抜17日目', gain: 150 },
  { label: '本戦1日目', gain: 180 },
  { label: '本戦4日目', gain: 180 },
] as const

export const HIF_CAP_BONUSES = [0, 50, 80, 110, 140, 170, 200] as const

export function createDefaultHifConfig(): HifConfig {
  return {
    schedule: createDefaultHifSchedule(),
    lessons: HIF_LESSON_SCHEDULE.map(() => ({
      enabled: true,
      type: 'normal',
      param: 'vocal',
      subParam: 'dance',
    })),
    classes: HIF_CLASS_SCHEDULE.map(() => ({ enabled: true, param: 'vocal' })),
    selectionExams: Array.from({ length: 3 }, () => ({
      useScoreCap: true,
      totalScore: 0,
      vocalBoundary: 33,
      visualBoundary: 67,
      deletedBasicCardIds: [],
    })),
    parameterBonusLevels: { vo: 5, da: 5, vi: 5 },
    carryoverSkillCards: Array.from({ length: 4 }, () => ({
      enabled: false,
      acquireOnDayOne: true,
      category: 'active' as const,
      skillKind: 'other' as const,
      preservation: false,
      energy: false,
      rarity: 'R' as const,
    })),
    spBonusLevel: 5,
    capBonusLevel: 6,
    starPowerAffinityBonus: true,
    starPower: 0,
    round1Score: 1400000,
    round2Score: 2400000,
    includePItems: false,
  }
}
