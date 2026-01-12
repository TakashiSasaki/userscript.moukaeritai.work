# Agent Implementation Notes: ChatGPT Conversation Lister

このドキュメントは、`chatgpt-conversation-lister.user.js` の内部構造と、将来のメンテナンスのための技術的詳細を記述しています。

## 1. データ抽出戦略 (React Internal Props)

このスクリプトは、DOMのテキストをパースするのではなく、Reactコンポーネントの内部プロパティから直接データを取得します。

- **手法**: `li` 要素のプロパティをループし、`__reactProps` で始まるキーを探します。
- **パス**: `li[key].children.props` から `id` (会話UUID) と `title` を取得します。
- **リスク**: ChatGPTのReactビルドが変更されると、このプロパティパスが壊れる可能性があります。その場合は `updateConversationList` 関数内の探索ロジックを修正する必要があります。

## 2. セレクタ管理

ChatGPTのサイドバー構造は頻繁に変更されるため、`CONVERSATION_LIST_SELECTORS` 配列で複数のセレクタを管理しています。

- **優先順位**: 配列の先頭にあるセレクタが優先的に使用されます。
- **フォールバック**: サイトの更新によりリストが取得できなくなった場合、新しいセレクタを配列の先頭に追加してください。

## 3. UI 実装 (Shadow DOM)

- **分離**: 検索ダイアログやTSV出力エリアは Shadow DOM (`attachShadow({ mode: 'open' })`) 内に構築されています。
- **理由**: ChatGPT本体の複雑なCSS（Tailwind）との干渉を防ぎ、スクリプト独自のスタイルを安全に適用するためです。
- **イベント**: `Escape` キーによるダイアログのクローズ処理は、グローバルな `keydown` リスナーで管理されています。

## 4. 継続スクロールの仕組み

サイドバーの履歴は仮想リスト（Virtual List）として実装されているため、スクロールしないと古いデータがDOMに出現しません。

- **ロジック**: `MutationObserver` でリストの変更を監視し、変更があるたびに `scrollTop = scrollHeight` を設定して強制的に最下部までスクロールさせます。
- **停止条件**: スクロール位置が変化しなくなった（＝全件読み込み完了）時点で停止します。

## 5. ストレージと状態管理

- **永続化**: `GM_setValue` を使用して、ブラウザ（Tampermonkey等）の拡張機能ストレージにデータを保存します。
- **キー**: 会話の `id` (UUID) をキーとして使用します。
- **ソート**: `projectionId` (ChatGPT内部の順序ID) を数値としてパースし、降順（新しい順）でソートして表示・出力します。

## 6. メンテナンス時のチェックポイント

1.  **検索ボタンが出ない**: `NEW_CHAT_BUTTON_SELECTOR` が変更されていないか確認してください。
2.  **リストが空**: `CONVERSATION_LIST_SELECTORS` のいずれかが現在のDOMにマッチしているか確認してください。
3.  **タイトルが取得できない**: `li` 要素内の React Props の構造が変わっていないか、ブラウザのコンソールで `dir(liElement)` を実行して確認してください。

## 7. UI変更のガイドライン (v1.0.9追記)

- **会話リストへの番号付与**:
    - サイドバーの各会話アイテム（`<a>` または `<li>`）に対し、`.ccl-index-number` クラスを持つ `<span>` 要素を動的に注入して連番を表示しています。
    - DOM更新ロジック (`updateConversationListFromLinks` 等) を変更する際は、この番号要素が重複して追加されないか、適切な位置（`absolute` positioning）に配置されているか確認してください。
- **パネル表示項目**:
    - **Detected conversations**: `GM_listValues` で保存されている全会話データの総数です。
    - **Visible in list**: 現在DOM上にレンダリングされている（取得可能な）会話アイテムの数です。スクロールや展開状況によって変動します。
- **スタイル**:
    - パネルに行を追加する場合は、既存の `.ccl-row` クラスを使用し、左右にラベルと値を配置するレイアウトを維持してください。

---
**Baseline Version:** 1.0.9
