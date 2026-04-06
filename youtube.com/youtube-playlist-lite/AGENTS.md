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

## 5. Metadata Sync
- **Registration**: This script must be listed in the root `index.html` and the `youtube.com/index.html` domain index.
- **Versioning**: Always bump the patch version on code changes and sync version labels in `index.html`.
