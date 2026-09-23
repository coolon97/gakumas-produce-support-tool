import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CardSkill, DeckCard, SupportCard } from '../src/types/card.ts'
import type { ProduceConfig } from '../src/types/produce.ts'
import type { SupportAbilitySpec } from '../src/types/support-ability.ts'
import { createDefaultHifConfig, HIF_CLASS_SCHEDULE } from '../src/data/hif.ts'
import { DEFAULT_PRODUCE_CONFIG } from '../src/store/produce-config.ts'
import { useAppStore } from '../src/store/index.ts'
import { calculate } from '../src/lib/calculator/index.ts'
import { simulateHifSchedule } from '../src/lib/calculator/hif-simulation.ts'
import {
  calcHif,
  getHifLessonBaseTotals,
  getHifEvaluation,
  getHifTriggerCount,
  getHifRound1Evaluation,
  getHifRound2Evaluation,
} from '../src/lib/calculator/hif.ts'
import { getParameterSortTriggerSetting } from '../src/lib/support-card-parameter-total.ts'
import { HIF_SELECTION_EXAMS } from '../src/data/hif-selection-exams.ts'
import {
  getHifSelectionExamBaseParameter,
  getHifSelectionExamReward,
  getHifSelectionExamConfiguredReward,
  getHifSelectionExamAllocation,
  getHifSelectionExamStarPower,
  moveHifExamAllocationBoundary,
  stepHifExamDanceReward,
  stepHifExamRewardBoundary,
} from '../src/lib/calculator/hif-selection-exams.ts'
import { toggleHifLessonParameter } from '../src/lib/hif-lesson-selection.ts'
import { HIF_FINAL_ROUNDS } from '../src/data/hif-final-rounds.ts'
import { getHifFinalRoundStarPower } from '../src/lib/calculator/hif-final-rounds.ts'
import { createInitialProduceState } from '../src/lib/calculator/hif-simulation-state.ts'
import { HIF_BASIC_SKILL_CARDS_BY_RECOMMENDED_EFFECT } from '../src/data/hif-basic-skill-cards.ts'

function config(): ProduceConfig {
  return {
    ...structuredClone(DEFAULT_PRODUCE_CONFIG),
    hif: {
      ...createDefaultHifConfig(),
      parameterBonusLevels: { vo: 0, da: 0, vi: 0 },
      spBonusLevel: 0,
      capBonusLevel: 0,
      selectionExams: createDefaultHifConfig().selectionExams.map((exam) => ({
        ...exam,
        useScoreCap: false,
      })),
    },
    idolId: 'test-idol',
    idolVersionId: 'test-version',
    idolBaseStats: { vo: 0, da: 0, vi: 0 },
    idolLessonBonus: { vo: 0, da: 0, vi: 0 },
  }
}
function ability(
  operations: SupportAbilitySpec['operations'],
  activation: SupportAbilitySpec['activation'] = { event: 'static' },
): SupportAbilitySpec {
  return {
    schemaVersion: 2,
    source: { templateId: 'static.initial_stat', parserVersion: 2 },
    activation,
    operations,
  }
}
function deck(abilities: SupportAbilitySpec[]): DeckCard[] {
  const skills: CardSkill[] = abilities.map((spec, i) => ({
    id: `skill-${i}`,
    name: 'テスト',
    description: 'テスト',
    unlockLevel: 1,
    ability: spec,
  }))
  const card: SupportCard = {
    id: 'test',
    name: 'テストカード',
    rarity: 'SSR',
    type: 'vocal',
    plan: 'free',
    maxLevel: 60,
    source: 'manual',
    updatedAt: '2026-09-18',
    skills,
  }
  return [{ card, level: 60, isRental: false }]
}

