import type {
  HifCustomPItemColor,
  HifCustomPItemDecoration,
  HifCustomPItemMascot,
  HifCustomPItemSelection,
} from '@/types/hif-schedule'

/** H.I.F カスタムPアイテムの選択経路。4候補のうち実機ではランダムな3候補が提示される。 */
export const CUSTOM_P_ITEM_MASCOTS: Record<HifCustomPItemColor, readonly HifCustomPItemMascot[]> = {
  red: ['bear', 'girl', 'robo', 'moja'],
  green: ['bird', 'rabbit', 'bear', 'girl'],
  yellow: ['robo', 'moja', 'bird', 'rabbit'],
}
export const CUSTOM_P_ITEM_COLORS = ['red', 'green', 'yellow'] as const
export const CUSTOM_P_ITEM_DECORATIONS = ['flower', 'ribbon', 'medal', 'wing'] as const
export const CUSTOM_P_ITEM_COLOR_LABELS: Record<HifCustomPItemColor, string> = {
  red: '赤',
  green: '緑',
  yellow: '黄',
}
export const CUSTOM_P_ITEM_MASCOT_LABELS: Record<HifCustomPItemMascot, string> = {
  bear: 'くま',
  bird: 'インコ',
  girl: '人形',
  moja: 'もじゃ',
  rabbit: 'うさぎ',
  robo: 'ロボ',
}
export const CUSTOM_P_ITEM_DECORATION_LABELS: Record<HifCustomPItemDecoration, string> = {
  flower: '花',
  ribbon: 'リボン',
  medal: 'メダル',
  wing: '羽',
}
export function isLessonCustomPItem(color: HifCustomPItemColor, mascot: HifCustomPItemMascot): boolean {
  return (
    (color === 'red' && mascot === 'bear') ||
    (color === 'green' && mascot === 'bird') ||
    (color === 'yellow' && mascot === 'robo')
  )
}
export function getCustomPItemDecorations(
  color: HifCustomPItemColor,
  mascot: HifCustomPItemMascot,
): readonly HifCustomPItemDecoration[] {
  return isLessonCustomPItem(color, mascot) ? ['flower', 'ribbon', 'wing'] : CUSTOM_P_ITEM_DECORATIONS
}
export function getCustomPItemName(selection: HifCustomPItemSelection, stage: 1 | 2 | 3): string {
  if (!selection.color) return ''
  const pouch = `ポーチ（${CUSTOM_P_ITEM_COLOR_LABELS[selection.color]}）`
  if (stage === 1 || !selection.mascot) return pouch
  const mascot = CUSTOM_P_ITEM_MASCOT_LABELS[selection.mascot]
  const color = `（${CUSTOM_P_ITEM_COLOR_LABELS[selection.color]}）`
  return stage === 2 || !selection.decoration
    ? `${mascot}${color}`
    : `${CUSTOM_P_ITEM_DECORATION_LABELS[selection.decoration]}${mascot}${color}`
}
