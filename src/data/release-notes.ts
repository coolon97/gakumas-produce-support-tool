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
    version: '0.1.1',
    date: '2026-10-05',
    title: 'Pアイドル・サポートカードを追加',
    idolVersionIds: ['riiriya-ssr-sense-a2b4ea9bff', 'ume-ssr-anomaly-f382343e41'],
    supportCardIds: ['gkm_0205', 'gkm_0206'],
    changes: [
      '更新内容を初回アクセス時に表示する機能を追加しました。作者・ツール情報の「更新履歴」からいつでも見直せます。',
    ],
  },
]
