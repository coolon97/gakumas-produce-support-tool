import catalogData from '@data/skill-cards.json'
import type { GameSkillCard } from '@/types/game-skill-card'

export const SKILL_CARDS = catalogData as GameSkillCard[]

const supportEventCards = new Map(
  SKILL_CARDS.filter((card) => card.source.kind === 'support_event').map((card) => [
    `${card.source.supportCardId}:${card.source.rewardIndex}`,
    card,
  ]),
)

export function getSupportEventSkillCard(supportCardId: string, rewardIndex = 0): GameSkillCard | undefined {
  return supportEventCards.get(`${supportCardId}:${rewardIndex}`)
}
