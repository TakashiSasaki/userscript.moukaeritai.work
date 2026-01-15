# DOM Analysis: `all-instructions.html`

> **Note:** This DOM fragment was captured from the page `https://gemini.google.com/saved-info`.

This document outlines the structure of the DOM fragment representing the list of all custom instructions.

## High-Level Structure

The entire component is wrapped in a main container, which holds groups of instructions.

```html
div[data-test-id="memories-section"]
└── div.memories-groups
    └── div.memories-group
        └── div.memories-container
            ├── div.memory
            ├── div.memory
            └── ...
```

## Key Elements

### 1. Main Container

*   **Selector:** `div[data-test-id="memories-section"]`
*   **Purpose:** The root element for the entire "Saved Info" section. This is the primary element the userscript should look for to begin its operations.

### 2. Instruction Item (`.memory`)

*   **Selector:** `div.memory.ng-star-inserted`
*   **Purpose:** Represents a single custom instruction item. The script will iterate through all elements matching this selector to process each instruction.
*   **Note:** The structure of each `div.memory` element is identical to the DOM fragment documented in `one-instruction.md`.

### 3. Instruction Text

*   **Selector:** `div.memory-text.gds-body-l`
*   **Purpose:** Contains the actual text content of the instruction.
*   **Location:** Inside `div.memory`.
*   **Note:** This is the element where the serial number should be prepended.

### 4. Action Button

*   **Selector:** `button.memory-actions-button`
*   **Purpose:** Opens a context menu for the instruction (e.g., for editing or deleting).
*   **Attributes:**
    *   `aria-label="Opens a context menu for the info."`
*   **Location:** A sibling to `div.memory-text` inside `div.memory`.

### 5. Context Menu

*   **Selector:** `mat-menu`
*   **Purpose:** The menu that appears when the action button is clicked. It is not visible by default.
