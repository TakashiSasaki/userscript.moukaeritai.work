# DOM Analysis: Embedded Canvas

## Overview
This document analyzes the "Embedded Canvas" (or Canvas Card), which is the document editing interface embedded directly within the chat stream.

## 1. Context & Location
*   **Location:** Inside an `article` element (a conversation turn), specifically nested within `div.flex.flex-col.gap-2`.
*   **Role:** Represents a document or code artifact that the model is working on or has generated.

## 2. Structure Hierarchy

### Container (The Card)
*   **Tag:** `div`
*   **Selector:** `div.popover.rounded-3xl`
    *   *Note:* The ID (e.g., `textdoc-message-...`) is likely dynamic.
*   **Key Attributes:**
    *   `class`: `popover bg-token-bg-primary ... rounded-3xl w-full`
    *   `style`: `margin-bottom: 16px; height: auto; ...`
*   **Dimensions:** It has `w-full`, meaning it takes the full width of its parent container.

### Header (Sticky Top)
*   **Selector:** `div.sticky.top-(--header-height)`
    *   This keeps the title and actions visible while scrolling the document content.
*   **Contents:**
    *   **Title Area:** `div.text-token-text-primary.font-semibold` (e.g., "浜岡原発...").
    *   **Action Buttons (Right Aligned):**
        *   "Copy": `button[aria-label="コピーする"]`
        *   "Edit": `button` with text "編集する"
        *   "Download": `button[aria-haspopup="menu"]` with text "ダウンロードする" (or icon on mobile).

### Content Body
*   **Selector:** `div.ProseMirror` (found deeper in the structure)
    *   This is the rich text editor area containing the actual document text.
    *   **Classes:** `markdown prose dark:prose-invert ... ProseMirror`
    *   **Inline Style:** Often has a fixed pixel width (e.g., `width: 1811px`) calculated by JS.
    *   **Typography:** Uses Tailwind's `prose` class, which applies a default `max-width` (typically `65ch`) to ensure readability.

## 3. Detection & Observation

### Observer Strategy
*   **Target:** Main chat container or specific `article` elements.
*   **Config:** `{ childList: true, subtree: true }`
*   **Logic:**
    *   Monitor for the addition of `div.popover.rounded-3xl` within the chat stream.
    *   Since these can load asynchronously or expand, observing `subtree` on the `article` is recommended.

## 4. Key CSS Variables for "No Margin"
*   **`--thread-content-max-width`**: This variable (defined on the parent `article` or wrapper) constrains the width of this card.
    *   The card itself has `w-full`, so expanding the parent `article`'s max-width will automatically expand this card.

## 5. Selection Strategy
*   **Card Container:** `article div.popover.rounded-3xl`
*   **Editor Content:** `article div.popover.rounded-3xl .ProseMirror`

## 6. Known Issues & Fixes
*   **Edge Contact:** When expanding the chat to 100% width, the rounded corners of this card (`rounded-3xl`) can touch the screen edges.
    *   **Fix:** Apply `width: calc(100% - 3rem)` and auto margins to the card.
*   **Typography & Layout:**
    *   The `.ProseMirror` element has an inline `width` (e.g., `1811px`) that causes overflow if not overridden.
    *   **Crucial:** While `width: 100%` is needed to contain the element, applying `max-width: 100%` (as done for the Main Canvas) can break the layout of internal elements like `h1` (which rely on `prose`'s `max-width` for proper centering or line wrapping).
    *   **Fix:** For Embedded Canvas, override `width` to `100%` but **do not** override `max-width` (letting `prose` control it, or set it to `65ch`). This results in a wide card with a centered, readable text column.