# Implementation Notes: NotebookLM Source Delete Button

NotebookLM のソースパネルに連番を表示し、削除ボタンを追加するための実装ガイドラインです。

## 1. SPA と動的 DOM への対応
- **ポーリングと Observer の併用**: NotebookLM は Angular 製の SPA です。ページ遷移（URL変更）やソースリストの読み込みを検知するため、`setInterval` によるポーリングで `.scroll-area-desktop` の出現を監視してください。
- **監視対象の限定**: パフォーマンス向上のため、`MutationObserver` は `document.body` 全体ではなく、特定された `.scroll-area-desktop` に対してのみ `childList` 監視を行ってください。
- **クリーンアップ**: ノートブック以外のページ（`/notebook/` 以外）に移動した際は、Observer を `disconnect` し、タイマーを停止させてリソースを解放してください。

## 2. セレクタの選定基準
- **機能的クラスの優先**: `.single-source-container`, `.source-title-column`, `.select-checkbox-container` といった、構造を示す安定したクラス名を使用してください。
- **動的クラスの回避**: `ng-tns-c...` や `ng-star-inserted` など、ビルドごとに変わる可能性のある Angular 固有の動的クラスはセレクタに使用しないでください。

## 3. UI インジェクションの設計
- **連番表示**: `.source-title-column` 内に絶対配置 (`position: absolute`) で挿入します。タイトルの左上端に固定し、`pointer-events: none` を設定して背後のクリックイベントを妨げないようにします。
- **削除ボタン (予定)**: `.select-checkbox-container` 内への挿入を推奨します。
- **イベント伝播の停止**: カスタムボタンのクリックイベントでは、必ず `event.stopPropagation()` を呼び出してください。これを怠ると、親要素のイベント（ソースの選択や詳細表示）が意図せず発火します。

## 4. ネイティブ削除アクションのトリガー
- **制約**: このスクリプトは `@grant none` で動作するため、Angular の内部関数に直接アクセスすることは困難です。
- **推奨手順**: 削除機能を実行する際は、以下のシーケンスを模倣してください。
    1. 当該ソースの「More」ボタン (`.source-item-more-button`) を特定し、`click()` を発行。
    2. DOM の末尾付近にある `cdk-overlay-container` 内に出現するメニューを監視。
    3. メニュー内の「Remove」項目を特定して `click()` を発行。

## 5. 開発・運用ルール
- **バージョニング**: `.user.js` を変更した際は、必ずパッチバージョンをインクリメントしてください。
- **バージョン API**: `userscript-check-version` イベントリスナーを維持し、ポータルサイトからの照会に応答できるようにしてください。
- **URL スコープ**: 主要なロジックは `location.pathname.startsWith('/notebook/')` が真の場合のみ実行されるようにガードをかけてください。

## 6. 参考セレクタ (2026/1/15 時点)
| 機能 | セレクタ |
| :--- | :--- |
| ソースリスト親要素 | `.scroll-area-desktop` |
| 個別ソース項目 | `.single-source-container` |
| タイトル表示エリア | `.source-title-column` |
| チェックボックスエリア | `.select-checkbox-container` |
| 一括選択チェックボックス | `.select-checkbox-all-sources-container` |