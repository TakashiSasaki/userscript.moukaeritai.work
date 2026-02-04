`gemini.google.com/gemini-artifact-exporter` では、Google Gemini のサイドバーに表示される「Article」タイプのアーティファクトを、まとめて Google Docs にエクスポートするユーザースクリプトを開発しています。

詳細は [gemini-artifact-exporter.md](gemini-artifact-exporter.md) を参照してください。

## 動作分析 (v0.2.10) - 2026-02-04

### 概要
Gemini のサイドバーにある「記事 (Article)」タイプのアーティファクトを自動検出し、Google ドキュメントへ一括エクスポートするスクリプト。

### 主な機能
1.  **UI追加**: 画面上にドラッグ可能な「Artifact Exporter」パネルを表示。
    *   **Export All Articles**: 一括エクスポート開始ボタン。
    *   **Dry Run**: テスト実行モード（デフォルトON）。実際のエクスポートボタン押下をスキップし、黄色い枠で強調表示する。
    *   **Show Log Panel**: 詳細ログパネルの表示切り替え。
    *   **Cooldown**: エクスポート間の待機時間設定（デフォルト3秒）。
2.  **自動処理フロー**:
    *   サイドバーから `fonticon="article"` を持つ要素を抽出。
    *   各アイテムについてシーケンシャルに以下を実行:
        1.  チップをクリックしてイマーシブパネルを開く（失敗時はリトライ）。
        2.  パネルタイトルがチップのタイトルと一致するか確認（ロード待ち）。
        3.  「共有」アイコンをクリック。
        4.  「Google ドキュメントにエクスポート」をクリック（Dry Run時はスキップ）。
        5.  処理完了を待機（Dry Run: 1秒, 本番: 5秒）。
        6.  パネルを閉じる。
3.  **状態保存**: パネル位置や設定（Dry Run, Log表示, Cooldown）を `GM_setValue` で保存し、次回起動時に復元。
4.  **インストール検知**: `userscript.moukaeritai.work` やローカル開発環境などの特定ホストで、スクリプトがアクティブであることを `CustomEvent` を通じて通知。

### 実装上の詳細
*   **セレクタ依存**: `data-test-id="studio-sidebar-button"`, `immersive-panel`, `.mat-mdc-menu-panel` などのセレクタを使用。
*   **堅牢性**:
    *   要素の出現待機に `MutationObserver` とタイムアウトを併用した `waitForElement` を使用。
    *   パネルが開かない場合やタイトルが一致しない場合の再試行・エラーハンドリングを含む。
*   **ログ機能**: 画面上の専用ログパネルとコンソールの両方に出力。
