# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, HTML sample preprocessing, and **shared technical knowledge base**.

## Technical Specification for Gemini Auto-Scroll

### 1. Verification Logic
- **Install Check**: usage of `installCheckHosts` and `installCheckSuffixes` to dispatch `userscript-check-installed`.
  - This allows the landing page (`userscript.moukaeritai.work`) to detect if the script is active.

### 2. DOM Interaction Strategy
- **Trusted Types**: This script MUST use a `TrustedTypes` policy (`geminiAutoScroll`) when writing to `innerHTML` to be compatible with Google's strict CSP.
- **Selectors**:
  - **Conversations**: Identified via `[data-test-id="conversation"]` or `[jslog*="c_"]`.
  - **IDs**: Extracted from the `jslog` attribute using regex `c_([0-9a-f]{16})`.
- **Scrolling**:
  - The script attempts to find the scrollable container dynamically (`conversations-list`, `infinite-scroller`, or by computed style).
  - Infinite scroll is achieved by setting `scrollTop = 99999999`.

### 3. Auto-Switch Logic
- **Trigger**: Listens for the removal of the *selected* DOM element via `MutationObserver`.
- **Next ID Selection**:
  - Scans the list for the *next* sibling item.
  - If on the root URL (`/app`), it defaults to selecting the top item.
  - **Fallback**: If clicking the element fails (e.g., list not fully loaded), it falls back to `window.location.href` navigation.

### 4. Critical Error Handling
- The script monitors for "Couldn’t load recent chats" snackbars. If detected, it **permanently disables** auto-scroll to prevent infinite error loops.
