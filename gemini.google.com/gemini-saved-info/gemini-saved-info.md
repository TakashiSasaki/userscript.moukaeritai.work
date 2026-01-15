# Userscript: gemini-saved-info

## 概要 (Overview)

GeminiのウェブUIにおいて、ユーザーのカスタムインストラクションやユーザープロファイルを保存する画面の使いやすさを向上させるユーザースクリプト。特に、カスタムインストラクションの表示や編集を容易にすることを目的とする。

## 機能 (Features)

### 初期実装 (Initial Implementation)

*   カスタムインストラクションに連番を振る機能。

## 実装詳細 (Implementation Details)

### SPA対応ロジック (SPA Handling Logic)

*   Geminiはシングルページアプリケーション（SPA）であるため、ユーザースクリプトはサイト全体 (`https://gemini.google.com/*`) で実行されるように設定されています。
*   `MutationObserver` を使用して `document.body` の変更を常に監視します。
*   DOMの変更が検知されるたびに、現在のURL (`window.location.href`) がターゲットページ (`https://gemini.google.com/saved-info`) かどうかを判定します。
    *   **ターゲットページにいる場合:** `addSerialNumbers` 関数を実行し、インストラクションのコンテナ (`div[data-test-id="memories-section"]`) を探して番号を付けます。
    *   **ターゲットページにいない場合:** `removeSerialNumbers` 関数を実行し、追加した番号とマーカー属性を削除してクリーンな状態に戻します。これにより、ページ間を移動しても不要な要素が残らないようにします。

### セレクタ (Selectors)

*   **インストラクションコンテナ (Instruction Container):**
    *   `div[data-test-id="memories-section"]`
    *   この要素全体を処理の起点とします。一度番号を付けたコンテナが再度処理されないよう、処理後にマーカーとして `data-numbered="true"` 属性を付与します。
*   **個別インストラクション要素 (Individual Instruction Element):**
    *   `.memory`
    *   コンテナ内でこのセレクタに一致するすべての要素を取得し、ループ処理で連番を振ります。
*   **テキスト要素 (Text Element):**
    *   `.memory-text`
    *   各個別インストラクション要素の内部からこの要素を特定し、その先頭に番号を挿入します。
*   **番号スパン要素 (Number Span Element):**
    *   `.userscript-gemini-saved-info-number`
    *   挿入される番号を囲む `<span>` 要素にこのクラスを付与します。これにより、番号の再追加防止や、ページ移動時の確実な削除が可能になります。
