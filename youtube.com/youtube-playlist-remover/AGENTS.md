# Agent Guidelines for YouTube Playlist Remover

This document outlines specific rules and implementation details for `youtube-playlist-remover.user.js` to ensure safe and reliable maintenance.

## 1. Core Philosophy: Emulation & Safety

*   **UI Emulation Over Direct DOM Manipulation**:
    *   **Do NOT** use `.remove()` or `display: none` to "delete" items simply from the view. This breaks YouTube's internal state and playlist logic.
    *   **MUST** emulate user interactions: Click the "three-dot menu" -> Wait for popup -> Click "Remove from playlist". This ensures YouTube's backend correctly processes the removal.
*   **Safety First**:
    *   **Filter Coexistence**: Always respect the Filter script. Do not target hidden items (`display: none`).
    *   **Visibility**: Prioritize safety by waiting for UI elements to appear and disappear properly.

## 2. Implementation Details

### SPA Activation & Panel State
*   **Wide Install, Narrow Activation**: Use a broad `@match` (e.g. `*://www.youtube.com/*`) to keep the script installed, but gate the main logic to `/playlist?*` only.
*   **Lifecycle**: Listen to `yt-navigate-start/finish` and start/stop observers, intervals, and UI only while the playlist URL is active.
*   **Panel Coupling**: The panel must follow the active state automatically. Show content and `Active` when enabled, collapse content and show `Inactive` when disabled (header stays visible).

### Interaction Logic (Critical)
The script uses a strict sequence to remove a video. Do NOT change this unless YouTube's UI fundamentally changes:
1.  **Focus**: Call `.focus()` on the menu button. This helps standardizing the event handling.
2.  **Click Menu**: Click the three-dot menu button.
3.  **Wait for Popup**: Poll for the existence of `ytd-menu-popup-renderer` and confirm it is visible.
4.  **Delay After Visible**: Once visible, wait at least 0.5s before scanning menu items.
5.  **Identify Target**: Search for the menu item text ("Remove from", "から削除") or the specific trash can icon path.
6.  **Focus & Click Item**: Call `.focus()` on the menu item, click it, then outline the clicked element.
6.  **Close/Confirm**: Click `document.body` to close any lingering menus if needed, or handle confirmation dialogs if they appear.

### Timing & Polling (Do Not Over-tighten)
*   **Polling Interval**: Menu detection, dialog checks, and item disappearance use 500ms polling. Do not reduce without performance testing.
*   **Item Existence Guard**: Before clicking the menu button, confirm the video item is still connected/visible to avoid acting on removed nodes.
*   **Visible Popup Only**: Treat a popup as ready only when it is visible (not just present in the DOM).

### Visual Feedback (Menu Phase)
*   When the menu becomes visible, outline the popup in red (`2px`).
*   After clicking a menu item, outline the clicked element in red (`2px`).

### Visual Feedback
Since the operation is asynchronous and takes time (UI interaction speed), providing feedback is essential:
*   **Status Panel**: Show the current progress (e.g., "Removing #10 (5/20)...").
*   **Highlighting**: During a batch removal, the target video's index number (`#index`) is highlighted in **Red and Bold** (`color: #d00`, `fontWeight: bold`). This lets the user know exactly which item is currently being processed.

### UI Design Language
*   **Distinct Style**: Use a **Reddish** color scheme (Background: `#fff0f0`, Border: `#d00`) for the Remover panel.
*   **Purpose**: This visual distinction is critical to prevent users from confusing it with the Filter panel (which uses a neutral Grey scheme).

## 3. Maintenance

*   **Versioning**: Follow the strict versioning policy. Any change requires a patch bump.
*   **Selectors**: YouTube frequently changes class names and IDs. If the script breaks, first check:
    *   The menu button selector (currently `#menu button` or `.dropdown-trigger`).
    *   The popup menu renderer tag (`ytd-menu-popup-renderer`).
    *   The menu service item renderer tag (`ytd-menu-service-item-renderer`).
    *   The text used to identify the remove button (multilingual support is handled by checking both English and Japanese text, plus icon paths).

## 4. Debugging Resources

The `samples/` directory contains HTML snapshots used for analyzing the DOM structure.
*   **`samples/dropdown.html`**: Structure of the popup menu.
*   When updating selectors, refer to these samples or create new ones from a live YouTube page.

## インストール/バージョン検知API
- `index.html` は `userscript-ping` を送信し、各ユーザースクリプトが `userscript-check-installed` を `dispatchEvent` して応答することで検知します。
- 受信側は `data-script-name` と `@name` の一致で対象ボタンを特定します。
- `Install (vX.Y.Z)` の表記からバージョンを抽出し、セマンティックバージョン比較で `Update` / `Installed` を切り替えます。
