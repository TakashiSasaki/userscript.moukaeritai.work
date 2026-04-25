# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.

## Mandatory Version Bumping

**Every single change** made to the userscript (`gemini-turn-counter.user.js`), regardless of its size or scope, **MUST** be accompanied by a version bump in the script's metadata header. This ensures that users receive updates via their userscript manager's auto-update feature.

## Dynamic DOM Analysis

Since Google Gemini is a complex SPA with frequently changing CSS classes, AI agents should utilize dynamic analysis to maintain selector accuracy.

### Methodology

1.  **Live DOM Inspection**: Use browser-integrated tools (e.g., `browser_get_dom` via CDP) to inspect the current state of a live Gemini conversation. Do not rely solely on static HTML samples if the UI appears to have updated.
2.  **Visual Verification**: Capture and analyze screenshots to identify UI elements that may be hidden behind menus, modals, or side panels (e.g., the "Files in this chat" panel).
3.  **Real-time Script Testing**: Execute JavaScript directly in the browser context to verify that proposed CSS selectors (e.g., `button[aria-label*="in Canvas"]`) return the expected number of elements.
4.  **Source of Truth Determination**: When multiple sources of data exist (e.g., chat body vs. side panel), evaluate them based on:
    *   **Accessibility**: Is the data available in the DOM without user interaction?
    *   **Reliability**: Does the selector persist across different conversation types?
    *   **Completeness**: Does the source cover all intended data points (e.g., both Canvas files and Link Cards)?

### Example Selectors (as of 2026-03-16)
*   **Artifacts (Canvas)**: `immersive-entry-chip, entry-chip`
*   **Link Cards (inc. Maps)**: `.list-item-container.link, yt-core-attributed-string, [data-test-id="link-preview"], a.link[href*="google.com/maps"]`
*   **Code Blocks**: `code-block`
*   **Tables**: `table-block`
*   **Images (User)**: `img[data-test-id="uploaded-img"]` (inside `button.preview-image-button`)
*   **Images (Model)**: `button.image-button img`
*   **Thinking Process**: `thinking-block, thought-chip`

## Implementation Details

### SPA Navigation & Routing
Gemini is a complex SPA. Routing is managed using the modern `window.navigation` API with a lightweight `setInterval` fallback for older browsers. This ensures the script only initializes on `/app/` or `/gem/` chat pages and cleans up correctly when navigating away.
When SPA routing re-enters a chat page, the script must reuse an existing `#gemini-turn-counter-ui` panel or remove stale instances before creating a new one, so the panel count always stays at one.

### Reactivity & Performance
- **MutationObserver**: Used to detect real-time message generation and DOM updates. **Must** include a debounce mechanism (e.g., 300ms) to prevent performance issues during large DOM insertions.
- **Trusted Types**: Gemini uses Trusted Types. All HTML injection via `innerHTML` is governed by a `trustedTypes.createPolicy` to comply with CSP restrictions.
- **Cleanup**: The script proactively removes style elements, UI containers, and disconnects observers when leaving chat pages to minimize memory leaks and CPU overhead.

### Lessons Learned & Common Gotchas

1.  **Dynamic Tag Names**: Gemini frequently updates custom tag names (e.g., from `entry-chip` to `immersive-entry-chip`). Always use composite selectors to maintain backward compatibility.
2.  **Parent-Child Double Counting**: When using composite selectors or classes (e.g., `.parent, .child`), ensure that selectors do not match both a parent and its child simultaneously. This can lead to inflated counts (e.g., 2x the actual count) if `querySelectorAll().length` is used without filtering.
3.  **State-Dependent UI Changes**: Opening a side panel (like Canvas) may cause elements (like "Open" buttons) to be removed from the chat flow's DOM. Always target the most stable container element (the "chip") rather than transient interactive elements (the "button") for accurate tracking.

### External API (Custom Events)

Gemini Turn Counter は外部スクリプトから画像コピー機能を利用するためのカスタムイベント API を提供します。

**発火方法 (リクエスト):**
```javascript
document.dispatchEvent(new CustomEvent('gemini-turn-counter-copy-images', {
    detail: {
        target: 'all',  // 'user', 'model', または 'all'
        maxHeight: 200  // 省略可能（数値で高さを制限。false で制限なし）
    }
}));
```

**結果の受け取り (レスポンス):**
処理完了後、ステータスを含む `gemini-turn-counter-copy-images-result` イベントが同期/非同期でディスパッチされます。
```javascript
document.addEventListener('gemini-turn-counter-copy-images-result', (e) => {
    if (e.detail.success) {
        console.log(`Copied ${e.detail.count} images.`);
    } else {
        console.error(`Failed: ${e.detail.error || e.detail.message}`);
    }
});
```
※ **注意**: `ClipboardItem` 書き込みに対するブラウザの User Gesture 制約を満たすため、外部スクリプト側で `gemini-turn-counter-copy-images` をディスパッチする処理は、必ずユーザーのクリック等の同期イベントハンドラー内で行う必要があります。


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
