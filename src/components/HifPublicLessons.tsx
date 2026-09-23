import { HIF_LESSON_SCHEDULE } from '@/data/hif'
import type { HifLessonConfig } from '@/types/produce'
import { cn } from '@/lib/utils'
import { toggleHifLessonParameter } from '@/lib/hif-lesson-selection'
import { HifScheduleIcon } from '@/components/HifScheduleIcon'

export const PARAMS = ['vocal', 'dance', 'visual'] as const
export const PARAM_LABELS = { vocal: 'Vo', dance: 'Da', visual: 'Vi' }
const PARAM_NAMES = { vocal: 'Vocal', dance: 'Dance', visual: 'Visual' }
const PARAM_ICON_COLORS = { vocal: 'bg-pink-500', dance: 'bg-sky-500', visual: 'bg-amber-400' }
const PARAM_NAME_COLORS = { vocal: 'text-pink-600', dance: 'text-sky-600', visual: 'text-amber-600' }

export function HifPublicLessons({
  lessons,
  onChange,
  showHeading = true,
}: {
  lessons: HifLessonConfig[]
  onChange: (lessons: HifLessonConfig[]) => void
  showHeading?: boolean
}) {
  const updateLesson = (index: number, update: Partial<HifLessonConfig>) =>
    onChange(lessons.map((lesson, i) => (i === index ? { ...lesson, ...update } : lesson)))

  return (
    <section>
      {showHeading && <h3 className="mb-2 text-xs font-semibold text-gray-500">公開レッスン設定</h3>}
      <p className="mb-2 text-[10px] leading-relaxed text-gray-500">
        レッスンする属性をメイン、サブの順に選択してください。
      </p>
      <div className="space-y-2">
        {lessons.map((lesson, index) => {
          const schedule = HIF_LESSON_SCHEDULE[index]
          const gain = schedule[lesson.type]
          return (
            <div
              key={schedule.label}
              className={cn(
                'rounded-lg border border-gray-200 bg-gray-50 p-2.5',
                !lesson.enabled && 'opacity-60',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={lesson.enabled}
                    onChange={(event) => updateLesson(index, { enabled: event.target.checked })}
                  />
                  {schedule.label}
                </label>
                <span className="text-[10px] text-gray-400">
                  メイン+{gain.main} / サブ+{gain.sub}
                </span>
              </div>
              <div
                role="group"
                aria-label={`${schedule.label} 属性選択`}
                className="mt-2 flex justify-center gap-2"
              >
                {PARAMS.map((param) => {
                  const role = lesson.param === param ? 'メイン' : lesson.subParam === param ? 'サブ' : null
                  const disabled = role === null && lesson.param !== null && lesson.subParam !== null
                  return (
                    <div key={param} className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={role !== null}
                        aria-label={`${schedule.label} ${PARAM_NAMES[param]}${role ? ` ${role}` : ''}`}
                        onClick={() => updateLesson(index, toggleHifLessonParameter(lesson, param))}
                        className={cn(
                          'relative flex h-12 w-12 items-center justify-center rounded-xl border-2 text-white shadow-sm transition-transform hover:scale-105 disabled:cursor-default disabled:opacity-35 disabled:hover:scale-100',
                          PARAM_ICON_COLORS[param],
                          role === 'メイン'
                            ? 'border-blue-800 ring-2 ring-blue-200'
                            : role === 'サブ'
                              ? 'border-white ring-2 ring-gray-300'
                              : 'border-white',
                        )}
                      >
                        <HifScheduleIcon action="lesson" param={param} className="h-7 w-7" />
                        {role && (
                          <span className="absolute -right-1 -top-1 rounded-full bg-white px-1 text-[8px] font-bold text-gray-700 shadow">
                            {role}
                          </span>
                        )}
                      </button>
                      <span className={cn('text-[9px] font-bold', PARAM_NAME_COLORS[param])}>
                        {PARAM_NAMES[param]}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <span className="text-[10px] font-semibold text-gray-500">SP</span>
                <button
                  type="button"
                  role="switch"
                  aria-label={`${schedule.label} SPレッスン`}
                  aria-checked={lesson.type === 'sp'}
                  onClick={() => updateLesson(index, { type: lesson.type === 'sp' ? 'normal' : 'sp' })}
                  className={cn(
                    'relative h-5 w-9 rounded-full transition-colors',
                    lesson.type === 'sp' ? 'bg-orange-500' : 'bg-gray-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                      lesson.type === 'sp' ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </button>
              </div>
              {lesson.enabled && (lesson.param === null || lesson.subParam === null) && (
                <p className="mt-1 text-center text-[10px] text-amber-700" role="status">
                  {lesson.param === null ? 'メイン' : 'サブ'}
                  を選択してください。未設定のレッスンは計算に含まれません。
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
