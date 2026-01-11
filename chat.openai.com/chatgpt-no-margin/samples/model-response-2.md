# DOM Analysis: Model Response with Canvas Artifact

## Overview
This document analyzes a ChatGPT model response that includes a "Canvas" artifact (a distinct document-editing interface embedded within the chat).

## 1. Context & Location
*   **Location:** This `article` element is a direct child of the main chat stream container. It represents a single turn in the conversation (specifically from the `assistant`).
*   **Dynamics:** It appears dynamically as the model generates a response. The "Canvas" card within it may update its content or state (e.g., from "generating" to "done").

## 2. Structure Hierarchy

### Root Element
*   **Tag:** `article`
*   **Selector:** `article[data-testid^="conversation-turn-"][data-turn="assistant"]`
*   **Key Attributes:**
    *   `data-testid="conversation-turn-8"`: Unique ID for the turn.
    *   `data-turn="assistant"`: Identifies the speaker.
    *   `class`: Contains `w-full` and custom CSS variables like `[--thread-content-max-width:40rem]`.

### Inner Layout Containers
*   **Width Control:** `div[class*="[--thread-content-max-width"]` handles the centering and max-width.
    *   *Note:* Modifying this variable is the key to the "No Margin" userscript.

### The Canvas Card (Artifact)
This is the distinct UI element representing the document.

*   **Selector:** `div.popover.rounded-3xl` (found within the `article`)
*   **Structure:**
    1.  **Header (`sticky top-...`)**:
        *   **Title**: `span.font-semibold` (e.g., "浜岡原発...").
        *   **Actions**: A flex container with buttons.
            *   **Copy**: `button[aria-label="コピーする"]`
            *   **Edit**: `button` containing "編集する"
            *   **Download**: `button` containing "ダウンロードする" (Text is hidden on small screens `hidden sm:block`, icon is visible). This button has `aria-haspopup="menu"`.
    2.  **Content Body**:
        *   Contains the document content (ProseMirror editor context).
        *   `div.ProseMirror`: The actual editable content area.

## 3. Detection & Observation

### Observer Strategy
*   **Target:** The main chat container (e.g., `main > div[role="presentation"]` or similar wrapper).
*   **Config:** `{ childList: true, subtree: true }`
*   **Logic:**
    1.  Listen for added nodes.
    2.  Check if added node is `article[data-turn="assistant"]` OR if a descendant of an existing `article` changes (if the Canvas loads asynchronously).
    3.  **Specific Check:** Look for `div.popover.rounded-3xl` to detect the presence of a Canvas card.

## 4. Selection Strategy

### Target: The Download Button
To programmatically trigger the download menu analyzed in `canvas-download-format-menu.md`:

```javascript
// 1. Find the Assistant's turn
const turn = document.querySelector('article[data-turn="assistant"]');

// 2. Find the Canvas Card within it
const canvasCard = turn.querySelector('.popover.rounded-3xl');

// 3. Find the Download Trigger Button
// Strategy: Look for the button that opens a menu and contains the download icon or text.
const downloadBtn = Array.from(canvasCard.querySelectorAll('button[aria-haspopup="menu"]'))
  .find(btn => btn.textContent.includes('ダウンロード') || btn.querySelector('svg')); 
```

## 5. Interaction Emulation

### Triggering the Download Menu
1.  **Event:** `click`
2.  **Target:** The `downloadBtn` identified above.
3.  **Post-Action:** After clicking, wait for the Radix UI Popper (the menu) to appear at the end of `document.body` (as detailed in `canvas-download-format-menu.md`).

## 6. Key CSS Variables for "No Margin"
The `article` and its children rely heavily on CSS variables for layout.
*   `--thread-content-max-width`: Controls the width of the text and the Canvas card.
*   `--thread-content-margin`: Controls side margins.

**Action for Userscript:** Overwriting these variables at the `article` or `main` level is the most effective way to expand the view.
