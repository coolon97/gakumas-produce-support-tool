import { Fragment, useEffect, useRef, useState } from 'react'
import {
  HIF_SCHEDULE,
  HIF_SCHEDULE_COLUMNS,
  HIF_ACTION_LABELS,
  createDefaultHifSchedule,
} from '@/data/hif-schedule'
import type { HifScheduleAction, HifScheduleStep } from '@/types/hif-schedule'
import {
  getHifScheduleColumnIndex,
  getHifScheduleProgress,
  getHifScheduleWindowStart,
  getPendingHifCustomPItemStage,
  normalizeHifSchedule,
  syncHifSchedule,
  setHifEventMode,
} from '@/lib/hif-schedule'
import { confirmHifScheduleStep } from '@/lib/hif-schedule-editor'
import type { HifConfig } from '@/types/produce'
import { useHifScheduleStore } from '@/store/selectors'
import { HifScheduleDialog } from './HifScheduleDialog'
import { HifSimpleEventDialog } from './HifSimpleEventDialog'
import { HifScheduleDetailDialog } from './HifScheduleDetailDialog'
import { HifScheduleIcon } from './HifScheduleIcon'
import { HifCustomPItemRow } from './HifCustomPItemRow'
import { HifBonusSettings } from './HifBonusSettings'
import { HifCarryoverSkillCards } from './HifCarryoverSkillCards'
import { PARAMS, PARAM_LABELS } from './HifPublicLessons'
import { cn } from '@/lib/utils'
import { findIdolVersion } from '@/data/idols'
import { createInitialProduceState, HIF_BADGE_TRIGGER_LIMIT } from '@/lib/calculator/hif-simulation-state'
import type { TutorialProgress } from '@/types/tutorial'
import { HIF_SCHEDULE_ROW_HEIGHT_CLASS } from './hif-schedule-layout'

const PARAM_COLORS = { vocal: 'bg-pink-500', dance: 'bg-sky-500', visual: 'bg-amber-400' }
const ACTION_COLORS: Record<HifScheduleAction, string> = {
  lesson: 'bg-pink-500',
  class: 'bg-indigo-400',
  outing: 'bg-cyan-500',
  consultation: 'bg-emerald-400',
  supply: 'bg-orange-400',
  training: 'bg-green-500',
  rest: 'bg-slate-400',
  exam: 'bg-indigo-500',
  round1: 'bg-indigo-500',
  interval: 'bg-violet-500',
  round2: 'bg-indigo-500',
}
const ROUND1_INDEX = HIF_SCHEDULE.findIndex((day) => day.actions[0] === 'round1')
const ROUND2_INDEX = HIF_SCHEDULE.findIndex((day) => day.actions[0] === 'round2')

