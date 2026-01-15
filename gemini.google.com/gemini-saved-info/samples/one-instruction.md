# DOM Analysis: `one-instruction.html`

> **Note:** This DOM fragment was captured from the page `https://gemini.google.com/saved-info` and represents a single instruction item within the list.

This document outlines the structure of the DOM fragment for a single custom instruction. The structure is identical to the `.memory` elements found within the `all-instructions.html` sample.

## Root Element

*   **Selector:** `div.memory.ng-star-inserted`
*   **Purpose:** The main container for a single instruction item.

## Child Elements

### 1. Instruction Text

*   **Selector:** `div.memory-text.gds-body-l`
*   **Purpose:** Contains the actual text content of the instruction.

### 2. Action Button

*   **Selector:** `button.memory-actions-button`
*   **Purpose:** Opens a context menu for the instruction.
*   **Attributes:**
    *   `aria-label="Opens a context menu for the info."`

### 3. Context Menu

*   **Selector:** `mat-menu`
*   **Purpose:** The hidden menu panel associated with the action button.
