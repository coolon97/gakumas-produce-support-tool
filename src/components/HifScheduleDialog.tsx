import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HIF_ACTION_LABELS, HIF_SCHEDULE } from '@/data/hif-schedule'
import {
  HIF_CLASS_SCHEDULE,
  HIF_LESSON_SCHEDULE,
  getHifAdjustedStarPower,
  getHifLessonStarPower,
} from '@/data/hif'
import type {
  HifClassCardAction,
  HifClassSkillCardSelection,
  HifScheduleStep,
  HifSkillCardSelection,
  HifSupportEventSelection,
} from '@/types/hif-schedule'
import type { HifConfig, IdolPlan } from '@/types/produce'
import type { DeckCard } from '@/types/card'
import { PARAMS, PARAM_LABELS } from './HifPublicLessons'
import { HifScheduleIcon } from './HifScheduleIcon'
import { HifExamAllocation } from './HifExamAllocation'
import { HIF_SELECTION_EXAMS } from '@/data/hif-selection-exams'
import {
  getHifSelectionExamConfiguredReward,
  getHifSelectionExamConfiguredStarPower,
} from '@/lib/calculator/hif-selection-exams'
import { cn } from '@/lib/utils'
import { getConsultationCardsBeforeAction, HifConsultationSettings } from './HifConsultationSettings'
import { HifSkillCardSelectionFields } from './HifSkillCardSelectionFields'
import { HifScheduleEventSettings } from './HifScheduleEventSettings'
import { getIntervalCardsBeforeAction, HifIntervalSettings } from './HifIntervalSettings'
import { HifOutingSettings } from './HifOutingSettings'
import { HIF_FINAL_ROUNDS } from '@/data/hif-final-rounds'
import { getHifFinalRoundStarPower } from '@/lib/calculator/hif-final-rounds'
import type { ProduceSkillCardState } from '@/types/calculator'
import { HifBasicCardDeletionDialog } from './HifBasicCardDeletionDialog'
import { getCustomPItemEffect, matchesCustomPItemAction } from '@/lib/calculator/hif-custom-p-item'
import {
  createCarryoverSkillCard,
  createChangedSkillCard,
  createClassSelectedCard,
  createScheduledSkillCard,
  createSleepyCard,
  inferRewardSkillCard,
} from '@/lib/calculator/hif-simulation-state'
import { HifOwnedSkillCardPicker } from './HifOwnedSkillCardPicker'
import { useHifPopoverDismiss, useHifPopoverPosition } from './useHifPopover'

const INPUT = 'w-24 rounded-md border border-gray-200 px-2 py-1 text-xs'
const PARAM_ICON_COLORS = { vocal: 'bg-pink-500', dance: 'bg-sky-500', visual: 'bg-amber-400' }
const PARAM_NAMES = { vocal: 'Vocal', dance: 'Dance', visual: 'Visual' }
const PARAM_NAME_COLORS = { vocal: 'text-pink-500', dance: 'text-sky-500', visual: 'text-amber-400' }

