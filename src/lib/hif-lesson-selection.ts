import type { LessonParameter, HifLessonConfig } from '@/types/produce'

/** Select in main/sub order; removing main promotes the remaining selection. */
export function toggleHifLessonParameter(
  lesson: HifLessonConfig,
  param: LessonParameter,
): Pick<HifLessonConfig, 'param' | 'subParam'> {
  if (lesson.param === param) return { param: lesson.subParam, subParam: null }
  if (lesson.subParam === param) return { param: lesson.param, subParam: null }
  if (lesson.param === null) return { param, subParam: null }
  if (lesson.subParam === null) return { param: lesson.param, subParam: param }
  return { param: lesson.param, subParam: lesson.subParam }
}

export function isHifLessonReady(
  lesson: HifLessonConfig,
): lesson is HifLessonConfig & { param: LessonParameter; subParam: LessonParameter } {
  return lesson.param !== null && lesson.subParam !== null && lesson.param !== lesson.subParam
}