test('new HIF settings start with all maximum bonuses and apply them to actual gains', () => {
  const c = config()
  c.hif = createDefaultHifConfig()
  const result = calcHif(deck([]), c)
  assert.deepEqual(result.statSourceBreakdown.initial, { vo: 100, da: 100, vi: 100 })
  assert.deepEqual(result.totalLessonBonusByStat, { vo: 10, da: 10, vi: 10 })
  assert.deepEqual(result.totalSpRateByStat, { vo: 5, da: 5, vi: 5 })
  assert.equal(result.statCap, 3200)
  assert.ok(c.hif.selectionExams.every((exam) => exam.useScoreCap))
  assert.equal(c.hif.round1Score, 1400000)
  assert.equal(c.hif.round2Score, 2400000)
  assert.deepEqual(result.finalStats, { vo: 2148, da: 706, vi: 501 })
})

test('selection day 6 class uses the correct base gain', () => {
  assert.deepEqual(HIF_CLASS_SCHEDULE[1], { label: '選抜6日目', gain: 120 })
})

test('initial seven basic cards follow the selected idol recommended effect', () => {
  const c = config()
  c.idolId = 'misuzu'
  c.idolVersionId = 'misuzu-ssr-anomaly1'
  const basics = createInitialProduceState(c).snapshot.skillCards.filter((card) => card.source === 'basic')
  assert.equal(basics.length, 7)
  assert.deepEqual(
    basics.map(({ name, category, effectTags }) => ({ name, category, effectTags })),
    HIF_BASIC_SKILL_CARDS_BY_RECOMMENDED_EFFECT.preservation,
  )
  assert.ok(basics.every((card) => card.category === 'active' || card.category === 'mental'))
  assert.ok(basics.every((card) => card.effectTags.length > 0))
})

test('every recommended effect has a seven-card HIF basic deck', () => {
  Object.values(HIF_BASIC_SKILL_CARDS_BY_RECOMMENDED_EFFECT).forEach((cards) => {
    assert.equal(cards.length, 7)
    assert.ok(cards.every((card) => card.name.includes('基本')))
  })
})

test('selection days 10 and 17 classes use the correct base gain', () => {
  assert.deepEqual(HIF_CLASS_SCHEDULE.slice(2, 4), [
    { label: '選抜10日目', gain: 150 },
    { label: '選抜17日目', gain: 150 },
  ])
})

test('HIF public lessons increase only one sub attribute and use each day’s normal/SP values', () => {
  const c = config()
  assert.deepEqual(getHifLessonBaseTotals(c), {
    normalBaseTotal: { vo: 680, da: 180, vi: 0 },
    spBaseTotal: { vo: 0, da: 0, vi: 0 },
  })
  c.hif.lessons.forEach((lesson) => {
    lesson.type = 'sp'
  })
  assert.deepEqual(getHifLessonBaseTotals(c).spBaseTotal, { vo: 800, da: 340, vi: 0 })
  c.hif.lessons[0].enabled = false
  c.hif.lessons[1].param = 'visual'
  c.hif.lessons[1].subParam = 'vocal'
  assert.deepEqual(getHifLessonBaseTotals(c).spBaseTotal, { vo: 710, da: 270, vi: 80 })
})

test('three lesson buttons select main then sub, toggle off, promote sub and reject a third selection', () => {
  const lesson = { ...createDefaultHifConfig().lessons[0], param: null, subParam: null }
  const first = { ...lesson, ...toggleHifLessonParameter(lesson, 'visual') }
  assert.deepEqual({ param: first.param, subParam: first.subParam }, { param: 'visual', subParam: null })
  const second = { ...first, ...toggleHifLessonParameter(first, 'dance') }
  assert.deepEqual({ param: second.param, subParam: second.subParam }, { param: 'visual', subParam: 'dance' })
  assert.deepEqual(toggleHifLessonParameter(second, 'vocal'), { param: 'visual', subParam: 'dance' })
  assert.deepEqual(toggleHifLessonParameter(second, 'dance'), { param: 'visual', subParam: null })
  assert.deepEqual(toggleHifLessonParameter(second, 'visual'), { param: 'dance', subParam: null })
  assert.deepEqual(toggleHifLessonParameter(first, 'visual'), { param: null, subParam: null })
})

