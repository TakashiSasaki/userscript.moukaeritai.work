# Agent Guidelines

This directory contains userscripts targeting `gemini.google.com`. This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, HTML sample preprocessing, and shared technical knowledge base.

## Common Technical Considerations for Gemini Userscripts

When modifying or creating userscripts for `gemini.google.com`, keep the following domain-specific constraints and patterns in mind:

### 1. Robust Selectors and Fallbacks
Gemini's UI classes and DOM structure are highly dynamic and update frequently.
*   **Avoid fragile selectors**: Do not rely solely on `:nth-child()` index selectors, randomly generated class names, or generic tag names without a specific context.
*   **Prioritize durable attributes**: Use semantic selectors like `data-test-id`, `aria-label`, button icon text (e.g., `mat-icon`), or `role`.
*   **Text-content fallbacks**: When interacting with dynamic menus or dialogs, implement logic to scan elements for specific text content. This acts as a robust fallback.

### 2. Synchronization and Wait Logic
Gemini heavily relies on asynchronous rendering for chat responses, floating panels, and dialogs.
*   **Always use asynchronous waits**: Do not assume elements exist immediately after a click or page load. Use a `waitForElement` utility to ensure containers have successfully appeared in the DOM.
*   Even if a container is present, its internal interactive items may still be executing their rendering passes. Wait for the inner items to populate before attempting to interact with them.

### 3. SPA Routing Handling
Gemini is a Single Page Application (SPA). Moving between pages (e.g., from the root to `/app/...` or `/gem/...`) utilizes client-side routing.
*   **Dynamic Enable/Disable**: Scripts must detect URL changes (e.g., using `window.navigation` API like `navigatesuccess`, or a `setInterval`/`MutationObserver` fallback).
*   **Cleanup**: Ensure that event listeners, DOM injections (like floating buttons), and observers are cleanly disconnected or removed when navigating away from chat views. This prevents memory leaks, unhandled references, and duplicate UI insertions.

### 4. Trusted Types / Security Policy (CSP)
Gemini heavily enforces `TrustedTypes` policies to protect against DOM XSS.
*   **Simulating Clicks**: When simulating `MouseEvent`s programmatically, always set `view: null` within the event dictionary. Omitting this triggers a non-trusted-event violation in Gemini's runtime context.
*   **DOM Injection**: Prefer native DOM creation (`document.createElement`, `document.createElementNS`) over assigning raw strings to `innerHTML`. If `innerHTML` must be used, a TrustedTypes policy is required.

### 5. Mandatory Headers
*   **`@noframes`**: User scripts for `gemini.google.com` must include `// @noframes` in their metadata. This prevents scripts from loading twice (once in the main window and once in the internal `/_/bscframe` iframe).
*   **Version Bumping**: Every internal logic or functionality update **must** include a version bump (`// @version`) within the userscript metadata block so that Tampermonkey correctly pulls the update.

### 6. Documentation Pages (index.html)
*   **No README.md**: Do not use `README.md` for individual script documentation within this directory.
*   **index.html**: Each userscript directory must have an `index.html` file written in raw HTML (no markdown parsing libraries).
*   **Required Elements in index.html**: The `index.html` must include a `<link rel="canonical" href="..." />`, an installation button (`<a class="install-button">`), the script's version, and the script's last modified date dynamically fetched from the `.user.js` metadata.

### 7. Git Practices
*   **Clean Up**: Always act tidy. After committing using a `commit_message.txt` file, remember to delete the `commit_message.txt` file.
