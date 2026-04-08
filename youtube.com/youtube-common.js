// youtube-common.js
// Shared floating panel utilities for YouTube playlist userscripts.
// Loaded via @require in each userscript.
// Position and minimize state are persisted in localStorage.

/* global yusRestorePosition, yusSavePosition, yusMakeDraggable, yusCheckPanelPosition,
          yusMakeMinimizable, yusSetPanelActive, yusUpdatePanelVisibility, yusParseHTML */

/**
 * Restore a floating panel's position from localStorage.
 * Falls back to defaultPos if no saved value is found.
 *
 * @param {HTMLElement} panelEl - The panel root element.
 * @param {string} storageKey - The localStorage key.
 * @param {{top?: string, left?: string, bottom?: string, right?: string}} defaultPos
 */
function yusRestorePosition(panelEl, storageKey, defaultPos) {
    let pos = null;
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) pos = JSON.parse(raw);
    } catch (e) {
        pos = null;
    }
    if (!pos) pos = defaultPos;

    if (pos.top)    panelEl.style.top    = pos.top;
    if (pos.left)   panelEl.style.left   = pos.left;
    if (pos.bottom) panelEl.style.bottom = pos.bottom;
    if (pos.right)  panelEl.style.right  = pos.right;
}

/**
 * Save a floating panel's current position to localStorage.
 * Always saves as absolute top/left (bottom/right cleared).
 *
 * @param {HTMLElement} panelEl - The panel root element.
 * @param {string} storageKey - The localStorage key.
 */
