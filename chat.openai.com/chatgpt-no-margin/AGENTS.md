# Agent Implementation Notes: ChatGPT No Margin

This document provides technical details and implementation strategies for the `chatgpt-no-margin` userscript.

## 1. Technical Strategy

### Goal
Remove the maximum width constraints and margins from the main conversation container in ChatGPT to utilize the full viewport width.

### Implementation Logic
Use `MutationObserver` to detect and modify the following elements dynamically as they are added or modified in the DOM.

**Target Elements & Actions:**

1.  **Inner Flex Container**: `div.flex.mx-auto`
    *   Action: Set `marginLeft = 0`, `marginRight = 0`, `maxWidth = 100%`.
2.  **Outer Text Wrapper**: `div.text-base.mx-auto`
    *   Action: Set `marginLeft = 0`, `marginRight = 0`, `maxWidth = 100%`.
3.  **CSS Variable**: `--thread-content-max-width` (Tailwind arbitrary value)
    *   Action: If detected in inline styles, override it to `100%`.

## 2. DOM Selectors (As of 2026-01-11)

| Element | Selector Pattern | Purpose |
| :--- | :--- | :--- |
| **Main Container** | `main div[role='presentation']` | Primary observation target. |
| **Message Wrapper** | `div.text-base.mx-auto` | Outer wrapper often defining the max-width. |
| **Message Flex** | `div.flex.mx-auto` | Inner flex container for message content. |
| **CSS Var Target** | Element with style prop | Elements using `max-w-[var(--thread-content-max-width)]`. |

## 3. Observation Strategy

-   **Observer Target**: `main div[role='presentation']` (fallback to `document.body` if not found immediately).
-   **Config**: `{ childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] }`.
-   **Performance**: The observer callback checks `nodeType` and `matches` selector efficiently. Logic is idempotent (setting style properties repeatedly is safe).
-   **Timing**: A 1.5s delay (`setTimeout`) is used on startup to ensure the initial DOM is ready before attaching the observer.

## 4. Portal API & Guard
The script includes the standard Portal API Guard to interact with `userscript.moukaeritai.work`.
-   **Domains**: `userscript.moukaeritai.work`, `127.0.0.1:5500`, `fuzzy-halibut-*.app.github.dev`.
-   **Events**: Dispatches `userscript-check-installed` and listens for `userscript-ping`.

## 5. Build & Verification
-   **Linting**: Run `npx eslint chat.openai.com/chatgpt-no-margin/chatgpt-no-margin.user.js` before committing.
-   **Version**: Follow semantic versioning. Current: `1.1.0`.

## 6. HTML Sample Preprocessing
When capturing HTML samples from ChatGPT for analysis, specific preprocessing steps are required to reduce file size and remove noise while preserving the structural integrity relevant to the userscript.

**Preprocessing Steps:**
1.  **Remove `<script>` and `<style>` tags**: Javascript and CSS blocks are unnecessary for structural DOM analysis and consume significant token space.
2.  **Remove `<link>` tags**: External stylesheets and preloads in the `<head>` are not needed.
3.  **Clean `<svg>` elements**: Retain the `<svg>` tag itself (to identify icons/buttons) but remove all its child elements (paths, defs, etc.) to save lines.
4.  **Truncate Text**: Long text content within messages can be truncated, but the container structure must remain intact.

**Helper Scripts:**
-   Python scripts (e.g., `remove_link_elements.py`, `remove_svg_children.py`) in the `samples/` directory were used to automate this cleanup. Future agents should use similar logic when adding new samples.