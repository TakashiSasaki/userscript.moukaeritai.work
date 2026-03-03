# Development Notes for AI Agents and Developers

This document serves as a technical reference for the ChatGPT Canvas Exporter userscript. It outlines the methodologies used for DOM analysis, selector identification, and implementation details.

## Technical Context: ChatGPT Canvas

ChatGPT "Canvas" (internally often referred to as `writing-block` or `textdoc`) is a feature that opens a separate side panel for document editing. It uses **ProseMirror** as its underlying rich-text editor.

### DOM Analysis via CDP

To analyze the live DOM of ChatGPT (which uses complex dynamic loading), use the included PowerShell scripts:

1.  **Capture**: Run `./capture_dom.ps1` to fetch the outer HTML via CDP (Port 9222).
2.  **Format**: Run `./format_dom.ps1` to add line breaks after tags for easier searching.

Outputs are saved in the `samples/` directory.

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
    - **Floating**: A fixed (but movable) button that appears only when `.ProseMirror` is detected.
    - **Movable Logic**: Implemented with mouse event listeners (`mousedown`, `mousemove`, `mouseup`). It calculates position relative to the `right` and `bottom` edges of the viewport to handle resizing gracefully.
- **MutationObserver**: Used to detect when the Canvas enters the DOM or the path changes, ensuring buttons are re-injected if lost.

### Performance and Reliability
- **Avoid Over-Injection**: The injector checks for the existence of `.canvas-exporter-btn` before prepending.
- **Filename Sanitization**: Titles are sanitized using `replace(/[\\/:*?"<>|]/g, '_')` to prevent invalid file downloads on Windows.

- Refer to `samples/canvas_dom_fixed.html` for a snapshot of the DOM used during initial development.

## Common Pitfalls & Debugging (UserScript Context)

### ZIP Generation: Use fflate instead of JSZip
In UserScript environments (like Tampermonkey), `JSZip.generateAsync` frequently hangs indefinitely due to sandbox restrictions on Web Workers and cross-context `Promise`/`Blob` handling.
- **Solution**: Use **fflate** with `zipSync`.
- **Why**: `fflate.zipSync` is a purely synchronous, single-threaded operation. It completes the ZIP creation in the same execution tick as the user's interaction, bypassing all asynchronous sandbox deadlocks.
- **Data Handling**: Fetch binary data as `ArrayBuffer`, wrap in `Uint8Array`, and pass directly to the `zipSync` object.
- **Example**:
  ```javascript
  const zipped = fflate.zipSync({
    "file.txt": new TextEncoder().encode("Hello"),
    "image.png": new Uint8Array(arrayBuffer)
  });
  const blob = new Blob([zipped], { type: "application/zip" });
  ```

### GM_download Fallback Timing
When implementing a fallback for `GM_download` (for environments where it's unsupported or fails), be careful with `URL.revokeObjectURL`.
- **Pitfall**: Calling `revokeObjectURL(url)` in the `onerror` handler *before* triggering the fallback download will result in a silent failure (the browser cannot find the data at the URL).
- **Correct Pattern**: Pass the URL to the fallback handler and ensure it is revoked only *after* the fallback download has been initiated (e.g., after `a.click()`).

## バージョンのバンプアップについて
- 少しでもコードに変更があったら、**パッチレベル（末尾の数字）**をバンプアップする。
- 原則として、機能追加であってもマイナーバージョンは維持し、パッチレベルでの更新を優先する。

## User Landing Page (`index.html`)
A user-facing landing page has been established at `/index.html` within this project folder.
- **Purpose**: Serves as the primary distribution page for end-users, outlining features and providing a straightforward installation route.
- **Design Specifications**: Utilizes modern web design principles (vanilla HTML/CSS) featuring glassmorphism, precise typography via Google Fonts (`Inter`), semantic layout, and responsive micro-animations for an elevated user experience.
- **Installation Method**: The main CTA button links directly to the `raw` GitHub URL of `chatgpt-canvas-exporter.user.js`. This ensures UserScript managers like Tampermonkey/Violentmonkey automatically intercept the link and present the user with an installation prompt.
