# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

# Technical Considerations for gemini-auto-select-next.user.js

### 1. Robust Selectors
- Uses standard Gemini selectable item selectors (`a.conversation`, `a[data-test-id="conversation"]`).
- Relies on `aria-current` or `.selected` class to identify the active conversation.

### 2. Selection Logic
- Uses `MutationObserver` to detect when a conversation item is removed from the DOM.
- When the removed item was the selected one, it immediately attempts to select the next item in the list.
- Fallback: If the target element cannot be clicked, it navigates via URL.

### 3. SPA Routing
- Handles Single Page Application behavior using the Navigation API (or `setInterval` fallback) to initialize and cleanup the script state.
- Only active on `/app/*` paths.

### 4. Persistence
- Uses `GM_setValue`/`GM_getValue` to remember the enable/disable state and the floating pill's position.

### 5. Installation Check
- Uses a strict hostname check (`installCheckHosts`) restricted to `userscript.moukaeritai.work` and `127.0.0.1`.
- `installCheckSuffixes` (e.g., for GitHub Codespaces) has been removed for simplicity.

# UI Architecture
The script uses an external HTML template and CSS for the auto-select-next panel to maintain a clean separation of concerns and adhere to the project's resource refactoring pattern.

- **Styles**: Defined in `gemini-auto-select-next.css`. Loaded via `GM_addStyle`.
- **Template**: Defined in `gemini-auto-select-next.html`. Injected using `window.geminiSetInnerHTML`.
- **Placeholders**: Version and emoji are populated into the `.gus-version` element after injection.
- **Draggable Panel**: Utilizes `window.geminiSetupDraggablePanel` from `gemini-common.js` for mobility and state persistence.

# Security
All HTML injection is performed through a Trusted Types policy (`geminiAutoSwitch`) to ensure compatibility with Gemini's security requirements.



## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期**:
   - スクリプトのバージョンが更新された場合は、関連するすべての `index.html` 内にハードコードされているバージョン表記も忘れずに更新してください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持してください。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