export function HifSchedulePanel({ tutorialProgress }: { tutorialProgress?: TutorialProgress | null }) {
  const { deck, produceConfig, setHifConfig, result, runCalculation } = useHifScheduleStore()
  const hif = produceConfig.hif
  const idolPlan = findIdolVersion(produceConfig.idolId, produceConfig.idolVersionId)?.plan ?? 'sense'
  const initialOwnedSkillCards = createInitialProduceState(produceConfig).snapshot.skillCards
  const schedule = normalizeHifSchedule(hif.schedule)
  const progress = getHifScheduleProgress(schedule)
  const customPItemPending = getPendingHifCustomPItemStage(schedule) !== null
  const [editing, setEditing] = useState<{
    index: number
    step: HifScheduleStep
    anchor: HTMLButtonElement
    mode: 'schedule' | 'event'
  } | null>(null)
  const [viewingDetail, setViewingDetail] = useState<{ index: number; anchor: HTMLButtonElement } | null>(
    null,
  )
  const [simpleEventAnchor, setSimpleEventAnchor] = useState<HTMLButtonElement | null>(null)
  const [message, setStatusMessage] = useState('')
  const [messageNearReset, setMessageNearReset] = useState(false)
  const setMessage = (text: string, nearReset = false) => {
    setStatusMessage(text)
    setMessageNearReset(nearReset)
  }
  const [beforeReset, setBeforeReset] = useState<HifConfig | null>(null)
  const activeColumn = getHifScheduleColumnIndex(progress - (customPItemPending ? 1 : 0))
  const [windowStart, setWindowStart] = useState(() =>
    getHifScheduleWindowStart(activeColumn, activeColumn - 1),
  )
  useEffect(
    () => setWindowStart((current) => getHifScheduleWindowStart(activeColumn, current)),
    [activeColumn],
  )
  const lastFocusedColumn = useRef(activeColumn)
  useEffect(() => {
    if (tutorialProgress || activeColumn <= lastFocusedColumn.current) {
      lastFocusedColumn.current = activeColumn
      return
    }
    const firstDay = HIF_SCHEDULE_COLUMNS[activeColumn]?.from
    const target =
      firstDay === undefined
        ? null
        : document.querySelector<HTMLElement>(`[data-tutorial-schedule-day="${firstDay}"]`)
    const scrollContainer = target?.closest<HTMLElement>('[data-tutorial-produce-scroll]')
    if (!target || !scrollContainer) return
    const targetBounds = target.getBoundingClientRect()
    const screenCenter = window.innerHeight / 2
    if (scrollContainer.scrollHeight > scrollContainer.clientHeight + 1) {
      const scrollBounds = scrollContainer.getBoundingClientRect()
      const targetCenter = Math.max(
        scrollBounds.top + targetBounds.height / 2,
        Math.min(screenCenter, scrollBounds.bottom - targetBounds.height / 2),
      )
      scrollContainer.scrollTo({
        top: scrollContainer.scrollTop + targetBounds.top + targetBounds.height / 2 - targetCenter,
        behavior: 'smooth',
      })
    } else {
      window.scrollTo({
        top: window.scrollY + targetBounds.top + targetBounds.height / 2 - screenCenter,
        behavior: 'smooth',
      })
    }
    lastFocusedColumn.current = activeColumn
  }, [activeColumn, windowStart, tutorialProgress])
  const tutorialScheduleIndex =
    tutorialProgress?.stepId === 'schedule-day1'
      ? 0
      : ['schedule-day2-open', 'schedule-day2-settings'].includes(tutorialProgress?.stepId ?? '')
        ? 1
        : ['exam1', 'exam1-delete-open', 'exam1-delete-select', 'exam1-confirm'].includes(
              tutorialProgress?.stepId ?? '',
            )
          ? 6
          : tutorialProgress?.stepId === 'round1'
            ? ROUND1_INDEX
            : tutorialProgress?.stepId === 'round2'
              ? ROUND2_INDEX
              : null
  useEffect(() => {
    if (
      [
        'schedule-day1',
        'schedule-day2-open',
        'schedule-day2-settings',
        'exam1',
        'exam1-delete-open',
        'exam1-delete-select',
        'exam1-confirm',
        'exam1-custom',
      ].includes(tutorialProgress?.stepId ?? '')
    )
      setWindowStart(0)
    if (tutorialProgress?.stepId === 'week2-fill' || tutorialProgress?.stepId === 'schedule-next')
      setWindowStart(0)
    if (
      tutorialProgress?.stepId === 'later-schedule' ||
      tutorialProgress?.stepId === 'round1' ||
      tutorialProgress?.stepId === 'round2'
    )
      setWindowStart(HIF_SCHEDULE_COLUMNS.length - 2)
  }, [tutorialProgress?.stepId])
  const visibleColumns = HIF_SCHEDULE_COLUMNS.slice(windowStart, windowStart + 2)
  const moveWindow = (direction: -1 | 1) => {
    setEditing(null)
    setViewingDetail(null)
    setWindowStart((current) =>
      Math.max(0, Math.min(HIF_SCHEDULE_COLUMNS.length - 2, (Math.floor(current / 2) + direction) * 2)),
    )
  }
  const select = (
    index: number,
    action: HifScheduleAction,
    anchor: HTMLButtonElement,
    param?: HifScheduleStep['param'],
  ) => {
    const step = { ...structuredClone(schedule.steps[index]), action }
    if (action !== 'consultation') step.consultation = { pDrinkCount: 0, skillActions: [], resetUsed: false }
    if (param) {
      step.param = param
      if (step.subParam === param) step.subParam = PARAMS.find((candidate) => candidate !== param) ?? null
    }
    setEditing({ index, step, anchor, mode: 'schedule' })
  }
  const selectEvent = (index: number, anchor: HTMLButtonElement) =>
    setEditing({ index, step: structuredClone(schedule.steps[index]), anchor, mode: 'event' })
  return (
    <div data-tutorial="produce-settings" className="space-y-4">
      <h3 className="border-t border-gray-200 pt-5 text-base font-bold text-gray-700">プロデュース設定</h3>
      <HifCarryoverSkillCards
        cards={hif.carryoverSkillCards}
        plan={idolPlan}
        onChange={(carryoverSkillCards) => {
          setHifConfig({ carryoverSkillCards })
          runCalculation()
        }}
      />
      <div
        data-tutorial="schedule-grid"
        className="overflow-hidden rounded-xl border border-gray-200 bg-white"
      >
        <div className="flex h-12 items-center justify-between border-b border-gray-200 bg-slate-50">
          <button
            type="button"
            aria-label="2列前のスケジュールを表示"
            disabled={windowStart === 0}
            onClick={() => moveWindow(-1)}
            className="flex h-full w-12 shrink-0 items-center justify-center border-r border-gray-200 text-3xl font-light text-indigo-600 transition-colors hover:bg-indigo-50 disabled:text-gray-300"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-700">
            スケジュール表（{windowStart === 0 ? '前半' : '後半'}）
          </span>
          <button
            type="button"
            data-tutorial="schedule-next"
            aria-label="2列後のスケジュールを表示"
            disabled={windowStart >= HIF_SCHEDULE_COLUMNS.length - 2}
            onClick={() => moveWindow(1)}
            className="flex h-full w-12 shrink-0 items-center justify-center border-l border-gray-200 text-3xl font-light text-indigo-600 transition-colors hover:bg-indigo-50 disabled:text-gray-300"
          >
            ›
          </button>
        </div>
        <div className="grid min-w-0 grid-cols-2 divide-x divide-gray-200">
          {visibleColumns.map((column) => (
            <section
              key={column.label}
              aria-label={column.label}
              data-tutorial-schedule-column={column.label}
              data-tutorial-later-column={column.from >= 13 ? 'true' : undefined}
              className="flex min-w-0 flex-col"
            >
              <h4 className="bg-indigo-50 p-3 text-center text-sm font-bold text-indigo-700">
                {column.label}
              </h4>
              <p className="bg-gray-50 p-1.5 text-center text-[11px] text-gray-400">↓ 上から下へ</p>
              <div className="flex flex-1 flex-col justify-start">
                {HIF_SCHEDULE.slice(column.from, column.to)
                  .map((day, offset) => ({ day, index: column.from + offset }))
                  .map(({ day, index }) => {
                    const step = schedule.steps[index]
                    const upcoming = index > progress || (index === progress && customPItemPending)
                    const selected = index < progress
                    const currentDay = index === progress && !customPItemPending
                    const hasEventSettings = Boolean(step.postEventSelection) || step.pItemSlots.length > 0
                    const selectedLabel = selected
                      ? step.action === 'lesson'
                        ? `${step.lessonType === 'sp' ? 'SP' : '通常'} · ${PARAM_LABELS[step.param]}/${step.subParam ? PARAM_LABELS[step.subParam] : '未設定'}`
                        : step.action === 'class'
                          ? `授業 ${PARAM_LABELS[step.param]}`
                          : HIF_ACTION_LABELS[step.action!]
                      : ''
                    const fixed = ['exam', 'round1', 'round2', 'interval'].includes(day.actions[0])
                    return (
                      <Fragment key={day.id}>
                        <div
                          aria-current={currentDay ? 'step' : undefined}
                          data-tutorial-schedule-day={index}
                          data-tutorial-week-fill={index >= 2 && index <= 5 ? 'true' : undefined}
                          className={cn(
                            HIF_SCHEDULE_ROW_HEIGHT_CLASS,
                            'border-b border-dashed border-gray-200 px-3 py-3',
                            currentDay
                              ? 'bg-blue-50 ring-2 ring-inset ring-blue-300'
                              : selected
                                ? 'bg-white'
                                : 'bg-gray-50/80',
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between gap-1 text-xs">
                            <span
                              className={cn(
                                'shrink-0 font-semibold',
                                currentDay ? 'text-blue-700' : 'text-gray-500',
                              )}
                            >
                              {day.day === 7 && day.phase === 'final' ? '当日' : `${day.day}日`}
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate text-[10px] font-medium text-gray-500"
                              title={selectedLabel}
                            >
                              {selectedLabel}
                            </span>
                            <span className="shrink-0 text-blue-500">
                              {selected ? '✓' : currentDay ? '次の設定' : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {day.actions
                              .filter((action) => action !== 'rest')
                              .flatMap((action) => {
                                const parameters =
                                  action === 'lesson' || action === 'class' ? PARAMS : [undefined]
                                return parameters.map((param) => {
                                  const active = step.action === action && (!param || step.param === param)
                                  const selectedSubParam =
                                    selected && active && action === 'lesson' ? step.subParam : null
                                  const tutorialEnabled = tutorialScheduleIndex === index
                                  return (
                                    <button
                                      key={`${action}-${param}`}
                                      type="button"
                                      disabled={upcoming && !tutorialEnabled}
                                      aria-pressed={active}
                                      aria-label={`${day.label} ${HIF_ACTION_LABELS[action]}${param ? ` ${PARAM_LABELS[param]}` : ''}${selectedSubParam ? ` サブ ${PARAM_LABELS[selectedSubParam]}` : ''}`}
                                      title={`${HIF_ACTION_LABELS[action]}${param ? ` ${PARAM_LABELS[param]}` : ''}${selectedSubParam ? ` / サブ ${PARAM_LABELS[selectedSubParam]}` : ''}`}
                                      data-hif-schedule-trigger
                                      data-tutorial-lesson-main={action === 'lesson' ? index : undefined}
                                      onClick={(event) => select(index, action, event.currentTarget, param)}
                                      className={cn(
                                        'relative flex h-9 items-center justify-center rounded-lg border-2 text-white transition-opacity sm:h-10',
                                        fixed ? 'w-full gap-2 px-2' : 'w-9 sm:w-10',
                                        active
                                          ? 'border-blue-800 ring-2 ring-blue-200'
                                          : 'border-white shadow-sm',
                                        param && action === 'lesson'
                                          ? PARAM_COLORS[param]
                                          : ACTION_COLORS[action],
                                        upcoming && !tutorialEnabled
                                          ? 'cursor-default opacity-35'
                                          : 'hover:opacity-80',
                                      )}
                                    >
                                      <HifScheduleIcon
                                        action={action}
                                        param={param}
                                        className="h-6 w-6 sm:h-7 sm:w-7"
                                      />
                                      {fixed && (
                                        <span className="text-xs font-semibold">
                                          {action === 'exam'
                                            ? `試験${day.examIndex! + 1}`
                                            : HIF_ACTION_LABELS[action]}
                                        </span>
                                      )}
                                      {selectedSubParam ? (
                                        <span
                                          aria-hidden="true"
                                          className={cn(
                                            'absolute -bottom-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-white shadow-sm',
                                            PARAM_COLORS[selectedSubParam],
                                          )}
                                        >
                                          <HifScheduleIcon
                                            action="lesson"
                                            param={selectedSubParam}
                                            className="h-4 w-4"
                                          />
                                        </span>
                                      ) : (
                                        param &&
                                        action === 'class' && (
                                          <span
                                            aria-hidden="true"
                                            className={cn(
                                              'absolute -bottom-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-white shadow-sm',
                                              PARAM_COLORS[param],
                                            )}
                                          >
                                            <HifScheduleIcon
                                              action="lesson"
                                              param={param}
                                              className="h-4 w-4"
                                            />
                                          </span>
                                        )
                                      )}
                                    </button>
                                  )
                                })
                              })}
                          </div>
                          <div className="mt-3 flex items-center justify-end">
                            <div className="flex min-w-0 items-center gap-1">
                              {day.actions.includes('rest') && (
                                <button
                                  type="button"
                                  disabled={upcoming && tutorialScheduleIndex !== index}
                                  aria-label={`${day.label} ${HIF_ACTION_LABELS.rest}`}
                                  title={HIF_ACTION_LABELS.rest}
                                  aria-pressed={step.action === 'rest'}
                                  data-hif-schedule-trigger
                                  onClick={(event) => select(index, 'rest', event.currentTarget)}
                                  className={cn(
                                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 bg-slate-400 text-white',
                                    step.action === 'rest'
                                      ? 'border-blue-800 ring-2 ring-blue-200'
                                      : 'border-white shadow-sm',
                                    upcoming && tutorialScheduleIndex !== index
                                      ? 'cursor-default opacity-35'
                                      : 'hover:opacity-80',
                                  )}
                                >
                                  <HifScheduleIcon action="rest" className="h-5 w-5" />
                                </button>
                              )}
                              {schedule.eventMode === 'detailed' && (
                                <button
                                  type="button"
                                  disabled={!selected}
                                  data-hif-schedule-trigger
                                  data-tutorial-event={index}
                                  aria-pressed={hasEventSettings}
                                  aria-label={`${day.label} イベント設定${hasEventSettings ? ' 設定あり' : ''}`}
                                  title={selected ? 'イベント設定' : '日程を確定すると設定できます'}
                                  onClick={(event) => selectEvent(index, event.currentTarget)}
                                  className={cn(
                                    'rounded-md border px-2 py-1 text-[10px] font-semibold',
                                    hasEventSettings
                                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                                      : 'border-gray-200 bg-white text-gray-500',
                                    !selected && 'cursor-default opacity-35',
                                  )}
                                >
                                  イベント
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={!selected || !result?.simulation?.steps[index]}
                                data-hif-detail-trigger
                                data-tutorial-detail={index}
                                aria-label={`${day.label} 所持状況とカード別寄与`}
                                title={selected ? '所持状況とカード別寄与' : '日程を確定すると確認できます'}
                                onClick={(event) => {
                                  setEditing(null)
                                  setViewingDetail({ index, anchor: event.currentTarget })
                                }}
                                className={cn(
                                  'rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600',
                                  (!selected || !result?.simulation?.steps[index]) &&
                                    'cursor-default opacity-35',
                                )}
                              >
                                詳細
                              </button>
                            </div>
                          </div>
                        </div>
                        {day.examIndex !== undefined && (
                          <HifCustomPItemRow
                            examIndex={day.examIndex as 0 | 1 | 2}
                            plan={idolPlan}
                            selection={schedule.customPItem}
                            enabled={progress >= index + 1}
                            current={progress === index + 1 && customPItemPending}
                            onChange={(customPItem) => {
                              const next = { ...schedule, customPItem }
                              setHifConfig({ schedule: next })
                              runCalculation()
                              setMessage(`試験${day.examIndex! + 1}後のカスタムPアイテムを設定しました。`)
                            }}
                          />
                        )}
                      </Fragment>
                    )
                  })}
              </div>
            </section>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
          {(['lesson', 'class', 'outing', 'consultation', 'supply', 'training', 'rest'] as const).map(
            (action) => (
              <span key={action} className="flex items-center gap-1">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded text-white',
                    ACTION_COLORS[action],
                  )}
                >
                  <HifScheduleIcon action={action} className="h-5 w-5" />
                </span>
                {HIF_ACTION_LABELS[action]}
              </span>
            ),
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {progress > 0 && (
            <button
              type="button"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-600 transition-colors hover:bg-red-100"
              onClick={() => {
                setBeforeReset(structuredClone(hif))
                const base = {
                  ...hif,
                  schedule: {
                    ...schedule,
                    steps: createDefaultHifSchedule().steps,
                    customPItem: createDefaultHifSchedule().customPItem,
                  },
                }
                setHifConfig(syncHifSchedule(base, base.schedule))
                setMessage('日程の選択をリセットしました。', true)
              }}
            >
              日程をやり直す
            </button>
          )}
          {beforeReset && (
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-600 transition-colors hover:bg-gray-100"
              onClick={() => {
                setHifConfig(beforeReset)
                setBeforeReset(null)
                setMessage('リセット前の日程に戻しました。', true)
              }}
            >
              リセットを取り消す
            </button>
          )}
          {message && messageNearReset && (
            <p role="status" className="text-xs text-blue-600">
              {message}
            </p>
          )}
        </div>
      </div>
      <h3 className="border-t border-gray-200 pt-5 text-base font-bold text-gray-700">オプション設定</h3>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-0.5" role="group" aria-label="イベント設定モード">
            {(['simple', 'detailed'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={schedule.eventMode === mode}
                onClick={() => {
                  setSimpleEventAnchor(null)
                  const next = setHifEventMode(schedule, mode)
                  setHifConfig({ schedule: next })
                  runCalculation()
                  setMessage(
                    mode === 'simple'
                      ? '簡易モードへ切り替え、詳細設定のイベントを一括設定へ取り込みました。'
                      : '詳細モードへ切り替えました。日程別のイベント設定は保持されています。',
                  )
                }}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  schedule.eventMode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500',
                )}
              >
                {mode === 'simple' ? '簡易モード' : '詳細モード'}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={schedule.supportEventSkillCardsUpgraded}
              onChange={(event) => {
                setHifConfig({
                  schedule: { ...schedule, supportEventSkillCardsUpgraded: event.target.checked },
                })
                runCalculation()
              }}
            />
            サポートイベントによるスキルカードを強化済みで獲得
          </label>
        </div>
        {schedule.eventMode === 'simple' && (
          <button
            type="button"
            data-hif-simple-event-trigger
            onClick={(event) => {
              const anchor = event.currentTarget
              setSimpleEventAnchor((current) => (current ? null : anchor))
            }}
            className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
          >
            イベント一括設定{' '}
            <span className="font-normal">
              ({schedule.simpleEvents.frontSlots.length + schedule.simpleEvents.afterSelections.length})
            </span>
          </button>
        )}
        <p className="w-full text-[10px] leading-relaxed text-gray-500">
          {schedule.eventMode === 'simple'
            ? '選択したイベント結果を、日程の進捗に関係なく育成開始時から反映します。'
            : '各日程の「イベント」から発生タイミングを指定します。'}
        </p>
      </div>
      <HifBonusSettings includePItems={false} />
      {result?.simulation && (
        <details className="group rounded-xl border border-gray-200 bg-gray-50">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700">
            <span>
              {result.simulation.complete ? 'シミュレーション完了' : 'シミュレーション進行中'} ·{' '}
              {result.simulation.steps.length}日程
            </span>
            <span
              aria-hidden="true"
              className="text-xs text-gray-400 transition-transform group-open:rotate-180"
            >
              ▼
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-gray-200 p-3">
            <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-gray-600">
              <span className="rounded-full bg-yellow-50 px-2 py-1 font-semibold text-yellow-700">
                スター性 {result.simulation.finalState.starPower}
              </span>
              <span className="rounded-full bg-yellow-50 px-2 py-1 text-yellow-700">
                ワッペン {result.simulation.finalState.hifBadgeTriggerCount}/{HIF_BADGE_TRIGGER_LIMIT}回
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-1">
                Pドリンク {result.simulation.finalState.pDrinkCount}本
              </span>
              <span className="rounded-full bg-amber-50 px-2 py-1">
                Pアイテム {result.simulation.finalState.pItems.length}個
              </span>
              <span className="rounded-full bg-violet-50 px-2 py-1">
                スキルカード {result.simulation.finalState.skillCards.length}枚
              </span>
              <span className="rounded-full bg-indigo-50 px-2 py-1">
                チェンジ {result.simulation.finalState.skillCardChangeCount}回
              </span>
              <span className="rounded-full bg-green-50 px-2 py-1">
                カスタム {result.simulation.finalState.skillCardCustomCount}回
              </span>
            </div>
            <table aria-label="育成シミュレーション実行ログ" className="w-full text-xs">
              <thead>
                <tr className="text-gray-400">
                  <th className="py-2 text-left">日程 / 実行した行動</th>
                  <th className="text-pink-500">Vo</th>
                  <th className="text-blue-500">Da</th>
                  <th className="text-amber-500">Vi</th>
                </tr>
              </thead>
              <tbody>
                {result.simulation.steps.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100">
                    <td className="py-2 text-gray-600">
                      {log.label}
                      <span className="block text-[10px] text-gray-400">
                        {log.action}
                        {log.lessonType ? ` (${log.lessonType === 'sp' ? 'SP' : '通常'})` : ''}
                      </span>
                      <span className="block text-[9px] text-gray-400">
                        スター {log.state.starPower} / ドリンク {log.state.pDrinkCount} / Pアイテム{' '}
                        {log.state.pItems.length} / カード {log.state.skillCards.length} / チェンジ{' '}
                        {log.state.skillCardChangeCount} / カスタム {log.state.skillCardCustomCount}
                      </span>
                    </td>
                    {(['vo', 'da', 'vi'] as const).map((stat) => (
                      <td key={stat} className="text-center font-semibold text-gray-600">
                        {log.stats[stat]}
                        <span className="block text-[10px] font-normal text-gray-400">+{log.gain[stat]}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <p className="text-[11px] leading-relaxed text-gray-400">
        パラメータは日程順に加算し、選抜中は3,000、本戦はHIFボーナス込みの上限を適用します。体力の現在値・Pポイント・試験中のカード効果は再現しません。カスタムPアイテムの体力回復は記載値の累計を記録します。カードを指定しなかった効果は仮のカードで計算します。
      </p>
      {editing && (
        <HifScheduleDialog
          key={`${editing.index}-${editing.mode}-${editing.step.action}-${editing.step.param}`}
          mode={editing.mode}
          index={editing.index}
          initial={editing.step}
          anchorElement={editing.anchor}
          hif={hif}
          deck={deck}
          idolPlan={idolPlan}
          ownedBasicCards={(editing.index > 0
            ? (result?.simulation?.steps[editing.index - 1]?.state.skillCards ?? initialOwnedSkillCards)
            : initialOwnedSkillCards
          ).filter((card) => card.source === 'basic')}
          ownedSkillCards={
            editing.index > 0
              ? (result?.simulation?.steps[editing.index - 1]?.state.skillCards ?? initialOwnedSkillCards)
              : initialOwnedSkillCards
          }
          onClose={() => setEditing(null)}
          onLessonTypeChange={(step) => {
            // SPだけを切り替えて閉じても、表示中のレッスン設定を保存する。
            const next = confirmHifScheduleStep(schedule, editing.index, step, 'schedule')
            setHifConfig(syncHifSchedule(hif, next))
            runCalculation()
          }}
          onConfirm={(step, settings) => {
            const next = confirmHifScheduleStep(schedule, editing.index, step, editing.mode)
            const updated = syncHifSchedule({ ...hif, ...settings }, next)
            setHifConfig(updated)
            setEditing(null)
            runCalculation()
            if (editing.mode === 'schedule')
              window.dispatchEvent(
                new CustomEvent('gakumas:hif-schedule-confirmed', { detail: { index: editing.index } }),
              )
            if (getHifScheduleProgress(next) === HIF_SCHEDULE.length)
              setMessage(
                editing.mode === 'event'
                  ? 'イベント設定を保存し、育成シミュレーションを再実行しました。'
                  : '',
              )
            else
              setMessage(
                editing.mode === 'event' ? 'イベント設定を保存し、確定済みの日程を再計算しました。' : '',
              )
          }}
        />
      )}
      {simpleEventAnchor && schedule.eventMode === 'simple' && (
        <HifSimpleEventDialog
          anchorElement={simpleEventAnchor}
          deck={deck}
          value={schedule.simpleEvents}
          supportEventSkillCardsUpgraded={schedule.supportEventSkillCardsUpgraded}
          initialOwnedSkillCards={initialOwnedSkillCards}
          plan={idolPlan}
          onClose={() => setSimpleEventAnchor(null)}
          onChange={(simpleEvents) => {
            setHifConfig({ schedule: { ...schedule, simpleEvents } })
            runCalculation()
          }}
        />
      )}
      {viewingDetail && result?.simulation?.steps[viewingDetail.index] && (
        <HifScheduleDetailDialog
          key={`${viewingDetail.index}-${result.simulation.steps[viewingDetail.index].id}`}
          step={result.simulation.steps[viewingDetail.index]}
          anchorElement={viewingDetail.anchor}
          onClose={() => setViewingDetail(null)}
        />
      )}
    </div>
  )
}
