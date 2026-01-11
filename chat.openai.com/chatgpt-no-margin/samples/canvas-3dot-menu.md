# DOM Fragment Analysis (canvas-3dot-menu.html)

## 1. Structure
This fragment represents the opened content of the "3-dot" menu in the Canvas view. It appears as a floating popover.

```html
<div data-radix-popper-content-wrapper ...>
    <div role="menu" ... class="... popover ...">
        <!-- Menu Item 1: Previous Version -->
        <div role="menuitem" ...>
            <div class="... icon"><svg ...></svg></div>
            <div class="...">前のバージョン</div>
        </div>
        
        <!-- Menu Item 2: Next Version (Disabled in sample) -->
        <div role="menuitem" aria-disabled="true" ...>
            <div class="... icon"><svg ...></svg></div>
            <div class="...">次のバージョン</div>
        </div>
        
        <!-- Menu Item 3: Download Submenu Trigger -->
        <div role="group" ...>
            <div role="menuitem" aria-haspopup="menu" ...>
                <div class="...">ダウンロードする</div>
                <svg ...></svg> <!-- Chevron -->
            </div>
        </div>
    </div>
</div>
```

## 2. Key Attributes & Classes
*   **Wrapper**: `data-radix-popper-content-wrapper`. Standard Radix UI positioning wrapper for floating elements.
*   **Menu Container**: `role="menu"`.
    *   `aria-labelledby="radix-_r_us_"`: Links back to the 3-dot button ID (observed in `canvas-3dot-button.html`).
*   **Items**: Standard `role="menuitem"` with specific text labels.

## 3. Purpose
This menu provides version control navigation ("Previous/Next Version") and access to the "Download" submenu. It confirms the relationship between the 3-dot button and the Download options.