test('incomplete lesson selection excludes both its gains and trigger counts until both axes are set', () => {
  const c = config()
  c.hif.lessons[0].subParam = null
  assert.deepEqual(getHifLessonBaseTotals(c).normalBaseTotal, { vo: 630, da: 170, vi: 0 })
  const spec = ability([], { event: 'lesson_end' })
  c.eventTriggerCounts = { lesson_end: 8 }
  assert.equal(getHifTriggerCount(spec, c), 7)
  const result = calcHif(deck([]), c)
  assert.equal(result.eventCounts.normalLessons, 7)
  c.hif.lessons[0].subParam = 'dance'
  assert.equal(getHifTriggerCount(spec, c), 8)
})

test('support bonus is counted once, applies to selection rewards, and never to classes', () => {
  const c = config()
  c.hif.selectionExams[0] = { useScoreCap: true, totalScore: 0, vocalBoundary: 100, visualBoundary: 100 }
  c.idolLessonBonus = { vo: 10, da: 20, vi: 30 }
  c.hif.parameterBonusLevels.vo = 5
  const d = deck([
    ability([{ op: 'add_param_bonus', target: 'all', amount: { kind: 'literal', value: 10 } }]),
  ])
  const result = calcHif(d, c)
  assert.deepEqual(result.statSourceBreakdown.class, { vo: 900, da: 0, vi: 0 })
  assert.deepEqual(result.contributions[0].total, { vo: 78, da: 20, vi: 2 })
  assert.deepEqual(result.contributions[0].skillContributions[0].lessonBonusGain, { vo: 78, da: 20, vi: 2 })
  assert.equal(
    Number(
      result.contributions[0].effectBreakdowns.find((item) => item.key === 'lb:skill-0:vo')?.totalValueText,
    ),
    78,
  )
  assert.deepEqual(result.finalStats, { vo: 2014, da: 260, vi: 28 })
  assert.deepEqual(result.totalLessonBonusByStat, { vo: 30, da: 30, vi: 40 })
})

test('selection reward approximation reproduces observed samples and saturates at specified score caps', () => {
  HIF_SELECTION_EXAMS.forEach((exam, index) => {
    for (const sample of exam.samples) {
      assert.equal(getHifSelectionExamBaseParameter(index, sample.score), sample.parameter)
    }
    assert.equal(getHifSelectionExamBaseParameter(index, 0), 0)
    assert.equal(getHifSelectionExamBaseParameter(index, -100), 0)
    assert.equal(getHifSelectionExamBaseParameter(index, NaN), 0)
    assert.equal(getHifSelectionExamBaseParameter(index, exam.scoreCap), exam.parameterCap)
    assert.equal(getHifSelectionExamBaseParameter(index, exam.scoreCap * 2), exam.parameterCap)
    let previous = 0
    for (let score = 0; score <= exam.scoreCap; score += 37) {
      const value = getHifSelectionExamBaseParameter(index, score)
      assert.ok(value >= previous && value <= exam.parameterCap)
      previous = value
    }
  })
  assert.equal(getHifSelectionExamBaseParameter(0, 3681), 54)
})

test('selection exam star power follows the Wiki piecewise formula independently of default score caps', () => {
  assert.deepEqual(
    HIF_SELECTION_EXAMS.map((exam) => exam.scoreCap),
    [14001, 146364, 390000],
  )
  assert.deepEqual(
    [0, 3000, 3001, 7000, 7001, 14000, 14001, 15000].map((score) => getHifSelectionExamStarPower(0, score)),
    [0, 20, 21, 32, 33, 39, 40, 40],
  )
  assert.deepEqual(
    [0, 30000, 30001, 70000, 70001, 146363, 146364, 150000].map((score) =>
      getHifSelectionExamStarPower(1, score),
    ),
    [0, 55, 56, 88, 89, 109, 110, 110],
  )
  assert.deepEqual(
    [0, 100000, 100001, 200000, 200001, 375862, 389982, 390000, 390909, 390910, 400000].map((score) =>
      getHifSelectionExamStarPower(2, score),
    ),
    [0, 55, 56, 88, 89, 108, 109, 109, 109, 110, 110],
  )
})

