import type { DeckCard } from '@/types/card'
import type { AbilityCoverageEntry } from '@/types/calculator'
import type { SupportAbilityOperation } from '@/types/support-ability'

function getOperationCoverage(
  operation: SupportAbilityOperation,
): Pick<AbilityCoverageEntry, 'status' | 'reason'> {
  switch (operation.op) {
    case 'add_stat':
    case 'add_sp_rate':
    case 'add_lesson_bonus':
    case 'add_param_bonus':
      return { status: 'calculated' }
    case 'modify_support_event_reward':
      return operation.rewardKind === 'stat_gain'
        ? { status: 'calculated' }
        : { status: 'irrelevant', reason: 'ステータス以外のイベント報酬' }
    case 'add_support_rate':
      return { status: 'irrelevant', reason: 'サポート発生率は育成パラメータ計算の対象外' }
    case 'mutate_skill_card':
    case 'add_card_usage_count':
    case 'add_param_gain_rate':
      return { status: 'unsupported', reason: 'レッスン中の行動変化を伴う効果は未計算' }
    default:
      return { status: 'irrelevant', reason: '育成ステータスへ直接加算しない効果' }
  }
}

export function getAbilityCoverage(deck: DeckCard[]): AbilityCoverageEntry[] {
  return deck.flatMap((deckCard) =>
    deckCard.card.skills.map((skill) => {
      const operationCoverage = skill.ability.operations.map(getOperationCoverage)
      const unsupported = operationCoverage.find((entry) => entry.status === 'unsupported')
      const calculated = operationCoverage.find((entry) => entry.status === 'calculated')
      const coverage = unsupported ??
        calculated ??
        operationCoverage[0] ?? { status: 'unsupported' as const, reason: '操作定義がない' }
      return {
        cardId: deckCard.card.id,
        cardName: deckCard.card.name,
        skillId: skill.id,
        skillDescription: skill.description,
        ...coverage,
      }
    }),
  )
}
