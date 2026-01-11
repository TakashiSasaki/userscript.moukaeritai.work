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

## 3. File Structure
-   `*.html`: The DOM fragment (preprocessed).
-   `*.md`: Analysis of the fragment.
-   `whole-dom*.html`: Large-scale snapshots of the page structure (Standard view vs Canvas view).
