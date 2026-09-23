import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { useResultPanelStore } from '@/store/selectors'
import { HIF_SCHEDULE } from '@/data/hif-schedule'
import { CardContributionDetails } from './CardContributionDetails'

// 評価値計算では本戦2の寄与に含まれている固定補正を、表示上は分ける。
const HIF_FIXED_EVALUATION_ADJUSTMENT = -2000

const STAT_SECTION_CONFIG = {
  vo: {
    label: 'Vocal',
    color: 'bg-vocal',
    tone: 'vocal' as const,
  },
  da: {
    label: 'Dance',
    color: 'bg-dance',
    tone: 'dance' as const,
  },
  vi: {
    label: 'Visual',
    color: 'bg-visual',
    tone: 'visual' as const,
  },
} as const

const EVALUATION_RANKS = [
  { minimum: 35000, label: 'S5' },
  { minimum: 30000, label: 'S4+' },
  { minimum: 26000, label: 'S4' },
  { minimum: 23000, label: 'SSS+' },
  { minimum: 20000, label: 'SSS' },
  { minimum: 18000, label: 'SS+' },
  { minimum: 16000, label: 'SS' },
  { minimum: 14500, label: 'S+' },
  { minimum: 13000, label: 'S' },
  { minimum: 11500, label: 'A+' },
  { minimum: 10000, label: 'A' },
  { minimum: 8000, label: 'B+' },
  { minimum: 6000, label: 'B' },
  { minimum: 4500, label: 'C+' },
  { minimum: 3000, label: 'C' },
] as const

function getEvaluationRank(score: number): string {
  return EVALUATION_RANKS.find(({ minimum }) => score >= minimum)?.label ?? 'D'
}

