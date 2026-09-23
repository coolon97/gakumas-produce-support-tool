import { useState } from 'react'
import { cn } from '@/lib/utils'
import { IDOLS } from '@/data/idols'
import { IdolDummyImage, IdolSelectModal } from './IdolSelectModal'
import { getIdolImageUrl } from '@/lib/idol-images'
import { useProduceConfigStore } from '@/store/selectors'

export function IdolSelectPanel({ tutorialEmpty = false }: { tutorialEmpty?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { produceConfig, setIdol, setIdolTalentStage } = useProduceConfigStore()

  const selectedIdol = IDOLS.find((i) => i.id === produceConfig.idolId) || IDOLS[0]
  const selectedVersion =
    selectedIdol.versions.find((v) => v.id === produceConfig.idolVersionId) || selectedIdol.versions[0]
  const selectedImageUrl = getIdolImageUrl(selectedVersion.id)

  return (
    <section>
      <button
        data-tutorial="idol"
        aria-label={tutorialEmpty ? 'Pアイドルを選択' : `${selectedVersion.name}：選択を変更`}
        onClick={() => setIsModalOpen(true)}
        className={cn(
          'w-full border border-gray-200 overflow-hidden bg-white hover:border-blue-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors text-left group',
          tutorialEmpty && 'border-dashed',
          'grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 rounded-tr-xl p-2',
        )}
      >
        {tutorialEmpty ? (
          <div
            className={cn(
              'flex aspect-[3/4] items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50 font-black text-blue-200',
              'rounded-tr-xl text-3xl',
            )}
          >
            ?
          </div>
        ) : selectedImageUrl ? (
          <img
            src={selectedImageUrl}
            alt={selectedVersion.name}
            className="w-full aspect-[3/4] object-cover object-top rounded-tr-xl"
            loading="lazy"
          />
        ) : (
          <IdolDummyImage idol={selectedIdol} className="aspect-[3/4] rounded-tr-xl" />
        )}
        <div className="min-w-0 py-1 pr-1">
          <p
            title={tutorialEmpty ? undefined : selectedVersion.name}
            className="font-bold text-gray-800 leading-tight text-sm"
          >
            {tutorialEmpty ? (
              'Pアイドル未設定'
            ) : (
              <>
                <span className="block truncate text-xs">
                  {selectedVersion.name.match(/^【[^】]*】/)?.[0] ?? selectedVersion.name}
                </span>
                <span className="mt-1 block truncate">
                  {selectedIdol.lastName} {selectedIdol.firstName}
                </span>
              </>
            )}
          </p>
          <p className="text-blue-600 mt-2 group-hover:text-blue-700 text-xs inline-flex items-center rounded-md bg-blue-50 px-2 py-1.5 group-hover:bg-blue-100">
            {tutorialEmpty ? 'クリックして選択' : '選択を変更'}
          </p>
        </div>
      </button>

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-gray-600">才能開花</p>
        <div data-tutorial="talent" role="group" aria-label="才能開花段階" className="flex gap-1">
          {[0, 1, 2, 3, 4].map((stage) => (
            <button
              key={stage}
              type="button"
              aria-label={`才能開花${stage}段階`}
              aria-pressed={produceConfig.idolTalentStage === stage}
              onClick={() => setIdolTalentStage(stage)}
              className={cn(
                'flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors',
                produceConfig.idolTalentStage === stage
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-200 text-gray-500 hover:bg-blue-50',
              )}
            >
              {stage}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
          特訓・True End（HIFを含む）は最大時の値を使用。段階変更でアイドルのレッスンボーナスを更新します。
        </p>
      </div>

      <IdolSelectModal
        isOpen={isModalOpen}
        selectedVersionId={selectedVersion.id}
        onClose={() => setIsModalOpen(false)}
        onSelect={({ idol, version }) => setIdol(idol.id, version.id)}
      />
    </section>
  )
}
