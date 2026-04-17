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
    -   Logic that depends on "finding the current item and then finding the next one" must handle cases where the current item has been scrolled out of view and unloaded from the DOM.


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

2. **バージョン情報の同期と状態検知**:
   - バージョン表記はハードコードしないでください。
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
   - **ローカル相対パスを使用してはいけません**（例: `gemini-history-loader/gemini-history-loader.user.js`）。`domain-landing.js` の `fetchVersion()` はこの `href` を使って GitHub から `@version` を取得するため、ローカルパスでは CORS エラーが発生しバージョン取得に失敗します。
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
