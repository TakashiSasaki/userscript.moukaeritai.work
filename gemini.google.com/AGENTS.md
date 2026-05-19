# Gemini Domain Agent Guidelines

This document outlines the domain-specific learnings and guidelines for developing user scripts targeting Gemini (gemini.google.com). These rules supplement the global guidelines in the root `AGENTS.md`.

## Gemini (DOM Structure & Selectors)

Learnings from implementing features like Auto-Scroll and Conversation Management (as of Feb 2026):

1.  **Conversation List Hierarchy**:
    -   The list is roughly at `conversations-list > .conversations-container`.
    -   **BEWARE**: Broader containers like `side-navigation-content` or `bard-sidenav` also contain "Gems" (Bot) items. Targeting these broad containers allows selectors to pick up Bot items, causing bugs (e.g., incorrect ID logic, sequential numbering artifacts).

2.  **Item Selectors**:
    -   **Correct Selector**: `[data-test-id="conversation"]`. Note: This attribute is on an `<a>` tag, NOT a `div`. Do NOT restrict your selector to `div` (e.g., `div[data-test-id="conversation"]` will fail).
    -   **Recommended Strategy**: Prioritize `[data-test-id="conversation"]`. If falling back to `jslog` or other attributes, strictly exclude `[data-test-id="item"]` (which usually denotes Bots/Gems).

3.  **Virtual Scrolling**:
    -   Gemini uses virtual scrolling. Only currently visible conversation items exist in the DOM. `document.querySelectorAll` will only return a subset (e.g., ~15 items) of the full history.

4.  **会話メニューと「ノートブックに追加」要素 (as of Apr 2026)**:

    > [!IMPORTANT]
    > Gemini の会話ページには役割の異なる「三点メニュー」が複数存在します。用途を混同しないでください。

    -   **メッセージ単位のメニュー** (各 AI 回答の下部):
        -   **トリガー**: `button[data-test-id="more-menu-button"]`
        -   **用途**: 「Google ドキュメントにエクスポート」など、回答コンテンツへの操作。
    -   **会話全体のアクションメニュー** (画面右上ヘッダー付近):
        -   **トリガー**: `button[aria-label="会話アクションのメニューを開く"]`
        -   **用途**: 「ノートブックに追加」「名前を変更」「削除」など、会話全体への操作。
    -   **「ノートブックに追加」ボタン**:
        -   **安定セレクタ**: `button[data-test-id="add-to-project-button"]`（会話アクションメニュー内）。
        -   **フォールバック**: `button.mat-mdc-menu-item[role="menuitem"]` 内のテキスト `span.gds-body-m` が「ノートブックに追加」を含むもの。
    -   **動的生成**: メニュー項目は、ボタンをクリックした際に初めて `cdk-overlay-container` 内に動的に生成されます。クリック後に要素が出現するのを待機する必要があります。
    -   **「ノートブックに移動」ダイアログ**:
        -   「ノートブックに追加」をクリックすると、`mat-dialog-container` が開きます。
        -   **リスト要素**: ダイアログ内のノートブック一覧は `mat-selection-list` で構成され、各項目は `mat-list-option` です。
        -   **名前による特定**: ノートブック名は `mat-list-option .mdc-list-item__primary-text div > span:last-child` に格納されています。
    -   **選択後の挙動とフィードバック**:
        -   ノートブックを選択（クリック）すると、ダイアログは即座に閉じます。
        -   **スナックバー**: 画面左下に通知ラベルが表示されます。構造は `.mat-mdc-snack-bar-container` 内の `simple-snack-bar` です。
        -   **通知テキスト例**: 「(ノートブック名) に追加しました」。
        -   **共通機能との連携**: `gemini-common.js` の `geminiEnsureSnackbarObserver()` を使用している場合、`gemini-snackbar:shown` イベントでこの追加完了通知を捕捉可能です。
    -   **特定のノートブック（例：「ワンショット要約」）の取得手順**:
        -   **手順**: 1. `button[aria-label="会話アクションのメニューを開く"]` をクリック -> 2. `button[data-test-id="add-to-project-button"]` をクリック -> 3. ダイアログ内の `mat-list-option` たちをループし、内部テキストを照合。
        -   **JS実装例**:
          ```javascript
          const targetName = 'ワンショット要約';
          const options = Array.from(document.querySelectorAll('mat-list-option'));
          const target = options.find(opt => {
              const span = opt.querySelector('.mdc-list-item__primary-text div > span:last-child');
              return span && span.textContent.trim() === targetName;
          });
          if (target) window.geminiClickElement(target);
          ```


## `gemini-common.js` が提供する共通機能


`gemini.google.com/gemini-common.js` は、Gemini 向けユーザースクリプトで共通利用する helper を提供しています。新しい実装を書く前に、まずこのファイルに同等機能がないか確認してください。

1. **初期化と待機**
   - `registerGeminiUserscript(scriptName, version)`: 読み込み順の絵文字付きで userscript を登録します。
   - `geminiSleep(ms)`: 背景タブでも極端に止まりにくい sleep helper です。
   - `geminiWaitForElement(selector, context, timeout)`: 要素出現待ちの Promise helper です。
   - `geminiClickElement(element)`: Focuses the element and dispatches mousedown, mouseup, and click events.

