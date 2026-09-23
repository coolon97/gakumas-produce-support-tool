import type { HifSelectionExamConfig } from '@/types/produce'
import {
  getHifSelectionExamAllocation,
  getHifSelectionExamConfiguredReward,
  moveHifExamAllocationBoundary,
  stepHifExamDanceReward,
  stepHifExamRewardBoundary,
} from '@/lib/calculator/hif-selection-exams'

export function HifExamAllocation({
  exam,
  examIndex,
  label,
  onChange,
}: {
  exam: HifSelectionExamConfig
  examIndex: number
  label: string
  onChange: (update: Partial<HifSelectionExamConfig>) => void
}) {
  const allocation = getHifSelectionExamAllocation(exam)
  const reward = getHifSelectionExamConfiguredReward(examIndex, exam)
  const stepReward = (handle: 'vocal' | 'visual', delta: -1 | 1) =>
    onChange(stepHifExamRewardBoundary(examIndex, exam, handle, delta))
  const onSliderKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, handle: 'vocal' | 'visual') => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    stepReward(handle, (handle === 'vocal' ? direction : -direction) as -1 | 1)
  }
  return (
    <div role="group" aria-label={`${label} スコア配分`}>
      <div className="relative mx-2 h-9">
        <div className="absolute inset-x-0 top-4 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
          <div className="bg-pink-500" style={{ width: `${allocation.vo}%` }} />
          <div className="bg-blue-500" style={{ width: `${allocation.da}%` }} />
          <div className="bg-yellow-400" style={{ width: `${allocation.vi}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={0.01}
          value={exam.vocalBoundary}
          aria-label={`${label} Vo・Da境界`}
          aria-valuetext={`Vo +${reward.vo}、Da +${reward.da}`}
          onChange={(e) => onChange(moveHifExamAllocationBoundary(exam, 'vocal', Number(e.target.value)))}
          onKeyDown={(event) => onSliderKeyDown(event, 'vocal')}
          className={`hif-allocation-slider hif-allocation-slider-vo${allocation.da === 0 ? ' hif-allocation-slider-overlap' : ''}`}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={0.01}
          value={exam.visualBoundary}
          aria-label={`${label} Da・Vi境界`}
          aria-valuetext={`Da +${reward.da}、Vi +${reward.vi}`}
          onChange={(e) => onChange(moveHifExamAllocationBoundary(exam, 'visual', Number(e.target.value)))}
          onKeyDown={(event) => onSliderKeyDown(event, 'visual')}
          className={`hif-allocation-slider hif-allocation-slider-vi${allocation.da === 0 ? ' hif-allocation-slider-overlap' : ''}`}
        />
      </div>
      <div className="grid grid-cols-3 text-center text-[10px] font-semibold">
        <span className="flex flex-col items-center gap-1 text-pink-600">
          Vo +{reward.vo.toLocaleString()}
          <span className="flex gap-1">
            <button
              type="button"
              aria-label={`${label} Vo報酬を1減らす`}
              onClick={() => stepReward('vocal', -1)}
              className="rounded border border-pink-200 px-2 text-sm"
            >
              −
            </button>
            <button
              type="button"
              aria-label={`${label} Vo報酬を1増やす`}
              onClick={() => stepReward('vocal', 1)}
              className="rounded border border-pink-200 px-2 text-sm"
            >
              ＋
            </button>
          </span>
        </span>
        <span className="flex flex-col items-center gap-1 text-blue-600">
          Da +{reward.da.toLocaleString()}
          <span className="flex gap-1">
            <button
              type="button"
              aria-label={`${label} Da報酬を1減らす`}
              onClick={() => onChange(stepHifExamDanceReward(examIndex, exam, -1))}
              className="rounded border border-blue-200 px-2 text-sm"
            >
              −
            </button>
            <button
              type="button"
              aria-label={`${label} Da報酬を1増やす`}
              onClick={() => onChange(stepHifExamDanceReward(examIndex, exam, 1))}
              className="rounded border border-blue-200 px-2 text-sm"
            >
              ＋
            </button>
          </span>
        </span>
        <span className="flex flex-col items-center gap-1 text-yellow-700">
          Vi +{reward.vi.toLocaleString()}
          <span className="flex gap-1">
            <button
              type="button"
              aria-label={`${label} Vi報酬を1減らす`}
              onClick={() => stepReward('visual', -1)}
              className="rounded border border-yellow-200 px-2 text-sm"
            >
              −
            </button>
            <button
              type="button"
              aria-label={`${label} Vi報酬を1増やす`}
              onClick={() => stepReward('visual', 1)}
              className="rounded border border-yellow-200 px-2 text-sm"
            >
              ＋
            </button>
          </span>
        </span>
      </div>
    </div>
  )
}
