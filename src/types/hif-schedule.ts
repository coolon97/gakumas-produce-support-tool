import type { LessonParameter } from './produce'

export type HifScheduleAction =
  | 'lesson'
  | 'class'
  | 'outing'
  | 'consultation'
  | 'supply'
  | 'training'
  | 'rest'
  | 'exam'
  | 'round1'
  | 'interval'
  | 'round2'
export type HifCustomPItemColor = 'red' | 'green' | 'yellow'
export type HifCustomPItemMascot = 'bear' | 'bird' | 'girl' | 'moja' | 'rabbit' | 'robo'
export type HifCustomPItemDecoration = 'flower' | 'ribbon' | 'medal' | 'wing'
export interface HifCustomPItemSelection {
  color: HifCustomPItemColor | null
  mascot: HifCustomPItemMascot | null
  decoration: HifCustomPItemDecoration | null
}
export interface HifSupportEventSelection {
  slot: number
  eventIndex: number
  /** 後イベントの強化・削除・チェンジ対象。 */
  targetCardId?: string | null
  /** チェンジ後のカード属性。 */
  resultCard?: HifSkillCardSelection | null
}
export interface HifSimpleEventSettings {
  /** 「サポートイベント・前」を発生済みとして扱うデッキスロット。 */
  frontSlots: number[]
  /** 前イベントで獲得するスキルカードの指定。キーはデッキスロット。 */
  frontSkillCards?: Record<number, HifSkillCardSelection>
  /** 「サポートイベント・後」を発生済みとして扱うカードとイベント。 */
  afterSelections: HifSupportEventSelection[]
}
export type HifConsultationSkillKind = 'type_a' | 'type_b' | 'type_a_b' | 'other'
export type HifConsultationSkillRarity = 'R' | 'SR' | 'SSR'
export type HifConsultationSkillActionKind = 'gain' | 'upgrade' | 'delete'
export interface HifSkillCardSelection {
  category: 'active' | 'mental'
  skillKind: HifConsultationSkillKind
  /** アノマリーの温存効果。強気・全力とは独立して指定する。 */
  preservation?: boolean
  /** 元気効果は他の効果タグと独立して指定する。 */
  energy: boolean
  rarity: HifConsultationSkillRarity
  /** 獲得時点ですでに強化済みか。 */
  upgraded?: boolean
}
export interface HifCustomPItemCardSettings {
  /** コピー・強化・削除・チェンジの対象。未指定なら暫定選択。 */
  targetCardId: string | null
  /** 獲得・チェンジ後のカード属性。未指定なら詳細不明の仮カード。 */
  resultCard: HifSkillCardSelection | null
}
export interface HifCarryoverSkillCard extends HifSkillCardSelection {
  /** この入力枠を育成へ反映する。 */
  enabled: boolean
  /** true は1日目、false は選抜7日目に獲得する。 */
  acquireOnDayOne: boolean
}
export type HifClassCardAction = 'gain' | 'change' | 'change_sleepy'
export interface HifClassSkillCardSelection extends Omit<HifSkillCardSelection, 'rarity'> {
  rarity: HifConsultationSkillRarity | 'basic_name'
}
export interface HifClassSettings {
  action: HifClassCardAction
  selection: HifClassSkillCardSelection
  /** チェンジ元となる所持カード。 */
  targetCardId?: string | null
  /** チェンジ後のカード。 */
  resultCard?: HifSkillCardSelection | null
}
export interface HifConsultationSkillAction extends HifSkillCardSelection {
  kind: HifConsultationSkillActionKind
  /** 強化・削除する所持カード。 */
  targetCardId?: string | null
}
export interface HifConsultationSettings {
  /** 通常は最大4本、リフレッシュを使った相談だけ最大8本。 */
  pDrinkCount: number
  skillActions: HifConsultationSkillAction[]
  /** この相談で、育成中1度だけの強化・削除回数リセットを使用した。 */
  resetUsed: boolean
}
export type HifIntervalSkillActionKind = 'gain' | 'upgrade' | 'change'
export interface HifIntervalSkillAction extends HifSkillCardSelection {
  kind: HifIntervalSkillActionKind
  /** 強化またはチェンジする所持カード。 */
  targetCardId?: string | null
  /** チェンジ後のカード。 */
  resultCard?: HifSkillCardSelection | null
}
export interface HifIntervalSettings {
  pDrinkCount: number
  skillActions: HifIntervalSkillAction[]
  skillCardCustomCount: number
}
export type HifOutingReward = 'two_cards' | 'two_cards_sleepy' | 'one_card'
export interface HifOutingSettings {
  reward: HifOutingReward
  /** 最大2枚を個別に指定する。1枚獲得を選んだ場合は先頭だけを使用する。 */
  skillCards: [HifSkillCardSelection | null, HifSkillCardSelection | null]
}
export interface HifScheduleStep {
  action: HifScheduleAction | null
  param: LessonParameter
  subParam: LessonParameter | null
  lessonType: 'normal' | 'sp'
  /** 前イベントでPアイテムなどを入手するデッキスロット。 */
  pItemSlots: number[]
  /** この日程の前イベントで獲得するスキルカード。 */
  frontSkillCard?: HifSkillCardSelection | null
  /** 選択した「サポートイベント・後」のカードとイベント。 */
  postEventSelection?: HifSupportEventSelection | null
  consultation: HifConsultationSettings
  /** 差し入れ・活動支給で獲得するスキルカード。 */
  supplySkillCard: HifSkillCardSelection
  customPItemCard: HifCustomPItemCardSettings
  /** 授業で行うスキルカード操作と、その対象条件。 */
  classSettings: HifClassSettings
  /** 特別指導で実行するスキルカードのカスタム回数。 */
  trainingCustomCount: 0 | 1 | 2
  /** 本戦インターバルで行う、回数制限のない交換・カスタマイズ。 */
  interval: HifIntervalSettings
  /** おでかけで選ぶ固定報酬と、獲得するカードの条件。 */
  outing: HifOutingSettings
}
export interface HifScheduleConfig {
  /** detailed は日程別、simple は育成開始前の一括イベント設定を使用する。 */
  eventMode: 'simple' | 'detailed'
  /** サポート前イベントで獲得したスキルカードを強化済みとして追加する。 */
  supportEventSkillCardsUpgraded: boolean
  simpleEvents: HifSimpleEventSettings
  /** 試験後の疑似スケジュール。実日程の steps には含めない。 */
  customPItem: HifCustomPItemSelection
  steps: HifScheduleStep[]
}
