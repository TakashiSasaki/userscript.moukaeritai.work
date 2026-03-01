# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.

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

### Example Selectors (as of 2026-03)
*   **Artifacts (Canvas)**: `button[aria-label*="in Canvas"]`
*   **Link Cards**: `.list-item-container.link, yt-core-attributed-string, [data-test-id="link-preview"]`
