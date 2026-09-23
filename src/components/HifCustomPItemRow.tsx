import type {
  HifCustomPItemColor,
  HifCustomPItemDecoration,
  HifCustomPItemMascot,
  HifCustomPItemSelection,
} from '@/types/hif-schedule'
import {
  CUSTOM_P_ITEM_COLORS,
  CUSTOM_P_ITEM_COLOR_LABELS,
  CUSTOM_P_ITEM_DECORATION_LABELS,
  CUSTOM_P_ITEM_MASCOTS,
  CUSTOM_P_ITEM_MASCOT_LABELS,
  getCustomPItemDecorations,
} from '@/data/hif-custom-p-items'
import { cn } from '@/lib/utils'
import { HIF_SCHEDULE_ROW_HEIGHT_CLASS } from './hif-schedule-layout'

const IMAGES = import.meta.glob('../../assets/game/CustomPItems/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
type Plan = 'sense' | 'logic' | 'anomaly'
const fileMascot = (mascot: HifCustomPItemMascot) => (mascot === 'rabbit' ? 'rabit' : mascot)

function imageFor(
  plan: Plan,
  stage: 1 | 2 | 3,
  color: HifCustomPItemColor,
  mascot?: HifCustomPItemMascot,
  decoration?: HifCustomPItemDecoration,
): string | undefined {
  const root = `../../assets/game/CustomPItems/${plan}/exam${stage}/`
  if (stage === 1) return IMAGES[`${root}${color}.png`]
  if (!mascot) return undefined
  const stem = `${color}-${fileMascot(mascot)}`
  if (stage === 2) return IMAGES[`${root}${stem}.png`]
  if (!decoration) return undefined
  const names = [`${stem}-${decoration}.png`]
  if (mascot === 'rabbit') names.push(`${color}-rabbit-${decoration}.png`)
  if (mascot === 'girl') names.push(`${color}-giril-${decoration}.png`)
  if (mascot === 'robo') names.push(`${color}-robot-${decoration}.png`)
  return names.map((name) => IMAGES[`${root}${name}`]).find(Boolean)
}

export function HifCustomPItemRow({
  examIndex,
  plan,
  selection,
  enabled,
  current,
  onChange,
}: {
  examIndex: 0 | 1 | 2
  plan: Plan
  selection: HifCustomPItemSelection
  enabled: boolean
  current: boolean
  onChange: (next: HifCustomPItemSelection) => void
}) {
  const stage = (examIndex + 1) as 1 | 2 | 3
  const choices =
    stage === 1
      ? CUSTOM_P_ITEM_COLORS
      : stage === 2 && selection.color
        ? CUSTOM_P_ITEM_MASCOTS[selection.color]
        : stage === 3 && selection.color && selection.mascot
          ? getCustomPItemDecorations(selection.color, selection.mascot)
          : []
  const heading =
    stage === 1 ? 'カスタムPアイテム獲得' : stage === 2 ? 'カスタマイズ・マスコット' : 'カスタマイズ・飾り'
  const chosen = stage === 1 ? selection.color : stage === 2 ? selection.mascot : selection.decoration
  return (
    <div
      data-hif-custom-p-item-stage={stage}
      aria-current={current ? 'step' : undefined}
      className={cn(
        HIF_SCHEDULE_ROW_HEIGHT_CLASS,
        'border-b border-dashed border-gray-200 px-3 py-3',
        current ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : enabled ? 'bg-white' : 'bg-gray-50/80',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-1 text-[11px]">
        <span className="min-w-0 truncate font-bold text-amber-800" title={`試験${stage}後 · ${heading}`}>
          試験{stage}後 · {heading}
        </span>
        <span className="shrink-0 text-blue-500">{chosen ? '✓' : current ? '次の設定' : ''}</span>
      </div>
      <div
        className={cn('grid gap-1.5', stage === 1 ? 'grid-cols-3' : 'grid-cols-4')}
        role="group"
        aria-label={`試験${stage}後の${heading}`}
      >
        {choices.map((choice) => {
          const color = stage === 1 ? (choice as HifCustomPItemColor) : selection.color!
          const mascot = stage === 2 ? (choice as HifCustomPItemMascot) : (selection.mascot ?? undefined)
          const decoration = stage === 3 ? (choice as HifCustomPItemDecoration) : undefined
          const label =
            stage === 1
              ? `ポーチ（${CUSTOM_P_ITEM_COLOR_LABELS[choice as HifCustomPItemColor]}）`
              : stage === 2
                ? CUSTOM_P_ITEM_MASCOT_LABELS[choice as HifCustomPItemMascot]
                : CUSTOM_P_ITEM_DECORATION_LABELS[choice as HifCustomPItemDecoration]
          const shortLabel = stage === 1 ? CUSTOM_P_ITEM_COLOR_LABELS[choice as HifCustomPItemColor] : label
          const src = imageFor(plan, stage, color, mascot, decoration)
          const active = choice === chosen
          return (
            <button
              key={choice}
              type="button"
              data-tutorial-custom-p-item-choice={stage === 1 ? 'true' : undefined}
              disabled={!enabled}
              aria-pressed={active}
              aria-label={`試験${stage}後 ${label}`}
              title={label}
              onClick={() =>
                onChange(
                  stage === 1
                    ? { color, mascot: null, decoration: null }
                    : stage === 2
                      ? { color, mascot: choice as HifCustomPItemMascot, decoration: null }
                      : { ...selection, decoration: choice as HifCustomPItemDecoration },
                )
              }
              className={cn(
                'flex min-w-0 flex-col items-center rounded-lg border px-0.5 py-1.5 text-[10px] font-semibold transition-colors',
                active
                  ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300',
                !enabled && 'cursor-default opacity-40',
              )}
            >
              {src ? (
                <img src={src} alt="" className="h-8 w-8 object-contain" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded bg-amber-100 text-amber-800">
                  {shortLabel}
                </span>
              )}
              <span className="mt-1 w-full truncate text-center">{shortLabel}</span>
            </button>
          )
        })}
      </div>
      {enabled && choices.length === 4 && (
        <p
          title="実機では4候補からランダムに3候補が提示されます。"
          className="mt-1.5 truncate text-[10px] leading-snug text-gray-500"
        >
          4候補からランダムに3候補が提示されます。
        </p>
      )}
    </div>
  )
}
