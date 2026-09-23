import type { ProduceSkillCardState } from '@/types/calculator'
import type { HifConsultationSkillKind } from '@/types/hif-schedule'
import type { IdolPlan } from '@/types/produce'

type SkillCardTag = ProduceSkillCardState['effectTags'][number]

export const HIF_CONSULTATION_PLAN_TYPES: Record<
  IdolPlan,
  { typeA: { label: string; tag: SkillCardTag }; typeB: { label: string; tag: SkillCardTag } }
> = {
  sense: { typeA: { label: '好調', tag: 'goodCondition' }, typeB: { label: '集中', tag: 'concentration' } },
  logic: { typeA: { label: '好印象', tag: 'goodImpression' }, typeB: { label: 'やる気', tag: 'motivation' } },
  anomaly: { typeA: { label: '強気', tag: 'aggressive' }, typeB: { label: '全力', tag: 'fullPower' } },
}

export function getHifConsultationSkillKindLabel(
  plan: IdolPlan,
  kind: HifConsultationSkillKind,
  preservation = false,
  energy = false,
) {
  const labels = HIF_CONSULTATION_PLAN_TYPES[plan]
  const selected: string[] = []
  if (kind === 'type_a' || kind === 'type_a_b') selected.push(labels.typeA.label)
  if (plan === 'anomaly' && preservation) selected.push('温存')
  if (kind === 'type_b' || kind === 'type_a_b') selected.push(labels.typeB.label)
  if (energy) selected.push('元気')
  return selected.length ? selected.join('&') : 'その他'
}

export function getHifConsultationSkillTags(
  plan: IdolPlan,
  kind: HifConsultationSkillKind,
  energy = false,
  preservation = false,
): SkillCardTag[] {
  const types = HIF_CONSULTATION_PLAN_TYPES[plan]
  const tags: SkillCardTag[] =
    kind === 'type_a'
      ? [types.typeA.tag]
      : kind === 'type_b'
        ? [types.typeB.tag]
        : kind === 'type_a_b'
          ? [types.typeA.tag, types.typeB.tag]
          : []
  if (plan === 'anomaly' && preservation) tags.push('preservation')
  if (energy) tags.push('energy')
  return tags
}
