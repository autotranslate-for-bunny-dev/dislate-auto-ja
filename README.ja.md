[English](./README.md) | 日本語

# Dislate Auto-JA

`Dislate Auto-JA` は、Bunny 上でサーバー内の日本語以外のメッセージを日本語へ自動翻訳するプラグインです。DM は自動翻訳せず、長押し翻訳や `/translate` を使う前提にしています。

## Bunny に追加する URL

GitHub Pages の公開後、Bunny には次の URL を追加してください。

`https://autotranslate-for-bunny-dev.github.io/dislate-auto-ja/dislate/`

## 主な機能

- サーバー、スレッド、フォーラム内の日本語以外のメッセージを自動翻訳
- 1対1DM とグループDM はプライバシー配慮のため自動翻訳せず、長押し翻訳はそのまま利用可能
- メンション、ロールメンション、スラッシュコマンド参照、タイムスタンプ、URL、コードブロック、カスタム絵文字を壊しにくいように保護
- Immersive Translation 有効時は原文を残したまま翻訳を表示
- 設定画面から Debug Logs を開き、現在セッションのログ確認・コピー・クリアが可能

## ローカル開発

```bash
npm install
npm run build
```

ビルド結果は `dist/dislate/` に出力されます。

## 公開

このリポジトリは `main` への push をトリガーに GitHub Actions から `dist/` を GitHub Pages へ公開します。

- Repo: `autotranslate-for-bunny-dev/dislate-auto-ja`
- Pages ベース URL: `https://autotranslate-for-bunny-dev.github.io/dislate-auto-ja/`
- Bunny plugin URL: `https://autotranslate-for-bunny-dev.github.io/dislate-auto-ja/dislate/`

プラグイン個別の詳しい説明は `plugins/dislate/README.md` を参照してください。
