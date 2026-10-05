# 学マス H.I.F評価 理論値 計算ツール

学園アイドルマスターのプロデュースシナリオ「H.I.F」における、プロデュース評価の理論値計算ツールです。

## 開発・ビルド

Node.js 22以降とnpmが必要です。

```sh
npm ci
npm run dev
npm test
```

```sh
npm run build
npm run preview
```

ビルド結果は `dist/` に生成されます。

## 更新履歴の追加

公開バージョンを更新するときは、`package.json`と`package-lock.json`のバージョンを揃え、`src/data/release-notes.ts`の先頭に同じバージョンの項目を追加します。日付はツールの公開日を指定し、追加カードはカタログのIDで指定します。過去の項目は残してください。

未読の更新はアクセス時に表示し、閉じた時にこのブラウザーのローカルストレージへ閲覧済みとして保存します。「作者・ツール情報」→「更新履歴」から再表示できます。ストレージを消した場合や別のブラウザーでは再表示されます。初回の使い方は更新内容を閉じた後に表示します。

## ライセンス

ソフトウェアは [BSD 3-Clause License](LICENSE) です。データ・画像は別扱いです。

## リポジトリ

[GitHubでソースコードを見る](https://github.com/coolon97/gakumas-produce-support-tool)
