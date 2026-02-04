# Userscript: gemini-saved-info

## 概要 (Overview)

GeminiのウェブUIにおいて、ユーザーのカスタムインストラクションやユーザープロファイルを保存する画面の使いやすさを向上させるユーザースクリプト。特に、カスタムインストラクションの表示や編集、再利用を容易にすることを目的とする。

## 機能 (Features)

*   **連番表示:** 各カスタムインストラクションの先頭に連番を振り、視認性を向上させます。
*   **クリップボードコピー:** 各インストラクションの3ドットメニューの横にコピーボタンを追加します。ボタンをクリックすると、そのインストラクションのテキスト内容がクリップボードにコピーされます。

## 実装詳細 (Implementation Details)

### SPA対応および動的更新ロジック (SPA & Dynamic Update Handling)

*   **ページ監視:** `MutationObserver` で `document.body` を監視し、SPAによるページ遷移を検知します。
*   **ターゲットページ判定:** URLが `https://gemini.google.com/saved-info` であることを確認し、関連要素 (`div[data-test-id="memories-section"]`) が存在する場合にのみ後続の処理を実行します。
*   **リスト監視:** ターゲットページ上で、インストラクションのリスト (`.memories-container`) を監視する別の `MutationObserver` を起動します。これにより、ユーザーがインストラクションを追加・削除した際の動的な変更を検知します。
*   **UI更新:** リストに変更が加わるたびに `updateInstructionItems` 関数が実行され、すべての連番とコピーボタンが一旦削除された後、再描画されます。これにより、UIの整合性が常に保たれます。
*   **クリーンアップ:** ユーザーがターゲットページから離れた際には、すべてのオブザーバーを停止し、追加したUI要素（連番、コピーボタン）をDOMから削除します。

### セレクタ (Selectors)

*   **インストラクションコンテナ (Instruction Container):** `div[data-test-id="memories-section"]`
*   **個別インストラクション要素 (Individual Instruction Element):** `.memory`
*   **テキスト要素 (Text Element):** `.memory-text`
*   **アクションボタン (Original Actions Button):** `.memory-actions-button` (3ドットボタン)
*   **番号スパン要素 (Added Number Span):** `.userscript-gemini-saved-info-number`
*   **コピーボタン要素 (Added Copy Button):** `.userscript-gemini-saved-info-copy-button`