test('exam allocation accepts fractional percentages and pushes the other handle when crossing', () => {
  const starting = { vocalBoundary: 33, visualBoundary: 67 }
  assert.deepEqual(
    [8, 9, 10, 11, 12, 49, 50, 51, 52].map(
      (value) => moveHifExamAllocationBoundary(starting, 'vocal', value).vocalBoundary,
    ),
    [8, 9, 10, 11, 12, 49, 50, 51, 52],
  )
  assert.deepEqual(moveHifExamAllocationBoundary(starting, 'vocal', 68), {
    vocalBoundary: 68,
    visualBoundary: 68,
  })
  assert.deepEqual(moveHifExamAllocationBoundary(starting, 'visual', 32), {
    vocalBoundary: 32,
    visualBoundary: 32,
  })
  assert.deepEqual(moveHifExamAllocationBoundary(starting, 'vocal', 10.6), {
    vocalBoundary: 10.6,
    visualBoundary: 67,
  })
})

test('exam reward controls adjust each parameter by exactly one at every exam level', () => {
  createDefaultHifConfig().selectionExams.forEach((defaults, index) => {
    const exam = { ...defaults, useScoreCap: true, vocalBoundary: 33, visualBoundary: 67 }
    for (const [handle, stat] of [
      ['vocal', 'vo'],
      ['visual', 'vi'],
    ] as const) {
      const before = getHifSelectionExamConfiguredReward(index, exam)[stat]
      const increased = { ...exam, ...stepHifExamRewardBoundary(index, exam, handle, 1) }
      assert.equal(
        getHifSelectionExamConfiguredReward(index, increased)[stat],
        before + 1,
        `exam ${index + 1} ${handle}`,
      )
      const decreased = { ...increased, ...stepHifExamRewardBoundary(index, increased, handle, -1) }
      assert.equal(getHifSelectionExamConfiguredReward(index, decreased)[stat], before)
    }
    const danceBefore = getHifSelectionExamConfiguredReward(index, exam).da
    const danceIncreased = { ...exam, ...stepHifExamDanceReward(index, exam, 1) }
    assert.equal(
      getHifSelectionExamConfiguredReward(index, danceIncreased).da,
      danceBefore + 1,
      `exam ${index + 1} dance`,
    )
    const danceDecreased = { ...danceIncreased, ...stepHifExamDanceReward(index, danceIncreased, -1) }
    assert.equal(getHifSelectionExamConfiguredReward(index, danceDecreased).da, danceBefore)
  })
  const custom = {
    ...createDefaultHifConfig().selectionExams[1],
    useScoreCap: false,
    totalScore: 52000,
    vocalBoundary: 40,
    visualBoundary: 70,
  }
  let current = custom
  for (let i = 0; i < 10; i++) {
    const before = getHifSelectionExamConfiguredReward(1, current).vo
    current = { ...current, ...stepHifExamRewardBoundary(1, current, 'vocal', 1) }
    assert.equal(getHifSelectionExamConfiguredReward(1, current).vo, before + 1)
  }
})

test('final-round star-power multipliers reproduce Wiki observations and use estimated caps', () => {
  HIF_FINAL_ROUNDS.forEach((round, index) => {
    round.samples.forEach((sample) =>
      assert.equal(getHifFinalRoundStarPower(index, sample.score), sample.starPower),
    )
    assert.equal(getHifFinalRoundStarPower(index, round.starPowerScoreCap), round.starPowerCap)
    assert.equal(getHifFinalRoundStarPower(index, round.scoreInputMax), round.starPowerCap)
    let previous = 0
    for (let score = 0; score <= round.starPowerScoreCap; score += 1000) {
      const current = getHifFinalRoundStarPower(index, score)
      assert.ok(current >= previous && current <= round.starPowerCap)
      previous = current
    }
  })
  assert.deepEqual(
    HIF_FINAL_ROUNDS.map((round) => [
      round.defaultScore,
      round.scoreInputMax,
      round.starPowerScoreCap,
      round.starPowerCap,
    ]),
    [
      [1400000, 1400000, 491667, 120],
      [2400000, 2400000, 986667, 150],
    ],
  )
  for (const [roundIndex, cases] of [
    [
      0,
      [
        [0, 0],
        [1, 1],
        [200000, 60],
        [200001, 61],
        [300000, 96],
        [300001, 97],
        [491666, 119],
        [491667, 120],
      ],
    ],
    [
      1,
      [
        [0, 0],
        [1, 1],
        [400000, 75],
        [400001, 76],
        [600000, 120],
        [600001, 121],
        [645739, 124],
        [986666, 149],
        [986667, 150],
      ],
    ],
  ] as const) {
    cases.forEach(([score, expected]) =>
      assert.equal(getHifFinalRoundStarPower(roundIndex, score), expected, `${roundIndex}:${score}`),
    )
  }
})