export function ResultPanel() {
  const { result } = useResultPanelStore()

  if (!result) {
    return (
      <div data-tutorial="result" className="flex items-center justify-center h-48 text-gray-400 text-sm">
        日程を選択すると、確定済みの範囲をシミュレーションします
      </div>
    )
  }

  const { finalStats, evaluation, contributions, statSourceBreakdown } = result
  const displayedStatsTotal = finalStats.vo + finalStats.da + finalStats.vi
  const evaluationRank = evaluation ? getEvaluationRank(evaluation.total) : null
  const unsupportedAbilities = result.abilityCoverage.filter((entry) => entry.status === 'unsupported')

  return (
    <div className="space-y-3">
      {/* 評価値 */}
      {evaluation && (
        <div
          data-tutorial="evaluation"
          className="relative min-h-[112px] overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-yellow-500 px-4 py-2.5 text-white"
        >
          <div
            className={cn(
              'relative z-10 flex min-h-[92px] min-w-0 flex-col justify-center',
              evaluationRank && 'pr-[116px]',
            )}
          >
            <p className="mb-0.5 text-[11px] font-semibold opacity-80">H.I.F. 理論値 評価値</p>
            <p className="text-4xl font-black leading-none">{evaluation.total.toLocaleString()}</p>
            <div className="mt-1.5 grid grid-cols-[max-content_max-content] gap-x-2 gap-y-0.5 whitespace-nowrap text-[10px] leading-tight sm:text-[11px]">
              <span>ステ: {displayedStatsTotal.toLocaleString()}</span>
              {evaluation.starPowerScore !== undefined && (
                <span>スター: {evaluation.starPowerScore.toLocaleString()}</span>
              )}
              {evaluation.round1Score !== undefined && (
                <span>本戦1: {evaluation.round1Score.toLocaleString()}</span>
              )}
              {evaluation.round2Score !== undefined && (
                <span>
                  本戦2: {(evaluation.round2Score - HIF_FIXED_EVALUATION_ADJUSTMENT).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute right-3 top-1/2 flex h-[108px] w-[108px] -translate-y-1/2 flex-col items-center justify-center text-center">
            <span className="text-[10px] font-semibold opacity-80">評価ランク</span>
            <span className="text-4xl font-black leading-none drop-shadow-sm">{evaluationRank}</span>
          </div>
        </div>
      )}
      {!evaluation && result.simulation && (
        <div
          data-tutorial="result"
          className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
        >
          <p className="font-semibold">
            途中経過 · {result.simulation.steps.length}/{HIF_SCHEDULE.length}日程
          </p>
          <p className="mt-1 text-xs text-blue-600">評価値は全日程の確定後に計算します。</p>
        </div>
      )}

      <div data-tutorial="result-breakdown" className="space-y-3">
        {result.simulation && (
          <p className="text-[11px] leading-relaxed text-gray-400">
            獲得元・カード別の内訳は切り捨てと上限適用前です。実際の増加量はスケジュールの実行ログで確認できます。
          </p>
        )}

        {unsupportedAbilities.length > 0 && (
          <details className="group rounded-xl border border-gray-200 bg-gray-50 text-xs text-amber-900">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold">
              <span>ステータス計算に未対応のアビリティが{unsupportedAbilities.length}件あります</span>
              <span
                aria-hidden="true"
                className="text-xs text-gray-400 transition-transform group-open:rotate-180"
              >
                ▼
              </span>
            </summary>
            <ul className="space-y-1 border-t border-gray-200 px-3 py-2">
              {unsupportedAbilities.map((entry) => (
                <li key={`${entry.cardId}-${entry.skillId}`}>
                  {entry.cardName}: {entry.skillDescription}
                  {entry.reason ? `（${entry.reason}）` : ''}
                </li>
              ))}
            </ul>
          </details>
        )}

        {(['vo', 'da', 'vi'] as const).map((statKey) => {
          const config = STAT_SECTION_CONFIG[statKey]

          return (
            <div key={statKey}>
              <StatBar
                label={config.label}
                value={finalStats[statKey]}
                cap={result.statCap ?? 2800}
                color={config.color}
                tone={config.tone}
                sourceBreakdown={statSourceBreakdown}
                statKey={statKey}
              >
                <CardContributionDetails contributions={contributions} stat={statKey} compact />
              </StatBar>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatBar({
  label,
  value,
  cap,
  color,
  tone,
  children,
  sourceBreakdown,
  statKey,
}: {
  label: string
  value: number
  cap: number
  color: string
  tone: 'vocal' | 'dance' | 'visual'
  children?: ReactNode
  sourceBreakdown: {
    initial: { vo: number; da: number; vi: number }
    lesson: { vo: number; da: number; vi: number }
    class: { vo: number; da: number; vi: number }
    exam: { vo: number; da: number; vi: number }
  }
  statKey: 'vo' | 'da' | 'vi'
}) {
  const pct = Math.min((value / cap) * 100, 100)
  const atCap = value >= cap
  const toneClass =
    tone === 'vocal'
      ? {
          card: 'bg-pink-50 border-pink-100',
          label: 'text-pink-500',
          value: 'text-pink-500',
          pct: 'text-pink-400',
        }
      : tone === 'dance'
        ? {
            card: 'bg-blue-50 border-blue-100',
            label: 'text-blue-500',
            value: 'text-blue-500',
            pct: 'text-blue-400',
          }
        : {
            card: 'bg-yellow-50 border-yellow-100',
            label: 'text-yellow-600',
            value: 'text-yellow-600',
            pct: 'text-yellow-500',
          }

  return (
    <div className={cn('rounded-xl border px-2.5 py-2', toneClass.card)}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className={cn('text-xs font-semibold', toneClass.label)}>{label}</p>
          <p className={cn('text-xl font-black leading-none', atCap ? 'text-yellow-500' : toneClass.value)}>
            {value.toLocaleString()}
            {atCap && <span className="ml-1 text-xs">MAX</span>}
          </p>
        </div>
        <p className={cn('shrink-0 text-xs', toneClass.pct)}>{pct.toFixed(1)}%</p>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5 text-[11px]">
        <SourceStatChip label="初期値" value={sourceBreakdown.initial[statKey]} />
        <SourceStatChip label="レッスン" value={sourceBreakdown.lesson[statKey]} withPlus />
        <SourceStatChip label="授業" value={sourceBreakdown.class[statKey]} withPlus />
        <SourceStatChip label="試験" value={sourceBreakdown.exam[statKey]} withPlus />
      </div>
      {children}
    </div>
  )
}

function SourceStatChip({
  label,
  value,
  withPlus = false,
}: {
  label: string
  value: number
  withPlus?: boolean
}) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/70 px-1 py-1 text-center">
      <p className="text-[10px] font-medium leading-tight text-gray-500">{label}</p>
      <p className="text-xs font-bold leading-tight text-gray-700">
        {withPlus ? '+' : ''}
        {Math.floor(value).toLocaleString()}
      </p>
    </div>
  )
}
