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
      'これがあのかぼちゃ……のLv55、ふたりで衣装作りのLv35・40・45は、wikiの数値が未掲載のため選択対象から外しています。',
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
