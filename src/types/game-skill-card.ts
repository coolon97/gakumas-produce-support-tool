import type { IdolPlan } from './produce'
import type { HifConsultationSkillRarity } from './hif-schedule'
import type { ProduceSkillCardState } from './calculator'

/** null は元データに確定情報がなく、まだ分類していないことを表す。 */
export interface GameSkillCard {
  id: string
  name: string
  rarity: HifConsultationSkillRarity | null
  plan: IdolPlan | 'free'
  effect: string
  category: 'active' | 'mental' | null
  effectTags: ProduceSkillCardState['effectTags'] | null
  /** 更新スクリプトだけで使う照合ページ。公開用データからは取り除く。 */
  wikiUrl?: string
  /** 更新スクリプトだけで使う分類の根拠。公開用データからは取り除く。 */
  effectTagsBasis?: 'wiki_base_effect' | 'manual'
  source: { kind: 'support_event'; supportCardId: string; rewardIndex: number }
}
