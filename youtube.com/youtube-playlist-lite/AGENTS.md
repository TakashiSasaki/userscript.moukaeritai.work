# YouTube Playlist Lite - Agent Implementation Notes

This document provides technical details for AI agents developing or maintaining the **YouTube Playlist Lite** userscript. For general project rules, refer to the root [AGENTS.md](/AGENTS.md).

## 1. Domain & Scope
- **Target URL**: Strictly limited to YouTube Playlist pages (`https://www.youtube.com/playlist*`).
- **Context Handling**:
  - Automatically transitions to **Inactive** state (UI collapses and features stop) on non-playlist pages (e.g., watch page, search results).
  - Use `location.pathname.startsWith('/playlist')` for context validation.

## 2. Technical Selectors
| Role | Selector |
| :--- | :--- |
| **Thumbnail Elements** | `ytd-playlist-video-renderer ytd-thumbnail`, `ytd-playlist-header-renderer ytd-hero-playlist-thumbnail-renderer` |
| **Observer Root** | `ytd-playlist-video-list-renderer #contents` |
| **Miniplayer** | `ytd-miniplayer` |

## 3. Design & UI Strategy
- **Shared UI Patterns**:
  - **Activity-Linked Panel State**: The panel's open/collapsed state is primarily controlled by `isAutoMinimized` based on the page context.
  - **Manual Override**: Users can manually toggle the collapsed state via **Double-Click** on the version label text (e.g., "Lite v0.1.19"). This is tracked by `isManuallyMinimized`.
- **States**:
  - `Active`: UI contents visible (unless manually minimized), opacity 1.0.
  - `Inactive`: UI contents hidden, opacity 0.85, status badge "Inactive".

## 4. Performance & Monitoring
- **MutationObserver**:
  - Monitors the `#contents` div of the playlist list with `subtree: true`.
  - Uses a **150ms debounce** (`performDebouncedCleanup`) to avoid CPU spikes during infinite scrolling.
- **Cleanup Strategy**:
  - Performs "Early Cleanup" on `yt-navigate-start` to stop observers and clear styles before the next navigation load.
  - Re-initializes on `yt-navigate-finish` with a slight delay (500ms).
- **Miniplayer Removal**: Integrated into the debounced cleanup sweep instead of using polling.

## 5. `index.html` のメンテナンス要件

1. **バージョン情報の動的取得**:
   - 各 `index.html` は `domain-landing.js` を読み込み、GitHub から最新の `@version` を動的に取得して表示します。このため、HTML 内にバージョン番号をハードコードしないでください。
   - **HTML 内のバージョン番号を手動で書き換える必要はありません。** ユーザースクリプト（`.user.js`）の `@version` をインクリメントするだけで、ドキュメントページに自動反映されます。
   - インストールボタンの構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造、および `data-script-name` 属性）を維持することで、自動更新・比較機能が動作します。

2. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
