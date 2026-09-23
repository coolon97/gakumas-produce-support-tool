import type {
  AbilityCondition,
  AbilityLessonKind,
  AbilityLessonParam,
  AbilityPredicate,
  AbilityValueOperand,
  SupportAbilityOperation,
  SupportAbilitySpec,
} from '@/types/support-ability'

export function resolveAbilityValue(
  ability: SupportAbilitySpec,
  operand: AbilityValueOperand,
  level: number,
): number {
  if (operand.kind === 'literal') return operand.value

  const curve = ability.curves?.[operand.curveId]
  if (!curve) return 0

  const point = [...curve.points]
    .filter((candidate) => candidate.lv <= level)
    .sort((left, right) => right.lv - left.lv)[0]

  return point?.value ?? curve.fallback ?? 0
}

export function resolveOperationValue(
  ability: SupportAbilitySpec,
  operation: SupportAbilityOperation,
  level: number,
): number {
  return 'amount' in operation ? resolveAbilityValue(ability, operation.amount, level) : 0
}

export function getPrimaryAbilityValue(ability: SupportAbilitySpec, level: number): number {
  const operation = ability.operations.find(
    (candidate): candidate is SupportAbilityOperation & { amount: AbilityValueOperand } =>
      'amount' in candidate,
  )
  return operation ? resolveAbilityValue(ability, operation.amount, level) : 0
}

function collectConditions(predicate: AbilityPredicate, output: AbilityCondition[]): void {
  switch (predicate.type) {
    case 'condition':
      output.push(predicate.condition)
      return
    case 'all':
    case 'any':
      predicate.predicates.forEach((child) => collectConditions(child, output))
      return
    case 'not':
      collectConditions(predicate.predicate, output)
  }
}

export function getAbilityConditions(ability: SupportAbilitySpec): AbilityCondition[] {
  if (!ability.predicate) return []
  const conditions: AbilityCondition[] = []
  collectConditions(ability.predicate, conditions)
  return conditions
}

export function getAbilityLimit(
  ability: SupportAbilitySpec,
  scope: 'produce' | 'lesson',
): number | undefined {
  return ability.limits?.find((limit) => limit.scope === scope)?.max
}

export function getLessonActivationContext(ability: SupportAbilitySpec): {
  lessonKind: AbilityLessonKind
  lessonParam?: AbilityLessonParam
} | null {
  if (ability.activation.event !== 'lesson_end') return null

  return {
    lessonKind: ability.activation.lessonKind ?? 'any',
    lessonParam: ability.activation.lessonParam,
  }
}
