# Gemini Search Snippet Helper 開発ガイドライン (for Agents)

このファイルは、AIエージェントが本プロジェクト (`gemini-search-snippet-helper`) を保守・拡張する際に参照すべき技術的な要点をまとめたものです。
`gemini-search-snippet-helper.md` は人間向けの機能説明ですが、ここは実装上の勘所を記録します。

## Install Detection API
The userscript includes the install-detection guard required by the portal index and only injects this API on the following hosts:

- `userscript.moukaeritai.work`
- `127.0.0.1`
- `fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev`

Behavior on those hosts:

- **Dispatch**: `userscript-check-installed` is dispatched on page load.
- **Listener**: `userscript-ping` is listened for and replied to, then the script returns early.

## 1. SPA遷移とHistory APIのフック
GeminiはSPA（Single Page Application）であり、VueやAngularのようなフレームワーク動作による画面遷移（特に `/app` から `/search` への移動など）において、ブラウザ標準の `popstate` イベントが発火しないケースが多々あります。

このため、本スクリプトでは `history.pushState` および `history.replaceState` をラップ（モンキーパッチ）して、URL変更を即座に検知する実装を行っています。
**このロジックを変更・削除する場合は、アドレスバーのURL変更とスクリプトの有効/無効切り替えが同期するかを厳密にテストしてください。**

## 2. 実行コンテキストの厳密な制御
Tampermonkeyのヘッダ (`@match`) だけでは、SPA内での動的なURL変化に追従してスクリプトを停止させることが困難です。
そのため、スクリプト内部で `isSearchPage()` のような関数を用い、**「ターゲットURL以外では処理を即座に中断する」** ガード節を設けています。
DOM要素 (`search-snippet`) がメモリ上に残っている場合でも、URLが対象外なら処理を行わない設計を維持してください。

## 3. DOM監視の戦略
動的なコンテンツ読み込み（無限スクロール）に対応するため `MutationObserver` は必須ですが、パフォーマンスへの影響を最小限にするため、以下の戦略をとっています：
- URLチェックによる早期リターン。
- `requestAnimationFrame` を利用した再描画のバッチ処理（デバウンスの代わり）。

今後の改修でも、DOM操作が頻発しないよう配慮してください。
