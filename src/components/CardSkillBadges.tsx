import { cn, getCardSkillBadges, getCardTypeBadgeClass } from '@/lib/utils'
import type { CardSkill, CardType } from '@/types/card'

interface CardSkillBadgesProps {
  skills: CardSkill[]
  level: number
  cardType: CardType
  className?: string
  showDetails?: boolean
}

export function CardSkillBadges({
  skills,
  level,
  cardType,
  className,
  showDetails = true,
}: CardSkillBadgesProps) {
  const badges = getCardSkillBadges(skills, level, cardType).filter(
    (badge) => badge.variant === 'static' || showDetails,
  )

  if (badges.length === 0) return null

  return (
    <div className={cn('mt-1.5 flex flex-wrap gap-1 text-[11px] text-gray-500', className)}>
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={cn('rounded px-1.5 py-0.5 border', badge.className ?? getCardTypeBadgeClass(cardType))}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}
