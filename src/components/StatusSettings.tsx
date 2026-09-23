import type { StatValues } from '@/types/produce'
import { getProduceStats } from '@/lib/calculator/produce-stats'
import { useStatusSettingsStore } from '@/store/selectors'

const STAT_LABELS: Array<{ key: keyof StatValues; label: string }> = [
  { key: 'vo', label: 'Vo' },
  { key: 'da', label: 'Da' },
  { key: 'vi', label: 'Vi' },
]

const STAT_LABEL_COLORS: Record<keyof StatValues, string> = {
  vo: 'bg-pink-200 text-pink-500',
  da: 'bg-blue-200 text-blue-500',
  vi: 'bg-yellow-200 text-yellow-600',
}

export function StatusSettingsPanel() {
  const {
    deck,
    produceConfig,
    setIdolBaseStats,
    setIdolLessonBonus,
    setMemoryBaseStats,
    setMemoryLessonBonus,
  } = useStatusSettingsStore()

  const { totalInitialStats, totalSpRate, totalLessonBonus } = getProduceStats(deck, produceConfig)
  const memoryUnset = [
    ...Object.values(produceConfig.memoryBaseStats),
    ...Object.values(produceConfig.memoryLessonBonus),
  ].every((value) => value === 0)

  return (
    <div className="space-y-4">
      <details className="group rounded-xl border border-gray-200 bg-gray-50">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700">
          <span>基礎ステータス設定</span>
          <span className="text-xs text-gray-400 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="space-y-5 border-t border-gray-200 px-4 py-4">
          <StatusInputGroup
            title="初期ステータス"
            values={produceConfig.idolBaseStats}
            onChange={setIdolBaseStats}
          />
          <StatusInputGroup
            title="レッスンボーナス"
            values={produceConfig.idolLessonBonus}
            onChange={setIdolLessonBonus}
            step={0.1}
            suffix="%"
          />
        </div>
      </details>
      <details data-tutorial="memory" className="group rounded-xl border border-gray-200 bg-gray-50">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700">
          <span className="flex items-center gap-2">
            メモリー設定
            {memoryUnset && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                未設定
              </span>
            )}
          </span>
          <span className="text-xs text-gray-400 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="space-y-5 border-t border-gray-200 px-4 py-4">
          <StatusInputGroup
            title="初期ステータス"
            values={produceConfig.memoryBaseStats}
            onChange={setMemoryBaseStats}
          />
          <StatusInputGroup
            title="レッスンボーナス"
            values={produceConfig.memoryLessonBonus}
            onChange={setMemoryLessonBonus}
            step={0.1}
            suffix="%"
          />
        </div>
      </details>
      <div
        data-tutorial="status-total"
        className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
      >
        <table className="w-full text-xs text-gray-600">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[23.33%]" />
            <col className="w-[23.33%]" />
            <col className="w-[23.33%]" />
          </colgroup>
          <thead className="bg-gray-100 text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">ステータス合計</th>
              <th className="px-3 py-2 text-center font-semibold text-pink-600">Vo</th>
              <th className="px-3 py-2 text-center font-semibold text-blue-600">Da</th>
              <th className="px-3 py-2 text-center font-semibold text-yellow-600">Vi</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">初期値</th>
              <td className="bg-pink-50 px-3 py-2 text-center font-bold text-pink-600">
                {formatStatTableValue(totalInitialStats.vo)}
              </td>
              <td className="bg-blue-50 px-3 py-2 text-center font-bold text-blue-600">
                {formatStatTableValue(totalInitialStats.da)}
              </td>
              <td className="bg-yellow-50 px-3 py-2 text-center font-bold text-yellow-600">
                {formatStatTableValue(totalInitialStats.vi)}
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">SP率</th>
              <td className="bg-pink-50 px-3 py-2 text-center font-bold text-pink-600">
                {formatStatTableValue(totalSpRate.vo)}%
              </td>
              <td className="bg-blue-50 px-3 py-2 text-center font-bold text-blue-600">
                {formatStatTableValue(totalSpRate.da)}%
              </td>
              <td className="bg-yellow-50 px-3 py-2 text-center font-bold text-yellow-600">
                {formatStatTableValue(totalSpRate.vi)}%
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">レッスンボーナス（LB）</th>
              <td className="bg-pink-50 px-3 py-2 text-center font-bold text-pink-600">
                {formatStatTableValue(totalLessonBonus.vo)}%
              </td>
              <td className="bg-blue-50 px-3 py-2 text-center font-bold text-blue-600">
                {formatStatTableValue(totalLessonBonus.da)}%
              </td>
              <td className="bg-yellow-50 px-3 py-2 text-center font-bold text-yellow-600">
                {formatStatTableValue(totalLessonBonus.vi)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatStatTableValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function StatusInputGroup({
  title,
  values,
  onChange,
  step = 1,
  suffix,
}: {
  title: string
  values: StatValues
  onChange: (next: StatValues) => void
  step?: number
  suffix?: string
}) {
  return (
    <section>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {STAT_LABELS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1.5">
            <span
              className={`inline-flex w-fit rounded-md px-2 py-1 text-xs font-bold leading-none ${STAT_LABEL_COLORS[key]}`}
            >
              {label}
            </span>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={step}
                inputMode={step < 1 ? 'decimal' : 'numeric'}
                value={values[key]}
                onChange={(event) => {
                  const rawValue = event.target.value
                  const nextValue = rawValue === '' ? 0 : Number(rawValue)
                  onChange({ ...values, [key]: Number.isFinite(nextValue) ? nextValue : 0 })
                }}
                className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${suffix ? 'pr-8' : ''}`}
              />
              {suffix ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-gray-500">
                  {suffix}
                </span>
              ) : null}
            </div>
          </label>
        ))}
      </div>
    </section>
  )
}
