# DOM Analysis: `edit-instruction-dialog.html`

> **Note:** This DOM fragment was captured from the page `https://gemini.google.com/saved-info`. It represents the dialog box that appears when a user clicks the "Edit" button on a custom instruction.

This document outlines the structure of the "Edit Instruction" dialog.

## High-Level Structure

The dialog is built with Angular Material components and appears within a CDK overlay.

```html
div.cdk-overlay-pane
└── mat-dialog-container
    └── ...
        └── edit-memory-dialog
            ├── h1.mat-mdc-dialog-title
            ├── mat-dialog-content
            │   └── textarea.edit-memory-input
            └── mat-dialog-actions
                ├── button (Cancel)
                └── button.edit-memory-submit-button (Submit)
```

## Key Elements

### 1. Dialog Container

*   **Selector:** `mat-dialog-container`
*   **Purpose:** The main container for the dialog's UI.
*   **Attributes:** `role="dialog"`

### 2. Dialog Title

*   **Selector:** `h1.mat-mdc-dialog-title`
*   **Purpose:** Displays the title of the dialog.

### 3. Content Area

*   **Selector:** `mat-dialog-content`
*   **Purpose:** Contains the main body of the dialog.
*   **Key Child:**
    *   **Text Area:** `textarea.edit-memory-input`. This is where the user edits the instruction text.

### 4. Action Buttons

*   **Selector:** `mat-dialog-actions`
*   **Purpose:** Container for the dialog's action buttons.

#### Cancel Button

*   **Selector:** `button` within `mat-dialog-actions` containing the text "Cancel".
*   **Purpose:** Closes the dialog without saving changes.

#### Submit Button

*   **Selector:** `button[data-test-id="submit-button"]`
*   **Class:** `.edit-memory-submit-button`
*   **Purpose:** Saves the changes to the instruction.
