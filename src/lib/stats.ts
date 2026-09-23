import type { StatValues } from '@/types/produce'

export const ZERO_STAT_VALUES: StatValues = { vo: 0, da: 0, vi: 0 }

export function addStatValues(...valuesList: StatValues[]): StatValues {
  return valuesList.reduce(
    (sum, values) => ({
      vo: sum.vo + values.vo,
      da: sum.da + values.da,
      vi: sum.vi + values.vi,
    }),
    ZERO_STAT_VALUES,
  )
}

export function scaleStatValues(values: StatValues, multiplier: StatValues): StatValues {
  return {
    vo: values.vo * multiplier.vo,
    da: values.da * multiplier.da,
    vi: values.vi * multiplier.vi,
  }
}

export function floorAndCapStatValues(values: StatValues, cap: number): StatValues {
  return {
    vo: Math.min(Math.floor(values.vo), cap),
    da: Math.min(Math.floor(values.da), cap),
    vi: Math.min(Math.floor(values.vi), cap),
  }
}

export function averageStatValues(values: StatValues): number {
  return (values.vo + values.da + values.vi) / 3
}

export function createLessonStatValues(
  param: 'vocal' | 'dance' | 'visual',
  main: number,
  sub: number,
): StatValues {
  return {
    vo: param === 'vocal' ? main : sub,
    da: param === 'dance' ? main : sub,
    vi: param === 'visual' ? main : sub,
  }
}
