import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import { IDOLS, findIdolVersion } from '../src/data/idols.ts'
import { getIdolProgression, normalizeTalentStage } from '../src/lib/idol-progression.ts'
import { getProduceStats } from '../src/lib/calculator/produce-stats.ts'
import { DEFAULT_PRODUCE_CONFIG } from '../src/store/produce-config.ts'
import { useAppStore } from '../src/store/index.ts'
import { loadAppInputs, saveAppInputs } from '../src/store/app-inputs.ts'
import { calcHif } from '../src/lib/calculator/hif.ts'
import { normalizeHifSchedule } from '../src/lib/hif-schedule.ts'
import { compareIdolEntries, normalizeIdolSortKey } from '../src/lib/idol-sort.ts'
import cardsData from '../data/cards.json'
import type { SupportCard } from '../src/types/card.ts'

test('idol sorting prioritizes each selected field and places undated costumes last', () => {
  const make = (
    idolIndex: number,
    id: string,
    releaseDate: string | undefined,
    plan: 'sense' | 'logic' | 'anomaly',
    rarity: 'SSR' | 'SR' | 'R',
  ) => ({
    idol: IDOLS[idolIndex],
    version: { ...IDOLS[idolIndex].versions[0], id, releaseDate, plan, rarity },
  })
  const entries = [
    make(2, 'a', '2026/9/2', 'anomaly', 'R'),
    make(1, 'b', '2026/10/1', 'sense', 'SR'),
    make(0, 'c', '2026-09-02', 'logic', 'SSR'),
    make(0, 'd', undefined, 'sense', 'R'),
  ]
  const sorted = (key: 'release' | 'plan' | 'idol' | 'rarity') =>
    [...entries].sort((a, b) => compareIdolEntries(a, b, key)).map((entry) => entry.version.id)
  assert.deepEqual(sorted('release'), ['b', 'c', 'a', 'd'])
  assert.deepEqual(sorted('plan'), ['b', 'd', 'c', 'a'])
  assert.deepEqual(sorted('idol'), ['c', 'd', 'b', 'a'])
  assert.deepEqual(sorted('rarity'), ['c', 'b', 'd', 'a'])
  assert.deepEqual(
    entries.map((entry) => entry.version.id),
    ['a', 'b', 'c', 'd'],
  )
  assert.equal(normalizeIdolSortKey('unknown'), 'release')
  assert.equal(normalizeIdolSortKey('plan'), 'plan')
})

test('secondary idol sort priorities override newer releases and retain date order within groups', () => {
  const make = (
    idolIndex: number,
    id: string,
    date: string,
    rarity: 'SSR' | 'SR',
    plan: 'sense' | 'logic' = 'sense',
  ) => ({
    idol: IDOLS[idolIndex],
    version: { ...IDOLS[idolIndex].versions[0], id, releaseDate: date, rarity, plan },
  })
  const entries = [
    make(0, 'sr-new', '2026/09/22', 'SR'),
    make(1, 'ssr-other-idol', '2026/09/21', 'SSR'),
    make(0, 'ssr-old', '2026/01/01', 'SSR'),
    make(0, 'ssr-new', '2026/02/01', 'SSR'),
    make(0, 'logic-newest', '2026/09/23', 'SSR', 'logic'),
  ]
  const sorted = (key: 'plan' | 'idol' | 'rarity') =>
    [...entries].sort((a, b) => compareIdolEntries(a, b, key)).map((entry) => entry.version.id)
  assert.deepEqual(sorted('plan'), ['ssr-new', 'ssr-old', 'ssr-other-idol', 'sr-new', 'logic-newest'])
  assert.deepEqual(sorted('idol'), ['logic-newest', 'ssr-new', 'ssr-old', 'sr-new', 'ssr-other-idol'])
  assert.deepEqual(sorted('rarity'), ['logic-newest', 'ssr-new', 'ssr-old', 'ssr-other-idol', 'sr-new'])
})

