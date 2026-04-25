# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.

# Technical Considerations for gemini-one-click-delete.user.js

When modifying or enhancing this userscript, keep the following domain-specific constraints in mind:

### 1. Robust Selectors and Fallbacks
Gemini's UI classes and DOM structure (specifically Material Design components like `#mat-menu-panel-*`) are highly dynamic and update frequently.
*   **Avoid fragile selectors**: Do not rely solely on `:nth-child()` index selectors or generic tag names (`button`) without a specific context.
*   **Prioritize durable attributes**: Use semantic selectors like `aria-label`, `data-test-id`, or `role="menuitem"`.
*   **Always include text-content fallbacks**: When interacting with dynamic menus or dialogs (e.g., the "Delete" menu item or "Confirm" dialog button), implement logic to scan elements for specific contents, like `textContent.includes('TargetText')`. This acts as a robust fallback in case specific tracking attributes are unexpectedly changed or removed.

### 2. Synchronization and Wait Logic
Clicking elements like the `Action Menu (three-dot button)` triggers asynchronous rendering of floating panels or dialogs.
*   You **must** use asynchronous waits (e.g., `waitForElement()`) to ensure containers (`mat-mdc-menu-panel`, `mat-dialog-container`) have successfully appeared in the DOM.
*   Furthermore, even if the container is present, its internal interactive items (like buttons) may still be executing their rendering passes. Always wait for the inner items to populate (e.g., `await waitForElement('button', 2000, menu)`) before attempting a query selector or trigger click.

### 3. SPA Routing Handling
Gemini is a Single Page Application (SPA). Moving from the root (`/`) to a specific conversation (`/app/xx`) utilizes client-side routing.
*   Rely on the `window.navigation` API (e.g., catching `#navigatesuccess`) alongside a `setInterval` fallback to gracefully tear down and re-initialize the script (`checkUrlAndManageScriptState()`).
*   Ensure that event listeners, DOM injections (like floating buttons), and nested observers are cleanly disconnected when navigating away from chat views to prevent memory leaks, unhandled references, and duplicate UI insertions.

### 4. Security (Trusted Types & CSP)
Gemini heavily enforces `TrustedTypes` policies to protect against DOM XSS.
*   **Simulating Clicks**: When simulating `MouseEvent`s programmatically, always set `view: null` within the event dictionary. Omitting this triggers a non-trusted-event violation in Gemini's runtime context.
*   **DOM Injection**: The script uses a Trusted Types policy (`geminiDeletePanel`) to allow secure HTML injection via `window.geminiSetInnerHTML`.

## UI 設計と共通シェル

このスクリプトは `gemini-common.html` で定義された共通パネルシェルを使用しています。

-   **共通シェル構成**:
    -   **ヘッダー (`.gus-panel-header`)**: バージョン番号とアイコンを表示。ドラッグハンドルとして機能。
    -   **最小化挙動**: ヘッダー（タイトル部分）を**ダブルクリック**することで、パネルの開閉（最小化/復元）をトグります。
    -   **コンテンツエリア (`.gdp-content`)**: `gemini-one-click-delete.html` から読み込まれる「Delete」ボタンが配置されます。
-   **処理中の表示**: 削除ボタンをクリックすると `.processing` クラスが付与され、ボタンテキストの代わりにバウンスアニメーション（スピナー）が表示されます。

### 5. Inter-script Communication
This script listens for a `gemini-one-click-delete:request-delete` CustomEvent on the `window` object.
*   **Trigger**: Other userscripts (like `gemini-export-to-docs` or `gemini-artifact-exporter`) dispatch this event to request the deletion of the current conversation after an export is completed.
*   **Handling**: Upon receiving the event, the script waits for 1 second (safety delay) and then attempts to trigger the 1-click delete logic if a valid conversation is detected.

### 6. Mandatory Version Bumping
Every internal logic or functionality update **must** include a version bump (`// @version`) within the userscript metadata block so that Tampermonkey correctly pulls the update.

### 7. Documentation Migration (Native HTML)
As of v0.2.10, `index.html` has been migrated from a markdown-rendering page (using `marked.js`) to a **Native HTML** structure.
*   **Purpose**: This removes external CDN dependencies, ensuring the documentation remains accessible even without internet access or if CDNs are blocked.
*   **Maintenance**: Any new documentation sections should be added directly as semantic HTML within the `index.html` file, following the existing GitHub-like styling pattern defined in the `<style>` block.

### 8. UI Preview Screenshots
The `index.html` includes a "UI プレビュー" section showing the script's visual elements.
*   **Storage**: Screenshots are stored in the `./screenshots/` directory relative to `index.html`.
*   **Capture Strategy**: When the UI changes significantly, use the browser subagent to capture **cropped element-level screenshots** (e.g., just the button or just the panel) rather than full-page captures. This keeps the documentation focused and clean.
*   **Styling**: Use `4em` for the button and `20em` for the panel (or natural size) when embedding to maintain a realistic scale.

### 9. v0.2.10 Enhancements
*   Enhanced `MutationObserver` with a 500ms debounce to significantly reduce CPU overhead during AI typing.
*   Implemented a 5-second polling fallback during initial load to ensure UI elements are injected even if Gemini's SPA rendering is delayed.
*   Improved cleanup logic to ensure all injected elements and listeners are removed during SPA navigation.

### 10. v0.2.11 Enhancements
*   Refactored the UI from a complex floating panel to a standardized, draggable pill-shaped floating button.
*   Removed minimize/maximize logic and shortcut hint displays from the DOM to simplify the interface.


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期**:
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
   - **ローカル相対パスを使用してはいけません**。`domain-landing.js` の `fetchVersion()` はこの `href` を使って GitHub から `@version` を取得するため、ローカルパスでは CORS エラーが発生しバージョン取得に失敗します。
   - **ハードコードされたバージョン文字列をボタンテキストに含めてはいけません**。バージョン表示は `domain-landing.js` が GitHub から動的に取得して注入するため、ハードコードすると古いバージョンが表示され続けます。
