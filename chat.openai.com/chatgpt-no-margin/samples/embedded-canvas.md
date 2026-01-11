# DOM Analysis: Embedded Canvas

## Overview
This document analyzes the "Embedded Canvas" (or Canvas Card), which is the document editing interface embedded directly within the chat stream.

## 1. Context & Location
*   **Location:** Inside an `article` element (a conversation turn), specifically within `div.flex.flex-col.gap-2`.
*   **Role:** Represents a document or code artifact that the model is working on or has generated.

## 2. Structure Hierarchy

### Container (The Card)
*   **Tag:** `div`
*   **Selector:** `div.popover.rounded-3xl`
    *   *Note:* The ID (e.g., `textdoc-message-...`) is likely dynamic/UUID-based.
*   **Key Attributes:**
    *   `class`: `popover bg-token-bg-primary ... rounded-3xl w-full`
    *   `style`: `margin-bottom: 16px; height: auto; ...`

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
    *   This is the rich text editor area containing the actual document text (headings, paragraphs, lists).
    *   It's wrapped in `section.popover` -> `section.relative` containers.

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
*   **`--canvas-bg`**: Controls the background color, useful if visual customization is needed.

## 5. Selection Strategy
*   **Card Container:** `article div.popover.rounded-3xl`
*   **Download Button:** `article div.popover.rounded-3xl button[aria-haspopup="menu"]`
*   **Editor Content:** `article div.popover.rounded-3xl .ProseMirror`

## 6. Interaction Emulation
*   **Download:** Click the download button (see `canvas-download-button.md` and `canvas-download-format-menu.md`).
*   **Edit:** Clicking "編集する" likely toggles the `contenteditable` state of the `.ProseMirror` div or swaps it with an active editor.