function yusSavePosition(panelEl, storageKey) {
    const pos = {
        top:    panelEl.style.top,
        left:   panelEl.style.left,
        bottom: '',
        right:  ''
    };
    try {
        localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch (e) {
        // Ignore storage errors (e.g. private browsing quota)
    }
}

/**
 * Attach drag-to-move behaviour to a floating panel via its header element.
 * Skips drag initiation when clicking on BUTTON, INPUT, or LABEL targets.
 * Saves the new position to localStorage on drag end.
 *
 * @param {HTMLElement} panelEl    - The panel root element.
 * @param {HTMLElement} headerEl   - The drag handle (header) element.
 * @param {string}      storageKey - The localStorage key used by yusSavePosition.
 */
function yusMakeDraggable(panelEl, headerEl, storageKey) {
    const SKIP_TAGS = ['BUTTON', 'INPUT', 'LABEL'];
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let initialLeft = 0, initialTop = 0;

    headerEl.addEventListener('mousedown', (e) => {
        if (SKIP_TAGS.includes(e.target.tagName)) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const rect = panelEl.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop  = rect.top;

        // Switch to absolute positioning so right/bottom don't interfere
        panelEl.style.bottom = 'auto';
        panelEl.style.right  = 'auto';
        panelEl.style.left   = `${initialLeft}px`;
        panelEl.style.top    = `${initialTop}px`;

        e.preventDefault(); // Prevent text selection during drag
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panelEl.style.left = `${initialLeft + (e.clientX - dragStartX)}px`;
        panelEl.style.top  = `${initialTop  + (e.clientY - dragStartY)}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            yusSavePosition(panelEl, storageKey);
        }
    });
}

/**
 * Clamp a floating panel within the visible viewport.
 * Corrects position and saves it to localStorage if adjustment is needed.
 *
 * @param {HTMLElement} panelEl    - The panel root element (may be null — no-op if so).
 * @param {string}      storageKey - The localStorage key used by yusSavePosition.
 */
function yusCheckPanelPosition(panelEl, storageKey) {
    if (!panelEl) return;
    const rect = panelEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let newLeft = rect.left;
    let newTop  = rect.top;
    let needsUpdate = false;

    if (rect.right  > vw) { newLeft = Math.max(0, vw - rect.width);  needsUpdate = true; }
    if (rect.left   < 0)  { newLeft = 0;                              needsUpdate = true; }
    if (rect.bottom > vh) { newTop  = Math.max(0, vh - rect.height); needsUpdate = true; }
    if (rect.top    < 0)  { newTop  = 0;                              needsUpdate = true; }

    if (needsUpdate) {
        panelEl.style.bottom = 'auto';
        panelEl.style.right  = 'auto';
        panelEl.style.left   = `${newLeft}px`;
        panelEl.style.top    = `${newTop}px`;
        yusSavePosition(panelEl, storageKey);
    }
}

// ---------------------------------------------------------------------------
// Minimize / Active-state utilities
// State is stored directly on the panel element as custom properties:
//   panelEl._yusAutoMinimized     – true when NOT on the target page
//   panelEl._yusManuallyMinimized – true when the user has manually minimized
//   panelEl._yusMinimizeKey       – localStorage key (informational)
// ---------------------------------------------------------------------------

/**
 * Update panel content visibility from the two stored minimize flags.
 * Content must have the class `.yus-content`.
 * Sets `yus-active` CSS class on the panel when content is visible.
 *
 * @param {HTMLElement} panelEl - The panel root element.
 */
function yusUpdatePanelVisibility(panelEl) {
    if (!panelEl) return;
    const content = panelEl.querySelector('.yus-content');
    if (!content) return;
    const visible = !panelEl._yusAutoMinimized && !panelEl._yusManuallyMinimized;
    content.style.display = visible ? 'flex' : 'none';
    panelEl.classList.toggle('yus-active', visible);
}

/**
 * Set the active (on-page) state of the panel.
 * Call with active=true in startMain() and active=false in stopMain().
 * Auto-minimizes when inactive; restores when active (unless manually minimized).
 *
 * @param {HTMLElement} panelEl - The panel root element (no-op if null).
 * @param {boolean}     active  - Whether the userscript is on its target page.
 */
function yusSetPanelActive(panelEl, active) {
    if (!panelEl) return;
    panelEl._yusAutoMinimized = !active;
    yusUpdatePanelVisibility(panelEl);
}

/**
 * Attach double-click minimize toggle to a panel's title element.
 * Loads initial manual-minimize state from localStorage.
 * While auto-minimized (off target page), double-click has no effect.
 * Saves toggled state back to localStorage immediately.
 *
 * @param {HTMLElement} panelEl     - The panel root element.
 * @param {HTMLElement} titleEl     - The title element to attach dblclick to.
 * @param {string}      minimizeKey - localStorage key for the manual minimize flag.
 */
function yusMakeMinimizable(panelEl, titleEl, minimizeKey) {
    // Load saved state from localStorage (default: not minimized)
    let savedMinimized = false;
    try {
        const raw = localStorage.getItem(minimizeKey);
        if (raw !== null) savedMinimized = JSON.parse(raw);
    } catch (_) {}

    // Initialise panel state properties
    panelEl._yusAutoMinimized     = false; // managed by yusSetPanelActive
    panelEl._yusManuallyMinimized = savedMinimized;
    panelEl._yusMinimizeKey       = minimizeKey;

    titleEl.addEventListener('dblclick', (e) => {
        // Ignore double-click while auto-minimized (not on target page)
        if (panelEl._yusAutoMinimized) return;
        panelEl._yusManuallyMinimized = !panelEl._yusManuallyMinimized;
        try {
            localStorage.setItem(minimizeKey, JSON.stringify(panelEl._yusManuallyMinimized));
        } catch (_) {}
        yusUpdatePanelVisibility(panelEl);
        e.stopPropagation();
    });
}

/**
 * Parse an HTML string into a DOM element using DOMParser.
 * Unlike setting innerHTML directly, DOMParser creates an isolated document
 * context and is therefore safe under Trusted Types CSP (e.g. on YouTube).
 *
 * @param {string} html - Full HTML markup string whose first child is the panel.
 * @returns {Element} The first element of the parsed body (the panel element).
 */
function yusParseHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.firstElementChild;
}
