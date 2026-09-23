/**
 * Public Wiki samples and multiplier tables.
 * https://seesaawiki.jp/gakumasu/d/H.I.F#schedule_F
 * https://wikiwiki.jp/gakumas/HIF/基本情報
 * Star-power score caps are the Wiki's estimates, not confirmed in-game thresholds.
 */
export const HIF_FINAL_ROUNDS = [
  {
    label: 'ラウンド1',
    defaultScore: 1400000,
    scoreInputMax: 1400000,
    starPowerScoreCap: 491667,
    starPowerCap: 120,
    samples: [
      { score: 0, starPower: 0 },
      { score: 655, starPower: 1 },
      { score: 135852, starPower: 41 },
      { score: 142968, starPower: 43 },
      { score: 172380, starPower: 52 },
      { score: 331838, starPower: 100 },
      { score: 363050, starPower: 104 },
      { score: 370240, starPower: 105 },
      { score: 414997, starPower: 110 },
      { score: 461694, starPower: 116 },
      { score: 478582, starPower: 118 },
    ],
  },
  {
    label: 'ラウンド2',
    defaultScore: 2400000,
    scoreInputMax: 2400000,
    starPowerScoreCap: 986667,
    starPowerCap: 150,
    samples: [
      { score: 0, starPower: 0 },
      { score: 643, starPower: 1 },
      { score: 104179, starPower: 20 },
      { score: 197560, starPower: 38 },
      { score: 229233, starPower: 43 },
      { score: 470063, starPower: 91 },
      { score: 497657, starPower: 97 },
      { score: 715913, starPower: 129 },
      { score: 732764, starPower: 130 },
      { score: 752572, starPower: 132 },
      { score: 891092, starPower: 142 },
      { score: 972766, starPower: 148 },
    ],
  },
] as const
