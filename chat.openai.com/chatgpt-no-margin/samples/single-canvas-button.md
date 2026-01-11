# DOM Fragment Analysis (single-canvas-button.html)

## 1. Structure
The fragment consists of a single button wrapped in a span.

```html
<span data-state="closed">
    <button class="..." style="...">
        <svg ...></svg>
    </button>
</span>
```

## 2. Key Attributes
*   **Wrapper (`span`)**:
    *   `data-state="closed"`: Indicates this is likely a toggleable component (e.g., for opening a menu or view).
*   **Button (`button`)**:
    *   **Classes**: `text-token-text-primary`, `no-draggable`, `hover:bg-token-surface-hover`, `flex`, `items-center`, `justify-center`. Standard ChatGPT utility classes for interactive icon buttons.
    *   **Style**: `view-transition-name: var(--vt-thread-header-open-canvas);`. **Crucial Finding**: This explicitly names the element for a View Transition API animation related to "thread header open canvas". This strongly suggests this button is the trigger to open the Canvas view from the header.

## 3. Purpose
This button is the UI control located in the thread header that allows the user to open the Canvas (split view). The View Transition name confirms its association with the "open canvas" action.
