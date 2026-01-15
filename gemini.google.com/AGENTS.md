# Gemini Userscripts Development Guidelines for Agents

- スクリプトのコードを少しでも変更したなら、必ずパッチレベルをバンプアップ（例: 0.1.1 -> 0.1.2）してください。
- バージョン情報を更新したら、関連する `index.html` 内の「Install」ボタンのバージョン表示も同期させてください。

## インストール状態の検知アルゴリズム
- `index.html` は `userscript-ping` を送信し、各ユーザースクリプトが `userscript-check-installed` を `dispatchEvent` して応答することで検知します。
- 受信側は `data-script-name` と `@name` の一致で対象ボタンを特定します。
- `Install (vX.Y.Z)` の表記からバージョンを抽出し、セマンティックバージョン比較で `Update` / `Installed` を切り替えます。

## 共通開発ガイドライン

### Install Detection API
すべてのユーザースクリプトは、以下のホストでのインストール検知APIを含みます。

- `userscript.moukaeritai.work`
- `127.0.0.1`
- `fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev`

これらのホスト上での動作：

-   **Dispatch**: ページロード時に `userscript-check-installed` がディスパッチされます。
-   **Listener**: `userscript-ping` をリッスンし、応答後、スクリプトは早期リターンします。

### HTMLサンプル前処理基準 (Preprocessing Standards)
DOMスナップショット (`samples/` ディレクトリ内のHTMLファイル) をクリーンアップし、標準化するための基準です。

1.  **削除**: `<script>`, `<style>` タグ、およびHTMLコメントノードは完全に削除されます。
2.  **Headのクリーンアップ**: `<head>` 要素内の `<meta>` および `<link>` タグは削除されます。
3.  **SVGのクリーンアップ**: `<svg>` タグは保持されますが、ファイルサイズ削減のため全ての子ノードは削除されます。
4.  **属性のクリーンアップ**: 空の文字列値を持つ属性 (例: `style=""`) は削除されます。
5.  **テキストの切り詰め**: 全てのテキストノードは999文字以下に切り詰められます。
6.  **再フォーマット**: HTMLは以下の形式で整形されます。
    -   1行に1つのタグ/テキストノード。
    -   インデントなし（diffや検索を容易にするため）。

### セキュリティ制約と技術的実装戦略

Geminiの環境でユーザースクリプトを開発する上で考慮すべきセキュリティ制約と堅牢な実装のための戦略です。

#### セキュリティ制約 (Trusted Types & CSP)
*   **Trusted Types**: Geminiのサイトではセキュリティポリシーにより `innerHTML` への文字列代入が禁止されています。`innerHTML` は使用せず、SVGアイコンなどの要素生成には `document.createElementNS` を、その他の要素には `document.createElement` を使用し、DOM操作として構築してください。`DOMParser().parseFromString` も `TrustedHTML` ポリシー違反となるため使用しないでください。
*   **Content Security Policy (CSP)**: Geminiは厳格なCSPを適用しています。外部フォント（`Google Sans` など）を明示的に指定するとブロックされる場合があるため、`font-family` は指定せず、親要素のスタイルを継承（`inherit`）させるようにしてください。

#### 技術的実装戦略 (Reliability)
*   **動的コンテンツの読み込み (Wait処理)**: メニューやダイアログはユーザー操作後に非同期でDOMに追加されます。要素が出現するまで待機する `waitForElement` のような非同期関数を実装し、タイムアウト処理を含めてください。
*   **重なり順序 (z-index)**: モバイル表示などでは、透明なオーバーレイ要素がボタンの上に重なり、クリックを妨害する場合があります。注入するボタンには `z-index` を高く設定し、`pointer-events: auto` を指定してクリックイベントを確実に受け取れるようにしてください。
*   **UI操作の信頼性**: メニューの展開アニメーションやDOM構造の微細な変化により、要素が見つからない場合があります。`data-test-id` が欠落している場合に備え、ボタンのテキストによる検索をフォールバックとして実装するなど、複数の探索戦略を組み合わせてください。

### バージョン管理ポリシー
ユーザースクリプトのコードに何らかの変更を加えた際は、必ず `@version` のパッチレベル（末尾の数字）をインクリメントしてください。

例: `0.1.0` -> `0.1.1`

これは、Tampermonkey等の自動更新機能が正常に動作するために必須です。
また、バージョン情報を更新したら、関連する `index.html` 内の「Install」ボタンのバージョン表示も同期させてください。
