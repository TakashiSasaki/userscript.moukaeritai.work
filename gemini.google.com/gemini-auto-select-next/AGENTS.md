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

1. **バージョン情報の同期**:
   - バージョン番号はハードコードしないでください。
   - インストールボタンは GitHub Raw URL を指し、`data-script-name="Gemini Auto-Select Next"` を維持してください。
   - バージョン比較用の `.version-info`, `.latest-version`, `.installed-version` 構造を崩さないでください。

2. **依存関係とイベントの明記**:
   - `gemini-auto-select-next:request-next` と `gemini-auto-select-next:request-current-conversation` / `gemini-auto-select-next:current-conversation` の関係を説明ページに明記してください。

3. **ドキュメントの網羅性**:
   - Ordered cache / history dialog を紹介する変更を加えた場合は、`gemini.google.com/index.html` のカード説明も更新してください。
