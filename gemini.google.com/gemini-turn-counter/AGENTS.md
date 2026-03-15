# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.

## Mandatory Version Bumping

**Every single change** made to the userscript (`gemini-turn-counter.user.js`), regardless of its size or scope, **MUST** be accompanied by a version bump in the script's metadata header. This ensures that users receive updates via their userscript manager's auto-update feature.

## Dynamic DOM Analysis

Since Google Gemini is a complex SPA with frequently changing CSS classes, AI agents should utilize dynamic analysis to maintain selector accuracy.

### Methodology

1.  **Live DOM Inspection**: Use browser-integrated tools (e.g., `browser_get_dom` via CDP) to inspect the current state of a live Gemini conversation. Do not rely solely on static HTML samples if the UI appears to have updated.
2.  **Visual Verification**: Capture and analyze screenshots to identify UI elements that may be hidden behind menus, modals, or side panels (e.g., the "Files in this chat" panel).
3.  **Real-time Script Testing**: Execute JavaScript directly in the browser context to verify that proposed CSS selectors (e.g., `button[aria-label*="in Canvas"]`) return the expected number of elements.
4.  **Source of Truth Determination**: When multiple sources of data exist (e.g., chat body vs. side panel), evaluate them based on:
    *   **Accessibility**: Is the data available in the DOM without user interaction?
    *   **Reliability**: Does the selector persist across different conversation types?
    *   **Completeness**: Does the source cover all intended data points (e.g., both Canvas files and Link Cards)?

### Example Selectors (as of 2026-03-16)
*   **Artifacts (Canvas)**: `immersive-entry-chip, entry-chip`
*   **Link Cards (inc. Maps)**: `.list-item-container.link, yt-core-attributed-string, [data-test-id="link-preview"], a.link[href*="google.com/maps"]`
*   **Code Blocks**: `code-block`
*   **Tables**: `table-block`
*   **Images (User)**: `img[data-test-id="uploaded-img"]` (inside `button.preview-image-button`)
*   **Images (Model)**: `button.image-button img`
*   **Thinking Process**: `thinking-block, thought-chip`

## Implementation Details

### SPA Navigation & Routing
Gemini is a complex SPA. Routing is managed using the modern `window.navigation` API with a lightweight `setInterval` fallback for older browsers. This ensures the script only initializes on `/app/` or `/gem/` chat pages and cleans up correctly when navigating away.

### Reactivity & Performance
- **MutationObserver**: Used to detect real-time message generation and DOM updates. **Must** include a debounce mechanism (e.g., 300ms) to prevent performance issues during large DOM insertions.
- **Trusted Types**: Gemini uses Trusted Types. All HTML injection via `innerHTML` is governed by a `trustedTypes.createPolicy` to comply with CSP restrictions.
- **Cleanup**: The script proactively removes style elements, UI containers, and disconnects observers when leaving chat pages to minimize memory leaks and CPU overhead.

### Lessons Learned & Common Gotchas

1.  **Dynamic Tag Names**: Gemini frequently updates custom tag names (e.g., from `entry-chip` to `immersive-entry-chip`). Always use composite selectors to maintain backward compatibility.
2.  **Parent-Child Double Counting**: When using composite selectors or classes (e.g., `.parent, .child`), ensure that selectors do not match both a parent and its child simultaneously. This can lead to inflated counts (e.g., 2x the actual count) if `querySelectorAll().length` is used without filtering.
3.  **State-Dependent UI Changes**: Opening a side panel (like Canvas) may cause elements (like "Open" buttons) to be removed from the chat flow's DOM. Always target the most stable container element (the "chip") rather than transient interactive elements (the "button") for accurate tracking.
