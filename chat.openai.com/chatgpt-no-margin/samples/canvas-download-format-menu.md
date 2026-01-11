# DOM Analysis: Canvas Download Format Menu

## Overview
This document analyzes the DOM structure of the download format menu found in the ChatGPT interface (specifically related to "Canvas"). The menu appears to be implemented using Radix UI primitives, identified by attributes like `data-radix-popper-content-wrapper` and `data-radix-menu-content`.

## Structure Hierarchy

### 1. Popper Wrapper (Root)
The outermost container responsible for positioning the menu on the screen.

*   **Tag:** `div`
*   **Key Attributes:**
    *   `data-radix-popper-content-wrapper=""`
    *   `style`: Contains inline styles for fixed positioning (`position: fixed`, `transform`, `z-index: 50`) and CSS variables for popper dimensions.

### 2. Menu Content Container
The actual visual container of the menu.

*   **Tag:** `div`
*   **Role:** `menu`
*   **Key Attributes:**
    *   `data-side="left"` (or other directions)
    *   `data-state="open"`
    *   `data-radix-menu-content=""`
    *   `class`: Extensively styled using Tailwind CSS classes.
        *   `z-50`: High z-index.
        *   `max-w-xs`: Max width constraint.
        *   `rounded-2xl`: Large border radius.
        *   `popover`: Semantic class likely for popover behavior.
        *   `bg-token-main-surface-primary`: Theme-aware background color.
        *   `dark:bg-[#353535]`: Dark mode background override.
        *   `shadow-long`: Drop shadow.
        *   `overflow-auto`: Handles content overflow.
*   **Selectors for UserScripts:**
    *   `div[role="menu"][data-radix-menu-content]` seems like a robust selector for the menu container when it is open.

### 3. Menu Items
Individual selectable options within the menu.

*   **Tag:** `div`
*   **Role:** `menuitem`
*   **Key Attributes:**
    *   `tabindex="0"`: Focusable.
    *   `class`: `group __menu-item` (Note: `__menu-item` appears to be a specific class identifying these items).
    *   `data-radix-collection-item=""`: Identifies it as part of a Radix collection.
*   **Internal Structure:**
    *   Contains a `div` with class `flex min-w-0 grow items-center gap-2.5` which holds the text label.

## Observed Menu Options
From the sample, the following options are visible:
1.  **PDF ドキュメント（.pdf）**
2.  **Microsoft Word ドキュメント（.docx）**
*(List likely continues with other formats)*

## UserScript Strategy
To interact with this menu programmatically:
1.  **Detection:** Monitor for the presence of `div[data-radix-popper-content-wrapper] > div[role="menu"]`.
2.  **Item Selection:** Query for `div[role="menuitem"]` within the menu container.
3.  **Text Matching:** Iterate through menu items and check `innerText` to find the desired format (e.g., matching "PDF" or ".docx").