# DOM Analysis: `saved-info-dialog.html`

> **Note:** This DOM fragment was captured from the page `https://gemini.google.com/saved-info` and represents the main content of that page.

This document outlines the structure of the "Personal context" page.

## Root Element

*   **Selector:** `saved-info-page`
*   **Purpose:** The main component wrapper for the entire page content.

## Key Sections

The page is divided into three main sections, separated by `<hr>` tags.

### 1. "Your past chats with Gemini"

This section allows the user to control whether their chat history is used for personalization.

*   **Section Header:** `h2` with text "Your past chats with Gemini".
*   **Toggle Switch:** `mat-slide-toggle[data-test-id="enable-personal-gemini-context-toggle"]`.

### 2. "Your instructions for Gemini"

This is the primary section for managing custom instructions.

*   **Section Header:** `h2[data-test-id="saved-info-title"]`
*   **Toggle Switch:** `mat-slide-toggle[data-test-id="enable-memory-toggle"]`
*   **Add Button:** `button.create-memory-button` (contains a `mat-icon` with `fonticon="add"`)
*   **Delete All Button:** `button.delete-all-memories-button`
*   **Instructions Container:** `div[data-test-id="memories-section"]`
    *   This container holds the list of individual instructions (`.memory` elements). Its structure is detailed in `all-instructions.md`.

### 3. "Your premium content"

This section provides information and links related to premium content sources.

*   **Section Container:** `div[data-test-id="premium-content-section"]`
*   **Section Header:** `h2[data-test-id="premium-content-title"]`
*   **Manage Link:** `a[data-test-id="premium-content-link"]`
