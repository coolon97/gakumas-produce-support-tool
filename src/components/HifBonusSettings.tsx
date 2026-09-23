import { HIF_CAP_BONUSES } from '@/data/hif'
import { useProduceConfigStore } from '@/store/selectors'
const INPUT_CLASS = 'rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm'

export function HifBonusSettings({ includePItems = true }: { includePItems?: boolean }) {
  const { produceConfig, setHifConfig } = useProduceConfigStore()
  const hif = produceConfig.hif
  return (
    <>
      <details className="group rounded-xl border border-gray-200 bg-gray-50">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700">
          <span>HIFボーナス</span>
          <span
            aria-hidden="true"
            className="text-xs text-gray-400 transition-transform group-open:rotate-180"
          >
            ▼
          </span>
        </summary>
        <div className="space-y-3 border-t border-gray-200 p-3">
          <p className="text-xs text-gray-500">
            ゲームで適用中のレベルを指定してください。Lv0は加算なしです。
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(['vo', 'da', 'vi'] as const).map((stat) => (
              <label key={stat} className="flex flex-col gap-1 text-xs text-gray-600">
                {stat === 'vo' ? 'Vo' : stat === 'da' ? 'Da' : 'Vi'}ボーナス
                <select
                  aria-label={`${stat.toUpperCase()} HIFボーナス`}
                  value={hif.parameterBonusLevels[stat]}
                  className={INPUT_CLASS}
                  onChange={(e) =>
                    setHifConfig({
                      parameterBonusLevels: { ...hif.parameterBonusLevels, [stat]: Number(e.target.value) },
                    })
                  }
                >
                  {Array.from({ length: 6 }, (_, lv) => (
                    <option key={lv} value={lv}>
                      Lv{lv}：初期+{lv * 20} / +{lv * 2}%
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              SPレッスン発生率
              <select
                aria-label="HIF SPボーナス"
                className={INPUT_CLASS}
                value={hif.spBonusLevel}
                onChange={(e) => setHifConfig({ spBonusLevel: Number(e.target.value) })}
              >
                {Array.from({ length: 6 }, (_, lv) => (
                  <option key={lv} value={lv}>
                    Lv{lv}：+{lv}%
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              本戦パラメータ上限
              <select
                aria-label="HIF 上限ボーナス"
                className={INPUT_CLASS}
                value={hif.capBonusLevel}
                onChange={(e) => setHifConfig({ capBonusLevel: Number(e.target.value) })}
              >
                {HIF_CAP_BONUSES.map((bonus, lv) => (
                  <option key={lv} value={lv}>
                    Lv{lv}：{3000 + bonus}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              checked={hif.starPowerAffinityBonus}
              onChange={(e) => setHifConfig({ starPowerAffinityBonus: e.target.checked })}
            />
            スター性50%増加（親愛度37）
          </label>
        </div>
      </details>

      {includePItems && (
        <>
          {' '}
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={hif.includePItems}
              onChange={(e) => setHifConfig({ includePItems: e.target.checked })}
            />
            入手したPアイテムのパラメータ上昇を加算
          </label>
          <p className="-mt-2 text-[11px] text-gray-400">
            日程詳細で入手を指定したPアイテムのみ、次の日程から効果を加算します。
          </p>
        </>
      )}
    </>
  )
}
