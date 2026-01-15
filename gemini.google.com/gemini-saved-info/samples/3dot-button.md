# DOM Analysis: `3dot-button.html`

> **Note:** This DOM fragment was captured from the page `https://gemini.google.com/saved-info`. It represents the "more actions" button for a single custom instruction.

This document outlines the structure of the 3-dot menu button. This button is a child element within the `.memory` container (documented in `one-instruction.md`).

## Root Element

*   **Selector:** `button.mdc-icon-button.mat-mdc-icon-button`
*   **Purpose:** The main button element that triggers the context menu.
*   **Key Classes:**
    *   `mat-mdc-menu-trigger`: Indicates it's a trigger for an Angular Material menu.
    *   `memory-actions-button`: A specific class for this button.
*   **Attributes:**
    *   `aria-label="Opens a context menu for the info."`

## Child Elements

### Icon

*   **Selector:** `mat-icon`
*   **Purpose:** Displays the 3-dot (vertical) icon.
*   **Attributes:**
    *   `fonticon="more_vert"`: Specifies the icon to be used from the icon font.
