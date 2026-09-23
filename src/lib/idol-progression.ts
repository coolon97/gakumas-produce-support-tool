import type { IdolVersion } from '@/types/idol'
import type { StatValues } from '@/types/produce'
import { addStatValues, ZERO_STAT_VALUES } from '@/lib/stats'

export const MAX_TALENT_STAGE = 4
export function normalizeTalentStage(stage: number): number {
  return Number.isFinite(stage)
    ? Math.min(MAX_TALENT_STAGE, Math.max(0, Math.floor(stage)))
    : MAX_TALENT_STAGE
}

/** 特訓・True Endは最大。才能開花のみユーザーの選択段階で評価する。 */
export function getIdolProgression(version: IdolVersion, stage = MAX_TALENT_STAGE) {
  const talentStage = normalizeTalentStage(stage)
  const difference = talentStage < 3 ? (version.talentLessonBonus ?? ZERO_STAT_VALUES) : ZERO_STAT_VALUES
  const idolLessonBonus: StatValues = {
    vo: Math.max(0, version.lessonBonus.vo - difference.vo),
    da: Math.max(0, version.lessonBonus.da - difference.da),
    vi: Math.max(0, version.lessonBonus.vi - difference.vi),
  }
  return {
    idolBaseStats: { ...version.baseStats },
    idolLessonBonus,
    idolSpRate: addStatValues(
      version.trainingSpRate ?? ZERO_STAT_VALUES,
      talentStage >= 1 ? (version.talentSpRate ?? ZERO_STAT_VALUES) : ZERO_STAT_VALUES,
    ),
  }
}
