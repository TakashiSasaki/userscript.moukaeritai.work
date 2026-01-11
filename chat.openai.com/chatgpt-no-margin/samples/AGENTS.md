# Agent Guide for Samples & DOM Analysis

This directory (`samples/`) serves as a repository for DOM fragments captured from ChatGPT for analysis. It is critical for maintaining the `chatgpt-no-margin` userscript as the target site's structure evolves.

## 1. Workflow for New Samples

When capturing a new DOM fragment (e.g., a new button, a changed message layout):

1.  **Capture**: Save the raw HTML into a new `.html` file with a descriptive name (e.g., `new-feature-button.html`).
2.  **Commit Raw**: Always commit the raw file first. This preserves the original state for reference.
3.  **Preprocess**: Run cleaning scripts to remove noise.
    *   **Goal**: Remove `<script>`, `<style>`, `<link>`, and content of `<svg>` tags.
    *   **Tools**: Use Python `BeautifulSoup`. See `preprocess_*.py` examples in this directory (or create a one-off script).
    *   **Why**: This significantly reduces token usage for LLM analysis and highlights the structural elements that matter.
4.  **Commit Cleaned**: Commit the preprocessed file.
5.  **Analyze**: Create a corresponding `.md` file (e.g., `new-feature-button.md`) analyzing the structure, class names, and attributes.

## 2. Key DOM Knowledge

### CSS Variables & Layout
-   **Max Width**: ChatGPT extensively uses CSS variables for layout. The primary target for widening the chat is `--thread-content-max-width`.
-   **Margins**: The variable `--thread-content-margin` often controls side padding/margins.
-   **Selector Strategy**: Prefer targeting these variable definitions (e.g., `[class*="[--thread-content-max-width"]`) or stable utility classes (`.text-base.mx-auto`) over fragile, randomized class names.

### Canvas / Radix UI Patterns
-   **Nested Buttons**: Interactive elements (especially menu triggers) often appear as a `<button>` nested inside another `<button>` or `div` with `aria-haspopup`. This is likely a quirk of the Radix UI primitives used.
-   **Popovers**: Menus (like the 3-dot menu) are often rendered at the end of the `<body>` in a `div[data-radix-popper-content-wrapper]`, not adjacent to their trigger button.
-   **Icons**: Icons are almost always SVGs. For analysis, the specific path data is irrelevant; identifying the `svg` tag is sufficient.

## 3. Analysis Requirements (MANDATORY)

When analyzing a DOM fragment and creating its corresponding `.md` file, you **must** address the following points to ensure the analysis is actionable for UserScript development:

1.  **Context & Location**:
    *   Where does this fragment appear in the overall DOM structure? (e.g., "Inside the main chat container," "Appended to `<body>` as a portal").
    *   Is it always present, or does it appear dynamically?

2.  **Detection & Observation**:
    *   If the element is dynamic (e.g., a dropdown menu, a modal), what `MutationObserver` strategy should be used to detect it?
        *   **Target Node**: Which parent node should be observed? (e.g., `document.body` for portals, specific container for chat messages).
        *   **Observer Config**: What options are needed? (e.g., `{ childList: true, subtree: true }`).
    *   Are there specific attributes or classes that uniquely identify the element when it appears? (e.g., `data-radix-popper-content-wrapper`).

3.  **Selection Strategy**:
    *   What is the most robust CSS Selector to find this element?
    *   Avoid brittle classes (like randomized Tailwind strings) if possible. Prefer semantic roles (`role="menuitem"`), data attributes (`data-testid`), or structure (`div > button`).
    *   If text matching is required, specify the logic (e.g., "Find element where textContent includes 'Markdown'").

4.  **Interaction Emulation**:
    *   What events need to be dispatched to emulate user interaction? (e.g., `click`, `mousedown`, `input`).
    *   Are there specific timing requirements? (e.g., "Wait for the menu animation to finish").

## 4. Existing Sample Files

The following files represent specific DOM components analyzed for this project. Use them as references for structure and selectors.

### Core Structure
*   `whole-dom.html`: Snapshot of the entire ChatGPT interface (Standard view).
*   `whole-dom-viewing-canvas.html`: Snapshot of the interface when the Canvas side-panel is open.

### User & Model Turns
*   `user-message-1.html`: A standard user message bubble. Analyzes `data-turn="user"` and layout variables.
*   `user-message-2.html`: A user message with additional context (e.g., replying to a Canvas document).
*   `model-response-1.html`: A standard text response from ChatGPT.
*   `model-response-2.html`: A model response containing an **embedded Canvas card**. Critical for detecting the "Canvas" feature in the stream.

### Canvas (Standalone & Embedded)
*   `embedded-canvas.html`: The card component representing a Canvas document within the chat stream.
*   `embedded-canvas-download-button.html`: The download trigger button on the embedded Canvas card.
*   `embedded-canvas-markdown-button.html`: The Markdown option within the download menu for embedded Canvas.
*   `single-canvas-button.html`: A standalone button related to Canvas operations (possibly the toggle or open button).

### Canvas Menus & Popovers
*   `canvas-3dot-button.html`: The "..." menu trigger button.
*   `canvas-3dot-menu.html`: The opened menu content (Popper) resulting from the 3-dot button.
*   `canvas-close-button.html`: The "X" button to close the Canvas view.
*   `canvas-download-button.html`: The download button in the full-screen/side-panel Canvas header.
*   `canvas-download-format-menu.html`: The format selection menu (PDF, Word, Markdown) that appears after clicking download.
*   `canvas-markdown-button.html`: The specific menu item for "Markdown" in the format menu.
