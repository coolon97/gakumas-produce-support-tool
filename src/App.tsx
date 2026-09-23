import { useCallback, useEffect, useRef, useState } from 'react'
import { DeckBuilder } from '@/components/DeckBuilder'
import { AuthorPopover } from '@/components/AuthorPopover'
import { IdolSelectPanel, ProduceConfigPanel } from '@/components/ProduceConfig'
import { ResultPanel } from '@/components/ResultPanel'
import { useOverlayScrollLock } from '@/components/useOverlayScrollLock'
import { CardSelectModal } from '@/components/CardSelectModal'
import { shouldShowTutorial, Tutorial } from '@/components/Tutorial'
import cardsData from '@data/cards.json'
import { findIdolVersion } from '@/data/idols'
import { normalizeHifSchedule, syncHifSchedule } from '@/lib/hif-schedule'
import { fillTutorialScheduleRange as buildTutorialScheduleRange } from '@/lib/tutorial-schedule'
import { useAppStore } from '@/store'
import type { AppState } from '@/store'
import { DEFAULT_PRODUCE_CONFIG } from '@/store/produce-config'
import type { SupportCard } from '@/types/card'
import type { TutorialProgress } from '@/types/tutorial'

type TutorialBackup = Pick<AppState, 'deck' | 'produceConfig' | 'result'>
const TUTORIAL_BACKUP_KEY = 'gakumas:tutorial-backup'
function readTutorialBackup(): TutorialBackup | null {
  try {
    const raw = window.localStorage.getItem(TUTORIAL_BACKUP_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<TutorialBackup>
    return Array.isArray(value.deck) && value.produceConfig && typeof value.produceConfig === 'object'
      ? (value as TutorialBackup)
      : null
  } catch {
    return null
  }
}

function writeTutorialBackup(backup: TutorialBackup | null) {
  try {
    if (backup) window.localStorage.setItem(TUTORIAL_BACKUP_KEY, JSON.stringify(backup))
    else window.localStorage.removeItem(TUTORIAL_BACKUP_KEY)
  } catch {
    // Storage being blocked or full must not prevent the tutorial from running.
  }
}

export function App() {
  useOverlayScrollLock()
  const [tutorialOpen, setTutorialOpen] = useState(shouldShowTutorial)
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress | null>(null)
  const tutorialBackup = useRef<TutorialBackup | null>(readTutorialBackup())

  useEffect(() => {
    if (!tutorialBackup.current) return
    useAppStore.setState({
      ...structuredClone(tutorialBackup.current),
      selectingSlot: null,
      cardSearchInitialPlans: [],
    })
    tutorialBackup.current = null
    writeTutorialBackup(null)
  }, [])

  const beginTutorial = useCallback(() => {
    if (tutorialBackup.current) return
    const state = useAppStore.getState()
    tutorialBackup.current = structuredClone({
      deck: state.deck,
      produceConfig: state.produceConfig,
      result: state.result,
    })
    writeTutorialBackup(tutorialBackup.current)
    useAppStore.setState({
      deck: [],
      produceConfig: structuredClone(DEFAULT_PRODUCE_CONFIG),
      result: null,
      selectingSlot: null,
      cardSearchInitialPlans: [],
    })
  }, [])

  const fillTutorialDeck = useCallback(() => {
    const state = useAppStore.getState()
    const plan = findIdolVersion(state.produceConfig.idolId, state.produceConfig.idolVersionId)?.plan
    if (!plan || state.deck.length >= 6) return

    const usedIds = new Set(state.deck.map(({ card }) => card.id))
    const candidates = (cardsData as SupportCard[]).filter(
      (card) =>
        card.rarity === 'SSR' && (card.plan === plan || card.plan === 'free') && !usedIds.has(card.id),
    )
    for (let index = candidates.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]]
    }
    candidates.slice(0, 6 - state.deck.length).forEach((card, offset) => {
      useAppStore.getState().addToDeck(card, state.deck.length + offset)
    })
  }, [])

  const fillTutorialScheduleRange = useCallback((from: number, to: number) => {
    const state = useAppStore.getState()
    const hif = state.produceConfig.hif
    const schedule = normalizeHifSchedule(hif.schedule)
    state.setHifConfig(syncHifSchedule(hif, buildTutorialScheduleRange(schedule, from, to)))
    useAppStore.getState().runCalculation()
  }, [])

  const fillTutorialFirstWeek = useCallback(() => {
    fillTutorialScheduleRange(2, 6)
  }, [fillTutorialScheduleRange])

  const fillTutorialSecondWeek = useCallback(() => {
    fillTutorialScheduleRange(7, 13)
  }, [fillTutorialScheduleRange])

  const fillTutorialLaterSchedule = useCallback(() => {
    fillTutorialScheduleRange(13, 26)
  }, [fillTutorialScheduleRange])

  const fillTutorialFinalInterval = useCallback(() => {
    fillTutorialScheduleRange(27, 28)
  }, [fillTutorialScheduleRange])

  const closeTutorial = useCallback(() => {
    if (tutorialBackup.current) {
      useAppStore.setState({
        ...structuredClone(tutorialBackup.current),
        selectingSlot: null,
        cardSearchInitialPlans: [],
      })
      tutorialBackup.current = null
      writeTutorialBackup(null)
    }
    setTutorialProgress(null)
    setTutorialOpen(false)
  }, [])

  const tutorialIdolEmpty =
    tutorialProgress?.stepId === 'idol-open' || tutorialProgress?.stepId === 'idol-select'

  return (
    <div className="app-shell flex h-dvh flex-col overflow-hidden bg-slate-50">
      <header
        data-tutorial-header
        className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3"
      >
        <h1 className="min-w-0 text-sm font-black leading-tight text-gray-800 sm:text-lg">
          学マス <span className="text-blue-500">H.I.F評価 理論値</span> 計算ツール
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            使い方
          </button>
          <AuthorPopover />
        </div>
      </header>

      <div className="app-main mx-auto grid min-h-0 w-full max-w-7xl flex-1 grid-cols-1 items-start gap-4 overflow-y-auto p-4 lg:grid-cols-[220px_minmax(0,1fr)_340px] lg:overflow-hidden">
        <div className="self-start">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-bold text-gray-700 mb-3">アイドル選択</h2>
            <IdolSelectPanel tutorialEmpty={tutorialIdolEmpty} />
          </div>
        </div>

        <div className="self-start">
          <div
            data-tutorial="produce-preparation"
            className="app-panel flex max-h-[calc(100dvh-5rem)] flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-3 shrink-0 font-bold text-gray-700">プロデュース準備</h2>
            <div
              data-tutorial-produce-scroll
              className="app-panel-scroll min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-1"
            >
              <DeckBuilder />
              <ProduceConfigPanel tutorialProgress={tutorialProgress} />
            </div>
          </div>
        </div>

        <div className="self-start">
          <div className="app-panel flex max-h-[calc(100dvh-5rem)] flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 shrink-0 font-bold text-gray-700">計算結果</h2>
            <div className="app-panel-scroll min-h-0 overflow-y-auto overscroll-contain pr-1">
              <ResultPanel />
            </div>
          </div>
        </div>
      </div>

      <CardSelectModal />
      <Tutorial
        open={tutorialOpen}
        onBegin={beginTutorial}
        onFillSupportDeck={fillTutorialDeck}
        onFillFirstWeek={fillTutorialFirstWeek}
        onFillSecondWeek={fillTutorialSecondWeek}
        onFillLaterSchedule={fillTutorialLaterSchedule}
        onFillFinalInterval={fillTutorialFinalInterval}
        onClose={closeTutorial}
        onProgressChange={setTutorialProgress}
      />
    </div>
  )
}
