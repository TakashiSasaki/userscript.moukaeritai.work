# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

## Technical Details

### 1. Conversation List Selection
ChatGPT's sidebar structure is highly dynamic. The script uses `CONVERSATION_LIST_SELECTORS` array to find the first matching scrollable container.

### 2. Auto-Scroll Mechanism
- Uses a `MutationObserver` to watch for new items being loaded.
- Implements a `scrollInterval` (default 10s) to wait for "pull-to-load" items after a scroll event.
- Triggers `scrollTop = scrollHeight` to force the scroll.

### 3. UI Implementation
- A floating panel created via `setInterval` every 1s (idempotent).
- Uses `GM_getValue`/`GM_setValue` for persistence of:
  - `panelTop`, `panelLeft`: Panel position.
  - `scrollInterval`: User-defined delay between scrolls.
- `user-select: none` is applied to status texts to avoid highlighting while dragging.

### 4. Portal Interaction
- Implements `userscript-ping` listener to report version info to `userscript.moukaeritai.work`.


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期**:
   - スクリプトのバージョンが更新された場合は、関連するすべての `index.html` 内にハードコードされているバージョン表記も忘れずに更新してください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持してください。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
