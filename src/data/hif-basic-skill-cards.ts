import type { ProduceSkillCardState } from '@/types/calculator'
import type { IdolRecommendedEffect } from '@/types/idol'

export type HifBasicSkillCardDefinition = Pick<ProduceSkillCardState, 'name' | 'category' | 'effectTags'>

const card = (
  name: string,
  category: NonNullable<ProduceSkillCardState['category']>,
  ...effectTags: ProduceSkillCardState['effectTags']
): HifBasicSkillCardDefinition => ({ name, category, effectTags })

const FULLPOWER_BASIC_CARDS: readonly HifBasicSkillCardDefinition[] = [
  card('アドリブの基本', 'active', 'fullPower'),
  card('スピーチの基本', 'active', 'aggressive', 'fullPower'),
  card('スピーチの基本', 'active', 'aggressive', 'fullPower'),
  card('自己管理の基本', 'mental', 'preservation', 'fullPower'),
  card('自己管理の基本', 'mental', 'preservation', 'fullPower'),
  card('レスポンスの基本', 'mental', 'energy', 'fullPower'),
  card('レスポンスの基本', 'mental', 'energy', 'fullPower'),
]

/**
 * H.I.F開始時に所持する「名前に基本を含むスキルカード」7枚。
 *
 * カード名と枚数はWikiのH.I.Fページ、タイプと効果タグは
 * 「スキルカード一覧/その他」の無印カード効果に基づく。
 * WikiのH.I.F表にはおすすめ効果「温存」の独立した構成がなく、
 * 温存アイドルは「実質全力」と説明されているため全力構成を使用する。
 */
export const HIF_BASIC_SKILL_CARDS_BY_RECOMMENDED_EFFECT: Readonly<
  Record<IdolRecommendedEffect, readonly HifBasicSkillCardDefinition[]>
> = {
  goodCondition: [
    card('ステージングの基本', 'active', 'goodCondition'),
    card('ステップの基本', 'active', 'goodCondition'),
    card('ステップの基本', 'active', 'goodCondition'),
    card('視線の基本', 'mental', 'energy', 'goodCondition'),
    card('視線の基本', 'mental', 'energy', 'goodCondition'),
    card('思考の基本', 'mental', 'goodCondition', 'concentration'),
    card('タイミングの基本', 'mental', 'energy', 'goodCondition'),
  ],
  concentration: [
    card('リアクションの基本', 'active', 'concentration'),
    card('パフォーマンスの基本', 'active', 'concentration'),
    card('パフォーマンスの基本', 'active', 'concentration'),
    card('思考の基本', 'mental', 'goodCondition', 'concentration'),
    card('落ち着きの基本', 'mental', 'energy', 'concentration'),
    card('落ち着きの基本', 'mental', 'energy', 'concentration'),
    card('タイミングの基本', 'mental', 'energy', 'goodCondition'),
  ],
  goodImpression: [
    card('盛り上げの基本', 'mental', 'goodImpression'),
    card('ファンサの基本', 'active', 'goodImpression'),
    card('ファンサの基本', 'active', 'goodImpression'),
    card('笑顔の基本', 'mental', 'energy', 'goodImpression'),
    card('笑顔の基本', 'mental', 'energy', 'goodImpression'),
    card('笑顔の基本', 'mental', 'energy', 'goodImpression'),
    card('セリフの基本', 'mental', 'energy', 'goodImpression', 'motivation'),
  ],
  motivation: [
    card('アイコンタクトの基本', 'active', 'energy', 'motivation'),
    card('仕草の基本', 'active', 'energy', 'motivation'),
    card('距離感の基本', 'mental', 'energy', 'motivation'),
    card('距離感の基本', 'mental', 'energy', 'motivation'),
    card('距離感の基本', 'mental', 'energy', 'motivation'),
    card('距離感の基本', 'mental', 'energy', 'motivation'),
    card('セルフケアの基本', 'mental', 'energy', 'goodImpression', 'motivation'),
  ],
  aggressive: [
    card('ブランディングの基本', 'active', 'aggressive'),
    card('魅せ方の基本', 'active', 'aggressive'),
    card('魅せ方の基本', 'active', 'aggressive'),
    card('魅せ方の基本', 'active', 'aggressive'),
    card('立ち回りの基本', 'mental', 'energy', 'preservation'),
    card('立ち回りの基本', 'mental', 'energy', 'preservation'),
    card('ウォームアップの基本', 'mental', 'preservation', 'fullPower'),
  ],
  fullPower: FULLPOWER_BASIC_CARDS,
  preservation: FULLPOWER_BASIC_CARDS,
}

export function getHifBasicSkillCards(
  recommendedEffect: IdolRecommendedEffect,
): HifBasicSkillCardDefinition[] {
  return HIF_BASIC_SKILL_CARDS_BY_RECOMMENDED_EFFECT[recommendedEffect].map((definition) => ({
    ...definition,
    effectTags: [...definition.effectTags],
  }))
}
