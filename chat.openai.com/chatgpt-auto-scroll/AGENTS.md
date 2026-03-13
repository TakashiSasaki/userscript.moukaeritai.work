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
