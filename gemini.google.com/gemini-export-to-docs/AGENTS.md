# Gemini 1-Click Export to Docs - AGENT Guidelines

## 概要 (Overview)
このファイルは、AIエージェントが `gemini-export-to-docs.user.js` をメンテナンスおよびリファクタリングする際に参照すべき技術的な制約、戦略、および開発ルールをまとめたものです。これは `gemini-export-to-docs.md`（人間向けの機能説明）を補完するものです。

## 一般的な開発ルール (General Development Rules)

### バージョニングとドキュメント同期 (Versioning & Documentation Sync)
*   スクリプトのコードに何らかの変更を加えた際は、必ず `@version` のパッチレベル（末尾の数字）をインクリメントしてください。
*   バージョン情報を更新したら、対応する `gemini-export-to-docs.md` およびルートの `index.html` 内の「Install」ボタンのバージョン表示も同期させてください。
*   設計書として対応するマークダウンファイル (`gemini-export-to-docs.md`) に矛盾が生じないように更新し、更新履歴を残してください。

## Install Detection API
The userscript includes the install-detection guard required by the portal index and only injects this API on the following hosts:

- `userscript.moukaeritai.work`
- `127.0.0.1`
- `fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev`

Behavior on those hosts:

- **Dispatch**: `userscript-check-installed` is dispatched on page load.
- **Listener**: `userscript-ping` is listened for and replied to, then the script returns early.

## 技術的制約と実装戦略 (Technical Constraints & Implementation Strategy)

### セキュリティ制約 (Security Constraints)

#### Trusted Types (セキュリティ)
Geminiのサイトではセキュリティポリシーにより `innerHTML` へ文字列代入が禁止されています（TrustedHTML違反エラーが発生します）。
*   `innerHTML` は使用しないでください。
*   SVGアイコンなどの要素生成には `document.createElementNS` を、その他の要素には `document.createElement` を使用し、DOM操作として構築してください。
*   **重要**: `DOMParser().parseFromString` も `TrustedHTML` ポリシー違反となるため使用しないでください。

#### Content Security Policy (CSP)
Geminiは厳格なCSPを適用しています。
*   外部フォント（`Google Sans` など）を明示的に指定するとブロックされる場合があるため、`font-family` は指定せず、親要素のスタイルを継承（`inherit`）させるようにしてください。

### 堅牢な実装戦略 (Robust Implementation Strategy)

#### 動的コンテンツの読み込み (Wait処理)
メニューやダイアログはユーザー操作（クリック）後に非同期でDOMに追加されます。
*   単純な `querySelector` ではなく、要素が出現するまで待機する `waitForElement` のような非同期関数を実装し、タイムアウト処理を含める必要があります。

#### 重なり順序 (z-index)
モバイル表示などでは、透明なオーバーレイ要素がボタンの上に重なり、クリックを妨害する場合があります。
*   注入するボタンには `z-index` を高く設定し、`pointer-events: auto` を指定してクリックイベントを確実に受け取れるようにしてください。

#### UI操作の信頼性 (UI Operation Reliability)
メニューの展開アニメーションやDOM構造の微細な変化により、要素が見つからない場合があります。
*   **テキストマッチング**: `data-test-id` が欠落している場合に備え、ボタンのテキスト（例: "Export to Docs"）による検索をフォールバックとして実装してください。
*   **グローバル探索**: メニューパネルがDOMツリーの予期せぬ場所に挿入される場合があるため、特定のコンテナ内だけでなくドキュメント全体からボタンを探索してください。
*   **リトライ処理**: ボタンが見つかるまで、一定時間（例：2秒間）繰り返し探索を行う待機ロジックを導入してください。
