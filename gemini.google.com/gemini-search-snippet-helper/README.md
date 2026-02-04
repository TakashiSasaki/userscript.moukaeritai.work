# Gemini Search Snippet Helper

## 概要
Gemini の検索結果一覧において、各会話カードのタイトルに連番を表示し、視認性と識別性を向上させるユーザースクリプトです。

## 機能
1.  **連番付与**:
    - 検索結果として表示される `search-snippet` 要素内の会話タイトル（`.title`）の先頭に、`1.`, `2.` といった連番を追加します。
    - 連番は小さなモノスペースフォントで、薄い色（テキストより目立たない色）で表示されます。

2.  **動的更新への追従**:
    - `MutationObserver` を使用し、無限スクロールによる追加読み込みや、新しい検索によるリストの再描画を検知します。
    - DOM の変更があるたびに番号を再計算・再描画し、常に正しい順序（上から 1, 2, 3...）を維持します。

## 技術仕様

### 対象 URL
- `https://gemini.google.com/search` (検索結果ページ)
- `https://gemini.google.com/app`
- `https://gemini.google.com/app/`
- 特定の会話ページ (`regex: /^https:\/\/gemini\.google\.com\/app\/[a-f0-9]{16}(\?.*)?$/`)

**実行制御ロジック:**
- 本スクリプトはユーザーが明示的に検索を行ったページ（URLが `https://gemini.google.com/search` で始まる場合）でのみ機能を有効化します。
- SPA遷移（History API）をフックし、URLが変化するたびに有効/無効を即座に切り替えます。

### セレクタ戦略
- **コンテナ**: `search-snippet`
- **タイトル**: `.title` (コンテナ内部)
- **連番要素クラス**: `.search-snippet-helper-number` (新規作成)

### UI/スタイル
- `<span>` 要素をタイトルの `firstChild` として挿入。
- スタイル:
    - `font-size`: `0.75em` (小さく)
    - `color`: `var(--text-dim, #888)` (控えめに)
    - `margin-right`: `6px` (タイトルとの間隔)
    - `opacity`: `0.7`
    - `font-family`: `monospace` (等幅)

## ファイル構成
- `gemini-search-snippet-helper.user.js`: スクリプト本体
- `gemini-search-snippet-helper.md`: 本設計書
- `samples/`: 解析用HTMLサンプル（必要に応じて）

## 更新履歴
- **v0.1.0** (2026-01-06): 初期リリース。連番表示機能の実装。
