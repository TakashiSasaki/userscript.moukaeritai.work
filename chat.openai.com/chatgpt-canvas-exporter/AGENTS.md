# Development Notes for AI Agents and Developers

This document serves as a technical reference for the ChatGPT Canvas Exporter userscript. It outlines the methodologies used for DOM analysis, selector identification, and implementation details.

## Technical Context: ChatGPT Canvas

ChatGPT "Canvas" (internally often referred to as `writing-block` or `textdoc`) is a feature that opens a separate side panel for document editing. It uses **ProseMirror** as its underlying rich-text editor.

### DOM Analysis via CDP

To bypass Cloudflare protection and accurately capture the Canvas DOM, we used the **Chrome DevTools Protocol (CDP)**.

1.  **Capture Strategy**: Used a PowerShell script (or manual CDP call) to fetch the outer HTML while the Canvas was active.
    - Port: `9222/tcp`
    - Target: Current active tab at `chatgpt.com`
2.  **Preprocessing**: The raw HTML was minified. We used a "fixed" version (`samples/canvas_dom_fixed.html`) where long lines were broken at tag boundaries to facilitate line-based searching (e.g., `grep`, `Select-String`).

### Identified Selectors

The following selectors are critical for interacting with the Canvas:

-   **Canvas Container (Turn-based)**: `article.has-data-writing-block`
    - Indicates a chat turn that has an associated Canvas.
-   **Canvas Message/Editor Group**: `div[id^="textdoc-message-"]`
    - This is the main container for the Canvas UI elements (header, title, actions, and editor).
-   **Content Editor (ProseMirror)**: `.ProseMirror`
    - The actual editor element where the content resides. Extraction is currently done via `.innerText`.
-   **Header Actions**: `div[id^="textdoc-message-"] .flex.items-center.justify-end`
    - The area containing native buttons (Copy, Edit, etc.). This is where we inject the "Export MD" button.
-   **Title**: `div[id^="textdoc-message-"] .text-token-text-primary.font-semibold`
    - Used for generating the export filename.

## Implementation Details

### UI Injection
- **Dual UI Approach**:
    - **In-Header**: Injected directly into the native actions bar for a seamless look.
    - **Floating**: A fixed `bottom-right` button that appears only when `.ProseMirror` is detected. This addresses the SPA nature of ChatGPT where elements may be re-rendered or hidden during navigation.
- **MutationObserver**: Used to detect when the Canvas enters the DOM or the path changes, ensuring buttons are re-injected if lost.

### Performance and Reliability
- **Avoid Over-Injection**: The injector checks for the existence of `.canvas-exporter-btn` before prepending.
- **Filename Sanitization**: Titles are sanitized using `replace(/[\\/:*?"<>|]/g, '_')` to prevent invalid file downloads on Windows.

## Reference Material
- Refer to `samples/canvas_dom_fixed.html` for a snapshot of the DOM used during initial development.
