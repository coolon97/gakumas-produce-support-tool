import type { DeckCard, SupportEventEntry } from '@/types/card'
import type { AbilityActivationEvent } from '@/types/support-ability'

export type SupportAfterEventKind = 'parameter' | 'upgrade' | 'change' | 'delete'

export const SUPPORT_AFTER_EVENT_LABELS: Record<SupportAfterEventKind, string> = {
  parameter: 'パラメータ上昇',
  upgrade: 'スキルカード強化',
  change: 'スキルカードチェンジ',
  delete: 'スキルカード削除',
}

export function getSupportEventRequiredLevel(event: SupportEventEntry): number {
  return Number(event.unlock.match(/^Lv(\d+)$/)?.[1] ?? 0)
}

export function getSupportAfterEventKind(event: SupportEventEntry): SupportAfterEventKind | null {
  if (/(?:ボーカル|ダンス|ビジュアル)上昇\+\d/.test(event.effect)) return 'parameter'
  if (/スキルカード.*強化|強化.*スキルカード/.test(event.effect)) return 'upgrade'
  if (/スキルカード.*チェンジ|異なるカードにチェンジ/.test(event.effect)) return 'change'
  if (/カード.*削除|削除.*カード/.test(event.effect)) return 'delete'
  return null
}

export function getSupportAfterEventActivation(kind: SupportAfterEventKind): AbilityActivationEvent | null {
  if (kind === 'upgrade') return 'skill_card_upgraded'
  if (kind === 'change') return 'skill_card_changed'
  if (kind === 'delete') return 'skill_card_deleted'
  return null
}

export function getSupportAfterEventOptions(deckCard: DeckCard) {
  return (deckCard.card.supportEvents ?? []).flatMap((event, eventIndex) => {
    const kind = getSupportAfterEventKind(event)
    return kind ? [{ event, eventIndex, kind, requiredLevel: getSupportEventRequiredLevel(event) }] : []
  })
}
