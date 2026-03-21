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