export function HifScheduleDialog({
  mode,
  index,
  initial,
  anchorElement,
  hif,
  deck,
  idolPlan,
  ownedBasicCards,
  ownedSkillCards,
  onClose,
  onConfirm,
  onLessonTypeChange,
}: {
  mode: 'schedule' | 'event'
  index: number
  initial: HifScheduleStep
  anchorElement: HTMLElement
  hif: HifConfig
  deck: DeckCard[]
  idolPlan: IdolPlan
  ownedBasicCards: ProduceSkillCardState[]
  ownedSkillCards: ProduceSkillCardState[]
  onClose: () => void
  onConfirm: (step: HifScheduleStep, settings: Partial<HifConfig>) => void
  onLessonTypeChange: (step: HifScheduleStep) => void
}) {
  const bubble = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(() => structuredClone(initial))
  const [exam, setExam] = useState(() => hif.selectionExams[HIF_SCHEDULE[index].examIndex ?? 0])
  const [roundScore, setRoundScore] = useState(
    initial.action === 'round1' ? hif.round1Score : hif.round2Score,
  )
  const [classCardEditor, setClassCardEditor] = useState<{
    action: HifClassCardAction
    selection: HifClassSkillCardSelection
    targetCardId: string | null
    resultCard: HifSkillCardSelection
  } | null>(null)
  const [basicCardDeletionOpen, setBasicCardDeletionOpen] = useState(false)
  const compactSchedule = mode === 'schedule'
  const customStage = index >= 20 ? 3 : index >= 13 ? 2 : index >= 7 ? 1 : 0
  const customEffect =
    customStage && hif.schedule ? getCustomPItemEffect(hif.schedule.customPItem, customStage) : null
  const stageStart = customStage === 3 ? 20 : customStage === 2 ? 13 : 7
  const customUsesBefore = customEffect
    ? (hif.schedule?.steps
        .slice(stageStart, index)
        .filter((item) => item.action && matchesCustomPItemAction(customEffect.route, item.action)).length ??
      0)
    : 0
  const customCardOperation =
    mode === 'schedule' &&
    customEffect?.card &&
    step.action &&
    customUsesBefore < customEffect.limit &&
    matchesCustomPItemAction(customEffect.route, step.action)
      ? customEffect.card
      : null
  const preferredWidth =
    mode === 'event'
      ? 720
      : initial.action === 'lesson'
        ? customCardOperation
          ? 300
          : 180
        : ['class', 'training', 'rest'].includes(initial.action!)
          ? 240
          : 280
  const position = useHifPopoverPosition(anchorElement, panel, {
    preferredWidth,
    fallbackHeight: 480,
    mode: 'scrollable',
  })
  useHifPopoverDismiss(bubble, onClose, '[data-hif-schedule-trigger]')
  const day = HIF_SCHEDULE[index]
  const selectedOwnedBasicCardIds = (exam.deletedBasicCardIds ?? []).filter((id) =>
    ownedBasicCards.some((card) => card.id === id),
  )
  const isLesson = step.action === 'lesson'
  const lessonType = step.lessonType === 'sp' ? 'sp' : 'normal'
  const lessonGain = day.lessonIndex === undefined ? null : HIF_LESSON_SCHEDULE[day.lessonIndex][lessonType]
  const adjustedStarPower = (base: number) => getHifAdjustedStarPower(base, hif.starPowerAffinityBonus)
  const roundIndex = step.action === 'round1' ? 0 : 1
  const roundDefinition = HIF_FINAL_ROUNDS[roundIndex]
  const lessonStarPower =
    day.lessonIndex === undefined ? 0 : adjustedStarPower(getHifLessonStarPower(day.lessonIndex, lessonType))
  const previousSteps = hif.schedule?.steps.slice(0, index) ?? []
  const customTargetRequired =
    customCardOperation && customCardOperation !== 'gain' && customCardOperation !== 'gain_upgraded'
  const customResultRequired =
    customCardOperation === 'gain' ||
    customCardOperation === 'gain_upgraded' ||
    customCardOperation === 'change'
  const customTroubleAllowed =
    customStage === 3 &&
    (customEffect?.route === 'outing' ||
      (customEffect?.route === 'supply' && hif.schedule?.customPItem.decoration === 'medal'))
  const sameDayCards =
    step.action === 'supply'
      ? [createScheduledSkillCard(step.supplySkillCard, idolPlan, 'supply', index)]
      : step.action === 'outing'
        ? [
            ...step.outing.skillCards
              .slice(0, step.outing.reward === 'one_card' ? 1 : 2)
              .flatMap((selection, slot) =>
                selection ? [createScheduledSkillCard(selection, idolPlan, 'outing', index, slot)] : [],
              ),
            ...(step.outing.reward === 'two_cards_sleepy' ? [createSleepyCard(index, 'outing')] : []),
          ]
        : []
  const consultationOwnedCards = [
    ...ownedSkillCards,
    ...hif.carryoverSkillCards.flatMap((selection, slot) =>
      selection.enabled &&
      ((index === 0 && selection.acquireOnDayOne) || (index === 6 && !selection.acquireOnDayOne))
        ? [createCarryoverSkillCard(selection, idolPlan, slot)]
        : [],
    ),
  ]
  const frontSlot = step.pItemSlots[0]
  const frontReward = frontSlot === undefined ? undefined : deck[frontSlot]?.card.supportEventRewards?.[0]
  let eventOwnedCards = consultationOwnedCards.map((card) => ({ ...card, effectTags: [...card.effectTags] }))
  if (step.action === 'consultation')
    eventOwnedCards = getConsultationCardsBeforeAction(
      eventOwnedCards,
      step.consultation.skillActions,
      step.consultation.skillActions.length,
      idolPlan,
      index,
    )
  else if (step.action === 'interval')
    eventOwnedCards = getIntervalCardsBeforeAction(
      eventOwnedCards,
      step.interval.skillActions,
      step.interval.skillActions.length,
      idolPlan,
      index,
    )
  else if (step.action === 'class') {
    if (step.classSettings.action === 'gain')
      eventOwnedCards.push(createClassSelectedCard(step.classSettings.selection, idolPlan, index))
    else {
      const targetIndex = eventOwnedCards.findIndex((card) => card.id === step.classSettings.targetCardId)
      if (targetIndex >= 0 && step.classSettings.resultCard)
        eventOwnedCards[targetIndex] = createChangedSkillCard(
          eventOwnedCards[targetIndex],
          `class-changed:${index}`,
          step.classSettings.resultCard,
          idolPlan,
        )
      if (step.classSettings.action === 'change_sleepy' && targetIndex >= 0 && step.classSettings.resultCard)
        eventOwnedCards.push(createSleepyCard(index))
    }
  } else eventOwnedCards.push(...sameDayCards)
  if (step.action === 'exam' && day.examIndex !== undefined && day.examIndex < 2) {
    const deleted = new Set(exam.deletedBasicCardIds)
    eventOwnedCards = eventOwnedCards.filter((card) => card.source !== 'basic' || !deleted.has(card.id))
  }
  if (frontReward?.kind === 'skill_card' && frontSlot !== undefined)
    eventOwnedCards.push(
      inferRewardSkillCard(
        frontReward,
        `support:${frontSlot}:${index}`,
        step.frontSkillCard,
        idolPlan,
        deck[frontSlot].card.id,
        hif.schedule?.supportEventSkillCardsUpgraded ?? true,
      ),
    )
  const customTargets = [...ownedSkillCards, ...sameDayCards].filter(
    (card) =>
      card.source !== 'idol' &&
      (customTroubleAllowed || card.name !== '眠気') &&
      (customCardOperation !== 'upgrade' || !card.upgraded),
  )
  const customCardSettings = step.customPItemCard ?? { targetCardId: null, resultCard: null }
  const wasFrontUsedBefore = (slot: number) => previousSteps.some((s) => s.pItemSlots.includes(slot))
  const wasAfterUsedBefore = (slot: number, eventIndex: number) =>
    previousSteps.some((s) =>
      s.postEventSelection
        ? s.postEventSelection.slot === slot && s.postEventSelection.eventIndex === eventIndex
        : false,
    )
  const selectFrontEvent = (slot: number, selection?: HifSkillCardSelection | null) =>
    setStep({
      ...step,
      pItemSlots: selection || step.pItemSlots[0] !== slot ? [slot] : [],
      frontSkillCard: selection ?? null,
    })
  const selectAfterEvent = (selection: HifSupportEventSelection | null) =>
    setStep({ ...step, postEventSelection: selection })
  const consultationResetAvailable = !(
    hif.schedule?.steps.some((item, itemIndex) => itemIndex !== index && item.consultation?.resetUsed) ??
    false
  )
  const classActionOptions: HifClassCardAction[] =
    day.classIndex !== undefined && day.classIndex < 2
      ? ['gain', 'change_sleepy']
      : ['change', 'change_sleepy']
  const openClassCardEditor = (action: HifClassCardAction) => {
    const selection = structuredClone(step.classSettings.selection)
    if (action === 'gain' && selection.rarity === 'basic_name') selection.rarity = 'R'
    if (action === 'gain') selection.upgraded = false
    setClassCardEditor({
      action,
      selection,
      targetCardId: step.classSettings.targetCardId ?? null,
      resultCard: structuredClone(
        step.classSettings.resultCard ?? {
          category: 'active',
          rarity: 'R',
          skillKind: 'other',
          energy: false,
          preservation: false,
        },
      ),
    })
  }
  const valid =
    mode === 'event' ||
    ((!isLesson || (step.param !== null && step.subParam !== null)) &&
      (step.action !== 'outing' ||
        step.outing.skillCards.slice(0, step.outing.reward === 'one_card' ? 1 : 2).every(Boolean)))
  const confirm = (confirmedStep = step) => {
    if (!valid) return
    const settings: Partial<HifConfig> = {}
    if (mode === 'schedule' && day.examIndex !== undefined)
      settings.selectionExams = hif.selectionExams.map((item, i) => (i === day.examIndex ? exam : item))
    if (mode === 'schedule' && confirmedStep.action === 'round1') settings.round1Score = roundScore
    if (mode === 'schedule' && confirmedStep.action === 'round2') settings.round2Score = roundScore
    onConfirm(confirmedStep, settings)
  }
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={bubble}
      role="dialog"
      aria-modal="false"
      aria-labelledby="hif-day-title"
      data-scroll-lock-overlay
      data-tutorial-schedule-dialog={index}
      data-hif-action={step.action ?? undefined}
      style={
        position
          ? { left: position.left, top: position.top, width: position.width }
          : { left: 12, top: 12, width: 'calc(100vw - 24px)', visibility: 'hidden' }
      }
      className="fixed z-50"
    >
      {position && (
        <span
          aria-hidden="true"
          style={{ left: position.arrowLeft - 7 }}
          className={cn(
            'absolute z-20 h-3.5 w-3.5 rotate-45 bg-white',
            position.placement === 'bottom'
              ? '-top-[7px] border-l border-t border-gray-200'
              : '-bottom-[7px] border-b border-r border-gray-200',
          )}
        />
      )}
      <div
        ref={panel}
        data-hif-dialog-scroll
        style={position ? { maxHeight: position.maxHeight } : undefined}
        className="overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5"
      >
        <div
          className={cn(
            'sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white',
            compactSchedule ? 'px-2 py-2' : 'px-4 py-3',
          )}
        >
          <h3
            id="hif-day-title"
            className={cn(
              'min-w-0 truncate font-bold text-gray-800',
              compactSchedule && 'whitespace-nowrap text-[11px]',
            )}
          >
            {mode === 'event' ? (
              `${day.label} · イベント`
            ) : (
              <>
                {day.label}
                {day.label.endsWith(HIF_ACTION_LABELS[step.action!])
                  ? ''
                  : ` · ${HIF_ACTION_LABELS[step.action!]}`}
              </>
            )}
          </h3>
          <button
            type="button"
            aria-label={mode === 'event' ? 'イベント設定を閉じる' : '日程設定を閉じる'}
            onClick={onClose}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500',
              compactSchedule ? 'h-6 w-6 text-xs' : 'px-2 py-1',
            )}
          >
            ×
          </button>
        </div>
        <div className={cn(compactSchedule ? 'space-y-3 p-2' : 'space-y-5 p-4')}>
          {mode === 'schedule' && (isLesson || step.action === 'class') && (
            <section>
              {isLesson ? (
                <>
                  <div>
                    {lessonGain && (
                      <p className="mb-2 text-[10px] font-medium text-gray-600">
                        メイン +{lessonGain.main} / サブ +{lessonGain.sub} / スター性 +{lessonStarPower}
                      </p>
                    )}
                    <p className="mb-2 whitespace-nowrap text-[10px] font-semibold text-gray-500">
                      サブステータスを選択してください
                    </p>
                    <div role="group" aria-label="日程のサブ属性選択" className="flex justify-center gap-2">
                      {PARAMS.filter((param) => param !== step.param).map((param) => (
                        <div key={param} className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            aria-pressed={step.subParam === param}
                            aria-label={`サブ ${PARAM_LABELS[param]}`}
                            title={`サブ ${PARAM_LABELS[param]}`}
                            onClick={() =>
                              customCardOperation
                                ? setStep({ ...step, subParam: param })
                                : confirm({ ...step, subParam: param })
                            }
                            className={cn(
                              'relative flex h-16 w-16 items-center justify-center rounded-xl border-2 text-white shadow-sm transition-transform hover:scale-105',
                              PARAM_ICON_COLORS[param],
                              step.subParam === param
                                ? 'border-blue-800 ring-2 ring-blue-200'
                                : 'border-white',
                            )}
                          >
                            <HifScheduleIcon action="lesson" param={param} className="h-9 w-9" />
                          </button>
                          <span className={cn('text-[10px] font-bold', PARAM_NAME_COLORS[param])}>
                            {PARAM_NAMES[param]}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <span className="text-[11px] font-semibold text-gray-500">SP</span>
                      <button
                        type="button"
                        role="switch"
                        aria-label="SPレッスン"
                        aria-checked={step.lessonType === 'sp'}
                        onClick={() => {
                          const nextType = step.lessonType === 'sp' ? 'normal' : 'sp'
                          const nextStep: HifScheduleStep = { ...step, lessonType: nextType }
                          setStep(nextStep)
                          onLessonTypeChange(nextStep)
                        }}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors',
                          step.lessonType === 'sp' ? 'bg-orange-500' : 'bg-gray-300',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                            step.lessonType === 'sp' ? 'translate-x-5' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
              {step.action === 'class' && (
                <>
                  <p className="text-[10px] font-medium text-gray-600">
                    {PARAM_LABELS[step.param]} +{HIF_CLASS_SCHEDULE[day.classIndex!].gain}{' '}
                    <span className="text-gray-400">（LB対象外）</span>
                  </p>
                  <div className="mt-2">
                    <p className="mb-1.5 text-[10px] font-semibold text-gray-500">カード効果</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {classActionOptions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          aria-pressed={step.classSettings.action === action}
                          onClick={() => openClassCardEditor(action)}
                          className={cn(
                            'rounded-lg border px-1.5 py-2 text-[10px] font-semibold leading-tight',
                            step.classSettings.action === action
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300',
                          )}
                        >
                          {action === 'gain'
                            ? 'スキルカードを獲得'
                            : action === 'change'
                              ? 'スキルカードをチェンジ'
                              : 'スキルカードをチェンジ（+眠気獲得）'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
          {mode === 'schedule' && day.examIndex !== undefined && (
            <section className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={exam.useScoreCap}
                  onChange={(e) => setExam({ ...exam, useScoreCap: e.target.checked })}
                />
                上限スコア（{HIF_SELECTION_EXAMS[day.examIndex].scoreCap.toLocaleString()}）
              </label>
              {!exam.useScoreCap && (
                <label className="flex items-center justify-between gap-2 text-xs text-gray-600">
                  獲得スコア
                  <input
                    aria-label="選抜試験の獲得スコア"
                    type="number"
                    min={0}
                    max={99999999}
                    value={exam.totalScore}
                    onChange={(e) => setExam({ ...exam, totalScore: Number(e.target.value) })}
                    className={INPUT}
                  />
                </label>
              )}
              <HifExamAllocation
                label={day.label}
                exam={exam}
                examIndex={day.examIndex}
                onChange={(update) => setExam({ ...exam, ...update })}
              />
              <p className="text-[10px] font-medium text-blue-600">
                報酬{' '}
                {Object.entries(getHifSelectionExamConfiguredReward(day.examIndex, exam))
                  .map(([k, n]) => `${k.toUpperCase()} +${n}`)
                  .join(' / ')}{' '}
                <span className="text-gray-400">（LB前）</span>
              </p>
              {!exam.useScoreCap &&
                exam.totalScore > 0 &&
                exam.totalScore < HIF_SELECTION_EXAMS[day.examIndex].scoreCap && (
                  <p className="text-[11px] leading-relaxed text-red-600">
                    ※上限未満のスコアに対する獲得パラメータは推定値のため、正しくない場合があります。
                  </p>
                )}
              <p className="text-[10px] font-semibold text-amber-600">
                スター性 +{adjustedStarPower(getHifSelectionExamConfiguredStarPower(day.examIndex, exam))}
              </p>
              {day.examIndex < 2 && (
                <>
                  <button
                    type="button"
                    data-tutorial-basic-card-deletion-open
                    onClick={() => setBasicCardDeletionOpen(true)}
                    className="w-full rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs font-semibold text-red-700 hover:border-red-400"
                  >
                    基本カード削除{' '}
                    <span className="font-normal">（{selectedOwnedBasicCardIds.length}/2）</span>
                  </button>
                  {selectedOwnedBasicCardIds.length > 0 && (
                    <p className="text-[9px] leading-relaxed text-gray-500">
                      {selectedOwnedBasicCardIds
                        .map((id) => ownedBasicCards.find((card) => card.id === id)?.name)
                        .filter(Boolean)
                        .join(' / ')}
                    </p>
                  )}
                </>
              )}
            </section>
          )}
          {mode === 'schedule' && (step.action === 'round1' || step.action === 'round2') && (
            <section className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs text-gray-600">
                <span>{step.action === 'round1' ? '獲得スコア（補正前）' : '獲得スコア'}</span>
                <input
                  aria-label={`${roundDefinition.label}の獲得スコア`}
                  type="number"
                  min={0}
                  max={roundDefinition.scoreInputMax}
                  step={1000}
                  value={roundScore}
                  onChange={(e) =>
                    setRoundScore(
                      Math.max(0, Math.min(roundDefinition.scoreInputMax, Number(e.target.value))),
                    )
                  }
                  className={INPUT}
                />
              </label>
              <p className="text-right text-[9px] tabular-nums text-gray-400">
                最大 {roundDefinition.scoreInputMax.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold text-amber-600">
                スター性 +{adjustedStarPower(getHifFinalRoundStarPower(roundIndex, roundScore))}
              </p>
            </section>
          )}
          {mode === 'schedule' && step.action === 'interval' && (
            <HifIntervalSettings
              value={step.interval}
              plan={idolPlan}
              ownedSkillCards={ownedSkillCards}
              dayIndex={index}
              onChange={(interval) => setStep({ ...step, interval })}
            />
          )}
          {mode === 'schedule' && step.action === 'outing' && (
            <HifOutingSettings
              value={step.outing}
              plan={idolPlan}
              onChange={(outing) => setStep({ ...step, outing })}
            />
          )}
          {mode === 'schedule' && step.action === 'consultation' && (
            <HifConsultationSettings
              value={step.consultation}
              plan={idolPlan}
              ownedSkillCards={consultationOwnedCards}
              dayIndex={index}
              compact
              resetAvailable={consultationResetAvailable}
              onChange={(consultation) => setStep({ ...step, consultation })}
            />
          )}
          {mode === 'schedule' && step.action === 'supply' && (
            <section className="space-y-2">
              <p className="text-[10px] font-medium text-gray-600">Pドリンク +1 / スキルカード +1</p>
              <p className="text-[10px] font-semibold text-gray-500">獲得カード</p>
              <HifSkillCardSelectionFields
                value={step.supplySkillCard}
                plan={idolPlan}
                namePrefix={`supply-${index}`}
                compact
                showUpgraded
                onChange={(supplySkillCard) => setStep({ ...step, supplySkillCard })}
              />
            </section>
          )}
          {customCardOperation && (
            <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
              <p className="text-[10px] font-semibold text-amber-800">
                カスタムPアイテム：
                {customCardOperation === 'gain'
                  ? 'カード獲得'
                  : customCardOperation === 'gain_upgraded'
                    ? '強化済みカード獲得'
                    : customCardOperation === 'change'
                      ? 'セレクトチェンジ'
                      : customCardOperation === 'copy'
                        ? 'カードをコピー'
                        : customCardOperation === 'upgrade'
                          ? 'カードを強化'
                          : 'カードを削除'}
              </p>
              {customTargetRequired && (
                <label className="block text-[10px] font-semibold text-gray-600">
                  対象カード
                  <select
                    aria-label="カスタムPアイテムの対象カード"
                    value={customCardSettings.targetCardId ?? ''}
                    onChange={(event) =>
                      setStep({
                        ...step,
                        customPItemCard: { ...customCardSettings, targetCardId: event.target.value || null },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-normal"
                  >
                    <option value="">自動選択（暫定）</option>
                    {customTargets.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                        {card.rarity ? ` · ${card.rarity}` : ''}
                        {card.upgraded ? ' · 強化済み' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {customResultRequired && (
                <>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={Boolean(customCardSettings.resultCard)}
                      onChange={(event) =>
                        setStep({
                          ...step,
                          customPItemCard: {
                            ...customCardSettings,
                            resultCard: event.target.checked
                              ? {
                                  category: 'active',
                                  rarity: 'R',
                                  skillKind: 'other',
                                  energy: false,
                                  preservation: false,
                                }
                              : null,
                          },
                        })
                      }
                    />
                    {customCardOperation === 'change' ? 'チェンジ後' : '獲得した'}カードの内容を指定
                  </label>
                  {customCardSettings.resultCard && (
                    <HifSkillCardSelectionFields
                      value={customCardSettings.resultCard}
                      plan={idolPlan}
                      namePrefix={`custom-item-${index}`}
                      compact
                      showUpgraded={customCardOperation === 'gain'}
                      onChange={(resultCard) =>
                        setStep({ ...step, customPItemCard: { ...customCardSettings, resultCard } })
                      }
                    />
                  )}
                </>
              )}
              <p className="text-[9px] leading-relaxed text-gray-500">
                未指定の対象・カード内容は暫定値です。対象は前日までの所持カードと当日の行動で獲得したカードから選べます。
              </p>
            </section>
          )}
          {mode === 'schedule' && step.action === 'training' && (
            <section>
              <p className="mb-2 text-[10px] font-semibold text-gray-500">カスタム回数</p>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="特別指導のカスタム回数">
                {([0, 1, 2] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={step.trainingCustomCount === count}
                    onClick={() => confirm({ ...step, trainingCustomCount: count })}
                    className={cn(
                      'rounded-lg border px-1 py-2 text-[10px] font-semibold leading-tight',
                      step.trainingCustomCount === count
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300',
                    )}
                  >
                    {count === 0 ? 'カスタムしない' : `${count}回カスタム`}
                  </button>
                ))}
              </div>
            </section>
          )}
          {mode === 'schedule' &&
            ![
              'lesson',
              'class',
              'exam',
              'round1',
              'round2',
              'interval',
              'outing',
              'consultation',
              'supply',
              'training',
            ].includes(step.action!) && <p className="text-[11px] text-gray-500">この日程で確定します。</p>}
          {mode === 'event' && (
            <HifScheduleEventSettings
              deck={deck}
              step={step}
              ownedSkillCards={eventOwnedCards}
              plan={idolPlan}
              wasFrontUsedBefore={wasFrontUsedBefore}
              wasAfterUsedBefore={wasAfterUsedBefore}
              onSelectFront={selectFrontEvent}
              onSelectAfter={selectAfterEvent}
            />
          )}
        </div>
        {classCardEditor && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 p-4"
            data-hif-class-card-editor
            data-scroll-lock-overlay
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="class-card-action-title"
              className={`max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl ${classCardEditor.action === 'gain' ? 'max-w-xs' : 'max-w-sm'}`}
            >
              <h4 id="class-card-action-title" className="text-sm font-bold text-gray-800">
                {classCardEditor.action === 'gain' ? '獲得するスキルカード' : 'チェンジ元のスキルカード'}
              </h4>
              {classCardEditor.action === 'gain' ? (
                <HifSkillCardSelectionFields
                  value={classCardEditor.selection}
                  plan={idolPlan}
                  namePrefix={`class-${index}`}
                  onChange={(selection) => setClassCardEditor({ ...classCardEditor, selection })}
                />
              ) : (
                <>
                  <HifOwnedSkillCardPicker
                    cards={ownedSkillCards}
                    value={classCardEditor.targetCardId}
                    name={`class-change-${index}`}
                    onChange={(targetCardId) => setClassCardEditor({ ...classCardEditor, targetCardId })}
                  />
                  <h5 className="mt-4 border-t border-gray-100 pt-3 text-xs font-bold text-gray-700">
                    チェンジ後のカード
                  </h5>
                  <HifSkillCardSelectionFields
                    value={classCardEditor.resultCard}
                    plan={idolPlan}
                    namePrefix={`class-result-${index}`}
                    compact
                    onChange={(resultCard) => setClassCardEditor({ ...classCardEditor, resultCard })}
                  />
                </>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setClassCardEditor(null)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={
                    classCardEditor.action !== 'gain' &&
                    !ownedSkillCards.some((card) => card.id === classCardEditor.targetCardId)
                  }
                  onClick={() => {
                    confirm({
                      ...step,
                      classSettings: {
                        action: classCardEditor.action,
                        selection:
                          classCardEditor.action === 'gain'
                            ? { ...classCardEditor.selection, upgraded: false }
                            : classCardEditor.selection,
                        ...(classCardEditor.action === 'gain'
                          ? {}
                          : {
                              targetCardId: classCardEditor.targetCardId,
                              resultCard: classCardEditor.resultCard,
                            }),
                      },
                    })
                    setClassCardEditor(null)
                  }}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        {basicCardDeletionOpen && day.examIndex !== undefined && day.examIndex < 2 && (
          <HifBasicCardDeletionDialog
            cards={ownedBasicCards}
            selectedIds={exam.deletedBasicCardIds ?? []}
            onCancel={() => setBasicCardDeletionOpen(false)}
            onConfirm={(deletedBasicCardIds) => {
              setExam({ ...exam, deletedBasicCardIds })
              setBasicCardDeletionOpen(false)
            }}
          />
        )}
        {!(
          mode === 'schedule' &&
          ((isLesson && !customCardOperation) || step.action === 'training' || step.action === 'class')
        ) && (
          <div
            className={cn(
              'sticky bottom-0 flex border-t border-gray-100 bg-white',
              compactSchedule ? 'gap-1.5 p-2' : 'gap-2 p-4',
            )}
          >
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'rounded-lg border border-gray-200 text-gray-500',
                compactSchedule ? 'px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              )}
            >
              キャンセル
            </button>
            <button
              type="button"
              data-tutorial-exam-confirm={day.examIndex === 0 ? 'true' : undefined}
              disabled={!valid}
              onClick={() => confirm()}
              className={cn(
                'flex-1 rounded-lg bg-blue-600 font-semibold text-white disabled:opacity-40',
                compactSchedule ? 'px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              )}
            >
              {mode === 'event'
                ? 'イベント設定を保存'
                : index === HIF_SCHEDULE.length - 1
                  ? '確定して開始'
                  : '確定'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
