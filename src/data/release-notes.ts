export type ReleaseNote = {
  version: string
  date: string
  title: string
  idolVersionIds: readonly string[]
  supportCardIds: readonly string[]
  changes: readonly string[]
}

// Add each published release at the beginning. Keep previous entries for the history.
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: '0.1.3',
    date: '2026-11-19',
    title: '氷渡香名江と新規サポートカードを追加',
    idolVersionIds: ['kanae-r-sense1', 'kanae-sr-sense1', 'kanae-ssr-sense1'],
    supportCardIds: ['gkm_0212', 'gkm_0213', 'gkm_0214', 'gkm_0215'],
    changes: [
      'お仕え前の準備運動はLv40のゲーム画面から登録し、下位レベルの数値と解放条件は類似Rカードから暫定補完しています。',
    ],
  },
  {
    version: '0.1.2',
    date: '2026-11-08',
    title: 'Pアイドル5枚・サポートカード5枚を追加',
    idolVersionIds: [
      'saki-ssr-logic5',
      'sena-ssr-sense3',
      'tsubame-ssr-anomaly2',
      'china-ssr-anomaly2',
      'misuzu-ssr-logic4',
    ],
    supportCardIds: ['gkm_0207', 'gkm_0208', 'gkm_0209', 'gkm_0210', 'gkm_0211'],
    changes: [
      'これがあのかぼちゃ……のLv55、ふたりで衣装作りのLv35・40・45、長旅おつかれさま！のLv50は、類似サポートカードの強化傾向に基づく暫定値で補完しています。',
      '雨夜燕のH.I.F True Endボーナスを全衣装に反映しました。',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-10-05',
    title: 'Pアイドル・サポートカードを追加',
    idolVersionIds: ['riiriya-ssr-sense4', 'ume-ssr-anomaly3'],
    supportCardIds: ['gkm_0205', 'gkm_0206'],
    changes: [
      '更新内容を初回アクセス時に表示する機能を追加しました。作者・ツール情報の「更新履歴」からいつでも見直せます。',
    ],
  },
]
