# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

# Technical Considerations for gemini-auto-select-next.user.js

### 1. Sidebar Selectors
- Use Gemini conversation anchors (`a[data-test-id="conversation"]`, `a.conversation`) as the source of truth.
- The observer target should be the sidebar scroller/list that contains those anchors, not `document.body`.
- Active rows are identified by `aria-current="page"` or `.selected`.

### 2. Ordered Conversation Cache
- The script persists sidebar history in `GM_setValue` key `gemini_auto_switch_conversation_state_v1`.
- Stored shape:
  - `order: string[]`
  - `itemsById: Record<string, { id, title, href, firstSeenAt, lastSeenAt }>`
  - `lastSnapshotIds: string[]`
  - `lastScrollTop: number | null`
- Newly visible rows are appended/prepended/reinserted only when they actually enter the DOM. The script does not synthesize missing history.

### 3. Reconciliation Rules
- Treat the currently rendered sidebar slice as one authoritative contiguous block.
- Before reinserting the visible block, remove its IDs from the stored `order`.
- Insertion priority:
  1. old position of the earliest visible ID that was already known
  2. overlap with the previous visible snapshot
  3. scroll direction fallback (`prepend` on upward scroll, `append` on downward scroll)
- If Gemini reorders a known conversation upward after an update, the cache must reorder without duplication.

### 4. Conservative Deletion Detection
- Do not delete cached rows merely because they disappeared from the DOM; Gemini virtualizes the sidebar.
- Missing IDs at the leading or trailing edge of the previous visible slice are treated as scroll churn and kept.
- Remove cached rows only when an ID disappears from the interior of the previous slice while surviving neighbors remain in the same order.
- The current active conversation may also be removed when Gemini routes away from it after deletion and it vanished from the visible slice.

### 5. Selection Logic
- Keep the existing `gemini-auto-select-next:request-next` event unchanged.
- `selectNextConversation()` still works from the currently visible DOM list only; this script does not yet use the saved cache as navigation fallback.
- Auto-select should only trigger after a proven deletion / deletion-like route loss, never just because the selected row scrolled out of the virtualized DOM.

### 6. Current Conversation API
- The script listens on `window` for `gemini-auto-select-next:request-current-conversation`.
- It responds on `window` with `gemini-auto-select-next:current-conversation`.
- Response shape:
  - `reqId`
  - `conversationId`
  - `title`
  - `storedIndex`
  - `isKnown`
  - `isVisibleInSidebar`
  - `orderedCount`
- `conversationId` is derived from the URL first.
- `storedIndex` is 1-based when present, otherwise `null`.
- This is a read-only metadata API; there is no public full-list API in this phase.

### 7. UI Architecture
- The script uses external HTML/CSS resources (`gemini-auto-select-next.html`, `gemini-auto-select-next.css`) plus the shared Gemini common panel shell.
- The panel remains compact and exposes only `Auto`, `Next`, and `List`.
- The dialog is read-only and rendered from a `<template>` in the script HTML resource.

### 8. Security
- All HTML injection must continue to go through Trusted Types via policy `geminiAutoSwitch`.
- Build dialog rows with DOM APIs instead of string-concatenated HTML.

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
