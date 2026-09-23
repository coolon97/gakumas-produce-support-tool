import { HIF_SELECTION_EXAMS } from '@/data/hif-selection-exams'
import type { HifSelectionExamConfig, StatValues } from '@/types/produce'

const STATS = ['vo', 'da', 'vi'] as const

/** Move one handle, pushing the other handle when they cross. */
export function moveHifExamAllocationBoundary(
  input: Pick<HifSelectionExamConfig, 'vocalBoundary' | 'visualBoundary'>,
  handle: 'vocal' | 'visual',
  value: number,
): Pick<HifSelectionExamConfig, 'vocalBoundary' | 'visualBoundary'> {
  const boundary = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
  return handle === 'vocal'
    ? { vocalBoundary: boundary, visualBoundary: Math.max(boundary, input.visualBoundary) }
    : { vocalBoundary: Math.min(boundary, input.vocalBoundary), visualBoundary: boundary }
}

function findHifExamRewardBoundary(
  examIndex: number,
  input: HifSelectionExamConfig,
  handle: 'vocal' | 'visual',
  stat: keyof StatValues,
  delta: -1 | 1,
  direction: -1 | 1,
): { boundaries: Pick<HifSelectionExamConfig, 'vocalBoundary' | 'visualBoundary'>; distance: number } | null {
  const current = handle === 'vocal' ? input.vocalBoundary : input.visualBoundary
  const rewardAt = (boundary: number) =>
    getHifSelectionExamConfiguredReward(examIndex, {
      ...input,
      ...moveHifExamAllocationBoundary(input, handle, boundary),
    })[stat]
  const target = rewardAt(current) + delta
  const firstTick = direction > 0 ? Math.floor(current * 100) + 1 : Math.ceil(current * 100) - 1
  for (let tick = firstTick; tick >= 0 && tick <= 10000; tick += direction) {
    const boundary = tick / 100
    if (rewardAt(boundary) === target)
      return {
        boundaries: moveHifExamAllocationBoundary(input, handle, boundary),
        distance: Math.abs(boundary - current),
      }
  }
  return null
}

/** Find the nearest 0.01% slider position that changes the handle's reward by exactly one. */
export function stepHifExamRewardBoundary(
  examIndex: number,
  input: HifSelectionExamConfig,
  handle: 'vocal' | 'visual',
  delta: -1 | 1,
): Pick<HifSelectionExamConfig, 'vocalBoundary' | 'visualBoundary'> {
  const direction = (handle === 'vocal' ? delta : -delta) as -1 | 1
  return (
    findHifExamRewardBoundary(examIndex, input, handle, handle === 'vocal' ? 'vo' : 'vi', delta, direction)
      ?.boundaries ?? { vocalBoundary: input.vocalBoundary, visualBoundary: input.visualBoundary }
  )
}

/** Da is the middle segment, so either handle may provide its nearest one-point change. */
export function stepHifExamDanceReward(
  examIndex: number,
  input: HifSelectionExamConfig,
  delta: -1 | 1,
): Pick<HifSelectionExamConfig, 'vocalBoundary' | 'visualBoundary'> {
  const vocal = findHifExamRewardBoundary(examIndex, input, 'vocal', 'da', delta, -delta as -1 | 1)
  const visual = findHifExamRewardBoundary(examIndex, input, 'visual', 'da', delta, delta)
  const closest = !vocal ? visual : !visual ? vocal : vocal.distance <= visual.distance ? vocal : visual
  return closest?.boundaries ?? { vocalBoundary: input.vocalBoundary, visualBoundary: input.visualBoundary }
}

export function normalizeHifSelectionExamConfig(input: HifSelectionExamConfig): HifSelectionExamConfig {
  const percent = (value: number, fallback: number) =>
    Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback
  const vocalBoundary = percent(input.vocalBoundary, 33)
  const normalized = {
    useScoreCap: input.useScoreCap === true,
    totalScore: Number.isFinite(input.totalScore)
      ? Math.max(0, Math.min(99999999, Math.floor(input.totalScore)))
      : 0,
    vocalBoundary,
    visualBoundary: Math.max(vocalBoundary, percent(input.visualBoundary, 67)),
  } as HifSelectionExamConfig
  if (Array.isArray(input.deletedBasicCardIds))
    normalized.deletedBasicCardIds = [
      ...new Set(
        input.deletedBasicCardIds.filter(
          (id): id is string => typeof id === 'string' && id.startsWith('basic:'),
        ),
      ),
    ].slice(0, 2)
  return normalized
}