test('selection scores allocate fixed and proportional rewards, carry rounding and preserve totals', () => {
  const observedExam1Scores = { vo: 955, da: 4215, vi: 1461 }
  assert.deepEqual(getHifSelectionExamReward(0, observedExam1Scores), { vo: 26, da: 59, vi: 31 })
  assert.deepEqual(
    getHifSelectionExamConfiguredReward(0, {
      useScoreCap: false,
      totalScore: 6631,
      vocalBoundary: (955 / 6631) * 100,
      visualBoundary: (5170 / 6631) * 100,
      deletedBasicCardIds: [],
    }),
    { vo: 26, da: 59, vi: 31 },
  )
  assert.deepEqual(getHifSelectionExamReward(0, { vo: 15000, da: 0, vi: 0 }), { vo: 100, da: 20, vi: 20 })
  assert.deepEqual(getHifSelectionExamReward(1, { vo: 0, da: 150000, vi: 0 }), { vo: 80, da: 280, vi: 80 })
  assert.deepEqual(getHifSelectionExamReward(2, { vo: 0, da: 0, vi: 400000 }), { vo: 100, da: 100, vi: 320 })
  assert.deepEqual(getHifSelectionExamReward(0, { vo: 30000, da: 0, vi: 0 }), { vo: 100, da: 20, vi: 20 })
  assert.deepEqual(getHifSelectionExamReward(0, { vo: 0, da: 0, vi: 0 }), { vo: 0, da: 0, vi: 0 })
  assert.deepEqual(getHifSelectionExamReward(0, { vo: NaN, da: -5, vi: Infinity }), { vo: 0, da: 0, vi: 0 })
  for (let index = 0; index < 3; index++) {
    for (const scores of [
      { vo: 1234, da: 900, vi: 17 },
      { vo: 70000, da: 1000, vi: 30000 },
      { vo: 500000, da: 500000, vi: 500000 },
    ]) {
      const reward = getHifSelectionExamReward(index, scores)
      assert.equal(
        reward.vo + reward.da + reward.vi,
        getHifSelectionExamBaseParameter(index, scores.vo + scores.da + scores.vi),
      )
      assert.ok(Object.values(reward).every((value) => Number.isInteger(value) && value >= 0))
    }
  }
})

test('score cap checkbox and two boundaries drive actual rewards without losing manual scores', () => {
  const c = config()
  c.hif.lessons.forEach((lesson) => {
    lesson.enabled = false
  })
  c.hif.classes.forEach((entry) => {
    entry.enabled = false
  })
  const exam = { useScoreCap: true, totalScore: 3681, vocalBoundary: 25, visualBoundary: 75 }
  c.hif.selectionExams[0] = exam
  assert.deepEqual(getHifSelectionExamAllocation(exam), { vo: 25, da: 50, vi: 25 })
  assert.deepEqual(calcHif([], c).finalStats, { vo: 40, da: 60, vi: 40 })
  exam.useScoreCap = false
  assert.deepEqual(calcHif([], c).finalStats, { vo: 15, da: 24, vi: 15 })
  assert.equal(exam.totalScore, 3681)
  for (const [left, right] of [
    [0, 0],
    [0, 100],
    [100, 100],
    [50, 50],
    [33, 67],
  ]) {
    const setting = { ...exam, vocalBoundary: left, visualBoundary: right }
    const reward = getHifSelectionExamConfiguredReward(0, setting)
    assert.equal(reward.vo + reward.da + reward.vi, 54)
  }
})

