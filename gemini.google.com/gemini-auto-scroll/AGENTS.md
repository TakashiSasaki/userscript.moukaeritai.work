# Gemini Auto-Scroll Development Guidelines

## Cross-Platform Compatibility
- Use Python scripts for file processing, searching, and analysis tasks when possible.
- Avoid OS-specific shell commands (like `grep`, `ls`, `cat`) to ensure workflows run smoothly on both Windows and Linux environments.

## HTML Preprocessing
See `youtube.com/samples/preprocess.py` for the cleaning logic.
Always re-process snapshots if the cleaning script changes.

## Conversation List Analysis

### 1. Identifying the Current Conversation
The conversation ID is present in the URL: `https://gemini.google.com/app/<ID>`.
In the conversation list (sidebar), each item is a `div[data-test-id="conversation"]`.
The ID is stored within the `jslog` attribute, prefixed with `c_`.
- **Selector**: `div[data-test-id="conversation"][jslog*="c_<ID>"]`
- **Verification**: The ID in `jslog` looks like `"c_fef36eb6be619216"`. The URL part is just `fef36eb6be619216`.

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