2. **インストール検知と状態表示**
   - `geminiCheckTargetUserscript(targetName, timeout)`: `userscript-ping` / `userscript-check-installed` を使って他 userscript の存在を確認します。
   - `geminiShowTargetScriptStatus(containerId, targetName, statusDetail)`: 対象 script の検知結果を簡易 UI として表示します。

3. **Snackbar 監視**
   - `geminiEnsureSnackbarObserver()`: Gemini 全体で 1 回だけ snackbar observer を起動し、`gemini-snackbar:shown` を発火します。
   - `gemini-snackbar:shown`: 共通 snackbar 通知イベントです。`text`, `textNodes`, `actionLabels`, `containerId`, `kind`, `matchedRule`, `observedAt` を `detail` に含みます。

4. **共通パネル UI**
   - `geminiSetupDraggablePanel(panel, handle, storageKey, defaultPos)`: パネルのドラッグ移動と位置保存を行います。
   - `geminiSetupMinimizablePanel(panel, storageKey, activeHeader, defaultMinimized)`: パネルの最小化状態を管理します。
   - `geminiCreateCommonPanel(options)`: 共通ヘッダー付きパネル shell を生成します。

5. **Trusted Types / HTML 注入**
   - `geminiCreateTrustedHTMLPolicy(policyName)`: Trusted Types policy を作成します。
   - `geminiSetInnerHTML(element, html, policy)`: Trusted Types 対応で安全に HTML を注入します。

6. **設計上の注意**
   - 長寿命の observer や全体監視は、`gemini-common.js` に singleton guard 付き helper として置けるかをまず検討してください。
   - `gemini-common.js` にある機能を各 userscript 側で再実装しないでください。必要なら共通化してから使う方針を優先してください。

7. **Chat History Loading**
   - `geminiGetChatScroller()`: Locates the main scrollable element for the chat conversation area.
   - `geminiLoadFullChatHistory(options)`: Programmatically scrolls the chat to the very top, forcing Gemini to load the entire conversation history into the DOM.
   - `geminiProgressiveScrollDown(options)`: Programmatically scrolls the chat downwards in discrete steps. Useful for performing deep scans or ensuring lazily loaded content is triggered.

## 共通リソース更新時の対応 (Common Resource Updates)

`gemini-common.js`, `gemini-common.css`, `gemini-common.html` などの共通リソースを変更した場合は、以下の対応を必ず行ってください。

1. **影響範囲の特定**: 変更したリソースを `@resource` または `@require` しているすべてのユーザースクリプトを特定します。
2. **パッチバージョンのインクリメント**: 影響を受けるすべてのスクリプトの `@version` を必ずインクリメント（バンプアップ）してください。
   - これにより、Tampermonkey 等のリソースキャッシュが更新され、すべてのユーザーに最新の共通リソースが適用されることが保証されます。
   - スクリプト自体のロジックに変更がない場合でも、共通リソースの変更を反映させるためにこの手順は必須です。



## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期と状態検知**:
   - バージョン番号はハードコードしないでください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持してください。テキストの更新は `.button-text` などの専用要素を用いて行い、DOMを破壊しないように注意してください。
   - 新規タブでインストールした後にUIを自動更新するため、ボタンクリック時に `userscript-ping` を一定間隔で送信（ポーリング）する仕組みが `domain-landing.js` に組み込まれています。これにより利用者はリロード不要で「Installed」への変化を確認できます。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。

4. **インストールボタンの `href` は必ず GitHub Raw URL を使用すること（重要）**:
   - `index.html` 内の `.install-button` の `href` 属性には、**必ず**以下の形式の GitHub Raw URL を設定してください:
     ```
     https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/SCRIPT_NAME/SCRIPT_NAME.user.js
     ```
   - **ローカル相対パスを使用してはいけません**（例: `gemini-artifact-exporter/gemini-artifact-exporter.user.js`）。`domain-landing.js` の `fetchVersion()` はこの `href` を使って GitHub から `@version` を取得するため、ローカルパスでは CORS エラーが発生しバージョン取得に失敗します。
   - **ハードコードされたバージョン文字列をボタンテキストに含めてはいけません**（例: `Install (v0.4.57)`）。バージョン表示は `domain-landing.js` が GitHub から動的に取得して注入するため、ハードコードすると古いバージョンが表示され続けます。
   - **正しい構造例**:
     ```html
     <a class="install-button"
        data-script-name="Gemini Example Script"
        href="https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-example/gemini-example.user.js"
        target="_blank">
       <span>Install</span>
     </a>
     ```


## UI デザインと一貫性 (UI Design & Consistency)

Gemini 向けの全ユーザースクリプトで一貫したユーザー体験を提供するため、以下のデザイン方針を遵守してください：

1.  **ベーススタイルの継承**:
    - 各スクリプトのパネル（`.gus-panel-shell`）において、`font-size`, `color`, `background-color` を個別にオーバーライドしないでください。
    - 基本的な文字サイズは `gemini-common.css` で定義された `13px` をベースとして継承してください。

2.  **デザイントークンの活用**:
    - 色や余白、角丸などは `gemini-common.css` で定義されている CSS 変数（`--gus-panel-bg` 等）を優先的に使用してください。
    - 個別に「ボタン」などの UI 要素を追加する場合でも、基本的には共通のデザインガイドラインに沿った外観を維持してください。

3.  **スタイルの競合回避**:
    - 独自スタイルを定義する際は、他のスクリプトや Gemini 本体のスタイルに影響を与えないよう、パネルの ID を起点とした詳細度の高いセレクタを使用してください。
