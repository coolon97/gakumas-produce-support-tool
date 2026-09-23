import { cn } from '@/lib/utils'
import type { CardContribution } from '@/types/calculator'
import type { AbilityStat } from '@/types/support-ability'

export function CardContributionDetails({
  contributions,
  stat,
  label = 'カード別寄与内訳',
  emptyMessage = 'この属性に寄与するカードはありません',
  compact = false,
}: {
  contributions: CardContribution[]
  stat: AbilityStat
  label?: string
  emptyMessage?: string
  compact?: boolean
}) {
  const statContributions = contributions.filter((contribution) => contribution.total[stat] > 0)

  return (
    <details
      className={cn(
        compact ? 'mt-2' : 'mt-3',
        'group/contribution rounded-xl border border-white/70 bg-white/80 backdrop-blur-sm',
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-gray-600',
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2',
        )}
      >
        <span>{label}</span>
        <span className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
          <span>{statContributions.length > 0 ? `${statContributions.length}件` : 'なし'}</span>
          <span
            aria-hidden="true"
            className="text-xs transition-transform group-open/contribution:rotate-180"
          >
            ▼
          </span>
        </span>
      </summary>
      <div className="space-y-2 border-t border-gray-100 px-3 py-3">
        {statContributions.length > 0 ? (
          statContributions.map((contribution) => (
            <ContributionRow key={`${stat}-${contribution.cardId}`} contribution={contribution} stat={stat} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-400">
            {emptyMessage}
          </div>
        )}
      </div>
    </details>
  )
}

function ContributionRow({ contribution: c, stat }: { contribution: CardContribution; stat: AbilityStat }) {
  const total = c.total[stat]
  const filteredBreakdowns = c.effectBreakdowns.filter((breakdown) => breakdown.stat === stat)

  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="flex-1 truncate font-medium text-gray-700">{c.cardName}</span>
        <span className="ml-2 font-bold text-blue-600">+{Math.floor(total)}</span>
      </div>
      {filteredBreakdowns.length > 0 && (
        <details className="group/effect mt-2 rounded-md border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] font-semibold text-gray-600">
            <span>発動内訳</span>
            <span className="flex items-center gap-2 text-[10px] font-medium text-gray-400">
              <span>{filteredBreakdowns.length}件</span>
              <span aria-hidden="true" className="text-xs transition-transform group-open/effect:rotate-180">
                ▼
              </span>
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="min-w-full text-[11px]">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">効果</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">発動回数</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">合計</th>
                </tr>
              </thead>
              <tbody>
                {filteredBreakdowns.map((breakdown) => (
                  <tr key={breakdown.key} className="border-t border-gray-100 align-middle">
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'inline-flex rounded border px-1.5 py-0.5',
                          breakdown.className ?? 'border-slate-200 bg-slate-100 text-slate-600',
                        )}
                      >
                        {breakdown.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">
                      {breakdown.triggerCount}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <span className="font-medium text-blue-600">
                        {['lb:', 'support-front:', 'support-after:', 'p-item:'].some((prefix) =>
                          breakdown.key.startsWith(prefix),
                        )
                          ? `+${Number(breakdown.totalValueText).toLocaleString('ja-JP', { maximumFractionDigits: 2 })}`
                          : breakdown.totalValueText}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
