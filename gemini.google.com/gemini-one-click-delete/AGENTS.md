# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.

# Technical Considerations for gemini-one-click-delete.user.js

When modifying or enhancing this userscript, keep the following domain-specific constraints in mind:

### 1. Robust Selectors and Fallbacks
Gemini's UI classes and DOM structure (specifically Material Design components like `#mat-menu-panel-*`) are highly dynamic and update frequently.
*   **Avoid fragile selectors**: Do not rely solely on `:nth-child()` index selectors or generic tag names (`button`) without a specific context.
*   **Prioritize durable attributes**: Use semantic selectors like `aria-label`, `data-test-id`, or `role="menuitem"`.
*   **Always include text-content fallbacks**: When interacting with dynamic menus or dialogs (e.g., the "Delete" menu item or "Confirm" dialog button), implement logic to scan elements for specific contents, like `textContent.includes('TargetText')`. This acts as a robust fallback in case specific tracking attributes are unexpectedly changed or removed.

### 2. Synchronization and Wait Logic
Clicking elements like the `Action Menu (three-dot button)` triggers asynchronous rendering of floating panels or dialogs.
*   You **must** use asynchronous waits (e.g., `waitForElement()`) to ensure containers (`mat-mdc-menu-panel`, `mat-dialog-container`) have successfully appeared in the DOM.
*   Furthermore, even if the container is present, its internal interactive items (like buttons) may still be executing their rendering passes. Always wait for the inner items to populate (e.g., `await waitForElement('button', 2000, menu)`) before attempting a query selector or trigger click.

### 3. SPA Routing Handling
Gemini is a Single Page Application (SPA). Moving from the root (`/`) to a specific conversation (`/app/xx`) utilizes client-side routing.
*   Rely on the `window.navigation` API (e.g., catching `#navigatesuccess`) alongside a `setInterval` fallback to gracefully tear down and re-initialize the script (`checkUrlAndManageScriptState()`).
*   Ensure that event listeners, DOM injections (like floating buttons), and nested observers are cleanly disconnected when navigating away from chat views to prevent memory leaks, unhandled references, and duplicate UI insertions.

### 4. Trusted Types / Security Policy (CSP)
Gemini heavily enforces `TrustedTypes` policies to protect against DOM XSS.
*   **Simulating Clicks**: When simulating `MouseEvent`s programmatically, always set `view: null` within the event dictionary. Omitting this triggers a non-trusted-event violation in Gemini's runtime context.
*   **DOM Injection**: Prefer native DOM creation (`document.createElementNS`, `document.createElement`) over assigning raw strings to `innerHTML`.

### 5. Mandatory Version Bumping
Every internal logic or functionality update **must** include a version bump (`// @version`) within the userscript metadata block so that Tampermonkey correctly pulls the update.
