/** プロデュース対象アイドルのプラン */
export type IdolPlan = 'sense' | 'logic' | 'anomaly'

export type LessonParameter = 'vocal' | 'dance' | 'visual'

/**
 * プロデュース中に発生するイベントの回数
 * 期待値モードでは計算した期待値が入り、
 * 手動モードではユーザーが入力した値が入る
 */
export interface EventCounts {
  /** 通常レッスン回数 */
  normalLessons: number
  /** SPレッスン回数 */
  spLessons: number
  /** サポートイベント発生回数 */
  supportEvents: number
  /** 試験 (中間・最終) 回数 */
  exams: number
}

export type EventTriggerCounts = Record<string, number>

export interface HifLessonConfig {
  type: 'normal' | 'sp'
  enabled: boolean
  param: LessonParameter | null
  subParam: LessonParameter | null
}

export interface HifSelectionExamConfig {
  useScoreCap: boolean
  totalScore: number
  /** Vo/Da境界とDa/Vi境界の位置（0〜100%） */
  vocalBoundary: number
  visualBoundary: number
  /** 試験終了時に所持状態から削除する基本カード（最大2枚）。 */
  deletedBasicCardIds?: string[]
}

export interface HifConfig {
  schedule?: import('./hif-schedule').HifScheduleConfig
  lessons: HifLessonConfig[]
  classes: { enabled: boolean; param: LessonParameter }[]
  /** 選抜試験3回の合計スコアと属性配分 */
  selectionExams: HifSelectionExamConfig[]
  parameterBonusLevels: StatValues
  spBonusLevel: number
  capBonusLevel: number
  /** 持ち込みスキルカード。4枠のうち enabled のカードだけ獲得する。 */
  carryoverSkillCards: import('./hif-schedule').HifCarryoverSkillCard[]
  /** 親愛度37で解放される、すべてのスター性獲得量+50%。 */
  starPowerAffinityBonus: boolean
  starPower: number
  round1Score: number
  round2Score: number
  includePItems: boolean
}

export interface StatValues {
  vo: number
  da: number
  vi: number
}

/**
 * プロデュース設定
 * ユーザーが画面で選ぶ設定
 */
export interface ProduceConfig {
  /** 対象アイドル */
  idolId: string
  /** 対象アイドルのバージョン (衣装など) */
  idolVersionId: string
  /** 才能開花0〜4段階（特訓・True Endは最大値を使用）。 */
  idolTalentStage: number
  /** 理論値計算に使うアイドル基礎ステータス */
  idolBaseStats: StatValues
  /** メモリー由来の追加基礎ステータス */
  memoryBaseStats: StatValues
  /** 理論値計算に使うアイドル属性別レッスンボーナス */
  idolLessonBonus: StatValues
  /** メモリー由来の追加レッスンボーナス */
  memoryLessonBonus: StatValues
  /** サポートアビリティの発動契機ごとの回数設定 */
  eventTriggerCounts?: EventTriggerCounts
  /** デッキスロットごとの後イベ発生有無 */
  postEventEnabledSlots?: boolean[]
  hif: HifConfig
}
