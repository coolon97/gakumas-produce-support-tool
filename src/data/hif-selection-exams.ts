/** Public Wiki samples checked 2026-09-18; game formula remains unconfirmed.
 * https://seesaawiki.jp/gakumasu/d/H.I.F
 * Selection exam 1 also includes user-provided in-game observations at 6,631
 * (116 total parameters) and 7,288 (33 Vo + 64 Da + 26 Vi = 123).
 * The Wiki observations at or below 5,500 are retained for app interpolation
 * but excluded when fitting candidate formulas because their reliability is low.
 * Selection exams 1 and 2 use the Wiki's calculated star-power cap scores.
 * Selection exam 3 uses the user's specified cap score of 390,910.
 */
export const HIF_SELECTION_EXAMS = [
  {
    scoreCap: 14001,
    starPowerCap: 40,
    parameterCap: 140,
    fixedParameter: 60,
    distributedParameter: 80,
    starPowerSegments: [
      { endScore: 3000, rate: 1 / 150 },
      { endScore: 7000, rate: 0.003 },
      { endScore: 15000, rate: 0.001 },
    ],
    samples: [
      { score: 3037, parameter: 46 },
      { score: 4325, parameter: 62 },
      { score: 6631, parameter: 116 },
      { score: 7288, parameter: 123 },
      { score: 7506, parameter: 124 },
      { score: 8860, parameter: 133, scoreRange: [8767, 8953] },
      { score: 9442, parameter: 138, scoreRange: [9421, 9463] },
      { score: 9695, parameter: 139, scoreRange: [9643, 9747] },
      { score: 10463, parameter: 140 },
    ],
  },
  {
    scoreCap: 146364,
    starPowerCap: 110,
    parameterCap: 440,
    fixedParameter: 240,
    distributedParameter: 200,
    starPowerSegments: [
      { endScore: 30000, rate: 11 / 6000 },
      { endScore: 70000, rate: 0.000825 },
      { endScore: 150000, rate: 0.000275 },
    ],
    samples: [
      { score: 31853, parameter: 176 },
      { score: 49578, parameter: 347 },
      { score: 52479, parameter: 362 },
      { score: 56496, parameter: 373 },
      { score: 57916, parameter: 378 },
      { score: 71196, parameter: 417 },
      { score: 80611, parameter: 440 },
    ],
  },
  {
    scoreCap: 390910,
    starPowerCap: 110,
    parameterCap: 520,
    fixedParameter: 300,
    distributedParameter: 220,
    starPowerSegments: [
      { endScore: 100000, rate: 0.00055 },
      { endScore: 200000, rate: 0.00033 },
      // Wikiの倍率は20万点以降0.00011。入力上限390,910点へ圧縮しない。
      { endScore: 400000, rate: 0.00011 },
    ],
    samples: [
      { score: 44370, parameter: 118 },
      { score: 73660, parameter: 193 },
      { score: 107167, parameter: 300 },
      { score: 136238, parameter: 426 },
      { score: 158365, parameter: 461 },
      { score: 160875, parameter: 463 },
      { score: 164864, parameter: 468 },
      { score: 195234, parameter: 515 },
      { score: 204894, parameter: 520 },
    ],
  },
] as const
