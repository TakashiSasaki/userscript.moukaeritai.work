# DOM Fragment Analysis (canvas-download-button.html)

## 1. Structure
This fragment represents the "Download" menu item found **inside the 3-dot menu** of the Canvas view. It functions as a submenu trigger.

```html
<div role="group" ...>
    <div role="menuitem" aria-haspopup="menu" aria-expanded="true" ...>
        <div class="flex ...">
            <!-- Icon -->
            <div class="... icon"><svg ...></svg></div>
            
            <!-- Label -->
            <div class="... truncate">ダウンロードする</div>
        </div>
        
        <!-- Chevron/Arrow Icon indicating submenu -->
        <svg class="icon-sm ..." ...></svg>
    </div>
</div>
```

## 2. Key Attributes & Classes
*   **Role**: `role="menuitem"`. It is part of a dropdown menu.
*   **Aria**:
    *   `aria-haspopup="menu"`: Indicates this item opens another menu (a submenu).
    *   `aria-expanded="true"`: Indicates the submenu is currently open in this sample state.
*   **Classes**: `group __menu-item`. Standard menu item styling.

## 3. Purpose
This item allows the user to access download options. Hovering or clicking it reveals the list of available file formats (e.g., Markdown, likely represented by `canvas-download-format-menu.html` or similar). It is distinct from the top-level `embedded-canvas-download-button` which is a direct action button visible in the header on some layouts.
