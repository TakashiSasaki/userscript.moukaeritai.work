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
- Uses `GM_setValue`/`GM_getValue` to remember the enable/disable state and the floating panel's position.
