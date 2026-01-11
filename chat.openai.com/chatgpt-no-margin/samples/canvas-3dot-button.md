# DOM Fragment Analysis (canvas-3dot-button.html)

## 1. Structure
This fragment represents the "3-dot" menu button located in the top-right corner of the Canvas view.

```html
<!-- Menu Trigger -->
<button aria-haspopup="menu" ...>
    <!-- Visual Button -->
    <button class="text-token-text-primary ... flex h-9 w-9 ...">
        <svg class="icon" ...></svg>
    </button>
</button>
```

## 2. Key Attributes & Classes
*   **Outer Button**:
    *   `aria-haspopup="menu"`: Indicates it opens a menu (e.g., for export, close, or other document actions).
    *   `id="radix-_r_us_"`: Radix UI generated ID.
*   **Inner Button**:
    *   **Classes**: `text-token-text-primary`, `hover:bg-token-surface-hover`, `h-9 w-9`. Standard ChatGPT icon button styling.
    *   **Nesting**: The `button` inside `button` pattern appears here again, consistent with other menu triggers in the Canvas UI (like the Download button).

## 3. Purpose
This button provides access to additional actions for the Canvas, such as "Close" (if distinct from the X button) or potentially debugging/info options depending on the context.
