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

# UI Design Strategy

- **Pill-shaped Button**: The UI is a compact, horizontal pill-shaped element to minimize screen obstruction.
- **Draggable Pill**: The entire pill body acts as a drag handle (using `mousedown` events on the container). Dragging is disabled when clicking interactive elements (buttons/checkboxes).
- **Control Layout**: Contains a native checkbox for "Auto" toggle, a "⏭️ Next" button for manual skipping, and the version badge.
- **Visuals**: Uses `backdrop-filter: blur(8px)` and semi-transparent backgrounds for a premium look that conforms to site-wide standards.