export function getHifSelectionExamAllocation(input: HifSelectionExamConfig): StatValues {
  const config = normalizeHifSelectionExamConfig(input)
  return {
    vo: config.vocalBoundary,
    da: config.visualBoundary - config.vocalBoundary,
    vi: 100 - config.visualBoundary,
  }
}

export function getHifSelectionExamTotalScore(index: number, input: HifSelectionExamConfig): number {
  return input.useScoreCap
    ? (HIF_SELECTION_EXAMS[index]?.scoreCap ?? 0)
    : normalizeHifSelectionExamConfig(input).totalScore
}

/** Wikiの区分別倍率を累積し、ゲーム表示と同様に小数点以下を切り上げる。 */
export function getHifSelectionExamStarPower(index: number, totalScore: number): number {
  const exam = HIF_SELECTION_EXAMS[index]
  if (!exam || !Number.isFinite(totalScore) || totalScore <= 0) return 0
  // 入力欄の既定スコア上限と、スター性の実際の到達点は一致しない。
  const score = Math.floor(totalScore)
  let previousScore = 0
  let starPower = 0
  for (const { endScore, rate } of exam.starPowerSegments) {
    const segmentScore = Math.max(0, Math.min(score, endScore) - previousScore)
    starPower += segmentScore * rate
    if (score <= endScore) break
    previousScore = endScore
  }
  return Math.min(exam.starPowerCap, Math.ceil(starPower - 1e-12))
}

export function getHifSelectionExamConfiguredStarPower(index: number, input: HifSelectionExamConfig): number {
  return getHifSelectionExamStarPower(index, getHifSelectionExamTotalScore(index, input))
}

export function getHifSelectionExamConfiguredReward(
  index: number,
  input: HifSelectionExamConfig,
): StatValues {
  const total = getHifSelectionExamTotalScore(index, input)
  const allocation = getHifSelectionExamAllocation(input)
  return allocateReward(index, {
    vo: (total * allocation.vo) / 100,
    da: (total * allocation.da) / 100,
    vi: (total * allocation.vi) / 100,
  })
}

export function normalizeHifSelectionExamScores(scores: Partial<StatValues>): StatValues {
  return Object.fromEntries(
    STATS.map((stat) => {
      const value = Number(scores[stat])
      return [stat, Number.isFinite(value) ? Math.min(99999999, Math.max(0, Math.floor(value))) : 0]
    }),
  ) as unknown as StatValues
}

/** Monotone piecewise-linear approximation through observations and (0,0)/(cap,max). */
export function getHifSelectionExamBaseParameter(index: number, totalScore: number): number {
  const exam = HIF_SELECTION_EXAMS[index]
  if (!exam || Number.isNaN(totalScore) || totalScore <= 0) return 0
  if (totalScore >= exam.scoreCap) return exam.parameterCap
  const points = [
    { score: 0, parameter: 0 },
    ...exam.samples.filter(({ score }) => score < exam.scoreCap),
    { score: exam.scoreCap, parameter: exam.parameterCap },
  ]
  const upperIndex = points.findIndex(({ score }) => score >= totalScore)
  const lower = points[upperIndex - 1]
  const upper = points[upperIndex]
  const fraction = (totalScore - lower.score) / (upper.score - lower.score)
  return Math.round(lower.parameter + fraction * (upper.parameter - lower.parameter))
}

/** Reward before parameter bonuses; preserve the integer total using Wiki's carry rule. */
export function getHifSelectionExamReward(index: number, inputScores: StatValues): StatValues {
  return allocateReward(index, normalizeHifSelectionExamScores(inputScores))
}

function allocateReward(index: number, scores: StatValues): StatValues {
  const exam = HIF_SELECTION_EXAMS[index]
  const totalScore = scores.vo + scores.da + scores.vi
  const base = getHifSelectionExamBaseParameter(index, totalScore)
  const reward: StatValues = { vo: 0, da: 0, vi: 0 }
  if (!exam || totalScore === 0 || base === 0) return reward
  const ordered = [...STATS].sort((a, b) =>
    Math.abs(scores[a] - scores[b]) < 1e-7 ? 0 : scores[a] - scores[b],
  )
  const scale = base / exam.parameterCap
  let cumulative = 0
  let allocated = 0
  ordered.slice(0, 2).forEach((stat) => {
    cumulative += scale * (exam.fixedParameter / 3 + (exam.distributedParameter * scores[stat]) / totalScore)
    const nextAllocated = Math.floor(cumulative + 1e-9)
    reward[stat] = nextAllocated - allocated
    allocated = nextAllocated
  })
  reward[ordered[2]] = base - allocated
  return reward
}
