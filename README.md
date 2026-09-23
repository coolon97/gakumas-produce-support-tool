# 学マス H.I.F評価 理論値 計算ツール

学園アイドルマスターのプロデュースを支援する非公式のWebツールです。

## 開発・ビルド

Node.js 22以降とnpmを使用します。

```sh
npm ci
npm run dev
npm test
```

```sh
npm run build
npm run preview
```

ビルド結果は `dist/` に生成されます。入力内容はブラウザのlocalStorageに保存されます。

## 構成

- `src/components/`, `src/lib/`, `src/store/`, `src/types/`: 画面・計算・状態管理・型定義
- `src/data/`: データ処理とTypeScriptの定義
- `data/`: JSONデータとデータ利用条件
- `assets/game/`, `assets/author/`: アプリで使用する画像
- `tests/`: アプリのデータ・計算・入力保存のテスト

このコピーには、実行・ビルド用ファイル、アプリ用テストと権利表示を収録しています。データ取得スクリプトとそのテスト、作業資料、元スクリーンショット、生成物、Git履歴は含めていません。`npm test` は単体で実行できます。

## ライセンス

ソフトウェアは [BSD 3-Clause License](LICENSE) です。データ・画像は別扱いです。

- [適用範囲](LICENSING.md)
- [データ利用条件（仮置き）](data/README.md)
- [画像の権利表示](assets/game/README.md)
- [Zen Maru Gothicのライセンス](assets/fonts/OFL.txt)

データ側の条件は未確定です。公開前に著作者・出典などを確定してください。

## リポジトリ

[GitHubでソースコードを見る](https://github.com/coolon97/gakumas-produce-support-tool)