test('all 13 characters and current costumes have unique IDs, verified numbers, talent curves and local illustrations when available', () => {
  assert.equal(IDOLS.length, 13)
  const versions = IDOLS.flatMap((i) => i.versions)
  assert.ok(versions.length >= 153)
  assert.equal(new Set(versions.map((v) => v.id)).size, versions.length)
  for (const v of versions) {
    assert.ok(
      v.rarity &&
        v.talentLessonBonus &&
        v.talentSpRate &&
        v.trainingSpRate &&
        v.hifTrueStats &&
        v.hifTrueLessonBonus,
    )
    for (const numbers of [
      v.baseStats,
      v.hifTrueStats!,
      v.lessonBonus,
      v.hifTrueLessonBonus!,
      v.talentLessonBonus!,
    ])
      assert.ok(Object.values(numbers).every((n) => Number.isFinite(n) && n >= 0))
    assert.ok(Object.values(v.baseStats).some((n) => n > 0))
    assert.ok(Object.values(v.lessonBonus).some((n) => n > 0))
    const effectsByPlan = {
      sense: ['goodCondition', 'concentration'],
      logic: ['goodImpression', 'motivation'],
      anomaly: ['preservation', 'aggressive', 'fullPower'],
    }
    assert.ok(effectsByPlan[v.plan].includes(v.recommendedEffect))
  }
  assert.ok(
    versions.filter((v) => existsSync(`assets/game/PIdol/converted/${v.rarity}/${v.id}.webp`)).length >= 153,
  )
  assert.ok(versions.some((v) => v.name === '【ガラクタロード】十王星南' && v.releaseDate === '2026/09/10'))
  assert.ok(versions.some((v) => v.name === '【クライアイ】雨夜燕'))
  const latestHiro = versions.find((v) => v.name === '【め】篠澤広')!
  assert.ok(latestHiro)
  assert.ok(existsSync(`assets/game/PIdol/converted/${latestHiro.rarity}/${latestHiro.id}.webp`))
  const miracleHiro = versions.find((v) => v.id === 'hiro-ssr-anomaly3')!
  assert.deepEqual(miracleHiro.hifTrueLessonBonus, { vo: 2, da: 0, vi: 3 })
  assert.deepEqual(miracleHiro.lessonBonus, { vo: 30, da: 24.5, vi: 13 })
  for (const idol of IDOLS) {
    assert.equal(new Set(idol.versions.map((v) => JSON.stringify(v.hifTrueStats))).size, 1)
    assert.equal(new Set(idol.versions.map((v) => JSON.stringify(v.hifTrueLessonBonus))).size, 1)
  }
  assert.equal(findIdolVersion('temari', 'saki-r-sense'), undefined)
})

test('talent 3 removes only its own bonus below stage 3, talent 1 enables its SP bonus', () => {
  const saki = findIdolVersion('saki', 'saki-ssr-sense1')!
  assert.deepEqual(getIdolProgression(saki, 2).idolLessonBonus, { vo: 16.5, da: 16.5, vi: 20.5 })
  assert.deepEqual(getIdolProgression(saki, 3).idolLessonBonus, saki.lessonBonus)
  assert.deepEqual(getIdolProgression(saki, 0).idolBaseStats, saki.baseStats)
  const version = IDOLS.flatMap((i) => i.versions).find((v) => v.talentSpRate?.vi === 15)!
  assert.equal(
    getIdolProgression(version, 1).idolSpRate.vi - getIdolProgression(version, 0).idolSpRate.vi,
    15,
  )
  assert.equal(normalizeTalentStage(99), 4)
  assert.equal(normalizeTalentStage(-1), 0)
})

test('store slices retain manual memory/base inputs; costume changes use selected stage and talent persists on revisit', () => {
  const original = useAppStore.getState()
  try {
    const actions = useAppStore.getState()
    actions.setIdol('saki', 'saki-ssr-sense1')
    actions.setIdolBaseStats({ vo: 1, da: 2, vi: 3 })
    actions.setMemoryLessonBonus({ vo: 7, da: 8, vi: 9 })
    actions.setIdolTalentStage(2)
    let config = useAppStore.getState().produceConfig
    assert.deepEqual(config.idolBaseStats, { vo: 1, da: 2, vi: 3 })
    assert.deepEqual(config.memoryLessonBonus, { vo: 7, da: 8, vi: 9 })
    assert.deepEqual(config.idolLessonBonus, { vo: 16.5, da: 16.5, vi: 20.5 })
    actions.setVersion('saki-r-sense')
    config = useAppStore.getState().produceConfig
    assert.equal(config.idolTalentStage, 2)
    assert.deepEqual(
      config.idolLessonBonus,
      getIdolProgression(findIdolVersion('saki', 'saki-r-sense')!, 2).idolLessonBonus,
    )
    const values = new Map<string, string>()
    const storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v)
      },
    }
    saveAppInputs(useAppStore.getState(), storage)
    assert.deepEqual(loadAppInputs(storage).produceConfig, {
      ...config,
      hif: { ...config.hif, schedule: normalizeHifSchedule(config.hif.schedule) },
    })
  } finally {
    useAppStore.setState(original)
  }
})

