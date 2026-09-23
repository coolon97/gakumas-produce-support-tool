import type { IdolPlan } from './produce'

/** Wikiの「おすすめ効果」を表す、スキルカード効果タグとは独立した値。 */
export type IdolRecommendedEffect =
  | 'goodCondition'
  | 'concentration'
  | 'goodImpression'
  | 'motivation'
  | 'aggressive'
  | 'preservation'
  | 'fullPower'

export interface IdolVersion {
  id: string
  name: string
  plan: IdolPlan
  recommendedEffect: IdolRecommendedEffect
  baseStats: {
    vo: number
    da: number
    vi: number
  }
  /** H.I.F True Endで加算され、baseStatsに含まれている初期パラメータ。 */
  hifTrueStats?: { vo: number; da: number; vi: number }
  lessonBonus: {
    vo: number
    da: number
    vi: number
  }
  /** H.I.F True Endで加算され、lessonBonusに含まれているパラメータボーナス。 */
  hifTrueLessonBonus?: { vo: number; da: number; vi: number }
  rarity?: 'SSR' | 'SR' | 'R'
  /** 一覧の最大値に含まれる才能開花3段階の差分。 */
  talentLessonBonus?: { vo: number; da: number; vi: number }
  /** 特訓最大時と才能開花1段階のSPレッスン発生率。 */
  trainingSpRate?: { vo: number; da: number; vi: number }
  talentSpRate?: { vo: number; da: number; vi: number }
  /** 更新スクリプトだけで使う出典。公開用データからは取り除く。 */
  sourceUrl?: string
  releaseDate?: string
}

export interface IdolData {
  id: string
  firstName: string
  lastName: string
  versions: IdolVersion[]
}
