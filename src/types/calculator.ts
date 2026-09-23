import type { EventCounts } from './produce'
import type { StatValues } from './produce'
import type { AbilityStat } from './support-ability'

/**
 * 計算機への入力
 */
export interface CalculatorInput {
  /** デッキ (最大6枚) */
  deck: DeckInput[]
  /** プロデュース設定 */
  config: import('./produce').ProduceConfig
}

/** 計算用デッキカード入力 */
export interface DeckInput {
  cardId: string
  level: number
  isRental: boolean
}

/**
 * 各サポカの寄与内訳
 */
export interface SkillContribution {
  skillId: string
  skillName: string
  skillDescription: string
  gain: StatValues
  total: number
  /** LB・パラメータボーナスによる寄与（gain に含まれる、端数処理前の値）。 */
  lessonBonusGain?: StatValues
}

export interface ContributionBadge {
  key: string
  label: string
  className?: string
}

export interface ContributionBreakdown {
  key: string
  label: string
  className?: string
  stat: AbilityStat
  triggerCount: number
  totalValueText: string
}

export interface CardContribution {
  cardId: string
  cardName: string
  effectBreakdowns: ContributionBreakdown[]
  /** 各 skill ごとの寄与 */
  skillContributions: SkillContribution[]
  /** 合計寄与 */
  total: { vo: number; da: number; vi: number }
}

export interface AbilityCoverageEntry {
  cardId: string
  cardName: string
  skillId: string
  skillDescription: string
  status: 'calculated' | 'irrelevant' | 'unsupported'
  reason?: string
}

export interface StatSourceBreakdown {
  initial: StatValues
  lesson: StatValues
  class: StatValues
  exam: StatValues
}

/**
 * 計算結果
 */
export interface CalculatorResult {
  simulation?: {
    complete: boolean
    triggerCounts: Record<string, number>
    finalState: ProduceStateSnapshot
    steps: {
      id: string
      label: string
      action: string
      lessonType?: 'normal' | 'sp'
      stats: StatValues
      gain: StatValues
      state: ProduceStateSnapshot
      /** この日程で発生したカード別の理論寄与（切り捨て・上限適用前） */
      contributions: CardContribution[]
    }[]
  }
  statCap?: number
  /** 最終Vo/Da/Vi (上限適用後) */
  finalStats: { vo: number; da: number; vi: number }
  /** 各サポカの寄与内訳 */
  contributions: CardContribution[]
  /** 編成中アビリティの計算対応状況 */
  abilityCoverage: AbilityCoverageEntry[]
  /** デッキ全体の属性別SP発生率 */
  totalSpRateByStat: StatValues
  /** デッキ全体の属性別サポカレッスンボーナス */
  totalSupportLessonBonusByStat: StatValues
  /** 計算に使った最終的な属性別レッスンボーナス */
  totalLessonBonusByStat: StatValues
  /** 獲得元別のステータス内訳 */
  statSourceBreakdown: StatSourceBreakdown
  /** 実際に使用したイベント回数 (期待値 or 手動入力) */
  eventCounts: EventCounts
  /** 評価値の内訳 */
  evaluation?: EvaluationBreakdown
}

export interface ProduceSkillCardState {
  id: string
  name: string
  source:
    | 'idol'
    | 'basic'
    | 'memory'
    | 'support'
    | 'consultation'
    | 'supply'
    | 'outing'
    | 'interval'
    | 'class'
    | 'changed'
    | 'custom_item'
  rarity?: 'SSR' | 'SR' | 'R'
  category?: 'active' | 'mental'
  effectTags: Array<'energy' | 'motivation' | 'goodImpression' | 'goodCondition' | 'preservation' | 'concentration' | 'fullPower' | 'aggressive'>
  upgraded: boolean
}

export interface ProduceStateSnapshot {
  /** 現在のスター性。 */
  starPower: number
  /** H.I.Fワッペンが反応したスキルカード獲得回数（最大20回）。 */
  hifBadgeTriggerCount: number
  pDrinkCount: number
  /** カスタムPアイテムによる体力回復の記載値累計。体力消費・上限は未計算。 */
  customPItemStaminaRecovery: number
  skillCardCustomCount: number
  skillCardChangeCount: number
  pItems: string[]
  skillCards: ProduceSkillCardState[]
}

/**
 * 評価値の内訳
 * H.I.F.評価値の内訳
 */
export interface EvaluationBreakdown {
  starPowerScore?: number
  round1Score?: number
  round2Score?: number
  /** ステータス合計からの評価値 */
  statsScore: number
  /** 評価値合計 */
  total: number
}
