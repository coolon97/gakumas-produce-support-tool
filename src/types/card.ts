import type { SupportAbilitySpec } from './support-ability'

/** サポートカードのタイプ */
export type CardType = 'vocal' | 'dance' | 'visual' | 'assist'

/** カードレアリティ */
export type CardRarity = 'R' | 'SR' | 'SSR'

/**
 * サポートカードの個別スキル
 * スキルは「条件」と「効果」で構成される
 */
export interface CardSkill {
  /** スキルID (ユニーク識別子) */
  id: string
  /** スキル名 */
  name: string
  /** スキルの説明文 */
  description: string
  /** スキルが解放されるレベル */
  unlockLevel: number
  /** 計算と表示で共通利用する機械可読な効果定義 */
  ability: SupportAbilitySpec
}

export interface SupportEventEntry {
  /** 解放条件の生テキスト */
  unlock: string
  /** サポートイベントの効果 */
  effect: string
  /** 更新スクリプトだけで使う対応コミュ名。公開用データからは取り除く。 */
  commu?: string
}

export interface SupportEventReward {
  /** 報酬種別 */
  kind: 'p_item' | 'skill_card'
  /** 報酬名 */
  name: string
  /** 効果説明 */
  effect: string
  /** 獲得後の日程で発動するPアイテムのV2効果定義 */
  parameterAbility?: SupportAbilitySpec
  /** 獲得スキルカードの条件判定用メタ情報。未指定時は効果文から補完する。 */
  skillCard?: {
    category?: 'active' | 'mental'
    effectTags?: Array<
      'energy' | 'motivation' | 'goodImpression' | 'goodCondition' | 'preservation' | 'concentration' | 'fullPower' | 'aggressive'
    >
  }
  /** スキルカードのレアリティ判定に必要なゲームデータ */
  rarity?: string
  /** 更新スクリプトだけで使う補助情報。公開用データからは取り除く。 */
  plan?: string
  contest?: string
}

/** スキル効果の分類 */
export type SkillEffectType =
  | 'sp_rate' // SP発生率アップ (%)
  | 'lesson_bonus' // レッスンボーナス (%)
  | 'vo_bonus' // Voパラメータボーナス (固定値)
  | 'da_bonus' // Daパラメータボーナス (固定値)
  | 'vi_bonus' // Viパラメータボーナス (固定値)
  | 'initial_vo' // 初期Vo (固定値)
  | 'initial_da' // 初期Da (固定値)
  | 'initial_vi' // 初期Vi (固定値)
  | 'stamina_recovery' // 体力回復
  | 'good_impression' // 好印象付与
  | 'motivation' // やる気付与
  | 'mental_recovery' // メンタル回復
  | 'fan_bonus' // ファン獲得ボーナス (NIAマスター用)
  | 'other' // その他

/**
 * サポートカード本体
 * このインターフェースが手動追加時の基準となる
 */
export interface SupportCard {
  /** カードID (例: "ssr_001") */
  id: string
  /** カード名 */
  name: string
  /** レアリティ */
  rarity: CardRarity
  /** カードタイプ */
  type: CardType
  /** 対象プラン (センス/ロジック/アノマリー/フリー) */
  plan: import('./produce').IdolPlan | 'free'
  /** 最大レベル (レアリティによって異なる) */
  maxLevel: number
  /** 数値が確認できたレベルに限定する場合に指定。省略時は従来の全段階を選択可能 */
  availableLevels?: number[]
  /** スキル一覧 (解放レベル順) */
  skills: CardSkill[]
  /** サポートイベント一覧 */
  supportEvents?: SupportEventEntry[]
  /** サポートイベントで獲得できるPアイテム/スキルカード */
  supportEventRewards?: SupportEventReward[]
  /** カード画像URL (オプション) */
  imageUrl?: string
  /** ゲームへの登場日 (YYYY/MM/DD) */
  releaseDate?: string
  /** 更新スクリプトだけで使う管理情報。公開用データからは取り除く。 */
  source?: 'scraping' | 'manual'
  updatedAt?: string
}

/**
 * デッキ内でのサポートカードの状態
 * (実際にプロデュースで使う設定)
 */
export interface DeckCard {
  card: SupportCard
  /** 現在のレベル */
  level: number
  /** 貸し出しカードかどうか */
  isRental: boolean
}
