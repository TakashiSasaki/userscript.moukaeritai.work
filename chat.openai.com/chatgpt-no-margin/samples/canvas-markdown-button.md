# DOM Analysis: Canvas Markdown Download Button

## Overview
This document analyzes the specific menu item used to select "Markdown" format for downloading content in ChatGPT's Canvas interface.

## DOM Structure

```html
<div role="menuitem" tabindex="0" class="group __menu-item" data-orientation="vertical" data-radix-collection-item="">
  <div class="flex min-w-0 grow items-center gap-2.5">マークダウンドキュメント（.md）</div>
</div>
```

### Key Attributes
*   **Tag:** `div`
*   **Role:** `menuitem` - Identifies it as a selectable option in a menu.
*   **Class:** `group __menu-item` - `__menu-item` seems to be a specific identifier for menu items in this context.
*   **Data Attributes:**
    *   `data-orientation="vertical"`
    *   `data-radix-collection-item=""` - Indicates it belongs to a Radix UI collection.
*   **Content:** A child `div` containing the text "マークダウンドキュメント（.md）".

## Selection Strategy

To target this specific button, a combination of structural selectors and text content matching is required, as there is no unique ID or data-attribute specific to "Markdown" (like `data-format="md"`).

### Selector
1.  **Find the Menu:** First target the open menu container (as identified in `canvas-download-format-menu.md`):
    `div[role="menu"][data-radix-menu-content]`
2.  **Find Items:** Select all items within:
    `div[role="menuitem"]`
3.  **Filter by Text:** Iterate through these items and check if their `textContent` includes "Markdown" or "マークダウン" or ".md".

**Example (JavaScript):**
```javascript
const menu = document.querySelector('div[role="menu"][data-radix-menu-content]');
if (menu) {
  const items = Array.from(menu.querySelectorAll('div[role="menuitem"]'));
  const markdownBtn = items.find(item => item.textContent.includes('(.md)'));
}
```

## Observer Strategy

Since this menu is a "Popper" element that is dynamically inserted into the DOM when the user clicks the download/export button, a `MutationObserver` is essential.

### Where to Observe
Observe `document.body` because Radix UI often appends popper elements directly to the end of the `<body>` to ensure they overlay other content correctly.

### What to Look For
Look for added nodes that match the menu container's signature.

### Implementation Logic
1.  **Observe:** `document.body` with `{ childList: true, subtree: true }` (subtree might be needed if it's wrapped in a portal div, but usually direct body children for poppers).
2.  **Check Added Nodes:** In the callback, check `mutation.addedNodes`.
3.  **Identify Menu:** Look for a node that is (or contains) `div[data-radix-popper-content-wrapper]`.
4.  **Action:** Once detected, search inside that specific node for the "Markdown" menu item using the selection strategy above.

**Example Observer:**
```javascript
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check if the added node is the popper wrapper or contains the menu
        const menu = node.querySelector ? node.querySelector('div[role="menu"][data-radix-menu-content]') : null;
         // Alternatively check if node itself is the wrapper
        if (menu || (node.matches && node.matches('div[data-radix-popper-content-wrapper]'))) {
           // Wait a tick or check immediately for the menu content
           const actualMenu = menu || node.querySelector('div[role="menu"]');
           if (actualMenu) {
             const items = Array.from(actualMenu.querySelectorAll('div[role="menuitem"]'));
             const markdownBtn = items.find(item => item.textContent.includes('(.md)'));
             if (markdownBtn) {
               console.log("Markdown button found:", markdownBtn);
               // Perform action (e.g., click it, add styles, etc.)
             }
           }
        }
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
```
