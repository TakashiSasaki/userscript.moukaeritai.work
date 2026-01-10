# Gemini Auto-Scroll Development Guidelines

## Install Detection API
The userscript includes the install-detection guard required by the portal index and only injects this API on the following hosts:

- `userscript.moukaeritai.work`
- `127.0.0.1`
- `fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev`

Behavior on those hosts:

- **Dispatch**: `userscript-check-installed` is dispatched on page load.
- **Listener**: `userscript-ping` is listened for and replied to, then the script returns early.

## Cross-Platform Compatibility
- Use Python scripts for file processing, searching, and analysis tasks when possible.
- Avoid OS-specific shell commands (like `grep`, `ls`, `cat`) to ensure workflows run smoothly on both Windows and Linux environments.

## HTML Preprocessing
See `youtube.com/samples/preprocess.py` for the cleaning logic.
Always re-process snapshots if the cleaning script changes.

## Conversation List Analysis

### 1. Identifying the Current Conversation
### 1. Identifying the Current Conversation
The conversation ID is present in the URL: `https://gemini.google.com/app/<ID>` (e.g., `https://gemini.google.com/app/0542fe84f32c367b`).

In the conversation list (sidebar), each item is a `div[role="button"][data-test-id="conversation"]`.
- **Highlighted/Active Item**: The currently selected conversation has the class `selected`.
- **ID Extraction**: The ID is stored within the `jslog` attribute string, specifically inside the `BardVeMetadataKey` array, prefixed with `c_`.
    - Format example: `jslog="...;BardVeMetadataKey:[...,&quot;c_0542fe84f32c367b&quot;,...];mutable:true"`
    - The ID in the DOM corresponds to the URL ID with a `c_` prefix (e.g., URL ID `0542fe84f32c367b` matches `c_0542fe84f32c367b` in `jslog`).
- **Selector Strategy**:
    - To find the element for a specific URL ID: `div[data-test-id="conversation"][jslog*="c_<URL_ID>"]`
    - To parse the ID from an element: Extract the string starting with `c_` from the `jslog` attribute.

### 2. Detecting the Loading State
The conversation list uses infinite scroll. When more items are being fetched:
- A spinner element appears: `mat-progress-spinner[data-test-id="loading-history-spinner"]`.
- The spinner is typically located inside an `infinite-scroller` component at the bottom of the list.
- **Loading Check**: `document.querySelector('mat-progress-spinner[data-test-id="loading-history-spinner"]') !== null`
- **Container**: The scrollable container is `conversations-list` or its internal `.conversations-container`.

### 3. Scroll Triggering and Convergence
To load more conversations automatically:
1. Extract ID from URL.
2. Check if ID exists in sidebar.
3. If not found:
    - Scroll the sidebar container to the absolute bottom.
    - Wait for the loading spinner to appear AND then disappear (indicator of a finished fetch).
    - Re-search for the ID.
4. Repeat if necessary.
5. **Giving Up**: If the spinner doesn't appear after scrolling to the bottom, or if we reach a maximum number of scrolls (e.g., 20), stop.

## Version Control
- **Versioning Rule**: When any code change is made to the userscript, increment at least the **patch level** of the version number (e.g., 0.1.28 -> 0.1.29).
- **Documentation**: Reflect the version bump and changes in `gemini-auto-scroll.md`.
