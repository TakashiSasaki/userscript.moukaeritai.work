# DOM Fragment Analysis (embedded-canvas-download-button.html)

## 1. Structure
This fragment represents a "Download" button, likely found within the action bar of an embedded Canvas or artifact.

```html
<div class="hover:text-token-text-primary">
    <!-- Menu Trigger Wrapper -->
    <button aria-haspopup="menu" ...>
        <!-- Visible Button Content -->
        <button class="flex items-center gap-1 ...">
            <!-- Icon (Visible on small screens) -->
            <span class="block sm:hidden"> ... <svg>...</svg> ... </span>
            
            <!-- Label (Visible on larger screens) -->
            <span class="hidden sm:block">ダウンロードする</span>
        </button>
    </button>
</div>
```

## 2. Key Attributes & Classes
*   **Wrapper (`div`)**:
    *   `hover:text-token-text-primary`: Highlights the text on hover.
*   **Outer Button (`button`)**:
    *   `aria-haspopup="menu"`: Indicates this button opens a menu (likely file format options like PDF, HTML, etc.).
    *   `id="radix-_r_rk_"`: Generated ID by Radix UI.
*   **Inner Button (`button`)**:
    *   This nesting (button inside button) is technically invalid HTML but observed in the sample. It might be a quirk of how the sample was captured or a specific implementation detail of the component library.
    *   **Responsiveness**:
        *   `block sm:hidden`: Shows the icon only on small screens.
        *   `hidden sm:block`: Shows the text "ダウンロードする" only on small screens and up (tablet/desktop).

## 3. Purpose
This component provides the "Download" functionality for content within the UI, adapting its display (icon vs text) based on screen width.