test('changing the selected P idol preserves deck, memory and schedule within a plan', () => {
  const original = useAppStore.getState()
  try {
    const sourceIdol = IDOLS[0]
    const sourceVersion = sourceIdol.versions[0]
    const candidates = IDOLS.flatMap((idol) => idol.versions.map((version) => ({ idol, version })))
    const samePlanTarget = candidates.find(
      ({ idol, version }) =>
        version.plan === sourceVersion.plan && (idol.id !== sourceIdol.id || version.id !== sourceVersion.id),
    )!
    const differentPlanTarget = candidates.find(({ version }) => version.plan !== sourceVersion.plan)!
    const configured = structuredClone(DEFAULT_PRODUCE_CONFIG)
    configured.idolId = sourceIdol.id
    configured.idolVersionId = sourceVersion.id
    configured.memoryBaseStats = { vo: 10, da: 20, vi: 30 }
    configured.memoryLessonBonus = { vo: 1, da: 2, vi: 3 }
    configured.hif.carryoverSkillCards[0].enabled = true
    configured.hif.schedule!.steps[0].action = 'consultation'
    configured.hif.round1Score = 800000
    configured.hif.spBonusLevel = 3
    configured.eventTriggerCounts = { consultation: 2 }
    configured.postEventEnabledSlots = [true, false, false, false, false, false]
    const supportCard = (cardsData as SupportCard[])[0]
    useAppStore.setState({
      produceConfig: configured,
      deck: [{ card: supportCard, level: supportCard.maxLevel, isRental: false }],
    })

    useAppStore.getState().setIdol(sourceIdol.id, sourceVersion.id)
    assert.equal(useAppStore.getState().deck.length, 1)
    assert.equal(useAppStore.getState().produceConfig.memoryBaseStats.vo, 10)

    useAppStore.getState().setIdol(samePlanTarget.idol.id, samePlanTarget.version.id)
    const preserved = useAppStore.getState()
    assert.equal(preserved.deck.length, 1)
    assert.deepEqual(preserved.produceConfig.memoryBaseStats, { vo: 10, da: 20, vi: 30 })
    assert.deepEqual(preserved.produceConfig.memoryLessonBonus, { vo: 1, da: 2, vi: 3 })
    assert.deepEqual(preserved.produceConfig.hif, configured.hif)
    assert.deepEqual(preserved.produceConfig.eventTriggerCounts, configured.eventTriggerCounts)
    assert.deepEqual(preserved.produceConfig.postEventEnabledSlots, configured.postEventEnabledSlots)

    useAppStore.getState().setIdol(differentPlanTarget.idol.id, differentPlanTarget.version.id)
    const reset = useAppStore.getState()
    assert.deepEqual(reset.deck, [])
    assert.deepEqual(reset.produceConfig.memoryBaseStats, { vo: 0, da: 0, vi: 0 })
    assert.deepEqual(reset.produceConfig.memoryLessonBonus, { vo: 0, da: 0, vi: 0 })
    assert.ok(reset.produceConfig.hif.carryoverSkillCards.every((entry) => !entry.enabled))
    assert.ok(reset.produceConfig.hif.schedule!.steps.every((step) => step.action === null))
    assert.equal(reset.produceConfig.hif.round1Score, DEFAULT_PRODUCE_CONFIG.hif.round1Score)
    assert.deepEqual(reset.produceConfig.eventTriggerCounts, {})
    assert.deepEqual(reset.produceConfig.postEventEnabledSlots, [false, false, false, false, false, false])
    assert.equal(reset.produceConfig.hif.spBonusLevel, 3)
  } finally {
    useAppStore.setState(original)
  }
})

test('HIF result shares displayed stats and applies talent and HIF bonuses once', () => {
  const idol = IDOLS.find((i) => i.versions.some((v) => v.talentSpRate?.vi === 15))!
  const version = idol.versions.find((v) => v.talentSpRate?.vi === 15)!
  const config = {
    ...structuredClone(DEFAULT_PRODUCE_CONFIG),
    ...getIdolProgression(version, 0),
    idolId: idol.id,
    idolVersionId: version.id,
    idolTalentStage: 0,
  }
  const stats = getProduceStats([], config)
  const result = calcHif([], config)
  assert.deepEqual(result.totalSpRateByStat, stats.totalSpRate)
  assert.deepEqual(result.totalLessonBonusByStat, stats.totalLessonBonus)
  assert.deepEqual(result.statSourceBreakdown.initial, stats.totalInitialStats)
  const updated = getProduceStats([], { ...config, idolTalentStage: 1 })
  assert.equal(updated.totalSpRate.vi - stats.totalSpRate.vi, 15)
})
