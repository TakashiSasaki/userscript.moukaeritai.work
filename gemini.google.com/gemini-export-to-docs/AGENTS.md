# AGENTS.md

## 廃止されたドキュメントからの指示・メモ

以下の内容は `gemini-export-to-docs.md` の以前のバージョンに含まれていましたが、文書更新に伴い削除されました。今後のメンテナンスやリファクタリングにおいて重要となる技術的な制約や戦略が含まれているため、ここに記録します。

## Install Detection API
The userscript includes the install-detection guard required by the portal index and only injects this API on the following hosts:

- `userscript.moukaeritai.work`
- `127.0.0.1`
- `fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev`

Behavior on those hosts:

- **Dispatch**: `userscript-check-installed` is dispatched on page load.
- **Listener**: `userscript-ping` is listened for and replied to, then the script returns early.

### セキュリティ制約 (Trusted Types & CSP)
> **Trusted Types (セキュリティ)**
> Geminiのサイトではセキュリティポリシーにより `innerHTML` への文字列代入が禁止されている（TrustedHTML違反エラーが発生する）。
> *   `innerHTML` は使用しない。
> *   SVGアイコンなどの要素生成には `document.createElementNS` を、その他の要素には `document.createElement` を使用し、DOM操作として構築する。
> *   **重要**: `DOMParser().parseFromString` も `TrustedHTML` ポリシー違反となるため使用しない。

> **Content Security Policy (CSP)**
> Geminiは厳格なCSPを適用している。
> *   外部フォント（`Google Sans` など）を明示的に指定するとブロックされる場合があるため、`font-family` は指定せず、親要素のスタイルを継承（`inherit`）させる。

### 技術的実装戦略 (Reliability)
> **動的コンテンツの読み込み (Wait処理)**
> メニューやダイアログはユーザー操作（クリック）後に非同期でDOMに追加される。
> *   単純な `querySelector` ではなく、要素が出現するまで待機する `waitForElement` のような非同期関数を実装し、タイムアウト処理を含める必要がある。

> **重なり順序 (z-index)**
> モバイル表示などでは、透明なオーバーレイ要素がボタンの上に重なり、クリックを妨害する場合がある。
> *   注入するボタンには `z-index` を高く設定し、`pointer-events: auto` を指定してクリックイベントを確実に受け取れるようにする。

> **UI操作の信頼性**
> メニューの展開アニメーションやDOM構造の微細な変化により、要素が見つからない場合がある。
> *   **テキストマッチング**: `data-test-id` が欠落している場合に備え、ボタンのテキスト（"Export to Docs"）による検索をフォールバックとして実装する。
> *   **グローバル探索**: メニューパネルがDOMツリーの予期せぬ場所に挿入される場合があるため、特定のコンテナ内だけでなくドキュメント全体からボタンを探索する。
> *   **リトライ処理**: ボタンが見つかるまで、一定時間（例：2秒間）繰り返し探索を行う待機ロジックを導入する。