test('HIF initial bonuses are added once and final stat cap follows cap bonus', () => {
  const c = config()
  c.idolBaseStats.vo = 4000
  c.hif.parameterBonusLevels.da = 3
  c.hif.capBonusLevel = 6
  c.hif.spBonusLevel = 5
  const result = calcHif(
    deck([
      ability([{ op: 'add_stat', stat: 'da', timing: 'initial', amount: { kind: 'literal', value: 65 } }]),
    ]),
    c,
  )
  assert.equal(result.finalStats.vo, 3200)
  assert.equal(result.statSourceBreakdown.initial.da, 125)
  assert.equal(result.statCap, 3200)
  assert.equal(result.totalSpRateByStat.vo, 5)
})

test('HIF ignores locked skills and disabled lessons/classes', () => {
  const c = config()
  c.hif.lessons.forEach((lesson) => {
    lesson.enabled = false
  })
  c.hif.classes.forEach((entry) => {
    entry.enabled = false
  })
  const d = deck([
    ability([{ op: 'add_stat', stat: 'vo', timing: 'initial', amount: { kind: 'literal', value: 65 } }]),
  ])
  d[0].card.skills[0].unlockLevel = 60
  d[0].level = 40
  const result = calcHif(d, c)
  assert.deepEqual(result.finalStats, { vo: 0, da: 0, vi: 0 })
  assert.deepEqual(result.eventCounts, { normalLessons: 0, spLessons: 0, supportEvents: 0, exams: 5 })
})

test('HIF trigger defaults follow lesson type and main axis; all predicates require explicit counts', () => {
  const c = config()
  c.hif.lessons[0] = { ...c.hif.lessons[0], type: 'sp' }
  c.hif.lessons[1].param = 'dance'
  const spec = ability([], { event: 'lesson_end', lessonKind: 'sp', lessonParam: 'vocal' })
  spec.predicate = { type: 'condition', condition: { type: 'owned_skill_cards_gte', value: 20 } }
  assert.equal(getHifTriggerCount(spec, c), 0)
  c.eventTriggerCounts = { [getParameterSortTriggerSetting(spec).key]: 5 }
  assert.equal(getHifTriggerCount(spec, c), 1)
  spec.predicate = { type: 'condition', condition: { type: 'stat_gte', stat: 'vo', value: 400 } }
  assert.equal(getHifTriggerCount(spec, c), 0)
  c.eventTriggerCounts = { [getParameterSortTriggerSetting(spec).key]: 5 }
  assert.equal(getHifTriggerCount(spec, c), 1)
  spec.predicate = { type: 'condition', condition: { type: 'stat_gte', stat: 'da', value: 400 } }
  assert.equal(getHifTriggerCount(spec, c), 0)
  const exam = ability([], { event: 'exam_end' })
  c.eventTriggerCounts.exam_end = 10
  assert.equal(getHifTriggerCount(exam, c), 5)
  exam.limits = [{ scope: 'produce', max: 3 }]
  assert.equal(getHifTriggerCount(exam, c), 3)
})

test('P item direct gains respect toggle, exact predicates and produce limit independently of post event', () => {
  const c = config()
  c.hif.lessons.forEach((lesson) => {
    lesson.enabled = false
  })
  c.hif.classes.forEach((entry) => {
    entry.enabled = false
  })
  const d = deck([])
  const spec = ability(
    [{ op: 'add_stat', stat: 'vi', timing: 'activation', amount: { kind: 'literal', value: 30 } }],
    { event: 'skill_card_gained' },
  )
  spec.predicate = { type: 'condition', condition: { type: 'card_rarity_is', value: 'SSR' } }
  spec.limits = [{ scope: 'produce', max: 3 }]
  d[0].card.supportEventRewards = [
    { kind: 'p_item', name: 'テストPアイテム', effect: 'テスト', parameterAbility: spec },
  ]
  c.eventTriggerCounts = { skill_card_gained: 9, [getParameterSortTriggerSetting(spec).key]: 5 }
  assert.equal(calcHif(d, c).finalStats.vi, 0)
  c.hif.includePItems = true
  const result = calcHif(d, c)
  assert.equal(result.finalStats.vi, 90)
  assert.equal(result.contributions[0].effectBreakdowns[0].triggerCount, 3)
  c.eventTriggerCounts[getParameterSortTriggerSetting(spec).key] = 0
  assert.equal(calcHif(d, c).finalStats.vi, 0)
})

