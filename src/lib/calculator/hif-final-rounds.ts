import { HIF_FINAL_ROUNDS } from '@/data/hif-final-rounds'
import { HIF_STAR_POWER_CAP } from '@/data/hif'

export function capHifFinalStarPower(starPower: number): number {
  return Math.min(HIF_STAR_POWER_CAP, Math.max(0, Math.floor(starPower)))
}

/** H.I.F. final-round score multipliers and estimated caps from the public Wiki. */
export function getHifFinalRoundStarPower(roundIndex: number, inputScore: number): number {
  const round = HIF_FINAL_ROUNDS[roundIndex]
  if (!round || !Number.isFinite(inputScore) || inputScore <= 0) return 0
  const score = Math.min(round.starPowerScoreCap, Math.floor(inputScore))
  if (score >= round.starPowerScoreCap) return round.starPowerCap
  // 倍率は分数で表し、境界付近の浮動小数点誤差を避ける。
  if (roundIndex === 0) {
    if (score <= 200000) return Math.ceil((score * 3) / 10000)
    if (score <= 300000) return Math.ceil(60 + ((score - 200000) * 9) / 25000)
    return Math.ceil(96 + ((score - 300000) * 3) / 25000)
  }
  if (score <= 400000) return Math.ceil((score * 3) / 16000)
  if (score <= 600000) return Math.ceil(75 + ((score - 400000) * 9) / 40000)
  return Math.ceil(120 + ((score - 600000) * 3) / 40000)
}
