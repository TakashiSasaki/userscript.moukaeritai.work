# Gemini Artifact Exporter Worker (AI 実装ノート)

## 概要

このディレクトリは、`gemini-artifact-exporter-worker` ユーザースクリプトのソースコードを格納しています。
このスクリプトは、Gemini の Article アーティファクトをワンクリックで Google ドキュメントにエクスポートする「ワーカー」として機能します。

## 役割

*   **イベントの受信**: `gemini-artifact-exporter-worker:request` イベントを受け取ります。
*   **DOM操作**: メインUIスクリプト (`gemini-artifact-exporter`) から渡された DOM要素を直接クリックするか、タイトルで再検索して処理を実行します。
*   **待機と状態管理**: Canvasが開くのを待ち、エクスポートボタンを押し、完了を待ちます。
*   **UI表示 (標準パネル化)**: 進行状況を示すインジケーターは、共通ライブラリ (`gemini-common.js`) の `geminiCreateCommonPanel` を使用した標準的なフローティングパネルとして表示されます。
*   **結果の返信**: 処理が終わると `gemini-artifact-exporter-worker:result` イベントで結果（成功・失敗・キャンセルなど）をメインスクリプトに返します。

## UI / UX 仕様 (Gemini 標準 UI v0.2.x 準拠)

*   **共通テンプレート**: `gusCommonHTML` をベースにした標準シェルの `contentDiv` 内にステータスメッセージを表示します。
*   **ヘッダー表示**: `[Emoji] [Script Name] v[Version]` の標準形式でヘッダーを表示。
*   **最小化機能**: ヘッダーのシングルクリックで、タイトルを保持したまま最小化/展開が可能です。
*   **ドラッグ/位置保持**: パネルはドラッグ可能で、位置はストレージ（`gemini-worker-export-indicator-pos`）に保存されます。

## 連携

*   **メインスクリプト**: `gemini.google.com/gemini-artifact-exporter/gemini-artifact-exporter.user.js`
*   メインスクリプトはUIとスキャン（リストの生成）を担当し、個々のエクスポート処理をこのスクリプト（ワーカー）に委譲します。

## カスタムイベント仕様

### メイン → ワーカー (`gemini-artifact-exporter-worker:request`)
```javascript
{
  targetTitle: "アーティファクトのタイトル", // 必須
  targetElement: HTMLElement, // 任意 (可能なら直接クリック)
  exportWaitSeconds: 10,
  canvasInitDelay: 3.0,
  reopenDelay: 1.5,
  totalItems: 5, // インジケーター表示用
  currentIndex: 1, // インジケーター表示用
  requestId: "unique-id-123" // コールバック用
}
```

### ワーカー → メイン (`gemini-artifact-exporter-worker:result`)
```javascript
{
  requestId: "unique-id-123",
  status: "success" | "failed" | "cancelled",
  title: "アーティファクトのタイトル",
  reason: "成功や失敗の理由"
}
```

### メイン → ワーカー (`gemini-artifact-exporter-worker:cancel`)
```javascript
// detail なしで送信。実行中の処理を中断し、結果イベント（cancelled）を返す。
```


## 実装ノート

*   **Google Docs での動作**: Docs 側では `gemini-docs-closer-force-close` イベントを使用してタブを閉じる等の、ドメインを跨いだ制御を行います。
*   **UI パフォーマンス**: `MutationObserver` などの高負荷な監視は行わず、イベントベースで UI 更新を行います。

### セレクタの安定性 (2026-04-16 更新)

Canvas（アーティファクト詳細）内の「Google ドキュメントにエクスポート」ボタンの特定について、UIテキストや不安定な `aria-label` 属性に依存するフォールバックを回避するため、以下の堅牢なセレクタを第一段階として利用しています。

*   **追加セレクタ**: `button[role="menuitem"]:has(mat-icon[data-mat-icon-name="google_docs_color"])`
*   **理由**: Angular Material の `mat-icon` 内の属性 `data-mat-icon-name` は、言語設定に関係なく同一であり、テキストのように翻訳によって変化することがないため、極めて安定した識別子となります。
