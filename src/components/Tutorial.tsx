import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { readStoredInput, writeStoredInput } from '@/lib/input-storage'
import { HIF_SCHEDULE } from '@/data/hif-schedule'
import type { TutorialProgress } from '@/types/tutorial'

const TUTORIAL_VERSION = 13
const STORAGE_KEY = 'tutorial.version'
const EXAM1_INDEX = HIF_SCHEDULE.findIndex((day) => day.examIndex === 0)
const ROUND1_INDEX = HIF_SCHEDULE.findIndex((day) => day.actions[0] === 'round1')
const ROUND2_INDEX = HIF_SCHEDULE.findIndex((day) => day.actions[0] === 'round2')

type TutorialStep = {
  id: string
  title: string
  description: string
  target?: string
  interactive?: boolean
}

type HighlightRect = {
  top: number
  left: number
  width: number
  height: number
  right: number
  bottom: number
}

const STEPS: TutorialStep[] = [
  {
    id: 'intro',
    title: 'H.I.F評価 理論値計算ツールへようこそ！',
    description:
      '本ツールは学園アイドルマスターの育成シナリオ「H.I.F」におけるプロデュース評価の理論値を計算するツールです。\n本チュートリアルでは、実際に操作しながらツールの使用方法を確認いただけます。',
  },
  {
    id: 'idol-open',
    title: '1. Pアイドルを設定しよう',
    description:
      'まずはPアイドルを設定します。青枠で囲まれたスロットをクリックして、Pアイドル選択画面を開いてください。',
    target: '[data-tutorial="idol"]',
    interactive: true,
  },
  {
    id: 'idol-select',
    title: '2. Pアイドルを選んでみよう',
    description: '一覧から育成するPアイドルを1人選んでください。検索や絞り込みも使用できます。',
    target: '[data-tutorial="idol-list"]',
    interactive: true,
  },
  {
    id: 'idol-talent',
    title: '3. 才能開花を設定しよう',
    description: '育成するPアイドルの才能開花段階を選んでください。',
    target: '[data-tutorial="talent"]',
    interactive: true,
  },
  {
    id: 'preparation-intro',
    title: 'プロデュース準備',
    description:
      '次にプロデュースの準備をします。本アプリではサポートカード編成とメモリー補正を自由に設定できます。',
    target: '[data-tutorial="produce-preparation"]',
  },
  {
    id: 'support-open',
    title: '4. サポートカードを編成しよう',
    description:
      'まずはサポートカードを編成します。プロデュース準備の「サポートカード編成」にある青枠の空きスロットをクリックして、サポートカード選択画面を開いてください。',
    interactive: true,
  },
  {
    id: 'support-select',
    title: '5. サポートカードを選んでみよう',
    description:
      '編成したいサポートカードを1枚選んでください。\n選択したカードは先ほどの編成スロットへ登録されます。',
    target: '[data-tutorial="support-list"]',
    interactive: true,
  },
  {
    id: 'support-confirm',
    title: '6. サポートカードの登録を確認しよう',
    description:
      '選択したサポートカードが編成スロットに登録されました。\n凸アイコンをクリックするとサポートカードのレベルを変更できます。',
    target: '[data-tutorial-deck-slot="0"]',
  },
  {
    id: 'support-fill',
    title: '7. サポートカード編成を完成させよう',
    description: '同様にして計6種類のサポートカードを登録しましょう。今回は残り5種類をこちらで登録しました。',
    target: '[data-tutorial="deck"]',
  },
  {
    id: 'memory',
    title: '8. メモリー設定を入力しよう',
    description: 'メモリー設定では、編成メモリーによる初期ステータスとレッスンボーナスの補正を設定できます。',
    target: '[data-tutorial="memory"]',
  },
  {
    id: 'status-total',
    title: 'ステータス合計を確認しよう',
    description: 'サポートカードとメモリー補正を反映した最終的なステータスがこちらに表示されます。',
    target: '[data-tutorial="status-total"]',
  },
  {
    id: 'produce-settings-intro',
    title: 'プロデュース設定',
    description:
      '次にプロデュースの設定を行います。持ち込みスキルカードと、H.I.Fのスケジュールを設定しましょう。',
    target: '[data-tutorial="produce-settings"]',
  },
  {
    id: 'carryover',
    title: '9. 持ち込みスキルカードを設定しよう',
    description:
      '持ち込むスキルカードは最大4枚まで設定できます。カードの効果やレアリティ、獲得するタイミングを指定できます。',
    target: '[data-tutorial="carryover"]',
  },
  {
    id: 'carryover-card1',
    title: '10. 持ち込みスキルカードを1枚設定してみよう',
    description:
      '「使用する」チェックを入れるとスキルカードの詳細が入力できるようになります。1枚目の持ち込みスキルカードの効果とレアリティ、強化状態と開始時に獲得するかどうかを設定してください。設定が完了したら「設定を完了」を押してください。',
    target: '[data-tutorial-carryover-card="0"]',
    interactive: true,
  },
  {
    id: 'schedule-intro',
    title: '11. プロデュースのスケジュールを入力しよう',
    description:
      '続いて、こちらのスケジュール表にH.I.Fのスケジュールを1日分ずつ順に入力します。まずは第1週の1日目を入力してみましょう。',
    target: '[data-tutorial="schedule-grid"]',
  },
  {
    id: 'schedule-day1',
    title: '12. 1日目を入力しよう',
    description: 'アイコンをクリックして、1日目の行動を選択しましょう。',
    interactive: true,
  },
  {
    id: 'day1-event',
    title: '13. サポートイベントを設定しよう',
    description: '「イベント」ボタンから、サポートイベントの発生タイミングを設定できます。',
    target: '[data-tutorial-event="0"]',
  },
  {
    id: 'day1-detail',
    title: '14. 日程終了時の詳細を確認しよう',
    description: '「詳細」ボタンから、その日終了時点でのパラメータや各種所持状況を確認できます。',
    target: '[data-tutorial-detail="0"]',
  },
  {
    id: 'schedule-day2-open',
    title: '公開レッスンを設定しよう',
    description:
      '次はレッスンのスケジュールを登録します。レッスンアイコンを押してください。選んだアイコンの属性がメインパラメータになります。',
    target: '[data-tutorial-lesson-main="1"]',
    interactive: true,
  },
  {
    id: 'schedule-day2-settings',
    title: 'サブパラメータとSPレッスンを設定しよう',
    description:
      'サブパラメータの属性とSPレッスンか否かを設定できます。サブパラメータに指定したい属性のアイコンを押すと確定します。\nSPトグルを有効にするとその公開レッスンはSPレッスン扱いとなります。',
    interactive: true,
  },
  {
    id: 'week1-fill',
    title: '15. 3～6日目を入力します',
    description: '3～6日目も同様に入力します。\n今回はこちらで入力しておきました。',
    target: '[data-tutorial-week-fill="true"]',
  },
  {
    id: 'exam1',
    title: '16. 選抜試験1の結果を入力しよう',
    description: '選抜7日目の試験1をクリックしてください。',
    interactive: true,
  },
  {
    id: 'exam1-delete-open',
    title: '17. 削除する基本カードを選ぼう',
    description: '試験後に削除する基本カードを選択します。\n「基本カード削除」を押してください。',
    target: '[data-tutorial-basic-card-deletion-open]',
    interactive: true,
  },
  {
    id: 'exam1-delete-select',
    title: '18. 削除する2枚を選ぼう',
    description: '現在所持している基本カードが表示されます。2枚選び「OK」を押してください。',
    target: '[data-tutorial-basic-card-deletion]',
    interactive: true,
  },
  {
    id: 'exam1-confirm',
    title: '19. 試験設定を確定しよう',
    description: '基本カードを選択したら「確定」を押してください。',
    target: '[data-tutorial-exam-confirm="true"]',
    interactive: true,
  },
  {
    id: 'exam1-custom',
    title: '20. カスタムPアイテムを選ぼう',
    description: '獲得するカスタムPアイテムを1つ選んでください。次の試験後のカスタマイズにも引き継がれます。',
    target: '[data-hif-custom-p-item-stage="1"]',
    interactive: true,
  },
  {
    id: 'week2-fill',
    title: '21. 2週目を入力しよう',
    description: '同様にして2週目も入力します。\n今回はこちらで入力しておきました。',
    target: '[data-tutorial-schedule-column="選抜 8〜13日"]',
  },
  {
    id: 'schedule-next',
    title: '22. スケジュール後半へ移動しよう',
    description: 'こちらのボタンでスケジュール後半に切り替えます。',
    target: '[data-tutorial="schedule-next"]',
    interactive: true,
  },
  {
    id: 'later-schedule',
    title: '23. 3週目と本戦を入力しよう',
    description: '同様にして3週目と本戦も入力します。\n今回はこちらで入力しておきました',
    target: '[data-tutorial-later-column="true"]',
  },
  {
    id: 'round1',
    title: '24. 本戦ラウンド1の結果を入力しよう',
    description:
      '本戦の試験結果スコアを入力します。\nラウンド1をクリックし、補正前の獲得スコアを入力して「確定」を押してください。',
    interactive: true,
  },
  {
    id: 'round2',
    title: '25. 本戦ラウンド2の結果を結果を入力しよう',
    description: 'ラウンド2をクリックし、獲得スコアを入力して「確定して開始」を押してください。',
    interactive: true,
  },
  {
    id: 'evaluation',
    title: '26. 評価結果確認',
    description: '入力したスケジュールと試験のスコアを基に、評価値が算出されます。',
    target: '[data-tutorial="evaluation"]',
  },
  {
    id: 'breakdown',
    title: '27. パラメータと内訳',
    description: '育成終了時点でのパラメータと、サポートカード毎の寄与の内訳がこちらに表示されます。',
    target: '[data-tutorial="result-breakdown"]',
  },
  {
    id: 'finish',
    title: 'チュートリアル完了',
    description: '簡単な使い方は以上になります。\nさあ、理論値を計算しましょう！',
  },
]

