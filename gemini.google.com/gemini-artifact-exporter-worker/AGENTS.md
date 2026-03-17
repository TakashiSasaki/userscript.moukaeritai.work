# Gemini Artifact Exporter Worker

## 概要

このディレクトリは、`gemini-artifact-exporter-worker` ユーザースクリプトのソースコードを格納しています。
このスクリプトは、Gemini の Article アーティファクトをワンクリックで Google ドキュメントにエクスポートする「ワーカー」として機能します。

## 役割

*   **イベントの受信**: `gemini-artifact-exporter-worker:request` イベントを受け取ります。
*   **DOM操作**: メインUIスクリプト (`gemini-artifact-exporter`) から渡された DOM要素を直接クリックするか、タイトルで再検索して処理を実行します。
*   **待機と状態管理**: Canvasが開くのを待ち、エクスポートボタンを押し、完了を待ちます。
*   **UI表示**: 現在エクスポート中のタイトルや進行状況を示す控えめなトースト通知を表示します。
*   **結果の返信**: 処理が終わると `gemini-artifact-exporter-worker:result` イベントで結果（成功・失敗・キャンセルなど）をメインスクリプトに返します。

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
