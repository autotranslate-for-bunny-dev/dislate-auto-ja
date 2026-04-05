# Dislate Auto-JA — Bunny用 自動翻訳プラグイン（改造版）

## 概要

Rico040氏の [Dislate Lite](https://github.com/Rico040/bunny-plugins/tree/master/plugins/dislate) をベースに、
**日本語以外のメッセージを自動的に日本語に翻訳する機能**を追加した改造版です。

## 追加された機能

- **自動翻訳**: 新しいメッセージが届くと、日本語以外のメッセージを自動検出して翻訳
- **DM除外**: 1対1DMとグループDMでは自動翻訳せず、必要なときだけ長押し翻訳を使える
- **日本語判定**: ひらがな・カタカナ・漢字の含有率で日本語かどうかを判定（デフォルト30%以上で日本語とみなす）
- **スマートスキップ**: 自分のメッセージ・Botのメッセージ・短すぎるテキスト・URLだけのメッセージは翻訳しない
- **構文保護**: メンション、ロール、スラッシュコマンド参照、タイムスタンプ、URL、コードブロック、カスタム絵文字は翻訳で壊れにくいように保護
- **キャッシュ**: 翻訳済みメッセージをキャッシュして重複翻訳を防止（上限500件）
- **Immersive表示**: 原文 + 🌐翻訳文 の両方を表示（設定で切替可）
- **Debug Logs**: 設定画面から現在セッションのログを確認し、コピーやクリアができる

## オリジナルからの変更点

| ファイル | 変更内容 |
|---------|---------|
| `manifest.json` | プラグイン名・説明文を変更 |
| `src/index.ts` | 自動翻訳の設定項目追加、デフォルト言語をjaに変更、AutoTranslateパッチ追加 |
| `src/patches/AutoTranslate.tsx` | **新規** — MESSAGE_CREATEイベントをリッスンして自動翻訳 |
| `src/utils/detectJapanese.ts` | **新規** — 日本語文字の検出ユーティリティ |
| `src/settings/index.tsx` | 自動翻訳ON/OFFスイッチ追加、UIを日本語化 |

手動翻訳（長押し→翻訳）やスラッシュコマンド `/translate` はそのまま残っています。

## インストール方法

### 前提条件
- Bunny（またはRevenge等の後継mod）がiPhoneにインストール済みであること
- Node.js / npm がPCにインストールされていること

### ビルド手順

1. ローカルのこのワークスペースで依存を入れる
```bash
npm install
npm run build
```

2. ビルド結果の `dist/dislate/` を確認する

3. GitHub Pages で公開後、Bunny には次の URL を追加する

```text
https://autotranslate-for-bunny-dev.github.io/dislate-auto-ja/dislate/
```

## 設定項目

| 設定 | デフォルト | 説明 |
|------|-----------|------|
| 自動翻訳 | ON | サーバー内の日本語以外のメッセージを自動翻訳 |
| Immersive Translation | ON | 原文+翻訳の両方を表示 |
| 翻訳先の言語 | ja（日本語） | 翻訳先の言語を選択 |
| 翻訳エンジン | Google Translate | Google TranslateまたはDeepLを選択 |
| Debug Logs | - | 現在セッションの翻訳ログを確認・コピー・クリア |

## セキュリティに関する注意

- **Google Translateモード推奨**: メッセージテキストは `translate.googleapis.com` に送信されます
- **DeepLモード注意**: 第三者プロキシサーバー（deeplx.mingming.dev）を経由します。プライベートな会話には不向き
- このプラグインはDiscordのトークンやパスワード等にアクセスしません
- 翻訳はローカル表示の変更のみで、実際のメッセージは変更されません
- 自動翻訳はサーバー内メッセージのみ対象で、DM は長押し翻訳または `/translate` を使う想定です

## クレジット

- オリジナル: [Acquite](https://github.com/acquitelol) (Enmity版 Dislate)
- Bunny移植: [Rico040](https://github.com/Rico040), sapphire, chrysoljq
- 自動翻訳改造: Claude (Anthropic)

## ライセンス

このワークスペースでは、同梱している Bunny 側アーカイブのルート `LICENSE` をそのまま保持しています。元の Dislate 系作者クレジットは `manifest.json` と本READMEに残しています。