test('HIF evaluation uses raw round 1 score, final stars and includes negative round 2 correction', () => {
  const c = config()
  c.hif.starPower = 1335
  assert.deepEqual(getHifEvaluation({ vo: 2000, da: 2000, vi: 2000 }, c), {
    statsScore: 12000,
    starPowerScore: 10012,
    round1Score: 5500,
    round2Score: 5400,
    total: 32912,
  })
  c.hif.round2Score = 600000
  assert.equal(getHifEvaluation({ vo: 0, da: 0, vi: 0 }, c).round2Score, -2000)
})

test('HIF piecewise score conversion covers all boundaries and plateau limits', () => {
  const first = [
    [0, 0],
    [300000, 0],
    [300001, 0],
    [700000, 4000],
    [700001, 4000],
    [1000000, 4900],
    [1000001, 4900],
    [1200000, 5300],
    [1200001, 5300],
    [1400000, 5500],
    [1400001, 5500],
    [9999999, 5500],
  ]
  const second = [
    [0, -2000],
    [600000, -2000],
    [600001, -2000],
    [900000, -800],
    [900001, -800],
    [1500000, 4000],
    [1500001, 4000],
    [2000000, 5000],
    [2000001, 5000],
    [2400000, 5400],
    [2400001, 5400],
    [9999999, 5400],
  ]
  first.forEach(([score, expected]) =>
    assert.equal(getHifRound1Evaluation(score), expected, `round1:${score}`),
  )
  second.forEach(([score, expected]) =>
    assert.equal(getHifRound2Evaluation(score), expected, `round2:${score}`),
  )
})

test('HIF store retains trigger counts, normalizes bounds and excludes matching main/sub', () => {
  useAppStore.setState({ produceConfig: structuredClone(DEFAULT_PRODUCE_CONFIG) })
  const store = useAppStore.getState()
  store.setEventTriggerCount('outing_end', 5)
  store.setHifConfig({
    starPower: 9999,
    capBonusLevel: 99,
    spBonusLevel: -1,
    round1Score: -5,
    selectionExams: [
      { useScoreCap: false, totalScore: 4325.8, vocalBoundary: -10, visualBoundary: Infinity },
    ],
    lessons: [
      { ...createDefaultHifConfig().lessons[0], subParam: 'vocal' },
      ...createDefaultHifConfig().lessons.slice(1),
    ],
  })
  const current = useAppStore.getState().produceConfig
  assert.equal(current.eventTriggerCounts?.outing_end, 5)
  assert.equal(current.hif.starPower, 1335)
  assert.equal(current.hif.capBonusLevel, 6)
  assert.equal(current.hif.spBonusLevel, 0)
  assert.equal(current.hif.round1Score, 0)
  assert.deepEqual(current.hif.selectionExams[0], {
    useScoreCap: false,
    totalScore: 4325,
    vocalBoundary: 0,
    visualBoundary: 67,
  })
  assert.equal(current.hif.selectionExams[1].useScoreCap, true)
  assert.equal(current.hif.lessons[0].subParam, 'dance')
  store.setHifConfig({ round1Score: 2000000, round2Score: 3000000 })
  assert.equal(useAppStore.getState().produceConfig.hif.round1Score, 1400000)
  assert.equal(useAppStore.getState().produceConfig.hif.round2Score, 2400000)
})

test('calculate always dispatches to the HIF schedule simulator', () => {
  const c = config()
  const d = deck([])
  assert.deepEqual(calculate(d, c), simulateHifSchedule(d, c))
})