export function shouldShowTutorial(): boolean {
  return readStoredInput(STORAGE_KEY, 0) < TUTORIAL_VERSION
}

export function Tutorial({
  open,
  onBegin,
  onFillSupportDeck,
  onFillFirstWeek,
  onFillSecondWeek,
  onFillLaterSchedule,
  onFillFinalInterval,
  onClose,
  onProgressChange,
}: {
  open: boolean
  onBegin: () => void
  onFillSupportDeck: () => void
  onFillFirstWeek: () => void
  onFillSecondWeek: () => void
  onFillLaterSchedule: () => void
  onFillFinalInterval: () => void
  onClose: () => void
  onProgressChange?: (progress: TutorialProgress | null) => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [domRevision, setDomRevision] = useState(0)
  const [highlight, setHighlight] = useState<HighlightRect | null>(null)
  const [coachHeight, setCoachHeight] = useState(270)
  const [transitioning, setTransitioning] = useState(false)
  const [positioning, setPositioning] = useState(false)
  const coachRef = useRef<HTMLElement>(null)
  const primaryButton = useRef<HTMLButtonElement>(null)
  const transitionTimer = useRef<number | null>(null)
  const step = STEPS[stepIndex]

  const finish = useCallback(() => {
    writeStoredInput(STORAGE_KEY, TUTORIAL_VERSION)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current)
    transitionTimer.current = null
    setTransitioning(false)
    setPositioning(false)
    setStepIndex(0)
  }, [open])

  useEffect(() => {
    onProgressChange?.(open ? { stepId: step.id } : null)
    return () => {
      if (!open) onProgressChange?.(null)
    }
  }, [onProgressChange, open, step.id])

  useEffect(() => {
    if (!open || !step.interactive) return
    const observer = new MutationObserver((records) => {
      const hasAppChange = records.some((record) => {
        const target = record.target instanceof Element ? record.target : record.target.parentElement
        return !target?.closest('[data-tutorial-overlay]')
      })
      if (hasAppChange) setDomRevision((current) => current + 1)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [open, step.interactive])

  useEffect(() => {
    if (!open) return
    primaryButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [finish, open])

  const goToStep = useCallback((id: string) => {
    const index = STEPS.findIndex((candidate) => candidate.id === id)
    if (index < 0) return
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current)
    setHighlight(null)
    setPositioning(true)
    setTransitioning(true)
    transitionTimer.current = window.setTimeout(() => {
      setStepIndex(index)
      setTransitioning(false)
      transitionTimer.current = null
    }, 450)
  }, [])

  useEffect(
    () => () => {
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (!open) return
    if (step.id === 'idol-open' && document.querySelector('[data-tutorial="idol-list"]'))
      goToStep('idol-select')
    if (step.id === 'support-open' && document.querySelector('[data-tutorial="support-list"]'))
      goToStep('support-select')
    if (
      step.id === 'exam1-delete-select' &&
      !transitioning &&
      !document.querySelector('[data-tutorial-basic-card-deletion]')
    )
      goToStep('exam1-delete-open')
  }, [domRevision, goToStep, open, step.id, transitioning])

  useEffect(() => {
    if (!open || !step.interactive) return
    const advanceAfterAction = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (step.id === 'idol-select' && target?.closest('[data-tutorial-idol-choice]')) {
        goToStep('idol-talent')
      }
      if (step.id === 'idol-talent' && target?.closest('[data-tutorial="talent"] button')) {
        goToStep('preparation-intro')
      }
      if (step.id === 'schedule-day2-open' && target?.closest('[data-tutorial-lesson-main="1"]')) {
        goToStep('schedule-day2-settings')
      }
      if (step.id === 'support-select' && target?.closest('[data-tutorial-support-card]')) {
        goToStep('support-confirm')
      }
      if (step.id === 'exam1' && target?.closest('[data-tutorial-exam-confirm="true"]')) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
      if (step.id === 'exam1-delete-open' && target?.closest('[data-tutorial-basic-card-deletion-open]')) {
        goToStep('exam1-delete-select')
      }
      if (
        step.id === 'exam1-delete-select' &&
        target?.closest('[data-tutorial-basic-card-deletion-confirm]:not(:disabled)')
      ) {
        goToStep('exam1-confirm')
      }
      if (
        step.id === 'exam1-delete-select' &&
        target?.closest('[data-tutorial-basic-card-deletion-cancel]')
      ) {
        goToStep('exam1-delete-open')
      }
      if (
        step.id === 'exam1-custom' &&
        target?.closest(
          '[data-hif-custom-p-item-stage="1"] [data-tutorial-custom-p-item-choice]:not(:disabled)',
        )
      ) {
        goToStep('week2-fill')
      }
      if (step.id === 'schedule-next' && target?.closest('[data-tutorial="schedule-next"]')) {
        goToStep('later-schedule')
      }
    }
    document.addEventListener('click', advanceAfterAction, true)
    return () => document.removeEventListener('click', advanceAfterAction, true)
  }, [goToStep, open, step.id, step.interactive])

  useEffect(() => {
    if (open && step.id === 'support-fill') onFillSupportDeck()
  }, [onFillSupportDeck, open, step.id])

  useEffect(() => {
    if (!open) return
    if (step.id === 'week1-fill') onFillFirstWeek()
    if (step.id === 'week2-fill') onFillSecondWeek()
    if (step.id === 'later-schedule') onFillLaterSchedule()
  }, [onFillFirstWeek, onFillLaterSchedule, onFillSecondWeek, open, step.id])

  useEffect(() => {
    if (!open) return
    const onScheduleConfirmed = (event: Event) => {
      const index = (event as CustomEvent<{ index?: number }>).detail?.index
      if (step.id === 'schedule-day1' && index === 0) goToStep('day1-event')
      if (step.id === 'schedule-day2-settings' && index === 1) goToStep('week1-fill')
      if (step.id === 'exam1-confirm' && index === EXAM1_INDEX) goToStep('exam1-custom')
      if (step.id === 'round1' && index === ROUND1_INDEX) {
        onFillFinalInterval()
        goToStep('round2')
      }
      if (step.id === 'round2' && index === ROUND2_INDEX) goToStep('evaluation')
    }
    window.addEventListener('gakumas:hif-schedule-confirmed', onScheduleConfirmed)
    return () => window.removeEventListener('gakumas:hif-schedule-confirmed', onScheduleConfirmed)
  }, [goToStep, onFillFinalInterval, open, step.id])

  const targetSelector = getTutorialTarget(step, domRevision)
  const displayTitle =
    stepIndex === 0 || step.id === 'finish'
      ? step.title
      : `${stepIndex}. ${step.title.replace(/^\d+\.\s*/, '')}`
  const displayDescription = getTutorialDescription(step, domRevision)

  useLayoutEffect(() => {
    if (!open || !coachRef.current) return
    const coach = coachRef.current
    const updateHeight = () => setCoachHeight(Math.ceil(coach.getBoundingClientRect().height))
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(coach)
    return () => observer.disconnect()
  }, [open, step.id])

  useLayoutEffect(() => {
    if (!open || !targetSelector) {
      setHighlight(null)
      setPositioning(false)
      return
    }

    const deckAccordion = document.querySelector<HTMLDetailsElement>('[data-tutorial="deck-accordion"]')
    if (
      deckAccordion &&
      ['support-open', 'support-select', 'support-confirm', 'support-fill'].includes(step.id)
    ) {
      deckAccordion.open = true
    }
    if (deckAccordion && ['memory', 'status-total', 'produce-settings-intro'].includes(step.id))
      deckAccordion.open = false
    const memory = document.querySelector<HTMLDetailsElement>('[data-tutorial="memory"]')
    const carryover = document.querySelector<HTMLDetailsElement>('[data-tutorial="carryover"]')
    if (step.id === 'memory') {
      if (memory) memory.open = true
      if (carryover) carryover.open = false
    }
    if (step.id === 'produce-settings-intro') {
      if (memory) memory.open = false
      if (carryover) carryover.open = false
    }
    if (step.id === 'carryover') {
      if (memory) memory.open = false
      if (carryover) carryover.open = true
    }
    if (step.id === 'schedule-intro' && carryover) carryover.open = false

    const targets = [...document.querySelectorAll<HTMLElement>(targetSelector)]
    if (targets.length === 0) {
      setHighlight(null)
      setPositioning(false)
      return
    }

    setHighlight(null)
    setPositioning(true)
    let settled = false
    let stableFrames = 0
    let previousBounds: { top: number; left: number; right: number; bottom: number } | null = null
    let frame = 0
    const scrollContainer = targets[0].closest<HTMLElement>('[data-tutorial-produce-scroll]')

    const getBounds = () => {
      const rects = targets.map((target) => target.getBoundingClientRect())
      return {
        top: Math.min(...rects.map((rect) => rect.top)),
        left: Math.min(...rects.map((rect) => rect.left)),
        right: Math.max(...rects.map((rect) => rect.right)),
        bottom: Math.max(...rects.map((rect) => rect.bottom)),
      }
    }

    const getVisibleTop = () =>
      Math.max(8, (document.querySelector('[data-tutorial-header]')?.getBoundingClientRect().bottom ?? 0) + 8)

    const updateHighlight = () => {
      if (!settled) return
      const bounds = getBounds()
      const padding = 8
      const scrollBounds = scrollContainer?.getBoundingClientRect()
      const visibleTop = Math.max(getVisibleTop(), scrollBounds ? scrollBounds.top + padding : 0)
      const visibleBottom = Math.min(
        window.innerHeight - padding,
        scrollBounds ? scrollBounds.bottom - padding : window.innerHeight,
      )
      const top = Math.max(visibleTop, bounds.top - padding)
      const left = Math.max(8, bounds.left - padding)
      const right = Math.min(window.innerWidth - 8, bounds.right + padding)
      const bottom = Math.max(top, Math.min(visibleBottom, bounds.bottom + padding))
      setHighlight({
        top,
        left,
        right,
        bottom,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      })
    }

    const finishPositioning = () => {
      if (settled) return
      settled = true
      updateHighlight()
      setPositioning(false)
    }

    // スムーズスクロールが止まるまで待ち、移動中の要素をハイライトしない。
    const waitForStablePosition = () => {
      const bounds = getBounds()
      if (
        previousBounds &&
        Math.abs(bounds.top - previousBounds.top) < 0.5 &&
        Math.abs(bounds.left - previousBounds.left) < 0.5 &&
        Math.abs(bounds.right - previousBounds.right) < 0.5 &&
        Math.abs(bounds.bottom - previousBounds.bottom) < 0.5
      ) {
        stableFrames += 1
      } else {
        stableFrames = 0
      }
      previousBounds = bounds
      if (stableFrames >= 4) {
        finishPositioning()
        return
      }
      frame = requestAnimationFrame(waitForStablePosition)
    }

    // カード1を中央へ置き、入力欄の展開後は案内を置く空間を確保する。
    const positionCarryoverCard = () => {
      const target = targets[0]
      const bounds = getBounds()
      const scrollableContainer =
        scrollContainer &&
        /auto|scroll/.test(window.getComputedStyle(scrollContainer).overflowY) &&
        scrollContainer.scrollHeight > scrollContainer.clientHeight + 1
          ? scrollContainer
          : null
      const viewportTop = Math.max(getVisibleTop(), scrollableContainer?.getBoundingClientRect().top ?? 0)
      const viewportBottom = Math.min(
        window.innerHeight - 8,
        scrollableContainer?.getBoundingClientRect().bottom ?? window.innerHeight,
      )
      const targetHeight = bounds.bottom - bounds.top
      const centeredTop = Math.max(viewportTop, (viewportTop + viewportBottom - targetHeight) / 2)
      let desiredTop = centeredTop

      if (target.querySelector<HTMLInputElement>('[data-tutorial-carryover-enable="0"]')?.checked) {
        const gap = window.innerWidth < 768 ? 8 : 16
        const coachHeight = coachRef.current?.getBoundingClientRect().height ?? 0
        const topForCoachBelow = viewportBottom - targetHeight - 8 - gap - coachHeight
        const topForCoachAbove = viewportTop + gap + coachHeight
        if (topForCoachBelow >= viewportTop) {
          desiredTop = Math.min(centeredTop, topForCoachBelow)
        } else if (topForCoachAbove + targetHeight <= viewportBottom) {
          desiredTop = Math.max(centeredTop, topForCoachAbove)
        } else {
          desiredTop = viewportTop
        }
      }

      const offset = bounds.top - desiredTop
      if (Math.abs(offset) < 1) return
      if (scrollableContainer) {
        scrollableContainer.scrollTo({ top: scrollableContainer.scrollTop + offset, behavior: 'smooth' })
      } else {
        window.scrollTo({ top: window.scrollY + offset, behavior: 'smooth' })
      }
    }

    const initialBounds = getBounds()
    const visibleTop = getVisibleTop()
    if (step.id === 'carryover-card1') {
      positionCarryoverCard()
    } else if (
      scrollContainer &&
      initialBounds.bottom - initialBounds.top > scrollContainer.clientHeight - 16
    ) {
      targets[0].scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
    } else if (
      initialBounds.bottom - initialBounds.top > window.innerHeight - visibleTop - 16 &&
      !targets[0].closest('[role="dialog"]')
    ) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + initialBounds.top - visibleTop - 8),
        behavior: 'smooth',
      })
    } else {
      targets[Math.floor(targets.length / 2)].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }
    frame = requestAnimationFrame(waitForStablePosition)
    const positioningTimeout = window.setTimeout(finishPositioning, 1200)
    let targetHeight = initialBounds.bottom - initialBounds.top
    const resizeObserver = new ResizeObserver(() => {
      if (step.id === 'carryover-card1') {
        const bounds = getBounds()
        const nextHeight = bounds.bottom - bounds.top
        if (Math.abs(nextHeight - targetHeight) > 1) {
          targetHeight = nextHeight
          positionCarryoverCard()
        }
      }
      updateHighlight()
    })
    targets.forEach((target) => resizeObserver.observe(target))
    window.addEventListener('resize', updateHighlight)
    window.addEventListener('scroll', updateHighlight, true)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(positioningTimeout)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateHighlight)
      window.removeEventListener('scroll', updateHighlight, true)
    }
  }, [domRevision, open, step.id, targetSelector])

  if (!open || typeof document === 'undefined') return null

  const mobile = window.innerWidth < 768
  const compactMobileCoach =
    mobile && ['idol-select', 'support-select', 'exam1-delete-select', 'carryover-card1'].includes(step.id)
  const coachStyle =
    !targetSelector || !highlight
      ? {
          left: '50%',
          top: '50%',
          width: 'min(420px, calc(100vw - 24px))',
          transform: 'translate(-50%, -50%)',
        }
      : getCoachStyle(highlight, mobile, coachHeight)
  const preventBackgroundScroll = (event: { preventDefault: () => void }) => event.preventDefault()

  return createPortal(
    <div data-tutorial-overlay className="pointer-events-none fixed inset-0 z-[120]" aria-live="polite">
      {!targetSelector && (
        <div
          className="pointer-events-auto absolute inset-0 bg-slate-950/60"
          onWheel={preventBackgroundScroll}
          onTouchMove={preventBackgroundScroll}
        />
      )}
      {targetSelector && highlight && (
        <TutorialBlockers rect={highlight} onBlockScroll={preventBackgroundScroll} />
      )}
      {targetSelector && highlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl ring-4 ring-blue-400 shadow-lg transition-all duration-200"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}
      {targetSelector && highlight && !step.interactive && (
        <div
          aria-hidden="true"
          className="pointer-events-auto fixed bg-transparent"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
          onWheel={preventBackgroundScroll}
          onTouchMove={preventBackgroundScroll}
        />
      )}
      {(transitioning || positioning) && (
        <div aria-hidden="true" className="pointer-events-auto fixed inset-0 z-[5] cursor-wait" />
      )}

      <section
        ref={coachRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        data-tutorial-mobile-compact={compactMobileCoach ? 'true' : undefined}
        className={`pointer-events-auto fixed z-10 max-h-[calc(100vh-24px)] overflow-y-auto border border-blue-100 bg-white shadow-2xl transition-opacity duration-200 ${compactMobileCoach ? 'rounded-xl px-2 py-1.5' : 'rounded-2xl p-5'} ${positioning ? 'invisible opacity-0' : transitioning ? 'opacity-60' : 'opacity-100'}`}
        style={coachStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            {!compactMobileCoach && (
              <p className="mb-1 text-[11px] font-bold tracking-wide text-blue-500">はじめての使い方</p>
            )}
            <h2
              id="tutorial-title"
              className={`${compactMobileCoach ? 'text-[13px] leading-5' : 'text-base'} whitespace-pre-line font-black text-slate-800`}
            >
              {displayTitle}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {compactMobileCoach && (
              <span className="text-[10px] tabular-nums text-slate-400">
                {stepIndex + 1}/{STEPS.length}
              </span>
            )}
            <button
              type="button"
              aria-label="チュートリアルを終了"
              disabled={transitioning}
              onClick={finish}
              className={`${compactMobileCoach ? 'h-5 w-5 text-[11px]' : 'h-7 w-7 text-sm'} flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200`}
            >
              ×
            </button>
          </div>
        </div>

        <p
          className={`${compactMobileCoach ? 'mt-0.5 text-[11px] leading-[14px]' : 'mt-3 text-sm leading-6'} whitespace-pre-line text-slate-600`}
        >
          {displayDescription}
        </p>

        {!compactMobileCoach && (
          <div
            className="mt-5 flex items-center gap-1.5"
            aria-label={`全${STEPS.length}ページ中${stepIndex + 1}ページ`}
          >
            {STEPS.map((_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all ${index === stepIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-200'}`}
              />
            ))}
            <span className="ml-1 text-[10px] tabular-nums text-slate-400">
              {stepIndex + 1}/{STEPS.length}
            </span>
          </div>
        )}

        {!(compactMobileCoach && step.interactive && step.id !== 'carryover-card1') && (
          <div
            className={`${compactMobileCoach ? 'mt-1.5' : 'mt-4'} flex items-center justify-between gap-2`}
          >
            {step.interactive ? (
              <p className={`${compactMobileCoach ? 'text-[10px]' : 'py-2 text-xs'} font-bold text-blue-600`}>
                青枠の箇所を操作してください
              </p>
            ) : stepIndex === 0 ? (
              <button
                type="button"
                disabled={transitioning}
                onClick={finish}
                className="px-2 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                今はしない
              </button>
            ) : [
                'preparation-intro',
                'support-confirm',
                'support-fill',
                'memory',
                'status-total',
                'produce-settings-intro',
                'carryover',
                'schedule-intro',
                'day1-event',
                'day1-detail',
                'schedule-day2-settings',
                'week1-fill',
                'week2-fill',
                'later-schedule',
                'evaluation',
                'breakdown',
                'finish',
              ].includes(step.id) ? (
              <span />
            ) : (
              <button
                type="button"
                disabled={transitioning}
                onClick={() => setStepIndex((current) => current - 1)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                戻る
              </button>
            )}
            {step.id === 'exam1' &&
              document.querySelector(`[data-tutorial-schedule-dialog="${EXAM1_INDEX}"]`) && (
                <button
                  type="button"
                  disabled={transitioning}
                  onClick={() => goToStep('exam1-delete-open')}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  次へ
                </button>
              )}
            {step.id === 'carryover-card1' && (
              <button
                type="button"
                disabled={
                  transitioning ||
                  !document.querySelector<HTMLInputElement>('[data-tutorial-carryover-enable="0"]')?.checked
                }
                onClick={() => goToStep('schedule-intro')}
                className={`${compactMobileCoach ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} rounded-lg bg-blue-600 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50`}
              >
                設定を完了
              </button>
            )}
            {!step.interactive && (
              <button
                ref={primaryButton}
                type="button"
                disabled={transitioning}
                onClick={() => {
                  if (stepIndex === 0) onBegin()
                  if (step.id === 'preparation-intro') goToStep('support-open')
                  else if (step.id === 'support-confirm') goToStep('support-fill')
                  else if (step.id === 'support-fill') {
                    goToStep('memory')
                  } else if (step.id === 'memory') goToStep('status-total')
                  else if (step.id === 'status-total') goToStep('produce-settings-intro')
                  else if (step.id === 'produce-settings-intro') goToStep('carryover')
                  else if (step.id === 'carryover') goToStep('carryover-card1')
                  else if (step.id === 'schedule-intro') goToStep('schedule-day1')
                  else if (step.id === 'day1-event') goToStep('day1-detail')
                  else if (step.id === 'day1-detail') goToStep('schedule-day2-open')
                  else if (step.id === 'week1-fill') goToStep('exam1')
                  else if (step.id === 'week2-fill') goToStep('schedule-next')
                  else if (step.id === 'later-schedule') goToStep('round1')
                  else if (step.id === 'evaluation') goToStep('breakdown')
                  else if (step.id === 'breakdown') goToStep('finish')
                  else if (step.id === 'finish') {
                    finish()
                    requestAnimationFrame(() => {
                      window.scrollTo({
                        top: 0,
                        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                          ? 'instant'
                          : 'smooth',
                      })
                    })
                  } else if (stepIndex < STEPS.length - 1) goToStep(STEPS[stepIndex + 1].id)
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                {getPrimaryButtonLabel(step, stepIndex)}
              </button>
            )}
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}

function getTutorialTarget(step: TutorialStep, _domRevision: number): string | undefined {
  if (typeof document === 'undefined') return step.target

  if (step.id === 'support-open') {
    return '[data-tutorial-deck-slot="0"]'
  }

  const scheduleIndex =
    step.id === 'schedule-day1'
      ? 0
      : step.id === 'schedule-day2-settings'
        ? 1
        : step.id === 'exam1'
          ? EXAM1_INDEX
          : step.id === 'round1'
            ? ROUND1_INDEX
            : step.id === 'round2'
              ? ROUND2_INDEX
              : null

  if (scheduleIndex !== null) {
    if (
      step.id === 'schedule-day2-settings' &&
      !document.querySelector('[data-tutorial-schedule-dialog="1"]')
    ) {
      return '[data-tutorial-lesson-main="1"]'
    }
    const nestedDialogs = [
      '[data-hif-class-card-editor] [role="dialog"]',
      '[data-hif-consultation-editor] [role="dialog"]',
      '[data-hif-outing-card-editor] [role="dialog"]',
      '[data-hif-interval-editor] [role="dialog"]',
    ]
    const nestedDialog = nestedDialogs.find((selector) => document.querySelector(selector))
    if (nestedDialog) return nestedDialog

    const scheduleDialog = `[data-tutorial-schedule-dialog="${scheduleIndex}"]`
    if (document.querySelector(scheduleDialog)) return scheduleDialog
    return `[data-tutorial-schedule-day="${scheduleIndex}"]`
  }

  return step.target
}

function getTutorialDescription(step: TutorialStep, _domRevision: number): string {
  if (typeof document === 'undefined') return step.description
  if (step.id === 'schedule-day1') {
    const action = document
      .querySelector('[data-tutorial-schedule-dialog="0"]')
      ?.getAttribute('data-hif-action')
    if (action === 'supply') return '差し入れで取得するカードの詳細を入力してください。'
    if (action === 'consultation')
      return '相談でのカードの取得・強化・削除と、Pドリンク交換の詳細を入力してください。'
    if (action === 'training') return '特別指導でのカスタマイズ回数を入力してください。'
    if (action === 'rest') return '休む場合に追加の設定はありません。「確定」を押して次へ進んでください。'
  }
  if (
    step.id === 'schedule-day2-settings' &&
    !document.querySelector('[data-tutorial-schedule-dialog="1"]')
  ) {
    return '2日目のレッスンアイコンをもう一度押して、サブステータスとSPレッスンを設定してください。'
  }
  if (step.id === 'exam1' && document.querySelector(`[data-tutorial-schedule-dialog="${EXAM1_INDEX}"]`)) {
    return '獲得パラメータを配分しましょう。上限スコアでない場合はチェックを外し、実際のスコアを入力してから配分してください。\n配分が完了したら「次へ」を押してください。'
  }
  return step.description
}

function getPrimaryButtonLabel(step: TutorialStep, stepIndex: number): string {
  if (stepIndex === 0) return 'ガイドを開始'
  if (step.id === 'schedule-intro') return '入力を始める'
  if (
    [
      'preparation-intro',
      'support-confirm',
      'memory',
      'status-total',
      'produce-settings-intro',
      'carryover',
      'day1-event',
      'day1-detail',
      'week1-fill',
      'week2-fill',
      'later-schedule',
      'evaluation',
      'breakdown',
    ].includes(step.id)
  )
    return '確認'
  if (step.id === 'finish') return '始める'
  return '次へ'
}

function TutorialBlockers({
  rect,
  onBlockScroll,
}: {
  rect: HighlightRect
  onBlockScroll: (event: { preventDefault: () => void }) => void
}) {
  const blocker = 'pointer-events-auto fixed bg-slate-950/60'
  return (
    <>
      <div
        className={blocker}
        style={{ left: 0, top: 0, right: 0, height: rect.top }}
        onWheel={onBlockScroll}
        onTouchMove={onBlockScroll}
      />
      <div
        className={blocker}
        style={{ left: 0, top: rect.bottom, right: 0, bottom: 0 }}
        onWheel={onBlockScroll}
        onTouchMove={onBlockScroll}
      />
      <div
        className={blocker}
        style={{ left: 0, top: rect.top, width: rect.left, height: rect.height }}
        onWheel={onBlockScroll}
        onTouchMove={onBlockScroll}
      />
      <div
        className={blocker}
        style={{ left: rect.right, top: rect.top, right: 0, height: rect.height }}
        onWheel={onBlockScroll}
        onTouchMove={onBlockScroll}
      />
    </>
  )
}

function getCoachStyle(rect: HighlightRect, mobile: boolean, height: number) {
  const margin = mobile ? 8 : 12
  const gap = mobile ? 8 : 16
  const width = mobile ? window.innerWidth - margin * 2 : Math.min(360, window.innerWidth - margin * 2)
  const centeredLeft = Math.max(
    margin,
    Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin),
  )
  const bottomLimit = window.innerHeight - margin

  if (rect.bottom + gap + height <= bottomLimit) {
    return { left: centeredLeft, top: rect.bottom + gap, width }
  }
  if (rect.top - gap - height >= margin) {
    return { left: centeredLeft, top: rect.top - gap - height, width }
  }
  if (!mobile && rect.right + gap + width <= window.innerWidth - margin) {
    return { left: rect.right + gap, top: Math.max(margin, Math.min(rect.top, bottomLimit - height)), width }
  }
  if (!mobile && rect.left - gap - width >= margin) {
    return {
      left: rect.left - gap - width,
      top: Math.max(margin, Math.min(rect.top, bottomLimit - height)),
      width,
    }
  }

  // 大きな選択画面など、上下に収まらない対象は下端に寄せて上部の操作を見せる。
  return { left: centeredLeft, top: Math.max(margin, bottomLimit - height), width }
}
