# DOM Analysis: `3dot-menu-items.html`

> **Note:** This DOM fragment was captured from the page `https://gemini.google.com/saved-info`. It represents the context menu that appears after clicking the 3-dot button on a custom instruction.

This document outlines the structure of the "Edit" / "Delete" context menu.

## High-Level Structure

The menu is contained within an Angular CDK overlay pane and uses standard Angular Material menu components.

```html
div.cdk-overlay-pane
└── div.mat-mdc-menu-panel
    └── div.mat-mdc-menu-content
        ├── button.mat-mdc-menu-item (Edit)
        └── button.mat-mdc-menu-item (Delete)
```

## Key Elements

### 1. Panel Container

*   **Selector:** `div.mat-mdc-menu-panel`
*   **Purpose:** The main floating panel for the menu. This element appears in the DOM only when the menu is open.
*   **Attributes:** `role="menu"`

### 2. Menu Items

*   **Selector:** `button.mat-mdc-menu-item`
*   **Purpose:** Represents a single clickable action within the menu.
*   **Attributes:** `role="menuitem"`

#### Edit Button

*   **Selector:** `button[data-test-id="edit-button"]`
*   **Contains:** A `mat-icon` with `fonticon="edit"` and the text "Edit".

#### Delete Button

*   **Selector:** `button[data-test-id="delete-button"]`
*   **Contains:** A `mat-icon` with `fonticon="delete"` and the text "Delete".
